import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, writeBinaryFile, exists } from "@tauri-apps/plugin-fs"; // Ensure plugin-fs is available or use tauri api
// Note: Tauri v2 syntax might differ slightly. Using standard patterns.

export interface LyraRecordingConfig {
    sampleRate?: number;
    bitrate?: number; // 3200, 6000, 9200
    enableDtx?: boolean;
}

export class LyraService {
    private worker: Worker | null = null;
    private audioContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    public analyser: AnalyserNode | null = null;
    private stream: MediaStream | null = null;
    private isRecording = false;
    private recordedChunks: Uint8Array[] = [];
    private startTime: number = 0;

    constructor() {}

    async initialize() {
        // Prepare worker
        if (!this.worker) {
            this.worker = new Worker('/lyra/lyra-encode-worker.js');
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
        }
    }

    private handleWorkerMessage(e: MessageEvent) {
        const { type, data, error } = e.data;
        if (type === 'encoded') {
            this.recordedChunks.push(data);
        } else if (type === 'error') {
            console.error('Lyra Service Error:', error);
        } else if (type === 'initialized') {
            console.log('Lyra Service: Worker initialized');
        }
    }

    async startRecording(config: LyraRecordingConfig & { stream?: MediaStream } = {}) {
        if (this.isRecording) return;

        try {
            this.recordedChunks = [];
            this.audioContext = new AudioContext({
                sampleRate: config.sampleRate || 48000,
                latencyHint: 'interactive'
            });

            await this.audioContext.audioWorklet.addModule('/audio-recorder-processor.js');

            if (config.stream) {
                this.stream = config.stream;
            } else {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1, // Lyra is mono usually
                        sampleRate: config.sampleRate || 48000
                    }
                });
            }

            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
            source.connect(this.workletNode);
            // Don't connect to destination to avoid feedback loop if monitoring is not desired
            // this.workletNode.connect(this.audioContext.destination); 

            // Initialize Worker
            this.worker?.postMessage({
                type: 'init',
                config: {
                    wasmPath: './', // Relative to worker location in public/lyra/
                    modelPath: 'https://lyra-wasm.shiguredo.app/2022.2.0/', // Or local path if we downloaded
                    // Since we downloaded models to public/lyra/, we should use local path if possible.
                    // But lyra.js load() might expect a URL or path. 
                    // Let's try './' first as we put .tflite files in public/lyra/
                    // Actually, let's use './' because worker is in /lyra/ folder.
                    // BUT shiguredo example had full URL.
                    // I will try './' first since I downloaded files.
                    ...config
                }
            });

            // Set up channel
            this.workletNode.port.onmessage = (event) => {
                if (event.data.type === 'audioData' && this.worker) {
                    this.worker.postMessage({ type: 'encode', data: event.data.data }, [event.data.data]);
                }
            };

            this.isRecording = true;
            this.startTime = Date.now();

        } catch (err) {
            console.error("Failed to start recording", err);
            throw err;
        }
    }

    async stopRecording(): Promise<{ blob: Blob, duration: number, path?: string }> {
        if (!this.isRecording) throw new Error("Not recording");

        this.isRecording = false;
        
        // Cleanup Audio
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        // Notify worker to finish (maybe flush?)
        // In this simple implementation, we just take what we have.
        // A flush message might be needed if the worker buffers.
        // My worker flushes remaining bytes if offset > 0 but that keeps them for NEXT time.
        // Ideally we should tell it to flush partial frames if possible (Lyra might not support it).
        // Sending 'close' resets the worker.
        
        const duration = Date.now() - this.startTime;

        // Combine chunks
        const totalSize = this.recordedChunks.reduce((acc, val) => acc + val.length, 0);
        const mergedArray = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of this.recordedChunks) {
            mergedArray.set(chunk, offset);
            offset += chunk.length;
        }

        // Create Blob
        const blob = new Blob([mergedArray], { type: 'audio/lyra' });
        
        // Save to Disk (optional, can be done by caller)
        // I'll return the blob and let the UI/Store handle saving.
        
        return { blob, duration };
    }
}

export const lyraService = new LyraService();
