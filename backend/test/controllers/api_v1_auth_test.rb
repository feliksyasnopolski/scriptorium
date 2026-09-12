require "test_helper"

class ApiV1AuthTest < ActionDispatch::IntegrationTest
  test "signs up, logs in, identifies and revokes a device session" do
    post "/api/v1/auth/signup", params: { username: "Alice", password: "password123", password_confirmation: "password123" }
    assert_response :created
    token = response.parsed_body.fetch("token")
    user = response.parsed_body.fetch("user")
    session = DeviceSession.last
    assert_not_includes session.token_digest, token

    get "/api/v1/auth/current", headers: { "Authorization" => "Bearer #{token}" }
    assert_equal user, response.parsed_body

    delete "/api/v1/auth/logout", headers: { "Authorization" => "Bearer #{token}" }
    assert_response :no_content
    get "/api/v1/auth/current", headers: { "Authorization" => "Bearer #{token}" }
    assert_response :unauthorized
  end

  test "logs in case insensitively and rejects invalid credentials" do
    User.create!(username: "Alice", password: "password123")
    post "/api/v1/auth/login", params: { username: "alice", password: "password123" }
    assert_response :created
    assert_equal "Alice", response.parsed_body.dig("user", "username")

    post "/api/v1/auth/login", params: { username: "alice", password: "wrong" }
    assert_response :unauthorized
  end

  test "rejects duplicate usernames case insensitively and protects projects" do
    post "/api/v1/auth/signup", params: { username: "Alice", password: "password123", password_confirmation: "password123" }
    post "/api/v1/auth/signup", params: { username: "alice", password: "password123", password_confirmation: "password123" }
    assert_response :unprocessable_entity

    get "/api/v1/projects"
    assert_response :unauthorized
  end

  test "does not let one user fetch, update, or delete another user's project" do
    owner = User.create!(username: "owner", password: "password123")
    _session, owner_token = DeviceSession.issue!(owner)
    post "/api/v1/projects", params: { project: { title: "Private" } }, headers: { "Authorization" => "Bearer #{owner_token}" }
    project_id = response.parsed_body.dig("project", "id")
    _other_session, other_token = DeviceSession.issue!(User.create!(username: "other", password: "password123"))
    headers = { "Authorization" => "Bearer #{other_token}" }
    get "/api/v1/projects/#{project_id}", headers: headers
    assert_response :not_found
    put "/api/v1/projects/#{project_id}/document", params: {}.to_json, headers: headers.merge("CONTENT_TYPE" => "application/json")
    assert_response :not_found
    delete "/api/v1/projects/#{project_id}", headers: headers
    assert_response :not_found
  end
end
