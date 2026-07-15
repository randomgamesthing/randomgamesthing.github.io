// game.js
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const titleScreen = document.getElementById('titleScreen');
  const playBtn = document.getElementById('playBtn');
  const vignette = document.getElementById('vignette');
  const tint = document.getElementById('tint');
  const flashOverlay = document.getElementById('flashOverlay');

  ctx.imageSmoothingEnabled = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------------- Sprites ----------------
  const SPRITES = {
    stand: 'https://randomgamesthing.github.io/SE/ikl.png',
    walkA: 'https://randomgamesthing.github.io/SE/ikllf.png',
    walkB: 'https://randomgamesthing.github.io/SE/iklrf.png'
  };

  const spriteImages = {};
  let spritesLoaded = 0;
  const spriteKeys = Object.keys(SPRITES);
  spriteKeys.forEach(key => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = SPRITES[key];
    img.onload = () => { spritesLoaded++; };
    spriteImages[key] = img;
  });

  // ---------------- Tree (world obstacle) ----------------
  const treeImage = new Image();
  treeImage.crossOrigin = 'anonymous';
  treeImage.src = 'https://randomgamesthing.github.io/SE/t.png';

  // ---------------- Jumpscare images ----------------
  const SCARE_URLS = [
    'https://pleated-jeans.com/wp-content/uploads/2023/11/weird-liminal-spaces-pictures-2.jpg',
    'https://pleated-jeans.com/wp-content/uploads/2023/11/weird-liminal-spaces-pictures-4.jpg',
    'https://pleated-jeans.com/wp-content/uploads/2023/11/weird-liminal-spaces-pictures-9.jpg',
    'https://i.namu.wiki/i/NXHbjabm_N-gT1Krs5NrrMGIjRGWgcu2v_igZcWAI9HMySHOHQ-ncMY5n7sT-XS7MsYL_jTOaiJQLlaU2JNvMX5TKZcWu5E9t719Nrll6FW0TU6bp1f2cBC_hSktzFifAUaO0jRyKnH3dSQVUB5asA.webp',
    'https://i.namu.wiki/i/SW0vtKQgEW4dBabZP_BzljIc7pENDwUY8gLuK9weUKJ3VQW4BQMDLE8wk4hVzckARdLR4TkKNaJvXJAbxhH6iPksz2OBhpyT-zDx7znMIwMX4J4n2jf4dmy7xIRo1f-wxVzd0fp9eKpothw5jGz0Rg.webp',
    'https://i.namu.wiki/i/Kp8ool6ptCTKMn2Azr5qCk9mXxzJdPmp_cQ-PPHft5iaQXRI1fcxyVzZISVOgAvUe0QEHkMQ25HM7Y2nA0KefB-DpN7HjtFa5G21iJGETQAnQmME0X7VtUUtr6sE9ucdrMiKnFwINjBwojHc4eVtAg.webp',
    'https://i.namu.wiki/i/muN6XKmWB9IOCCsrU717rxHocL6QTVktnmhV23PtnEUu5VjAQmDW6KJg8-CX5RarWygzNFE3fSkFHdolNRaVuRe2iq47OxluucQVHvHS43opVgNU2HjmmwtU4ZvuyfscboprUFeTkIVwJ4cuwXE2XQ.webp',
    'https://static.wikia.nocookie.net/backrooms-freewriting/images/f/f7/The_Creature_of_the_Fog.jpg/revision/latest?cb=20250419103630'
  ];
  SCARE_URLS.forEach(url => { const i = new Image(); i.crossOrigin = 'anonymous'; i.src = url; });

  function triggerJumpscare() {
    const url = SCARE_URLS[Math.floor(Math.random() * SCARE_URLS.length)];
    flashOverlay.style.backgroundImage = `url("${url}")`;
    flashOverlay.style.opacity = '1';
    Organism.stinger();
    setTimeout(() => {
      flashOverlay.style.opacity = '0';
    }, 500);
  }

  // ---------------- World / player state ----------------
  const player = {
    x: 0,
    y: 0,
    speed: 1.35,        // slow walking speed, px per frame at ~60fps
    facing: 'stand',
    facingDir: 1,
    walkFrame: 'walkA',
    walkTimer: 0,
    moving: false
  };

  const keys = { up: false, down: false, left: false, right: false };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { keys.up = true; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { keys.down = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') keys.up = false;
    else if (e.key === 'ArrowDown') keys.down = false;
    else if (e.key === 'ArrowRight') keys.right = false;
    else if (e.key === 'ArrowLeft') keys.left = false;
  });

  // ---------------- Procedural grass field ----------------
  const TILE = 48;

  function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  const grassPalette = ['#5f7141', '#647a45', '#566b3a', '#6c7d4c', '#516338'];

  function drawWorld() {
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;

    const startTX = Math.floor(camX / TILE) - 1;
    const endTX = Math.floor((camX + canvas.width) / TILE) + 1;
    const startTY = Math.floor(camY / TILE) - 1;
    const endTY = Math.floor((camY + canvas.height) / TILE) + 1;

    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const h = hash(tx, ty);
        const colorIdx = Math.floor(h * grassPalette.length);
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;

        ctx.fillStyle = grassPalette[colorIdx];
        ctx.fillRect(sx, sy, TILE, TILE);

        // sparse darker speckles for grass-blade texture
        const speckleCount = 3;
        for (let s = 0; s < speckleCount; s++) {
          const h2 = hash(tx * 13.7 + s, ty * 7.3 + s);
          const h3 = hash(tx * 3.1 - s, ty * 19.9 + s);
          const px = sx + h2 * TILE;
          const py = sy + h3 * TILE;
          ctx.fillStyle = 'rgba(20,26,10,0.18)';
          ctx.fillRect(px, py, 2, 2);
        }

        // rare unsettling darker patch tile - liminal wrongness
        if (h > 0.985) {
          ctx.fillStyle = 'rgba(10,10,8,0.35)';
          ctx.fillRect(sx, sy, TILE, TILE);
        }
      }
    }
  }

