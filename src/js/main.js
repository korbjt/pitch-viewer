import { PitchDetector } from 'pitchy';

import * as teoria from 'teoria';
import { Renderer, Stave, StaveNote, RendererBackends } from 'vexflow';

var a4 = teoria.note('a4');
console.log(a4);
console.log(a4.name());
console.log(a4.accidental());
console.log(a4.octave());
console.log(teoria.note.fromFrequency('439').cents);

var history = [];

// detect pitch
// find closest note based on scale

//const maxFreq = 1200;
const minFreq = 100;

function findNoteInScale(scale, freq) {
    var noteCents = teoria.note.fromFrequency(freq);
    var curr = noteCents.note;
    var prev = curr.interval('m-2');
    var next = curr.interval('m2');
    if (curr.scaleDegree(scale) > 0) {
        return noteCents;
    } else if (next.scaleDegree(scale) > 0) {
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
    if (history.length < 1) {
        return;
    }
    var canvas = document.getElementById('pitches');
    var ctx = canvas.getContext('2d');
    ctx.reset();

    var scale = teoria.scale(teoria.note('D'), 'major');

    const renderer = new Renderer(canvas, RendererBackends.CANVAS);
    renderer.resize(ctx.canvas.width, ctx.canvas.height);
    var stave = new Stave(10, 10, 500);
    stave.setContext(renderer.getContext());
    stave.setKeySignature('D');
    stave.draw();


    var getYForNote = function (n) {
        return stave.getYForNote(new StaveNote({
            keys: [`${n.name()}${n.accidental()}/${n.octave()}`],
            duration: 'q',
        }).getLineNumber());
    };

    var segmentSize = (canvas.width / 4) / 100;
    var lineStart = (canvas.width / 2) - history.length * segmentSize;
    var lastY = 0;
    ctx.beginPath();
    history.forEach((value, i) => {
        if (value[1] > .95 && value[0] > minFreq) {
            var noteCents = findNoteInScale(scale, value[0]);
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
    if(lastNote[1] > .95) {
        var noteCents = findNoteInScale(scale, lastNote[0]);
        document.getElementById('note').textContent = noteCents.note.scientific();
        document.getElementById('freq').textContent = noteCents.note.fq();
        document.getElementById('cents').textContent = noteCents.cents;

        var grd = ctx.createRadialGradient(canvas.width / 2, lastY, 1, canvas.width / 2, lastY, 15);
        if (noteCents.cents < 6) {
            grd.addColorStop(0, 'green');
        } else if (noteCents.cents < 10) {
            grd.addColorStop(0, 'orange');
        } else {
            grd.addColorStop(0, 'red');
        }

        ctx.beginPath();
        ctx.arc(canvas.width / 2, lastY, 10, 0, 2 * Math.PI);
        grd.addColorStop(0.5, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fill();
    } else {
        document.getElementById('note').textContent = '';
        document.getElementById('freq').textContent = '';
        document.getElementById('cents').textContent = '';
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
        }, 100);
    });
});

