module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: %i[show update destroy]

      def index
        render json: VideoProject.includes(sections: :subsections).order(:created_at).map { |project| serialize_project(project) }
      end

      def show
        render json: serialize_project(@project)
      end

      def create
        project = VideoProject.new(project_params)
        return render_errors(project) unless project.save

        render json: serialize_project(project), status: :created
      end

      def update
        return render_errors(@project) unless @project.update(project_params)

        render json: serialize_project(@project)
      end

      def destroy
        @project.destroy!
        head :no_content
      end

      private

      def set_project
        @project = VideoProject.includes(sections: :subsections).find(request.path_parameters[:id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def project_params
        body_params.fetch("project", {}).select { |key, _| %w[title target_duration_seconds].include?(key) }.symbolize_keys
      end

      def serialize_project(project)
        {
          id: project.id,
          title: project.title,
          target_duration_seconds: project.target_duration_seconds,
          planned_duration_seconds: project.planned_duration_seconds,
          created_at: project.created_at,
          updated_at: project.updated_at,
          sections: project.sections.map { |section| serialize_section(section) }
        }
      end

      def serialize_section(section)
        {
          id: section.id,
          title: section.title,
          position: section.position,
          subsections: section.subsections.map { |subsection| serialize_subsection(subsection) }
        }
      end

      def serialize_subsection(subsection)
        subsection.attributes.slice("id", "title", "position", "viewer_sees", "explanation_notes", "script", "estimated_seconds")
      end
    end
  end
end
