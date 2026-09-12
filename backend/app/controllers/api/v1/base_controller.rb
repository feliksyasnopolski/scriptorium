module Api
  module V1
    class BaseController < ApplicationController
      skip_forgery_protection
      before_action :authenticate_user!

      attr_reader :current_user, :current_device_session

      private

      def authenticate_user!
        token = request.headers["Authorization"].to_s.delete_prefix("Bearer ").presence
        @current_device_session = DeviceSession.authenticate(token)
        @current_user = @current_device_session&.user
        render json: { error: "Authentication required" }, status: :unauthorized unless @current_user
      end

      def body_params
        return JSON.parse(request.raw_post) if request.content_mime_type == Mime[:json]

        params.to_unsafe_h
      end

      def render_errors(record)
        render json: { errors: record.errors.to_hash }, status: :unprocessable_entity
      end

      def render_not_found
        render json: { error: "Not found" }, status: :not_found
      end
    end
  end
end
