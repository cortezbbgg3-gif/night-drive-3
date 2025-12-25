import { useEffect, useRef } from 'react';
import { useStore } from './store';

export function AudioEngine() {
  const { running, cranking, broken, rpm, turbo, gas } = useStore();
  const ctx = useRef(null);
  const master = useRef(null);
  const nodes = useRef({ low: null, high: null, turbo: null, start: null });

  const createNoise = (c) => {
    const bs = c.sampleRate * 2;
    const b = c.createBuffer(1, bs, c.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for(let i=0; i<bs; i++) {
        const w = Math.random()*2-1;
        d[i] = (last + (0.02*w))/1.02; last=d[i]; d[i]*=3.5;
    }
    return b;
  };

  useEffect(() => {
    if ((running || cranking) && !ctx.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        ctx.current = new Ctx();
        master.current = ctx.current.createGain();
        master.current.connect(ctx.current.destination);

        // Low Rumble (Buffer)
        const buf = createNoise(ctx.current);
        const lowSrc = ctx.current.createBufferSource(); lowSrc.buffer = buf; lowSrc.loop = true;
        const lowFilt = ctx.current.createBiquadFilter(); lowFilt.type = 'lowpass';
        const lowGain = ctx.current.createGain();
        lowSrc.connect(lowFilt); lowFilt.connect(lowGain); lowGain.connect(master.current);
        nodes.current.low = { src: lowSrc, filt: lowFilt, gain: lowGain };
        lowSrc.start();

        // High Tone
        const hiOsc = ctx.current.createOscillator(); hiOsc.type = 'sawtooth';
        const hiFilt = ctx.current.createBiquadFilter(); hiFilt.type = 'lowpass';
        const hiGain = ctx.current.createGain();
        hiOsc.connect(hiFilt); hiFilt.connect(hiGain); hiGain.connect(master.current);
        nodes.current.high = { osc: hiOsc, filt: hiFilt, gain: hiGain };
        hiOsc.start();

        // Turbo
        const tOsc = ctx.current.createOscillator(); tOsc.type = 'sine';
        const tGain = ctx.current.createGain(); tGain.gain.value = 0;
        tOsc.connect(tGain); tGain.connect(master.current);
        nodes.current.turbo = { osc: tOsc, gain: tGain };
        tOsc.start();

        // Starter
        const sOsc = ctx.current.createOscillator(); sOsc.type = 'square'; sOsc.frequency.value = 12;
        const sGain = ctx.current.createGain(); sGain.gain.value = 0;
        sOsc.connect(sGain); sGain.connect(master.current);
        nodes.current.start = { osc: sOsc, gain: sGain };
        sOsc.start();

    } else if (!running && !cranking && ctx.current) {
        if(master.current) master.current.gain.setTargetAtTime(0, ctx.current.currentTime, 0.2);
        setTimeout(() => { if(ctx.current) { ctx.current.close(); ctx.current = null; } }, 200);
    }
  }, [running, cranking]);

  useEffect(() => {
    if(ctx.current) {
        const t = ctx.current.currentTime;
        const n = nodes.current;
        if (cranking) {
            n.start.gain.gain.setTargetAtTime(0.4, t, 0.05);
            n.low.gain.gain.setTargetAtTime(0, t, 0.05);
            n.high.gain.gain.setTargetAtTime(0, t, 0.05);
        } else if (running && !broken) {
            n.start.gain.gain.setTargetAtTime(0, t, 0.1);
            const r = Math.max(800, rpm);
            
            n.low.src.playbackRate.value = 0.5 + (r/8000)*1.5;
            n.low.filt.frequency.setTargetAtTime(200 + (r/10), t, 0.1);
            n.low.gain.gain.setTargetAtTime(0.6, t, 0.1);

            const f = r/60 * 2; 
            n.high.osc.frequency.setTargetAtTime(f, t, 0.05);
            n.high.filt.frequency.setTargetAtTime(f*3, t, 0.1);
            n.high.gain.gain.setTargetAtTime(0.2 + (gas*0.3), t, 0.1);

            n.turbo.osc.frequency.setTargetAtTime(2000 + turbo*8000, t, 0.1);
            n.turbo.gain.gain.setTargetAtTime(turbo*0.2, t, 0.1);
        } else if (broken) {
            master.current.gain.setTargetAtTime(0, t, 0.1);
        }
    }
  }, [rpm, turbo, gas, cranking, running, broken]);
  return null;
}

