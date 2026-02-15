importScripts('./lyra.js');

let encoder;
let lyraModule;
let isInitialized = false;
let sampleRate = 48000; // Default
let accumulatedBuffer = new Int16Array(0);

self.onmessage = async (e) => {
    const msg = e.data;
    
    if (msg.type === 'init') {
        try {
            const { wasmPath, modelPath, bitrate, enableDtx } = msg.config;
            sampleRate = msg.config.sampleRate || 48000;

            console.log("Lyra Worker: Initializing...");
            
            // Load Lyra Module
            // Shiguredo.LyraModule might need to be accessed from global
            if (typeof self.Shiguredo === 'undefined' || !self.Shiguredo.LyraModule) {
                console.error("Lyra Worker: Shiguredo.LyraModule not found. lyra.js may not have loaded correctly.");
                self.postMessage({ type: 'error', error: 'Lyra library not loaded' });
                return;
            }

            lyraModule = await self.Shiguredo.LyraModule.load(wasmPath, modelPath);
            encoder = await lyraModule.createEncoder({ 
                sampleRate, 
                bitrate: bitrate || 3200, 
                enableDtx: enableDtx || false 
            });

            isInitialized = true;
            console.log("Lyra Worker: Initialized.");
            self.postMessage({ type: 'initialized' });

        } catch (error) {
            console.error("Lyra Worker: Initialization failed", error);
            self.postMessage({ type: 'error', error: error.toString() });
        }
    } else if (msg.type === 'encode') {
        if (!isInitialized || !encoder) return;

        // Append new data
        const newData = new Int16Array(msg.data);
        const newBuffer = new Int16Array(accumulatedBuffer.length + newData.length);
        newBuffer.set(accumulatedBuffer);
        newBuffer.set(newData, accumulatedBuffer.length);
        accumulatedBuffer = newBuffer;

        // Process frames
        const frameSize = encoder.frameSize;
        let offset = 0;

        while (offset + frameSize <= accumulatedBuffer.length) {
            const frame = accumulatedBuffer.subarray(offset, offset + frameSize);
            
            try {
                const encoded = await encoder.encode(frame);
                if (encoded) {
                    // Send encoded packet back to main thread
                    // metadata can be added here if needed
                    self.postMessage({ type: 'encoded', data: encoded }, [encoded.buffer]);
                }
            } catch (err) {
                console.error("Lyra Worker: Encoding error", err);
            }

            offset += frameSize;
        }

        // Keep remaining bytes
        if (offset > 0) {
            accumulatedBuffer = accumulatedBuffer.slice(offset);
        }
    } else if (msg.type === 'close') {
        if (encoder) {
            encoder.destroy();
            encoder = null;
        }
        isInitialized = false;
        accumulatedBuffer = new Int16Array(0);
        self.postMessage({ type: 'closed' });
    }
};
