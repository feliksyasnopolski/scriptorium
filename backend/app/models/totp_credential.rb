class TotpCredential < ApplicationRecord
  belongs_to :user, inverse_of: :totp_credentials
  encrypts :secret

  validates :public_id, presence: true, uniqueness: true
  validates :label, presence: true, length: { maximum: 80 }
  validates :secret, presence: true
  before_validation :ensure_public_id, on: :create

  def confirmed?
    confirmed_at.present?
  end

  def verify(code, now: Time.current)
    totp = ROTP::TOTP.new(secret, issuer: "Scriptorium", period: 30, digits: 6)
    counter = (now.to_i / 30)
    return false if last_used_counter && counter <= last_used_counter
    return false unless totp.verify(code.to_s, drift_behind: 30, drift_ahead: 30, at: now)

    update!(last_used_counter: counter, last_used_at: now) if has_attribute?(:last_used_at)
    update!(last_used_counter: counter)
    true
  end

  private

  def ensure_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
