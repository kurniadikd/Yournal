use serde::Serialize;
use std::fs;
use tauri::{Manager, path::BaseDirectory};

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
}

fn get_template_list() -> Vec<TemplateInfo> {
    vec![
        // --- CBT & Basic ---
        TemplateInfo {
            id: "cbt_thought_record".into(),
            name: "Rekam Pikiran (CBT)".into(),
            description: "Identifikasi & tantang pikiran negatif".into(),
            icon: "psychology".into(),
        },
        TemplateInfo {
            id: "daily_checkin".into(),
            name: "Cek Harian".into(),
            description: "Mindfulness & kondisi emosi".into(),
            icon: "person_check".into(),
        },
        TemplateInfo {
            id: "swot".into(),
            name: "Analisis SWOT".into(),
            description: "Strengths, Weaknesses, Opportunities, Threats".into(),
            icon: "target".into(),
        },

        // --- Psikologi Positif ---
        TemplateInfo {
            id: "gratitude".into(),
            name: "Gratitude Journal".into(),
            description: "Jurnal Syukur: Fokus hal positif harian".into(),
            icon: "volunteer_activism".into(),
        },
        TemplateInfo {
            id: "three_good_things".into(),
            name: "Three Good Things".into(),
            description: "3 kejadian baik & alasannya".into(),
            icon: "thumb_up".into(),
        },

        // --- Mindfulness ---
        TemplateInfo {
            id: "brain_dump".into(),
            name: "Brain Dump".into(),
            description: "Tulis bebas untuk lepas beban mental".into(),
            icon: "delete_sweep".into(),
        },
        TemplateInfo {
            id: "body_scan".into(),
            name: "Body Scan & Emotion".into(),
            description: "Sadari letak emosi di tubuh".into(),
            icon: "accessibility_new".into(),
        },
        TemplateInfo {
            id: "stop_technique".into(),
            name: "Teknik STOP".into(),
            description: "Stop, Take breath, Observe, Proceed".into(),
            icon: "pan_tool".into(),
        },

        // --- ACT (Acceptance & Commitment) ---
        TemplateInfo {
            id: "value_alignment".into(),
            name: "Value-Action Alignment".into(),
            description: "Cek keselarasan tindakan & nilai diri".into(),
            icon: "balance".into(),
        },
        TemplateInfo {
            id: "trigger_identification".into(),
            name: "Identifikasi Pemicu".into(),
            description: "Pahami pola emosi & trigger-nya".into(),
            icon: "warning".into(),
        },
        TemplateInfo {
            id: "worry_time".into(),
            name: "Kotak Kecemasan (Worry Time)".into(),
            description: "Tunda & kelola cemas di waktu khusus".into(),
            icon: "inventory_2".into(),
        },

        // --- Refleksi & Pertumbuhan ---
        TemplateInfo {
            id: "unsent_letter".into(),
            name: "Surat Tak Terkirim".into(),
            description: "Proses emosi ke orang lain/masa lalu".into(),
            icon: "mail".into(),
        },
        TemplateInfo {
            id: "self_compassion".into(),
            name: "Surat Welas Asih".into(),
            description: "Berdamai dengan diri sendiri".into(),
            icon: "favorite".into(),
        },
        TemplateInfo {
            id: "success_journal".into(),
            name: "Success Journal".into(),
            description: "Catat kemenangan kecil & besar".into(),
            icon: "emoji_events".into(),
        },
        TemplateInfo {
            id: "pattern_analysis".into(),
            name: "Analisis Pola Mingguan".into(),
            description: "Hubungan mood, tidur, & energi".into(),
            icon: "timeline".into(),
        },

        // --- Produktivitas ---
        TemplateInfo {
            id: "eisenhower".into(),
            name: "Eisenhower Matrix".into(),
            description: "Prioritas tugas berdasarkan urgensi".into(),
            icon: "grid_view".into(),
        },
        TemplateInfo {
            id: "weekly_review".into(),
            name: "Weekly Review".into(),
            description: "Evaluasi mingguan & rencana depan".into(),
            icon: "next_week".into(),
        },
        TemplateInfo {
            id: "smart_goals".into(),
            name: "SMART Goals".into(),
            description: "Tujuan Spesifik, Terukur, & Realistis".into(),
            icon: "flag".into(),
        },
        TemplateInfo {
            id: "pomodoro_log".into(),
            name: "Pomodoro Log".into(),
            description: "Lacak sesi fokus & istirahat".into(),
            icon: "timer".into(),
        },

        // --- Keputusan & Problem Solving ---
        TemplateInfo {
            id: "pro_cons".into(),
            name: "Pro & Cons List".into(),
            description: "Bandingkan keuntungan & kerugian".into(),
            icon: "thumbs_up_down".into(),
        },
        TemplateInfo {
            id: "rule_101010".into(),
            name: "Rule 10-10-10".into(),
            description: "Dampak dalam 10 menit, bulan, tahun".into(),
            icon: "schedule".into(),
        },
        TemplateInfo {
            id: "5_whys".into(),
            name: "5 Whys (Akar Masalah)".into(),
            description: "Tanya 'Kenapa' 5x untuk solusi".into(),
            icon: "help_center".into(),
        },

        // --- Kreativitas & Belajar ---
        TemplateInfo {
            id: "scamper".into(),
            name: "SCAMPER (Ideasi)".into(),
            description: "Teknik brainstorming kreatif".into(),
            icon: "lightbulb".into(),
        },
        TemplateInfo {
            id: "cornell_notes".into(),
            name: "Cornell Notes".into(),
            description: "Catatan studi terstruktur & efektif".into(),
            icon: "school".into(),
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

    fs::read_to_string(&final_path)
        .map_err(|e| format!("Failed to read template '{}' from path '{:?}': {}", id, final_path, e))
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
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:yournal.db", migrations)
                .build()
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
        .invoke_handler(tauri::generate_handler![greet, get_templates, get_template_content])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}