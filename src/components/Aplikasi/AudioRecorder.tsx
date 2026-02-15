import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { lyraService } from "../../services/lyra_service";

interface AudioRecorderProps {
    onRecordingComplete?: (blob: Blob, duration: number, waveform: number[]) => void;
}

export const AudioRecorder: Component<AudioRecorderProps> = (props) => {
    const [isRecording, setIsRecording] = createSignal(false);
    const [duration, setDuration] = createSignal(0);
    const [waveform, setWaveform] = createSignal<number[]>([]);
    
    let timerInterval: any;
    let animationFrame: number;
    let canvasRef: HTMLCanvasElement | undefined;
    let waveformAccumulator: number[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

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
            // Clear with transparent or surface color
            canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);
            
            canvasCtx.lineWidth = 3;
            // Use CSS var via computation or just a visible color like Primary
            // NOTE: Canvas cannot directly read CSS vars easily without getComputedStyle every frame (expensive). 
            // We'll use a hardcoded color that matches the common primary or a distinctive color, 
            // OR we can grab it once. For now, let's use a dynamic color if possible, or just a safe "Primary" hex.
            // Let's assume Primary is roughly our target.
            // Better: Get color from computed style of the canvas element itself if we set it in CSS?
            // Simple approach: Use getComputedStyle once outside the loop or just white/black based on theme?
            // Since we want it "theme aware", let's make it styled by a prop or just white/black logic?
            // Actually, usually on dark theme, lines should be light.
            // Let's use a specific color.
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

    const handleStart = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Start MediaRecorder for playback
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            mediaRecorder.start();

            // Start Lyra (Optional, for backend storage later?) 
            // For now, let's just stick to MediaRecorder to fix the USER's immediate issue
            // await lyraService.startRecording(); // Commented out to isolate issue

            setIsRecording(true);
            setDuration(0);
            waveformAccumulator = []; 
            
            timerInterval = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

            startVisualizer(stream);

        } catch (e) {
            console.error("Failed to start recording:", e);
            alert("Could not start recording.");
        }
    };

    const handleStop = async () => {
        try {
            clearInterval(timerInterval);
            cancelAnimationFrame(animationFrame);
            
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    
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
                        props.onRecordingComplete(audioBlob, duration(), resampledWaveform);
                    }
                    
                    // Stop all tracks
                    mediaRecorder?.stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorder.stop();
            }
            
            // await lyraService.stopRecording(); // Commented out
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
    });

    return (
        <div class="flex flex-col items-center gap-6 py-4 w-full">
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
                    <button 
                        class="h-16 px-8 rounded-full bg-[var(--color-error)] hover:bg-[var(--color-error)]/90 text-[var(--color-on-error)] font-medium text-lg transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-3"
                        onClick={handleStart}
                    >
                        <span class="material-symbols-rounded text-[28px]">mic</span>
                        Mulai Rekam
                    </button>
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
        </div>
    );
};
