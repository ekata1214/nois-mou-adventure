import * as THREE from 'three';
function makeFlareTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.2, "rgba(220,240,255,0.9)");
  core.addColorStop(0.55, "rgba(140,190,255,0.18)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "lighter";
  const streak = (w, h, alpha) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.35, `rgba(200,230,255,${alpha * 0.45})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  streak(size * 0.95, size * 0.06, 0.95);
  streak(size * 0.06, size * 0.95, 0.95);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function randomSpherePoint(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = Math.PI * 2 * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * (0.82 + Math.random() * 0.18);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

export function createStarfield(scene, manifest) {
  const group = new THREE.Group();
  const starCount = manifest?.starCount ?? 2800;
  const brightCount = manifest?.brightStarCount ?? 48;
  const radius = manifest?.starRadius ?? 120;

  const dimPositions = new Float32Array(starCount * 3);
  const dimColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const p = randomSpherePoint(radius);
    dimPositions[i * 3] = p.x;
    dimPositions[i * 3 + 1] = p.y;
    dimPositions[i * 3 + 2] = p.z;
    const tint = 0.75 + Math.random() * 0.25;
    dimColors[i * 3] = tint;
    dimColors[i * 3 + 1] = tint;
    dimColors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
  }

  const dimGeo = new THREE.BufferGeometry();
  dimGeo.setAttribute("position", new THREE.BufferAttribute(dimPositions, 3));
  dimGeo.setAttribute("color", new THREE.BufferAttribute(dimColors, 3));
  const dimMat = new THREE.PointsMaterial({
    size: manifest?.starSize ?? 0.55,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const dimStars = new THREE.Points(dimGeo, dimMat);
  group.add(dimStars);

  const flareTexture = makeFlareTexture();
  const brightPositions = new Float32Array(brightCount * 3);
  const brightSizes = new Float32Array(brightCount);
  const twinklePhase = new Float32Array(brightCount);
  for (let i = 0; i < brightCount; i += 1) {
    const p = randomSpherePoint(radius * 0.96);
    brightPositions[i * 3] = p.x;
    brightPositions[i * 3 + 1] = p.y;
    brightPositions[i * 3 + 2] = p.z;
    brightSizes[i] = 3.5 + Math.random() * 5.5;
    twinklePhase[i] = Math.random() * Math.PI * 2;
  }

  const brightGeo = new THREE.BufferGeometry();
  brightGeo.setAttribute("position", new THREE.BufferAttribute(brightPositions, 3));
  brightGeo.setAttribute("size", new THREE.BufferAttribute(brightSizes, 1));
  const brightMat = new THREE.PointsMaterial({
    map: flareTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xe8f2ff,
    size: 6,
    sizeAttenuation: true,
    opacity: 0.95,
  });
  const brightStars = new THREE.Points(brightGeo, brightMat);
  group.add(brightStars);

  scene.add(group);

  return {
    group,
    dimStars,
    brightStars,
    twinklePhase,
    brightSizes,
    update(time) {
      group.rotation.y = time * 0.008;
      const sizes = brightGeo.attributes.size.array;
      for (let i = 0; i < brightCount; i += 1) {
        const pulse = 0.72 + Math.sin(time * (0.7 + (i % 5) * 0.11) + twinklePhase[i]) * 0.28;
        sizes[i] = brightSizes[i] * pulse;
      }
      brightGeo.attributes.size.needsUpdate = true;
      dimMat.opacity = 0.82 + Math.sin(time * 0.15) * 0.04;
    },
    dispose() {
      dimGeo.dispose();
      dimMat.dispose();
      brightGeo.dispose();
      brightMat.dispose();
      flareTexture.dispose();
      scene.remove(group);
    },
  };
}
