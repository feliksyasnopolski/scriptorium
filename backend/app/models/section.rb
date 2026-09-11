class Section < ApplicationRecord
  belongs_to :video_project, inverse_of: :sections
  has_many :subsections, -> { order(:position) }, dependent: :destroy, inverse_of: :section

  validates :title, presence: true
  validates :position, numericality: { only_integer: true, greater_than: 0 }
  validates :public_id, presence: true, uniqueness: true

  before_validation :ensure_public_id, on: :create

  private

  def ensure_public_id
    self.public_id ||= SecureRandom.uuid
  end
end
