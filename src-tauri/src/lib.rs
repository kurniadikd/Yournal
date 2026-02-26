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

#[derive(Serialize, Clone)]
struct TemplateInfo {
    id: String,
    name: String,
    description: String,
    icon: String,
    category: String,
}

fn get_template_list() -> Vec<TemplateInfo> {
    vec![
        // ======================================
        // 1. Dasar & Keseharian (Daily & Basics)
        // ======================================
        TemplateInfo {
            id: "daily_checkin".into(),
            name: "Cek Harian".into(),
            description: "Mindfulness & kondisi emosi".into(),
            icon: "person_check".into(),
            category: "Dasar & Keseharian".into(),
        },
        TemplateInfo {
            id: "gratitude".into(),
            name: "Gratitude Journal".into(),
            description: "Jurnal Syukur: Fokus hal positif harian".into(),
            icon: "volunteer_activism".into(),
            category: "Dasar & Keseharian".into(),
        },
        TemplateInfo {
            id: "three_good_things".into(),
            name: "Three Good Things".into(),
            description: "3 kejadian baik & alasannya".into(),
            icon: "thumb_up".into(),
            category: "Dasar & Keseharian".into(),
        },
        TemplateInfo {
            id: "success_journal".into(),
            name: "Success Journal".into(),
            description: "Catat kemenangan kecil & besar".into(),
            icon: "emoji_events".into(),
            category: "Dasar & Keseharian".into(),
        },
        // ======================================================
        // 2. Regulasi Emosi (Emotion Regulation & Therapy)
        // ======================================================
        TemplateInfo {
            id: "stop_technique".into(),
            name: "Teknik STOP".into(),
            description: "Stop, Take breath, Observe, Proceed".into(),
            icon: "pan_tool".into(),
            category: "Regulasi Emosi".into(),
        },
        TemplateInfo {
            id: "body_scan".into(),
            name: "Body Scan & Emotion".into(),
            description: "Sadari letak emosi di tubuh".into(),
            icon: "accessibility_new".into(),
            category: "Regulasi Emosi".into(),
        },
        TemplateInfo {
            id: "cbt_thought_record".into(),
            name: "Rekam Pikiran (CBT)".into(),
            description: "Identifikasi & tantang pikiran negatif".into(),
            icon: "psychology".into(),
            category: "Regulasi Emosi".into(),
        },
        TemplateInfo {
            id: "worry_time".into(),
            name: "Kotak Kecemasan (Worry Time)".into(),
            description: "Tunda & kelola cemas di waktu khusus".into(),
            icon: "inventory_2".into(),
            category: "Regulasi Emosi".into(),
        },
        TemplateInfo {
            id: "trigger_identification".into(),
            name: "Identifikasi Pemicu".into(),
            description: "Pahami pola emosi & trigger-nya".into(),
            icon: "warning".into(),
            category: "Regulasi Emosi".into(),
        },
        TemplateInfo {
            id: "radical_acceptance".into(),
            name: "Penerimaan Radikal".into(),
            description: "DBT: Terima proses kenyataan yang menyakitkan".into(),
            icon: "psychiatry".into(),
            category: "Regulasi Emosi".into(),
        },
        // ====================================================
        // 3. Refleksi & Hubungan (Reflection & Relationships)
        // ====================================================
        TemplateInfo {
            id: "brain_dump".into(),
            name: "Brain Dump".into(),
            description: "Tulis bebas untuk lepas beban mental".into(),
            icon: "delete_sweep".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "unsent_letter".into(),
            name: "Surat Tak Terkirim".into(),
            description: "Proses emosi ke orang lain/masa lalu".into(),
            icon: "mail".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "self_compassion".into(),
            name: "Surat Welas Asih".into(),
            description: "Berdamai dengan diri sendiri".into(),
            icon: "favorite".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "nvc_reflection".into(),
            name: "Refleksi NVC".into(),
            description: "Bedah konflik hubungan dengan Komunikasi Tanpa Kekerasan".into(),
            icon: "forum".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "habit_loop".into(),
            name: "Analisis Kebiasaan".into(),
            description: "Membedah pola perilaku".into(),
            icon: "loop".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "value_alignment".into(),
            name: "Value-Action Alignment".into(),
            description: "Cek keselarasan tindakan & nilai diri".into(),
            icon: "balance".into(),
            category: "Refleksi & Hubungan".into(),
        },
        TemplateInfo {
            id: "dream_log".into(),
            name: "Jurnal Mimpi".into(),
            description: "Mencatat pesan bawah sadar".into(),
            icon: "cloud_moon".into(),
            category: "Refleksi & Hubungan".into(),
        },
        // ==============================================
        // 4. Fokus & Perencanaan (Focus & Planning)
        // ==============================================
        TemplateInfo {
            id: "smart_goals".into(),
            name: "SMART Goals".into(),
            description: "Tujuan Spesifik, Terukur, & Realistis".into(),
            icon: "flag".into(),
            category: "Fokus & Perencanaan".into(),
        },
        TemplateInfo {
            id: "eisenhower".into(),
            name: "Eisenhower Matrix".into(),
            description: "Prioritas tugas berdasarkan urgensi".into(),
            icon: "grid_view".into(),
            category: "Fokus & Perencanaan".into(),
        },
        TemplateInfo {
            id: "pomodoro_log".into(),
            name: "Pomodoro Log".into(),
            description: "Lacak sesi fokus & istirahat".into(),
            icon: "timer".into(),
            category: "Fokus & Perencanaan".into(),
        },
        TemplateInfo {
            id: "session_log".into(), // Or whatever ID exists
            name: "Log Sesi".into(),
            description: "Rekap sesi kerja atau belajar".into(),
            icon: "assignment".into(),
            category: "Fokus & Perencanaan".into(),
        },
        TemplateInfo {
            id: "pattern_analysis".into(),
            name: "Analisis Pola Mingguan".into(),
            description: "Hubungan mood, tidur, & energi".into(),
            icon: "timeline".into(),
            category: "Fokus & Perencanaan".into(),
        },
        TemplateInfo {
            id: "weekly_review".into(),
            name: "Weekly Review".into(),
            description: "Evaluasi mingguan & rencana depan".into(),
            icon: "next_week".into(),
            category: "Fokus & Perencanaan".into(),
        },
        // ==============================================================
        // 5. Analisis & Pemecahan Masalah (Problem Solving & Ideation)
        // ==============================================================
        TemplateInfo {
            id: "pro_cons".into(),
            name: "Pro & Cons List".into(),
            description: "Bandingkan keuntungan & kerugian".into(),
            icon: "thumbs_up_down".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
        TemplateInfo {
            id: "rule_101010".into(),
            name: "Rule 10-10-10".into(),
            description: "Dampak dalam 10 menit, bulan, tahun".into(),
            icon: "schedule".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
        TemplateInfo {
            id: "swot".into(),
            name: "Analisis SWOT".into(),
            description: "Strengths, Weaknesses, Opportunities, Threats".into(),
            icon: "target".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
        TemplateInfo {
            id: "5_whys".into(),
            name: "5 Whys / Akar Masalah".into(),
            description: "Tanya 'Kenapa' 5x untuk solusi".into(),
            icon: "help_center".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
        TemplateInfo {
            id: "scamper".into(),
            name: "SCAMPER / Ideasi".into(),
            description: "Teknik brainstorming kreatif".into(),
            icon: "lightbulb".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
        TemplateInfo {
            id: "cornell_notes".into(),
            name: "Cornell Notes".into(),
            description: "Catatan studi terstruktur & efektif".into(),
            icon: "school".into(),
            category: "Analisis & Pemecahan Masalah".into(),
        },
    ]
}

#[tauri::command]
fn get_templates() -> Vec<TemplateInfo> {
    get_template_list()
}

#[tauri::command]
fn get_template_content(app_handle: tauri::AppHandle, id: String) -> Result<String, String> {
    // Try to resolve using Tauri's resource API (works in production bundle)
    let resource_path = app_handle
        .path()
        .resolve(format!("templates/{}.html", id), BaseDirectory::Resource)
        .unwrap_or_else(|_| {
            // Fallback for dev mode: assume we are in src-tauri or can reach templates directly
            std::path::PathBuf::from(format!("templates/{}.html", id))
        });

    // If the resolved path doesn't exist (common in dev if resource logic differs), try strictly local
    let final_path = if resource_path.exists() {
        resource_path
    } else {
        // Fallback: try relative to current working directory (usually src-tauri in dev)
        std::path::PathBuf::from(format!("templates/{}.html", id))
    };

    fs::read_to_string(&final_path).map_err(|e| {
        format!(
            "Failed to read template '{}' from path '{:?}': {}",
            id, final_path, e
        )
    })
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

    tauri::Builder::default()
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_opener::init())
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
            get_templates,
            get_template_content,
            convert_to_avif,
            connect_google_drive,
            exchange_google_token,
            upload_database_to_drive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
