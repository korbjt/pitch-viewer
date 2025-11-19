import * as teoria from 'teoria';
import { TeoriaNote, TeoriaScale } from './types.ts';
import { findFreqInScale, history } from './pitchDetection.ts';
import { updateNoteDisplay } from './gradientIndicator.ts';

function drawKeySignature(
    ctx: CanvasRenderingContext2D,
    key: string,
    startX: number,
    staffY: number,
    lineSpacing: number,
    color: string,
    targetHeight: number,
    clef: 'treble' | 'bass'
): void {
    const note = teoria.note(key);
    const root = note.name().toUpperCase() + (note.accidental() || '');
    const sharpKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
    const flatKeys  = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

    const sharpIndex = sharpKeys.indexOf(root);
    const flatIndex  = flatKeys.indexOf(root);

    const isSharp = sharpIndex !== -1;
    const count = isSharp ? sharpIndex : (flatIndex !== -1 ? flatIndex : 0);
    if (count === 0) return;

    // Positions in half-lines from bottom line (0 = bottom line)
    const trebleSharps = [0.5, 3.5, -0.5, 2.5, 5.5, 1.5, 4.5];  // F C G D A E B
    const bassSharps   = [2.5, 5.5, 1.5, 4.5, 7.5, 3.5, 6.5];  // F C G D A E B (octave lower pattern)
    const trebleFlats  = [3.5, 0.5, 4.5, 1.5, 5.5, 2.5, 6.5];  // B E A D G C F (reversed sharp positions +7)
    const bassFlats    = [5.5, 2.5, 6.5, 3.5, 7.5, 4.5, 8.5];  // B E A D G C F (octave lower)
    
    const posArray = isSharp
        ? (clef === 'treble' ? trebleSharps : bassSharps)
        : (clef === 'treble' ? trebleFlats : bassFlats);

    const symbol = isSharp ? '♯' : '♭';
    const size = Math.round(targetHeight * 0.12);
    ctx.font = `${size}px serif`;
    ctx.fillStyle = color;

    let x = startX;
    for (let i = 0; i < count; i++) {
        const y = staffY + posArray[i] * (lineSpacing / 2);
        ctx.fillText(symbol, x, y + size * 0.25);
        x += size * 0.3;
    }
}

function getYForNote(note: TeoriaNote, staffY: number, bassStaffY: number, lineSpacing: number): number {
    try {
        const noteValue = note.midi();
        let noteY: number;
        if (noteValue >= 60) {
            // Treble staff: E4 (64) at bottom 4*ls, F5 (77) at top 0
            // 13 semitones span 4*ls
            noteY = staffY + 4 * lineSpacing - (noteValue - 64) * (4 * lineSpacing / 13);
        } else {
            // Bass staff: G2 (43) at bottom 4*ls, A3 (57) at top 0
            // 14 semitones span 4*ls
            noteY = bassStaffY + 4 * lineSpacing - (noteValue - 43) * (4 * lineSpacing / 14);
        }
        return noteY;
    } catch (error) {
        console.error('Error in getYForNote:', error, 'note:', note);
        return staffY + (4 * lineSpacing); // Return middle of treble staff as fallback
    }
}

