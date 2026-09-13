module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, only: %i[signup login recover]

      def signup
        payload = body_params
        unless TurnstileVerifier.verify(payload["turnstile_token"], request.remote_ip)
          return render json: { error: "Signup verification failed. Please try again." }, status: :unprocessable_entity
        end

        password = payload["password"].to_s
        user = User.new(username: payload["username"], password: password)
        user.password_confirmation = payload["password_confirmation"] if payload.key?("password_confirmation")
        return render_errors(user) unless user.save

        render_session(user, :created)
      end

      def login
        user = User.find_for_database_authentication(username: body_params["username"])
        unless user&.valid_password?(body_params["password"].to_s)
          return render json: { error: "Invalid username or password" }, status: :unauthorized
        end

        render_session(user, :created)
      end

      def current
        render json: serialize_user(current_user)
      end

      def logout
        current_device_session&.revoke!
        head :no_content
      end

      def recover
        username = body_params["username"].to_s
        unless RecoveryRateLimiter.allowed?(request.remote_ip, username)
          return render json: { error: "Recovery is temporarily unavailable" }, status: :too_many_requests
        end

        user = User.find_for_database_authentication(username: username)
        unless body_params["password"].to_s == body_params["password_confirmation"].to_s
          return render json: { error: "Recovery code is invalid or recovery is unavailable" }, status: :unauthorized
        end
        credential = user ? user.totp_credentials.where.not(confirmed_at: nil).detect { |item| item.verify(body_params["code"]) } : nil
        unless credential
          return render json: { error: "Recovery code is invalid or recovery is unavailable" }, status: :unauthorized
        end

        user.password = body_params["password"].to_s
        user.password_confirmation = body_params["password_confirmation"].to_s
        return render_errors(user) unless user.save

        DeviceSession.revoke_all_for!(user)
        render_session(user, :created)
      end

      private

      def render_session(user, status)
        _session, raw_token = DeviceSession.issue!(user)
        render json: { user: serialize_user(user), token: raw_token }, status: status
      end

      def serialize_user(user)
        { id: user.public_id, username: user.username }
      end
    end
  end
end
