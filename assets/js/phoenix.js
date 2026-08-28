/*
 * Emberworks — WebGL particle phoenix
 * Original implementation. Builds a bird silhouette out of GPU points,
 * animates a wing flap, and lets embers drift up with curl-like noise.
 * Reacts to pointer movement and scroll.
 */
(function () {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("phoenix-canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio = renderer.setPixelRatio || function () {};
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  // ---- Build the phoenix point cloud --------------------------------------
  // We describe the bird parametrically: a body spine plus two feathered wings.
  const COUNT = 14000;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);        // per-point randomness
  const wingSide = new Float32Array(COUNT);     // -1 left, +1 right, 0 body
  const wingSpan = new Float32Array(COUNT);     // 0..1 distance out the wing
  const sizes = new Float32Array(COUNT);
  const colors = new Float32Array(COUNT * 3);

  const cEmber = new THREE.Color(0xff5a1f);
  const cGold = new THREE.Color(0xffb020);
  const cDeep = new THREE.Color(0x7a1f00);

  let i = 0;
  function push(x, y, z, side, span, sizeMul) {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds[i] = Math.random();
    wingSide[i] = side;
    wingSpan[i] = span;
    sizes[i] = (0.5 + Math.random() * 0.9) * sizeMul;
    // color grades from deep red (inner) to gold (tips/embers)
    const t = Math.min(1, span * 0.7 + Math.random() * 0.4);
    const col = cDeep.clone().lerp(cEmber, Math.min(1, t * 1.6)).lerp(cGold, Math.max(0, t - 0.55) * 2.2);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    i++;
  }

  // Body spine (from tail up through head)
  const bodyN = Math.floor(COUNT * 0.16);
  for (let b = 0; b < bodyN; b++) {
    const t = b / bodyN;                 // 0 tail .. 1 head
    const y = -3.2 + t * 6.6;
    const bodyWidth = Math.sin(t * Math.PI) * 0.55 + 0.12;
    const ang = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5) * bodyWidth;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r * 0.6;
    push(x, y, z, 0, 0.15, 1.0);
  }

  // Wings (feather field). Each wing spreads out along a curved leading edge.
  const wingN = COUNT - bodyN;
  for (let w = 0; w < wingN; w++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const span = Math.pow(Math.random(), 0.65);          // out toward the tip
    // feather position along the wing chord
    const chord = Math.random();                          // 0 front edge .. 1 trailing
    const baseX = side * (0.3 + span * 5.4);
    // leading edge sweeps up then trails down -> classic phoenix arc
    const arc = Math.sin(span * Math.PI * 0.85) * 2.4;
    const trail = -chord * (0.6 + span * 2.6);
    const y = 1.4 + arc + trail + (Math.random() - 0.5) * 0.3;
    const x = baseX + (Math.random() - 0.5) * 0.4;
    const z = (Math.random() - 0.5) * 0.8 - span * 0.5;
    push(x, y, z, side, span, 0.8 + span * 0.6);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aSide", new THREE.BufferAttribute(wingSide, 1));
  geo.setAttribute("aSpan", new THREE.BufferAttribute(wingSpan, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const uniforms = {
    uTime: { value: 0 },
    uFlap: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uFlap;
      uniform vec2 uPointer;
      uniform float uScroll;
      uniform float uPixelRatio;
      attribute float aSeed;
      attribute float aSide;
      attribute float aSpan;
      attribute float aSize;
      varying vec3 vColor;
      varying float vAlpha;

      // cheap pseudo-noise
      float hash(float n){ return fract(sin(n)*43758.5453123); }

      void main(){
        vColor = color;
        vec3 p = position;

        // ---- wing flap: rotate wing points around the body spine (x=0) ----
        float flap = sin(uTime * 2.2) * 0.5 + 0.5;      // 0..1
        flap = mix(0.15, 1.0, flap) * uFlap;
        float bend = flap * aSpan * 1.15 * aSide;         // outer feathers move more
        // rotate around Z so wings sweep up/down
        float ca = cos(bend), sa = sin(bend);
        float nx = p.x * ca - p.y * sa * 0.0 + p.x * 0.0; // keep x
        p.y += -abs(p.x) * flap * 0.28 * aSpan;           // dip toward body on downstroke
        p.z += sin(uTime * 2.2 + aSpan * 3.0) * aSpan * 0.5 * uFlap;

        // ---- ember drift: everything shimmers upward a touch ----
        float t = uTime * 0.6 + aSeed * 6.2831;
        p.x += sin(t + p.y) * 0.06 * (0.4 + aSpan);
        p.y += cos(t * 0.8) * 0.05;
        p.z += sin(t * 1.3 + aSide) * 0.06;

        // rising embers: a fraction of points detach and float up
        float emberPhase = fract(aSeed * 3.0 + uTime * 0.12);
        float isEmber = step(0.82, aSeed);
        p.y += isEmber * emberPhase * 4.0;
        p.x += isEmber * sin(emberPhase * 9.0 + aSeed * 20.0) * 0.6;

        // ---- gentle idle rotation of the whole bird ----
        float rot = sin(uTime * 0.15) * 0.12 + uPointer.x * 0.25;
        float cr = cos(rot), sr = sin(rot);
        p = vec3(p.x * cr + p.z * sr, p.y, -p.x * sr + p.z * cr);

        // pointer parallax + scroll lift
        p.x += uPointer.x * 0.6;
        p.y += uPointer.y * 0.4 + uScroll * 3.0;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float twinkle = 0.6 + 0.4 * sin(uTime * 3.0 + aSeed * 30.0);
        gl_PointSize = aSize * uPixelRatio * (140.0 / -mv.z) * twinkle;

        // fade embers as they climb; fade edges softly
        vAlpha = mix(0.9, 0.0, isEmber * emberPhase) * (0.55 + 0.45 * twinkle);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * (0.7 + glow), glow * vAlpha);
      }
    `,
  });
  material.vertexColors = true;

  const points = new THREE.Points(geo, material);
  points.position.y = 0.5;
  scene.add(points);

  // ---- Interaction --------------------------------------------------------
  const pointerTarget = new THREE.Vector2(0, 0);
  window.addEventListener("pointermove", (e) => {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  let scrollTarget = 0;
  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  });

  // expose a hook so the preloader can trigger the "ignite" reveal
  window.__phoenixIgnite = function () {
    const start = performance.now();
    const dur = 2200;
    (function ramp(now) {
      const k = Math.min(1, (now - start) / dur);
      uniforms.uFlap.value = k * k;
      if (k < 1) requestAnimationFrame(ramp);
    })(performance.now());
  };

  // ---- Loop ---------------------------------------------------------------
  const clock = new THREE.Clock();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function animate() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = reduce ? t * 0.3 : t;
    uniforms.uPointer.value.x += (pointerTarget.x - uniforms.uPointer.value.x) * 0.05;
    uniforms.uPointer.value.y += (pointerTarget.y - uniforms.uPointer.value.y) * 0.05;
    uniforms.uScroll.value += (scrollTarget - uniforms.uScroll.value) * 0.06;
    points.rotation.y = uniforms.uScroll.value * 0.4;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
