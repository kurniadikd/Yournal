use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::{multipart, Client};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

#[derive(Deserialize, Debug)]
struct DriveFileList {
    files: Vec<DriveFile>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct DriveFile {
    id: String,
    name: String,
}

pub async fn get_or_create_backup_folder(access_token: &str) -> Result<String, String> {
    let client = Client::new();

    // Search for "Yournal Backups" folder
    let query = "mimeType='application/vnd.google-apps.folder' and name='Yournal Backups' and trashed=false";
    let url = format!(
        "https://www.googleapis.com/drive/v3/files?q={}&spaces=drive",
        urlencoding::encode(query)
    );

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Google API error: {}", res.status()));
    }

    let list: DriveFileList = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    if let Some(folder) = list.files.first() {
        return Ok(folder.id.clone());
    }

    // Create folder if it doesn't exist
    let folder_metadata = serde_json::json!({
        "name": "Yournal Backups",
        "mimeType": "application/vnd.google-apps.folder"
    });

    let res = client
        .post("https://www.googleapis.com/drive/v3/files")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .json(&folder_metadata)
        .send()
        .await
        .map_err(|e| format!("Create folder failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Failed to create folder: {}", res.status()));
    }

    let created: DriveFile = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse created folder: {}", e))?;
    Ok(created.id)
}

pub async fn upload_database(
    access_token: &str,
    folder_id: &str,
    db_path: PathBuf,
) -> Result<String, String> {
    let client = Client::new();

    let mut file = File::open(&db_path)
        .await
        .map_err(|e| format!("Failed to open DB file: {}", e))?;
    let mut file_contents = Vec::new();
    file.read_to_end(&mut file_contents)
        .await
        .map_err(|e| format!("Failed to read DB file: {}", e))?;

    // We must use multipart upload because we need to set the parent folder ID in the metadata
    let metadata = serde_json::json!({
        "name": "yournal.sqlite",
        "parents": [folder_id]
    });

    let metadata_part = multipart::Part::text(metadata.to_string())
        .mime_str("application/json")
        .unwrap();

    let file_part = multipart::Part::bytes(file_contents)
        .file_name("yournal.sqlite")
        .mime_str("application/x-sqlite3")
        .unwrap();

    let form = multipart::Form::new()
        .part("metadata", metadata_part)
        .part("file", file_part);

    let res = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Upload failed: {}", err_text));
    }

    let uploaded: DriveFile = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse upload response: {}", e))?;
    Ok(uploaded.id)
}
