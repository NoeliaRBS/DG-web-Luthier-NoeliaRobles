/* ═══════════════════════════════════════════════
   LUTHIER — js/main.js
   ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   1. CURSOR GLOW
   ───────────────────────────────────────── */
const cursor = document.getElementById('glowCursor');
let cursorVisible = false;

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
  if (!cursorVisible) { cursor.style.opacity = '1'; cursorVisible = true; }
});
document.addEventListener('mouseleave', () => {
  cursor.style.opacity = '0'; cursorVisible = false;
});

/* ─────────────────────────────────────────
   2. SCROLL REVEAL
   ───────────────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));

/* ─────────────────────────────────────────
   3. ACTIVE NAV ON SCROLL
   ───────────────────────────────────────── */
const sections  = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 100) current = sec.getAttribute('id');
  });
  navLinks.forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + current) a.classList.add('active');
  });
});

/* ─────────────────────────────────────────
   4. VIDEO PLAY
   ───────────────────────────────────────── */
const playBtn = document.getElementById('playBtn');
const myVideo = document.getElementById('myVideo');

if (playBtn && myVideo) {
  playBtn.addEventListener('click', () => {
    playBtn.style.display = 'none';
    myVideo.style.display = 'block';
    myVideo.play();
  });
}

/* ─────────────────────────────────────────
   5. ANTES / DESPUÉS SLIDER
   ───────────────────────────────────────── */
const comp    = document.getElementById('comparador');
const before  = document.getElementById('compBefore');
const divider = document.getElementById('compDivider');
let dragging  = false;

function setSlider(pct) {
  pct = Math.max(2, Math.min(98, pct));
  before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  divider.style.left    = pct + '%';
}

function getPct(e) {
  const rect    = comp.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return ((clientX - rect.left) / rect.width) * 100;
}

/* auto-animate: barre de derecha → centro al entrar en pantalla */
let sliderAnimated = false;
const sliderObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !sliderAnimated) {
    sliderAnimated = true;
    let pct = 98;
    const step = () => { pct -= 1.2; setSlider(pct); if (pct > 50) requestAnimationFrame(step); };
    setTimeout(() => requestAnimationFrame(step), 400);
  }
}, { threshold: 0.4 });

if (comp) {
  sliderObserver.observe(comp);
  comp.addEventListener('mousedown',  e => { dragging = true; setSlider(getPct(e)); });
  comp.addEventListener('touchstart', e => { dragging = true; setSlider(getPct(e)); }, { passive: true });
  window.addEventListener('mousemove',  e => { if (dragging) setSlider(getPct(e)); });
  window.addEventListener('touchmove',  e => { if (dragging) setSlider(getPct(e)); }, { passive: true });
  window.addEventListener('mouseup',  () => dragging = false);
  window.addEventListener('touchend', () => dragging = false);
}

/* ─────────────────────────────────────────
   6. SONIDO GUITARRA ELÉCTRICA (hero click)
   ───────────────────────────────────────── */
let audioCtx  = null;
let reverbBuf = null;

function buildReverb(ctx) {
  const sr  = ctx.sampleRate;
  const len = Math.floor(sr * 2.8);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let s = 0; s < len; s++) {
      const t     = s / sr;
      const early = s < Math.floor(sr * 0.04) ? (Math.random() * 2 - 1) * 0.6 : 0;
      const tail  = (Math.random() * 2 - 1) * Math.exp(-t * 2.2);
      d[s] = early + tail * 0.7;
    }
  }
  return buf;
}

function makeDistortion(ctx, amount) {
  const ws    = ctx.createWaveShaper();
  const n     = 512;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x  = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve      = curve;
  ws.oversample = '4x';
  return ws;
}

