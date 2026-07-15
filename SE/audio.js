const Organism = (() => {
  let ctx = null;
  let master = null;
  let started = false;
  let scheduledTimeouts = [];
 
  function rand(min, max) { return Math.random() * (max - min) + min; }
 
  function makeNoiseBuffer(duration = 2) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
 
  // A single low drone voice - the "vocal cords" of the thing.
  function makeDroneVoice(baseFreq, detune, filterFreq) {
    const osc = ctx.createOscillator();
    osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = baseFreq;
    osc.detune.value = detune;
 
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 4;
 
    const gain = ctx.createGain();
    gain.gain.value = 0;
 
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
 
    // slow breathing swell in volume
    const swell = () => {
      const now = ctx.currentTime;
      const target = rand(0.03, 0.11);
      const dur = rand(4, 9);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(target, now + dur);
      scheduledTimeouts.push(setTimeout(swell, dur * 1000));
    };
    swell();
 
    // very slow pitch drift, like the pitch is being "grown" not played
    const drift = () => {
      const now = ctx.currentTime;
      const target = baseFreq * rand(0.94, 1.06);
      const dur = rand(6, 14);
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(target, now + dur);
      scheduledTimeouts.push(setTimeout(drift, dur * 1000));
    };
    drift();
 
    // slow filter movement, like the throat opening and closing
    const filterMove = () => {
      const now = ctx.currentTime;
      const target = rand(150, filterFreq);
      const dur = rand(5, 12);
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(target, now + dur);
      scheduledTimeouts.push(setTimeout(filterMove, dur * 1000));
    };
    filterMove();
 
    return { osc, filter, gain };
  }
 
  // Wind / breath texture - filtered noise, amplitude pulsing like lungs.
  function makeBreath() {
    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(4);
    source.loop = true;
 
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.7;
 
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
 
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
 
    const breathe = () => {
      const now = ctx.currentTime;
      const inhale = rand(2.5, 5);
      const exhale = rand(3, 6);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(rand(0.02, 0.05), now + inhale);
      gain.gain.linearRampToValueAtTime(0.0, now + inhale + exhale);
      scheduledTimeouts.push(setTimeout(breathe, (inhale + exhale) * 1000));
    };
    breathe();
 
    return { source, filter, gain };
  }
 
  // Occasional deep groan, like the walls shifting or something enormous
  // turning over in its sleep. Irregular, unmusical, never on a beat.
  function scheduleGroans() {
    const groan = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const startFreq = rand(30, 70);
      osc.frequency.setValueAtTime(startFreq, now);
 
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      filter.Q.value = 6;
 
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
 
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
 
      const dur = rand(3, 7);
      gain.gain.linearRampToValueAtTime(rand(0.05, 0.13), now + dur * 0.3);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.frequency.linearRampToValueAtTime(startFreq * rand(0.4, 0.8), now + dur);
 
      osc.start(now);
      osc.stop(now + dur + 0.1);
 
      const nextIn = rand(9000, 26000);
      scheduledTimeouts.push(setTimeout(groan, nextIn));
    };
    scheduledTimeouts.push(setTimeout(groan, rand(4000, 9000)));
  }
 
  // A rare, higher, almost-melodic-but-wrong tone, like the structure is
  // "trying" to make music and getting it slightly off.
  function scheduleWrongTones() {
    const tone = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const freqs = [220, 233, 246, 261, 277, 293];
      osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
      osc.detune.value = rand(-40, 40);
 
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      const dur = rand(2, 5);
      gain.gain.linearRampToValueAtTime(rand(0.015, 0.035), now + dur * 0.4);
      gain.gain.linearRampToValueAtTime(0, now + dur);
 
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.1);
 
      scheduledTimeouts.push(setTimeout(tone, rand(15000, 40000)));
    };
    scheduledTimeouts.push(setTimeout(tone, rand(8000, 20000)));
  }
 
  function start() {
    if (started) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
 
    makeDroneVoice(48, -8, 500);
    makeDroneVoice(64, 6, 350);
    makeDroneVoice(90, 3, 600);
    makeBreath();
    scheduleGroans();
    scheduleWrongTones();
 
    started = true;
  }
 
  // Short, harsh stinger used for jumpscare moments - a burst of noise
  // through a screaming bandpass filter, not a "song", just a shock.
  function stinger() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(0.6);
 
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.linearRampToValueAtTime(140, now + 0.5);
    filter.Q.value = 8;
 
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
 
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + 0.55);
  }
 
  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
 
  return { start, resume, stinger };
})();
