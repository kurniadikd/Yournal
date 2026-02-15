# Lyra V2 Integration

This directory contains the necessary files to run Google's Lyra V2 audio codec via WebAssembly.

## Version
- **Lyra Version**: 1.3.0 (approximate, based on file headers)
- **Source**: [shiguredo/lyra-wasm](https://github.com/shiguredo/lyra-wasm) and official Google Lyra checks.

## File Structure
- `lyra.wasm`: The compiled WebAssembly module.
- `lyra.worker.js`: The worker script provided by the library to load the WASM.
- `lyra.js`: The main library interface (loaded by workers).
- `lyra-encode-worker.js`: **Custom** worker script for this application to bridge AudioWorklet and Lyra.
- `*.tflite` / `*.proto`: Model files required for encoding/decoding.

## How to Update

If you need to update Lyra in the future (e.g., to a newer version), follow these steps:

1.  **Download New Assets**:
    - Go to the [shiguredo/lyra-wasm Releases](https://github.com/shiguredo/lyra-wasm/releases) or the source you prefer.
    - Download `lyra.wasm`, `lyra.js`, and `lyra.worker.js`.
    - If the model architecture changed, download the new `.tflite` and `.proto` files as well.

2.  **Replace Files**:
    - Overwrite the existing files in this directory (`public/lyra/`) with the new ones.
    - **Note**: Do NOT overwrite `lyra-encode-worker.js` unless you are auditing it, as it contains custom logic for this app.

3.  **Check `lyra-encode-worker.js`**:
    - Open `lyra-encode-worker.js`.
    - Ensure the way it imports and uses `lyra.js` (e.g., `lyraModule.createEncoder`) is still valid in the new version.
    - If the API (method names, parameters) changed, update this worker script accordingly.

4.  **Test**:
    - Record audio and verify it still works.
    - Check the browser console for any errors during initialization.
