// Cenas 3D da Central (three.js). Leves: limitam a resolução, pausam fora da tela e respeitam "reduzir movimento".
(function () {
  "use strict";
  var REDUZ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ok() { return !!window.THREE; }

  function base(canvas, opts) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: !!opts.alpha, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dpr || 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.1, 400);
    var vivo = true, visivel = true, raf = 0, ro, io;
    function tamanho() {
      var w = canvas.clientWidth || canvas.parentNode.clientWidth, h = canvas.clientHeight || canvas.parentNode.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (opts.onResize) opts.onResize(w, h);
    }
    ro = new ResizeObserver(tamanho); ro.observe(canvas);
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel && vivo && !raf) laco(); });
      io.observe(canvas);
    }
    var t0 = performance.now();
    function laco() {
      raf = 0;
      if (!vivo) return;
      var t = (performance.now() - t0) / 1000;
      opts.frame(t);
      renderer.render(scene, camera);
      if (!REDUZ && visivel && !document.hidden) raf = requestAnimationFrame(laco);
    }
    function aoVoltar() { if (!document.hidden && vivo && !raf) laco(); }
    document.addEventListener("visibilitychange", aoVoltar);
    tamanho();
    return {
      renderer: renderer, scene: scene, camera: camera, laco: laco,
      redesenhar: function () { if (!raf) laco(); },
      parar: function () {
        vivo = false; cancelAnimationFrame(raf); ro.disconnect(); if (io) io.disconnect();
        document.removeEventListener("visibilitychange", aoVoltar);
        scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        renderer.dispose();
      }
    };
  }

  // Tela de entrada: um terreno de barras vivo, como um mapa de resultados respirando.
  function login(canvas) {
    if (!ok()) return { parar: function () {} };
    var COLS = 38, ROWS = 24, ESP = 1.12;
    var mx = 0, my = 0;
    var b = base(canvas, {
      fov: 38, dpr: 1.5,
      frame: function (t) {
        var i = 0, c = new THREE.Color();
        for (var x = 0; x < COLS; x++) {
          for (var z = 0; z < ROWS; z++) {
            var fx = x - COLS / 2, fz = z - ROWS / 2;
            var d = Math.sqrt(fx * fx + fz * fz);
            var h = 0.25 + (Math.sin(fx * 0.32 + t * 0.9) * Math.cos(fz * 0.27 + t * 0.6) + 1) * 1.25
              + Math.max(0, 3.6 - d * 0.32) * (0.75 + 0.25 * Math.sin(t * 1.4 - d * 0.5));
            dummy.position.set(fx * ESP, 0, fz * ESP);
            dummy.scale.set(1, h, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            var k = Math.min(1, Math.max(0, (h - 0.6) / 4.2));
            c.copy(baixo).lerp(meio, Math.min(1, k * 1.6)).lerp(alto, Math.max(0, k - 0.45) * 1.8);
            mesh.setColorAt(i, c);
            i++;
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        var ang = t * 0.06;
        var r = 30;
        b.camera.position.set(Math.sin(ang) * r + mx * 3, 15 + my * 2, Math.cos(ang) * r);
        b.camera.lookAt(0, 1.5, 0);
        luzMovel.position.set(Math.sin(t * 0.5) * 12, 9, Math.cos(t * 0.5) * 12);
      }
    });
    var scene = b.scene;
    scene.background = new THREE.Color(0x0a0d0c);
    scene.fog = new THREE.Fog(0x0a0d0c, 24, 58);
    var geo = new THREE.BoxGeometry(0.92, 1, 0.92); geo.translate(0, 0.5, 0);
    var mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.25 });
    var mesh = new THREE.InstancedMesh(geo, mat, COLS * ROWS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    var dummy = new THREE.Object3D();
    var baixo = new THREE.Color(0x1b201e), meio = new THREE.Color(0x4a5450), alto = new THREE.Color(0xff6a3d);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    var sol = new THREE.DirectionalLight(0xfff1e8, 0.9); sol.position.set(-10, 20, 8); scene.add(sol);
    var luzMovel = new THREE.PointLight(0xff6a3d, 1.6, 40); scene.add(luzMovel);
    function mover(e) { var p = e.touches ? e.touches[0] : e; mx = (p.clientX / innerWidth - 0.5); my = (p.clientY / innerHeight - 0.5); }
    addEventListener("pointermove", mover, { passive: true });
    b.laco();
    return { parar: function () { removeEventListener("pointermove", mover); b.parar(); } };
  }

  // Visão geral: receita (frente) e investimento (fundo) por dia, em barras 3D que dá para girar.
  function horizonte(canvas, dados) {
    if (!ok()) return { atualizar: function () {}, parar: function () {} };
    var yaw = -0.5, alvoYaw = -0.5, arrastando = false, ultimoX = 0, inicioAnim = 0, n = 0;
    var meshA, meshB, chao, grade, asp = 2;
    var b = base(canvas, {
      alpha: true, fov: 32,
      onResize: function (w, h) { asp = w / h; },
      frame: function (t) {
        if (!arrastando && !REDUZ) alvoYaw = -0.5 + Math.sin(t * 0.18) * 0.28;
        yaw += (alvoYaw - yaw) * 0.06;
        var larg = Math.max(12, n * 0.62);
        var r = (larg * 1.0 + 6) * Math.max(1, 1.9 / asp);
        b.camera.position.set(Math.sin(yaw) * r, larg * 0.36 + 2.5, Math.cos(yaw) * r);
        b.camera.lookAt(0, 1.6, 0);
        var p = REDUZ ? 1 : Math.min(1, (performance.now() - inicioAnim) / 1100);
        var e = 1 - Math.pow(1 - p, 3);
        aplicar(meshA, alturasA, e, 0.55);
        aplicar(meshB, alturasB, e, -0.55);
      }
    });
    var scene = b.scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var sol = new THREE.DirectionalLight(0xffffff, 0.85); sol.position.set(-8, 16, 10); scene.add(sol);
    var contra = new THREE.DirectionalLight(0xffffff, 0.3); contra.position.set(10, 6, -10); scene.add(contra);
    var dummy = new THREE.Object3D(), alturasA = [], alturasB = [];
    var geo = new THREE.BoxGeometry(0.46, 1, 0.46); geo.translate(0, 0.5, 0);

    function aplicar(mesh, alt, e, z) {
      if (!mesh) return;
      for (var i = 0; i < alt.length; i++) {
        dummy.position.set((i - (alt.length - 1) / 2) * 0.62, 0, z);
        dummy.scale.set(1, Math.max(0.02, alt[i] * e), 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    function montar(d) {
      [meshA, meshB, chao, grade].forEach(function (o) { if (o) { scene.remove(o); o.material.dispose(); if (o.geometry !== geo) o.geometry.dispose(); } });
      var a = d.a || [], bb = d.b || [];
      n = a.length;
      var max = Math.max.apply(null, a.concat(bb).concat([1]));
      var H = 5.6;
      // raiz quadrada: um dia muito acima dos outros não achata o resto do gráfico
      alturasA = a.map(function (v) { return Math.sqrt(Math.max(0, v) / max) * H; });
      alturasB = bb.map(function (v) { return Math.sqrt(Math.max(0, v) / max) * H; });
      var corA = new THREE.Color(d.corA || "#e8552b"), corB = new THREE.Color(d.corB || "#3360c8");
      meshA = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }), Math.max(1, n));
      var claro = corA.clone().lerp(new THREE.Color(0xffffff), 0.35);
      for (var i = 0; i < n; i++) { var k = alturasA[i] / H; meshA.setColorAt(i, claro.clone().lerp(corA, Math.min(1, k * 1.4))); }
      meshB = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: corB, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.55 }), Math.max(1, bb.length || 1));
      scene.add(meshA); scene.add(meshB);
      var larg = Math.max(12, n * 0.62) + 3;
      chao = new THREE.Mesh(new THREE.PlaneGeometry(larg, 4.2), new THREE.MeshStandardMaterial({ color: new THREE.Color(d.chao || "#f2f3f1"), roughness: 1, transparent: true, opacity: 0.9 }));
      chao.rotation.x = -Math.PI / 2; chao.position.y = -0.01; scene.add(chao);
      grade = new THREE.GridHelper(larg, Math.round(larg / 0.62), new THREE.Color(d.linha || "#dfe2de"), new THREE.Color(d.linha || "#dfe2de"));
      grade.scale.z = 4.2 / larg; grade.position.y = 0; scene.add(grade);
      inicioAnim = performance.now();
      b.redesenhar();
    }
    canvas.addEventListener("pointerdown", function (e) { arrastando = true; ultimoX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) { if (!arrastando) return; alvoYaw += (e.clientX - ultimoX) * 0.008; alvoYaw = Math.max(-1.3, Math.min(1.3, alvoYaw)); ultimoX = e.clientX; b.redesenhar(); });
    function soltar() { arrastando = false; }
    canvas.addEventListener("pointerup", soltar); canvas.addEventListener("pointercancel", soltar);
    montar(dados);
    return { atualizar: montar, parar: b.parar };
  }

  window.C3D = { login: login, horizonte: horizonte, disponivel: ok };
})();
