require "test_helper"

class ApiV1ProjectsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(username: "project-test-#{SecureRandom.hex(4)}", password: "password123")
    _session, @token = DeviceSession.issue!(@user)
  end

  def auth_headers
    { "Authorization" => "Bearer #{@token}" }
  end

  def get(path, **options) = super(path, **options.merge(headers: auth_headers.merge(options[:headers] || {})))
  def post(path, **options) = super(path, **options.merge(headers: auth_headers.merge(options[:headers] || {})))
  def put(path, **options) = super(path, **options.merge(headers: auth_headers.merge(options[:headers] || {})))
  def delete(path, **options) = super(path, **options.merge(headers: auth_headers.merge(options[:headers] || {})))

  test "reads and replaces the canonical document" do
    post "/api/v1/projects", params: { project: { title: "Lenovo Tab M11" } }
    assert_response :created
    document = response.parsed_body
    project_id = document.dig("project", "id")
    assert_equal 1, document.fetch("schema_version")
    assert_equal 0, document.fetch("revision")

    section_id = SecureRandom.uuid
    subsection_id = SecureRandom.uuid
    replacement = document.merge("project" => document.fetch("project").merge(
      "title" => "Updated title",
      "sections" => [{ "id" => section_id, "title" => "Opening", "subsections" => [{ "id" => subsection_id, "title" => nil, "viewer_sees" => "Visuals", "explanation_notes" => "Intent", "script" => "Hello", "estimated_seconds" => 90 }] }]
    ))

    put "/api/v1/projects/#{project_id}/document", params: replacement.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    accepted = response.parsed_body
    assert_equal 1, accepted.fetch("revision")
    assert_equal "Updated title", accepted.dig("project", "title")
    assert_equal [section_id], accepted.dig("project", "sections").map { |section| section.fetch("id") }
    assert_equal [subsection_id], accepted.dig("project", "sections", 0, "subsections").map { |subsection| subsection.fetch("id") }

    get "/api/v1/projects/#{project_id}/document"
    assert_equal accepted, response.parsed_body
  end

  test "rejects stale revisions without applying them" do
    post "/api/v1/projects", params: { project: { title: "Original" } }
    document = response.parsed_body
    project_id = document.dig("project", "id")
    document["project"]["title"] = "First update"
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success

    document["project"]["title"] = "Stale update"
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :conflict
    assert_equal "First update", response.parsed_body.dig("document", "project", "title")
    assert_equal 1, response.parsed_body.dig("document", "revision")
  end

  test "invalid documents are atomic and reject unsupported schemas" do
    post "/api/v1/projects", params: { project: { title: "Original" } }
    document = response.parsed_body
    project_id = document.dig("project", "id")
    document["project"]["title"] = ""
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unprocessable_entity
    assert_equal "Original", VideoProject.find_by!(public_id: project_id).title
    assert_equal 0, VideoProject.find_by!(public_id: project_id).revision

    document["project"]["title"] = "Changed"
    document["schema_version"] = 99
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unprocessable_entity
  end

  test "normalizes array order and deletes omitted nested objects" do
    post "/api/v1/projects", params: { project: { title: "Order test" } }
    document = response.parsed_body
    project_id = document.dig("project", "id")
    ids = 2.times.map { SecureRandom.uuid }
    document["project"]["sections"] = ids.map { |id| { "id" => id, "title" => id, "subsections" => [] } }.reverse
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    assert_equal ids.reverse, response.parsed_body.dig("project", "sections").map { |section| section.fetch("id") }
    assert_equal [1, 2], VideoProject.find_by!(public_id: project_id).sections.order(:position).map(&:position)

    document = response.parsed_body
    document["project"]["sections"] = [document["project"]["sections"].first]
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    assert_equal 1, VideoProject.find_by!(public_id: project_id).sections.count
  end

  test "moves an existing subsection between sections without changing its id" do
    post "/api/v1/projects", params: { project: { title: "Move test" } }
    document = response.parsed_body
    project_id = document.dig("project", "id")
    first_section_id = SecureRandom.uuid
    second_section_id = SecureRandom.uuid
    subsection_id = SecureRandom.uuid
    document["project"]["sections"] = [
      { "id" => first_section_id, "title" => "First", "subsections" => [{ "id" => subsection_id, "title" => "Moved", "viewer_sees" => "", "explanation_notes" => "", "script" => "", "estimated_seconds" => nil }] },
      { "id" => second_section_id, "title" => "Second", "subsections" => [] }
    ]
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success

    document = response.parsed_body
    document["project"]["sections"][0]["subsections"] = []
    document["project"]["sections"][1]["subsections"] = [{ "id" => subsection_id, "title" => "Moved", "viewer_sees" => "", "explanation_notes" => "", "script" => "", "estimated_seconds" => nil }]
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    assert_equal subsection_id, response.parsed_body.dig("project", "sections", 1, "subsections", 0, "id")
    assert_equal 1, Subsection.where(public_id: subsection_id).count
  end

  test "invalid project title returns useful JSON errors" do
    post "/api/v1/projects", params: { project: { title: "" } }
    assert_response :unprocessable_entity
    assert_equal ["can't be blank"], response.parsed_body.fetch("errors").fetch("title")
  end

  test "accepts a client-generated id and complete document on create" do
    project_id = SecureRandom.uuid
    section_id = SecureRandom.uuid
    post "/api/v1/projects", params: { project: { id: project_id, title: "Offline project", target_duration_seconds: 300, sections: [{ id: section_id, title: "Opening", subsections: [] }] } }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :created
    assert_equal project_id, response.parsed_body.dig("project", "id")
    assert_equal [section_id], response.parsed_body.dig("project", "sections").map { |section| section.fetch("id") }
  end

  test "force overwrite explicitly replaces a stale document" do
    post "/api/v1/projects", params: { project: { title: "Original" } }
    document = response.parsed_body
    project_id = document.dig("project", "id")
    document["project"]["title"] = "Remote"
    put "/api/v1/projects/#{project_id}/document", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    document["project"]["title"] = "Local wins"
    put "/api/v1/projects/#{project_id}/document?force=true", params: document.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :success
    assert_equal "Local wins", response.parsed_body.dig("project", "title")
    assert_equal 2, response.parsed_body.fetch("revision")
  end
end
