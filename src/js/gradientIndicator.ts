import { TeoriaNote } from './types.ts';

export function updateNoteDisplay(lastNote: [number, number] | undefined, noteCents: { note: TeoriaNote; cents: number } | null): void {
    if (lastNote && lastNote[1] > 0.95 && noteCents) {
        // Update the HTML gradient indicator
        const centsGradientElement = document.getElementById('cents-gradient');
        if (centsGradientElement) {
            // Calculate position as percentage (0-100)
            // noteCents.cents ranges from about -50 to +50
            // We want to map this to 0-100% where 50% is in tune
            const centsPosition = Math.max(0, Math.min(100, 50 + (noteCents.cents * 50 / 50)));
            centsGradientElement.style.setProperty('--cents-position', `${centsPosition}%`);
        }

        // Update the HTML elements with current note information
        const noteNameElement = document.getElementById('note-name');
        const frequencyElement = document.getElementById('frequency');
        const centsElement = document.getElementById('cents');

        if (noteNameElement) {
            const accidental = noteCents.note.accidental();
            const accidentalSymbol = accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '';
            noteNameElement.textContent = `${noteCents.note.name()}${accidentalSymbol}`;
        }

        if (frequencyElement) {
            frequencyElement.textContent = `${lastNote[0].toFixed(1)} Hz`;
        }

        if (centsElement) {
            const centsValue = Math.round(noteCents.cents);
            const centsText = centsValue > 0 ? `+${centsValue}` : centsValue.toString();
            centsElement.textContent = `${centsText} cents`;
        }
    } else {
        // Clear the display when no reliable pitch is detected
        const noteNameElement = document.getElementById('note-name');
        const frequencyElement = document.getElementById('frequency');
        const centsElement = document.getElementById('cents');
        const centsGradientElement = document.getElementById('cents-gradient');

        if (noteNameElement) noteNameElement.textContent = '--';
        if (frequencyElement) frequencyElement.textContent = '-- Hz';
        if (centsElement) centsElement.textContent = '-- cents';
        if (centsGradientElement) {
            centsGradientElement.style.setProperty('--cents-position', '50%');
        }
    }
}