require "net/http"
require "uri"

class TurnstileVerifier
  ENDPOINT = URI("https://challenges.cloudflare.com/turnstile/v0/siteverify")
  TEST_SECRET = "1x0000000000000000000000000000000AA"
  TIMEOUT_SECONDS = 3

  def self.verify(token, remote_ip = nil)
    return false if token.blank?

    secret = Rails.env.production? ? ENV["TURNSTILE_SECRET_KEY"].presence : ENV.fetch("TURNSTILE_SECRET_KEY", TEST_SECRET)
    return false if secret.blank?

    request = Net::HTTP::Post.new(ENDPOINT)
    request.set_form_data("secret" => secret, "response" => token, "remoteip" => remote_ip.to_s)
    response = Net::HTTP.start(ENDPOINT.host, ENDPOINT.port, use_ssl: true,
      open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) { |http| http.request(request) }
    JSON.parse(response.body).fetch("success", false) == true
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNREFUSED
    false
  end
end
