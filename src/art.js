/* ============================================================
   art.js — персонажі малюються як 2D-картки (як у No, I'm not a Human)

   Конвеєр «живописний», а не векторний:
     1) силует форми          → заливка базовим кольором
     2) градієнт поперек осі  → об'єм (тінь з одного боку)
     3) контрове світло       → тонкий світлий край
     4) складки / фактура     → тканина, шкіра, волосся пасмами
     5) підсвітка ЗНИЗУ       → їм світять ліхтарем в обличчя
     6) зерно                 → «намальовано, а не згенеровано»
   ============================================================ */
(function (global) {
  'use strict';

  var W = 512, H = 1024;

  /* ---------- кольори ---------- */
  function hex2rgb(h) {
    var c = parseInt(h.slice(1), 16);
    return [c >> 16, (c >> 8) & 255, c & 255];
  }
  function rgb(a, alpha) {
    return 'rgba(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) +
      ',' + (alpha === undefined ? 1 : alpha) + ')';
  }
  function mix(h1, h2, t) {
    var a = hex2rgb(h1), b = hex2rgb(h2);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function dark(h, t) { return rgb(mix(h, '#06070c', t)); }
  function lite(h, t) { return rgb(mix(h, '#fff6e2', t)); }

  /* ---------- геометрія ---------- */
  function chain(x, y, segs) {
    var pts = [[x, y]];
    for (var i = 0; i < segs.length; i++) {
      var a = segs[i][0], L = segs[i][1];
      x += Math.sin(a) * L; y += Math.cos(a) * L;
      pts.push([x, y]);
    }
    return pts;
  }

  /* контур звуженої кінцівки */
  function limbPath(g, pts, w0, w1) {
    var n = pts.length, L = [], R = [], i;
    for (i = 0; i < n; i++) {
      var p = pts[i];
      var q = pts[Math.min(i + 1, n - 1)], r = pts[Math.max(i - 1, 0)];
      var dx = q[0] - r[0], dy = q[1] - r[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var t = i / (n - 1), w = (w0 + (w1 - w0) * t) / 2;
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
    }
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    g.lineTo(R[n - 1][0], R[n - 1][1]);
    for (i = n - 2; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
  }

  /* ---------- ядро: об'ємна форма ---------- */
  function volume(g, drawPath, base, opt) {
    opt = opt || {};
    var ax = opt.axis || [0, 0, W, 0];
    var lightX = opt.light === undefined ? -1 : opt.light;
    var deep = opt.deep === undefined ? 0.62 : opt.deep;
    var rim = opt.rim === undefined ? 0.30 : opt.rim;
    var baseHex = opt.baseHex || '#808080';

    g.save();
    drawPath(g);
    g.fillStyle = base;
    g.fill();
    g.clip();

    var gr = g.createLinearGradient(ax[0], ax[1], ax[2], ax[3]);
    if (lightX < 0) {
      gr.addColorStop(0.00, lite(baseHex, rim));
      gr.addColorStop(0.14, 'rgba(0,0,0,0)');
      gr.addColorStop(0.55, 'rgba(0,0,0,' + (deep * 0.35).toFixed(3) + ')');
      gr.addColorStop(1.00, 'rgba(0,0,0,' + deep.toFixed(3) + ')');
    } else {
      gr.addColorStop(0.00, 'rgba(0,0,0,' + deep.toFixed(3) + ')');
      gr.addColorStop(0.45, 'rgba(0,0,0,' + (deep * 0.35).toFixed(3) + ')');
      gr.addColorStop(0.86, 'rgba(0,0,0,0)');
      gr.addColorStop(1.00, lite(baseHex, rim));
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    if (opt.detail) opt.detail(g);
    g.restore();

    g.save();
    drawPath(g);
    g.strokeStyle = 'rgba(6,5,9,' + (opt.lineA === undefined ? 0.75 : opt.lineA) + ')';
    g.lineWidth = opt.lineW || 2.2;
    g.lineJoin = 'round';
    g.stroke();
    g.restore();
  }

  /* м'яка контактна тінь */
  function ao(g, x, y, rx, ry, a) {
    var R = Math.max(rx, ry);
    var gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(4,4,8,' + a + ')');
    gr.addColorStop(1, 'rgba(4,4,8,0)');
    g.save();
    g.translate(x, y); g.scale(rx / R, ry / R); g.translate(-x, -y);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, R, 0, 6.3); g.fill();
    g.restore();
  }

  /* складки тканини */
  function folds(g, cx, y0, y1, w, n, a) {
    g.save();
    g.strokeStyle = 'rgba(0,0,0,' + a + ')';
    g.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = cx + (Math.random() - 0.5) * w;
      var yy = y0 + Math.random() * Math.max(1, y1 - y0);
      var len = Math.abs(y1 - y0) * (0.08 + Math.random() * 0.20);
      g.lineWidth = 1 + Math.random() * 2.6;
      g.beginPath();
      g.moveTo(x, yy);
      g.quadraticCurveTo(x + (Math.random() - 0.5) * w * 0.25, yy + len * 0.5,
        x + (Math.random() - 0.5) * w * 0.18, yy + len);
      g.stroke();
    }
    g.restore();
  }

  /* плямистість шкіри */
  function skinTexture(g, x, y, rx, ry, base) {
    g.save();
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.3); g.clip();
    for (var i = 0; i < 90; i++) {
      var px = x + (Math.random() - .5) * rx * 2;
      var py = y + (Math.random() - .5) * ry * 2;
      g.globalAlpha = 0.025 + Math.random() * 0.05;
      g.fillStyle = Math.random() < .55 ? dark(base, 0.4) : lite(base, 0.4);
      g.beginPath();
      g.ellipse(px, py, 1 + Math.random() * 5, 1 + Math.random() * 4, Math.random() * 3, 0, 6.3);
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /* ============================================================
     ОБЛИЧЧЯ. Світло йде ЗНИЗУ — тіні лягають угору.
     ============================================================ */
  function drawFace(g, cx, cy, r, o) {
    var skin = o.skin;
    var sh = function (t) { return dark(skin, t); };
    var hi = function (t) { return lite(skin, t); };

    var jw = o.jaw === undefined ? 0.40 : o.jaw;
    function headPath(c) {
      c.beginPath();
      c.moveTo(cx - r * 0.80, cy - r * 0.10);
      c.bezierCurveTo(cx - r * 0.86, cy - r * 0.95, cx + r * 0.86, cy - r * 0.95, cx + r * 0.80, cy - r * 0.10);
      c.bezierCurveTo(cx + r * 0.78, cy + r * 0.34, cx + r * (jw + 0.20), cy + r * 0.60, cx + r * jw, cy + r * 0.86);
      c.quadraticCurveTo(cx + r * jw * 0.40, cy + r * 1.12, cx, cy + r * 1.14);
      c.quadraticCurveTo(cx - r * jw * 0.40, cy + r * 1.12, cx - r * jw, cy + r * 0.86);
      c.bezierCurveTo(cx - r * (jw + 0.20), cy + r * 0.60, cx - r * 0.78, cy + r * 0.34, cx - r * 0.80, cy - r * 0.10);
      c.closePath();
    }

    if (o.dark) {
      g.save();
      headPath(g);
      var vg = g.createLinearGradient(0, cy + r, 0, cy - r);
      vg.addColorStop(0, 'rgba(24,22,28,1)');
      vg.addColorStop(0.5, 'rgba(8,7,11,1)');
      vg.addColorStop(1, 'rgba(3,3,5,1)');
      g.fillStyle = vg; g.fill();
      g.clip();
      ao(g, cx, cy + r * 0.55, r * 0.7, r * 0.5, 0.5);
      g.restore();
      [-1, 1].forEach(function (s) {
        var ex = cx + s * r * 0.33, ey = cy - r * 0.02;
        var eg = g.createRadialGradient(ex, ey, 0, ex, ey, r * 0.24);
        eg.addColorStop(0, 'rgba(226,200,126,0.95)');
        eg.addColorStop(0.35, 'rgba(160,128,54,0.32)');
        eg.addColorStop(1, 'rgba(120,90,30,0)');
        g.fillStyle = eg;
        g.beginPath(); g.arc(ex, ey, r * 0.24, 0, 6.3); g.fill();
        g.fillStyle = o.glint || '#e6cf8a';
        g.beginPath(); g.ellipse(ex, ey, r * 0.085, r * 0.045, 0, 0, 6.3); g.fill();
      });
      g.save(); headPath(g);
      g.strokeStyle = 'rgba(70,66,60,0.45)'; g.lineWidth = 2; g.stroke(); g.restore();
      return;
    }

    /* базова заливка з підсвіткою знизу */
    g.save();
    headPath(g);
    g.fillStyle = sh(0.30);
    g.fill();
    g.clip();

    var lg = g.createLinearGradient(0, cy + r * 1.1, 0, cy - r * 0.9);
    lg.addColorStop(0.00, hi(0.30));
    lg.addColorStop(0.35, rgb(hex2rgb(skin), 1));
    lg.addColorStop(0.70, sh(0.32));
    lg.addColorStop(1.00, sh(0.62));
    g.fillStyle = lg; g.fillRect(0, 0, W, H);

    var sg = g.createLinearGradient(cx - r, 0, cx + r, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.34)');
    sg.addColorStop(0.35, 'rgba(0,0,0,0)');
    sg.addColorStop(0.80, 'rgba(0,0,0,0.10)');
    sg.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);

    skinTexture(g, cx, cy, r, r * 1.1, skin);

    /* кісткова структура */
    g.fillStyle = 'rgba(10,8,14,0.30)';
    g.beginPath(); g.ellipse(cx, cy - r * 0.52, r * 0.72, r * 0.20, 0, 0, 6.3); g.fill();
    [-1, 1].forEach(function (s) {
      ao(g, cx + s * r * 0.70, cy - r * 0.34, r * 0.24, r * 0.34, 0.30);
      var bx = cx + s * r * 0.55, by = cy + r * 0.24;
      var cg = g.createRadialGradient(bx, by + r * 0.10, 0, bx, by, r * 0.34);
      cg.addColorStop(0, hi(0.18)); cg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cg;
      g.beginPath(); g.ellipse(bx, by, r * 0.34, r * 0.26, 0, 0, 6.3); g.fill();
      ao(g, cx + s * r * 0.46, cy + r * 0.52, r * 0.22, r * 0.30, 0.34);
    });

    /* очі */
    [-1, 1].forEach(function (s) {
      var ex = cx + s * r * 0.35, ey = cy - r * 0.06;
      var ew = r * 0.205, eh = r * 0.120;

      var og = g.createRadialGradient(ex, ey - r * 0.04, r * 0.02, ex, ey, r * 0.34);
      og.addColorStop(0, 'rgba(10,5,7,0.88)');
      og.addColorStop(0.55, 'rgba(12,7,9,0.48)');
      og.addColorStop(1, 'rgba(14,8,10,0)');
      g.fillStyle = og;
      g.beginPath(); g.ellipse(ex, ey - r * 0.02, r * 0.34, r * 0.30, 0, 0, 6.3); g.fill();

      g.save();
      g.beginPath();
      g.moveTo(ex - ew, ey + eh * 0.10);
      g.bezierCurveTo(ex - ew * 0.5, ey - eh * 1.45, ex + ew * 0.5, ey - eh * 1.45, ex + ew, ey + eh * 0.05);
      g.bezierCurveTo(ex + ew * 0.5, ey + eh * 1.25, ex - ew * 0.5, ey + eh * 1.25, ex - ew, ey + eh * 0.10);
      g.closePath();
      g.fillStyle = '#cfc9b6'; g.fill();
      g.clip();

      var yg = g.createLinearGradient(0, ey - eh * 1.5, 0, ey + eh);
      yg.addColorStop(0, 'rgba(20,12,10,0.75)');
      yg.addColorStop(0.6, 'rgba(20,12,10,0.08)');
      yg.addColorStop(1, 'rgba(20,12,10,0)');
      g.fillStyle = yg; g.fillRect(ex - ew, ey - eh * 2, ew * 2, eh * 4);

      var px = ex + (o.gaze || 0) * r * 0.07;
      var ir = r * 0.097;
      g.fillStyle = o.eye || '#4a5a3a';
      g.beginPath(); g.arc(px, ey, ir, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.30)'; g.lineWidth = 1;
      for (var k = 0; k < 14; k++) {
        var a2 = k / 14 * 6.283;
        g.beginPath();
        g.moveTo(px + Math.cos(a2) * ir * 0.35, ey + Math.sin(a2) * ir * 0.35);
        g.lineTo(px + Math.cos(a2) * ir, ey + Math.sin(a2) * ir);
        g.stroke();
      }
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(px, ey, ir, 0, 6.3); g.stroke();
      g.fillStyle = '#050508';
      g.beginPath(); g.arc(px, ey, ir * (o.pupil || 0.42), 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,252,240,0.92)';
      g.beginPath(); g.ellipse(px - ir * 0.35, ey + ir * 0.35, ir * 0.30, ir * 0.20, -0.5, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,252,240,0.32)';
      g.beginPath(); g.arc(px + ir * 0.42, ey - ir * 0.28, ir * 0.14, 0, 6.3); g.fill();
      g.restore();

      g.strokeStyle = 'rgba(16,9,10,0.85)';
      g.lineWidth = Math.max(1.2, r * 0.032);
      g.beginPath();
      g.moveTo(ex - ew, ey + eh * 0.10);
      g.bezierCurveTo(ex - ew * 0.5, ey - eh * 1.45, ex + ew * 0.5, ey - eh * 1.45, ex + ew, ey + eh * 0.05);
      g.stroke();
      g.strokeStyle = 'rgba(16,9,10,0.32)'; g.lineWidth = Math.max(1, r * 0.02);
      g.beginPath();
      g.moveTo(ex - ew * 0.9, ey + eh * 0.55);
      g.quadraticCurveTo(ex, ey + eh * 1.15, ex + ew * 0.9, ey + eh * 0.40);
      g.stroke();
      g.strokeStyle = 'rgba(30,16,16,0.20)'; g.lineWidth = Math.max(1, r * 0.03);
      g.beginPath();
      g.moveTo(ex - ew * 0.8, ey + eh * 1.5);
      g.quadraticCurveTo(ex, ey + eh * 2.0, ex + ew * 0.8, ey + eh * 1.35);
      g.stroke();
    });

    /* вії — жіночий акцент, помітний навіть здалеку */
    if (o.fem) {
      [-1, 1].forEach(function (s) {
        var ex = cx + s * r * 0.35, ey = cy - r * 0.06, ew = r * 0.205, eh = r * 0.120;
        g.strokeStyle = 'rgba(14,8,10,0.92)';
        g.lineWidth = Math.max(1.6, r * 0.050);
        g.beginPath();
        g.moveTo(ex - ew, ey + eh * 0.10);
        g.bezierCurveTo(ex - ew * 0.5, ey - eh * 1.55, ex + ew * 0.5, ey - eh * 1.55, ex + ew, ey + eh * 0.05);
        g.stroke();
        g.lineWidth = Math.max(1, r * 0.022);
        for (var L = 0; L < 4; L++) {
          var t3 = 0.55 + L * 0.13;
          var lx = ex - ew + ew * 2 * t3, ly = ey - eh * 0.95 + L * eh * 0.10;
          g.beginPath();
          g.moveTo(lx, ly);
          g.lineTo(lx + s * r * 0.055, ly - r * 0.045);
          g.stroke();
        }
      });
    }

    /* брови пасмами */
    [-1, 1].forEach(function (s) {
      var bx = cx + s * r * 0.35, by = cy - r * 0.38 + (o.browY || 0) * r;
      g.save();
      g.translate(bx, by); g.rotate(-s * (o.browAngle || 0.10));
      var bc = hex2rgb(o.brow || '#2a1d14');
      var thin = o.browThin || 1;                    // <1 = тонша, жіноча брова
      var cnt = Math.round(24 * thin);
      for (var i = 0; i < cnt; i++) {
        var t = i / Math.max(1, cnt - 1);
        var px2 = (t - 0.5) * r * 0.56 * (0.7 + 0.3 * thin);
        var py2 = Math.abs(t - 0.45) * r * 0.10;
        g.strokeStyle = 'rgba(' + bc.join(',') + ',' + (0.45 + Math.random() * 0.45) + ')';
        g.lineWidth = (1 + Math.random() * 2.2) * thin;
        g.beginPath();
        g.moveTo(px2, py2 + r * 0.05 * thin);
        g.lineTo(px2 + (Math.random() - 0.3) * r * 0.06, py2 - r * 0.05 * thin - Math.random() * r * 0.04);
        g.stroke();
      }
      g.restore();
    });

    /* ніс */
    var ny = cy + r * 0.34;
    g.fillStyle = 'rgba(12,8,12,0.26)';
    g.beginPath();
    g.moveTo(cx - r * 0.09, cy - r * 0.12);
    g.quadraticCurveTo(cx - r * 0.17, ny - r * 0.02, cx - r * 0.20, ny + r * 0.06);
    g.lineTo(cx + r * 0.20, ny + r * 0.06);
    g.quadraticCurveTo(cx + r * 0.17, ny - r * 0.02, cx + r * 0.09, cy - r * 0.12);
    g.closePath(); g.fill();
    var tg = g.createRadialGradient(cx, ny + r * 0.02, 0, cx, ny + r * 0.02, r * 0.16);
    tg.addColorStop(0, hi(0.34)); tg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tg;
    g.beginPath(); g.ellipse(cx, ny + r * 0.02, r * 0.16, r * 0.12, 0, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(8,4,6,0.78)';
    [-1, 1].forEach(function (s) {
      g.beginPath();
      g.ellipse(cx + s * r * 0.115, ny + r * 0.06, r * 0.055, r * 0.038, s * 0.4, 0, 6.3);
      g.fill();
    });
    g.strokeStyle = 'rgba(20,10,10,0.20)'; g.lineWidth = Math.max(1, r * 0.035);
    [-1, 1].forEach(function (s) {
      g.beginPath();
      g.moveTo(cx + s * r * 0.20, ny + r * 0.04);
      g.quadraticCurveTo(cx + s * r * 0.34, cy + r * 0.62, cx + s * r * 0.26, cy + r * 0.76);
      g.stroke();
    });

    /* рот */
    var my = cy + r * 0.70, mw = r * (o.mouthW || 0.34);
    if (o.mouthOpen) {
      var mh = r * o.mouthOpen;
      g.save();
      g.beginPath();
      g.moveTo(cx - mw, my);
      g.quadraticCurveTo(cx, my - mh * 0.5, cx + mw, my);
      g.quadraticCurveTo(cx, my + mh * 2.2, cx - mw, my);
      g.closePath();
      g.fillStyle = '#140708'; g.fill();
      g.clip();
      g.fillStyle = '#cfc6ad';
      for (var t2 = 0; t2 < 8; t2++) {
        g.fillRect(cx - mw + t2 * (mw * 2 / 8) + 1, my - mh * 0.18, mw * 2 / 8 - 2, mh * 0.55);
      }
      g.fillStyle = 'rgba(90,20,24,0.75)';
      g.beginPath(); g.ellipse(cx, my + mh * 1.5, mw * 0.7, mh * 0.8, 0, 0, 6.3); g.fill();
      var mg2 = g.createLinearGradient(0, my - mh, 0, my + mh * 2);
      mg2.addColorStop(0, 'rgba(0,0,0,0.85)'); mg2.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.fillStyle = mg2; g.fillRect(cx - mw, my - mh, mw * 2, mh * 3.5);
      g.restore();
      g.strokeStyle = 'rgba(14,6,8,0.9)'; g.lineWidth = Math.max(1.4, r * 0.035);
      g.beginPath();
      g.moveTo(cx - mw, my);
      g.quadraticCurveTo(cx, my - mh * 0.5, cx + mw, my);
      g.stroke();
    } else {
      var lipFull = o.fem ? 1.55 : 1.0;
      g.fillStyle = rgb(mix(skin, '#8a3a34', o.fem ? 0.72 : 0.55), o.fem ? 0.88 : 0.75);
      g.beginPath();
      g.moveTo(cx - mw, my);
      // верхня губа з «луком Купідона»
      g.quadraticCurveTo(cx - mw * 0.55, my - r * 0.10 * lipFull, cx - mw * 0.16, my - r * 0.06 * lipFull);
      g.quadraticCurveTo(cx, my - r * 0.02 * lipFull, cx + mw * 0.16, my - r * 0.06 * lipFull);
      g.quadraticCurveTo(cx + mw * 0.55, my - r * 0.10 * lipFull, cx + mw, my);
      g.quadraticCurveTo(cx, my + (r * 0.13 + (o.smile || 0) * r * 0.05) * lipFull, cx - mw, my);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(16,7,9,0.8)'; g.lineWidth = Math.max(1.2, r * 0.035);
      g.beginPath();
      g.moveTo(cx - mw, my);
      g.quadraticCurveTo(cx, my + (o.smile || 0) * r * 0.16, cx + mw, my);
      g.stroke();
      g.fillStyle = hi(0.25);
      g.beginPath(); g.ellipse(cx, my + r * 0.07, mw * 0.5, r * 0.028, 0, 0, 6.3); g.fill();
    }

    var cg2 = g.createRadialGradient(cx, cy + r * 1.02, 0, cx, cy + r * 1.02, r * 0.4);
    cg2.addColorStop(0, hi(0.22)); cg2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg2;
    g.beginPath(); g.ellipse(cx, cy + r * 1.0, r * 0.36, r * 0.22, 0, 0, 6.3); g.fill();

    g.restore();

    /* вуха */
    [-1, 1].forEach(function (s) {
      var exx = cx + s * r * 0.82, eyy = cy + r * 0.06;
      volume(g, function (c) {
        c.beginPath();
        c.ellipse(exx, eyy, r * 0.13, r * 0.26, s * 0.12, 0, 6.3);
      }, sh(0.10), {
        axis: [exx - r * 0.13, 0, exx + r * 0.13, 0], light: s,
        baseHex: skin, deep: 0.5, lineW: 1.6, rim: 0.25
      });
      g.strokeStyle = 'rgba(20,10,10,0.32)'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(exx, eyy, r * 0.06, r * 0.15, s * 0.12, 0, 6.3); g.stroke();
    });

    g.save();
    headPath(g);
    g.strokeStyle = 'rgba(8,6,10,0.7)'; g.lineWidth = 2.4; g.stroke();
    g.restore();
  }

  /* ============================================================
     ВОЛОССЯ — пасмами
     ============================================================ */
  function drawHair(g, cx, cy, r, type, col) {
    var base = hex2rgb(col);
    function strand(x0, y0, x1, y1, w, bright) {
      var c = base.map(function (v) { return Math.max(0, Math.min(255, v + bright * 38)); });
      g.strokeStyle = 'rgba(' + c.map(Math.round).join(',') + ',' + (0.5 + Math.random() * 0.45) + ')';
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo((x0 + x1) / 2 + (Math.random() - .5) * r * 0.3, (y0 + y1) / 2, x1, y1);
      g.stroke();
    }

    g.save();
    g.lineCap = 'round';
    g.fillStyle = rgb(mix(col, '#000000', 0.28));
    g.beginPath();
    if (type === 'bob') {
      g.moveTo(cx - r * 1.02, cy + r * 0.80);
      g.bezierCurveTo(cx - r * 1.18, cy - r * 1.05, cx + r * 1.18, cy - r * 1.05, cx + r * 1.02, cy + r * 0.80);
      g.quadraticCurveTo(cx + r * 0.90, cy + r * 0.10, cx + r * 0.88, cy - r * 0.52);
      g.quadraticCurveTo(cx, cy - r * 0.80, cx - r * 0.88, cy - r * 0.52);
      g.quadraticCurveTo(cx - r * 0.90, cy + r * 0.10, cx - r * 1.02, cy + r * 0.80);
    } else if (type === 'bowl') {
      g.moveTo(cx - r * 0.94, cy + r * 0.12);
      g.bezierCurveTo(cx - r * 1.06, cy - r * 1.06, cx + r * 1.06, cy - r * 1.06, cx + r * 0.94, cy + r * 0.12);
      g.quadraticCurveTo(cx + r * 0.50, cy - r * 0.30, cx, cy - r * 0.22);
      g.quadraticCurveTo(cx - r * 0.50, cy - r * 0.30, cx - r * 0.94, cy + r * 0.12);
    } else if (type === 'long') {
      g.moveTo(cx - r * 1.0, cy + r * 1.7);
      g.bezierCurveTo(cx - r * 1.2, cy - r * 1.1, cx + r * 1.2, cy - r * 1.1, cx + r * 1.0, cy + r * 1.7);
      g.quadraticCurveTo(cx + r * 0.8, cy + r * 0.2, cx + r * 0.82, cy - r * 0.3);
      g.quadraticCurveTo(cx, cy - r * 0.58, cx - r * 0.82, cy - r * 0.3);
      g.quadraticCurveTo(cx - r * 0.8, cy + r * 0.2, cx - r * 1.0, cy + r * 1.7);
    } else if (type === 'pixie') {
      // коротка жіноча стрижка: об'єм угорі, прикриті вуха, косий чубчик
      g.moveTo(cx - r * 1.06, cy + r * 0.42);
      g.bezierCurveTo(cx - r * 1.22, cy - r * 1.12, cx + r * 1.16, cy - r * 1.14, cx + r * 1.02, cy + r * 0.30);
      g.quadraticCurveTo(cx + r * 0.92, cy - r * 0.02, cx + r * 0.86, cy - r * 0.30);
      // косий чубчик через лоб
      g.quadraticCurveTo(cx + r * 0.20, cy - r * 0.62, cx - r * 0.52, cy - r * 0.30);
      g.quadraticCurveTo(cx - r * 0.92, cy - r * 0.10, cx - r * 1.06, cy + r * 0.42);
    } else {
      g.ellipse(cx, cy - r * 0.34, r * 0.92, r * 0.78, 0, Math.PI, 0);
      g.lineTo(cx + r * 0.92, cy - r * 0.18);
      g.quadraticCurveTo(cx, cy - r * 0.48, cx - r * 0.92, cy - r * 0.18);
    }
    g.closePath();
    var massPath = g;                       // шлях уже побудований
    g.fill();

    /* пасма й тіні — СУВОРО всередині силуету зачіски */
    g.save();
    g.clip();                               // клип по щойно побудованій масі

    var n = type === 'crop' ? 90 : 170;
    for (var i = 0; i < n; i++) {
      var t = Math.random();
      var a = Math.PI + t * Math.PI;
      var x0 = cx + Math.cos(a) * r * 0.25;
      var y0 = cy - r * 0.95 + Math.random() * r * 0.45;
      var x1 = cx + Math.cos(a) * r * 1.25;
      var y1 = cy + (type === 'bob' ? r * (0.1 + Math.random() * 1.0)
        : type === 'long' ? r * (0.4 + Math.random() * 1.8)
          : type === 'pixie' ? r * (-0.2 + Math.random() * 0.9)
            : -r * (0.2 + Math.random() * 0.7));
      strand(x0, y0, x1, y1, 1.2 + Math.random() * 3.0, Math.random() < .4 ? 1 : -1);
    }
    // об'єм: світло по верхньому краю, тінь біля обличчя
    var hg = g.createLinearGradient(0, cy - r * 1.3, 0, cy + r * 1.0);
    hg.addColorStop(0, 'rgba(255,240,215,0.16)');
    hg.addColorStop(0.45, 'rgba(0,0,0,0)');
    hg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = hg;
    g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    // бічна тінь
    var hs = g.createLinearGradient(cx - r * 1.2, 0, cx + r * 1.2, 0);
    hs.addColorStop(0, 'rgba(0,0,0,0.35)');
    hs.addColorStop(0.4, 'rgba(0,0,0,0)');
    hs.addColorStop(1, 'rgba(0,0,0,0.40)');
    g.fillStyle = hs;
    g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    g.restore();

    if (type === 'bun') {
      g.save();
      g.beginPath(); g.arc(cx, cy - r * 1.18, r * 0.36, 0, 6.3);
      g.fillStyle = rgb(mix(col, '#000000', 0.32)); g.fill();
      g.clip();
      for (var b2 = 0; b2 < 26; b2++) {
        var ba = Math.random() * 6.283;
        strand(cx, cy - r * 1.18,
          cx + Math.cos(ba) * r * 0.4, cy - r * 1.18 + Math.sin(ba) * r * 0.4,
          1 + Math.random() * 2, -1);
      }
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy - r * 1.18, r * 0.36, 0, 6.3); g.stroke();
    }

    g.restore();
  }

  /* ---------- вишивка ---------- */
  function embroidery(g, x, y, w, h, c1, c2) {
    var n = Math.max(4, Math.round(w / 14));
    for (var i = 0; i < n; i++) {
      var cx = x + (i + 0.5) * (w / n);
      g.fillStyle = i % 2 ? c1 : c2;
      g.beginPath();
      g.moveTo(cx, y); g.lineTo(cx + h / 2, y + h / 2);
      g.lineTo(cx, y + h); g.lineTo(cx - h / 2, y + h / 2);
      g.closePath(); g.fill();
      g.fillStyle = i % 2 ? c2 : c1;
      g.fillRect(cx - h * 0.09, y + h * 0.41, h * 0.18, h * 0.18);
    }
    g.fillStyle = c1;
    g.fillRect(x, y - h * 0.22, w, h * 0.10);
    g.fillRect(x, y + h + h * 0.12, w, h * 0.10);
    var sg = g.createLinearGradient(x, 0, x + w, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.40)'); sg.addColorStop(0.4, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = sg; g.fillRect(x, y - h * 0.3, w, h * 1.7);
  }

  /* ---------- зерно ---------- */
  function grain(g, amt) {
    var d = g.getImageData(0, 0, W, H), p = d.data;
    for (var i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 6) continue;
      var n = (Math.random() - 0.5) * amt;
      p[i] += n; p[i + 1] += n; p[i + 2] += n * 0.9;
    }
    g.putImageData(d, 0, 0);
  }

  /* ============================================================
     ПОЗИ (кути «назовні від тіла»)
     ============================================================ */
  var POSE = {
    stand: { torso: 0.02, headT: 0.05, armF: [0.10, 0.06], armN: [0.08, 0.07], legF: [0.05, 0.02], legN: [0.05, 0.02], hand: 0.13 },
    lean: { torso: 0.34, headT: 0.40, armF: [0.28, 0.26], armN: [0.24, 0.30], legF: [0.06, 0.02], legN: [0.06, 0.02], hand: 0.18 },
    reach: { torso: 0.06, headT: -0.14, armF: [2.74, -0.20], armN: [2.82, -0.22], legF: [0.05, 0.02], legN: [0.05, 0.02], hand: 0.32 },
    tilt: { torso: -0.05, headT: 0.66, armF: [0.07, 0.04], armN: [0.06, 0.05], legF: [0.04, 0.02], legN: [0.04, 0.02], hand: 0.09 },
    onewall: { torso: 0.18, headT: 0.26, armF: [2.32, -0.32], armN: [0.10, 0.10], legF: [0.05, 0.02], legN: [0.05, 0.02], hand: 0.12 },
    behind: { torso: -0.06, headT: 0.12, armF: [0.02, 0.02], armN: [0.02, 0.02], legF: [0.03, 0.02], legN: [0.03, 0.02], hand: 0.05 },
    crouch: { torso: 0.52, headT: 0.50, armF: [0.55, 0.62], armN: [0.50, 0.66], legF: [0.62, -0.95], legN: [0.52, -0.88], hand: 0.22, drop: 0.13 },
    lunge: { torso: 0.32, headT: -0.20, armF: [2.38, -0.62], armN: [2.48, -0.66], legF: [0.35, 0.10], legN: [0.30, 0.10], hand: 0.52, mouth: 0.30 }
  };
  var POSE_KEYS = ['stand', 'lean', 'reach', 'tilt', 'onewall', 'behind', 'crouch'];

  /* ============================================================
     ФІГУРА
     ============================================================ */
  function drawFigure(g, spec, poseName) {
    var P = POSE[poseName] || POSE.stand;
    g.clearRect(0, 0, W, H);

    var cx = W / 2;
    var top = 52 + (P.drop || 0) * 200;
    var bot = H - 46;
    var bodyH = bot - top;

    var headR = bodyH * spec.headR;
    var headCy = top + headR * 1.10;
    var neckY = headCy + headR * 1.02;
    var shY = neckY + bodyH * 0.030;
    var hipY = shY + bodyH * spec.torso;
    var legLen = bot - hipY;
    var shW = bodyH * spec.shoulder;
    var hipW = bodyH * spec.hip;
    var armLen = bodyH * spec.arm;
    var s = bodyH / 760;

    var cloth = spec.cloth, pant = spec.pant, skin = spec.skin;

    function hand(x, y, ang, sc, base, spread) {
      var f = spread === undefined ? 0.16 : spread;
      for (var i = 0; i < 4; i++) {
        var a = ang + (i - 1.5) * f;
        var len = 26 * sc * (i === 0 || i === 3 ? 0.84 : 1);
        var p = chain(x, y, [[a, len], [a + 0.38, len * 0.78]]);
        (function (pp) {
          volume(g, function (c) { limbPath(c, pp, 7.4 * sc, 3.6 * sc); },
            dark(base, 0.16), {
            axis: [x - 14 * sc, 0, x + 14 * sc, 0], light: -1,
            baseHex: base, deep: 0.55, lineW: 1.5, rim: 0.4
          });
        })(p);
      }
      var th = chain(x, y, [[ang - 1.20, 22 * sc], [ang - 1.5, 14 * sc]]);
      volume(g, function (c) { limbPath(c, th, 8 * sc, 4.6 * sc); },
        dark(base, 0.16), {
        axis: [x - 14 * sc, 0, x + 14 * sc, 0], light: -1,
        baseHex: base, deep: 0.55, lineW: 1.5
      });
      volume(g, function (c) {
        c.beginPath(); c.ellipse(x, y - 3 * sc, 9.5 * sc, 12 * sc, 0, 0, 6.3);
      }, base, {
        axis: [x - 10 * sc, 0, x + 10 * sc, 0], light: -1,
        baseHex: base, deep: 0.5, lineW: 1.6
      });
    }

    function arm(far) {
      var a = far ? P.armF : P.armN, m = far ? -1 : 1;
      var sx = cx + m * shW * 0.40;
      var sy = shY + bodyH * 0.014;
      var pts = chain(sx, sy, [[a[0] * m, armLen * 0.52], [(a[0] + a[1]) * m, armLen * 0.48]]);
      var base = far ? dark(cloth, 0.12) : cloth;
      volume(g, function (c) { limbPath(c, pts, shW * 0.30, shW * 0.155); },
        base, {
        axis: [sx - shW * 0.3, 0, sx + shW * 0.3, 0], light: -1,
        baseHex: cloth, deep: far ? 0.42 : 0.62, lineW: 2, rim: far ? 0.42 : 0.30,
        detail: function (c) { folds(c, sx, sy, pts[2][1], shW * 0.35, 7, 0.2); }
      });
      var wrist = pts[2];
      var ang = Math.atan2(wrist[0] - pts[1][0], wrist[1] - pts[1][1]);
      hand(wrist[0], wrist[1], ang, s * spec.handS * (far ? 0.9 : 1),
        far ? dark(skin, 0.12) : skin, P.hand);
    }

    function leg(far) {
      var a = far ? P.legF : P.legN, m = far ? -1 : 1;
      var sx = cx + m * hipW * 0.38;
      var pts = chain(sx, hipY - bodyH * 0.012, [[a[0] * m, legLen * 0.52], [(a[0] + a[1]) * m, legLen * 0.44]]);
      var base = far ? dark(pant, 0.14) : pant;
      volume(g, function (c) { limbPath(c, pts, hipW * 0.46, hipW * 0.26); },
        base, {
        axis: [sx - hipW * 0.4, 0, sx + hipW * 0.4, 0], light: -1,
        baseHex: pant, deep: far ? 0.42 : 0.6, lineW: 2, rim: far ? 0.42 : 0.30,
        detail: function (c) { folds(c, sx, hipY, pts[2][1], hipW * 0.5, 9, 0.22); }
      });
      var f = pts[2];
      volume(g, function (c) {
        c.beginPath();
        c.moveTo(f[0] - 20 * s, f[1] + 2 * s);
        c.quadraticCurveTo(f[0] - 22 * s, f[1] + 14 * s, f[0] - 8 * s, f[1] + 15 * s);
        c.lineTo(f[0] + m * 26 * s, f[1] + 15 * s);
        c.quadraticCurveTo(f[0] + m * 30 * s, f[1] + 4 * s, f[0] + 14 * s, f[1] - 2 * s);
        c.closePath();
      }, far ? '#0b0b10' : '#17171d', {
        axis: [0, f[1] + 16 * s, 0, f[1] - 4 * s], light: -1,
        baseHex: '#2a2a33', deep: 0.5, lineW: 1.8
      });
    }

    arm(true); leg(true);

    /* тулуб */
    g.save();
    g.translate(cx, shY); g.rotate(P.torso * 0.22); g.translate(-cx, -shY);

    var tH = hipY - shY;
    var chestW = shW * 0.62, waistW = Math.min(shW, hipW) * 0.46, hipW2 = hipW * 0.50;
    function torsoPath(c) {
      c.beginPath();
      c.moveTo(cx - shW * 0.44, shY);
      c.bezierCurveTo(cx - chestW, shY + tH * 0.12, cx - chestW * 0.96, shY + tH * 0.38, cx - waistW, shY + tH * 0.74);
      c.bezierCurveTo(cx - waistW, hipY - tH * 0.06, cx - hipW2, hipY - tH * 0.03, cx - hipW2, hipY);
      c.lineTo(cx + hipW2, hipY);
      c.bezierCurveTo(cx + hipW2, hipY - tH * 0.03, cx + waistW, hipY - tH * 0.06, cx + waistW, shY + tH * 0.74);
      c.bezierCurveTo(cx + chestW * 0.96, shY + tH * 0.38, cx + chestW, shY + tH * 0.12, cx + shW * 0.44, shY);
      c.quadraticCurveTo(cx, shY - bodyH * 0.026, cx - shW * 0.44, shY);
      c.closePath();
    }
    volume(g, torsoPath, cloth, {
      axis: [cx - chestW, 0, cx + chestW, 0], light: -1,
      baseHex: cloth, deep: 0.58, lineW: 2.4,
      detail: function (c) {
        folds(c, cx, shY + tH * 0.15, hipY, chestW * 1.4, 16, 0.18);
        ao(c, cx, shY + tH * 0.06, chestW * 0.9, tH * 0.10, 0.35);
        var bg = c.createLinearGradient(0, hipY, 0, shY);
        bg.addColorStop(0, 'rgba(255,240,215,0.12)');
        bg.addColorStop(0.45, 'rgba(0,0,0,0)');
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
      }
    });
    [-1, 1].forEach(function (sd) {
      volume(g, function (c) {
        c.beginPath();
        c.ellipse(cx + sd * shW * 0.40, shY + bodyH * 0.016, shW * 0.155, bodyH * 0.034, 0, 0, 6.3);
      }, cloth, {
        axis: [cx + sd * shW * 0.55, 0, cx + sd * shW * 0.25, 0], light: sd,
        baseHex: cloth, deep: 0.45, lineW: 1.8
      });
    });
    if (spec.decor) spec.decor(g, {
      cx: cx, shY: shY, hipY: hipY, shW: shW, hipW: hipW, s: s, bodyH: bodyH, tH: tH
    });
    g.restore();

    /* шия */
    (function () {
      var pts = [[cx, neckY - headR * 0.42], [cx, shY + bodyH * 0.012]];
      volume(g, function (c) { limbPath(c, pts, headR * 0.52, headR * 0.72); },
        dark(skin, 0.30), {
        axis: [cx - headR * 0.5, 0, cx + headR * 0.5, 0], light: -1,
        baseHex: skin, deep: 0.55, lineW: 1.8
      });
      ao(g, cx, neckY - headR * 0.25, headR * 0.7, headR * 0.35, 0.55);
    })();

    /* голова */
    g.save();
    g.translate(cx, neckY); g.rotate(P.headT * 0.45); g.translate(-cx, -neckY);
    drawFace(g, cx, headCy, headR, {
      skin: skin, dark: spec.dark, eye: spec.eye, brow: spec.brow || spec.hairCol,
      browAngle: spec.browAngle, browY: spec.browY, gaze: spec.gaze, pupil: spec.pupil,
      fem: spec.fem, jaw: spec.jaw, browThin: spec.browThin,
      mouthW: spec.mouthW, smile: spec.smile, glint: spec.glint,
      mouthOpen: P.mouth || 0
    });
    drawHair(g, cx, headCy, headR, spec.hairType, spec.hairCol);
    if (spec.headDecor) spec.headDecor(g, cx, headCy, headR);
    g.restore();

    leg(false); arm(false);

    if (spec.postDecor) spec.postDecor(g, {
      cx: cx, shY: shY, hipY: hipY, shW: shW, hipW: hipW, s: s, bodyH: bodyH, tH: hipY - shY
    });

    /* глобальне світло: яскраво знизу, темно згори */
    g.globalCompositeOperation = 'source-atop';
    var vg = g.createLinearGradient(0, bot, 0, top - bodyH * 0.1);
    vg.addColorStop(0.00, 'rgba(255,236,206,0.10)');
    vg.addColorStop(0.30, 'rgba(0,0,0,0)');
    vg.addColorStop(0.78, 'rgba(0,0,0,0.30)');
    vg.addColorStop(1.00, 'rgba(0,0,0,0.52)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';

    grain(g, 18);
  }

  /* ============================================================
     ОПИС ПЕРСОНАЖІВ
     ============================================================ */
  var SPEC = {
    hlib: {
      h: 1.80, headR: 0.071, torso: 0.245, shoulder: 0.168, hip: 0.140, arm: 0.51, handS: 1.25,
      cloth: '#8a8a82', pant: '#2a2c36',
      skin: '#c2a086', hairCol: '#3a2a1a', hairType: 'bowl', eye: '#4a3626', brow: '#3a2a1a',
      browAngle: 0.14, browY: -0.03, mouthW: 0.30, smile: 0.02, pupil: 0.34,
      decor: function (g, m) {
        g.save();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
        g.beginPath();
        g.moveTo(m.cx - m.shW * 0.30, m.shY + m.tH * 0.62);
        g.quadraticCurveTo(m.cx, m.shY + m.tH * 0.68, m.cx + m.shW * 0.30, m.shY + m.tH * 0.62);
        g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath();
        g.ellipse(m.cx, m.shY + m.tH * 0.03, m.shW * 0.40, m.tH * 0.10, 0, Math.PI, 0);
        g.fill();
        g.strokeStyle = '#ddd8c8'; g.lineWidth = 3.5;
        [-1, 1].forEach(function (s2) {
          g.beginPath();
          g.moveTo(m.cx + s2 * m.shW * 0.09, m.shY + m.tH * 0.03);
          g.quadraticCurveTo(m.cx + s2 * m.shW * 0.14, m.shY + m.tH * 0.16,
            m.cx + s2 * m.shW * 0.11, m.shY + m.tH * 0.26);
          g.stroke();
        });
        g.restore();
      }
    },
    titova: {
      h: 1.46, headR: 0.083, torso: 0.235, shoulder: 0.255, hip: 0.285, arm: 0.41, handS: 1.05,
      cloth: '#ddd6c4', pant: '#1e1e26',
      skin: '#c6a084', hairCol: '#c9ae74', hairType: 'bob', eye: '#3b4a5c', brow: '#8a7440',
      fem: true, jaw: 0.34, browThin: 0.70,
      browAngle: -0.30, browY: -0.04, mouthW: 0.20, smile: -0.7, pupil: 0.34,
      decor: function (g, m) {
        var w = m.shW * 0.80, x = m.cx - w / 2;
        embroidery(g, x, m.shY + m.tH * 0.14, w, 22 * m.s, '#8f1f2e', '#1b1b1f');
        embroidery(g, x, m.shY + m.tH * 0.34, w, 18 * m.s, '#1b1b1f', '#8f1f2e');
        g.save();
        g.translate(m.cx + m.shW * 0.46, m.shY + m.tH * 0.62); g.rotate(0.22);
        g.fillStyle = '#4e1d1a'; g.fillRect(-26 * m.s, -40 * m.s, 52 * m.s, 80 * m.s);
        g.fillStyle = '#c9c2ae'; g.fillRect(-26 * m.s, -40 * m.s, 8 * m.s, 80 * m.s);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
        g.strokeRect(-26 * m.s, -40 * m.s, 52 * m.s, 80 * m.s);
        g.restore();
      },
      headDecor: function (g, cx, cy, r) {
        g.save();
        [-1, 1].forEach(function (s) {
          g.strokeStyle = 'rgba(18,18,22,0.9)'; g.lineWidth = r * 0.062;
          g.beginPath(); g.ellipse(cx + s * r * 0.35, cy - r * 0.06, r * 0.31, r * 0.25, 0, 0, 6.3); g.stroke();
          g.fillStyle = 'rgba(200,220,255,0.10)';
          g.beginPath(); g.ellipse(cx + s * r * 0.35, cy - r * 0.06, r * 0.31, r * 0.25, 0, 0, 6.3); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = r * 0.035;
          g.beginPath();
          g.moveTo(cx + s * r * 0.35 - r * 0.18, cy + r * 0.04);
          g.lineTo(cx + s * r * 0.35 + r * 0.02, cy - r * 0.18);
          g.stroke();
        });
        g.strokeStyle = 'rgba(18,18,22,0.9)'; g.lineWidth = r * 0.062;
        g.beginPath(); g.moveTo(cx - r * 0.05, cy - r * 0.07); g.lineTo(cx + r * 0.05, cy - r * 0.07); g.stroke();
        g.restore();
      }
    },
    kopylov: {
      h: 2.62, headR: 0.050, torso: 0.262, shoulder: 0.146, hip: 0.112, arm: 0.61, handS: 1.7,
      cloth: '#2c3543', pant: '#1d242f',
      skin: '#9d8370', hairCol: '#14100c', hairType: 'crop', dark: true, glint: '#d8bd72',
      decor: function (g, m) {
        g.save();
        g.fillStyle = 'rgba(14,18,24,0.85)';
        [-1, 1].forEach(function (s) {
          g.beginPath();
          g.moveTo(m.cx + s * m.shW * 0.42, m.shY + 3);
          g.lineTo(m.cx + s * m.shW * 0.05, m.shY + m.tH * 0.40);
          g.lineTo(m.cx + s * m.shW * 0.26, m.shY + m.tH * 0.07);
          g.closePath(); g.fill();
        });
        g.fillStyle = '#b6b2c0';
        g.beginPath();
        g.moveTo(m.cx - m.shW * 0.09, m.shY + 2); g.lineTo(m.cx + m.shW * 0.09, m.shY + 2);
        g.lineTo(m.cx, m.shY + m.tH * 0.28); g.closePath(); g.fill();
        g.fillStyle = '#42293a';
        g.beginPath();
        g.moveTo(m.cx - 9 * m.s, m.shY + m.tH * 0.10);
        g.lineTo(m.cx + 9 * m.s, m.shY + m.tH * 0.10);
        g.lineTo(m.cx + 13 * m.s, m.shY + m.tH * 0.58);
        g.lineTo(m.cx, m.shY + m.tH * 0.70);
        g.lineTo(m.cx - 13 * m.s, m.shY + m.tH * 0.58);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.6; g.stroke();
        g.restore();
      }
    },
    kopylova: {
      h: 2.46, headR: 0.052, torso: 0.258, shoulder: 0.132, hip: 0.122, arm: 0.59, handS: 1.65,
      cloth: '#17171b', pant: '#4a4843',
      skin: '#9d8370', hairCol: '#14100c', hairType: 'bun', dark: true, glint: '#d8bd72', jaw: 0.33,
      decor: function (g, m) {
        var w = m.shW * 0.78, x = m.cx - w / 2;
        embroidery(g, x, m.shY + m.tH * 0.13, w, 20 * m.s, '#a8862a', '#5d3f0e');
        embroidery(g, x, m.shY + m.tH * 0.33, w, 16 * m.s, '#5d3f0e', '#a8862a');
      },
      /* спідниця малюється ПІСЛЯ ніг, інакше нога лягає поверх неї */
      postDecor: function (g, m) {
        volume(g, function (c) {
          c.beginPath();
          c.moveTo(m.cx - m.hipW * 0.54, m.hipY - m.tH * 0.10);
          c.lineTo(m.cx + m.hipW * 0.54, m.hipY - m.tH * 0.10);
          c.quadraticCurveTo(m.cx + m.hipW * 0.80, m.hipY + m.tH * 0.30,
            m.cx + m.hipW * 0.88, m.hipY + m.tH * 0.58);
          c.quadraticCurveTo(m.cx, m.hipY + m.tH * 0.70,
            m.cx - m.hipW * 0.88, m.hipY + m.tH * 0.58);
          c.quadraticCurveTo(m.cx - m.hipW * 0.80, m.hipY + m.tH * 0.30,
            m.cx - m.hipW * 0.54, m.hipY - m.tH * 0.10);
          c.closePath();
        }, '#4a4843', {
          axis: [m.cx - m.hipW * 0.9, 0, m.cx + m.hipW * 0.9, 0], light: -1,
          baseHex: '#6b6862', deep: 0.62, lineW: 2.2,
          detail: function (c) {
            folds(c, m.cx, m.hipY, m.hipY + m.tH * 0.58, m.hipW * 1.5, 12, 0.24);
            var bg = c.createLinearGradient(0, m.hipY + m.tH * 0.6, 0, m.hipY);
            bg.addColorStop(0, 'rgba(255,240,215,0.10)');
            bg.addColorStop(0.6, 'rgba(0,0,0,0)');
            c.fillStyle = bg; c.fillRect(0, 0, W, H);
          }
        });
      }
    },
    ksan: {
      h: 1.67, headR: 0.074, torso: 0.240, shoulder: 0.148, hip: 0.176, arm: 0.47, handS: 1.00,
      cloth: '#5c4a5a', pant: '#23232b',
      skin: '#d0ac92', hairCol: '#d8caa6', hairType: 'pixie', eye: '#5d6d7d', brow: '#b09a70',
      fem: true, jaw: 0.30, browThin: 0.50,
      browAngle: 0.01, mouthW: 0.22, smile: -0.1, pupil: 0.38,
      headDecor: function (g, cx, cy, r) {
        // сережки-краплі
        g.save();
        [-1, 1].forEach(function (s) {
          g.fillStyle = '#c9b06a';
          g.beginPath();
          g.ellipse(cx + s * r * 0.80, cy + r * 0.30, r * 0.045, r * 0.075, 0, 0, 6.3);
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
        });
        g.restore();
      },
      decor: function (g, m) {
        g.save();
        g.translate(m.cx + m.shW * 0.30, m.hipY - m.tH * 0.10); g.rotate(-0.12);
        for (var i = 0; i < 6; i++) {
          g.fillStyle = i % 2 ? '#ded8c4' : '#cfc9b4';
          g.fillRect(-34 * m.s, -4 * i * m.s, 68 * m.s, 48 * m.s);
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
          g.strokeRect(-34 * m.s, -4 * i * m.s, 68 * m.s, 48 * m.s);
        }
        g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = 1.4;
        for (var k = 0; k < 5; k++) {
          g.beginPath();
          g.moveTo(-28 * m.s, (-20 + k * 8) * m.s);
          g.lineTo((-28 + 40 + Math.random() * 16) * m.s, (-20 + k * 8) * m.s);
          g.stroke();
        }
        g.restore();
      }
    },
    kostik: {
      h: 1.71, headR: 0.080, torso: 0.246, shoulder: 0.200, hip: 0.185, arm: 0.40, handS: 1.0,
      cloth: '#191920', pant: '#2b3340',
      skin: '#d2ae92', hairCol: '#b86e28', hairType: 'crop', eye: '#4a6a8a', brow: '#93551f',
      browAngle: 0.08, mouthW: 0.28, smile: 0.55, pupil: 0.42,
      decor: function (g, m) {
        g.save();
        g.fillStyle = '#e6e2d4';
        g.beginPath(); g.arc(m.cx - 14 * m.s, m.shY + m.tH * 0.34, 20 * m.s, 0, 6.3); g.fill();
        g.fillStyle = '#191920';
        g.beginPath(); g.arc(m.cx - 14 * m.s, m.shY + m.tH * 0.34, 13 * m.s, 0, 6.3); g.fill();
        g.font = (17 * m.s) + 'px monospace'; g.fillStyle = '#e6e2d4';
        g.fillText('1010', m.cx + 10 * m.s, m.shY + m.tH * 0.31);
        g.fillText('0101', m.cx + 10 * m.s, m.shY + m.tH * 0.40);
        g.restore();
      }
    },
    nazar: {
      h: 1.93, headR: 0.068, torso: 0.245, shoulder: 0.148, hip: 0.126, arm: 0.52, handS: 1.2,
      cloth: '#98988f', pant: '#2a2a32',
      skin: '#ccab91', hairCol: '#2c1e14', hairType: 'bowl', eye: '#3a2a1a', brow: '#2c1e14',
      browAngle: 0.05, mouthW: 0.30, smile: 0.45, pupil: 0.40
    }
  };

  /* ---------- сніговик ---------- */
  function drawSnow(g) {
    g.clearRect(0, 0, W, H);
    var cx = W / 2, bot = H - 50;
    var R = [150, 108, 78], y = bot;
    for (var i = 0; i < 3; i++) {
      y -= R[i] * (i ? 1.52 : 1.0);
      (function (yy, rr) {
        volume(g, function (c) { c.beginPath(); c.arc(cx, yy, rr, 0, 6.3); },
          '#e9eef4', {
          axis: [cx - rr, 0, cx + rr, 0], light: -1, baseHex: '#ffffff',
          deep: 0.62, lineW: 2.2, lineA: 0.35,
          detail: function (c) {
            var lg = c.createLinearGradient(0, yy + rr, 0, yy - rr);
            lg.addColorStop(0, 'rgba(255,245,225,0.22)');
            lg.addColorStop(0.5, 'rgba(0,0,0,0)');
            lg.addColorStop(1, 'rgba(20,30,50,0.35)');
            c.fillStyle = lg; c.fillRect(0, 0, W, H);
            for (var k = 0; k < 70; k++) {
              c.globalAlpha = 0.04 + Math.random() * 0.07;
              c.fillStyle = Math.random() < .5 ? '#ffffff' : '#93a7bb';
              c.beginPath();
              c.arc(cx + (Math.random() - .5) * rr * 1.8, yy + (Math.random() - .5) * rr * 1.8,
                3 + Math.random() * 14, 0, 6.3);
              c.fill();
            }
            c.globalAlpha = 1;
          }
        });
      })(y, R[i]);
    }
    var hy = y;
    g.strokeStyle = '#2b2118'; g.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      g.lineWidth = 10;
      g.beginPath(); g.moveTo(cx + s * 95, bot - 330); g.lineTo(cx + s * 236, bot - 440); g.stroke();
      g.lineWidth = 6;
      g.beginPath(); g.moveTo(cx + s * 190, bot - 405); g.lineTo(cx + s * 238, bot - 345); g.stroke();
      g.beginPath(); g.moveTo(cx + s * 215, bot - 424); g.lineTo(cx + s * 268, bot - 470); g.stroke();
    });
    [-1, 1].forEach(function (s) {
      ao(g, cx + s * 28, hy - 12, 22, 18, 0.5);
      g.fillStyle = '#0a0a0c';
      g.beginPath(); g.arc(cx + s * 28, hy - 12, 11, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(cx + s * 28 - 3, hy - 16, 3, 0, 6.3); g.fill();
      g.strokeStyle = '#2b2118'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx + s * 12, hy - 42); g.lineTo(cx + s * 44, hy - 28); g.stroke();
    });
    volume(g, function (c) {
      c.beginPath(); c.moveTo(cx + 2, hy + 4); c.lineTo(cx + 12, hy + 20);
      c.lineTo(cx - 56, hy + 24); c.closePath();
    }, '#c8661a', { axis: [0, hy, 0, hy + 24], light: -1, baseHex: '#e08a30', deep: 0.5, lineW: 2 });
    g.fillStyle = '#0a0a0c';
    for (var k2 = 0; k2 < 10; k2++) {
      var a = -1.08 + k2 * 0.24;
      g.beginPath(); g.arc(cx + Math.sin(a) * 44, hy + 42 + Math.cos(a) * 14, 5.5, 0, 6.3); g.fill();
    }
    for (var b = 0; b < 3; b++) {
      g.beginPath(); g.arc(cx, bot - 268 + b * 56, 10, 0, 6.3); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    var vg = g.createLinearGradient(0, bot, 0, bot - 700);
    vg.addColorStop(0, 'rgba(255,238,210,0.12)');
    vg.addColorStop(0.4, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,18,36,0.40)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    grain(g, 14);
  }

  /* ============================================================
     ПУБЛІЧНЕ
     ============================================================ */
  var cache = {};

  function make(key, poseName) {
    var id = key + '|' + poseName;
    if (cache[id]) return cache[id];
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    if (key === 'snow') drawSnow(g);
    else drawFigure(g, SPEC[key], poseName);
    var t = new global.THREE.CanvasTexture(c);
    t.minFilter = global.THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    cache[id] = t;
    return t;
  }

  global.Art = {
    W: W, H: H, SPEC: SPEC, POSE: POSE, POSE_KEYS: POSE_KEYS,
    make: make,
    height: function (key) { return key === 'snow' ? 1.9 : SPEC[key].h; }
  };

})(window);
