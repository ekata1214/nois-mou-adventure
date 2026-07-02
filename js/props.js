const PROPS_BY_REGION = {
  ki: ["summer_sun", "beach_parasol", "watermelon", "sunflower", "summer_sign"],
  nu: ["maple_tree", "leaf_pile", "harvest_moon", "persimmon", "autumn_sign"],
  ai: ["rain_umbrella", "puddle", "hydrangea", "rain_post", "tsuyu_sign"],
  raku: ["sunset_sun", "street_lamp", "evening_bench", "evening_cloud", "sunset_sign"],
};

const DRAWERS = {
  summer_sun(ctx, x, y, t) {
    const pulse = 1 + Math.sin(t * 1.5) * 0.06;
    const r = 22 * pulse;
    ctx.fillStyle = "rgba(255, 220, 60, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y - 8, r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.arc(x, y - 8, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff0a0";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r + 4), y - 8 + Math.sin(a) * (r + 4));
      ctx.lineTo(x + Math.cos(a) * (r + 14), y - 8 + Math.sin(a) * (r + 14));
      ctx.stroke();
    }
  },

  beach_parasol(ctx, x, y) {
    ctx.strokeStyle = "#c8a030";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 36);
    ctx.stroke();
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.moveTo(x, y - 36);
    ctx.lineTo(x - 28, y - 18);
    ctx.lineTo(x + 28, y - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff8d0";
    ctx.beginPath();
    ctx.moveTo(x, y - 36);
    ctx.lineTo(x - 14, y - 22);
    ctx.lineTo(x + 14, y - 22);
    ctx.closePath();
    ctx.fill();
  },

  watermelon(ctx, x, y) {
    ctx.fillStyle = "#3a7a40";
    ctx.beginPath();
    ctx.arc(x, y, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#e83040";
    ctx.beginPath();
    ctx.arc(x, y, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#1a3018";
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(x + i * 5 - 1, y - 10, 2, 10);
    }
  },

  sunflower(ctx, x, y, t) {
    const sway = Math.sin(t + x * 0.01) * 2;
    ctx.strokeStyle = "#4a6a20";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y - 18, x + sway * 0.5, y - 32);
    ctx.stroke();
    const fy = y - 34;
    const fx = x + sway * 0.5;
    ctx.fillStyle = "#5a4018";
    ctx.beginPath();
    ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd84d";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * 10, fy + Math.sin(a) * 10, 4, 7, a, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  summer_sign(ctx, x, y) {
    drawSign(ctx, x, y, "夏", "#ffd84d");
  },

  maple_tree(ctx, x, y, t) {
    const sway = Math.sin(t * 0.8 + x) * 1.5;
    ctx.strokeStyle = "#4a2818";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sway, y - 40);
    ctx.stroke();
    ctx.fillStyle = "#c03828";
    ctx.beginPath();
    ctx.arc(x + sway - 8, y - 48, 18, 0, Math.PI * 2);
    ctx.arc(x + sway + 12, y - 42, 16, 0, Math.PI * 2);
    ctx.arc(x + sway, y - 56, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e85030";
    for (let i = 0; i < 5; i++) {
      const lx = x + ((i * 17) % 30) - 15;
      const ly = y - 4 - (i % 3) * 3;
      ctx.fillRect(lx, ly, 4, 3);
    }
  },

  leaf_pile(ctx, x, y) {
    const colors = ["#c03828", "#e85030", "#a02818", "#d06020"];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = colors[i % colors.length];
      const lx = x + ((i * 13) % 24) - 12;
      const ly = y - (i % 4) * 2;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 5, 3, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  harvest_moon(ctx, x, y, t) {
    const bob = Math.sin(t * 0.6) * 2;
    ctx.fillStyle = "rgba(255, 120, 60, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y - 30 + bob, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e87040";
    ctx.beginPath();
    ctx.arc(x, y - 30 + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c05028";
    ctx.beginPath();
    ctx.arc(x + 6, y - 32 + bob, 16, 0, Math.PI * 2);
    ctx.fill();
  },

  persimmon(ctx, x, y) {
    ctx.strokeStyle = "#5a3820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 20);
    ctx.stroke();
    ctx.fillStyle = "#e87030";
    ctx.beginPath();
    ctx.arc(x, y - 24, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a6820";
    ctx.fillRect(x - 2, y - 32, 4, 5);
  },

  autumn_sign(ctx, x, y) {
    drawSign(ctx, x, y, "秋", "#e85030");
  },

  rain_umbrella(ctx, x, y, t) {
    const drip = (Math.sin(t * 3 + x) + 1) * 2;
    ctx.strokeStyle = "#608898";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 28);
    ctx.stroke();
    ctx.fillStyle = "#88cce8";
    ctx.beginPath();
    ctx.arc(x, y - 28, 20, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 210, 240, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const rx = x - 12 + i * 8;
      ctx.beginPath();
      ctx.moveTo(rx, y - 40 - ((t * 40 + i * 20) % 30));
      ctx.lineTo(rx, y - 30 - ((t * 40 + i * 20) % 30));
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120, 200, 230, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x + 10, y - drip, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  puddle(ctx, x, y, t) {
    const w = 24 + Math.sin(t + x) * 2;
    ctx.fillStyle = "rgba(100, 190, 220, 0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 220, 240, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, w * 0.6, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  hydrangea(ctx, x, y) {
    ctx.strokeStyle = "#3a4858";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 16);
    ctx.stroke();
    const clusters = ["#88b8d8", "#a0c8e8", "#7898c0"];
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = clusters[c];
      const cx = x + (c - 1) * 8;
      const cy = y - 20 - (c % 2) * 4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 6, cy + Math.sin(a) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  rain_post(ctx, x, y, t) {
    ctx.strokeStyle = "rgba(140, 200, 230, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const ox = ((i * 19 + Math.floor(t * 8)) % 40) - 20;
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 50);
      ctx.lineTo(x + ox - 2, y - 30);
      ctx.stroke();
    }
  },

  tsuyu_sign(ctx, x, y) {
    drawSign(ctx, x, y, "梅雨", "#88cce8");
  },

  sunset_sun(ctx, x, y, t) {
    const pulse = 1 + Math.sin(t * 0.5) * 0.04;
    ctx.fillStyle = "rgba(255, 120, 40, 0.18)";
    ctx.fillRect(x - 60, y - 50, 120, 40);
    ctx.fillStyle = "#ff8830";
    ctx.beginPath();
    ctx.arc(x, y - 10, 26 * pulse, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#ffb060";
    ctx.beginPath();
    ctx.arc(x, y - 10, 18 * pulse, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 160, 80, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 50, y - 8);
    ctx.lineTo(x + 50, y - 8);
    ctx.stroke();
  },

  street_lamp(ctx, x, y, t) {
    const glow = 0.5 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = `rgba(255, 140, 50, ${0.12 * glow})`;
    ctx.beginPath();
    ctx.arc(x, y - 38, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a4030";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 36);
    ctx.stroke();
    ctx.fillStyle = "#ff9830";
    ctx.fillRect(x - 8, y - 42, 16, 8);
    ctx.fillStyle = `rgba(255, 180, 80, ${glow})`;
    ctx.beginPath();
    ctx.arc(x, y - 38, 6, 0, Math.PI * 2);
    ctx.fill();
  },

  evening_bench(ctx, x, y) {
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(x - 18, y - 10, 36, 4);
    ctx.fillRect(x - 16, y - 6, 3, 10);
    ctx.fillRect(x + 13, y - 6, 3, 10);
    ctx.fillStyle = "rgba(255, 120, 50, 0.15)";
    ctx.fillRect(x - 20, y - 14, 40, 16);
  },

  evening_cloud(ctx, x, y, t) {
    const drift = Math.sin(t * 0.3 + x * 0.02) * 4;
    const bands = ["rgba(255, 120, 60, 0.25)", "rgba(255, 90, 50, 0.18)", "rgba(200, 80, 60, 0.12)"];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x - 40 + drift, y - 50 + i * 8, 80, 5);
    });
  },

  sunset_sign(ctx, x, y) {
    drawSign(ctx, x, y, "夕", "#ff9830");
  },
};

