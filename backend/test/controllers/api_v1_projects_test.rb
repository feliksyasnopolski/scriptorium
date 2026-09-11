require "test_helper"

class ApiV1ProjectsTest < ActionDispatch::IntegrationTest
  test "project API returns ordered hierarchy and supports CRUD" do
    post "/api/v1/projects", params: { project: { title: "Lenovo Tab M11" } }
    assert_response :created
    project_id = response.parsed_body.fetch("id")

    post "/api/v1/projects/#{project_id}/sections", params: { section: { title: "Opening" } }
    assert_response :created
    section_id = response.parsed_body.fetch("sections").first.fetch("id")
    post "/api/v1/projects/#{project_id}/sections", params: { section: { title: "TCL11" } }
    second_section_id = response.parsed_body.fetch("sections").last.fetch("id")

    post "/api/v1/projects/#{project_id}/sections/#{second_section_id}/move_up"
    assert_response :success
    assert_equal [second_section_id, section_id], response.parsed_body.fetch("sections").map { |section| section.fetch("id") }

    post "/api/v1/projects/#{project_id}/sections/#{second_section_id}/subsections", params: { subsection: { script: "Hello", estimated_seconds: 90 } }
    assert_response :created
    subsection_id = response.parsed_body.fetch("sections").first.fetch("subsections").first.fetch("id")
    get "/api/v1/projects/#{project_id}"
    assert_response :success
    assert_equal "Hello", response.parsed_body.fetch("sections").first.fetch("subsections").first.fetch("script")
    assert_equal 90, response.parsed_body.fetch("planned_duration_seconds")

    patch "/api/v1/projects/#{project_id}/sections/#{second_section_id}/subsections/#{subsection_id}", params: { subsection: { script: "Updated" } }
    assert_response :success
    delete "/api/v1/projects/#{project_id}"
    assert_response :no_content
    assert_not VideoProject.exists?(project_id)
  end

  test "invalid project title returns useful JSON errors" do
    post "/api/v1/projects", params: { project: { title: "" } }

    assert_response :unprocessable_entity
    assert_equal ["can't be blank"], response.parsed_body.fetch("errors").fetch("title")
  end
end
