require "test_helper"

class VideoProjectTest < ActiveSupport::TestCase
  test "planned duration sums only estimated subsections" do
    project = VideoProject.create!(title: "Test project")
    section = project.sections.create!(title: "Opening", position: 1)
    section.subsections.create!(position: 1, estimated_seconds: 30)
    section.subsections.create!(position: 2, estimated_seconds: nil)

    assert_equal 30, project.planned_duration_seconds
  end

  test "deleting a project deletes its hierarchy" do
    project = VideoProject.create!(title: "Test project")
    section = project.sections.create!(title: "Opening", position: 1)
    subsection = section.subsections.create!(position: 1)

    project.destroy!

    assert_not Section.exists?(section.id)
    assert_not Subsection.exists?(subsection.id)
  end
end
