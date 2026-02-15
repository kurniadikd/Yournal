class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Adjust based on Lyra needs (usually 10ms or 20ms at 16kHz/48kHz)
    // Lyra usually expects 16kHz or 48kHz. If 16kHz, 10ms = 160 samples.
    // If 48kHz, 10ms = 480 samples.
    // We'll buffer appropriately.
    this._buffer = new Float32Array(0);
    this.port.onmessage = (event) => {
      // Handle commands if needed
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono
      
      // Append to buffer
      const newBuffer = new Float32Array(this._buffer.length + channelData.length);
      newBuffer.set(this._buffer);
      newBuffer.set(channelData, this._buffer.length);
      this._buffer = newBuffer;

      // Check if we have enough data for a chunk (e.g. 480 samples = 10ms @ 48kHz)
      // Lyra frame size determines this. shiguredo example uses encoder.frameSize.
      // We will send smaller chunks and let worker buffer, OR send large chunks.
      // Sending raw buffer every process call (128 samples) is fine, Worker handles framing.
      
      // Optimization: Convert to Int16 here to reduce message size
      const int16Data = this.floatTo16BitPCM(channelData);
      
      // Send to worker
      this.port.postMessage({ type: 'audioData', data: int16Data.buffer }, [int16Data.buffer]);
      
      // Reset buffer? No, simple accumulation isn't right for real-time.
      // process() gives 128 frames. We just convert and send 128 frames.
      // The buffering/framing logic should happen in the Worker or a RingBuffer.
      // Since we don't use SAB, we just postMessage.
      this._buffer = new Float32Array(0); // clear local buffer if we just sent it
    }
    return true;
  }

  floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
