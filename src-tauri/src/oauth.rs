use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use tauri::{AppHandle, Manager, Emitter};
use url::Url;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuthState {
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
}

pub fn start_oauth_flow(app: AppHandle, client_id: String) -> Result<String, String> {
    // We'll run this on port 8484
    let port = 8484;
    let redirect_uri = format!("http://localhost:{}/callback", port);
    
    if client_id.is_empty() {
        return Err("Google Client ID is required.".to_string());
    }

    let auth_url = Url::parse_with_params(
        "https://accounts.google.com/o/oauth2/v2/auth",
        &[
            ("client_id", client_id.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("response_type", "code"),
            ("scope", "https://www.googleapis.com/auth/drive.file"),
            ("access_type", "offline"),
            ("prompt", "consent"),
        ],
    ).map_err(|e| e.to_string())?;

    // Start local server to listen for callback
    std::thread::spawn(move || {
        let server = tiny_http::Server::http(format!("127.0.0.1:{}", port));
        if let Ok(server) = server {
            if let Ok(request) = server.recv() {
                let url = request.url().to_string();
                let params = url.split('?').nth(1).unwrap_or("");
                let mut code = None;
                for param in params.split('&') {
                    let mut parts = param.split('=');
                    if parts.next() == Some("code") {
                        code = parts.next().map(|s| s.to_string());
                    }
                }
                
                // Respond to browser
                let response_text = if code.is_some() {
                    "Authentication successful! You can close this window and return to Yournal."
                } else {
                    "Authentication failed. Please return to Yournal and try again."
                };
                let response = tiny_http::Response::from_string(response_text);
                let _ = request.respond(response);

                if let Some(c) = code {
                    // Send code back to Tauri main thread
                    let _ = app.emit("oauth-code-received", c);
                }
            }
        }
    });

    Ok(auth_url.to_string())
}

pub async fn exchange_code_for_token(client_id: String, client_secret: String, code: String) -> Result<AuthState, String> {
    if client_id.is_empty() || client_secret.is_empty() {
        return Err("Google Client ID or Secret not provided.".to_string());
    }

    let client = Client::new();
    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", "http://localhost:8484/callback"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    if let Some(err) = body.get("error") {
        return Err(format!("Token exchange failed: {}", err));
    }

    let auth_state = AuthState {
        access_token: body.get("access_token").and_then(|v| v.as_str()).map(|s| s.to_string()),
        refresh_token: body.get("refresh_token").and_then(|v| v.as_str()).map(|s| s.to_string()),
        expires_in: body.get("expires_in").and_then(|v| v.as_u64()),
    };

    Ok(auth_state)
}