// ---------------- Trees ----------------
  const TREE_GRID = TILE * 8;
  const TREE_CHANCE = 0.22;
  const TREE_COLLISION_RADIUS = 50;
  const TREE_DRAW_SCALE = 1.4;

  // Deterministic per-slot presence + jitter, so trees don't move between frames.
  function treeSlot(gx, gy) {
    const presence = hash(gx * 91.7 + 13.3, gy * 57.3 + 7.1);
    if (presence <= 1 - TREE_CHANCE) return null;
    const jx = hash(gx * 3.3 + 1.7, gy * 5.1 + 2.9);
    const jy = hash(gx * 7.7 + 3.1, gy * 2.9 + 4.4);
    return {
      x: gx * TREE_GRID + jx * TREE_GRID,
      y: gy * TREE_GRID + jy * TREE_GRID
    };
  }

  function nearbyTrees(worldX, worldY, cellRadius = 2) {
    const cgx = Math.floor(worldX / TREE_GRID);
    const cgy = Math.floor(worldY / TREE_GRID);
    const found = [];
    for (let gy = cgy - cellRadius; gy <= cgy + cellRadius; gy++) {
      for (let gx = cgx - cellRadius; gx <= cgx + cellRadius; gx++) {
        const t = treeSlot(gx, gy);
        if (t) found.push(t);
      }
    }
    return found;
  }

  function treesInView(camX, camY) {
    const buffer = TILE * 6; // trees are large, so pad the visibility check
    const startGX = Math.floor((camX - buffer) / TREE_GRID) - 1;
    const endGX = Math.floor((camX + canvas.width + buffer) / TREE_GRID) + 1;
    const startGY = Math.floor((camY - buffer) / TREE_GRID) - 1;
    const endGY = Math.floor((camY + canvas.height + buffer) / TREE_GRID) + 1;
    const found = [];
    for (let gy = startGY; gy <= endGY; gy++) {
      for (let gx = startGX; gx <= endGX; gx++) {
        const t = treeSlot(gx, gy);
        if (t) found.push(t);
      }
    }
    return found;
  }

  function canOccupy(x, y) {
    const trees = nearbyTrees(x, y);
    for (const t of trees) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy < TREE_COLLISION_RADIUS * TREE_COLLISION_RADIUS) return false;
    }
    return true;
  }

  function drawTree(t, camX, camY) {
    if (!treeImage.complete || treeImage.naturalWidth === 0) return;
    const w = treeImage.naturalWidth * TREE_DRAW_SCALE;
    const h = treeImage.naturalHeight * TREE_DRAW_SCALE;
    const sx = t.x - camX - w / 2;
    const sy = t.y - camY - h; // anchor trunk base at t.y, tree grows upward from there
    ctx.drawImage(treeImage, sx, sy, w, h);
  }

  function drawTreesLayer(camX, camY, trees) {
    trees.forEach(t => drawTree(t, camX, camY));
  }

  // ---------------- Fog layers ----------------
  let fogTime = 0;

  function drawFog() {
    fogTime += 0.0035;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const layers = [
      { dx: Math.sin(fogTime) * 120, dy: Math.cos(fogTime * 0.8) * 80, r: canvas.width * 0.55, a: 0.55 },
      { dx: Math.cos(fogTime * 0.6) * 200, dy: Math.sin(fogTime * 1.1) * 140, r: canvas.width * 0.42, a: 0.5 },
      { dx: Math.sin(fogTime * 1.4 + 2) * 90, dy: Math.cos(fogTime * 0.9 + 1) * 160, r: canvas.width * 0.35, a: 0.45 }
    ];

    ctx.save();
    layers.forEach(layer => {
      const gx = cx + layer.dx;
      const gy = cy + layer.dy;
      const grad = ctx.createRadialGradient(gx, gy, layer.r * 0.1, gx, gy, layer.r);
      grad.addColorStop(0, `rgba(12,14,10,0)`);
      grad.addColorStop(0.6, `rgba(10,11,9,${layer.a * 0.4})`);
      grad.addColorStop(1, `rgba(6,7,5,${layer.a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // dense near-permanent fog ceiling limiting visibility distance
    const visGrad = ctx.createRadialGradient(cx, cy, canvas.width * 0.12, cx, cy, canvas.width * 0.5);
    visGrad.addColorStop(0, 'rgba(8,9,7,0)');
    visGrad.addColorStop(1, 'rgba(7,8,6,0.9)');
    ctx.fillStyle = visGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // ---------------- Player draw ----------------
  const SPRITE_SCALE = 0.65;

  function drawPlayer() {
    let img;
    if (player.moving) {
      img = spriteImages[player.walkFrame];
    } else {
      img = spriteImages.stand;
    }
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const w = img.naturalWidth * SPRITE_SCALE;
    const h = img.naturalHeight * SPRITE_SCALE;
    const dx = canvas.width / 2 - w / 2;
    const dy = canvas.height / 2 - h / 2;

    if (player.facingDir === -1) {
      ctx.save();
      ctx.translate(canvas.width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width / 2, 0);
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, w, h);
    }
  }

  // ---------------- Update ----------------
  let lastTime = performance.now();

  function update(dt) {
    let dx = 0, dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.right) dx += 1;
    if (keys.left) dx -= 1;

    if (dx !== 0) player.facingDir = dx > 0 ? 1 : -1;

    const moving = dx !== 0 || dy !== 0;
    player.moving = moving;

    if (moving) {
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const stepX = (dx / len) * player.speed;
      const stepY = (dy / len) * player.speed;

      const nx = player.x + stepX;
      const ny = player.y + stepY;

      // per-axis collision so the player slides along a tree instead of stopping dead
      if (canOccupy(nx, player.y)) player.x = nx;
      if (canOccupy(player.x, ny)) player.y = ny;

      player.walkTimer += dt;
      const frameInterval = 220; // ms per frame swap, matches slow walk speed
      if (player.walkTimer >= frameInterval) {
        player.walkTimer = 0;
        player.walkFrame = player.walkFrame === 'walkA' ? 'walkB' : 'walkA';
      }
    } else {
      player.walkTimer = 0;
    }
  }

  // ---------------- Main loop ----------------
  let running = false;

  function loop(now) {
    if (!running) return;
    const dt = now - lastTime;
    lastTime = now;

    update(dt);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();

    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;
    const trees = treesInView(camX, camY);
    const behindPlayer = trees.filter(t => t.y <= player.y);
    const inFrontOfPlayer = trees.filter(t => t.y > player.y);

    drawTreesLayer(camX, camY, behindPlayer);
    drawPlayer();
    drawTreesLayer(camX, camY, inFrontOfPlayer);

    drawFog();

    requestAnimationFrame(loop);
  }

  // ---------------- Jumpscare scheduler: 1 in 10,000 chance every millisecond ----------------
  let scareInterval = null;
  let scareActive = false;

  function triggerJumpscareGuarded() {
    if (scareActive) return;
    scareActive = true;
    triggerJumpscare();
    setTimeout(() => { scareActive = false; }, 500);
  }

  function startScareScheduler() {
    scareInterval = setInterval(() => {
      if (!running) return;
      if (Math.random() < 1 / 10000) {
        triggerJumpscareGuarded();
      }
    }, 1);
  }

  // ---------------- Start ----------------
  playBtn.addEventListener('click', () => {
    titleScreen.style.display = 'none';
    canvas.style.display = 'block';
    vignette.style.display = 'block';
    tint.style.display = 'block';

    Organism.start();
    Organism.resume();

    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
    startScareScheduler();
  });
})();
