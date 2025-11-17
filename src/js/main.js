import { PitchDetector } from 'pitchy';

import * as teoria from 'teoria';

// Key signature drawing function
function drawKeySignature(ctx, key, startX, staffY, lineSpacing, color, targetHeight) {
    const keyObj = teoria.note(key);
    const scale = teoria.scale(keyObj, 'major');
    const notes = scale.notes();

    // Find accidentals in the key signature
    const accidentals = [];
    const cMajor = teoria.scale(teoria.note('c'), 'major').notes();

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const cMajorNote = cMajor[i];
        if (note.accidental() !== cMajorNote.accidental()) {
            accidentals.push({
                name: note.name(),
                accidental: note.accidental(),
                position: i
            });
        }
    }

    // Draw accidentals in standard key signature order
    const accidentalOrder = ['f', 'c', 'g', 'd', 'a', 'e', 'b']; // Order for sharps
    const sharpPositions = [2, 5, 1, 4, 0, 3, 6]; // Staff positions (0 = bottom line, 6 = top space)
    const flatPositions = [4, 1, 5, 2, 6, 3, 0]; // Staff positions for flats

    let x = startX;
    const symbolSize = Math.round(targetHeight * 0.07); // 7% of canvas height

    for (const accidental of accidentals) {
        const isSharp = accidental.accidental === '#';
        const positions = isSharp ? sharpPositions : flatPositions;
        const order = isSharp ? accidentalOrder : accidentalOrder.slice().reverse();

        const index = order.indexOf(accidental.name.toLowerCase());
        if (index !== -1) {
            const staffPos = positions[index];
            const y = staffY + (staffPos * lineSpacing / 2);

            ctx.fillStyle = color;
            ctx.font = `${symbolSize}px serif`;
            ctx.fillText(isSharp ? '♯' : '♭', x, y + symbolSize/3);

            x += symbolSize * 0.8;
        }
    }
}

var history = [];

// detect pitch
// find closest note based on scale

//const maxFreq = 1200;
const minFreq = 100;

function findNoteInScale(scale, note) {
    if (note.scaleDegree(scale)) {
        return note;
    }

    var enharmoics = note.enharmonics();
    for (let i = 0; i < enharmoics.length; i++) {
        if (enharmoics[i].scaleDegree(scale) > 0) {
            return enharmoics[i];
        }
    }

    return null;
}

function findFreqInScale(scale, freq) {
    try {
        var noteCents = teoria.note.fromFrequency(freq);
        if (!noteCents || !noteCents.note) {
            console.warn('Invalid noteCents for frequency:', freq);
            return null;
        }

        var curr = findNoteInScale(scale, noteCents.note);
        var prev = findNoteInScale(scale, noteCents.note.interval('m-2'));
        var next = findNoteInScale(scale, noteCents.note.interval('m-2')); // Fixed: was 'm2' but should be 'm-2' for next note?

        if (curr) {
            return {
                note: curr,
                cents: noteCents.cents,
            };
        } else if (next) {
            return {
                note: next,
                cents: -100 + noteCents.cents,
            };
        } else {
            return {
                note: prev,
                cents: 100 + noteCents.cents,
            };
        }
    } catch (error) {
        console.error('Error in findFreqInScale:', error, 'freq:', freq);
        return null;
    }
}

