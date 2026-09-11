module Api
  module V1
    class SectionsController < BaseController
      before_action :set_project
      before_action :set_section, only: %i[update destroy move_up move_down]

      def create
        section = @project.sections.new(section_params.merge(position: @project.sections.maximum(:position).to_i + 1))
        return render_errors(section) unless section.save

        render json: serialized_project, status: :created
      end

      def update
        return render_errors(@section) unless @section.update(section_params)

        normalize_positions
        render json: serialized_project
      end

      def destroy
        @section.destroy!
        normalize_positions
        render json: serialized_project
      end

      def move_up
        swap_section(-1)
      end

      def move_down
        swap_section(1)
      end

      private

      def set_project
        @project = VideoProject.find(request.path_parameters[:project_id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def set_section
        @section = @project.sections.find(request.path_parameters[:id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def section_params
        body_params.fetch("section", {}).select { |key, _| key == "title" }.symbolize_keys
      end

      def swap_section(direction)
        sibling = @project.sections.where(position: @section.position + direction).first
        if sibling
          Section.transaction do
            section_position = @section.position
            sibling_position = sibling.position
            @section.update_column(:position, -1)
            sibling.update_column(:position, section_position)
            @section.update_column(:position, sibling_position)
          end
        end
        normalize_positions
        render json: serialized_project
      end

      def normalize_positions
        @project.sections.order(:position, :id).each_with_index { |section, index| section.update_column(:position, index + 1) }
      end

      def serialized_project
        @project.reload
        @project.sections.load
        { id: @project.id, title: @project.title, target_duration_seconds: @project.target_duration_seconds,
          planned_duration_seconds: @project.planned_duration_seconds, sections: @project.sections.map do |section|
            { id: section.id, title: section.title, position: section.position,
              subsections: section.subsections.order(:position).map { |subsection| subsection.attributes.slice("id", "title", "position", "viewer_sees", "explanation_notes", "script", "estimated_seconds") } }
          end }
      end
    end
  end
end
