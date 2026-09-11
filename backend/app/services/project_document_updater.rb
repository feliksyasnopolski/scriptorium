class ProjectDocumentUpdater
  SUBSECTION_FIELDS = %w[title viewer_sees explanation_notes script estimated_seconds].freeze

  def initialize(project, document)
    @project = project
    @document = document
  end

  def call
    VideoProject.transaction do
      update_project
      incoming_sections = @document.fetch("sections")
      existing_sections = @project.sections.index_by(&:public_id)

      incoming_sections.each_with_index do |section_data, section_index|
        section = existing_sections.delete(section_data["id"]) || @project.sections.build(public_id: section_data.fetch("id"))
        section.title = section_data.fetch("title")
        section.position = section_index + 1
        section.save!
        reconcile_subsections(section, section_data.fetch("subsections"))
      end

      existing_sections.values.each(&:destroy!)
      @project.update!(revision: @project.revision + 1)
    end
  end

  private

  def update_project
    @project.title = @document.fetch("title")
    @project.target_duration_seconds = @document["target_duration_seconds"]
    @project.save!
  end

  def reconcile_subsections(section, subsection_data)
    existing = section.subsections.index_by(&:public_id)
    subsection_data.each_with_index do |data, index|
      subsection = existing.delete(data["id"]) || section.subsections.build(public_id: data.fetch("id"))
      subsection.position = index + 1
      SUBSECTION_FIELDS.each { |field| subsection.public_send("#{field}=", data[field]) }
      subsection.save!
    end
    existing.values.each(&:destroy!)
  end
end
