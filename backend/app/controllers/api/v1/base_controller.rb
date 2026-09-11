module Api
  module V1
    class BaseController < ApplicationController
      skip_forgery_protection

      private

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
