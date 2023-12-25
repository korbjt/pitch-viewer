import { Autocorrelator, PitchDetector } from 'pitchy';

import * as teoria from 'teoria';

var a4 = teoria.note('a4');
console.log(a4);

var history = [];

// detect pitch
// find closest note based on scale

const maxFreq = 1200;
const minFreq = 100;

function draw() {
    if (history.length < 1) {
        return;
    }
    var canvas = document.getElementById('pitches');

    var ctx = canvas.getContext('2d');
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ctx.reset();
    ctx.lineWidth = 2;

    var getY = function (freq) {
        return canvas.height - (freq * canvas.height / maxFreq);
    }

    var segmentSize = (canvas.width / 4) / 100;
    var lineStart = (canvas.width / 2) - history.length * segmentSize;

    var grd = ctx.createLinearGradient(canvas.width / 4, 0, canvas.width / 2, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.strokeStyle = grd;

    var lastY = 0;
    ctx.beginPath();
    history.forEach((value, i) => {
        if (value[1] > .95 && value[0] > minFreq) {
            const nextY = getY(value[0]);
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

    ctx.beginPath();
    ctx.arc(canvas.width / 2, lastY, 10, 0, 2 * Math.PI);
    grd = ctx.createRadialGradient(canvas.width / 2, lastY, 1, canvas.width / 2, lastY, 15);

    var lastNote = history[history.length - 1];
    if (lastNote[1] > .95) {
        var fromFreq = teoria.note.fromFrequency(lastNote[0]);
        document.getElementById('note').textContent = fromFreq.note.name();
        document.getElementById('freq').textContent = lastNote[0];
        if (fromFreq.cents < 6) {
            grd.addColorStop(0, 'green');
        } else if (fromFreq.cents < 10) {
            grd.addColorStop(0, 'orange');
        } else {
            grd.addColorStop(0, 'red');
        }

        grd.addColorStop(0.5, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fill();

        var barGrad = ctx.createLinearGradient(canvas.width / 4, 0, 3 * canvas.width / 4, 0)
        barGrad.addColorStop(0, 'rgba(0,0,0,0.0)');
        barGrad.addColorStop(.25, 'rgba(0,0,0,1.0)');
        barGrad.addColorStop(.25, 'rgba(0,0,0,1.0)');
        barGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.strokeStyle = barGrad;
        ctx.lineWidth = 1;

        var noteY = getY(fromFreq.note.fq());
        ctx.beginPath();
        ctx.moveTo(canvas.width / 4, noteY);
        ctx.lineTo(3 * canvas.width / 4, noteY);
        ctx.stroke();

        ctx.beginPath()
        ctx.fillStyle = "black";
        ctx.font = "bold 48px serif";
        ctx.fillText(`${fromFreq.note.name().toUpperCase()}${fromFreq.note.accidental()}`, 3 * canvas.width / 4 + 5, noteY + 5)
    } else {
        document.getElementById('note').textContent = '';
        document.getElementById('freq').textContent = '';
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
