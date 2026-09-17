/* ============================================================
   game.js — 5 ночей у 6 школі
   ============================================================ */
(function () {
  'use strict';

  var T = window.THREE, W = window.World, C = window.Chars, S = window.Sound, ST = window.Stories;

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('gl');
  var elClock = $('clock'), elNight = $('night-label');
  var elPwFill = $('pw-fill'), elPwNum = $('pw-num'), elPwUse = $('pw-usage');
  var elHud = $('hud'), elSub = $('subtitle'), elHint = $('hint');
  var elCams = $('cams'), elCamTitle = $('cam-title');
  var elQte = $('qte'), elQteWho = $('qte-who'), elQteQ = $('qte-q'),
    elQteA = $('qte-answers'), elQteFill = $('qte-fill');
  var elPerk = $('perk'), elRed = $('fx-red'), elFlash = $('fx-flash');

  /* ---------- сталі ---------- */
  var EYE = { hide: 0.45, sit: 1.02, stand: 1.78 };
  var SEAT = { x: 0, z: -5.95 };
  var NIGHT_SECONDS = 300;                 // 6 ігрових годин
  /* Витрата заряду, % за секунду. Ніч — 300 с.
     Школа тепер темна, тож ліхтар горітиме майже постійно — при старих
     цифрах заряду не вистачало фізично. Розрахунок на типову гру:
       база 0.12 × 300            = 36%
       ліхтар 0.22 × ~130 с       = 29%
       камери 0.16 × ~80 с        = 13%
       ролети 0.26 × ~50 с        = 13%
       -------------------------------
       ≈ 91% — тісно, але виграшно. Світло коридору лишається дорогим. */
  var DRAIN = { base: 0.12, shutter: 0.26, light: 0.22, cams: 0.16, corridor: 0.65 };

  var AGGRO = {
    1: { hlib: 2, titova: 0, kopylov: 0, kopylova: 0, ksan: 0, snow: 0.5 },
    2: { hlib: 4, titova: 2, kopylov: 0, kopylova: 0, ksan: 2, snow: 0.7 },
    3: { hlib: 6, titova: 4, kopylov: 3, kopylova: 3, ksan: 4, snow: 1.0 },
    4: { hlib: 9, titova: 7, kopylov: 6, kopylova: 6, ksan: 7, snow: 1.4 },
    5: { hlib: 12, titova: 10, kopylov: 10, kopylova: 10, ksan: 10, snow: 2.2 },
    6: { hlib: 16, titova: 15, kopylov: 15, kopylova: 15, ksan: 15, snow: 3.2 }
  };

  /* Темп перших ночей. Перша ніч має бути майже порожньою —
     гравець вчиться дивитись і слухати, а не відбиватись.      */
  function paceMul() {
    return G.night <= 1 ? 2.1
      : G.night === 2 ? 1.7
        : G.night === 3 ? 1.35
          : G.night === 4 ? 1.12 : 1;
  }

  /* ---------- голоси ----------
     Ніхто не говорить словами — тільки бурмотіння, у кожного своє.
     Що сказано — читаєш у субтитрах.
     base  — висота голосу
     rate  — темп мовлення
     flat  — монотонність (1 = зовсім без інтонації)
     muffle— глухість, ніби через стіну                              */
  var VOICE = {
    hlib: { base: 138, rate: 1.42, flat: 0.00, muffle: 0 },  // тараторить без пауз
    titova: { base: 82, rate: 0.70, flat: 0.88, muffle: 0 },  // монотонна лекція
    kopylov: { base: 56, rate: 0.60, flat: 0.55, muffle: 0 },  // дуже низько, повільно
    kopylova: { base: 99, rate: 0.62, flat: 0.55, muffle: 0 },
    ksan: { base: 114, rate: 0.96, flat: 0.40, muffle: 0 },  // рівно, спокійно
    kostik: { base: 122, rate: 1.20, flat: 0.10, muffle: 0 },
    nazar: { base: 90, rate: 1.06, flat: 0.15, muffle: 0 },
    phone: { base: 106, rate: 1.10, flat: 0.28, muffle: 1 }   // у слухавці
  };
  function voiceFor(key, extra) {
    var v = VOICE[key] || VOICE.phone;
    var o = { base: v.base, rate: v.rate, flat: v.flat, muffle: v.muffle };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  /* ---------- стан ---------- */
  var G = {
    phase: 'menu',            // menu | play | qte | dead | won
    night: 1,
    t: 0, clock: 0,
    power: 100,
    stance: 'sit',            // sit | stand | hide
    stanceT: 1,               // 0..1 інтерполяція висоти
    flash: false,
    camsUp: false, cam: 0,
    shut: { L: 0, R: 0, B: 0 },      // 0 = відкрито, 1 = закрито
    corridor: { L: 0, R: 0, V: 0 },
    chars: [], helpers: [], snow: null,
    perkReveal: 0, perkImmune: 0, cheat: false,
    yaw: 0, pitch: 0,
    shake: 0, killer: null,
    ambT: 8, heartOn: false, threat: 0, jumpT: 0, allCards: [], ambStopT: null
  };

  /* ---------- three ---------- */
  var renderer, scene, camera, camCam, rt, world, flashlight, ambient, shutters = {}, shakeSeed = 0;
  /* Камери — нічного бачення: у темряві вони бачать те, чого не бачить око.
     Це і робить планшет вартим свого заряду, і пояснює, чому Столову
     видно тільки на CAM 05. */
  var AMB_DARK = 0.085, AMB_CAM = 0.62;
  var PIX = 0.58;

  function initGL() {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x03040a);

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x04050a, 0.082);
    ambient = new T.AmbientLight(0x1b2130, AMB_DARK);
    scene.add(ambient);
    var moon = new T.DirectionalLight(0x93a8c8, 0.085);
    moon.position.set(-6, 12, -20); scene.add(moon);

    camera = new T.PerspectiveCamera(60, 1, 0.05, 90);
    camera.rotation.order = 'YXZ';
    camCam = new T.PerspectiveCamera(78, 4 / 3, 0.05, 70);

    rt = new T.WebGLRenderTarget(320, 240);

    world = W.build(scene);

    // ліхтар
    flashlight = new T.SpotLight(0xffeec4, 0, 34, 0.47, 0.58, 1.10);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.camera.near = 0.3;
    flashlight.shadow.camera.far = 30;
    // джерело виносимо вперед за прилавок, інакше конус б'є у власну стільницю
    flashlight.position.set(0, -0.06, -0.85);
    camera.add(flashlight);
    camera.add(flashlight.target);
    flashlight.target.position.set(0, -0.10, -6);
    scene.add(camera);

    // монітори показують активну камеру
    world.screens.forEach(function (sc) {
      sc.material = new T.MeshBasicMaterial({ map: rt.texture });
    });

    buildShutters();
    resize();
    window.addEventListener('resize', resize);
  }

  function buildShutters() {
    var m = new T.MeshLambertMaterial({ color: 0x3a3d42 });
    /* w — ширина, h — висота прорізу, (x,z) — центр прорізу в плані */
    function roller(w, h, x, z, ry) {
      var g = new T.Group();
      var n = Math.max(4, Math.round(h / 0.175));
      for (var i = 0; i < n; i++) {
        var b = new T.Mesh(new T.BoxGeometry(w, 0.16, 0.09), m);
        b.position.y = -h / 2 + 0.08 + i * (h / n);
        b.castShadow = true; b.receiveShadow = true;
        g.add(b);
      }
      g.userData.closedY = h / 2;          // опущена — перекриває проріз
      g.userData.openY = h + h / 2 + 0.12; // піднята — сховалась у перемичку
      g.position.set(x, g.userData.openY, z);
      if (ry) g.rotation.y = ry;
      scene.add(g);
      return g;
    }
    shutters.L = roller(1.90, 2.10, -2.20, -6.45, Math.PI / 2);
    shutters.R = roller(1.90, 2.10, 2.20, -6.45, Math.PI / 2);
    shutters.B = roller(1.40, 0.82, 0.00, -5.50, 0);      // ґрати вентлаза
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(Math.max(320, w * PIX) | 0, Math.max(240, h * PIX) | 0, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camCam.aspect = w / h; camCam.updateProjectionMatrix();
  }

  /* ---------- персонажі ---------- */
  function initChars() {
    var LANES = [0, 0.62, -0.62, 1.24, -1.24];
    G.chars = C.DEF.map(function (d, i) {
      var c = new C.Char(d, scene);
      c.lane = LANES[i] || 0;          // свій «коридорний ряд», щоб не злипались
      return c;
    });
    G.helpers = C.HELPERS.map(function (d) {
      var o = { def: d, key: d.key, mesh: C.billboard(d.key), t: 0, active: false };
      o.mesh.visible = false; scene.add(o.mesh);
      return o;
    });
    var sm = C.billboard('snow'); sm.visible = false; scene.add(sm);
    G.snow = { mesh: sm, active: false, gaze: 0, t: 0, cool: 40 + Math.random() * 50 };
    G.allCards = G.chars.map(function (c) { return c.mesh; })
      .concat(G.helpers.map(function (h) { return h.mesh; }))
      .concat([sm]);
  }

  /* усі картки завжди повернуті до активної камери */
  function faceCards() {
    var p = G.camsUp ? camCam.position : camera.position;
    for (var i = 0; i < G.allCards.length; i++) {
      var m = G.allCards[i];
      if (m.visible && !m.userData.frozen) C.faceCamera(m, p);
    }
  }

  function charByKey(k) {
    for (var i = 0; i < G.chars.length; i++) if (G.chars[i].key === k) return G.chars[i];
    return null;
  }

  /* ---------- ніч ---------- */
  function startNight(n) {
    if (G.ambStopT) { clearTimeout(G.ambStopT); G.ambStopT = null; }
    S.stopAmbience();                 // гарантовано з нуля, інакше стара ніч глушить нову
    G.night = n; G.t = 0; G.clock = 0; G.power = 100;
    G.stance = 'sit'; G.stanceT = 1; G.flash = false;
    G.camsUp = false; G.cam = 0;
    G.shut = { L: 0, R: 0, B: 0 };
    G.corridor = { L: 0, R: 0, V: 0 };
    G.yaw = 0; G.pitch = 0; G.shake = 0; G.killer = null;
    G.perkReveal = 0; G.perkImmune = 0; G.cheat = false;
    G.ambT = 10 + Math.random() * 10;

    G.chars.forEach(function (c) { c.reset(true); c.cool *= paceMul(); });
    G.allCards.forEach(function (m) {
      m.userData.frozen = false; m.scale.set(1, 1, 1); m.rotation.set(0, 0, 0);
      m.material.emissive.setHex(0x4e4e4e);
    });
    G.helpers.forEach(function (h) { h.active = false; h.mesh.visible = false; h.t = 0; });
    G.snow.active = false; G.snow.mesh.visible = false; G.snow.gaze = 0;
    G.snow.cool = 45 + Math.random() * 60;

    world.lights.forEach(function (l) { l.base = l.baseOn ? 0.17 : 0; });

    hideAll();
    elHud.classList.remove('hidden');
    elNight.textContent = n === 7 ? 'Кастомна ніч' : 'Ніч ' + n;
    setCam(0);
    G.phase = 'play';
    S.startAmbience(n);
    ST.prefetch();
    last = performance.now();
  }

  /* ---------- ШІ ---------- */
  var CUSTOM = { hlib: 10, titova: 10, kopylov: 10, kopylova: 10, ksan: 10, snow: 2 };
  function agg(key) {
    if (G.night === 7) return CUSTOM[key] || 0;      // 7 = кастомна ніч
    return (AGGRO[G.night] || AGGRO[6])[key] || 0;
  }

  function defenseOK(ch) {
    var d = ch.def.defense;
    if (d === 'shutter') {
      var node = ch.route[ch.idx];
      if (node === 'DOOR_L') return G.shut.L > 0.85;
      if (node === 'DOOR_R') return G.shut.R > 0.85;
      if (node === 'DOOR_B') return G.shut.B > 0.85;
      return false;
    }
    if (d === 'hide') return G.stance === 'hide';
    return false;
  }

  function updateChars(dt) {
    G.threat = 0;
    G.chars.forEach(function (ch) {
      var a = agg(ch.key);
      if (a <= 0) { ch.mesh.visible = false; return; }

      if (ch.state === 'idle') {
        ch.cool -= dt * (G.power <= 0 ? 3 : 1);
        if (ch.cool <= 0 && G.perkImmune <= 0) {
          // Копилови виходять парою, синхронно
          if (ch.def.pairWith) {
            var p = charByKey(ch.def.pairWith);
            launch(ch); if (p && p.state === 'idle') launch(p);
          } else if (ch.def.pairOf) {
            var o = charByKey(ch.def.pairOf);
            if (o && o.state !== 'idle') launch(ch); else ch.cool = 2;
          } else launch(ch);
        }
        return;
      }

      if (ch.state === 'stalk') {
        ch.microIdle(G.t);
        // під наглядом майже завмирає — класичне правило FNAF
        ch.wait -= dt * (watched(ch) ? 0.10 : 1) * (G.power <= 0 ? 2.2 : 1);
        if (ch.wait <= 0) {
          var next = ch.route[Math.min(ch.idx + 1, ch.route.length - 1)];
          // місце зайняте — чекаємо, інакше вони злипаються в одну фігуру
          if (!spotFree(ch, next)) {
            ch.blocked = (ch.blocked || 0) + 1;
            if (ch.blocked > 14) { retreat(ch); return; }   // страховка від заклинювання
            ch.wait = 0.5 + Math.random() * 0.7;
            return;
          }
          ch.blocked = 0;
          ch.idx++;
          if (ch.idx >= ch.route.length - 1) {
            ch.snapTo(ch.route[ch.route.length - 1], ch.lane);
            ch.state = 'atDoor';
            ch.windowT = ch.def.window;
            arrive(ch);
          } else {
            ch.snapTo(ch.route[ch.idx], ch.lane);
            ch.wait = stepTime(ch);
            moveSound(ch);
          }
        }
        return;
      }

      if (ch.state === 'atDoor') {
        ch.microIdle(G.t);
        G.threat = 1;
        ch.windowT -= dt;
        if (defenseOK(ch)) { retreat(ch); return; }
        if (ch.windowT <= 0) {
          if (ch.key === 'titova') { askHistory(ch); return; }
          if (ch.key === 'ksan') { askMath(ch); return; }
          kill(ch); return;
        }
      }
    });
  }

  function retreat(ch) {
    ch.reset(false);
    ch.cool = (10 + Math.random() * 12) * (1 - agg(ch.key) * 0.03) * paceMul();
    if (ch.key === 'hlib') { S.shutUp(); showSub(''); }
  }

  /* вивести персонажа на маршрут */
  function launch(ch) {
    ch.spawn();
    ch.wait = stepTime(ch);
    ch.blocked = 0;
  }

  /* ---------- чи вільне місце ----------
     Картки широкі (≈1.4 м), тому двоє в сусідніх вузлах візуально
     злипаються. Вважаємо зайнятим усе, що ближче 1.9 м.          */
  function spotFree(ch, nodeName) {
    var p = C.N[nodeName];
    if (!p) return true;
    var i, o, q;
    for (i = 0; i < G.chars.length; i++) {
      o = G.chars[i];
      if (o === ch || !o.mesh.visible) continue;
      q = o.mesh.position;
      if (Math.hypot(q.x - p[0], q.z - p[1]) < 1.9) return false;
    }
    for (i = 0; i < G.helpers.length; i++) {
      if (!G.helpers[i].active) continue;
      q = G.helpers[i].mesh.position;
      if (Math.hypot(q.x - p[0], q.z - p[1]) < 1.9) return false;
    }
    if (G.snow.active) {
      q = G.snow.mesh.position;
      if (Math.hypot(q.x - p[0], q.z - p[1]) < 1.9) return false;
    }
    return true;
  }

  /* час до наступного стрибка */
  function stepTime(ch) {
    var a = agg(ch.key);
    return ch.def.step / (1 + a * 0.115) * (0.72 + Math.random() * 0.56) * paceMul();
  }

  /* ---------- «на тебе дивляться?» ----------
     Аніматронік не рухається, поки гравець його бачить: наживо
     (стоїть, з ліхтарем чи світлом) або через увімкнену камеру. */
  var _v1 = new T.Vector3(), _v2 = new T.Vector3();
  function watched(ch) {
    if (G.phase !== 'play') return false;
    var p = ch.mesh.position;

    if (G.camsUp) {
      _v1.set(p.x, 1.1, p.z).sub(camCam.position).normalize();
      _v2.set(0, 0, -1).applyQuaternion(camCam.quaternion);
      return _v1.dot(_v2) > 0.70;
    }
    if (G.stance === 'hide') return false;

    var dx = p.x - camera.position.x, dz = p.z - camera.position.z;
    var dist = Math.hypot(dx, dz);
    if (dist > 15) return false;
    var ang = Math.atan2(-dx, -dz);
    var diff = Math.abs(((ang - G.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff > 0.62) return false;
    if (G.stance === 'sit' && p.z < -7.2) return false;   // сидячи далі прорізу не видно
    return G.flash || dist < 4.0 ||
      (p.x < 0 ? G.corridor.L > 0 : G.corridor.R > 0) ||
      (p.z < -9 && G.corridor.V > 0);
  }

  /* звук стрибка — не кроки, а одиничний глухий удар: «щось перемістилось» */
  function moveSound(ch) {
    var p = ch.mesh.position;
    var d = Math.min(1, Math.hypot(p.x - SEAT.x, p.z - SEAT.z) / 17);
    var side = Math.max(-1, Math.min(1, (p.x - SEAT.x) / 6));
    S.sfx.step(d, side);
    if (d < 0.5 && Math.random() < 0.4) S.sfx.knock(side);
  }

  /* ---------- прибув до прорізу ---------- */
  function arrive(ch) {
    var p = ch.mesh.position;
    var side = Math.max(-1, Math.min(1, (p.x - SEAT.x) / 3));
    S.sfx.stinger();
    if (ch.key === 'hlib') {
      var line = ST.mutter();
      showSub('<b>Гліб:</b> ' + line);
      S.say(line, voiceFor('hlib', { volume: 0.9, pan: side, muffle: 0 }));
    } else if (ch.key === 'titova') {
      S.sfx.knock(side);
      var lec = 'Записуємо тему уроку. Тема. Записуємо.';
      showSub('<b>Тітова:</b> ' + lec);
      S.say(lec, voiceFor('titova', { volume: 0.95, pan: side, muffle: 0 }));
    } else if (ch.key === 'ksan') {
      S.sfx.paper();
      var ks = 'Підпишіть роботу. Варіант другий.';
      showSub('<b>Ксан Павлвна:</b> ' + ks);
      S.say(ks, voiceFor('ksan', { volume: 0.85, muffle: 0 }));
    } else {
      var kp = 'Молодий чоловіче. Ви куди.';
      showSub('<b>Копилови:</b> ' + kp);
      S.say(kp, voiceFor(ch.key, { volume: 0.9, pan: side, muffle: 0 }));
    }
  }

  /* ---------- QTE ---------- */
  var qte = null;
  function openQte(who, color, q, answers, correct, seconds, onFail) {
    if (G.cheat) { G.cheat = false; showPerk('ШПАРГАЛКА СПРАЦЮВАЛА', 'Назар усе порахував заздалегідь'); onFail.ch && retreat(onFail.ch); return; }
    G.phase = 'qte';
    qte = { t: seconds, max: seconds, correct: correct, fail: onFail, done: false };
    elQteWho.textContent = who; elQteWho.style.color = color;
    elQteQ.textContent = q;
    elQteA.innerHTML = '';
    answers.forEach(function (a, i) {
      var b = document.createElement('button');
      b.className = 'ans'; b.textContent = a;
      b.onclick = function () { answerQte(i, b); };
      elQteA.appendChild(b);
    });
    elQteFill.style.width = '100%';
    elQte.classList.remove('hidden');
    S.sfx.paper();
  }

  function answerQte(i, btn) {
    if (!qte || qte.done) return;
    qte.done = true;
    if (i === qte.correct) {
      btn.classList.add('good');
      setTimeout(function () {
        elQte.classList.add('hidden');
        G.phase = 'play';
        retreat(qte.fail.ch); qte = null;
      }, 550);
    } else {
      btn.classList.add('bad');
      setTimeout(function () {
        elQte.classList.add('hidden'); qte = null;
        kill(qteChar);
      }, 450);
    }
  }
  var qteChar = null;

  function askHistory(ch) {
    qteChar = ch;
    var q = ST.histQ();
    var opts = q.a.slice(), right = opts[q.c];
    for (var i = opts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    S.say('Усне опитування. ' + q.q, voiceFor('titova', { volume: 1, muffle: 0 }));
    openQte('ТІТОВА · УСНЕ ОПИТУВАННЯ', '#a2417c', q.q, opts, opts.indexOf(right), 6.5, { ch: ch });
  }

  function askMath(ch) {
    qteChar = ch;
    var q = ST.mathQ(G.night);
    openQte('КСАН ПАВЛВНА · САМОСТІЙНА', '#6b6b6b', q.q, q.a, q.c, 7.5, { ch: ch });
  }

  function updateQte(dt) {
    if (!qte || qte.done) return;
    qte.t -= dt;
    elQteFill.style.width = Math.max(0, qte.t / qte.max * 100) + '%';
    if (qte.t <= 0) {
      qte.done = true;
      elQte.classList.add('hidden'); qte = null;
      kill(qteChar);
    }
  }

  /* ---------- помічники ---------- */
  var HELP_NODES = ['C1_M', 'C1_W', 'C2_M', 'C2_E', 'C11_S', 'C22_S', 'CANT_C'];

  function trySpawnHelper(dt) {
    G.helpers.forEach(function (h) {
      if (h.active) {
        h.t -= dt;
          if (h.t <= 0) { h.active = false; h.mesh.visible = false; h.cool = 45 + Math.random() * 50; }
        return;
      }
      h.cool = (h.cool === undefined ? 30 + Math.random() * 40 : h.cool) - dt;
      if (h.cool <= 0) {
        var n = HELP_NODES[(Math.random() * HELP_NODES.length) | 0];
        var p = C.N[n];
        h.mesh.position.set(p[0], h.mesh.userData.baseY, p[1]);
        h.mesh.visible = true; h.active = true; h.t = 24;
      }
    });
  }

  function useHelper(key) {
    var h = null;
    G.helpers.forEach(function (x) { if (x.key === key) h = x; });
    if (!h || !h.active) return;
    h.active = false; h.mesh.visible = false; h.cool = 70 + Math.random() * 60;

    if (key === 'kostik') {
      S.sfx.bell();
      G.chars.forEach(function (c) { if (c.state !== 'idle') retreat(c); });
      G.perkImmune = 20;
      G.power = Math.min(100, G.power + 12);
      showPerk('КОСТІК ЗЛАМАВ ШКІЛЬНЕ РАДІО',
        'Дзвінок на урок. Усі розвернулись і пішли в класи. 20 секунд тиші.');
    } else {
      G.cheat = true; G.perkReveal = 22;
      S.sfx.click();
      showPerk('НАЗАР ПЕРЕДАВ ШПАРГАЛКУ',
        'Наступна самостійна чи опитування — автоматом. І видно, хто де, 22 секунди.');
    }
  }

  /* ---------- сніговик ---------- */
  function updateSnow(dt) {
    var s = G.snow;
    if (!s.active) {
      s.cool -= dt * agg('snow');
      if (s.cool <= 0 && G.stance !== 'hide') {
        var spots = [[-1.65, -6.9], [1.65, -6.9], [-1.7, -5.8], [1.7, -5.8]];
        var p = spots[(Math.random() * spots.length) | 0];
        s.mesh.position.set(p[0], s.mesh.userData.baseY, p[1]);
        s.mesh.rotation.y = Math.atan2(SEAT.x - p[0], SEAT.z - p[1]) + Math.PI;
        s.mesh.visible = true; s.active = true; s.t = 8; s.gaze = 0;
        S.sfx.stinger();
      }
      return;
    }
    s.t -= dt;
    // чи дивиться гравець на нього
    var dx = s.mesh.position.x - camera.position.x, dz = s.mesh.position.z - camera.position.z;
    var ang = Math.atan2(-dx, -dz);
    var diff = Math.abs(((ang - G.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff < 0.42 && !G.camsUp && G.stance !== 'hide') {
      s.gaze += dt;
      elRed.style.opacity = Math.min(0.7, s.gaze / 2.2);
      if (s.gaze > 2.0) { elRed.style.opacity = 0; killSnow(); return; }
    } else {
      s.gaze = Math.max(0, s.gaze - dt * 1.6);
      elRed.style.opacity = Math.min(0.7, s.gaze / 2.2);
    }
    if (s.t <= 0) { s.active = false; s.mesh.visible = false; s.cool = 60 + Math.random() * 70; elRed.style.opacity = 0; }
  }

  function killSnow() {
    G.snow.active = false;
    G.killer = { name: 'СНІГОВИК', key: 'snow', mesh: G.snow.mesh, story: ST.death('snow'), fem: false, pitch: 0.72 };
    doKill();
  }

  /* ---------- смерть ---------- */
  /* висота крику під кожного — Копилови ревуть, Гліб верещить */
  var SCREAM_PITCH = {
    hlib: 1.30, titova: 0.86, kopylov: 0.60, kopylova: 0.92,
    ksan: 1.02, snow: 0.72
  };
  var FEMALE = { titova: true, kopylova: true, ksan: true };

  function kill(ch) {
    if (!ch) return;
    var story, key = ch.key;
    if (key === 'hlib') {
      story = ST.hlibIntro() + '\n\n' + ST.generate();
      ST.prefetch();
    } else {
      story = ST.death(key === 'kopylova' ? 'kopylov' : key);
    }
    G.killer = {
      name: ch.def.name, key: key, mesh: ch.mesh, story: story, voice: key,
      fem: !!FEMALE[key], pitch: SCREAM_PITCH[key] || 1
    };
    doKill();
    setTimeout(function () {
      if (G.phase === 'dead') S.say(story.replace(/\n+/g, ' '), voiceFor(key, { volume: 1, muffle: 0 }));
    }, 2400);
  }

  /* ---------- СКРІМЕР ---------- */
  function doKill() {
    G.phase = 'dead';
    S.stopHeart(); G.heartOn = false;
    S.shutUp();
    S.sfx.scream(G.killer ? G.killer.pitch : 1);
    G.shake = 1.9;
    G.camsUp = false; elCams.classList.add('hidden');
    document.body.classList.remove('camsup');
    elQte.classList.add('hidden');
    elHud.classList.add('hidden');

    var m = G.killer.mesh, key = G.killer.key;
    // картка в позі кидка, впритул до обличчя
    if (key && key !== 'snow') {
      var lt = window.Art.make(key, 'lunge');
      m.material.map = lt;
      m.material.emissiveMap = lt;
      m.material.emissive.setHex(0x8a8a8a);   // скрімер яскравіший
      m.material.needsUpdate = true;
    }
    var h = (m.userData && m.userData.h) || 1.8;
    m.visible = true;
    m.userData.frozen = true;
    m.position.set(SEAT.x, m.userData.baseY, SEAT.z - 0.95);
    m.rotation.set(0, 0, 0);

    camera.position.set(SEAT.x, Math.min(1.55, h * 0.80), SEAT.z);
    G.yaw = 0; G.pitch = (h > 2.2) ? 0.50 : 0.05;
    flashlight.intensity = 4.0;
    elRed.style.opacity = 0.9;

    G.jumpT = 0;
    setTimeout(function () {
      elRed.style.opacity = 0;
      m.userData.frozen = false;
      $('over-title').textContent = G.killer.name + (G.killer.fem ? ' ЗНАЙШЛА ТЕБЕ' : ' ЗНАЙШОВ ТЕБЕ');
      $('over-story').textContent = G.killer.story;
      $('gameover').classList.remove('hidden');
      S.stopAmbience();
    }, 2300);
  }

  /* тремтіння й «ривки» картки під час скрімера */
  function jumpFx(dt) {
    if (!G.killer) return;
    var m = G.killer.mesh;
    G.jumpT += dt;
    // різкі стрибки вперед-назад, як кадрова анімація
    var step = Math.floor(G.jumpT * 14) % 3;
    var d = [0.95, 0.80, 0.88][step];
    m.position.set(SEAT.x + (Math.random() - .5) * 0.05, m.userData.baseY + (Math.random() - .5) * 0.04, SEAT.z - d);
    m.rotation.z = (Math.random() - .5) * 0.10;
    var sc = 1 + Math.sin(G.jumpT * 18) * 0.03;
    m.scale.set(sc, sc, 1);
  }

  /* ---------- перемога ---------- */
  function winNight() {
    G.phase = 'won';
    S.stopHeart(); G.heartOn = false;
    S.shutUp();
    S.sfx.chime6am();
    G.chars.forEach(function (c) { c.reset(true); });
    elHud.classList.add('hidden');
    var done = JSON.parse(localStorage.getItem('n6') || '[]');
    if (done.indexOf(G.night) < 0) { done.push(G.night); localStorage.setItem('n6', JSON.stringify(done)); }
    if (G.night === 7) {
      $('win-title').textContent = 'КАСТОМНУ НІЧ ЗАКРИТО';
      $('win-text').textContent = 'Ти сам виставив їм цифри — і все одно дожив до шостої.\nЦе вже не робота. Це принцип.';
      $('btn-next').textContent = 'У МЕНЮ';
    } else if (G.night === 6) {
      $('win-title').textContent = 'ПОЗАПЛАНОВУ ЗМІНУ ЗАКРИТО';
      $('win-text').textContent = 'О 6:00 будильник не дзвонить — його нікому було ставити.\nТи просто встаєш і йдеш.\n\nВідкрито кастомну ніч.';
      $('btn-next').textContent = 'У МЕНЮ';
    } else if (G.night === 5) {
      $('win-title').textContent = 'ЗМІНУ ЗАКРИТО';
      $('win-text').textContent = 'П\'ять ночей. Ти єдиний охоронець шостої школи, який дожив до вересня.\nЗарплату переказали. Сніговик досі у дворі.\n\nВідкрито шосту ніч.';
      $('btn-next').textContent = 'НІЧ 6';
    } else {
      $('win-title').textContent = 'НІЧ ' + G.night + ' ПРОЙДЕНО';
      $('win-text').textContent = 'Прибиральниця відчиняє двері. Вона питає, чому ти сидиш під столом.\nТи не відповідаєш.';
      $('btn-next').textContent = 'НАСТУПНА НІЧ';
    }
    $('win').classList.remove('hidden');
    G.ambStopT = setTimeout(function () { S.stopAmbience(); }, 3000);
  }

  /* ---------- UI ---------- */
  function showSub(html) {
    elSub.innerHTML = html;
    elSub.classList.toggle('show', !!html);
    if (html) { clearTimeout(showSub._t); showSub._t = setTimeout(function () { elSub.classList.remove('show'); }, 7000); }
  }
  function showPerk(title, sub) {
    elPerk.innerHTML = title + '<small>' + sub + '</small>';
    elPerk.classList.remove('hidden');
    clearTimeout(showPerk._t);
    showPerk._t = setTimeout(function () { elPerk.classList.add('hidden'); }, 4200);
  }
  function showHint(t) {
    elHint.textContent = t; elHint.classList.add('show');
    clearTimeout(showHint._t);
    showHint._t = setTimeout(function () { elHint.classList.remove('show'); }, 1400);
  }
  function hideAll() {
    ['menu', 'howto', 'brief', 'gameover', 'win', 'custom'].forEach(function (i) { $(i).classList.add('hidden'); });
    elCams.classList.add('hidden'); elQte.classList.add('hidden'); elPerk.classList.add('hidden');
  }

  function updateHud() {
    var hr = Math.floor(G.t / NIGHT_SECONDS * 6);
    elClock.textContent = (hr === 0 ? '12' : hr) + ' AM';
    var p = Math.max(0, G.power);
    elPwFill.style.width = p + '%';
    elPwFill.className = p < 15 ? 'crit' : (p < 35 ? 'warn' : '');
    elPwNum.textContent = Math.ceil(p) + '%';
    var u = 1 + (G.shut.L > .5 ? 1 : 0) + (G.shut.R > .5 ? 1 : 0) + (G.shut.B > .5 ? 1 : 0)
      + (G.flash ? 1 : 0) + (G.camsUp ? 1 : 0);
    elPwUse.textContent = new Array(Math.min(u, 7) + 1).join('▮');
    $('buttons').querySelectorAll('.btn').forEach(function (b) {
      var a = b.dataset.act, on = false;
      if (a === 'left') on = G.shut.L > .5; if (a === 'right') on = G.shut.R > .5;
      if (a === 'back') on = G.shut.B > .5; if (a === 'light') on = G.flash;
      if (a === 'hide') on = G.stance === 'hide'; if (a === 'cams') on = G.camsUp;
      if (a === 'peek') on = G.stance === 'stand';
      b.classList.toggle('on', on);
    });
  }

  /* ---------- камери ---------- */
  function setCam(i) {
    G.cam = i;
    var c = W.CAMS[i];
    elCamTitle.textContent = c.id + ' — ' + c.name;
    camCam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    camCam.lookAt(c.look[0], c.look[1], c.look[2]);
    S.sfx.camStatic();
    elCams.querySelectorAll('.cbtn').forEach(function (b, k) { b.classList.toggle('on', k === i); });
  }

  function toggleCams(v) {
    if (G.stance === 'hide') { showHint('ПІД СТОЛОМ НЕ ВИДНО ЕКРАНІВ'); return; }
    G.camsUp = v === undefined ? !G.camsUp : v;
    elCams.classList.toggle('hidden', !G.camsUp);
    document.body.classList.toggle('camsup', G.camsUp);
    S.sfx.camStatic(); S.sfx.click();
    if (G.camsUp) setCam(G.cam);
  }

  function camClick(ev) {
    if (!G.camsUp) return;
    var r = new T.Raycaster();
    var nd = new T.Vector2(ev.clientX / window.innerWidth * 2 - 1, -(ev.clientY / window.innerHeight * 2 - 1));
    r.setFromCamera(nd, camCam);
    var targets = [];
    G.helpers.forEach(function (h) { if (h.active) targets.push(h.mesh); });
    if (!targets.length) return;
    var hit = r.intersectObjects(targets, true);
    if (hit.length) {
      var o = hit[0].object;
      while (o.parent && targets.indexOf(o) < 0) o = o.parent;
      G.helpers.forEach(function (h) { if (h.mesh === o) useHelper(h.key); });
    }
  }

  /* ---------- дії ---------- */
  function toggleShutter(k) {
    if (G.stance === 'hide') { showHint('РУКАМИ НЕ ДІСТАНЕШ'); return; }
    if (G.power <= 0) { showHint('НЕМА ЖИВЛЕННЯ'); return; }
    G.shut[k] = G.shut[k] > 0.5 ? 0 : 1;
    S.sfx.shutter(G.shut[k] > 0.5);
  }
  function toggleFlash() {
    if (G.stance === 'hide') return;
    if (G.power <= 0) { showHint('НЕМА ЖИВЛЕННЯ'); return; }
    G.flash = !G.flash; S.sfx.click();
  }
  function setStance(s) {
    if (G.phase !== 'play') return;
    if (s === 'stand' && G.camsUp) toggleCams(false);
    if (s === 'hide' && G.camsUp) toggleCams(false);
    G.stance = s;
    S.sfx.click();
    if (s === 'hide') { G.flash = false; showHint('ПІД СТОЛОМ'); }
  }
  function corridorLight(k) {
    if (G.power <= 0 || G.stance === 'hide') return;
    G.corridor[k] = 1.1;
    S.sfx.lampFlicker(); S.sfx.click();
  }

  /* ---------- ембієнтні події ----------
     Школа має «жити» сама по собі, інакше тиша між появами читається
     як пауза в грі, а не як напруга. На пізніх ночах події частішають. */
  var AMB = [
    // [вага, функція]
    [34, function () {                                   // Гліб бурмоче десь далеко
      var line = ST.mutter();
      var pan = (Math.random() - 0.5) * 1.7;
      showSub('<b>десь у коридорі:</b> ' + line);
      S.say(line, voiceFor('hlib', { volume: 0.55, muffle: 1, pan: pan }));
      if (Math.random() < 0.32) setTimeout(function () {
        if (G.phase !== 'play') return;
        S.sfx.scream(); S.duck(0.35, 0.2);
        setTimeout(function () { if (G.phase === 'play') S.duck(0.5, 2); }, 1500);
      }, 3200 + Math.random() * 2500);
    }],
    [14, function () { S.sfx.knock(Math.random() < .5 ? -0.8 : 0.8); }],
    [14, function () {                                   // лампа блимає у випадковому місці
      var l = world.lights[(Math.random() * world.lights.length) | 0];
      l.flick = 1.2; S.sfx.lampFlicker();
    }],
    [10, function () { S.sfx.step(0.9, (Math.random() - .5) * 1.8); }],
    [8, function () { S.sfx.pipe(); }],                  // метал у трубах
    [6, function () {                                    // ціла гілка ламп гасне на кілька секунд
      var side = Math.random() < .5 ? -1 : 1;
      var hit = [];
      world.lights.forEach(function (l) {
        if ((l.light.position.x < 0) === (side < 0) && l.base > 0) { l.base = 0; hit.push(l); }
      });
      if (!hit.length) return;
      S.sfx.lampFlicker(); S.sfx.knock(side * 0.9);
      setTimeout(function () {
        hit.forEach(function (l) { l.base = 0.55; l.flick = 1.0; });
        S.sfx.lampFlicker();
      }, 3000 + Math.random() * 4000);
    }],
    [6, function () {                                    // рипить стілець / щось тягнуть по підлозі
      S.sfx.pipe();
      setTimeout(function () { if (G.phase === 'play') S.sfx.step(0.75, (Math.random() - .5) * 1.6); }, 700);
    }],
    [5, function () {                                    // радіоточка ожила на секунду
      showSub('<b>радіоточка:</b> …перевірка звуку. Перевірка. Один, два…');
      S.say('Перевірка звуку. Перевірка. Один, два.',
        voiceFor('phone', { volume: 0.45, muffle: 1, pan: 0.6 }));
      S.sfx.camStatic();
    }],
    [3, function () {                                    // хтось дуже далеко сміється
      S.say('ха ха ха ха', voiceFor('hlib', { volume: 0.3, muffle: 1, rate: 0.8, pan: (Math.random() - .5) * 1.8 }));
    }]
  ];
  var AMB_TOTAL = AMB.reduce(function (s, e) { return s + e[0]; }, 0);

  function ambientEvents(dt) {
    G.ambT -= dt;
    if (G.ambT > 0) return;
    // пізні ночі — щільніше
    var pace = G.night >= 6 ? 0.62 : (G.night >= 4 ? 0.82 : 1);
    G.ambT = (16 + Math.random() * 30) * pace;
    var r = Math.random() * AMB_TOTAL;
    for (var i = 0; i < AMB.length; i++) {
      r -= AMB[i][0];
      if (r <= 0) { AMB[i][1](); return; }
    }
  }

  /* ---------- цикл ---------- */
  var last = performance.now(), rtTick = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    G.t += dt;

    if (G.phase === 'play' || G.phase === 'qte') {
      if (G.phase === 'play') {
        updateChars(dt);
        trySpawnHelper(dt);
        updateSnow(dt);
        ambientEvents(dt);

        // час
        G.clock += dt;
        if (G.clock >= NIGHT_SECONDS) { winNight(); }

        // живлення
        var drain = DRAIN.base
          + (G.shut.L > .5 ? DRAIN.shutter : 0) + (G.shut.R > .5 ? DRAIN.shutter : 0)
          + (G.shut.B > .5 ? DRAIN.shutter : 0)
          + (G.flash ? DRAIN.light : 0) + (G.camsUp ? DRAIN.cams : 0)
          + (G.corridor.L > 0 || G.corridor.R > 0 || G.corridor.V > 0 ? DRAIN.corridor : 0);
        if (G.power > 0) {
          G.power -= drain * dt * (0.85 + G.night * 0.06);
          if (G.power <= 0) blackout();
        }
        // «присутність»: хтось стоїть у прорізі — пульс і червона віньєтка
        if (!G.snow.active) {
          elRed.style.opacity = G.threat > 0 ? (0.26 + Math.sin(G.t * 4.2) * 0.07) : 0;
        }
        if (G.threat > 0 && !G.heartOn) { S.startHeart(); G.heartOn = true; }
        if (G.threat <= 0 && G.heartOn) { S.stopHeart(); G.heartOn = false; }

        G.perkImmune = Math.max(0, G.perkImmune - dt);
        G.perkReveal = Math.max(0, G.perkReveal - dt);
        ['L', 'R', 'V'].forEach(function (k) { G.corridor[k] = Math.max(0, G.corridor[k] - dt); });
      } else updateQte(dt);

      updateHud();
    }

    // штори
    ['L', 'R', 'B'].forEach(function (k) {
      var g = shutters[k];
      var want = G.shut[k] > 0.5 ? g.userData.closedY : g.userData.openY;
      g.position.y += (want - g.position.y) * Math.min(1, dt * 5);
    });

    // світло коридорів
    world.lights.forEach(function (l) {
      var x = l.light.position.x, z = l.light.position.z;
      var zone = (z < -9) ? 'V' : (x < 0 ? 'L' : 'R');
      var boost = G.corridor[zone] > 0 ? 2.1 : 0;
      if (l.flick > 0) { l.flick -= dt * 1.5; }
      var fl = l.flick > 0 ? (Math.random() < 0.4 ? 0 : 1) : 1;
      var v = (l.base + boost) * fl * (G.power > 0 ? 1 : 0);
      l.light.intensity += (v - l.light.intensity) * Math.min(1, dt * 12);
      l.tube.material.color.setScalar(Math.min(1, 0.12 + l.light.intensity * 0.8));
    });
    world.deskLight.intensity = G.power > 0 ? (G.stance === 'hide' ? 0.20 : 0.55) : 0.0;

    // камера гравця
    var targetY = EYE[G.stance];
    camera.position.x += (SEAT.x - camera.position.x) * Math.min(1, dt * 8);
    camera.position.z += (SEAT.z - camera.position.z) * Math.min(1, dt * 8);
    camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 6);

    if (G.phase === 'dead') {
      G.shake = Math.max(0, G.shake - dt * 0.7);
      shakeSeed += dt * 60;
      camera.rotation.y = G.yaw + Math.sin(shakeSeed * 3.1) * G.shake * 0.11;
      camera.rotation.x = G.pitch + Math.cos(shakeSeed * 2.7) * G.shake * 0.09;
      camera.position.y += Math.sin(shakeSeed * 5) * G.shake * 0.025;
      if (G.killer && G.killer.mesh.userData.frozen) jumpFx(dt);
    } else {
      var clamp = G.stance === 'hide' ? 0.55 : 2.05;
      G.yaw = Math.max(-clamp, Math.min(clamp, G.yaw));
      G.pitch = Math.max(-0.75, Math.min(0.65, G.pitch));
      camera.rotation.y = G.yaw;
      camera.rotation.x = G.pitch + (G.stance === 'hide' ? -0.1 : 0);
      var br = G.phase === 'play' ? 0.004 : 0;
      camera.position.y += Math.sin(G.t * 1.6) * br;
    }

    if (ambient) {
      var wantAmb = G.camsUp ? AMB_CAM : AMB_DARK;
      ambient.intensity += (wantAmb - ambient.intensity) * Math.min(1, dt * 9);
    }

    flashlight.intensity += ((G.flash && G.power > 0 && !G.camsUp ? 3.3 : 0) - flashlight.intensity) * Math.min(1, dt * 10);
    // ліхтар у руці — ледь помітно «дихає», інакше пляма мертва
    if (flashlight.intensity > 0.05) {
      flashlight.target.position.x = Math.sin(G.t * 0.7) * 0.10 + Math.sin(G.t * 2.3) * 0.03;
      flashlight.target.position.y = -0.10 + Math.cos(G.t * 0.9) * 0.08;
    }

    // помічників видно навіть у темряві — вони «свої»
    G.helpers.forEach(function (h) {
      if (!h.active) return;
      h.mesh.material.emissive.setHex(0x6a7a3a);   // помічників видно в темряві
    });

    faceCards();

    // рендер фіда камер у текстуру моніторів (екрани ховаємо, щоб не було петлі)
    rtTick += dt;
    if (rtTick > 0.1) {
      rtTick = 0;
      world.screens.forEach(function (s) { s.visible = false; });
      renderer.setRenderTarget(rt);
      renderer.render(scene, camCam);
      renderer.setRenderTarget(null);
      world.screens.forEach(function (s) { s.visible = true; });
    }

    renderer.render(scene, G.camsUp ? camCam : camera);
  }

  function blackout() {
    G.power = 0;
    G.shut = { L: 0, R: 0, B: 0 };
    G.flash = false;
    if (G.camsUp) toggleCams(false);
    S.sfx.shutter(false);
    showHint('ЖИВЛЕННЯ ВИЧЕРПАНО');
    S.duck(0.15, 1.0);
    var h = charByKey('hlib');
    if (h) { h.reset(false); h.cool = 6 + Math.random() * 8; }
  }

  /* ---------- керування ---------- */
  var dragging = false, lx = 0, ly = 0, locked = false;

  function initInput() {
    canvas.addEventListener('mousedown', function (e) {
      if (G.phase !== 'play') return;
      if (e.button === 2) { setStance('stand'); return; }
      dragging = true; lx = e.clientX; ly = e.clientY;
      if (!locked && canvas.requestPointerLock && window.top === window.self) {
        try { var pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(function () { }); }
        catch (err) { }
      }
    });
    window.addEventListener('mouseup', function (e) {
      dragging = false;
      if (e.button === 2 && G.stance === 'stand') setStance('sit');
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('pointerlockchange', function () { locked = document.pointerLockElement === canvas; });

    window.addEventListener('mousemove', function (e) {
      if (G.phase !== 'play' || G.camsUp) return;
      if (locked) { G.yaw -= e.movementX * 0.0022; G.pitch -= e.movementY * 0.0018; }
      else if (dragging) {
        G.yaw -= (e.clientX - lx) * 0.004; G.pitch -= (e.clientY - ly) * 0.003;
        lx = e.clientX; ly = e.clientY;
      }
    });

    elCams.addEventListener('click', camClick);
    elCams.querySelectorAll('.cbtn').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); setCam(+b.dataset.cam); });
    });

    $('buttons').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.btn') : null;
      if (!b) return;
      act(b.dataset.act);
    });

    window.addEventListener('keydown', function (e) {
      if (G.phase === 'qte') return;
      if (G.phase !== 'play') return;
      var k = e.key.toLowerCase();
      if (k === 'q' || k === 'й') act('left');
      else if (k === 'e' || k === 'у') act('right');
      else if (k === 'r' || k === 'к') act('back');
      else if (k === 'f' || k === 'а') act('light');
      else if (k === 'v' || k === 'м') act('peek');
      else if (k === ' ') { e.preventDefault(); act('hide'); }
      else if (k === 'tab' || k === 'c' || k === 'с') { e.preventDefault(); act('cams'); }
      else if (k >= '1' && k <= '6') {
        if (G.camsUp) setCam(+k - 1);
        else if (k === '1') corridorLight('L');
        else if (k === '2') corridorLight('R');
        else if (k === '3') corridorLight('V');
      }
      else if (k === 'a' || k === 'arrowleft') G.yaw += 0.22;
      else if (k === 'd' || k === 'arrowright') G.yaw -= 0.22;
    });
  }

  function act(a) {
    if (G.phase !== 'play') return;
    if (a === 'left') toggleShutter('L');
    else if (a === 'right') toggleShutter('R');
    else if (a === 'back') toggleShutter('B');
    else if (a === 'light') toggleFlash();
    else if (a === 'cams') toggleCams();
    else if (a === 'hide') setStance(G.stance === 'hide' ? 'sit' : 'hide');
    else if (a === 'peek') setStance(G.stance === 'stand' ? 'sit' : 'stand');
  }

  /* ---------- меню ---------- */
  function paintNights() {
    var done = JSON.parse(localStorage.getItem('n6') || '[]');
    var w = $('menu-nights'); w.innerHTML = '';
    for (var i = 1; i <= 6; i++) {
      var d = document.createElement('div');
      d.className = 'nb' + (done.indexOf(i) >= 0 ? ' done' : '');
      d.textContent = i; w.appendChild(d);
    }
    var next = 1; while (done.indexOf(next) >= 0 && next < 5) next++;
    var first5 = done.indexOf(1) >= 0 && done.indexOf(2) >= 0 && done.indexOf(3) >= 0 &&
      done.indexOf(4) >= 0 && done.indexOf(5) >= 0;
    $('btn-cont').classList.toggle('hidden', done.length === 0 || first5);
    $('btn-cont').textContent = 'ПРОДОВЖИТИ · НІЧ ' + next;
    $('btn-cont').dataset.night = next;
    // 6-та ніч відкривається після п'яти пройдених, кастомна — після шостої
    $('btn-n6').classList.toggle('hidden', !first5);
    $('btn-custom').classList.toggle('hidden', done.indexOf(6) < 0);
  }

  /* ---------- кастомна ніч ---------- */
  var CUST_NAMES = {
    hlib: 'ГЛІБ', titova: 'ТІТОВА', kopylov: 'КОПИЛОВ',
    kopylova: 'КОПИЛОВА', ksan: 'КСАН ПАВЛВНА', snow: 'СНІГОВИК'
  };
  function buildCustom() {
    var box = $('cust-rows');
    if (box.childElementCount) return;
    Object.keys(CUST_NAMES).forEach(function (k) {
      var row = document.createElement('div');
      row.className = 'crow';
      var max = k === 'snow' ? 5 : 20;
      row.innerHTML = '<div class="cname">' + CUST_NAMES[k] + '</div>' +
        '<input type="range" min="0" max="' + max + '" value="' + CUSTOM[k] + '" data-k="' + k + '">' +
        '<div class="cval">' + CUSTOM[k] + '</div>';
      var inp = row.querySelector('input'), val = row.querySelector('.cval');
      inp.addEventListener('input', function () {
        CUSTOM[k] = +inp.value;
        val.textContent = inp.value;
        row.classList.toggle('max', +inp.value >= max);
        S.sfx.click();
      });
      row.classList.toggle('max', CUSTOM[k] >= max);
      box.appendChild(row);
    });
    $('custom').querySelectorAll('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = +b.dataset.p;
        box.querySelectorAll('.crow').forEach(function (row) {
          var inp = row.querySelector('input');
          inp.value = Math.min(p, +inp.max);
          inp.dispatchEvent(new Event('input'));
        });
      });
    });
  }

  function goBrief(n) {
    hideAll();
    elHud.classList.add('hidden');
    $('brief-text').textContent = ST.brief(n);
    $('brief').classList.remove('hidden');
    $('btn-brief').dataset.night = n;
    S.init();
    setTimeout(function () { S.say(ST.brief(n).replace(/\n+/g, ' '), voiceFor('phone', { volume: 0.85 })); }, 400);
  }

  function initMenu() {
    paintNights();
    $('btn-play').onclick = function () { S.init(); goBrief(1); };
    $('btn-cont').onclick = function () { S.init(); goBrief(+$('btn-cont').dataset.night || 1); };
    $('btn-n6').onclick = function () { S.init(); goBrief(6); };
    $('btn-custom').onclick = function () {
      S.init(); buildCustom();
      $('menu').classList.add('hidden'); $('custom').classList.remove('hidden');
    };
    $('btn-cust-go').onclick = function () {
      $('custom').classList.add('hidden');
      S.shutUp(); startNight(7);
    };
    $('btn-cust-back').onclick = function () {
      $('custom').classList.add('hidden'); $('menu').classList.remove('hidden');
    };
    $('btn-how').onclick = function () { $('menu').classList.add('hidden'); $('howto').classList.remove('hidden'); };
    $('btn-back').onclick = function () { $('howto').classList.add('hidden'); $('menu').classList.remove('hidden'); };
    $('btn-brief').onclick = function () { S.shutUp(); startNight(+$('btn-brief').dataset.night || 1); };
    $('btn-retry').onclick = function () { S.shutUp(); startNight(G.night); };
    $('btn-menu').onclick = function () { S.shutUp(); S.stopAmbience(); hideAll(); paintNights(); $('menu').classList.remove('hidden'); };
    $('btn-next').onclick = function () {
      S.shutUp();
      if (G.night === 5) { goBrief(6); }
      else if (G.night >= 6) { S.stopAmbience(); hideAll(); paintNights(); $('menu').classList.remove('hidden'); }
      else goBrief(G.night + 1);
    };
  }

  /* ---------- старт ---------- */
  function boot() {
    initGL();
    window.__G = G; window.__kill = kill;
    initChars();
    initInput();
    initMenu();
    camera.position.set(SEAT.x, EYE.sit, SEAT.z);
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
