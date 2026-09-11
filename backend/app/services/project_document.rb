class ProjectDocument
  SCHEMA_VERSION = 1

  def self.render(project)
    new(project).render
  end

  def initialize(project)
    @project = project
  end

  def render
    {
      schema_version: SCHEMA_VERSION,
      revision: @project.revision,
      project: {
        id: @project.public_id,
        title: @project.title,
        target_duration_seconds: @project.target_duration_seconds,
        sections: @project.sections.sort_by(&:position).map do |section|
          {
            id: section.public_id,
            title: section.title,
            subsections: section.subsections.sort_by(&:position).map do |subsection|
              {
                id: subsection.public_id,
                title: subsection.title,
                viewer_sees: subsection.viewer_sees,
                explanation_notes: subsection.explanation_notes,
                script: subsection.script,
                estimated_seconds: subsection.estimated_seconds
              }
            end
          }
        end
      }
    }
  end
end
