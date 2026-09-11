class AddDocumentContractToScriptoriumDomain < ActiveRecord::Migration[8.1]
  def up
    add_column :video_projects, :public_id, :string
    add_column :video_projects, :revision, :integer, null: false, default: 0
    add_column :sections, :public_id, :string
    add_column :subsections, :public_id, :string

    VideoProject.reset_column_information
    Section.reset_column_information
    Subsection.reset_column_information
    VideoProject.find_each { |project| project.update_columns(public_id: SecureRandom.uuid) }
    Section.find_each { |section| section.update_columns(public_id: SecureRandom.uuid) }
    Subsection.find_each { |subsection| subsection.update_columns(public_id: SecureRandom.uuid) }

    change_column_null :video_projects, :public_id, false
    change_column_null :sections, :public_id, false
    change_column_null :subsections, :public_id, false
    add_index :video_projects, :public_id, unique: true
    add_index :sections, :public_id, unique: true
    add_index :subsections, :public_id, unique: true
  end

  def down
    remove_index :subsections, :public_id
    remove_index :sections, :public_id
    remove_index :video_projects, :public_id
    remove_columns :subsections, :public_id
    remove_columns :sections, :public_id
    remove_columns :video_projects, :public_id, :revision
  end
end
