require "test_helper"

class ApiV1TotpTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(username: "totp-#{SecureRandom.hex(4)}", password: "password123")
    @other = User.create!(username: "other-#{SecureRandom.hex(4)}", password: "password123")
    _session, @token = DeviceSession.issue!(@user)
  end

  test "requires authentication and password to begin setup, then confirms valid code" do
    post "/api/v1/account/totp", params: { label: "Phone", password: "wrong" }, headers: auth_headers
    assert_response :unauthorized
    post "/api/v1/account/totp", params: { label: "Phone", password: "password123" }, headers: auth_headers
    assert_response :created
    setup = response.parsed_body
    credential = @user.totp_credentials.find_by!(public_id: setup.dig("credential", "id"))
    assert_not credential.confirmed?
    assert_not_equal credential.secret, ActiveRecord::Base.connection.select_value("SELECT secret FROM totp_credentials WHERE id = #{credential.id}")

    code = ROTP::TOTP.new(credential.secret, period: 30, digits: 6).at(Time.current)
    post "/api/v1/account/totp/#{credential.public_id}/confirm", params: { password: "password123", code: code }, headers: auth_headers
    assert_response :success
    assert credential.reload.confirmed?
  end

  test "supports multiple credentials and only exposes current users credentials" do
    2.times do
      post "/api/v1/account/totp", params: { password: "password123" }, headers: auth_headers
      credential = @user.totp_credentials.last
      code = ROTP::TOTP.new(credential.secret).at(Time.current)
      post "/api/v1/account/totp/#{credential.public_id}/confirm", params: { password: "password123", code: code }, headers: auth_headers
    end
    get "/api/v1/account/totp", headers: auth_headers
    assert_equal 2, response.parsed_body["credentials"].length
    _session, other_token = DeviceSession.issue!(@other)
    delete "/api/v1/account/totp/#{@user.totp_credentials.first.public_id}", params: { password: "password123" }, headers: { "Authorization" => "Bearer #{other_token}" }
    assert_response :not_found
  end

  test "recovery resets password, revokes old sessions, and rejects replay" do
    credential = @user.totp_credentials.create!(secret: ROTP::Base32.random, confirmed_at: Time.current)
    code = ROTP::TOTP.new(credential.secret).at(Time.current)
    post "/api/v1/auth/recover", params: { username: @user.username, code: code, password: "newpassword", password_confirmation: "newpassword" }
    assert_response :created
    fresh_token = response.parsed_body["token"]
    assert_not_equal @token, fresh_token
    get "/api/v1/auth/current", headers: auth_headers
    assert_response :unauthorized
    get "/api/v1/auth/current", headers: { "Authorization" => "Bearer #{fresh_token}" }
    assert_response :success
    assert @user.reload.valid_password?("newpassword")

    post "/api/v1/auth/recover", params: { username: @user.username, code: code, password: "anotherpass", password_confirmation: "anotherpass" }
    assert_response :unauthorized
  end

  test "recovery failure does not reveal whether the username is configured" do
    post "/api/v1/auth/recover", params: { username: "missing-#{SecureRandom.hex(4)}", code: "000000", password: "newpassword", password_confirmation: "newpassword" }
    assert_response :unauthorized
    assert_equal "Recovery code is invalid or recovery is unavailable", response.parsed_body["error"]
  end

  private

  def auth_headers
    { "Authorization" => "Bearer #{@token}" }
  end
end
