require "devise"
require "devise/orm/active_record"

Devise.setup do |config|
  config.secret_key = Rails.application.secret_key_base
  config.stretches = 12
end
