/* ============================================================
   audio.js — увесь звук синтезується в браузері (жодних файлів)
   ============================================================ */
(function (global) {
  'use strict';

  var ctx = null, master = null, ambBus = null, sfxBus = null;
  var ambNodes = [], started = false;
  var heart = null;

  function init() {
    if (ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.0; ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(master);
  }
  function now() { return ctx.currentTime; }

  /* ---------- шум ---------- */
  var noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      var len = ctx.sampleRate * 3;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;       // броунівський — глухіший, страшніший
        d[i] = last * 3.2;
      }
    }
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  /* ---------- ембієнт ---------- */
  function startAmbience() {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    if (started) return;
    started = true;

    // 1. низький гул будівлі
    [41.2, 55, 82.4].forEach(function (f, i) {
      var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f + (Math.random() - .5) * 0.6;
      lp.type = 'lowpass'; lp.frequency.value = 160;
      g.gain.value = [0.14, 0.10, 0.05][i];
      o.connect(lp); lp.connect(g); g.connect(ambBus); o.start();
      ambNodes.push(o);
    });

    // 2. вентиляція
    var n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    nf.type = 'bandpass'; nf.frequency.value = 340; nf.Q.value = 0.55;
    ng.gain.value = 0.16;
    n.connect(nf); nf.connect(ng); ng.connect(ambBus); n.start();
    ambNodes.push(n);

    // 3. повільне "дихання" гулу
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.055; lg.gain.value = 0.05;
    lfo.connect(lg); lg.connect(ambBus.gain); lfo.start();
    ambNodes.push(lfo);

    ambBus.gain.setTargetAtTime(0.5, now(), 2.5);
  }

  function stopAmbience() {
    if (!started) return;
    ambBus.gain.setTargetAtTime(0, now(), 0.4);
    var list = ambNodes.slice(); ambNodes = []; started = false;
    setTimeout(function () { list.forEach(function (n) { try { n.stop(); } catch (e) { } }); }, 900);
    stopHeart();
  }

  /* ---------- утиліти ---------- */
  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function pan(v) { var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = v; return p; }
  function out(node, panning) {
    var p = pan(panning === undefined ? 0 : panning);
    if (p) { node.connect(p); p.connect(sfxBus); } else node.connect(sfxBus);
  }

  /* ---------- сфх ---------- */
  var SFX = {

    step: function (dist, side) {           // dist 0..1 (0 = поруч)
      init();
      var t = now(), vol = 0.5 * (1 - dist * 0.85) + 0.04;
      var n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 220 + 500 * (1 - dist);
      n.connect(f); f.connect(g); out(g, side || 0);
      env(g, t, 0.004, 0.11 + dist * 0.2, vol);
      n.start(t); n.stop(t + 0.4);
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
      o.connect(og); out(og, side || 0); env(og, t, 0.003, 0.1, vol * 0.7);
      o.start(t); o.stop(t + 0.3);
    },

    shutter: function (closing) {
      init();
      var t = now();
      var n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.setValueAtTime(closing ? 1400 : 900, t);
      f.frequency.exponentialRampToValueAtTime(closing ? 260 : 1500, t + 0.3);
      f.Q.value = 1.2;
      n.connect(f); f.connect(g); out(g);
      env(g, t, 0.01, 0.34, 0.5);
      n.start(t); n.stop(t + 0.5);
      if (closing) {
        var o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(120, t + 0.28);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.42);
        o.connect(og); out(og); env(og, t + 0.28, 0.004, 0.18, 0.6);
        o.start(t + 0.28); o.stop(t + 0.6);
      }
    },

    click: function () {
      init();
      var t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 1800;
      o.connect(g); out(g); env(g, t, 0.001, 0.035, 0.18);
      o.start(t); o.stop(t + 0.06);
    },

    camStatic: function () {
      init();
      var t = now(), n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 1200;
      n.connect(f); f.connect(g); out(g);
      env(g, t, 0.005, 0.28, 0.32);
      n.start(t); n.stop(t + 0.4);
    },

    lampFlicker: function () {
      init();
      var t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 100 + Math.random() * 60;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 6;
      o.connect(f); f.connect(g); out(g, (Math.random() - .5) * 1.6);
      env(g, t, 0.002, 0.09, 0.12);
      o.start(t); o.stop(t + 0.15);
    },

    knock: function (side) {
      init();
      var t = now();
      for (var i = 0; i < 3; i++) {
        var tt = t + i * 0.19;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(160, tt);
        o.frequency.exponentialRampToValueAtTime(60, tt + 0.08);
        o.connect(g); out(g, side || 0); env(g, tt, 0.002, 0.13, 0.45);
        o.start(tt); o.stop(tt + 0.25);
      }
    },

    bell: function () {                      // шкільний дзвінок — перк Костіка
      init();
      var t = now();
      [880, 1320, 1760, 2640].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        o.connect(g); out(g, 0);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22 / (i + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
        o.start(t); o.stop(t + 2.8);
      });
      var trem = ctx.createOscillator(), tg = ctx.createGain();
      trem.frequency.value = 9; tg.gain.value = 0.25;
      trem.connect(tg); tg.connect(sfxBus.gain); trem.start(t); trem.stop(t + 2.6);
    },

    paper: function () {
      init();
      var t = now(), n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 2400;
      n.connect(f); f.connect(g); out(g);
      env(g, t, 0.01, 0.35, 0.3);
      n.start(t); n.stop(t + 0.5);
    },

    stinger: function () {                   // короткий скрипковий укол
      init();
      var t = now();
      [1400, 2100, 2810].forEach(function (f) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * 1.02, t + 0.5);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
        o.connect(lp); lp.connect(g); out(g);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.start(t); o.stop(t + 0.8);
      });
    },

    scream: function () {                    // ДЖАМПСКЕР
      init();
      if (ctx.state === 'suspended') ctx.resume();
      var t = now();
      ambBus.gain.setTargetAtTime(0.05, t, 0.05);

      var n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      nf.type = 'bandpass'; nf.Q.value = 0.7;
      nf.frequency.setValueAtTime(3000, t);
      nf.frequency.exponentialRampToValueAtTime(400, t + 1.1);
      n.connect(nf); nf.connect(ng); ng.connect(sfxBus);
      ng.gain.setValueAtTime(0.9, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
      n.start(t); n.stop(t + 1.5);

      [220, 331, 443, 661].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), d = ctx.createWaveShaper();
        var c = new Float32Array(256);
        for (var j = 0; j < 256; j++) { var x = j / 128 - 1; c[j] = Math.tanh(x * 6); }
        d.curve = c;
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 3.2, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 1.0);
        o.connect(d); d.connect(g); g.connect(sfxBus);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2 / (i * 0.6 + 1), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.start(t); o.stop(t + 1.3);
      });
    },

    chime6am: function () {
      init();
      var t = now();
      for (var i = 0; i < 6; i++) {
        (function (k) {
          var tt = t + k * 0.62;
          [523, 784, 1046].forEach(function (f, j) {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            o.connect(g); out(g);
            g.gain.setValueAtTime(0.0001, tt);
            g.gain.exponentialRampToValueAtTime(0.16 / (j + 1), tt + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.9);
            o.start(tt); o.stop(tt + 1);
          });
        })(i);
      }
    }
  };

  /* ---------- серцебиття ---------- */
  function startHeart() {
    init();
    if (heart) return;
    heart = setInterval(function () {
      var t = now();
      [0, 0.17].forEach(function (off, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(64, t + off);
        o.frequency.exponentialRampToValueAtTime(34, t + off + 0.1);
        o.connect(g); g.connect(master);
        env(g, t + off, 0.005, 0.15, i ? 0.22 : 0.34);
        o.start(t + off); o.stop(t + off + 0.3);
      });
    }, 900);
  }
  function stopHeart() { if (heart) { clearInterval(heart); heart = null; } }

  /* ============================================================
     ГОЛОС
     Системний TTS беремо ТІЛЬКИ якщо в системі є справжній
     український голос. Інакше (а це майже завжди) — процедурне
     бурмотіння: чути, що людина говорить, але слів не розібрати.
     Для горору це і страшніше, і не залежить від системи.
     ============================================================ */
  var voice = null, voiceChecked = false;
  var mode = 'mumble';               // mumble (типово) | tts | off

  function pickVoice() {
    if (!global.speechSynthesis) { voiceChecked = true; return; }
    var v = [];
    try { v = speechSynthesis.getVoices() || []; } catch (e) { }
    if (!v.length) return;
    voice = v.filter(function (x) { return /^uk/i.test(x.lang); })[0] || null;
    voiceChecked = true;
  }
  if (global.speechSynthesis) {
    pickVoice();
    try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
  }

  /* --- процедурне бурмотіння --- */
  var mumbleStop = 0;

  function mumble(text, opt) {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    opt = opt || {};
    var vol = (opt.volume === undefined ? 1 : opt.volume) * 0.5;
    var base = opt.base || 115;                       // основний тон
    var rate = opt.rate || 1;
    var muffle = opt.muffle === undefined ? 1 : opt.muffle;  // 1 = через стіну

    // «склади» рахуємо по голосних — ритм виходить схожий на мову
    var syll = Math.max(3, Math.min(46, (text.match(/[аеєиіїоуюяaeiouy]/gi) || []).length));
    var t0 = now(), t = t0;

    var bus = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = muffle > 0.5 ? 760 : 2400;   // глухість «з-за стіни»
    lp.Q.value = 0.7;
    bus.connect(lp);
    var pn = pan((opt.pan || 0));
    if (pn) { lp.connect(pn); pn.connect(sfxBus); } else lp.connect(sfxBus);

    for (var i = 0; i < syll; i++) {
      var dur = (0.085 + Math.random() * 0.075) / rate;
      var gap = Math.random() < 0.13 ? dur * (1.6 + Math.random()) : dur * 0.14;

      // інтонація: фраза йде трохи вниз, у кінці — питальний підйом
      var prog = i / syll;
      var flat = opt.flat || 0;                       // 1 = монотонно, без інтонації
      var f0 = base * (1.06 - prog * 0.18 * (1 - flat)) *
        (1 - (1 - flat) * 0.08 + (1 - flat) * Math.random() * 0.17);
      if (i === syll - 1 && !flat && Math.random() < 0.35) f0 *= 1.22;

      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.linearRampToValueAtTime(f0 * (0.94 + Math.random() * 0.12), t + dur);

      // дві форманти — щоб звучало як голос, а не як пилка
      var f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass'; f1.Q.value = 5;
      f1.frequency.setValueAtTime(320 + Math.random() * 420, t);   // /a/…/o/…/u/
      var f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass'; f2.Q.value = 7;
      f2.frequency.setValueAtTime(980 + Math.random() * 900, t);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * (0.55 + Math.random() * 0.45), t + dur * 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(f1); f1.connect(f2); f2.connect(g); g.connect(bus);
      osc.start(t); osc.stop(t + dur + 0.02);

      // приголосний-шурхіт між складами
      if (Math.random() < 0.45) {
        var nz = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
        nf.type = 'bandpass'; nf.frequency.value = 1800 + Math.random() * 2400; nf.Q.value = 1.4;
        ng.gain.setValueAtTime(0.0001, t + dur * 0.8);
        ng.gain.exponentialRampToValueAtTime(vol * 0.2, t + dur * 0.85);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
        nz.connect(nf); nf.connect(ng); ng.connect(bus);
        nz.start(t + dur * 0.8); nz.stop(t + dur + 0.08);
      }

      t += dur + gap;
    }
    mumbleStop = Math.max(mumbleStop, t);
    return t - t0;
  }

  /* say() — єдина точка входу; сам вирішує, чим говорити */
  function say(text, opt) {
    opt = opt || {};
    if (mode === 'off') return 0;
    var useTts = (mode === 'tts') || (mode === 'auto' && voice);
    if (useTts && global.speechSynthesis) {
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.voice = voice; u.lang = voice ? voice.lang : 'uk-UA';
        u.rate = opt.rate || 1;
        u.pitch = opt.pitch === undefined ? 1 : opt.pitch;
        u.volume = opt.volume === undefined ? 1 : opt.volume;
        speechSynthesis.speak(u);
        return text.length * 0.06;
      } catch (e) { }
    }
    return mumble(text, opt);
  }

  function shutUp() {
    try { if (global.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
  }

  function setVoiceMode(m) { mode = m; }
  function voiceInfo() {
    return { mode: mode, hasUk: !!voice, name: voice ? voice.name : null };
  }

  global.Sound = {
    init: init,
    startAmbience: startAmbience,
    stopAmbience: stopAmbience,
    startHeart: startHeart,
    stopHeart: stopHeart,
    say: say,
    mumble: mumble,
    shutUp: shutUp,
    setVoiceMode: setVoiceMode,
    voiceInfo: voiceInfo,
    duck: function (v, time) { if (ambBus) ambBus.gain.setTargetAtTime(v, now(), time || 0.3); },
    sfx: SFX
  };

})(window);
