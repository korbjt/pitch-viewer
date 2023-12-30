import { PitchDetector } from 'pitchy';

import * as teoria from 'teoria';
import { Renderer, Stave, StaveNote, RendererBackends } from 'vexflow';

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
    var noteCents = teoria.note.fromFrequency(freq);
    var curr = findNoteInScale(scale, noteCents.note);
    var prev = findNoteInScale(scale, noteCents.note.interval('m-2'));
    var next = findNoteInScale(scale, noteCents.note.interval('m2'));

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
}

function draw() {
    var canvas = document.getElementById('pitches');
    canvas.width = canvas.parentNode.clientWidth;
    if (history.length < 1) {
        return;
    }
    var ctx = canvas.getContext('2d');
    ctx.reset();

    var tonic = document.getElementById('tonic').value;
    var scale = teoria.scale(teoria.note(tonic), 'major');

    const renderer = new Renderer(canvas, RendererBackends.CANVAS);
    renderer.resize(ctx.canvas.width, ctx.canvas.height);

    var hSpace = 10;
    var staveStart = hSpace;
    var staveWidth = canvas.width * .75;

    var stave = new Stave(hSpace, canvas.height / 2 - 40, staveWidth, {
        spacing_between_lines_px: 20,
        space_above_staff_ln: 0,
    });
    stave.setContext(renderer.getContext());
    stave.setKeySignature(tonic);
    stave.draw();

    var centsStart = staveStart + staveWidth + hSpace;
    var centsWidth = 50;

    var centsGrad = ctx.createLinearGradient(0, 10, 0, canvas.height - 20);
    centsGrad.addColorStop(0, 'rgba(0, 0, 255, .5)');
    centsGrad.addColorStop(.5, 'green');
    centsGrad.addColorStop(1, 'rgba(255,255,0,.5)');

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = centsGrad;
    ctx.fillRect(centsStart, 10, centsWidth, canvas.height - 20);


    var getYForNote = function (n) {
        return stave.getYForNote(new StaveNote({
            keys: [`${n.name()}${n.accidental()}/${n.octave()}`],
            duration: 'q',
        }).getLineNumber());
    };

    var segmentSize = (canvas.width / 4) / 100;
    var lineEnd = canvas.width / 2;
    var lineStart = lineEnd - history.length * segmentSize;
    var lastY = 0;
    ctx.beginPath();
    history.forEach((value, i) => {
        if (value[1] > .95 && value[0] > minFreq) {
            var noteCents = findFreqInScale(scale, value[0]);
            const nextY = getYForNote(noteCents.note);
            if (lastY == 0) {
                ctx.moveTo(lineStart + (i * segmentSize), nextY);
            } else {
                ctx.lineTo(lineStart + (i * segmentSize), nextY);
            }
            lastY = nextY;
        } else {
            ctx.moveTo(lineStart + (i * segmentSize), lastY);
        }
    });
    ctx.stroke();

    var lastNote = history[history.length - 1];
    if (lastNote[1] > .95) {
        var noteCents = findFreqInScale(scale, lastNote[0]);

        var grd = ctx.createRadialGradient(lineEnd, lastY, 1, canvas.width / 2, lastY, 15);
        if (noteCents.cents > 10) {
            grd.addColorStop(0, 'blue');
        } else if (noteCents.cents < -10) {
            grd.addColorStop(0, 'yellow');
        } else {
            grd.addColorStop(0, 'green');
        }

        ctx.beginPath();
        ctx.arc(lineEnd, lastY, 10, 0, 2 * Math.PI);
        grd.addColorStop(0.5, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centsStart, canvas.height / 2);
        ctx.lineTo(centsStart + centsWidth, canvas.height / 2);
        ctx.lineWidth = 2;
        ctx.stroke();

        let centsY = canvas.height / 2 - (noteCents.cents * 200 / (canvas.height - 20));
        ctx.beginPath();
        ctx.moveTo(centsStart, centsY);
        ctx.lineTo(centsStart + centsWidth, centsY);
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.font = '40px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(`${noteCents.note.name()}${noteCents.note.accidental()}`, centsStart + centsWidth + hSpace, canvas.height / 2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        var ctx = new AudioContext({});
        var analyzer = ctx.createAnalyser();
        analyzer.minDecibels = -50;
        analyzer.maxDecibels = -10;
        analyzer.smoothingTimeConstant = 0.85;

        ctx.createMediaStreamSource(stream).connect(analyzer);
        var detector = PitchDetector.forFloat32Array(analyzer.fftSize);

        setInterval(() => {
            var buffer = new Float32Array(detector.inputLength);
            analyzer.getFloatTimeDomainData(buffer);
            history.push(detector.findPitch(buffer, ctx.sampleRate));
            if (history.length > 100) {
                history.shift();
            }
            window.requestAnimationFrame(draw);
        }, 25);
    });
});

