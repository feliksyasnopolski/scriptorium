# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_12_100000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "device_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "last_used_at"
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_device_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_device_sessions_on_user_id"
  end

  create_table "sections", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "position", null: false
    t.string "public_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "video_project_id", null: false
    t.index ["public_id"], name: "index_sections_on_public_id", unique: true
    t.index ["video_project_id", "position"], name: "index_sections_on_video_project_id_and_position"
    t.index ["video_project_id"], name: "index_sections_on_video_project_id"
  end

  create_table "subsections", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "estimated_seconds"
    t.text "explanation_notes", default: "", null: false
    t.integer "position", null: false
    t.string "public_id", null: false
    t.text "script", default: "", null: false
    t.bigint "section_id", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.text "viewer_sees", default: "", null: false
    t.index ["public_id"], name: "index_subsections_on_public_id", unique: true
    t.index ["section_id", "position"], name: "index_subsections_on_section_id_and_position"
    t.index ["section_id"], name: "index_subsections_on_section_id"
  end

  create_table "totp_credentials", force: :cascade do |t|
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.string "label", default: "Authenticator", null: false
    t.bigint "last_used_counter"
    t.string "public_id", null: false
    t.text "secret", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["public_id"], name: "index_totp_credentials_on_public_id", unique: true
    t.index ["user_id"], name: "index_totp_credentials_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "encrypted_password", null: false
    t.string "public_id", null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index "lower((username)::text)", name: "index_users_on_lower_username", unique: true
    t.index ["public_id"], name: "index_users_on_public_id", unique: true
  end

  create_table "video_projects", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "public_id", null: false
    t.integer "revision", default: 0, null: false
    t.integer "target_duration_seconds"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["public_id"], name: "index_video_projects_on_public_id", unique: true
    t.index ["user_id"], name: "index_video_projects_on_user_id"
  end

  add_foreign_key "device_sessions", "users"
  add_foreign_key "sections", "video_projects"
  add_foreign_key "subsections", "sections"
  add_foreign_key "totp_credentials", "users"
  add_foreign_key "video_projects", "users"
end
