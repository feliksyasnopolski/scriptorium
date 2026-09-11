class Section < ApplicationRecord
  belongs_to :video_project, inverse_of: :sections
  has_many :subsections, -> { order(:position) }, dependent: :destroy, inverse_of: :section

  validates :title, presence: true
  validates :position, numericality: { only_integer: true, greater_than: 0 }
end
