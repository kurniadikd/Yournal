import { Component, createSignal, onCleanup, createEffect } from "solid-js";
import { lyraService } from "../../services/lyra_service";

interface InsertAudioProps {
    onRecordingComplete?: (blob: Blob, duration: number, waveform: number[]) => void;
}

// Utility to encode AudioBuffer to WAV Blob
const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this writer)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for(i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while(pos < buffer.length) {
        for(i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // topcm
            view.setInt16(44 + offset, sample, true);          // write 16-bit sample
            offset += 2;
        }
        pos++;
    }

    // helper functions
    function setUint16(data: any) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: any) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}


export const InsertAudio: Component<InsertAudioProps> = (props) => {
    // --- Recorder State ---
    const [isRecording, setIsRecording] = createSignal(false);
    const [duration, setDuration] = createSignal(0);
    
    // --- Trim State ---
    const [importedBuffer, setImportedBuffer] = createSignal<AudioBuffer | null>(null);
    const [trimStart, setTrimStart] = createSignal(0);
    const [trimEnd, setTrimEnd] = createSignal(0);
    const [previewPlaying, setPreviewPlaying] = createSignal(false);
    // Zoom removed

    let timerInterval: any;
    let animationFrame: number;
    let canvasRef: HTMLCanvasElement | undefined;
    let waveformAccumulator: number[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

    // --- Rec Visualizer ---
    const startVisualizer = (stream: MediaStream) => {
        if (!canvasRef) return;
        
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvasCtx = canvasRef.getContext("2d");
        
        if (!canvasCtx) return;

        const draw = () => {
            if (!isRecording()) {
                audioContext.close();
                return;
            }
            animationFrame = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            // Accumulate waveform data
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) {
                const val = (dataArray[i] - 128) / 128.0;
                sum += val * val;
            }
            const rms = Math.sqrt(sum / bufferLength);
            waveformAccumulator.push(rms);

            // -- Visualizer Drawing --
            canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);
            canvasCtx.lineWidth = 3;
            const style = getComputedStyle(document.body);
            canvasCtx.strokeStyle = style.getPropertyValue('--color-primary') || '#000000';
            canvasCtx.beginPath();
            const sliceWidth = (canvasRef.width * 1.0) / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvasRef.height) / 2;
                if (i === 0) canvasCtx.moveTo(x, y);
                else canvasCtx.lineTo(x, y);
                x += sliceWidth;
            }
            canvasCtx.lineTo(canvasRef.width, canvasRef.height / 2);
            canvasCtx.stroke();
        };

        draw();
    };


    let fileInputRef: HTMLInputElement | undefined;

    const handleImportClick = () => {
        fileInputRef?.click();
    };

    const handleFileChange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
            const audioCtx = new AudioContext();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            // Set up Trim UI
            setImportedBuffer(audioBuffer);
            setTrimStart(0);
            setTrimEnd(audioBuffer.duration);
            
            audioCtx.close();
            // Do NOT insert yet. UI will switch to Trim Mode.

        } catch (err) {
            console.error("Error importing audio:", err);
            alert("Gagal mengimpor audio.");
        }
        
        target.value = '';
    };

    // --- Trim Logic ---
    let previewSource: AudioBufferSourceNode | null = null;
    let previewCtx: AudioContext | null = null;
    let trimCanvasRef: HTMLCanvasElement | undefined;
    let isDragging: 'start' | 'end' | 'new' | null = null;
    let dragStartX = 0;

    const [playbackTime, setPlaybackTime] = createSignal<number | null>(null);

    const drawTrimWaveform = () => {
        const buffer = importedBuffer();
        if(!buffer || !trimCanvasRef) return;

        const ctx = trimCanvasRef.getContext('2d');
        if(!ctx) return;

        const width = trimCanvasRef.width;
        const height = trimCanvasRef.height;
        ctx.clearRect(0,0, width, height);

        // Draw Waveform (Static)
        const rawData = buffer.getChannelData(0);
        const step = Math.ceil(rawData.length / width);
        const amp = height / 2;
        
        const primaryColor = getComputedStyle(document.body).getPropertyValue('--color-primary') || '#000000';
        const unplayedColor = getComputedStyle(document.body).getPropertyValue('--color-outline-variant') || '#cccccc';
        const onPrimaryColor = getComputedStyle(document.body).getPropertyValue('--color-on-primary') || '#ffffff';

        // Auto-normalize
        let maxAmp = 0;
        for(let i=0; i<rawData.length; i+=100) { 
             const val = Math.abs(rawData[i]);
             if(val > maxAmp) maxAmp = val;
        }
        if(maxAmp < 0.1) maxAmp = 0.1; 

        const currentPlayTime = playbackTime();

        // Render waveform
        for(let i=0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for(let j=0; j<step; j++) {
                 if ((i*step + j) < rawData.length) {
                    const datum = rawData[i*step + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                 }
            }
            min /= maxAmp;
            max /= maxAmp;
            min = Math.max(-1, min);
            max = Math.min(1, max);

            const boxY = (height/2) - (Math.abs(max) * amp);
            const boxH = Math.abs(max-min) * amp;
            
            // Determine Color based on time
            const timeAtPixel = (i / width) * buffer.duration;
            
            if (timeAtPixel < trimStart() || timeAtPixel > trimEnd()) {
                ctx.fillStyle = onPrimaryColor;
            } else if (currentPlayTime !== null) {
                if (timeAtPixel <= currentPlayTime) {
                    ctx.fillStyle = primaryColor;
                } else {
                    ctx.fillStyle = unplayedColor;
                }
            } else {
                ctx.fillStyle = primaryColor;
            }

            ctx.fillRect(i, boxY, 1, Math.max(1, boxH));
        }

        // Draw Trim Overlay
        const startX = (trimStart() / buffer.duration) * width;
        const endX = (trimEnd() / buffer.duration) * width;

        // Dim out trimmed areas
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);

        // Highlight Active Region Border
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-secondary') || '#ffffff';
         // ... (rest of overlay drawing)
        ctx.lineWidth = 2;
        
        // Start Handle Line
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.stroke();

        // End Handle Line
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();
        
        // Handles
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-secondary') || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(startX - 6, 0, 12, 24, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(endX - 6, 0, 12, 24, 4);
        ctx.fill();
        
        ctx.beginPath();
        ctx.roundRect(startX - 6, height - 24, 12, 24, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(endX - 6, height - 24, 12, 24, 4);
        ctx.fill();

        // Draw Playback Head Line if playing
        if (currentPlayTime !== null) {
             const playX = (currentPlayTime / buffer.duration) * width;
             ctx.strokeStyle = primaryColor; // or something bright
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(playX, 0);
             ctx.lineTo(playX, height);
             ctx.stroke();
        }
    };

    // ... (mouse handlers) ...

    const handleCanvasMouseDown = (e: MouseEvent | TouchEvent) => {
        const buffer = importedBuffer();
        if(!buffer || !trimCanvasRef) return;
        
        e.preventDefault();
        const rect = trimCanvasRef.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const width = rect.width;
        
        // Map x to time
        const timeAtClick = (x / width) * buffer.duration;
        
        // Check hit targets (threshold 20px)
        const startX = (trimStart() / buffer.duration) * width;
        const endX = (trimEnd() / buffer.duration) * width;
        const threshold = 20;

        if (Math.abs(x - startX) < threshold) {
            isDragging = 'start';
        } else if (Math.abs(x - endX) < threshold) {
            isDragging = 'end';
        } else {
            isDragging = 'new';
            dragStartX = timeAtClick;
            setTrimStart(timeAtClick);
            setTrimEnd(timeAtClick); 
        }

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        window.addEventListener('touchmove', handleWindowMouseMove);
        window.addEventListener('touchend', handleWindowMouseUp);
    };

    const handleWindowMouseMove = (e: MouseEvent | TouchEvent) => {
        const buffer = importedBuffer();
        if(!buffer || !trimCanvasRef || !isDragging) return;

        const rect = trimCanvasRef.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        let x = clientX - rect.left;
        
        // Clamp to canvas
        x = Math.max(0, Math.min(x, rect.width));
        
        const newTime = (x / rect.width) * buffer.duration;

        if (isDragging === 'start') {
             setTrimStart(Math.min(newTime, trimEnd() - 0.1));
        } else if (isDragging === 'end') {
             setTrimEnd(Math.max(newTime, trimStart() + 0.1));
        } else if (isDragging === 'new') {
             if (newTime < dragStartX) {
                 setTrimStart(newTime);
                 setTrimEnd(dragStartX);
             } else {
                 setTrimStart(dragStartX);
                 setTrimEnd(newTime);
             }
        }
        
        requestAnimationFrame(drawTrimWaveform);
    };

    const handleWindowMouseUp = () => {
        isDragging = null;
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        window.removeEventListener('touchmove', handleWindowMouseMove);
        window.removeEventListener('touchend', handleWindowMouseUp);
        
        if (Math.abs(trimEnd() - trimStart()) < 0.1) {
             const buffer = importedBuffer();
             if(buffer) {
                 if (trimEnd() === trimStart()) {
                     setTrimStart(0);
                     setTrimEnd(buffer.duration);
                 }
                 requestAnimationFrame(drawTrimWaveform);
             }
        }
    };

    const stopPreview = () => {
        if (previewSource) {
            try { previewSource.stop(); } catch(e) {}
            previewSource.disconnect();
            previewSource = null;
        }
        if (previewCtx && previewCtx.state !== 'closed') {
            previewCtx.close();
            previewCtx = null;
        }
        setPreviewPlaying(false);
        setPlaybackTime(null); // Reset
        requestAnimationFrame(drawTrimWaveform);
    };

    const togglePreview = () => {
        if (previewPlaying()) {
             stopPreview();
             return;
        }

        const buffer = importedBuffer();
        if(!buffer) return;

        // Slice logic for playback
        stopPreview(); 
        
        previewCtx = new AudioContext();
        previewSource = previewCtx.createBufferSource();
        previewSource.buffer = buffer;
        previewSource.connect(previewCtx.destination);
        
        const duration = trimEnd() - trimStart();
        const startOffset = trimStart();
        
        previewSource.start(0, startOffset, duration);
        setPreviewPlaying(true);
        setPlaybackTime(startOffset);

        const startTime = previewCtx.currentTime;
        
        const updateProgress = () => {
             if (!previewPlaying() || !previewCtx) return;
             const elapsed = previewCtx.currentTime - startTime;
             const current = startOffset + elapsed;
             
             if (current >= trimEnd()) {
                 // Should have stopped by onended, but just in case
                 setPlaybackTime(trimEnd());
             } else {
                 setPlaybackTime(current);
                 requestAnimationFrame(updateProgress);
                 drawTrimWaveform();
             }
        };
        requestAnimationFrame(updateProgress);

        previewSource.onended = () => {
            setPreviewPlaying(false);
            setPlaybackTime(null);
            drawTrimWaveform();
            
            if (previewCtx?.state !== 'closed') {
                 previewCtx?.close();
                 previewCtx = null;
            }
        };
    };

    const confirmTrim = () => {
        const buffer = importedBuffer();
        if(!buffer) return;

        const sampleRate = buffer.sampleRate;
        const startSample = Math.floor(trimStart() * sampleRate);
        const endSample = Math.floor(trimEnd() * sampleRate);
        const frameCount = endSample - startSample;
        
        if (frameCount <= 0) {
            alert("Durasi potongan tidak valid.");
            return;
        }

        const newCtx = new AudioContext();
        const newBuffer = newCtx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);

        for (let i = 0; i < buffer.numberOfChannels; i++) {
             const oldData = buffer.getChannelData(i);
             const newData = newBuffer.getChannelData(i);
             for (let j = 0; j < frameCount; j++) {
                 newData[j] = oldData[startSample + j];
             }
        }
        
        const wavBlob = bufferToWav(newBuffer);

        const rawData = newBuffer.getChannelData(0);
        const samples = 100;
        const blockSize = Math.floor(rawData.length / samples);
        const waveformData = [];
        for (let i = 0; i < samples; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[i * blockSize + j]);
                }
                waveformData.push(sum / blockSize);
        }
        const maxVal = Math.max(...waveformData, 0.001);
        const normalizedWaveform = waveformData.map(v => v / maxVal);

        if (props.onRecordingComplete) {
            props.onRecordingComplete(wavBlob, newBuffer.duration, normalizedWaveform);
        }

        setImportedBuffer(null);
        newCtx.close();
    };

    // --- Rec Logic ---
    const startRecordingWithStream = async (stream: MediaStream, _knownDuration?: number) => {
         try {
             mediaRecorder = new MediaRecorder(stream);
             audioChunks = [];
             mediaRecorder.ondataavailable = (event) => {
                 audioChunks.push(event.data);
             };
             mediaRecorder.start();
             await lyraService.startRecording({ stream });

             setIsRecording(true);
             setDuration(0);
             waveformAccumulator = []; 
            
             timerInterval = setInterval(() => {
                 setDuration(d => d + 1);
             }, 1000);

             startVisualizer(stream);
             
         } catch(e) {
             console.error("Failed to start recording stream:", e);
         }
    };

    const handleStart = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            await startRecordingWithStream(stream);
        } catch (e) {
            console.error("Failed to start recording:", e);
            alert("Could not start recording.");
        }
    };
    
    // ... existing handleStop ...
    const handleStop = async () => {
         try {
            clearInterval(timerInterval);
            cancelAnimationFrame(animationFrame);

            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = async () => { 
                     const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                     const lyraResult = await lyraService.stopRecording();
                     const finalBlob = lyraResult.blob || audioBlob;

                    // Normalize waveform
                    const maxPoints = 100;
                    const resampledWaveform = [];
                    if (waveformAccumulator.length > maxPoints) {
                        const step = Math.ceil(waveformAccumulator.length / maxPoints);
                        for (let i = 0; i < waveformAccumulator.length; i += step) {
                             let chunkSum = 0;
                             let count = 0;
                             for (let j = 0; j < step && i + j < waveformAccumulator.length; j++) {
                                 chunkSum += waveformAccumulator[i+j];
                                 count++;
                             }
                             resampledWaveform.push(chunkSum / count);
                        }
                    } else {
                        resampledWaveform.push(...waveformAccumulator);
                    }

                    if (props.onRecordingComplete) {
                        props.onRecordingComplete(finalBlob, duration(), resampledWaveform);
                    }
                    
                    mediaRecorder?.stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorder.stop();
            } else {
                 try { await lyraService.stopRecording(); } catch(e) {}
            }
            
            setIsRecording(false);
            
        } catch (e) {
            console.error("Failed to stop recording:", e);
        }
    };

    onCleanup(() => {
        clearInterval(timerInterval);
        cancelAnimationFrame(animationFrame);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        stopPreview();
    });

    return (
        <div class="flex flex-col items-center gap-6 py-4 w-full">
            {/* -- TRIM UI -- */}
            {importedBuffer() ? (
                <div class="w-full flex flex-col gap-4 animate-in fade-in duration-300">
                     <div class="text-xl font-medium text-[var(--color-on-surface)] text-center">
                        Potong Audio
                    </div>
                    
                    {/* Canvas Container with Mouse Events */}
                    <div 
                        class="w-full h-32 bg-[var(--color-surface-container-highest)] rounded-[16px] overflow-hidden relative cursor-ew-resize touch-none select-none group"
                        onMouseDown={handleCanvasMouseDown}
                        onTouchStart={handleCanvasMouseDown}
                    >
                        <canvas 
                            ref={(el) => {
                                trimCanvasRef = el;
                                // Need to defer this one frame to ensure width/height are stable
                                setTimeout(() => requestAnimationFrame(drawTrimWaveform), 0);
                            }}
                            width={500} 
                            height={128}
                            class="w-full h-full pointer-events-none" 
                        />
                         {/* Interactive Hint */}
                         <div class="sticky left-0 top-2 ml-auto mr-2 w-max px-2 py-1 bg-black/40 text-white text-[10px] rounded pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity z-10">
                            Drag untuk memotong
                        </div>
                    </div>

                    <div class="flex flex-col gap-2 w-full px-4">
                        <div class="flex justify-between text-xs font-mono text-[var(--color-on-surface-variant)]">
                            <span>Start: {trimStart().toFixed(2)}s</span>
                            <span>End: {trimEnd().toFixed(2)}s</span>
                        </div>
                    </div>

                    <div class="flex gap-4 justify-center mt-2">

                        <button 
                            onClick={togglePreview}
                            class="h-10 px-6 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-medium text-sm transition-all flex items-center gap-2"
                        >
                            <span class="material-symbols-rounded">{previewPlaying() ? 'stop' : 'play_arrow'}</span>
                            {previewPlaying() ? 'Stop' : 'Preview'}
                        </button>
                         <button 
                            onClick={confirmTrim}
                            class="h-10 px-6 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium text-sm transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                        >
                            <span class="material-symbols-rounded">check</span>
                            Selesai
                        </button>
                    </div>
                </div>
            ) : (
                /* -- RECORDER UI -- */
                <>
                    <div class="text-xl font-medium text-[var(--color-on-surface)]">
                        {isRecording() ? "Sedang Merekam..." : "Siap Merekam"}
                    </div>
                    
                    <div class="text-4xl font-mono font-bold text-[var(--color-primary)] tracking-widest">
                        {new Date(duration() * 1000).toISOString().substr(14, 5)}
                    </div>

                    {/* Visualizer Canvas */}
                    <div class="w-full h-32 bg-[var(--color-surface-container-highest)] rounded-[24px] overflow-hidden border border-[var(--color-outline-variant)]/20 relative">
                        <canvas 
                            ref={canvasRef} 
                            width={500} 
                            height={128} 
                            class="w-full h-full"
                        />
                    </div>

                    <div class="flex gap-4 mt-2">
                        {!isRecording() ? (
                            <>
                                {/* Hidden File Input */}
                                <input 
                                    type="file" 
                                    accept="audio/*" 
                                    ref={fileInputRef} 
                                    class="hidden" 
                                    onChange={handleFileChange}
                                />
                                
                                <button 
                                    class="h-16 px-6 rounded-full bg-[var(--color-secondary-container)] hover:bg-[var(--color-secondary-container)]/80 text-[var(--color-on-secondary-container)] font-medium text-lg transition-all shadow-md active:scale-95 flex items-center gap-2"
                                    onClick={handleImportClick}
                                    title="Impor Audio"
                                >
                                    <span class="material-symbols-rounded text-[24px]">upload_file</span>
                                </button>

                                <button 
                                    class="h-16 px-8 rounded-full bg-[var(--color-error)] hover:bg-[var(--color-error)]/90 text-[var(--color-on-error)] font-medium text-lg transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-3"
                                    onClick={handleStart}
                                >
                                    <span class="material-symbols-rounded text-[28px]">mic</span>
                                    Mulai Rekam
                                </button>
                            </>
                        ) : (
                            <button 
                                class="h-16 px-8 rounded-full bg-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/90 text-[var(--color-surface)] font-medium text-lg transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-3"
                                onClick={handleStop}
                            >
                                <span class="material-symbols-rounded text-[28px]">stop_circle</span>
                                Berhenti
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
