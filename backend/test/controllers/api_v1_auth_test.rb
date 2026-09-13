require "test_helper"

class ApiV1AuthTest < ActionDispatch::IntegrationTest
  test "signs up, logs in, identifies and revokes a device session" do
    post "/api/v1/auth/signup", params: { username: "Alice", password: "password123", password_confirmation: "password123", turnstile_token: "test-token" }
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

  test "rejects signup without a Turnstile token and does not create a user" do
    assert_no_difference("User.count") do
      post "/api/v1/auth/signup", params: { username: "missing-token", password: "password123", password_confirmation: "password123" }
    end

    assert_response :unprocessable_entity
    assert_equal "Signup verification failed. Please try again.", response.parsed_body["error"]
  end

  test "rejects failed Turnstile verification and does not create a user" do
    with_turnstile_verification(false) do
      assert_no_difference("User.count") do
        post "/api/v1/auth/signup", params: { username: "failed-token", password: "password123", password_confirmation: "password123", turnstile_token: "invalid-token" }
      end
    end

    assert_response :unprocessable_entity
  end

  test "rejects a Turnstile verification failure safely" do
    with_http_timeout do
      assert_no_difference("User.count") do
        post "/api/v1/auth/signup", params: { username: "network-failure", password: "password123", password_confirmation: "password123", turnstile_token: "token" }
      end
    end

    assert_response :unprocessable_entity
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
    with_turnstile_verification(true) do
      post "/api/v1/auth/signup", params: { username: "Alice", password: "password123", password_confirmation: "password123", turnstile_token: "valid-token" }
      post "/api/v1/auth/signup", params: { username: "alice", password: "password123", password_confirmation: "password123", turnstile_token: "valid-token" }
    end
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

  private

  def with_turnstile_verification(result)
    original = TurnstileVerifier.method(:verify)
    TurnstileVerifier.define_singleton_method(:verify) { |_token, _remote_ip| result }
    yield
  ensure
    TurnstileVerifier.define_singleton_method(:verify, original)
  end

  def with_http_timeout
    original = Net::HTTP.method(:start)
    Net::HTTP.define_singleton_method(:start) { |*| raise Net::OpenTimeout }
    yield
  ensure
    Net::HTTP.define_singleton_method(:start, original)
  end
end
