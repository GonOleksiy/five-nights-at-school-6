/* ============================================================
   world.js — геометрія ЗОШ №6 за планом + стіл-рецепція охорони
   ============================================================ */
(function (global) {
  'use strict';

  var T = global.THREE;

  /* ---------- процедурні текстури ---------- */
  function tex(w, h, draw, rep) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }

  function grime(base, spots, dark) {
    return function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < spots; i++) {
        var x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 26;
        g.globalAlpha = 0.02 + Math.random() * 0.07;
        g.fillStyle = Math.random() < .6 ? dark : '#ffffff';
        g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
    };
  }

  /* дрібне зерно поверх будь-якої текстури */
  function speckle(g, w, h, n, cols, aMin, aMax, rMax) {
    for (var i = 0; i < n; i++) {
      g.globalAlpha = aMin + Math.random() * (aMax - aMin);
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h,
        0.5 + Math.random() * rMax, 0.5 + Math.random() * rMax, Math.random() * 3, 0, 6.3);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  /* тріщини / патьоки */
  function cracks(g, w, h, n, col, len) {
    g.strokeStyle = col;
    for (var i = 0; i < n; i++) {
      var x = Math.random() * w, y = Math.random() * h;
      g.globalAlpha = 0.10 + Math.random() * 0.25;
      g.lineWidth = 0.5 + Math.random() * 1.2;
      g.beginPath(); g.moveTo(x, y);
      for (var k = 0; k < 5; k++) {
        x += (Math.random() - 0.5) * len; y += (Math.random() - 0.2) * len;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  var TEX = {};
  function initTex() {
    /* --- панель, пофарбована олійною фарбою (шкільний «низ») --- */
    TEX.wallLow = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#46523f'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 900, ['#3a4534', '#525f4a', '#2e382a'], 0.04, 0.16, 9);
      for (var i = 0; i < 60; i++) {                       // патьоки валика
        g.globalAlpha = 0.03 + Math.random() * 0.06;
        g.fillStyle = Math.random() < .5 ? '#5d6b55' : '#333d2f';
        g.fillRect(Math.random() * w, 0, 1 + Math.random() * 7, h);
      }
      g.globalAlpha = 1;
      for (var k = 0; k < 26; k++) {                        // відколи до штукатурки
        g.fillStyle = 'rgba(176,168,150,' + (0.25 + Math.random() * 0.4) + ')';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 1 + Math.random() * 4,
          Math.random() * 3, 0, 6.3);
        g.fill();
      }
      cracks(g, w, h, 10, '#242c20', 12);
      var gr = g.createLinearGradient(0, 0, 0, h);          // блиск олійної фарби
      gr.addColorStop(0, 'rgba(255,255,230,0.07)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.20)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, [8, 2]);

    /* --- побілка (верх стіни) --- */
    TEX.wallUp = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#b9b09b'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 700, ['#a79e89', '#c9c1ad', '#8f8874'], 0.05, 0.18, 12);
      for (var i = 0; i < 9; i++) {                         // патьоки вологи згори
        var x = Math.random() * w;
        var gg = g.createLinearGradient(x, 0, x, h * (0.3 + Math.random() * 0.5));
        gg.addColorStop(0, 'rgba(120,108,86,0.30)');
        gg.addColorStop(1, 'rgba(120,108,86,0)');
        g.fillStyle = gg;
        g.fillRect(x - 12, 0, 24 + Math.random() * 30, h);
      }
      cracks(g, w, h, 16, '#7a7260', 16);
      for (var k = 0; k < 12; k++) {                        // осипалось
        g.fillStyle = 'rgba(150,140,120,' + (0.15 + Math.random() * 0.25) + ')';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 14, 2 + Math.random() * 10,
          Math.random() * 3, 0, 6.3);
        g.fill();
      }
    }, [8, 2]);

    /* --- лінолеум у шашку, затертий --- */
    TEX.floor = tex(256, 256, function (g, w, h) {
      var cell = 64;
      for (var yy = 0; yy < h; yy += cell) {
        for (var xx = 0; xx < w; xx += cell) {
          var odd = ((xx / cell) + (yy / cell)) % 2;
          g.fillStyle = odd ? '#5a3f33' : '#6b4d3e';
          g.fillRect(xx, yy, cell, cell);
        }
      }
      speckle(g, w, h, 2600, ['#7d5c49', '#452f26', '#8a6a52', '#33221b'], 0.10, 0.35, 2.2);
      g.strokeStyle = 'rgba(20,12,9,0.55)'; g.lineWidth = 2;
      for (var s = 0; s <= w; s += cell) {                  // шви
        g.beginPath(); g.moveTo(s, 0); g.lineTo(s, h); g.stroke();
        g.beginPath(); g.moveTo(0, s); g.lineTo(w, s); g.stroke();
      }
      for (var i = 0; i < 40; i++) {                        // дуги від швабри
        g.globalAlpha = 0.03 + Math.random() * 0.07;
        g.strokeStyle = Math.random() < .5 ? '#a2846c' : '#2b1d16';
        g.lineWidth = 2 + Math.random() * 10;
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 90,
          Math.random() * 6.3, Math.random() * 6.3);
        g.stroke();
      }
      g.globalAlpha = 1;
      cracks(g, w, h, 6, '#231710', 20);
    }, [10, 7]);

    /* --- стеля: плити з сіткою й плямами протікання --- */
    TEX.ceil = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#5a564e'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 900, ['#4c483f', '#67625a', '#403c35'], 0.06, 0.2, 7);
      g.strokeStyle = 'rgba(28,26,22,0.6)'; g.lineWidth = 3;
      for (var s = 0; s <= w; s += 128) {
        g.beginPath(); g.moveTo(s, 0); g.lineTo(s, h); g.stroke();
        g.beginPath(); g.moveTo(0, s); g.lineTo(w, s); g.stroke();
      }
      for (var i = 0; i < 5; i++) {
        var x = Math.random() * w, y = Math.random() * h;
        var gr2 = g.createRadialGradient(x, y, 2, x, y, 20 + Math.random() * 50);
        gr2.addColorStop(0, 'rgba(120,96,50,0.35)');
        gr2.addColorStop(1, 'rgba(120,96,50,0)');
        g.fillStyle = gr2;
        g.beginPath(); g.arc(x, y, 70, 0, 6.3); g.fill();
      }
    }, [12, 9]);

    /* --- бук стола охорони --- */
    TEX.wood = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#c2a070'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 180; i++) {                       // волокна
        g.globalAlpha = .04 + Math.random() * .13;
        g.strokeStyle = Math.random() < .5 ? '#8a6336' : '#ddc196';
        g.lineWidth = .4 + Math.random() * 2.4;
        var y = Math.random() * h;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(w * .3, y + (Math.random() - .5) * 14,
          w * .6, y + (Math.random() - .5) * 14, w, y + (Math.random() - .5) * 6);
        g.stroke();
      }
      g.globalAlpha = 1;
      for (var k = 0; k < 3; k++) {                         // сучки
        var kx = Math.random() * w, ky = Math.random() * h;
        for (var r2 = 14; r2 > 0; r2 -= 2.5) {
          g.globalAlpha = 0.12;
          g.strokeStyle = '#7a5730'; g.lineWidth = 1.4;
          g.beginPath(); g.ellipse(kx, ky, r2, r2 * 0.62, 0.6, 0, 6.3); g.stroke();
        }
      }
      g.globalAlpha = 1;
      speckle(g, w, h, 300, ['#a8854f', '#e2caa2'], 0.03, 0.09, 3);
    }, [2, 2]);
  }

  /* ---------- матеріали ---------- */
  var M = {};
  function initMat() {
    M.wallLow = new T.MeshLambertMaterial({ map: TEX.wallLow });
    M.wallUp = new T.MeshLambertMaterial({ map: TEX.wallUp });
    M.floor = new T.MeshLambertMaterial({ map: TEX.floor });
    M.ceil = new T.MeshLambertMaterial({ map: TEX.ceil });
    M.wood = new T.MeshLambertMaterial({ map: TEX.wood });
    M.woodDark = new T.MeshLambertMaterial({ color: 0x8a6b45 });
    M.metal = new T.MeshLambertMaterial({ color: 0x44464a });
    M.dark = new T.MeshLambertMaterial({ color: 0x1b1c1f });
    M.door = new T.MeshLambertMaterial({ color: 0x6d3a2e });
    M.glass = new T.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.12 });
    M.frame = new T.MeshLambertMaterial({ color: 0x2f3134 });
    M.screen = new T.MeshBasicMaterial({ color: 0x0b1a0d });
    M.paper = new T.MeshLambertMaterial({ color: 0xd8d2c0 });
  }

  /* ---------- примітиви ---------- */
  function box(w, h, d, mat, x, y, z, ry) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if (ry) m.rotation.y = ry;
    return m;
  }

  /* стіна між двома точками в плані, з нижньою панеллю */
  function wall(g, x1, z1, x2, z2, h, t) {
    h = h || 3.0; t = t || 0.16;
    var dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    if (len < 0.01) return;
    var ang = Math.atan2(dx, dz) + Math.PI / 2;
    var cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    var lowH = 1.45;
    var lo = box(len, lowH, t, M.wallLow, cx, lowH / 2, cz, -ang);
    var up = box(len, h - lowH, t, M.wallUp, cx, lowH + (h - lowH) / 2, cz, -ang);
    lo.receiveShadow = up.receiveShadow = true;
    g.add(lo); g.add(up);
  }

  /* скло у прорізі */
  function glassPanel(g, x1, z1, x2, z2, y0, y1) {
    var dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    var ang = Math.atan2(dx, dz) + Math.PI / 2;
    var cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    g.add(box(len, y1 - y0, 0.04, M.glass, cx, (y0 + y1) / 2, cz, -ang));
    g.add(box(len, 0.08, 0.1, M.frame, cx, y0, cz, -ang));
    g.add(box(len, 0.08, 0.1, M.frame, cx, y1, cz, -ang));
    var n = Math.max(1, Math.round(len / 1.3));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      g.add(box(0.07, y1 - y0, 0.1, M.frame, x1 + dx * t, (y0 + y1) / 2, z1 + dz * t, -ang));
    }
  }

  /* ---------- СТІЛ ОХОРОНИ (за фото: кутова рецепція, світлий бук) ---------- */
  /* Контур прилавка (локально, обличчям у -Z). Кутові грані як на фото. */
  var DESK_PATH = [
    [-1.80, 0.10], [-1.18, -0.24], [-0.56, -0.50],
    [0.56, -0.50], [1.18, -0.24], [1.80, 0.10]
  ];
  var DESK = {
    bodyH: 1.12,      // висота корпусу
    capY: 1.18,      // стільниця-прилавок
    privY: 1.50,      // верхня глуха панель (через неї сидячи не видно)
    workY: 0.74,      // внутрішня робоча поверхня
    back: 0.78       // задня глибина
  };

  function buildDesk() {
    var g = new T.Group();
    var P = DESK_PATH, i;

    function seg(a, b, y0, y1, mat, thick) {
      var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      var ang = Math.atan2(dx, dz) + Math.PI / 2;
      var m = box(len, y1 - y0, thick || 0.06, mat,
        (a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2, -ang);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }

    // передні грані корпусу
    for (i = 0; i < P.length - 1; i++) g.add(seg(P[i], P[i + 1], 0, DESK.bodyH, M.wood, 0.07));
    // стільниця-прилавок (виступає назовні)
    for (i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1];
      var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      var ang = Math.atan2(dx, dz) + Math.PI / 2;
      var nx = Math.cos(ang) * 0.0, nz = 0;
      var cap = box(len + 0.05, 0.055, 0.30, M.woodDark,
        (a[0] + b[0]) / 2 - Math.sin(ang + Math.PI / 2) * 0.06,
        DESK.capY,
        (a[1] + b[1]) / 2 - Math.cos(ang + Math.PI / 2) * 0.06, -ang);
      g.add(cap);
      // глуха надбудова — саме вона закриває огляд сидячи
      g.add(seg(a, b, DESK.capY + 0.03, DESK.privY, M.wood, 0.05));
      var top = box(len + 0.04, 0.05, 0.16, M.woodDark,
        (a[0] + b[0]) / 2, DESK.privY + 0.025, (a[1] + b[1]) / 2, -ang);
      g.add(top);
    }

    // бічні поворотні крила (до стіни)
    g.add(box(0.07, 0.88, DESK.back + 0.2, M.wood, -1.80, 0.44, 0.10 + (DESK.back + 0.2) / 2 - 0.1));
    g.add(box(0.07, 0.88, DESK.back + 0.2, M.wood, 1.80, 0.44, 0.10 + (DESK.back + 0.2) / 2 - 0.1));

    // внутрішня робоча поверхня (стіл під моніторами)
    var wsz = new T.Mesh(new T.BoxGeometry(3.45, 0.05, 0.62), M.woodDark);
    wsz.position.set(0, DESK.workY, -0.12); wsz.receiveShadow = true; g.add(wsz);
    // тумба праворуч (щоб ніша під столом була ліворуч-по центру)
    g.add(box(0.55, DESK.workY - 0.06, 0.58, M.wood, 1.42, (DESK.workY - 0.06) / 2, -0.12));
    // бічна тумба ліворуч
    g.add(box(0.5, DESK.workY - 0.06, 0.58, M.wood, -1.48, (DESK.workY - 0.06) / 2, -0.12));
    // задня стінка ніші — темна, щоб під столом було чорно
    g.add(box(2.4, DESK.workY, 0.05, M.dark, 0, DESK.workY / 2, 0.16));

    // ---- монітори (3 шт., як на пульті охорони) ----
    var screens = [];
    function monitor(x, z, ry, w, h) {
      var mg = new T.Group();
      mg.add(box(w + 0.05, h + 0.05, 0.05, M.frame, 0, h / 2 + 0.16, 0));
      mg.add(box(0.1, 0.16, 0.1, M.frame, 0, 0.08, 0.02));
      mg.add(box(0.28, 0.03, 0.2, M.frame, 0, 0.015, 0.02));
      var sc = new T.Mesh(new T.PlaneGeometry(w, h), M.screen.clone());
      sc.position.set(0, h / 2 + 0.16, 0.030);
      mg.add(sc); screens.push(sc);
      mg.position.set(x, DESK.workY + 0.025, z);
      mg.rotation.y = ry;
      return mg;
    }
    g.add(monitor(-0.74, -0.28, 0.34, 0.50, 0.33));
    g.add(monitor(0.00, -0.34, 0.00, 0.66, 0.42));   // центральний — головний фід
    g.add(monitor(0.74, -0.28, -0.34, 0.50, 0.33));

    // ---- дріб'язок ----
    g.add(box(0.44, 0.02, 0.17, M.dark, 0, DESK.workY + 0.035, 0.03));        // клавіатура
    g.add(box(0.07, 0.025, 0.11, M.dark, 0.30, DESK.workY + 0.04, 0.03));     // миша
    var mug = new T.Mesh(new T.CylinderGeometry(0.045, 0.04, 0.1, 10), M.paper);
    mug.position.set(-0.52, DESK.workY + 0.075, 0.02); g.add(mug);
    var jrn = box(0.3, 0.03, 0.22, M.paper, 0.62, DESK.workY + 0.04, 0.02, 0.18);
    g.add(jrn);
    // настільна лампа
    var base = new T.Mesh(new T.CylinderGeometry(0.075, 0.085, 0.022, 12), M.metal);
    base.position.set(-1.34, DESK.workY + 0.036, -0.06); g.add(base);
    var lampArm = box(0.022, 0.30, 0.022, M.metal, -1.34, DESK.workY + 0.19, -0.06);
    lampArm.rotation.z = -0.12; g.add(lampArm);
    var lampHead = new T.Mesh(new T.ConeGeometry(0.075, 0.09, 10), M.metal);
    lampHead.position.set(-1.30, DESK.workY + 0.345, -0.09);
    lampHead.rotation.x = 0.55; g.add(lampHead);

    // ---- стілець охоронця ----
    var ch = new T.Group();
    ch.add(box(0.46, 0.06, 0.44, M.dark, 0, 0.46, 0));
    ch.add(box(0.44, 0.5, 0.06, M.dark, 0, 0.74, 0.21));
    ch.add(box(0.07, 0.42, 0.07, M.metal, 0, 0.22, 0));
    for (var k = 0; k < 5; k++) {
      var an = k / 5 * Math.PI * 2;
      ch.add(box(0.26, 0.04, 0.05, M.metal, Math.sin(an) * 0.13, 0.04, Math.cos(an) * 0.13, an));
    }
    ch.position.set(0, 0, 0.74);
    g.add(ch);

    g.userData.screens = screens;
    return g;
  }

  /* ---------- світло коридорів ---------- */
  function lamp(g, x, z, lights, on) {
    var body = box(1.2, 0.09, 0.22, M.metal, x, 2.86, z);
    g.add(body);
    var tube = new T.Mesh(new T.BoxGeometry(1.1, 0.05, 0.14),
      new T.MeshBasicMaterial({ color: 0x232323 }));
    tube.position.set(x, 2.80, z); g.add(tube);
    var pl = new T.PointLight(0xbfd0c0, 0, 9, 2);
    pl.position.set(x, 2.6, z);
    g.add(pl);
    lights.push({ light: pl, tube: tube, base: on ? 0.55 : 0, flick: 0 });
  }

  /* ============================================================ */
  function build(scene) {
    initTex(); initMat();
    var g = new T.Group(); scene.add(g);
    var lights = [];

    var X0 = -15.5, X1 = 15.5, Z0 = -8.8, Z1 = 9.2;      // зовнішній контур
    var CX0 = -11.5, CX1 = 11.5, CZ0 = -5.5;              // Столова
    var VX0 = -3.7, VX1 = 3.7, VZ = -12.5;                // Вхід (тамбур)
    var OX0 = -2.2, OX1 = 2.2, OZ = -7.40;                // ніша охорони (в КОРИДОРІ)

    /* --- підлога / стеля --- */
    function slab(x0, z0, x1, z1, y, mat, up) {
      var m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), mat);
      m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      m.receiveShadow = true; g.add(m);
    }
    slab(X0, Z0, X1, Z1, 0, M.floor, true);
    slab(VX0, VZ, VX1, Z0, 0, M.floor, true);
    slab(X0, Z0, X1, Z1, 3.0, M.ceil, false);
    slab(VX0, VZ, VX1, Z0, 3.0, M.ceil, false);

    /* --- зовнішні стіни --- */
    wall(g, X0, Z0, VX0, Z0, 3.0, 0.3);
    wall(g, VX1, Z0, X1, Z0, 3.0, 0.3);
    wall(g, X0, Z1, X1, Z1, 3.0, 0.3);
    wall(g, X0, Z0, X0, Z1, 3.0, 0.3);
    wall(g, X1, Z0, X1, Z1, 3.0, 0.3);

    /* --- тамбур входу --- */
    wall(g, VX0, VZ, VX0, Z0, 3.0, 0.25);
    wall(g, VX1, VZ, VX1, Z0, 3.0, 0.25);
    wall(g, VX0, VZ, 0.6, VZ, 3.0, 0.25);                 // вулична стіна
    var street = box(2.4, 2.35, 0.12, M.door, 1.8, 1.175, VZ);   // ВХІДНІ ДВЕРІ (червоні)
    g.add(street);
    // внутрішня стіна тамбура: двері ліворуч + панорамне скло праворуч
    wall(g, VX0, Z0, -3.3, Z0, 3.0, 0.25);
    var innerDoor = box(2.5, 2.35, 0.12, M.door, -2.05, 1.175, Z0); g.add(innerDoor);
    wall(g, -0.8, Z0, 0.4, Z0, 3.0, 0.25);
    glassPanel(g, 0.4, Z0, 3.5, Z0, 0.95, 2.45);          // СИНЄ: панорамне скло
    wall(g, 0.4, Z0 + 0.0, 3.5, Z0 + 0.0, 0.95, 0.25);    // підвіконня
    wall(g, 3.5, Z0, VX1, Z0, 3.0, 0.25);

    /* --- Столова --- */
    wall(g, CX0, CZ0, OX0, CZ0, 3.0);
    wall(g, OX1, CZ0, CX1, CZ0, 3.0);
    wall(g, CX0, CZ0, CX0, 0.4, 3.0);                     // зах. стіна + проріз
    wall(g, CX0, 3.0, CX0, Z1, 3.0);
    g.add(box(0.12, 2.3, 2.6, M.door, CX0, 1.15, 1.7));   // червоні двері зах.
    wall(g, CX1, CZ0, CX1, 0.4, 3.0);
    wall(g, CX1, 3.0, CX1, Z1, 3.0);
    g.add(box(0.12, 2.3, 2.6, M.door, CX1, 1.15, 1.7));   // червоні двері сх.

    /* --- ніша охорони --- */
    // бічні стіни = ДВЕРНІ ПРОРІЗИ (сюди вони заходять). Лишаємо тільки перемички.
    [OX0, OX1].forEach(function (sx) {
      g.add(box(0.14, 0.45, CZ0 - OZ, M.wallUp, sx, 2.32, (OZ + CZ0) / 2));   // перемичка
      g.add(box(0.2, 2.1, 0.12, M.frame, sx, 1.05, OZ + 0.06));               // одвірок
      g.add(box(0.2, 2.1, 0.12, M.frame, sx, 1.05, CZ0 - 0.06));
    });
    // фронт ніші: глуха низом, панорамне скло зверху (видно тільки стоячи)
    wall(g, OX0, OZ, -0.95, OZ, 2.55, 0.14);
    glassPanel(g, -0.95, OZ, 0.95, OZ, 1.52, 2.40);
    wall(g, 0.95, OZ, OX1, OZ, 2.55, 0.14);
    g.add(box(1.9, 1.52, 0.14, M.wallLow, 0, 0.76, OZ));                      // підвіконня фронту
    // задня стіна ніші — ГЛУХА (Столову видно тільки на камері),
    // знизу лишається вентиляційний лаз 1.4 × 0.8 м
    wall(g, OX0, CZ0, -0.70, CZ0, 2.55, 0.14);
    wall(g, 0.70, CZ0, OX1, CZ0, 2.55, 0.14);
    g.add(box(1.40, 1.75, 0.14, M.wallUp, 0, 1.675, CZ0));   // над лазом
    g.add(box(1.52, 0.09, 0.18, M.frame, 0, 0.82, CZ0));     // перемичка лаза
    // темний короб за лазом — крізь нього Столової не видно
    g.add(box(1.40, 0.82, 0.05, M.dark, 0, 0.41, CZ0 + 0.55));
    g.add(box(0.05, 0.82, 0.55, M.dark, -0.70, 0.41, CZ0 + 0.28));
    g.add(box(0.05, 0.82, 0.55, M.dark, 0.70, 0.41, CZ0 + 0.28));
    g.add(box(1.40, 0.05, 0.55, M.dark, 0, 0.82, CZ0 + 0.28));
    slab(OX0, OZ, OX1, CZ0, 2.55, M.ceil, false);
    // світло в ніші — тьмяна лампа над головою
    var deskLight = new T.PointLight(0xffd9a0, 0.9, 5.5, 2);
    deskLight.position.set(0, 2.3, -6.4); g.add(deskLight);
    g.add(box(0.5, 0.06, 0.2, M.metal, 0, 2.45, -6.4));

    /* --- сходи на 2-й поверх (жовте) --- */
    function stairs(x, z, dir) {
      var sg = new T.Group();
      for (var i = 0; i < 7; i++)
        sg.add(box(1.5, 0.18, 0.3, M.wallLow, 0, 0.09 + i * 0.18, -i * 0.3));
      sg.position.set(x, 0, z); sg.rotation.y = dir;
      g.add(sg);
      var dl = new T.PointLight(0x2a3a4a, 0.25, 6, 2);
      dl.position.set(x, 1.6, z); g.add(dl);
    }
    stairs(X0 + 0.9, -7.2, Math.PI / 2);
    stairs(X0 + 0.9, 1.4, Math.PI / 2);
    stairs(X1 - 0.9, -7.2, -Math.PI / 2);
    stairs(X1 - 0.9, 1.4, -Math.PI / 2);

    /* --- меблі Столової --- */
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 5; c++) {
        var tx = -8.4 + c * 4.2, tz = -3.4 + r * 3.1;
        var tt = box(1.5, 0.07, 0.75, M.woodDark, tx, 0.74, tz); g.add(tt);
        [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(function (p) {
          g.add(box(0.06, 0.74, 0.06, M.metal, tx + p[0], 0.37, tz + p[1]));
        });
        g.add(box(0.38, 0.04, 0.38, M.woodDark, tx - 0.5, 0.45, tz + 0.75));
        g.add(box(0.38, 0.04, 0.38, M.woodDark, tx + 0.5, 0.45, tz - 0.75));
      }
    }
    /* шафки в коридорах */
    for (var i2 = 0; i2 < 9; i2++) {
      g.add(box(0.8, 1.9, 0.42, M.woodDark, -13.8 + i2 * 1.0, 0.95, -8.45));
      g.add(box(0.8, 1.9, 0.42, M.woodDark, 5.6 + i2 * 1.0, 0.95, -8.45));
    }
    /* радіатори */
    for (var i3 = 0; i3 < 6; i3++) {
      g.add(box(0.9, 0.55, 0.12, M.metal, -15.2, 0.5, -4.0 + i3 * 2.2, Math.PI / 2));
      g.add(box(0.9, 0.55, 0.12, M.metal, 15.2, 0.5, -4.0 + i3 * 2.2, Math.PI / 2));
    }
    /* дошка оголошень + портрети — щоб коридор не був пустий */
    for (var i4 = 0; i4 < 5; i4++) {
      g.add(box(0.7, 0.9, 0.04, M.paper, -9 + i4 * 4.4, 1.9, -8.55));
    }

    /* --- лампи --- */
    lamp(g, -11, -8.05, lights, true);
    lamp(g, -5.5, -8.05, lights, false);
    lamp(g, 5.5, -8.05, lights, false);
    lamp(g, 11, -8.05, lights, true);
    lamp(g, -13.5, -1.5, lights, false);
    lamp(g, -13.5, 5.0, lights, false);
    lamp(g, 13.5, -1.5, lights, false);
    lamp(g, 13.5, 5.0, lights, false);
    lamp(g, -5, 1.5, lights, false);
    lamp(g, 5, 1.5, lights, false);
    lamp(g, 0, -10.6, lights, true);   // тамбур

    /* --- вулиця за дверима --- */
    var st = new T.Mesh(new T.PlaneGeometry(40, 30), new T.MeshLambertMaterial({ color: 0x14161a }));
    st.rotation.x = -Math.PI / 2; st.position.set(0, -0.02, -26); g.add(st);
    var lampPost = new T.PointLight(0xffb066, 1.3, 26, 1.6);
    lampPost.position.set(4.5, 4.2, -18); g.add(lampPost);
    g.add(box(0.2, 5, 0.2, M.metal, 4.5, 2.5, -18));

    /* --- стіл охорони --- */
    var desk = buildDesk();
    desk.position.set(0, 0, -6.55);
    g.add(desk);

    return {
      group: g,
      lights: lights,
      desk: desk,
      screens: desk.userData.screens,
      deskLight: deskLight,
      mat: M,
      DESK: DESK
    };
  }

  /* ---------- точки камер спостереження ---------- */
  var CAMS = [
    { id: 'CAM 01', name: 'КОРИДОР 1', pos: [-13.6, 2.55, -8.1], look: [2, 1.2, -6.6] },
    { id: 'CAM 02', name: 'КОРИДОР 2', pos: [13.6, 2.55, -8.1], look: [-2, 1.2, -6.6] },
    { id: 'CAM 03', name: 'КОРИДОР 1.1', pos: [-13.4, 2.55, 7.9], look: [-13.4, 1.0, -5.0] },
    { id: 'CAM 04', name: 'КОРИДОР 2.2', pos: [13.4, 2.55, 7.9], look: [13.4, 1.0, -5.0] },
    { id: 'CAM 05', name: 'СТОЛОВА', pos: [-10.2, 2.7, 8.2], look: [3, 0.9, -4.0] },
    { id: 'CAM 06', name: 'ВХІД / ВУЛИЦЯ', pos: [-3.1, 2.5, -12.0], look: [2.0, 1.2, -8.5] }
  ];

  global.World = { build: build, CAMS: CAMS, DESK_PATH: DESK_PATH };

})(window);
