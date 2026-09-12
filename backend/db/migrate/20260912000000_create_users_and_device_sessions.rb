class CreateUsersAndDeviceSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :username, null: false
      t.string :encrypted_password, null: false
      t.timestamps
    end
    add_index :users, "LOWER(username)", unique: true, name: "index_users_on_lower_username"

    create_table :device_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :last_used_at
      t.datetime :revoked_at
      t.timestamps
    end
    add_index :device_sessions, :token_digest, unique: true

    add_reference :video_projects, :user, foreign_key: true
    migrate_existing_projects
    change_column_null :video_projects, :user_id, false
  end

  private

  def migrate_existing_projects
    return if VideoProject.none?

    user = User.create!(username: "local-development-#{SecureRandom.hex(4)}", password: SecureRandom.hex(32))
    VideoProject.update_all(user_id: user.id)
  end
end
