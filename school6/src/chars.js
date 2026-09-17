/* ============================================================
   chars.js — персонажі як 2D-картки в 3D-світі
   (підхід No, I'm not a Human: мальована фігура-білборд,
   яка завжди повернута до глядача)
   Рухи немає: миттєвий стрибок між вузлами + зміна пози,
   як аніматроніки FNAF.
   ============================================================ */
(function (global) {
  'use strict';

  var T = global.THREE, A = global.Art;

  /* ---------- вузли переміщення ---------- */
  var N = {
    STREET: [1.5, -16.0],
    VEST: [0.0, -10.6],
    C1_E: [-3.6, -7.1], C1_M: [-8.5, -7.1], C1_W: [-13.5, -7.1],
    C2_W: [3.6, -7.1], C2_M: [8.5, -7.1], C2_E: [13.5, -7.1],
    C11_N: [-13.5, -3.0], C11_S: [-13.5, 5.5],
    C22_N: [13.5, -3.0], C22_S: [13.5, 5.5],
    CANT_W: [-7.5, 4.5], CANT_E: [7.5, 4.5], CANT_C: [0.0, 2.0], CANT_N: [0.0, -4.3],
    DOOR_L: [-2.95, -6.45], DOOR_R: [2.95, -6.45], DOOR_B: [0.0, -4.85],
    GLASS: [0.2, -8.25]
  };

  var ROUTE = {
    L_OUT: ['STREET', 'VEST', 'C1_E', 'DOOR_L'],
    R_OUT: ['STREET', 'VEST', 'C2_W', 'DOOR_R'],
    L_IN: ['C1_W', 'C1_M', 'C1_E', 'DOOR_L'],
    R_IN: ['C2_E', 'C2_M', 'C2_W', 'DOOR_R'],
    BACK_W: ['C11_N', 'C11_S', 'CANT_W', 'CANT_C', 'CANT_N', 'DOOR_B'],
    BACK_E: ['C22_N', 'C22_S', 'CANT_E', 'CANT_C', 'CANT_N', 'DOOR_B'],
    GLASS_L: ['C1_W', 'C1_M', 'C1_E', 'GLASS'],
    GLASS_R: ['C2_E', 'C2_M', 'C2_W', 'GLASS']
  };

  /* ============================================================
     БІЛБОРД
     ============================================================ */
  var PAD_BOT = 34 / A.H;          // відступ під ногами на полотні
  var USABLE = (A.H - 34 - 30) / A.H;

  function billboard(key) {
    var h = A.height(key);
    var planeH = h / USABLE;
    var planeW = planeH * (A.W / A.H);

    /* Світлотінь у персонажа вже НАМАЛЬОВАНА на картці.
       Якщо освітлювати її сценою повністю, ліхтар «засвічує» малюнок
       і фігура стає пласкою. Тому картка частково світиться сама
       (emissiveMap), а світло сцени лише додається згори:
         у темряві  — видно тьмяний силует із власною тінню
         під ліхтарем — малюнок не вигорає                          */
    var tex = A.make(key, 'stand');
    var mat = new T.MeshLambertMaterial({
      map: tex,
      color: 0x9c9c9c,
      emissiveMap: tex,
      emissive: new T.Color(0x4e4e4e),
      transparent: true,
      alphaTest: 0.38,
      side: T.DoubleSide
    });
    var m = new T.Mesh(new T.PlaneGeometry(planeW, planeH), mat);
    m.castShadow = true;
    m.userData = {
      key: key, h: h, planeH: planeH,
      baseY: planeH / 2 - planeH * PAD_BOT,
      billboard: true
    };
    m.position.y = m.userData.baseY;
    return m;
  }

  /* ---------- опис персонажів ---------- */
  var DEF = [
    {
      key: 'hlib', name: 'ГЛІБ',
      routes: ['L_OUT', 'R_OUT', 'L_IN', 'R_IN', 'BACK_W', 'BACK_E'],
      step: 5.2, window: 5.5, defense: 'shutter',
      color: '#c9a227', talks: true
    },
    {
      key: 'titova', name: 'ТІТОВА',
      routes: ['L_IN', 'R_IN', 'BACK_W', 'BACK_E'],
      step: 6.6, window: 4.5, defense: 'hide',
      color: '#a2417c'
    },
    {
      key: 'kopylov', name: 'КОПИЛОВ',
      routes: ['L_IN'], step: 5.8, window: 4.0, defense: 'shutter',
      color: '#4f7fa8', pairWith: 'kopylova'
    },
    {
      key: 'kopylova', name: 'КОПИЛОВА',
      routes: ['R_IN'], step: 5.8, window: 4.0, defense: 'shutter',
      color: '#4f7fa8', pairOf: 'kopylov'
    },
    {
      key: 'ksan', name: 'КСАН ПАВЛВНА',
      routes: ['GLASS_L', 'GLASS_R'], step: 6.0, window: 2.0, defense: 'math',
      color: '#c7c0b0'
    }
  ];

  var HELPERS = [
    { key: 'kostik', name: 'КОСТІК', color: '#9fb03a' },
    { key: 'nazar', name: 'НАЗАР', color: '#9fb03a' }
  ];

  /* ============================================================
     ЕКЗЕМПЛЯР
     ============================================================ */
  function Char(def, scene) {
    this.def = def;
    this.key = def.key;
    this.mesh = billboard(def.key);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.pose = 'stand';
    this.phase = Math.random() * 6.3;
    this.reset(true);
  }

  Char.prototype.reset = function (full) {
    this.state = 'idle';
    this.route = null; this.idx = 0; this.wait = 0;
    this.cool = full ? 6 + Math.random() * 14 : 9 + Math.random() * 13;
    this.mesh.visible = false;
    this.windowT = 0;
    this.node = null;
  };

  Char.prototype.spawn = function (routeKey) {
    this.route = ROUTE[routeKey || this.def.routes[Math.floor(Math.random() * this.def.routes.length)]];
    this.idx = 0; this.state = 'stalk';
    this.snapTo(this.route[0]);
  };

  Char.prototype.applyPose = function (name) {
    this.pose = name;
    var t = A.make(this.key, name);
    this.mesh.material.map = t;
    this.mesh.material.emissiveMap = t;
    this.mesh.material.needsUpdate = true;
  };

  /* Мікрорух: ледь помітне похитування. Картка НЕ анімується. */
  Char.prototype.microIdle = function (t) {
    var u = this.mesh.userData;
    this.mesh.position.y = u.baseY + Math.sin(t * 0.8 + this.phase) * 0.006;
    this.mesh.rotation.z = Math.sin(t * 0.55 + this.phase) * 0.006;
  };

  /* Миттєвий стрибок у вузол + нова застигла поза. */
  Char.prototype.snapTo = function (nodeName) {
    var p = N[nodeName];
    this.node = nodeName;
    this.mesh.position.set(p[0], this.mesh.userData.baseY, p[1]);
    this.mesh.visible = true;
    var keys = A.POSE_KEYS;
    this.applyPose(keys[Math.floor(Math.random() * keys.length)]);
  };

  /* поза «кидається на тебе» — для скрімера */
  Char.prototype.lunge = function () { this.applyPose('lunge'); };

  Char.prototype.pos = function () {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  };

  /* білборд: розвернути до камери (тільки по Y) */
  function faceCamera(mesh, camPos) {
    if (!mesh.userData || !mesh.userData.billboard) return;
    mesh.rotation.y = Math.atan2(camPos.x - mesh.position.x, camPos.z - mesh.position.z);
  }

  global.Chars = {
    N: N, ROUTE: ROUTE, DEF: DEF, HELPERS: HELPERS, Char: Char,
    billboard: billboard, faceCamera: faceCamera
  };

})(window);