function draw() {
    var canvas = document.getElementById('pitches');

    // Set canvas size based on container - prioritize height, allow width to flex
    const container = canvas.parentNode;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Use full container dimensions, but maintain aspect ratio and fit within container
    const targetHeight = Math.min(containerHeight, 400);
    const targetWidth = Math.min(containerWidth, 1200); // Fit within container width

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = targetWidth + 'px';
    canvas.style.height = targetHeight + 'px';

    if (history.length < 1) {
        return;
    }
    var ctx = canvas.getContext('2d');
    ctx.reset();

    // Get theme colors from CSS custom properties
    var computedStyle = getComputedStyle(document.documentElement);
    var primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
    var secondaryColor = computedStyle.getPropertyValue('--secondary-color').trim();
    var accentColor = computedStyle.getPropertyValue('--accent-color').trim();
    var textColor = computedStyle.getPropertyValue('--text-color').trim();

    var tonic = currentKey;
    var scale = teoria.scale(teoria.note(tonic), 'major');

    // Define staff layout variables - responsive to canvas size
    const leftMargin = Math.max(15, Math.round(targetWidth * 0.03)); // Minimum 15px left margin
    const rightMargin = Math.max(20, Math.round(targetWidth * 0.05)); // Minimum 20px right margin
    const staffWidth = targetWidth - leftMargin - rightMargin; // Ensure both margins are maintained

    // Draw custom staff with appropriate line thickness
    const lineSpacing = Math.round(targetHeight * 0.048); // Slightly tighter spacing
    const staffY = Math.round(canvas.height / 2 - (targetHeight * 0.11)); // Center staff with more room for spark
    const lineWidth = Math.max(2, Math.round(targetWidth * 0.003)); // Scale line width with canvas

    ctx.strokeStyle = textColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Draw staff lines
    for (let i = 0; i < 5; i++) {
        const y = staffY + (i * lineSpacing);
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(leftMargin + staffWidth, y);
        ctx.stroke();
    }

    // Draw bar lines at start and end
    ctx.lineWidth = lineWidth * 1.2; // Slightly thicker for bar lines
    ctx.beginPath();
    ctx.moveTo(leftMargin, staffY);
    ctx.lineTo(leftMargin, staffY + (4 * lineSpacing));
    ctx.moveTo(leftMargin + staffWidth, staffY);
    ctx.lineTo(leftMargin + staffWidth, staffY + (4 * lineSpacing));
    ctx.stroke();

    // Draw treble clef properly positioned
    ctx.fillStyle = textColor;
    const clefSize = Math.round(targetHeight * 0.16); // 16% of canvas height
    ctx.font = `bold ${clefSize}px serif`;
    // Position the clef so the G-line (second line from bottom) goes through the curl
    const clefY = staffY + (3.5 * lineSpacing) + Math.round(targetHeight * 0.018); // Adjust for proper clef positioning
    ctx.fillText('𝄞', leftMargin + Math.round(targetWidth * 0.008), clefY);

    // Draw key signature (sharps/flats)
    drawKeySignature(ctx, tonic, leftMargin + Math.round(targetWidth * 0.067), staffY, lineSpacing, textColor, targetHeight);

    // Custom note positioning for our simple staff
    var getYForNote = function (n) {
        try {
            // Snap to nearest staff line or space
            // Staff lines: E4(64), G4(67), B4(71), D5(74), F5(77)
            // Spaces: F4(65), A4(69), C5(72), E5(76)

            const noteValue = n.midi();
            const staffLines = [64, 65, 67, 69, 71, 72, 74, 76, 77]; // Lines and main spaces

            // Find the closest staff position
            let closestPos = 0;
            let minDistance = Math.abs(noteValue - staffLines[0]);

            for (let i = 1; i < staffLines.length; i++) {
                const distance = Math.abs(noteValue - staffLines[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPos = i;
                }
            }

            // Convert position index to Y coordinate
            // 0 = bottom line (E4), 8 = top line (F5)
            const noteY = staffY + (8 - closestPos) * (lineSpacing / 2);

            return noteY;
        } catch (error) {
            console.error('Error in getYForNote:', error, 'note:', n);
            return staffY + (4 * lineSpacing); // Return middle of staff as fallback
        }
    };

    // Position spark at 75% of bar length, tail starts immediately left and goes to 25% or memory limit
    var sparkPosition = leftMargin + (staffWidth * 0.75); // Spark at 75% of bar length
    var maxTailLength = staffWidth * 0.5; // Maximum tail covers 50% of bar length (from 25% to 75%)
    var lineEnd = sparkPosition; // Spark position
    var lineStart = Math.max(leftMargin, sparkPosition - maxTailLength); // Tail starts at 25% or left margin

    // Draw trailing line with historical colors
    const originalStrokeStyle2 = ctx.strokeStyle;
    const originalLineWidth2 = ctx.lineWidth;
    const originalGlobalAlpha = ctx.globalAlpha;

    ctx.lineWidth = Math.max(4, Math.round(targetWidth * 0.005)); // Thicker trailing line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw comet-like trailing line behind the spark
    const sparkX = lineEnd;
    const lastValue = history[history.length - 1];
    if (!lastValue || lastValue[1] <= .95 || lastValue[0] < minFreq) {
        return;
    }

    const currentNoteCents = findFreqInScale(scale, lastValue[0]);
    const cometSparkY = getYForNote(currentNoteCents.note);

    // Collect recent historical points for the tail (last 20-25 points for longer trail)
    const maxTailPoints = Math.min(25, history.length);
    const tailPoints = [];

    // Get valid historical points
    const validHistoryPoints = [];
    for (let i = Math.max(0, history.length - maxTailPoints); i < history.length; i++) {
        const value = history[i];
        if (value[1] > .95 && value[0] > minFreq) {
            const historicalNoteCents = findFreqInScale(scale, value[0]);
            if (historicalNoteCents && historicalNoteCents.note) {
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
        const y = getYForNote(point.note);
        tailPoints.push({
            x,
            y,
            cents: point.cents,
            age: validHistoryPoints.length - idx - 1 // Age from 0 (newest) to N-1 (oldest)
        });
    });

    // Draw the comet tail from oldest to newest (fading out)
    for (let i = 0; i < tailPoints.length - 1; i++) {
        const point = tailPoints[i];
        const nextPoint = tailPoints[i + 1];

        // Determine color based on cents deviation
        let segmentColor = textColor;
        if (point.cents > 10) {
            segmentColor = secondaryColor; // Sharp
        } else if (point.cents < -10) {
            segmentColor = accentColor; // Flat
        } else {
            segmentColor = primaryColor; // In tune
        }

        // Fade out as we go back in time (older points are more transparent)
        const fadeFactor = 1 - (point.age / (tailPoints.length - 1 || 1));
        const alpha = Math.max(0.05, fadeFactor * 0.9); // Fade from 0.9 to 0.05 for smoother transition

        ctx.strokeStyle = segmentColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(2, Math.round(targetWidth * 0.003) * fadeFactor); // Vary line width with fade

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
    }

    // Connect the most recent tail point to the spark
    if (tailPoints.length > 0) {
        const lastTailPoint = tailPoints[tailPoints.length - 1];

        // Determine color for connection to spark
        let connectionColor = textColor;
        if (currentNoteCents.cents > 10) {
            connectionColor = secondaryColor;
        } else if (currentNoteCents.cents < -10) {
            connectionColor = accentColor;
        } else {
            connectionColor = primaryColor;
        }

        ctx.strokeStyle = connectionColor;
        ctx.globalAlpha = 1.0; // Full opacity for connection to spark
        ctx.lineWidth = Math.max(3, Math.round(targetWidth * 0.004)); // Slightly thicker connection line

        ctx.beginPath();
        ctx.moveTo(lastTailPoint.x, lastTailPoint.y);
        ctx.lineTo(sparkX, cometSparkY);
        ctx.stroke();
    }

    // Reset canvas state
    ctx.strokeStyle = originalStrokeStyle2;
    ctx.lineWidth = originalLineWidth2;
    ctx.globalAlpha = originalGlobalAlpha;

    var lastNote = history[history.length - 1];
    if (lastNote[1] > .95) {
        var noteCents = findFreqInScale(scale, lastNote[0]);
        if (noteCents && noteCents.note) {
            var sparkY = getYForNote(noteCents.note); // Calculate spark Y position

            const sparkRadius = Math.round(targetWidth * 0.04); // 4% of canvas width - larger proportion
            var grd = ctx.createRadialGradient(lineEnd, sparkY, 1, lineEnd, sparkY, sparkRadius);

            // Use color for spark center
            if (noteCents.cents > 10) {
                grd.addColorStop(0, secondaryColor);
            } else if (noteCents.cents < -10) {
                grd.addColorStop(0, accentColor);
            } else {
                grd.addColorStop(0, primaryColor);
            }

            ctx.beginPath();
            ctx.arc(lineEnd, sparkY, sparkRadius, 0, 2 * Math.PI);
            grd.addColorStop(0.7, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fill();
        }

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

// Theme management
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'auto') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);
    return savedTheme;
}

// Key management
let currentKey = 'C'; // Default key

function applyKey(key) {
    currentKey = key;
    localStorage.setItem('key', key);
}

function loadKey() {
    const savedKey = localStorage.getItem('key') || 'C';
    applyKey(savedKey);
    return savedKey;
}

// Debug mode management
let debugMode = false;
let debugPanelVisible = false;
let debugFrequency = 440; // Default A4
let debugNote = 'A';
let debugAccidental = '';
let debugOctave = 4;

function enableDebugMode() {
    debugMode = true;
    localStorage.setItem('debugMode', 'true');
}

function disableDebugMode() {
    debugMode = false;
    localStorage.setItem('debugMode', 'false');
}

function showDebugPanel() {
    debugPanelVisible = true;
    document.getElementById('debug-panel').style.display = 'block';
    localStorage.setItem('debugPanelVisible', 'true');
}

function hideDebugPanel() {
    debugPanelVisible = false;
    document.getElementById('debug-panel').style.display = 'none';
    localStorage.setItem('debugPanelVisible', 'false');
}

function updateDebugFrequency() {
    // Calculate frequency from note, accidental, and octave
    const noteName = debugNote + debugAccidental + debugOctave;
    const note = teoria.note(noteName);
    debugFrequency = note.fq();
    const frequencyInput = document.getElementById('debug-frequency');
    const frequencyDisplay = document.getElementById('frequency-display');
    if (frequencyInput) {
        frequencyInput.value = debugFrequency;
    }
    if (frequencyDisplay) {
        frequencyDisplay.textContent = debugFrequency.toFixed(1) + ' Hz';
    }
}

function updateDebugFromFrequency() {
    try {
        // Find the closest note to the frequency
        const note = teoria.note.fromFrequency(debugFrequency);
        if (note && typeof note.name === 'function') {
            debugNote = note.name();
            debugAccidental = note.accidental ? note.accidental() : '';
            debugOctave = note.octave ? note.octave() : 4;

            // Update UI
            document.getElementById('debug-note').value = debugNote;
            document.getElementById('debug-accidental').value = debugAccidental;
            document.getElementById('debug-octave').textContent = debugOctave;
        } else {
            console.warn('Invalid note object from teoria.note.fromFrequency:', note);
        }
    } catch (error) {
        console.error('Error in updateDebugFromFrequency:', error);
    }
}

// Modal functionality
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Update theme selector to show current theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'auto';
        themeSelect.value = currentTheme === 'auto' ? 'auto' : currentTheme;
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// Microphone device enumeration
async function enumerateMicrophones() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter(device => device.kind === 'audioinput');

        const micSelect = document.getElementById('mic-select-modal');
        if (micSelect) {
            // Clear existing options except the default
            micSelect.innerHTML = '<option value="">Default</option>';

            // Add microphone options
            microphones.forEach(mic => {
                const option = document.createElement('option');
                option.value = mic.deviceId;
                option.textContent = mic.label || `Microphone ${micSelect.options.length}`;
                micSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('Could not enumerate microphones:', error);
    }
}

// Initialize microphone access
async function initializeMicrophone(deviceId = null) {
    try {
        const constraints = {
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

        setInterval(() => {
            if (debugMode) {
                // Use debug frequency
                history.push([debugFrequency, 0.96]); // Simulated pitch with high confidence (> 0.95)
            } else {
                // Use microphone input
                const buffer = new Float32Array(detector.inputLength);
                analyzer.getFloatTimeDomainData(buffer);
                const pitch = detector.findPitch(buffer, ctx.sampleRate);
                history.push(pitch);
            }

            if (history.length > 100) {
                history.shift();
            }
            window.requestAnimationFrame(draw);
        }, 25);

        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme and key
    loadTheme();
    loadKey();

    // Initialize debug mode and panel visibility
    const savedDebugMode = localStorage.getItem('debugMode') === 'true';
    const savedPanelVisible = localStorage.getItem('debugPanelVisible') === 'true';

    if (savedDebugMode) {
        enableDebugMode();
        document.getElementById('debug-toggle').checked = true;
    }

    if (savedPanelVisible) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }

    // Set initial key selector value
    const keySelect = document.getElementById('key-select');
    if (keySelect) {
        keySelect.value = currentKey;
    }

    // Initialize debug controls
    updateDebugFrequency();
    const frequencyInput = document.getElementById('debug-frequency');
    const frequencyDisplay = document.getElementById('frequency-display');
    if (frequencyInput) {
        frequencyInput.value = debugFrequency;
    }
    if (frequencyDisplay) {
        frequencyDisplay.textContent = debugFrequency.toFixed(1) + ' Hz';
    }

    // Modal event listeners
    const settingsButton = document.getElementById('settings-button');
    const debugButton = document.getElementById('debug-button');
    const closeButton = document.getElementById('close-settings');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const micButton = document.getElementById('mic-button-modal');
    const micSelect = document.getElementById('mic-select-modal');
    const themeSelect = document.getElementById('theme-select');

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            enumerateMicrophones();
            openSettingsModal();
        });
    }

    if (debugButton) {
        debugButton.addEventListener('click', () => {
            if (debugPanelVisible) {
                hideDebugPanel();
            } else {
                showDebugPanel();
            }
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeSettingsModal);
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeSettingsModal);
    }

    if (micButton) {
        micButton.addEventListener('click', async () => {
            const selectedDeviceId = micSelect ? micSelect.value : null;
            const success = await initializeMicrophone(selectedDeviceId);
            if (success) {
                closeSettingsModal();
            }
        });
    }

    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            applyTheme(event.target.value);
        });
    }

    // Main interface key selector
    if (keySelect) {
        keySelect.addEventListener('change', (event) => {
            applyKey(event.target.value);
        });
    }

    // Debug controls
    const debugToggle = document.getElementById('debug-toggle');
    const debugNoteSelect = document.getElementById('debug-note');
    const debugAccidentalSelect = document.getElementById('debug-accidental');
    const octaveDownBtn = document.getElementById('octave-down');
    const octaveUpBtn = document.getElementById('octave-up');
    const debugFrequencyInput = document.getElementById('debug-frequency');

    if (debugToggle) {
        debugToggle.addEventListener('change', (event) => {
            if (event.target.checked) {
                enableDebugMode();
            } else {
                disableDebugMode();
            }
        });
    }

    if (debugNoteSelect) {
        debugNoteSelect.addEventListener('change', (event) => {
            debugNote = event.target.value;
            updateDebugFrequency();
        });
    }

    if (debugAccidentalSelect) {
        debugAccidentalSelect.addEventListener('change', (event) => {
            debugAccidental = event.target.value;
            updateDebugFrequency();
        });
    }

    if (octaveDownBtn) {
        octaveDownBtn.addEventListener('click', () => {
            if (debugOctave > 1) {
                debugOctave--;
                document.getElementById('debug-octave').textContent = debugOctave;
                updateDebugFrequency();
            }
        });
    }

    if (octaveUpBtn) {
        octaveUpBtn.addEventListener('click', () => {
            if (debugOctave < 8) {
                debugOctave++;
                document.getElementById('debug-octave').textContent = debugOctave;
                updateDebugFrequency();
            }
        });
    }

    if (debugFrequencyInput) {
        debugFrequencyInput.addEventListener('input', (event) => {
            const freq = parseFloat(event.target.value);
            if (!isNaN(freq) && freq >= 80 && freq <= 1000) {
                debugFrequency = freq;
                if (frequencyDisplay) {
                    frequencyDisplay.textContent = freq.toFixed(1) + ' Hz';
                }
                updateDebugFromFrequency();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('settings-modal');
            if (modal && modal.getAttribute('aria-hidden') === 'false') {
                closeSettingsModal();
            }
        }
    });

    // Initialize with default microphone
    initializeMicrophone();
});
