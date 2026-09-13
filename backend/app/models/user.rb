class User < ApplicationRecord
  devise :database_authenticatable

  has_many :video_projects, dependent: :destroy, inverse_of: :user
  has_many :projects, class_name: "VideoProject", dependent: :destroy, inverse_of: :user
  has_many :device_sessions, dependent: :destroy, inverse_of: :user
  has_many :totp_credentials, dependent: :destroy, inverse_of: :user

  attr_accessor :password_confirmation

  validates :username, presence: true, length: { in: 1..80 }
  validates :username, uniqueness: { case_sensitive: false }
  validates :password, confirmation: true, length: { minimum: 8 }, allow_nil: true
  validates :public_id, presence: true, uniqueness: true

  before_validation :ensure_public_id, on: :create
  validate :username_is_printable
  validate :password_is_present, on: :create

  def self.find_for_database_authentication(warden_conditions)
    username = warden_conditions[:username].to_s
    where("LOWER(username) = LOWER(?)", username).first
  end

  def public_id
    self[:public_id]
  end

  private

  def username_is_printable
    errors.add(:username, "must contain printable characters only") unless username.to_s.match?(/\A[[:print:]]+\z/)
  end

  def password_is_present
    errors.add(:password, "can't be blank") if password.blank?
  end

  def ensure_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
