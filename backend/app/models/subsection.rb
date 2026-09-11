class Subsection < ApplicationRecord
  belongs_to :section, inverse_of: :subsections

  validates :position, numericality: { only_integer: true, greater_than: 0 }
  validates :estimated_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
  validates :public_id, presence: true, uniqueness: true

  before_validation :ensure_public_id, on: :create

  private

  def ensure_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
