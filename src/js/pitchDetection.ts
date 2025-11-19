import { PitchDetector } from 'pitchy';
import * as teoria from 'teoria';
import { TeoriaNote, TeoriaScale, NoteCents } from './types.ts';

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

export function findFreqInScale(scale: TeoriaScale, freq: number): NoteCents | null {
    // Find the closest note in the scale
    const scaleFreqs = getScaleFrequencies(scale.notes()[0].name().replace(/\d/, ''));
    let closestFreq = scaleFreqs[0];
    let minDiff = Math.abs(freq - closestFreq);
    for (const sf of scaleFreqs) {
        const diff = Math.abs(freq - sf);
        if (diff < minDiff) {
            minDiff = diff;
            closestFreq = sf;
        }
    }
    const closestResult = teoria.note.fromFrequency(closestFreq);
    if (!closestResult || !closestResult.note) return null;
    const targetNote = closestResult.note;
    const cents = Math.round((freq - closestFreq) / closestFreq * 1200);

    // Determine if the detected note is in the scale
    const noteCents = teoria.note.fromFrequency(freq);
    if (!noteCents || !noteCents.note) return null;

    const detectedNote = noteCents.note;
    const detectedNoteName = detectedNote.name();
    const scaleNoteNames = scale.notes().map(n => n.name());
    const inKey = scaleNoteNames.includes(detectedNoteName);

    return { detectedNote, targetNote, cents, inKey };
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