class CreateScriptoriumDomain < ActiveRecord::Migration[8.1]
  def change
    create_table :video_projects do |t|
      t.string :title, null: false
      t.integer :target_duration_seconds
      t.timestamps
    end

    create_table :sections do |t|
      t.references :video_project, null: false, foreign_key: true
      t.string :title, null: false
      t.integer :position, null: false
      t.timestamps
    end
    add_index :sections, [:video_project_id, :position]

    create_table :subsections do |t|
      t.references :section, null: false, foreign_key: true
      t.string :title
      t.integer :position, null: false
      t.text :viewer_sees, null: false, default: ""
      t.text :explanation_notes, null: false, default: ""
      t.text :script, null: false, default: ""
      t.integer :estimated_seconds
      t.timestamps
    end
    add_index :subsections, [:section_id, :position]
  end
end
