class DeviceSession < ApplicationRecord
  belongs_to :user, inverse_of: :device_sessions

  validates :token_digest, presence: true, uniqueness: true

  def self.issue!(user)
    raw_token = SecureRandom.urlsafe_base64(48)
    session = create!(user: user, token_digest: digest(raw_token))
    [session, raw_token]
  end

  def self.authenticate(raw_token)
    return if raw_token.blank?

    session = find_by(token_digest: digest(raw_token))
    return if session.nil? || session.revoked_at.present?

    session.update_column(:last_used_at, Time.current)
    session
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def self.revoke_all_for!(user)
    where(user: user, revoked_at: nil).update_all(revoked_at: Time.current, updated_at: Time.current)
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end
  private_class_method :digest
end
