class CorsMiddleware
  ALLOWED_METHODS = %w[GET POST PUT PATCH DELETE OPTIONS].freeze
  ALLOWED_HEADERS = %w[Authorization Content-Type].freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    return preflight_response if env['REQUEST_METHOD'] == 'OPTIONS'

    status, headers, body = @app.call(env)
    [status, cors_headers.merge(headers), body]
  end

  private

  def preflight_response
    [204, cors_headers, []]
  end

  def cors_headers
    {
      'Access-Control-Allow-Origin' => '*',
      'Access-Control-Allow-Methods' => ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers' => ALLOWED_HEADERS.join(', '),
      'Access-Control-Max-Age' => '86400'
    }
  end
end
