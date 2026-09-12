module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, only: %i[signup login]

      def signup
        payload = body_params
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
