// Custom type definitions for libraries without official TypeScript support

export interface PitchDetector {
  inputLength: number;
  findPitch(buffer: Float32Array, sampleRate: number): [number, number] | null;
}

declare module 'pitchy' {
  export function PitchDetector(): { forFloat32Array(fftSize: number): PitchDetector };
}

export interface TeoriaNote {
  fq(): number;
  midi(): number;
  accidental(): string;
  name(): string;
  toString(): string;
}

export interface TeoriaScale {
  notes(): TeoriaNote[];
}

export interface NoteCents {
  detectedNote: TeoriaNote;
  targetNote: TeoriaNote;
  cents: number;
  inKey: boolean;
}

declare module 'teoria' {
  export function note(name: string): TeoriaNote;
  export function scale(note: TeoriaNote, type: string): TeoriaScale;
}