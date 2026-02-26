use base64::{engine::general_purpose, Engine as _};
use rgb::RGBA8;
use serde::Serialize;
use std::fs;
use tauri::{path::BaseDirectory, Manager};

mod drive_api;
mod oauth;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Convert any image (PNG, JPG, WebP, GIF, BMP) to AVIF format.
/// Uses pure Rust crates — no external CLI dependencies.
/// Works on all platforms: Windows, macOS, Linux, Android, iOS.
#[tauri::command]
fn convert_to_avif(base64_data: String) -> Result<String, String> {
    // 1. Strip data URI prefix if present (e.g. "data:image/png;base64,")
    let raw_b64 = if let Some(pos) = base64_data.find(",") {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    // 2. Decode base64 to bytes
    let bytes = general_purpose::STANDARD
        .decode(raw_b64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // 3. Decode image using the `image` crate (supports PNG, JPG, WebP, GIF, BMP)
    let img =
        image::load_from_memory(&bytes).map_err(|e| format!("Failed to decode image: {}", e))?;

    let rgba_img = img.to_rgba8();
    let width = rgba_img.width() as usize;
    let height = rgba_img.height() as usize;

    // 4. Convert pixels to ravif's RGBA8 format
    let pixels: Vec<RGBA8> = rgba_img
        .pixels()
        .map(|p| RGBA8 {
            r: p[0],
            g: p[1],
            b: p[2],
            a: p[3],
        })
        .collect();

    // 5. Encode to AVIF using ravif (pure Rust, rav1e encoder)
    //    quality=50, speed=10 (maximum performance)
    let encoder = ravif::Encoder::new()
        .with_quality(50.0)
        .with_speed(10) // 10 = fastest processing
        .with_alpha_quality(50.0);

    let encoded = encoder
        .encode_rgba(ravif::Img::new(&pixels, width, height))
        .map_err(|e| format!("AVIF encoding failed: {}", e))?;

    // 6. Return as data URI
    let avif_b64 = general_purpose::STANDARD.encode(&encoded.avif_file);
    Ok(format!("data:image/avif;base64,{}", avif_b64))
}

#[tauri::command]
async fn connect_google_drive(app: tauri::AppHandle, client_id: String) -> Result<String, String> {
    oauth::start_oauth_flow(app, client_id)
}

#[tauri::command]
async fn exchange_google_token(
    client_id: String,
    client_secret: String,
    code: String,
) -> Result<oauth::AuthState, String> {
    oauth::exchange_code_for_token(client_id, client_secret, code).await
}

#[tauri::command]
async fn upload_database_to_drive(
    app: tauri::AppHandle,
    access_token: String,
) -> Result<String, String> {
    // 1. Get database path
    let db_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("yournal.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    // 2. Get or create backup folder
    let folder_id = drive_api::get_or_create_backup_folder(&access_token).await?;

    // 3. Upload database
    let file_id = drive_api::upload_database(&access_token, &folder_id, db_path).await?;

    Ok(file_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_notes_table",
            sql: "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                mood TEXT,
                date TEXT,
                time TEXT,
                created_at TEXT,
                updated_at TEXT
            );",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "add_location_column",
            sql: "ALTER TABLE notes ADD COLUMN location TEXT;",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "add_weather_column",
            sql: "ALTER TABLE notes ADD COLUMN weather TEXT;",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "add_tags_column",
            sql: "ALTER TABLE notes ADD COLUMN tags TEXT;",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(mobile)]
    {
        builder = builder
            .plugin(tauri_plugin_biometric::init())
            .plugin(tauri_plugin_barcode_scanner::init())
            .plugin(tauri_plugin_haptics::init());
    }

    builder
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_share::init())
        .plugin(tauri_plugin_device::init())
        .plugin(tauri_plugin_network::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:yournal.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                _app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            convert_to_avif,
            connect_google_drive,
            exchange_google_token,
            upload_database_to_drive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
