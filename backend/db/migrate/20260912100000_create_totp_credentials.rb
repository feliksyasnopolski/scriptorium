class CreateTotpCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :totp_credentials do |t|
      t.references :user, null: false, foreign_key: true
      t.string :public_id, null: false
      t.string :label, null: false, default: "Authenticator"
      t.text :secret, null: false
      t.datetime :confirmed_at
      t.bigint :last_used_counter
      t.timestamps
    end
    add_index :totp_credentials, :public_id, unique: true
  end
end
