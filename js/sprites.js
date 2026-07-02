const cache = new Map();

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function keyBlack(img, threshold = 36) {
  if (cache.has(img.src)) return cache.get(img.src);

  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < threshold && px[i + 1] < threshold && px[i + 2] < threshold) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  cache.set(img.src, c);
  return c;
}

export function drawSprite(ctx, img, x, y, w, h) {
  const keyed = keyBlack(img);
  ctx.drawImage(keyed, x - w / 2, y - h, w, h);
}

export async function loadSprites(basePath) {
  const dirs = ["front", "back", "left", "right"];
  const sprites = {};
  await Promise.all(
    dirs.map(async (d) => {
      sprites[d] = await loadImage(`${basePath}/${d}.png`);
    })
  );
  return sprites;
}
