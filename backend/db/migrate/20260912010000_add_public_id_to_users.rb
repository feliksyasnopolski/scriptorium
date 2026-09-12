class AddPublicIdToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :public_id, :string
    User.reset_column_information
    User.find_each { |user| user.update_columns(public_id: SecureRandom.uuid) }
    change_column_null :users, :public_id, false
    add_index :users, :public_id, unique: true
  end
end
