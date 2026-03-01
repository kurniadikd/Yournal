import { invoke } from "@tauri-apps/api/core";

export interface FileAttachmentInfo {
  name: string;
  size: number;
  mimeType: string;
}

export async function processFileAttachment(originalPath: string): Promise<FileAttachmentInfo> {
  // Get file metadata from Rust
  const info = await invoke<{ name: string; size: number; mime_type: string }>("get_file_info", {
    path: originalPath,
  });

  return {
    name: info.name,
    size: info.size,
    mimeType: info.mime_type,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