function playElectricString(ctx, freq, strumTime, idx, total, convolver) {
  const t    = strumTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  osc1.type = 'sawtooth'; osc1.frequency.value = freq;
  osc2.type = 'sawtooth'; osc2.frequency.value = freq * 2.005;
  osc3.type = 'square';   osc3.frequency.value = freq * 0.998;

  const hp       = ctx.createBiquadFilter();
  hp.type        = 'highpass';
  hp.frequency.value = freq * 0.85;
  hp.Q.value     = 0.5;

  const presence = ctx.createBiquadFilter();
  presence.type  = 'peaking';
  presence.frequency.value = 2800;
  presence.gain.value = 5;
  presence.Q.value    = 1.2;

  const tone     = ctx.createBiquadFilter();
  tone.type      = 'lowpass';
  tone.frequency.value = 4200 - idx * 120;
  tone.Q.value   = 0.6;

  const dist     = makeDistortion(ctx, 180);
  const preGain  = ctx.createGain(); preGain.gain.value = 1.8;

  const env   = ctx.createGain();
  const peak  = 0.32 - idx * 0.022;
  const decay = 3.6  - idx * 0.15;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.003);
  env.gain.setTargetAtTime(peak * 0.55, t + 0.01, 0.08);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  const mg1 = ctx.createGain(); mg1.gain.value = 0.55;
  const mg2 = ctx.createGain(); mg2.gain.value = 0.30;
  const mg3 = ctx.createGain(); mg3.gain.value = 0.15;
  const mix = ctx.createGain(); mix.gain.value = 1;

  osc1.connect(mg1); mg1.connect(mix);
  osc2.connect(mg2); mg2.connect(mix);
  osc3.connect(mg3); mg3.connect(mix);
  mix.connect(hp); hp.connect(preGain); preGain.connect(dist);
  dist.connect(presence); presence.connect(tone); tone.connect(env);

  const panner = ctx.createStereoPanner();
  panner.pan.value = ((idx / (total - 1)) - 0.5) * 0.5;
  env.connect(panner);

  const dryG = ctx.createGain(); dryG.gain.value = 0.72;
  const wetG = ctx.createGain(); wetG.gain.value = 0.28;
  panner.connect(dryG); dryG.connect(ctx.destination);
  panner.connect(wetG); wetG.connect(convolver);

  osc1.start(t); osc2.start(t); osc3.start(t);
  osc1.stop(t + decay + 0.2);
  osc2.stop(t + decay + 0.2);
  osc3.stop(t + decay + 0.2);
}

function playGuitarChord() {
  if (!audioCtx) {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    reverbBuf = buildReverb(audioCtx);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const convolver = audioCtx.createConvolver();
  convolver.buffer = reverbBuf;
  const revOut = audioCtx.createGain(); revOut.gain.value = 0.55;
  convolver.connect(revOut); revOut.connect(audioCtx.destination);

  /* Em9 abierto — voicing eléctrico */
  const strings = [82.41, 123.47, 164.81, 207.65, 246.94, 329.63];
  const now     = audioCtx.currentTime + 0.01;
  strings.forEach((freq, i) => playElectricString(audioCtx, freq, now + i * 0.022, i, strings.length, convolver));
}

function spawnRipple(x, y) {
  const container = document.getElementById('guitarRipple');
  const heroEl    = document.getElementById('hero');
  const rect      = heroEl.getBoundingClientRect();
  const rx = x - rect.left;
  const ry = y - rect.top;

  for (let r = 0; r < 3; r++) {
    const ring = document.createElement('div');
    ring.style.cssText = `
      position:absolute;
      left:${rx}px; top:${ry}px;
      width:0; height:0;
      border-radius:50%;
      border:2px solid rgba(183,205,2,${0.7 - r * 0.2});
      transform:translate(-50%,-50%);
      pointer-events:none;
      animation:rippleOut ${0.9 + r * 0.25}s ${r * 0.12}s ease-out forwards;
    `;
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 1400 + r * 250);
  }

  /* flash del título */
  const title = document.getElementById('heroTitle');
  title.style.transition  = 'text-shadow 0.1s ease';
  title.style.textShadow  = '0 0 40px rgba(183,205,2,0.6)';
  setTimeout(() => { title.style.textShadow = 'none'; }, 600);
}

const heroEl = document.getElementById('hero');
if (heroEl) {
  heroEl.addEventListener('click', e => {
    if (e.target.closest('.btn-primary')) return;
    playGuitarChord();
    spawnRipple(e.clientX, e.clientY);
    const hint = document.getElementById('guitarHint');
    if (hint) { hint.style.opacity = '0'; hint.style.transition = 'opacity 0.5s'; }
  });
}
