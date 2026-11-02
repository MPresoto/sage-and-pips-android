(() => {
  "use strict";

  const W = 960;
  const H = 540;
  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const selectScreen = document.querySelector("#select-screen");
  const playScreen = document.querySelector("#play-screen");
  const startButton = document.querySelector("#start-button");
  const overlay = document.querySelector("#game-overlay");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayButton = document.querySelector("#overlay-button");
  const overlayIcon = document.querySelector("#overlay-icon");
  const energyHearts = document.querySelector("#energy-hearts");
  const treatCount = document.querySelector("#treat-count");
  const statusCopy = document.querySelector("#status-copy");
  const soundButton = document.querySelector("#sound-button");

  const assets = {
    cats: loadImage("./assets/cats-and-enemies.png?v=20261103"),
    items: loadImage("./assets/items.png?v=20261103")
  };
  let assetsReady = false;
  let selectedCat = localStorage.getItem("snack-quest-cat") || "sage";
  let state = "select";
  let energy = 5;
  let treats = 0;
  let cameraX = 0;
  let lastTime = 0;
  let clock = 0;
  let runFrame = 0;
  let hurtTimer = 0;
  let score = 0;
  let player;
  let platforms = [];
  let enemies = [];
  let pickups = [];
  let feeders = [];
  const keys = new Set();
  const input = { left: false, right: false, jumpQueued: false };
  let audioContext = null;
  let masterGain = null;
  let soundOn = localStorage.getItem("snack-quest-sound") !== "off";
  const catMeow = new Audio("../iphone/cat_meow.mp3");
  const catPurr = new Audio("../iphone/cat_purr.mp3");
  catMeow.volume = 0.52;
  catPurr.volume = 0.46;

  function loadImage(src) {
    const image = new Image();
    image.src = src;
    return image;
  }

  function imagesLoaded() {
    return Promise.all(Object.values(assets).map(image => new Promise(resolve => {
      if (image.complete && image.naturalWidth) return resolve();
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })));
  }

  function setAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!audioContext && AudioCtor) {
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = soundOn ? 0.72 : 0;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
  }

  function tone(frequency, duration, wave, volume, when) {
    if (!soundOn || !audioContext || !masterGain) return;
    const start = when || audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = wave || "square";
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(Math.max(0.0001, volume || 0.04), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function effect(kind) {
    if (!soundOn) return;
    setAudio();
    const now = audioContext ? audioContext.currentTime : 0;
    if (kind === "jump") {
      tone(350, .09, "square", .055, now);
      tone(520, .12, "square", .045, now + .07);
    } else if (kind === "collect") {
      tone(740, .08, "square", .05, now);
      tone(988, .15, "square", .045, now + .07);
    } else if (kind === "feed") {
      tone(490, .12, "triangle", .055, now);
      tone(660, .17, "triangle", .05, now + .09);
      playCatSound(catPurr);
    } else if (kind === "hurt") {
      tone(240, .18, "sawtooth", .07, now);
      tone(150, .23, "square", .05, now + .11);
    } else if (kind === "stomp") {
      tone(220, .08, "square", .055, now);
      tone(560, .11, "square", .05, now + .06);
    } else if (kind === "win") {
      [523, 659, 784, 1047].forEach((note, i) => tone(note, .22, "square", .05, now + i * .13));
      playCatSound(catMeow);
    } else if (kind === "gameover") {
      [392, 349, 294, 220].forEach((note, i) => tone(note, .22, "triangle", .045, now + i * .18));
    }
  }

  function playCatSound(audio) {
    if (!soundOn) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function startMusic() {
    setAudio();
    if (soundOn && !document.hidden && window.SnackQuestMusic) {
      window.SnackQuestMusic.start(audioContext, masterGain);
    }
  }

  function stopMusic() {
    if (window.SnackQuestMusic) window.SnackQuestMusic.stop();
  }

  function updateSoundButton() {
    soundButton.setAttribute("aria-pressed", String(!soundOn));
    soundButton.setAttribute("aria-label", soundOn ? "Mute sound" : "Turn sound on");
  }

  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("snack-quest-sound", soundOn ? "on" : "off");
    updateSoundButton();
    if (masterGain) masterGain.gain.setTargetAtTime(soundOn ? 0.72 : 0, audioContext.currentTime, 0.03);
    if (soundOn && state === "play") startMusic();
    if (!soundOn) {
      stopMusic();
      [catMeow, catPurr].forEach(audio => { audio.pause(); audio.currentTime = 0; });
    }
  });
  updateSoundButton();

  function selectCat(name) {
    selectedCat = name;
    localStorage.setItem("snack-quest-cat", name);
    document.querySelectorAll(".character-card").forEach(card => {
      const active = card.dataset.cat === name;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
  }

  document.querySelectorAll(".character-card").forEach(card => {
    card.addEventListener("click", () => selectCat(card.dataset.cat));
  });
  selectCat(selectedCat === "pips" ? "pips" : "sage");

  function paintPortraits() {
    if (!assets.cats.naturalWidth) return;
    document.querySelectorAll(".portrait").forEach(canvasEl => {
      const pctx = canvasEl.getContext("2d");
      pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      pctx.imageSmoothingEnabled = false;
      const cellW = assets.cats.naturalWidth / 4;
      const cellH = assets.cats.naturalHeight / 3;
      const row = canvasEl.closest(".character-card").dataset.cat === "pips" ? 1 : 0;
      pctx.drawImage(assets.cats, 0, row * cellH, cellW, cellH, 25, -2, 130, 130);
    });
  }

  imagesLoaded().then(() => {
    assetsReady = Object.values(assets).every(image => image.naturalWidth > 0);
    paintPortraits();
    startButton.disabled = !assetsReady;
    if (!assetsReady) {
      startButton.textContent = "Adventure unavailable";
      document.querySelector(".select-help").textContent = "Please reload when all game artwork has finished loading.";
    }
    draw();
    window.requestAnimationFrame(loop);
  });

  function makeLevel() {
    const ground = [
      [0, 455, 820], [900, 440, 600], [1570, 455, 760], [2385, 430, 650],
      [3090, 455, 790], [3940, 440, 670], [4660, 455, 820]
    ];
    platforms = ground.map(p => ({ x: p[0], y: p[1], w: p[2] }));
    [
      [475, 355, 185], [1185, 335, 170], [1880, 360, 185], [2680, 325, 180],
      [3455, 350, 205], [4240, 340, 190], [4930, 325, 190]
    ].forEach(p => platforms.push({ x: p[0], y: p[1], w: p[2] }));

    const enemySpecs = [
      [560, 0], [1040, 1], [1370, 2], [1770, 3], [2130, 0],
      [2530, 1], [2900, 2], [3230, 3], [3670, 0], [4020, 1],
      [4460, 2], [4760, 3], [5160, 0]
    ];
    enemies = enemySpecs.map((e, i) => ({
      x: e[0], homeX: e[0], type: e[1], y: [373, 418, 324, 416][e[1]],
      baseY: [373, 418, 324, 416][e[1]], dir: i % 2 ? -1 : 1,
      range: e[1] === 0 ? 82 : 48, dead: false, phase: i * .7
    }));
    pickups = [
      [320, 406, 1], [650, 306, 2], [995, 389, 3], [1285, 285, 1],
      [1690, 405, 2], [2000, 308, 3], [2440, 380, 1], [2780, 273, 2],
      [3160, 407, 3], [3530, 298, 1], [4015, 390, 2], [4320, 288, 3],
      [4750, 412, 1], [5000, 278, 2]
    ].map((p, i) => ({ x: p[0], y: p[1], item: p[2], taken: false, phase: i * .4 }));
    feeders = [{ x: 1140, y: 365, used: false }, { x: 3060, y: 380, used: false }, { x: 4480, y: 365, used: false }];
  }

  function resetGame() {
    makeLevel();
    energy = 5;
    treats = 0;
    score = 0;
    cameraX = 0;
    hurtTimer = 0;
    clock = 0;
    player = {
      x: 90, y: 360, w: 46, h: 54, vx: 0, vy: 0, grounded: false,
      dir: 1, invuln: 0, anim: 0
    };
    input.left = false;
    input.right = false;
    input.jumpQueued = false;
    keys.clear();
    updateHud();
    statusCopy.textContent = "Collect treats and reach the paw gate.";
    overlay.hidden = true;
  }

  function startGame() {
    if (!assetsReady) return;
    selectScreen.hidden = true;
    playScreen.hidden = false;
    state = "play";
    resetGame();
    setAudio();
    if (soundOn) startMusic();
  }

  startButton.addEventListener("click", startGame);
  document.querySelector("#restart-button").addEventListener("click", () => {
    if (state !== "select") {
      state = "play";
      resetGame();
      if (soundOn) startMusic();
    }
  });

  function updateHud() {
    energyHearts.replaceChildren();
    for (let i = 0; i < 5; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart" + (i >= energy ? " is-empty" : "");
      heart.textContent = "♥";
      heart.setAttribute("aria-hidden", "true");
      energyHearts.append(heart);
    }
    energyHearts.setAttribute("aria-label", energy + " of 5 energy points");
    treatCount.textContent = "TREATS " + String(treats).padStart(2, "0");
  }

  function endGame(won) {
    state = won ? "win" : "over";
    stopMusic();
    overlay.hidden = false;
    overlayTitle.textContent = won ? "Meadow complete!" : "Out of energy";
    overlayCopy.textContent = won
      ? "You collected " + treats + " treats and helped your best friends."
      : "The meadow can wait. Try again after a little snack.";
    overlayIcon.textContent = won ? "🌟" : "🐾";
    overlayButton.textContent = won ? "Play again" : "Try again";
    effect(won ? "win" : "gameover");
  }

  overlayButton.addEventListener("click", () => {
    if (state === "win" || state === "over") {
      state = "play";
      resetGame();
      if (soundOn) startMusic();
    }
  });

  function moveInput() {
    input.left = keys.has("ArrowLeft") || keys.has("KeyA");
    input.right = keys.has("ArrowRight") || keys.has("KeyD");
  }

  window.addEventListener("keydown", event => {
    const code = event.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(code)) event.preventDefault();
    if (state === "select" && (code === "Enter" || code === "Space")) {
      startGame();
      return;
    }
    keys.add(code);
    moveInput();
    if (["Space", "ArrowUp", "KeyW"].includes(code) && !event.repeat) input.jumpQueued = true;
  });
  window.addEventListener("keyup", event => {
    keys.delete(event.code);
    moveInput();
  });
  window.addEventListener("blur", () => {
    keys.clear();
    input.left = false;
    input.right = false;
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    input.left = false;
    input.right = false;
    input.jumpQueued = false;
    lastTime = 0;
    if (document.hidden) stopMusic();
    else if (soundOn && state === "play") startMusic();
  });

  document.querySelectorAll(".touch-control").forEach(button => {
    const control = button.dataset.control;
    const down = event => {
      event.preventDefault();
      button.classList.add("is-down");
      if (control === "jump") {
        input.jumpQueued = true;
        setAudio();
      } else input[control] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    };
    const up = event => {
      event.preventDefault();
      button.classList.remove("is-down");
      if (control !== "jump") input[control] = false;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", event => event.preventDefault());
  });

  function touching(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function loseEnergy(sourceX) {
    if (player.invuln > 0) return;
    energy = Math.max(0, energy - 1);
    player.invuln = 1.35;
    player.vx = player.x < sourceX ? -210 : 210;
    player.vy = -300;
    hurtTimer = .55;
    statusCopy.textContent = energy > 0 ? "Ouch! Find a treat or visit the feeder." : "A quiet nap might help.";
    updateHud();
    effect("hurt");
    if (energy === 0) endGame(false);
  }

  function update(dt) {
    if (state !== "play" || !player) return;
    clock += dt;
    const stats = selectedCat === "pips" ? { speed: 264, jump: 420 } : { speed: 226, jump: 462 };
    const direction = Number(input.right) - Number(input.left);
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
    if (hurtTimer > 0 && (hurtTimer -= dt) <= 0) statusCopy.textContent = "Collect treats and reach the paw gate.";

    if (direction) {
      player.dir = direction;
      player.vx = direction * stats.speed;
      player.anim += dt * 10;
    } else {
      player.vx *= Math.pow(.0008, dt);
      player.anim += dt * 3;
    }
    if (input.jumpQueued) {
      if (player.grounded) {
        player.vy = -stats.jump;
        player.grounded = false;
        effect("jump");
      }
      input.jumpQueued = false;
    }

    const oldBottom = player.y + player.h;
    player.x = Math.max(0, Math.min(5410, player.x + player.vx * dt));
    player.vy += 1060 * dt;
    player.y += player.vy * dt;
    player.grounded = false;
    if (player.vy >= 0) {
      for (const p of platforms) {
        const newBottom = player.y + player.h;
        if (oldBottom <= p.y + 10 && newBottom >= p.y && player.x + player.w > p.x && player.x < p.x + p.w) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.grounded = true;
          break;
        }
      }
    }
    if (player.y > H + 80) {
      loseEnergy(player.x - 100);
      player.x = Math.max(cameraX + 50, player.x - 130);
      player.y = 250;
      player.vy = 0;
    }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.x += enemy.dir * (enemy.type === 0 ? 82 : 48) * dt;
      if (Math.abs(enemy.x - enemy.homeX) > enemy.range) enemy.dir *= -1;
      enemy.phase += dt * (enemy.type === 0 ? 8 : 3);
      if (enemy.type === 0) enemy.y = enemy.baseY + Math.sin(enemy.phase) * 20;
      if (enemy.type === 2) enemy.y = enemy.baseY + Math.sin(enemy.phase) * 12;
      const box = { x: enemy.x + 4, y: enemy.y + 8, w: 42, h: 38 };
      if (touching(player, box) && player.invuln <= 0) {
        if (player.vy > 60 && player.y + player.h < box.y + 30) {
          enemy.dead = true;
          player.vy = -270;
          player.grounded = false;
          score += 150;
          statusCopy.textContent = "Boing! A well-timed jump sends a monster away.";
          effect("stomp");
        } else {
          loseEnergy(enemy.x);
        }
      }
    }

    for (const pickup of pickups) {
      if (pickup.taken) continue;
      const box = { x: pickup.x + 4, y: pickup.y + 2, w: 38, h: 36 };
      if (touching(player, box)) {
        pickup.taken = true;
        treats += 1;
        energy = Math.min(5, energy + 1);
        score += 100;
        updateHud();
        statusCopy.textContent = "Tasty! One treat restores a little energy.";
        effect("collect");
        if (treats % 2 === 1) playCatSound(catMeow);
      }
    }

    for (const feeder of feeders) {
      if (feeder.used) continue;
      const box = { x: feeder.x + 5, y: feeder.y + 18, w: 68, h: 58 };
      if (touching(player, box)) {
        feeder.used = true;
        treats += 3;
        energy = Math.min(5, energy + 2);
        score += 300;
        updateHud();
        statusCopy.textContent = "A big feeder snack restores up to two energy points!";
        effect("feed");
      }
    }

    if (player.x > 5290) endGame(true);
    cameraX = Math.max(0, Math.min(5410 - W, player.x - W * .34));
  }

  function drawBackground() {
    ctx.fillStyle = "#e1e7de";
    ctx.fillRect(0, 0, W, H);
    // Paint a few large shapes on a coarse pixel grid. The quiet palette
    // and empty space keep the detailed cat sprites easy to see.
    ctx.save();
    ctx.scale(3, 3);
    const cloudOffset = Math.floor(cameraX * .008 / 3);
    ctx.fillStyle = "#f0f1e9";
    for (const x of [58 - cloudOffset, 242 - cloudOffset]) {
      ctx.fillRect(x, 34, 43, 5);
      ctx.fillRect(x + 8, 29, 25, 5);
      ctx.fillRect(x + 16, 25, 10, 4);
    }
    const ridge = (points, color, speed) => {
      const offset = Math.floor(cameraX * speed / 3) % 320;
      ctx.fillStyle = color;
      for (const shift of [-offset, 320 - offset]) {
        ctx.beginPath();
        ctx.moveTo(shift, 180);
        for (const [x, y] of points) ctx.lineTo(x + shift, y);
        ctx.lineTo(320 + shift, 180);
        ctx.closePath();
        ctx.fill();
      }
    };
    ridge([[0,106],[28,106],[28,99],[51,99],[51,92],[75,92],[75,99],
      [98,99],[98,106],[158,106],[158,101],[182,101],[182,94],
      [214,94],[214,101],[246,101],[246,106],[320,106]], "#cdd7c9", .035);
    ridge([[0,133],[32,133],[32,126],[64,126],[64,120],[97,120],[97,126],
      [128,126],[128,133],[170,133],[170,126],[203,126],[203,119],
      [235,119],[235,126],[266,126],[266,133],[320,133]], "#bdcbb6", .07);
    ctx.restore();
  }

  function drawWorldSprite(image, sourceX, sourceY, sourceW, sourceH, x, y, w, h, flip) {
    if (!image.naturalWidth) return;
    ctx.save();
    if (flip) {
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, y, w, h);
    } else {
      ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, x, y, w, h);
    }
    ctx.restore();
  }

  function drawPlatforms() {
    for (const p of platforms) {
      if (p.x + p.w < cameraX - 40 || p.x > cameraX + W + 40) continue;
      const x = Math.floor(p.x - cameraX);
      const y = p.y + 4;
      const h = p.w > 350 ? H - y : 32;
      ctx.fillStyle = "#68765b";
      ctx.fillRect(x, y, p.w, h);
      ctx.fillStyle = "#b4a58b";
      ctx.fillRect(x + 2, y + 11, p.w - 4, h - 13);
      ctx.fillStyle = "#909f76";
      ctx.fillRect(x + 2, y + 2, p.w - 4, 9);
      ctx.fillStyle = "#b4c197";
      ctx.fillRect(x + 2, y + 2, p.w - 4, 3);
      ctx.fillStyle = "#a0927a";
      ctx.fillRect(x + 2, y + h - 6, p.w - 4, 4);
    }
  }

  function drawProps() {
    const image = assets.items;
    if (!image.naturalWidth) return;
    const cw = image.naturalWidth / 3;
    const ch = image.naturalHeight / 2;
    for (const pickup of pickups) {
      if (pickup.taken || pickup.x < cameraX - 70 || pickup.x > cameraX + W + 70) continue;
      const bob = Math.sin(clock * 4 + pickup.phase) * 4;
      const index = pickup.item;
      const sourceX = (index % 3) * cw;
      const sourceY = Math.floor(index / 3) * ch;
      drawWorldSprite(image, sourceX, sourceY, cw, ch, pickup.x - cameraX - 22, pickup.y - 23 + bob, 54, 54, false);
    }
    for (const feeder of feeders) {
      if (feeder.x < cameraX - 100 || feeder.x > cameraX + W + 100) continue;
      drawWorldSprite(image, 0, 0, cw, ch, feeder.x - cameraX, feeder.y, 82, 85, false);
      if (feeder.used) {
        ctx.fillStyle = "#fff6d9";
        ctx.font = "bold 13px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("YUM!", feeder.x - cameraX + 42, feeder.y - 6);
      }
    }
    const gateX = 5335 - cameraX;
    if (gateX > -120 && gateX < W + 120) drawWorldSprite(image, 2 * cw, ch, cw, ch, gateX - 37, 340, 92, 112, false);
  }

  function drawEnemies() {
    const image = assets.cats;
    if (!image.naturalWidth) return;
    const cw = image.naturalWidth / 4;
    const ch = image.naturalHeight / 3;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.x < cameraX - 90 || enemy.x > cameraX + W + 90) continue;
      const bob = Math.sin(enemy.phase) * 2;
      drawWorldSprite(image, enemy.type * cw, 2 * ch, cw, ch, enemy.x - cameraX - 3, enemy.y - 5 + bob, 62, 58, enemy.dir < 0);
    }
  }

  function drawPlayer() {
    if (!player || !assets.cats.naturalWidth) return;
    if (player.invuln > 0 && Math.floor(clock * 17) % 2 === 0) return;
    const cw = assets.cats.naturalWidth / 4;
    const ch = assets.cats.naturalHeight / 3;
    const row = selectedCat === "pips" ? 1 : 0;
    let frame = 0;
    if (!player.grounded) frame = 3;
    else if (Math.abs(player.vx) > 30) frame = Math.floor(player.anim) % 2 === 0 ? 1 : 2;
    const x = player.x - cameraX - 38;
    const y = player.y - 39;
    drawWorldSprite(assets.cats, frame * cw, row * ch, cw, ch, x, y, 122, 118, player.dir < 0);
  }

  function draw() {
    drawBackground();
    drawPlatforms();
    drawProps();
    drawEnemies();
    drawPlayer();
    if (player && state === "play") {
      const progress = Math.max(0, Math.min(1, player.x / 5400));
      ctx.fillStyle = "#fff0cf";
      ctx.fillRect(0, H - 4, W, 4);
      ctx.fillStyle = "#ed815e";
      ctx.fillRect(0, H - 4, W * progress, 4);
    }
  }

  function loop(time) {
    const dt = Math.min(.035, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    update(dt);
    draw();
    window.requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => { ctx.imageSmoothingEnabled = false; });
})();
