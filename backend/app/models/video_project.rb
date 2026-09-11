class VideoProject < ApplicationRecord
  has_many :sections, -> { order(:position) }, dependent: :destroy, inverse_of: :video_project

  validates :title, presence: true
  validates :target_duration_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  def planned_duration_seconds
    sections.sum { |section| section.subsections.sum { |subsection| subsection.estimated_seconds.to_i } }
  end
end
