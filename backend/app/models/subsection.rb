class Subsection < ApplicationRecord
  belongs_to :section, inverse_of: :subsections

  validates :position, numericality: { only_integer: true, greater_than: 0 }
  validates :estimated_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
end
