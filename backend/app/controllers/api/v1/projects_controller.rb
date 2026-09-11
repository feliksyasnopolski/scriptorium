module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: %i[show document update_document destroy]

      def index
        render json: VideoProject.order(:created_at).map { |project| serialize_summary(project) }
      end

      def show
        render json: ProjectDocument.render(@project)
      end

      def document
        render json: ProjectDocument.render(@project)
      end

      def create
        project = VideoProject.new(project_params)
        return render_errors(project) unless project.save

        ProjectDocumentUpdater.new(project, body_params.fetch("project")).call if body_params.dig("project", "sections")

        render json: ProjectDocument.render(project), status: :created
      end

      def update_document
        payload = body_params
        return render json: { error: "Unsupported schema version" }, status: :unprocessable_entity unless payload["schema_version"].to_i == ProjectDocument::SCHEMA_VERSION
        forced = ActiveModel::Type::Boolean.new.cast(request.query_parameters["force"])
        return render json: { error: "Revision conflict", document: ProjectDocument.render(@project) }, status: :conflict unless forced || payload["revision"].to_i == @project.revision

        ProjectDocumentUpdater.new(@project, payload.fetch("project")).call
        render json: ProjectDocument.render(@project.reload)
      rescue KeyError, ActiveRecord::RecordInvalid => error
        errors = error.respond_to?(:record) ? error.record.errors.to_hash : { document: [error.message] }
        render json: { errors: errors }, status: :unprocessable_entity
      end

      def destroy
        @project.destroy!
        head :no_content
      end

      private

      def set_project
        @project = VideoProject.includes(sections: :subsections).find_by!(public_id: request.path_parameters[:id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def project_params
        params = body_params.fetch("project", {}).select { |key, _| %w[id title target_duration_seconds].include?(key) }
        params["public_id"] = params.delete("id") if params.key?("id")
        params.symbolize_keys
      end

      def serialize_summary(project)
        {
          id: project.public_id,
          title: project.title,
          target_duration_seconds: project.target_duration_seconds,
          planned_duration_seconds: project.planned_duration_seconds,
          revision: project.revision,
          sections: [],
          created_at: project.created_at,
          updated_at: project.updated_at,
        }
      end
    end
  end
end
