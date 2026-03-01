import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { copyFile, mkdir, exists } from "@tauri-apps/plugin-fs";

export interface FileAttachmentInfo {
  name: string;
  size: number;
  mimeType: string;
  path: string; // The copied path in app data
}

export async function processFileAttachment(originalPath: string): Promise<FileAttachmentInfo> {
  // 1. Get file metadata from Rust
  const info = await invoke<{ name: string; size: number; mime_type: string }>("get_file_info", {
    path: originalPath,
  });

  // 2. Prepare destination in app data
  const dataDir = await appDataDir();
  const attachmentsDir = await join(dataDir, "attachments");

  // Ensure directory exists
  if (!(await exists(attachmentsDir))) {
    await mkdir(attachmentsDir, { recursive: true });
  }

  // 3. Create a unique filename to avoid collisions
  const timestamp = Date.now();
  const uniqueName = `${timestamp}-${info.name}`;
  const destPath = await join(attachmentsDir, uniqueName);

  // 4. Copy the file
  await copyFile(originalPath, destPath);

  return {
    name: info.name,
    size: info.size,
    mimeType: info.mime_type,
    path: destPath,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
