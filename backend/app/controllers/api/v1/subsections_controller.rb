module Api
  module V1
    class SubsectionsController < BaseController
      before_action :set_section
      before_action :set_subsection, only: %i[update destroy move_up move_down]

      def create
        subsection = @section.subsections.new(subsection_params.merge(position: @section.subsections.maximum(:position).to_i + 1))
        return render_errors(subsection) unless subsection.save

        render json: serialized_project, status: :created
      end

      def update
        return render_errors(@subsection) unless @subsection.update(subsection_params)

        render json: serialized_project
      end

      def destroy
        @subsection.destroy!
        normalize_positions
        render json: serialized_project
      end

      def move_up
        swap_subsection(-1)
      end

      def move_down
        swap_subsection(1)
      end

      private

      def set_section
        @section = Section.find(request.path_parameters[:section_id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def set_subsection
        @subsection = @section.subsections.find(request.path_parameters[:id])
      rescue ActiveRecord::RecordNotFound
        render_not_found
      end

      def subsection_params
        body_params.fetch("subsection", {}).select { |key, _| %w[title viewer_sees explanation_notes script estimated_seconds].include?(key) }.symbolize_keys
      end

      def swap_subsection(direction)
        sibling = @section.subsections.where(position: @subsection.position + direction).first
        if sibling
          Subsection.transaction do
            subsection_position = @subsection.position
            sibling_position = sibling.position
            @subsection.update_column(:position, -1)
            sibling.update_column(:position, subsection_position)
            @subsection.update_column(:position, sibling_position)
          end
        end
        normalize_positions
        render json: serialized_project
      end

      def normalize_positions
        @section.subsections.order(:position, :id).each_with_index { |subsection, index| subsection.update_column(:position, index + 1) }
      end

      def serialized_project
        project = @section.video_project.reload
        { id: project.id, title: project.title, target_duration_seconds: project.target_duration_seconds,
          planned_duration_seconds: project.planned_duration_seconds, sections: project.sections.order(:position).map do |section|
            { id: section.id, title: section.title, position: section.position,
              subsections: section.subsections.order(:position).map { |subsection| subsection.attributes.slice("id", "title", "position", "viewer_sees", "explanation_notes", "script", "estimated_seconds") } }
          end }
      end
    end
  end
end
