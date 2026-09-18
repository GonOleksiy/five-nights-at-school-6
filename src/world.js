/* ============================================================
   world.js — геометрія ЗОШ №6 за планом + стіл-рецепція охорони
   ============================================================ */
(function (global) {
  'use strict';

  var T = global.THREE;

  /* ---------- процедурні текстури ---------- */
  /* Анізотропія. Підлога й стіни в коридорі видні майже вздовж, а без
     неї мипмапи перетворюють їх на мило вже за кілька метрів. Значення
     приходить із рендерера (game.js), бо тільки він знає межу заліза. */
  var ANISO = 1;

  function tex(w, h, draw, rep) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = ANISO;
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
    /* --- панель, пофарбована олійною фарбою (шкільний «низ») ---
       512 замість 256: удвічі більше текселів на метр, і кількість
       деталей піднято так само — інакше це просто розтягнутий шум. */
    TEX.wallLow = tex(512, 512, function (g, w, h) {
      g.fillStyle = '#46523f'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 3600, ['#3a4534', '#525f4a', '#2e382a'], 0.04, 0.16, 18);
      for (var i = 0; i < 120; i++) {                       // патьоки валика
        g.globalAlpha = 0.03 + Math.random() * 0.06;
        g.fillStyle = Math.random() < .5 ? '#5d6b55' : '#333d2f';
        g.fillRect(Math.random() * w, 0, 2 + Math.random() * 14, h);
      }
      g.globalAlpha = 1;
      for (var k = 0; k < 104; k++) {                       // відколи до штукатурки
        g.fillStyle = 'rgba(176,168,150,' + (0.25 + Math.random() * 0.4) + ')';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 2 + Math.random() * 8,
          Math.random() * 3, 0, 6.3);
        g.fill();
      }
      cracks(g, w, h, 22, '#242c20', 24);
      var gr = g.createLinearGradient(0, 0, 0, h);          // блиск олійної фарби
      gr.addColorStop(0, 'rgba(255,255,230,0.07)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.20)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, [8, 2]);

    /* --- побілка (верх стіни) --- */
    TEX.wallUp = tex(512, 512, function (g, w, h) {
      g.fillStyle = '#b9b09b'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 2800, ['#a79e89', '#c9c1ad', '#8f8874'], 0.05, 0.18, 24);
      for (var i = 0; i < 18; i++) {                        // патьоки вологи згори
        var x = Math.random() * w;
        var gg = g.createLinearGradient(x, 0, x, h * (0.3 + Math.random() * 0.5));
        gg.addColorStop(0, 'rgba(120,108,86,0.30)');
        gg.addColorStop(1, 'rgba(120,108,86,0)');
        g.fillStyle = gg;
        g.fillRect(x - 24, 0, 48 + Math.random() * 60, h);
      }
      cracks(g, w, h, 34, '#7a7260', 32);
      for (var k = 0; k < 48; k++) {                        // осипалось
        g.fillStyle = 'rgba(150,140,120,' + (0.15 + Math.random() * 0.25) + ')';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 28, 4 + Math.random() * 20,
          Math.random() * 3, 0, 6.3);
        g.fill();
      }
    }, [8, 2]);

    /* --- лінолеум у шашку, затертий --- */
    TEX.floor = tex(512, 512, function (g, w, h) {
      var cell = w / 4;                                    // 4 плитки на повтор
      for (var yy = 0; yy < h; yy += cell) {
        for (var xx = 0; xx < w; xx += cell) {
          var odd = ((xx / cell) + (yy / cell)) % 2;
          g.fillStyle = odd ? '#5a3f33' : '#6b4d3e';
          g.fillRect(xx, yy, cell, cell);
        }
      }
      speckle(g, w, h, 10400, ['#7d5c49', '#452f26', '#8a6a52', '#33221b'], 0.10, 0.35, 4.4);
      g.strokeStyle = 'rgba(20,12,9,0.55)'; g.lineWidth = 4;
      for (var s = 0; s <= w; s += cell) {                  // шви
        g.beginPath(); g.moveTo(s, 0); g.lineTo(s, h); g.stroke();
        g.beginPath(); g.moveTo(0, s); g.lineTo(w, s); g.stroke();
      }
      for (var i = 0; i < 80; i++) {                        // дуги від швабри
        g.globalAlpha = 0.03 + Math.random() * 0.07;
        g.strokeStyle = Math.random() < .5 ? '#a2846c' : '#2b1d16';
        g.lineWidth = 4 + Math.random() * 20;
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 180,
          Math.random() * 6.3, Math.random() * 6.3);
        g.stroke();
      }
      g.globalAlpha = 1;
      cracks(g, w, h, 13, '#231710', 40);
    }, [10, 7]);

    /* --- стеля: плити з сіткою й плямами протікання --- */
    TEX.ceil = tex(512, 512, function (g, w, h) {
      g.fillStyle = '#5a564e'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 3600, ['#4c483f', '#67625a', '#403c35'], 0.06, 0.2, 14);
      g.strokeStyle = 'rgba(28,26,22,0.6)'; g.lineWidth = 6;
      for (var s = 0; s <= w; s += w / 2) {                 // дві плити на повтор
        g.beginPath(); g.moveTo(s, 0); g.lineTo(s, h); g.stroke();
        g.beginPath(); g.moveTo(0, s); g.lineTo(w, s); g.stroke();
      }
      for (var i = 0; i < 10; i++) {                        // плями протікання
        var x = Math.random() * w, y = Math.random() * h;
        var gr2 = g.createRadialGradient(x, y, 4, x, y, 40 + Math.random() * 100);
        gr2.addColorStop(0, 'rgba(120,96,50,0.35)');
        gr2.addColorStop(1, 'rgba(120,96,50,0)');
        g.fillStyle = gr2;
        g.beginPath(); g.arc(x, y, 140, 0, 6.3); g.fill();
      }
    }, [12, 9]);

    /* --- бук стола охорони ---
       Плитка = 0.55 м у світі (див. TILE). Тому волокна тут дрібні:
       раніше текстура розтягувалась на всю грань і виходили широкі смуги. */
    TEX.wood = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#b39471'; g.fillRect(0, 0, w, h);
      // м'який поздовжній перепад тону, щоб плитка не читалась як плитка
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,240,215,0.10)');
      gr.addColorStop(0.45, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(70,45,22,0.12)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) {                       // волокна
        g.globalAlpha = .025 + Math.random() * .07;
        g.strokeStyle = Math.random() < .5 ? '#8a6336' : '#d9c09a';
        g.lineWidth = .35 + Math.random() * 1.1;
        var y = Math.random() * h;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(w * .3, y + (Math.random() - .5) * 5,
          w * .6, y + (Math.random() - .5) * 5, w, y + (Math.random() - .5) * 2.5);
        g.stroke();
      }
      g.globalAlpha = 1;
      for (var k = 0; k < 2; k++) {                         // сучки
        var kx = Math.random() * w, ky = Math.random() * h;
        for (var r2 = 9; r2 > 0; r2 -= 2.0) {
          g.globalAlpha = 0.09;
          g.strokeStyle = '#7a5730'; g.lineWidth = 1.1;
          g.beginPath(); g.ellipse(kx, ky, r2, r2 * 0.58, 0.6, 0, 6.3); g.stroke();
        }
      }
      g.globalAlpha = 1;
      speckle(g, w, h, 220, ['#a8854f', '#cdb28c'], 0.02, 0.05, 2);
    });

    /* --- шкільне оголошення: пожовклий папір із друком ---
       Чистий білий аркуш навпроти вікна вахти вигорав у ліхтарі
       суцільною білою плямою. Тепер це папір з текстом і плямами. */
    TEX.notice = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#8e8874'; g.fillRect(0, 0, w, h);
      for (var s = 0; s < 7; s++) {                         // плями від вологи
        var x0 = Math.random() * w, y0 = Math.random() * h;
        var rg = g.createRadialGradient(x0, y0, 2, x0, y0, 20 + Math.random() * 45);
        rg.addColorStop(0, 'rgba(120,102,62,0.28)');
        rg.addColorStop(1, 'rgba(120,102,62,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x0, y0, 70, 0, 6.3); g.fill();
      }
      g.fillStyle = '#3b3830';
      g.fillRect(38, 26, w - 76, 9);                        // заголовок
      g.fillRect(64, 42, w - 128, 5);
      for (var i = 0; i < 16; i++) {                        // рядки тексту
        g.globalAlpha = 0.55 + Math.random() * 0.3;
        g.fillRect(30, 70 + i * 10, (w - 76) * (0.45 + Math.random() * 0.5), 3);
      }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(60,56,48,0.5)'; g.lineWidth = 2;
      g.strokeRect(14, 12, w - 28, h - 24);
      g.strokeStyle = 'rgba(80,40,40,0.35)'; g.lineWidth = 3; // печатка
      g.beginPath(); g.arc(w - 58, h - 50, 26, 0, 6.3); g.stroke();
      speckle(g, w, h, 260, ['#7c7663', '#a49b85'], 0.05, 0.16, 2);
    });

    /* --- дверцята шкільної шафки: фарбований метал, дві стулки --- */
    TEX.lockDoor = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#3f5b56'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 700, ['#365049', '#4a6a63', '#2c403b'], 0.05, 0.18, 7);
      // шов між стулками + рамки
      g.strokeStyle = 'rgba(14,20,19,0.85)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      g.lineWidth = 2;
      [0, 1].forEach(function (s) {
        var x0 = s * w / 2 + 8, ww = w / 2 - 16;
        g.strokeRect(x0, 10, ww, h - 20);
        // жалюзі вентиляції вгорі
        g.fillStyle = 'rgba(10,15,14,0.75)';
        for (var v = 0; v < 5; v++) g.fillRect(x0 + ww * 0.22, 26 + v * 10, ww * 0.56, 4);
        // номерок
        g.fillStyle = 'rgba(212,206,186,0.80)';
        g.fillRect(x0 + ww * 0.32, 96, ww * 0.36, 20);
        g.fillStyle = '#20282a';
        g.fillRect(x0 + ww * 0.39, 102, ww * 0.06, 9);
        g.fillRect(x0 + ww * 0.50, 102, ww * 0.06, 9);
        // ручка-скоба й личинка замка
        g.fillStyle = '#8d8e86';
        g.fillRect(x0 + ww * (s ? 0.10 : 0.78), h * 0.52, ww * 0.12, 26);
        g.fillStyle = '#20282a';
        g.beginPath(); g.arc(x0 + ww * (s ? 0.16 : 0.84), h * 0.62, 4, 0, 6.3); g.fill();
      });
      // подряпини й відколи фарби
      for (var i = 0; i < 34; i++) {
        g.globalAlpha = 0.10 + Math.random() * 0.25;
        g.fillStyle = Math.random() < 0.5 ? '#9aa39b' : '#1d2724';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1 + Math.random() * 3,
          Math.random() * 3, 0, 6.3);
        g.fill();
      }
      g.globalAlpha = 1;
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,230,0.05)');
      gr.addColorStop(1, 'rgba(0,0,0,0.30)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });

    /* --- двері класу: одна стулка --- */
    TEX.door1 = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#6d3a2e'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 420, ['#7d4536', '#5b2f25', '#8b5140'], 0.05, 0.16, 8);
      g.fillStyle = 'rgba(150,170,160,0.28)';
      g.fillRect(34, 24, w - 68, 76);
      g.strokeStyle = 'rgba(28,14,10,0.85)'; g.lineWidth = 4;
      g.strokeRect(34, 24, w - 68, 76);
      g.strokeRect(34, 118, w - 68, 54);
      g.strokeRect(34, 186, w - 68, 50);
      g.fillStyle = '#9a9384'; g.fillRect(w - 44, 132, 14, 30);   // ручка
      g.fillStyle = 'rgba(20,12,10,0.8)';
      g.beginPath(); g.arc(w - 37, 172, 4, 0, 6.3); g.fill();     // замок
      for (var i = 0; i < 16; i++) {
        g.globalAlpha = 0.08 + Math.random() * 0.2;
        g.fillStyle = Math.random() < 0.5 ? '#c09a84' : '#2a1510';
        g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 8, 1 + Math.random() * 3);
      }
      g.globalAlpha = 1;
    });

    /* --- шкільні двері: фарбоване дерево, фільонки, скло вгорі --- */
    TEX.door = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#6d3a2e'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 500, ['#7d4536', '#5b2f25', '#8b5140'], 0.05, 0.16, 8);
      g.strokeStyle = 'rgba(28,14,10,0.9)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      [0, 1].forEach(function (s) {
        var x0 = s * w / 2;
        // матове скло у верхній третині
        g.fillStyle = 'rgba(150,170,160,0.30)';
        g.fillRect(x0 + 18, 22, w / 2 - 36, 74);
        g.strokeStyle = 'rgba(28,14,10,0.85)'; g.lineWidth = 3;
        g.strokeRect(x0 + 18, 22, w / 2 - 36, 74);
        // фільонки
        g.strokeRect(x0 + 18, 112, w / 2 - 36, 54);
        g.strokeRect(x0 + 18, 178, w / 2 - 36, 60);
        // ручка
        g.fillStyle = '#9a9384';
        g.fillRect(x0 + (s ? 14 : w / 2 - 26), 132, 12, 26);
      });
      for (var i = 0; i < 20; i++) {                       // потертості
        g.globalAlpha = 0.08 + Math.random() * 0.2;
        g.fillStyle = Math.random() < 0.5 ? '#c09a84' : '#2a1510';
        g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 9, 1 + Math.random() * 3);
      }
      g.globalAlpha = 1;
    });

    /* --- пошарпаний лінолеум робочої поверхні --- */
    TEX.deskTop = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#4b4741'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 1400, ['#5d574e', '#3a362f', '#6a6157'], 0.10, 0.34, 2.0);
      for (var i = 0; i < 26; i++) {                        // подряпини
        g.globalAlpha = 0.05 + Math.random() * 0.10;
        g.strokeStyle = '#8c8578'; g.lineWidth = 0.5 + Math.random();
        var x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3,
          L = 12 + Math.random() * 60;
        g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
      }
      g.globalAlpha = 1;
      for (var k = 0; k < 5; k++) {                         // сліди від чашок
        g.globalAlpha = 0.07;
        g.strokeStyle = '#2b2721'; g.lineWidth = 2.2;
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 11 + Math.random() * 7, 0, 6.3);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
  }

  /* ============================================================
     UV У СВІТОВИХ МЕТРАХ
     Одна текстура на деталях різного розміру виглядає як різні
     матеріали, якщо кожна грань отримує рівно одну плитку. Тому
     UV перераховуються під фізичний розмір грані.
     ============================================================ */
  var TILE = 0.55;

  function uvScale(geo, s) {
    var uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
    uv.needsUpdate = true;
    return geo;
  }

  /* грані BoxGeometry ідуть у порядку +X −X +Y −Y +Z −Z */
  function uvBox(geo, w, h, d, tile) {
    var t = tile || TILE, uv = geo.attributes.uv;
    var f = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (var i = 0; i < 6; i++) {
      var su = f[i][0] / t, sv = f[i][1] / t;
      for (var k = 0; k < 4; k++) {
        var j = i * 4 + k;
        uv.setXY(j, uv.getX(j) * su, uv.getY(j) * sv);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  /* коробка з правильними UV */
  function wbox(w, h, d, mat, x, y, z, ry, tile) {
    var m = new T.Mesh(uvBox(new T.BoxGeometry(w, h, d), w, h, d, tile), mat);
    m.position.set(x, y, z); if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* контур, зсунутий «всередину» (у бік +Z) на d; кути зрізаються митрою,
     тому сусідні грані сходяться, а не налазять одна на одну */
  function inset(pts, d) {
    function nrm(a, b) {
      var tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
      return [tz / L, -tx / L];
    }
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var n1 = i > 0 ? nrm(pts[i - 1], pts[i]) : null;
      var n2 = i < pts.length - 1 ? nrm(pts[i], pts[i + 1]) : null;
      var nx, nz, sc = 1;
      if (n1 && n2) {
        nx = n1[0] + n2[0]; nz = n1[1] + n2[1];
        var L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
        var dot = nx * n1[0] + nz * n1[1];
        sc = dot > 0.25 ? 1 / dot : 1;
      } else { var n = n1 || n2; nx = n[0]; nz = n[1]; }
      out.push([pts[i][0] - nx * d * sc, pts[i][1] - nz * d * sc]);
    }
    return out;
  }

  function polyShape(pts) {
    var s = new T.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  }

  /* горизонтальна плита за контуром у плані, від y0 до y1 —
     одна суцільна сітка замість купи коробок, що перетинаються */
  function slabShape(pts, y0, y1, mat, tile) {
    var geo = new T.ExtrudeGeometry(polyShape(pts),
      { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
    uvScale(geo, 1 / (tile || TILE));
    geo.rotateX(Math.PI / 2);
    geo.translate(0, y1, 0);
    var m = new T.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* замкнене кільце: зовнішній контур + внутрішній, зсунутий на th */
  function ringSlab(pts, th, y0, y1, mat, tile) {
    var inn = inset(pts, th), poly = pts.slice();
    for (var i = inn.length - 1; i >= 0; i--) poly.push(inn[i]);
    return slabShape(poly, y0, y1, mat, tile);
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
    /* стіл вахти: один малюнок дерева, три тони — світлий корпус,
       темніша окантовка прилавка, зовсім темний цоколь */
    M.dWood = new T.MeshLambertMaterial({ map: TEX.wood });
    M.dWoodEdge = new T.MeshLambertMaterial({ map: TEX.wood, color: 0x8c7050 });
    M.dWoodFoot = new T.MeshLambertMaterial({ map: TEX.wood, color: 0x5d4c39 });
    M.dTop = new T.MeshLambertMaterial({ map: TEX.deskTop });
    M.rubber = new T.MeshLambertMaterial({ color: 0x24262a });
    M.metal = new T.MeshLambertMaterial({ color: 0x44464a });
    M.dark = new T.MeshLambertMaterial({ color: 0x1b1c1f });
    M.door = new T.MeshLambertMaterial({ map: TEX.door });
    M.doorEdge = new T.MeshLambertMaterial({ color: 0x4e2920 });
    M.door1 = new T.MeshLambertMaterial({ map: TEX.door1 });
    M.lockDoor = new T.MeshLambertMaterial({ map: TEX.lockDoor });
    M.lockSide = new T.MeshLambertMaterial({ color: 0x33463f });
    M.lockTop = new T.MeshLambertMaterial({ color: 0x28332e });
    M.radi = new T.MeshLambertMaterial({ color: 0x8e948a });
    /* ніч за шибкою: світиться сама, бо світло крізь неї не рахується */
    M.nightGlass = new T.MeshBasicMaterial({ color: 0x1b2739 });
    M.glass = new T.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.12 });
    M.frame = new T.MeshLambertMaterial({ color: 0x2f3134 });
    M.screen = new T.MeshBasicMaterial({ color: 0x0b1a0d });
    M.paper = new T.MeshLambertMaterial({ color: 0xbdb7a4 });
    M.notice = new T.MeshLambertMaterial({ map: TEX.notice });
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
    /* Рейка на стику панелі й побілки. Без неї два кольори сходились
       голим швом, і стіна читалась як дві наліплені смуги. */
    if (len > 0.5) {
      var rail = box(len, 0.06, t + 0.04, M.woodDark, cx, lowH + 0.015, cz, -ang);
      rail.receiveShadow = true;
      g.add(rail);
    }
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

  /* ============================================================
     СТІЛ ВАХТИ — місце, де сидить гравець
     Локальні координати: обличчям у −Z, нуль — центр прилавка.
     Гравець сидить позаду, у +Z (SEAT у game.js).
     Правило складання: деталі СТИКАЮТЬСЯ або ховаються одна в одній
     на сантиметр, але ніде не лежать двома поверхнями впритул —
     інакше в русі вони блимають одна крізь одну.
     ============================================================ */
  var DESK_PATH = [
    [-1.80, 0.10], [-1.18, -0.24], [-0.56, -0.50],
    [0.56, -0.50], [1.18, -0.24], [1.80, 0.10]
  ];
  var DESK = {
    bodyH: 1.13,     // корпус прилавка
    capY: 1.185,    // окантовка згори
    workY: 0.74,     // робоча поверхня
    backZ: 0.42,     // задній край стільниці (до гравця)
    kneeY: 0.70
  };

  function buildDesk() {
    var g = new T.Group();
    var P = DESK_PATH, i;
    var WY = DESK.workY;

    /* ---------- прилавок ---------- */
    g.add(ringSlab(inset(P, -0.012), 0.10, 0.0, 0.085, M.dWoodFoot));       // цоколь
    g.add(ringSlab(P, 0.085, 0.085, DESK.bodyH, M.dWood));                  // корпус
    g.add(ringSlab(inset(P, -0.035), 0.155, DESK.bodyH, DESK.capY, M.dWoodEdge)); // окантовка

    /* бічні крила до стін ніші */
    [-1, 1].forEach(function (s) {
      g.add(wbox(0.085, DESK.bodyH - 0.085, 0.66, M.dWood,
        s * 1.7575, 0.085 + (DESK.bodyH - 0.085) / 2, 0.43));
      g.add(wbox(0.155, DESK.capY - DESK.bodyH, 0.66, M.dWoodEdge,
        s * 1.7575, (DESK.bodyH + DESK.capY) / 2, 0.43));
    });

    /* ---------- стільниця ----------
       Один багатокутник: внутрішня лінія прилавка + прямий задній край.
       Раніше тут лежала пряма коробка, і її кути проходили крізь
       похилі грані прилавка. */
    var wIn = inset(P, 0.06);
    var poly = wIn.slice();
    poly.push([wIn[wIn.length - 1][0], DESK.backZ]);
    poly.push([wIn[0][0], DESK.backZ]);
    g.add(slabShape(poly, WY - 0.045, WY, M.dTop, 0.70));
    // гумовий кант заднього краю
    var wL = wIn[0][0], wR = wIn[wIn.length - 1][0];
    g.add(wbox(wR - wL, 0.05, 0.028, M.rubber, (wL + wR) / 2, WY - 0.021, DESK.backZ + 0.012));

    /* ---------- тумби й коліна ---------- */
    [-1.42, 1.42].forEach(function (x) {
      g.add(wbox(0.44, WY - 0.09, 0.46, M.dWood, x, 0.045 + (WY - 0.09) / 2, 0.17));
      g.add(wbox(0.46, 0.045, 0.48, M.dWoodFoot, x, 0.0225, 0.17));         // цоколь тумби
      // три шухляди — лицьові планки з ручками
      for (i = 0; i < 3; i++) {
        var dy = 0.17 + i * 0.19;
        g.add(wbox(0.40, 0.165, 0.02, M.dWoodEdge, x, dy, 0.395));
        g.add(wbox(0.13, 0.016, 0.02, M.metal, x, dy + 0.055, 0.408));
      }
    });
    // глуха панель перед колінами: під столом має бути темно
    g.add(wbox(2.34, DESK.kneeY, 0.04, M.dark, 0, DESK.kneeY / 2, -0.02));
    // полиця під стільницею + кабель-канал
    g.add(wbox(1.9, 0.03, 0.22, M.dark, 0, WY - 0.20, 0.30));
    g.add(wbox(1.5, 0.05, 0.07, M.rubber, 0, WY - 0.095, 0.36));

    /* ---------- монітори ---------- */
    var screens = [];
    function monitor(x, z, ry, w, h) {
      var mg = new T.Group();
      var cy = h / 2 + 0.185;
      mg.add(wbox(w + 0.045, h + 0.045, 0.035, M.frame, 0, cy, 0, 0, 0.3));  // рамка
      mg.add(wbox(w + 0.02, h + 0.02, 0.05, M.dark, 0, cy, -0.028, 0, 0.3)); // корпус ззаду
      mg.add(wbox(0.085, 0.20, 0.075, M.frame, 0, 0.09, 0.015, 0, 0.3));     // ніжка
      mg.add(wbox(0.26, 0.022, 0.19, M.frame, 0, 0.011, 0.015, 0, 0.3));     // підставка
      var sc = new T.Mesh(new T.PlaneGeometry(w, h), M.screen.clone());
      sc.position.set(0, cy, 0.019);
      mg.add(sc); screens.push(sc);
      // шлейф від монітора вниз, за стільницю
      var cb = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 0.26, 5), M.rubber);
      cb.position.set(0.05, 0.13, -0.06); cb.rotation.x = 0.4; mg.add(cb);
      mg.position.set(x, WY, z);
      mg.rotation.y = ry;
      return mg;
    }
    g.add(monitor(-0.76, -0.20, 0.32, 0.50, 0.33));
    g.add(monitor(0.00, -0.26, 0.00, 0.66, 0.42));   // центральний — головний фід
    g.add(monitor(0.76, -0.20, -0.32, 0.50, 0.33));

    /* ---------- дрібниця на стільниці ---------- */
    var TY = WY + 0.001;
    // килимок, клавіатура, миша
    g.add(wbox(0.52, 0.004, 0.24, M.rubber, -0.02, TY, 0.12, 0, 0.3));
    g.add(wbox(0.44, 0.022, 0.16, M.dark, -0.02, TY + 0.013, 0.12, 0.03, 0.3));
    g.add(wbox(0.20, 0.004, 0.17, M.rubber, 0.36, TY, 0.13, 0, 0.3));
    var mouse = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), M.dark);
    mouse.scale.set(0.75, 0.42, 1.15); mouse.position.set(0.36, TY + 0.019, 0.13);
    g.add(mouse);
    // кружка з ручкою
    var mug = new T.Mesh(new T.CylinderGeometry(0.043, 0.038, 0.095, 12), M.paper);
    mug.position.set(-0.60, TY + 0.048, 0.20); g.add(mug);
    var handle = new T.Mesh(new T.TorusGeometry(0.030, 0.007, 5, 10, Math.PI * 1.1), M.paper);
    handle.position.set(-0.645, TY + 0.050, 0.20);
    handle.rotation.y = Math.PI / 2; handle.rotation.z = -0.4; g.add(handle);
    // склянка з ручками
    var cup = new T.Mesh(new T.CylinderGeometry(0.038, 0.032, 0.10, 10), M.metal);
    cup.position.set(0.62, TY + 0.05, 0.05); g.add(cup);
    [[0.01, 0.2], [-0.015, -0.3], [0.02, 0.05]].forEach(function (p) {
      var pen = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.16, 5),
        new T.MeshLambertMaterial({ color: p[1] > 0 ? 0x1f4f8c : 0x8c2118 }));
      pen.position.set(0.62 + p[0], TY + 0.11, 0.05 + p[1] * 0.04);
      pen.rotation.z = p[1] * 0.5; g.add(pen);
    });
    // журнал чергувань, розгорнутий
    var jrn = wbox(0.34, 0.028, 0.25, M.paper, -1.00, TY + 0.014, 0.12, 0.14, 0.3);
    g.add(jrn);
    g.add(wbox(0.36, 0.012, 0.27, M.woodDark, -1.00, TY + 0.005, 0.12, 0.14, 0.3));
    // стос паперів
    g.add(wbox(0.21, 0.035, 0.29, M.paper, 0.98, TY + 0.018, 0.22, -0.10, 0.3));
    // телефон
    g.add(wbox(0.20, 0.055, 0.15, M.dark, 1.36, TY + 0.028, 0.16, 0.22, 0.3));
    g.add(wbox(0.17, 0.045, 0.055, M.dark, 1.345, TY + 0.075, 0.115, 0.22, 0.3));
    var cord = new T.Mesh(new T.TorusGeometry(0.05, 0.006, 4, 10), M.dark);
    cord.position.set(1.36, TY + 0.006, 0.30); cord.rotation.x = Math.PI / 2; g.add(cord);
    // чайник
    var kettle = new T.Mesh(new T.CylinderGeometry(0.072, 0.082, 0.17, 12), M.metal);
    kettle.position.set(-1.40, TY + 0.085, 0.22); g.add(kettle);
    g.add(wbox(0.16, 0.012, 0.16, M.dark, -1.40, TY + 0.176, 0.22, 0, 0.3));
    g.add(wbox(0.028, 0.085, 0.028, M.dark, -1.30, TY + 0.085, 0.22, 0.4, 0.3));

    /* настільна лампа */
    var base = new T.Mesh(new T.CylinderGeometry(0.072, 0.082, 0.020, 14), M.metal);
    base.position.set(-1.30, TY + 0.010, -0.05); g.add(base);
    var arm = wbox(0.020, 0.30, 0.020, M.metal, -1.285, TY + 0.165, -0.06, 0, 0.3);
    arm.rotation.z = -0.14; g.add(arm);
    var head = new T.Mesh(new T.ConeGeometry(0.072, 0.085, 12, 1, true), M.metal);
    head.position.set(-1.245, TY + 0.312, -0.09);
    head.rotation.x = 0.60; head.rotation.z = 0.20; g.add(head);
    var bulb = new T.Mesh(new T.SphereGeometry(0.022, 6, 5),
      new T.MeshBasicMaterial({ color: 0xffd9a0 }));
    bulb.position.set(-1.250, TY + 0.288, -0.075); g.add(bulb);

    /* ---------- стілець ---------- */
    var ch = new T.Group();
    ch.add(wbox(0.46, 0.065, 0.44, M.dark, 0, 0.455, 0, 0, 0.3));
    ch.add(wbox(0.44, 0.48, 0.055, M.dark, 0, 0.745, 0.215, 0, 0.3));
    ch.add(wbox(0.055, 0.16, 0.055, M.metal, -0.16, 0.565, 0.195, 0, 0.3));
    ch.add(wbox(0.055, 0.16, 0.055, M.metal, 0.16, 0.565, 0.195, 0, 0.3));
    var pole = new T.Mesh(new T.CylinderGeometry(0.032, 0.038, 0.40, 8), M.metal);
    pole.position.y = 0.22; ch.add(pole);
    for (var k = 0; k < 5; k++) {
      var an = k / 5 * Math.PI * 2;
      ch.add(wbox(0.26, 0.035, 0.05, M.metal,
        Math.sin(an) * 0.13, 0.045, Math.cos(an) * 0.13, an, 0.3));
      var wheel = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 0.022, 8), M.rubber);
      wheel.position.set(Math.sin(an) * 0.245, 0.028, Math.cos(an) * 0.245);
      wheel.rotation.z = Math.PI / 2; wheel.rotation.y = an; ch.add(wheel);
    }
    ch.position.set(0.05, 0, 0.78);
    ch.rotation.y = -0.08;
    g.add(ch);

    g.userData.screens = screens;
    return g;
  }
  /* ---------- меблі коридорів ----------
     Шафка: малюнок дверцят лежить ТІЛЬКИ на лицьовій грані. Якщо дати
     всій коробці одну текстуру, дверцята розтягуються на боки й на дах,
     а згори (з камери під стелею) це видно найбільше. */
  function lockerUnit(x, z, ry) {
    var W_ = 0.82, H_ = 1.80, D_ = 0.42;
    var grp = new T.Group();
    var m = new T.Mesh(new T.BoxGeometry(W_, H_, D_),
      [M.lockSide, M.lockSide, M.lockTop, M.lockTop, M.lockDoor, M.lockSide]);
    m.position.y = 0.10 + H_ / 2;
    m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
    grp.add(box(W_ + 0.02, 0.10, D_ + 0.03, M.lockTop, 0, 0.05, 0));            // цоколь
    grp.add(box(W_ + 0.05, 0.05, D_ + 0.07, M.lockSide, 0, 0.10 + H_ + 0.02, 0)); // карниз
    grp.position.set(x, 0, z);
    if (ry) grp.rotation.y = ry;
    return grp;
  }

  /* чавунна батарея під вікном — секціями, а не однією плитою */
  function radiator(x, z, ry) {
    var grp = new T.Group(), i;
    for (i = 0; i < 12; i++) {
      grp.add(box(0.050, 0.48, 0.115, M.radi, -0.33 + i * 0.060, 0.50, 0));
    }
    grp.add(box(0.78, 0.045, 0.095, M.radi, 0, 0.752, 0));
    grp.add(box(0.78, 0.045, 0.095, M.radi, 0, 0.248, 0));
    grp.add(box(0.034, 0.26, 0.034, M.metal, 0.42, 0.34, 0));
    grp.add(box(0.034, 0.10, 0.034, M.metal, -0.42, 0.80, 0));
    grp.position.set(x, 0, z);
    if (ry) grp.rotation.y = ry;
    return grp;
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
    lights.push({ light: pl, tube: tube, base: on ? 0.17 : 0, baseOn: !!on, flick: 0 });
  }

  /* ============================================================ */
  function build(scene, aniso) {
    ANISO = Math.max(1, aniso || 1);
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
    /* Бічні коридори були двома глухими кишками. Тепер уздовж них шість
       вікон, рівно над батареями: у кадрі з'являється ритм, а той, хто
       йде повз, на мить стає силуетом. Шибки самосвітні (MeshBasic):
       стіни в цій сцені тіней не кидають, тож будь-яка лампа «надворі»
       протекла б крізь них усередину школи. */
    [X0, X1].forEach(function (wx) {
      var WW = 1.50, WY0 = 0.95, WY1 = 2.40, i;
      var winZ = [];
      for (i = 0; i < 6; i++) winZ.push(-4.0 + i * 2.2);
      var edges = [Z0];
      winZ.forEach(function (z) { edges.push(z - WW / 2, z + WW / 2); });
      edges.push(Z1);
      for (i = 0; i < edges.length; i += 2) wall(g, wx, edges[i], wx, edges[i + 1], 3.0, 0.3);
      winZ.forEach(function (z) {
        g.add(box(0.30, WY0, WW, M.wallLow, wx, WY0 / 2, z));               // під вікном
        g.add(box(0.30, 3.0 - WY1, WW, M.wallUp, wx, (WY1 + 3.0) / 2, z));  // над вікном
        g.add(box(0.42, 0.055, WW + 0.14, M.wallUp, wx, WY0 + 0.028, z));   // підвіконня
        g.add(box(0.06, WY1 - WY0, WW, M.nightGlass, wx, (WY0 + WY1) / 2, z));
        // рама з хрестовиною
        g.add(box(0.12, 0.07, WW, M.frame, wx, WY0 + 0.04, z));
        g.add(box(0.12, 0.07, WW, M.frame, wx, WY1 - 0.04, z));
        g.add(box(0.12, WY1 - WY0, 0.07, M.frame, wx, (WY0 + WY1) / 2, z - WW / 2 + 0.04));
        g.add(box(0.12, WY1 - WY0, 0.07, M.frame, wx, (WY0 + WY1) / 2, z + WW / 2 - 0.04));
        g.add(box(0.12, WY1 - WY0, 0.055, M.frame, wx, (WY0 + WY1) / 2, z));
        g.add(box(0.12, 0.055, WW, M.frame, wx, WY0 + (WY1 - WY0) * 0.62, z));
      });
    });

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
    var deskLight = new T.PointLight(0xffc98a, 0.55, 4.2, 2);
    deskLight.position.set(0, 2.3, -6.55); g.add(deskLight);
    g.add(box(0.5, 0.06, 0.2, M.metal, 0, 2.45, -6.55));
    // тепла пляма від настільної лампи — щоб робоче місце мало свій центр
    var lampGlow = new T.PointLight(0xffb867, 0.62, 1.9, 2);
    lampGlow.position.set(-1.25, 1.00, -6.88); g.add(lampGlow);

    /* --- сходи на 2-й поверх (жовте) --- */
    function stairs(x, z, dir) {
      var sg = new T.Group();
      for (var i = 0; i < 7; i++)
        sg.add(box(1.5, 0.18, 0.3, M.wallLow, 0, 0.09 + i * 0.18, -i * 0.3));
      sg.position.set(x, 0, z); sg.rotation.y = dir;
      g.add(sg);
      var dl = new T.PointLight(0x22303e, 0.12, 5, 2);
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
        var tt = wbox(1.5, 0.07, 0.75, M.dTop, tx, 0.74, tz, 0, 0.70); g.add(tt);
        [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(function (p) {
          g.add(box(0.06, 0.74, 0.06, M.metal, tx + p[0], 0.37, tz + p[1]));
        });
        g.add(box(0.38, 0.04, 0.38, M.woodDark, tx - 0.5, 0.45, tz + 0.75));
        g.add(box(0.38, 0.04, 0.38, M.woodDark, tx + 0.5, 0.45, tz - 0.75));
      }
    }

    /* --- роздача ---
       CAM 05 дивилась у порожню кімнату зі столами. Лінія роздачі дає
       камері передній план і ховає за собою половину залу. */
    (function () {
      var SX = -4.6, SZ = -4.35, LEN = 7.6;
      g.add(wbox(LEN, 0.80, 0.72, M.dWood, SX, 0.44, SZ, 0, 0.55));     // корпус
      g.add(box(LEN + 0.06, 0.08, 0.80, M.metal, SX, 0.86, SZ));        // нержавіюча стільниця
      g.add(box(LEN + 0.10, 0.10, 0.10, M.metal, SX, 0.06, SZ - 0.36)); // цоколь
      // гастроємності — темні прямокутні заглибини
      for (var i = 0; i < 4; i++) {
        g.add(box(1.34, 0.05, 0.50, M.dark, SX - 2.85 + i * 1.9, 0.905, SZ - 0.06));
      }
      // напрямні для підносів
      [-0.42, -0.30].forEach(function (dz) {
        g.add(box(LEN, 0.035, 0.035, M.metal, SX, 0.80, SZ + dz));
      });
      // «чхальник»: стійки + скло
      for (var s = 0; s <= 4; s++) {
        g.add(box(0.035, 0.62, 0.035, M.metal, SX - 3.8 + s * 1.9, 1.21, SZ + 0.28));
      }
      g.add(box(LEN, 0.50, 0.03, M.glass, SX, 1.30, SZ + 0.28));
      g.add(box(LEN, 0.07, 0.34, M.metal, SX, 1.55, SZ + 0.14));        // козирок з лампами
      // стос підносів і тарілок
      for (var t2 = 0; t2 < 7; t2++) {
        g.add(box(0.40, 0.022, 0.30, M.woodDark, SX + 3.35, 0.92 + t2 * 0.024, SZ - 0.18));
      }
      var stack = new T.Mesh(new T.CylinderGeometry(0.115, 0.115, 0.22, 12), M.paper);
      stack.position.set(SX - 3.35, 1.01, SZ - 0.18); g.add(stack);
      // бак із чаєм
      var urn = new T.Mesh(new T.CylinderGeometry(0.19, 0.21, 0.46, 12), M.metal);
      urn.position.set(SX + 3.30, 1.13, SZ + 0.02); g.add(urn);
      g.add(box(0.05, 0.10, 0.05, M.dark, SX + 3.30, 1.00, SZ - 0.20));
    })();
    /* --- тамбур входу ---
       Звідси приходить Гліб, і CAM 06 дивилась у голу коробку. */
    (function () {
      // килимок біля дверей
      g.add(box(2.30, 0.012, 1.40, M.rubber, 0.9, 0.007, -11.60));
      // лава під західною стіною
      g.add(wbox(0.42, 0.06, 2.00, M.dWood, -3.34, 0.45, -10.70, 0, 0.55));
      [-0.85, 0.85].forEach(function (dz) {
        g.add(box(0.06, 0.45, 0.06, M.metal, -3.48, 0.225, -10.70 + dz));
        g.add(box(0.06, 0.45, 0.06, M.metal, -3.20, 0.225, -10.70 + dz));
      });
      // вішалка з гачками і забутим одягом
      g.add(box(0.05, 0.16, 2.20, M.woodDark, -3.66, 1.72, -10.70));
      for (var k = 0; k < 7; k++) {
        g.add(box(0.10, 0.03, 0.03, M.metal, -3.56, 1.66, -11.65 + k * 0.32));
      }
      [[-11.30, 0x2b3038, 0.72], [-10.35, 0x3a2a24, 0.86], [-9.95, 0x24303a, 0.64]]
        .forEach(function (c) {
          g.add(box(0.16, c[2], 0.34, new T.MeshLambertMaterial({ color: c[1] }),
            -3.52, 1.62 - c[2] / 2, c[0]));
        });
      // табличка над внутрішніми дверима
      g.add(box(1.60, 0.30, 0.03, new T.MeshLambertMaterial({ color: 0x2f6b46 }),
        -2.05, 2.62, Z0 + 0.09));
      g.add(box(1.68, 0.36, 0.02, M.metal, -2.05, 2.62, Z0 + 0.075));
      // батарея під панорамним склом
      g.add(radiator(2.0, Z0 + 0.22, Math.PI));
      // урна й відро прибиральниці
      var bin2 = new T.Mesh(new T.CylinderGeometry(0.18, 0.15, 0.55, 10), M.metal);
      bin2.position.set(3.20, 0.275, -11.90); g.add(bin2);
      var pail = new T.Mesh(new T.CylinderGeometry(0.16, 0.13, 0.30, 10), M.metal);
      pail.position.set(-3.10, 0.15, -12.10); g.add(pail);
      g.add(box(0.035, 1.30, 0.035, M.woodDark, -2.92, 0.65, -12.14, 0.16));
    })();

    /* --- двері класів уздовж головного коридору ---
       Стіна Столової з боку коридору була суцільною смугою на 9 метрів.
       Двері дають коридору ритм і роблять його схожим на школу. */
    [-9.9, -6.9, -4.0, 4.0, 6.9, 9.9].forEach(function (dx2, i) {
      g.add(box(1.32, 2.32, 0.06, M.frame, dx2, 1.16, CZ0 - 0.055));
      g.add(box(1.06, 2.16, 0.07, M.door1, dx2, 1.08, CZ0 - 0.095));
      g.add(box(0.30, 0.20, 0.02, M.notice, dx2 + 0.80, 1.90, CZ0 - 0.06));
      // потерта пляма біля ручки
      g.add(box(0.26, 0.34, 0.008, new T.MeshLambertMaterial({ color: 0x59372c }),
        dx2 + 0.34, 1.12, CZ0 - 0.132));
    });

    /* --- корпуси камер спостереження ---
       Виносимо ЗА точку зйомки, інакше камера дивилась би у власний
       кожух і давала чорний кадр. */
    CAMS.forEach(function (c) {
      var dx3 = c.look[0] - c.pos[0], dz3 = c.look[2] - c.pos[2];
      var L3 = Math.hypot(dx3, dz3) || 1;
      var a3 = Math.atan2(-dx3, -dz3);   // локальна −Z має дивитись уздовж погляду
      var bx = c.pos[0] - dx3 / L3 * 0.34, bz = c.pos[2] - dz3 / L3 * 0.34;
      var cg = new T.Group();
      cg.add(box(0.20, 0.13, 0.32, M.frame, 0, 0, 0));
      cg.add(box(0.10, 0.10, 0.09, M.dark, 0, -0.01, -0.19));          // об'єктив
      cg.add(box(0.05, 0.16, 0.05, M.metal, 0, 0.14, 0.06));           // кронштейн
      cg.add(box(0.14, 0.03, 0.14, M.metal, 0, 0.22, 0.06));
      var led = new T.Mesh(new T.SphereGeometry(0.016, 6, 5),
        new T.MeshBasicMaterial({ color: 0xd9412f }));
      led.position.set(0.07, 0.04, -0.14); cg.add(led);
      cg.position.set(bx, c.pos[1], bz);
      cg.rotation.y = a3;
      g.add(cg);
    });

    /* шафки в коридорах — лицем у коридор */
    for (var i2 = 0; i2 < 9; i2++) {
      g.add(lockerUnit(-13.8 + i2 * 0.88, -8.42));
      g.add(lockerUnit(5.6 + i2 * 0.88, -8.42));
    }
    /* радіатори на бічних стінах */
    for (var i3 = 0; i3 < 6; i3++) {
      g.add(radiator(-15.20, -4.0 + i3 * 2.2, Math.PI / 2));
      g.add(radiator(15.20, -4.0 + i3 * 2.2, -Math.PI / 2));
    }
    /* дошка оголошень + портрети — щоб коридор не був пустий */
    for (var i4 = 0; i4 < 5; i4++) {
      g.add(box(0.7, 0.9, 0.04, M.notice, -9 + i4 * 4.4, 1.9, -8.55));
      g.add(box(0.76, 0.96, 0.02, M.woodDark, -9 + i4 * 4.4, 1.9, -8.57));
    }
    /* план евакуації — зелена табличка, впізнавана деталь школи */
    [[-6.2, -8.55], [7.4, -8.55]].forEach(function (p) {
      g.add(box(0.62, 0.44, 0.03, new T.MeshLambertMaterial({ color: 0x2f6b46 }), p[0], 2.05, p[1]));
      g.add(box(0.66, 0.48, 0.02, M.metal, p[0], 2.05, p[1] - 0.02));
    });
    /* урни біля шафок */
    [-11.5, 9.2].forEach(function (x) {
      var bin = new T.Mesh(new T.CylinderGeometry(0.17, 0.14, 0.52, 10), M.metal);
      bin.position.set(x, 0.26, -8.05); g.add(bin);
    });
    /* вогнегасники */
    [[-4.6, -8.5], [5.2, -8.5]].forEach(function (p) {
      var fe = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.46, 10),
        new T.MeshLambertMaterial({ color: 0x8c1c13 }));
      fe.position.set(p[0], 0.62, p[1]); g.add(fe);
      g.add(box(0.05, 0.10, 0.05, M.metal, p[0], 0.90, p[1]));
    });

    /* ---------- реквізит у ніші охорони ----------
       Усе, що лежить на столі, тепер належить самому столу (buildDesk).
       Тут лишається тільки те, що висить на СТІНАХ. Бічні стіни ніші —
       це дверні прорізи, тому вішати можна лише на фронт (обабіч
       прилавка) та на глуху задню стіну. */
    (function () {
      var darkM = M.dark;
      // графік чергувань — на фронті ліворуч від прилавка, лицем до гравця
      g.add(box(0.52, 0.40, 0.02, M.woodDark, -1.58, 1.82, OZ + 0.08));
      g.add(box(0.46, 0.34, 0.01, M.notice, -1.58, 1.82, OZ + 0.095));
      // ключниця — на фронті праворуч
      g.add(box(0.44, 0.34, 0.03, M.woodDark, 1.58, 1.76, OZ + 0.085));
      for (var k = 0; k < 7; k++) {
        g.add(box(0.012, 0.10, 0.022, M.metal, 1.40 + k * 0.058, 1.68, OZ + 0.102));
      }
      // план евакуації над ключницею
      g.add(box(0.40, 0.28, 0.02, new T.MeshLambertMaterial({ color: 0x2f6b46 }),
        1.58, 2.16, OZ + 0.08));
      // радіоточка під стелею
      g.add(box(0.26, 0.16, 0.09, M.woodDark, 1.80, 2.18, CZ0 - 0.10));
      for (var v = 0; v < 5; v++) {
        g.add(box(0.20, 0.012, 0.01, darkM, 1.80, 2.22 - v * 0.018, CZ0 - 0.152));
      }
      // щиток і кабелі на задній стіні
      g.add(box(0.34, 0.44, 0.10, M.metal, -1.70, 1.70, CZ0 - 0.10));
      [[-1.70, -0.9], [-1.55, -0.6]].forEach(function (p) {
        var c1 = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 1.05, 6), darkM);
        c1.position.set(p[0], 0.95, CZ0 - 0.09);
        c1.rotation.z = p[1] * 0.06; g.add(c1);
      });
      // кабелі, що звисають зі стелі
      [[-0.6, -6.5], [0.7, -6.4]].forEach(function (p) {
        var c2 = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.34, 6), darkM);
        c2.position.set(p[0], 2.38, p[1]); c2.rotation.z = 0.25; g.add(c2);
      });
    })();

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
    var lampPost = new T.PointLight(0xffb066, 0.85, 22, 1.7);
    lampPost.position.set(4.5, 4.2, -18); g.add(lampPost);
    g.add(box(0.2, 5, 0.2, M.metal, 4.5, 2.5, -18));

    /* --- стіл охорони --- */
    var desk = buildDesk();
    desk.position.set(0, 0, -6.77);   /* прилавок майже впритул до фронту ніші */
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
    /* Камера стояла в кутку впритул до стіни: пів кадру займала сіра
       плита за метр від об'єктива. Тепер дивиться від внутрішньої стіни
       на вхідні двері — у кадрі вся коробка тамбура. */
    { id: 'CAM 06', name: 'ВХІД / ТАМБУР', pos: [-3.25, 2.72, -9.30], look: [1.6, 0.85, -12.45] }
  ];

  global.World = { build: build, CAMS: CAMS, DESK_PATH: DESK_PATH };

})(window);