function drawSign(ctx, x, y, text, color) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(x - 3, y - 38, 6, 38);
  ctx.fillStyle = color;
  ctx.fillRect(x - 14, y - 48, 28, 16);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 14, y - 48, 28, 16);
  ctx.fillStyle = "#f2f2f2";
  ctx.font = "bold 11px Helvetica Neue, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 37);
}

function hash(n) {
  return ((n * 2654435761) >>> 0) / 4294967295;
}

export function spawnProps(world, TILE, isWalkable) {
  const props = [];
  let id = 0;

  for (const region of world.regions) {
    const types = PROPS_BY_REGION[region.id] ?? [];
    for (const type of types) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const angle = hash(id + attempt * 3) * Math.PI * 2;
        const radius = 4 + hash(id + attempt * 7) * (region.r - 6);
        const tx = Math.round(region.cx + Math.cos(angle) * radius);
        const ty = Math.round(region.cy + Math.sin(angle) * radius);
        if (!isWalkable(world.tiles, tx, ty)) continue;
        if (Math.hypot(tx - region.cx, ty - region.cy) < 3) continue;

        props.push({
          id: `p${id++}`,
          type,
          region: region.id,
          x: tx * TILE + TILE / 2 + (hash(id) - 0.5) * 10,
          y: ty * TILE + TILE / 2 + (hash(id * 2) - 0.5) * 10,
          phase: hash(id * 5) * Math.PI * 2,
        });
        break;
      }
    }
  }

  return props;
}

export function drawProps(ctx, props, camera, time) {
  const sorted = [...props].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx < -80 || sy < -100 || sx > ctx.canvas.width + 80 || sy > ctx.canvas.height + 40) continue;

    const drawer = DRAWERS[p.type];
    if (!drawer) continue;

    ctx.save();
    drawer(ctx, sx, sy, time + p.phase);
    ctx.restore();
  }
}
