import { PitchDetector } from 'pitchy';

import * as teoria from 'teoria';

var a4 = teoria.note('a4');
console.log(a4);

var history = [];

// detect pitch
// find closest note based on scale

function draw() {
    if(history.length < 1) {
        return;
    }
    var canvas = document.getElementById('pitches');

    var ctx = canvas.getContext('2d');  
    ctx.reset();
    ctx.lineWidth=2;

    var segmentSize = (canvas.width/4) / 100;
    var lineStart = (canvas.width / 2) - history.length * segmentSize;

    var grd = ctx.createLinearGradient(canvas.width/4, 0, canvas.width/2, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.strokeStyle = grd;

    ctx.beginPath();
    var yVal;
    history.forEach((value, i) => {
        yVal = canvas.height - (value[0] * canvas.height/3000) - 50;
        ctx.lineTo(lineStart + (i * segmentSize), yVal);
    });
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(canvas.width/2, yVal, 10, 0, 2 * Math.PI);
    grd = ctx.createRadialGradient(canvas.width/2, yVal, 1, canvas.width/2, yVal, 15);

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
    } else {
        document.getElementById('note').textContent = '';
        document.getElementById('freq').textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
     console.log('Hello');
    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
        var ctx = new AudioContext({});
        var analyzer = new AnalyserNode(ctx, {
            fftSize: 2048,
        });
        ctx.createMediaStreamSource(stream).connect(analyzer);
        var detector = PitchDetector.forFloat32Array(analyzer.fftSize);

        setInterval(() => {
            var buffer = new Float32Array(detector.inputLength);
            analyzer.getFloatTimeDomainData(buffer);
            history.push(detector.findPitch(buffer, 44100));
            if(history.length > 100) {
                history.shift();
            }
            window.requestAnimationFrame(draw);
        },100);
    });
});

