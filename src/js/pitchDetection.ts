import { PitchDetector } from 'pitchy';
import * as teoria from 'teoria';
import { TeoriaNote, TeoriaScale } from './types.ts';

export let history: [number, number][] = [];

export let debugMode = false;
export let debugPanelVisible = false;
export let debugFrequency = 440; // Default A4

export function setDebugFrequency(freq: number): void {
    debugFrequency = freq;
}

const minFreq = 20;

export function getScaleFrequencies(currentKey: string): number[] {
    const freqs: number[] = [];
    for (let oct = 3; oct <= 6; oct++) {
        const scale: TeoriaScale = teoria.scale(teoria.note(currentKey + oct), 'major');
        freqs.push(...scale.notes().map((note: TeoriaNote) => note.fq()));
    }
    return [...new Set(freqs)].sort((a, b) => a - b); // Unique and sorted
}

export function findFreqInScale(scale: TeoriaScale, freq: number): { note: TeoriaNote; cents: number } | null {
    const noteCents = teoria.note.fromFrequency(freq);
    if (noteCents && noteCents.note) {
        return { note: noteCents.note, cents: noteCents.cents };
    } else {
        // fallback to closest scale note
        const scaleFreqs = getScaleFrequencies(scale.notes()[0].name().replace(/\d/, '')); // rough key
        let closestFreq = scaleFreqs[0];
        let minDiff = Math.abs(freq - closestFreq);
        for (const sf of scaleFreqs) {
            const diff = Math.abs(freq - sf);
            if (diff < minDiff) {
                minDiff = diff;
                closestFreq = sf;
            }
        }
        const closestNote = teoria.note.fromFrequency(closestFreq);
        const cents = Math.round((freq - closestFreq) / closestFreq * 1200);
        return { note: closestNote, cents };
    }
}

export function enableDebugMode(): void {
    debugMode = true;
    localStorage.setItem('debugMode', 'true');
}

export function disableDebugMode(): void {
    debugMode = false;
    localStorage.setItem('debugMode', 'false');
}

export function showDebugPanel(): void {
    debugPanelVisible = true;
    const panel = document.getElementById('debug-panel');
    if (panel) panel.style.display = 'block';
    localStorage.setItem('debugPanelVisible', 'true');
}

export function hideDebugPanel(): void {
    debugPanelVisible = false;
    const panel = document.getElementById('debug-panel');
    if (panel) panel.style.display = 'none';
    localStorage.setItem('debugPanelVisible', 'false');
}

export async function initializeMicrophone(deviceId: string | null = null): Promise<boolean> {
    try {
        const constraints: MediaStreamConstraints = {
            audio: deviceId ? { deviceId: { exact: deviceId } } : true
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const ctx = new AudioContext({});
        const analyzer = ctx.createAnalyser();
        analyzer.minDecibels = -50;
        analyzer.maxDecibels = -10;
        analyzer.smoothingTimeConstant = 0.85;

        ctx.createMediaStreamSource(stream).connect(analyzer);
        const detector = PitchDetector.forFloat32Array(analyzer.fftSize);

        // Store detector for use in update loop
        (window as any).pitchDetector = detector;
        (window as any).analyzer = analyzer;
        (window as any).audioCtx = ctx;

        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        return false;
    }
}