export function draw(currentKey: string): void {
    const canvas = document.getElementById('pitches') as HTMLCanvasElement;
    if (!canvas) return;

    // Set canvas size based on container - prioritize height, allow width to flex
    const container = canvas.parentNode as HTMLElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Use full container dimensions, but maintain aspect ratio and fit within container
    const targetHeight = Math.min(containerHeight, 400);
    const targetWidth = Math.min(containerWidth, 1200); // Fit within container width

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = targetWidth + 'px';
    canvas.style.height = targetHeight + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.reset();

    // Get theme colors from CSS custom properties
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
    const secondaryColor = computedStyle.getPropertyValue('--secondary-color').trim();
    const accentColor = computedStyle.getPropertyValue('--accent-color').trim();
    const textColor = computedStyle.getPropertyValue('--text-color').trim();

    const tonic = currentKey;
    const scale: TeoriaScale = teoria.scale(teoria.note(tonic), 'major');

    // Define staff layout variables - responsive to canvas size
    const leftMargin = Math.max(15, Math.round(targetWidth * 0.03)); // Minimum 15px left margin
    const rightMargin = Math.max(20, Math.round(targetWidth * 0.05)); // Minimum 20px right margin
    const staffWidth = targetWidth - leftMargin - rightMargin; // Ensure both margins are maintained

    // Draw custom staff with appropriate line thickness
    const lineSpacing = Math.round(targetHeight * 0.048); // Slightly tighter spacing
    const staffY = Math.round(canvas.height / 2 - 5 * lineSpacing); // Center the grand staff
    const lineWidth = Math.max(2, Math.round(targetWidth * 0.003)); // Scale line width with canvas

    ctx.strokeStyle = textColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Draw treble staff lines
    for (let i = 0; i < 5; i++) {
        const y = staffY + (i * lineSpacing);
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(leftMargin + staffWidth, y);
    }

    // Gap between staves for ledger lines
    const bassStaffY = staffY + 6 * lineSpacing;

    // Draw bass staff lines
    for (let i = 0; i < 5; i++) {
        const y = bassStaffY + (i * lineSpacing);
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(leftMargin + staffWidth, y);
    }

    // Draw bar lines at start and end
    ctx.lineWidth = lineWidth;
    ctx.moveTo(leftMargin, staffY);
    ctx.lineTo(leftMargin, bassStaffY + 4 * lineSpacing);
    ctx.moveTo(leftMargin + staffWidth, staffY);
    ctx.lineTo(leftMargin + staffWidth, bassStaffY + 4 * lineSpacing);
    ctx.stroke();

    // Draw treble clef properly positioned
    ctx.fillStyle = textColor;
    const clefSize = Math.round(targetHeight * 0.16); // 16% of canvas height
    ctx.font = `bold ${clefSize}px serif`;
    // Position the clef so the bottom J hangs below the bottom line
    const clefY = staffY + (3.75 * lineSpacing) + Math.round(targetHeight * 0.018); // Adjust for proper clef positioning
    ctx.fillText('𝄞', leftMargin + Math.round(targetWidth * 0.008), clefY);

    // Draw bass clef with top on the top line
    const bassClefY = bassStaffY + (2.75 * lineSpacing) + Math.round(targetHeight * 0.018);
    ctx.fillText('𝄢', leftMargin + Math.round(targetWidth * 0.008), bassClefY);

    // Draw key signature (sharps/flats) on both staves
    const keySigStartX = leftMargin + Math.round(targetWidth * 0.067);
    drawKeySignature(ctx, tonic, keySigStartX, staffY, lineSpacing, textColor, targetHeight, 'treble');
    drawKeySignature(ctx, tonic, keySigStartX, bassStaffY, lineSpacing, textColor, targetHeight, 'bass');

    if (history.length < 1) {
        updateNoteDisplay([0, 0], null); // Update gradient panel even with no data
        return;
    }

    // Position spark at 75% of bar length, tail starts immediately left and goes to 25% or memory limit
    const sparkPosition = leftMargin + (staffWidth * 0.75); // Spark at 75% of bar length
    const maxTailLength = staffWidth * 0.5; // Maximum tail covers 50% of bar length (from 25% to 75%)
    const lineEnd = sparkPosition; // Spark position
    const lineStart = Math.max(leftMargin, sparkPosition - maxTailLength); // Tail starts at 25% or left margin

    // Draw trailing line with historical colors
    const originalStrokeStyle = ctx.strokeStyle;
    const originalLineWidth = ctx.lineWidth;
    const originalGlobalAlpha = ctx.globalAlpha;

    ctx.lineWidth = Math.max(4, Math.round(targetWidth * 0.005)); // Thicker trailing line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw comet-like trailing line behind the spark
    const sparkX = lineEnd;
    const lastValue = history[history.length - 1];
    if (!lastValue || lastValue[1] <= 0.95 || lastValue[0] < 20) {
        updateNoteDisplay(lastValue, null);
        return;
    }

    const currentNoteCents = findFreqInScale(scale, lastValue[0]);
    if (!currentNoteCents) {
        updateNoteDisplay(lastValue, null);
        return;
    }
    const cometSparkY = getYForNote(currentNoteCents.note, staffY, bassStaffY, lineSpacing);

    // Collect recent historical points for the tail (last 50 points for longer trail)
    const maxTailPoints = Math.min(50, history.length);
    const tailPoints: { x: number; y: number; cents: number; age: number }[] = [];

    // Get valid historical points
    const validHistoryPoints: { cents: number; note: TeoriaNote; index: number }[] = [];
    for (let i = Math.max(0, history.length - maxTailPoints); i < history.length; i++) {
        const value = history[i];
        if (value[1] > 0.95 && value[0] > 20) {
            const historicalNoteCents = findFreqInScale(scale, value[0]);
            if (historicalNoteCents) {
                validHistoryPoints.push({
                    cents: historicalNoteCents.cents,
                    note: historicalNoteCents.note,
                    index: i
                });
            }
        }
    }

    // Space points evenly from spark back to lineStart
    const availableTailLength = sparkPosition - lineStart;
    const spacing = validHistoryPoints.length > 1 ? availableTailLength / (validHistoryPoints.length - 1) : 0;

    validHistoryPoints.forEach((point, idx) => {
        const x = sparkPosition - ((validHistoryPoints.length - 1 - idx) * spacing); // Oldest farthest left, newest closest to spark
        const y = getYForNote(point.note, staffY, bassStaffY, lineSpacing);
        tailPoints.push({
            x,
            y,
            cents: point.cents,
            age: validHistoryPoints.length - idx - 1 // Age from 0 (newest) to N-1 (oldest)
        });
    });

    // Draw the comet tail as a single line with gradient
    if (tailPoints.length > 0) {
        // Calculate average Y for gradient
        const avgY = tailPoints.reduce((sum, p) => sum + p.y, 0) / tailPoints.length;

        // Create gradient from oldest to newest
        const minX = tailPoints[0].x;
        const maxX = sparkX;
        const gradient = ctx.createLinearGradient(minX, avgY, maxX, avgY);

        // Add color stops for each tail point
        tailPoints.forEach((point) => {
            let color = primaryColor;
            if (point.cents > 10) {
                color = secondaryColor;
            } else if (point.cents < -10) {
                color = accentColor;
            }
            const fadeFactor = 1 - (point.age / (tailPoints.length - 1 || 1));
            const alpha = fadeFactor; // Fade from 1 to 0
            const rgba = color.replace(/rgb\(([^)]+)\)/, `rgba($1, ${alpha})`);
            const pos = (point.x - minX) / (maxX - minX);
            gradient.addColorStop(pos, rgba);
        });

        // Add stop for spark connection
        let sparkColor = primaryColor;
        if (currentNoteCents.cents > 10) {
            sparkColor = secondaryColor;
        } else if (currentNoteCents.cents < -10) {
            sparkColor = accentColor;
        }
        gradient.addColorStop(1.0, sparkColor);

        // Draw the path
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = 0.5; // Alpha is in the gradient
        ctx.lineWidth = Math.max(4, Math.round(targetWidth * 0.0025));

        ctx.beginPath();
        ctx.moveTo(tailPoints[0].x, tailPoints[0].y);
        tailPoints.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(sparkX, cometSparkY);
        ctx.stroke();
    }

    // Reset canvas state
    ctx.strokeStyle = originalStrokeStyle;
    ctx.lineWidth = originalLineWidth;
    ctx.globalAlpha = originalGlobalAlpha;

    const lastNote = history[history.length - 1];
    let noteCents: { note: TeoriaNote; cents: number } | null = null;
    if (lastNote[1] > 0.95) {
        noteCents = findFreqInScale(scale, lastNote[0]);
        if (noteCents) {
            const sparkY = getYForNote(noteCents.note, staffY, bassStaffY, lineSpacing); // Calculate spark Y position
            const sparkRadius = Math.round(targetWidth * 0.04); // 4% of canvas width - larger proportion
            const clampedSparkY = Math.max(sparkRadius, Math.min(canvas.height - 10, sparkY)); // Clamp to keep spark visible
            const grd = ctx.createRadialGradient(lineEnd, clampedSparkY, 1, lineEnd, clampedSparkY, sparkRadius);

            // Use color for spark center
            if (noteCents.cents > 10) {
                grd.addColorStop(0, secondaryColor);
            } else if (noteCents.cents < -10) {
                grd.addColorStop(0, accentColor);
            } else {
                grd.addColorStop(0, primaryColor);
            }

            ctx.beginPath();
            ctx.arc(lineEnd, clampedSparkY, sparkRadius, 0, 2 * Math.PI);
            grd.addColorStop(0.7, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fill();
        }
    }

    updateNoteDisplay(lastNote, noteCents);
}
