import { PitchDetector } from 'pitchy';

import { Renderer, Stave } from 'vexflow';

console.log('I\'m some javascript');

var history = [];

function draw() {
    if(history.length < 1) {
        return;
    }
    var canvas = document.getElementById('pitches');

    const stave = new Stave(10, 0, canvas.width-20);
    stave.addClef('treble');
    stave.addKeySignature('C');

    var ctx = canvas.getContext('2d');  
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderCtx = new Renderer(canvas, Renderer.Backends.CANVAS);
    stave.setContext(renderCtx.getContext()).draw();

    console.log('Y:' + stave.getY());
    console.log('Y:' + stave.getTopLineTopY());
    console.log('Y:' + stave.getBottomLineY());
    console.log('Y:' + stave.getBottomLineBottomY());
    stave.getBottomY();

    //top line = F = 698.46
    //bottom line = E = 329.63

    var scale = (stave.getBottomLineBottomY() - stave.getTopLineTopY()) / (698.46-329.63);
    console.log('scale: ' + scale);
    var grd = ctx.createLinearGradient(0, 0, 200, 0);

    var j = 0;

    ctx.lineWidth=3;
    ctx.beginPath();
    history.forEach((value) => {
        document.getElementById('freq').textContent = value[0];
        grd.addColorStop(j/100.0, `rgba(255,0,0,${value[1]})`);
        ctx.lineTo(2*j, stave.getBottomLineBottomY() - scale * (value[0]-329.63));
        j++;
    });
    ctx.strokeStyle = grd;
    ctx.stroke();

    ctx.moveTo(500, stave.getYForNote(1));
    ctx.lineTo(600, stave.getYForNote(1));
    ctx.stroke();

    ctx.moveTo(600, stave.getYForNote(1.5));
    ctx.lineTo(700, stave.getYForNote(1.5));
    ctx.stroke();
}

document.addEventListener('DOMContentLoaded', () => {
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
        }, 50);
    });
});

