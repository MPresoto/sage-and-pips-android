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
  const flyCount = document.querySelector("#fly-count");
  const scoreCount = document.querySelector("#score-count");
  const reunionStatus = document.querySelector("#reunion-status");
  const statusCopy = document.querySelector("#status-copy");
  const soundButton = document.querySelector("#sound-button");

  const assets = {
    myrtle: loadImage("./assets/myrtle-sprites.png?v=myrtle1"),
    cats: loadImage("../game/assets/cats-and-enemies.png?v=20261103"),
    items: loadImage("../game/assets/items.png?v=20261103")
  };
  let assetsReady = false;
  let state = "select";
  let energy = 5;
  let treats = 0;
  let flies = 0;
  let cameraX = 0;
  let lastTime = 0;
  let clock = 0;
  let hurtTimer = 0;
  let score = 0;
  let reunionTime = 0;
  let reunionPurrPlayed = false;
  let floatingText = [];
  let myrtleBaselines = [];
  let player;
  let platforms = [];
  let enemies = [];
  let pickups = [];
  let feeders = [];
  const keys = new Set();
  const input = { left: false, right: false, jumpQueued: false };
  let audioContext = null;
  let masterGain = null;
  let soundOn = localStorage.getItem("myrtle-sound") !== "off";
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
    } else if (kind === "chomp") {
      tone(360, .07, "triangle", .055, now);
      tone(620, .1, "triangle", .04, now + .08);
      tone(830, .14, "sine", .04, now + .16);
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
    localStorage.setItem("myrtle-sound", soundOn ? "on" : "off");
    updateSoundButton();
    if (masterGain) masterGain.gain.setTargetAtTime(soundOn ? 0.72 : 0, audioContext.currentTime, 0.03);
    if (soundOn && ["play", "reunion", "win"].includes(state)) startMusic();
    if (!soundOn) {
      stopMusic();
      [catMeow, catPurr].forEach(audio => { audio.pause(); audio.currentTime = 0; });
    }
  });
  updateSoundButton();

  function paintPortraits() {
    if (!assets.myrtle.naturalWidth) return;
    const cellW = Math.floor(assets.myrtle.naturalWidth / 4);
    const cellH = Math.floor(assets.myrtle.naturalHeight / 3);
    const scratch = document.createElement("canvas");
    scratch.width = cellW;
    scratch.height = cellH;
    const scan = scratch.getContext("2d", { willReadFrequently: true });
    // Generated poses have different transparent padding. Align their
    // opaque feet without stretching or rescaling individual poses.
    myrtleBaselines = Array.from({ length: 12 }, (_, frame) => {
      scan.clearRect(0, 0, cellW, cellH);
      scan.drawImage(assets.myrtle, (frame % 4) * cellW, Math.floor(frame / 4) * cellH,
        cellW, cellH, 0, 0, cellW, cellH);
      const pixels = scan.getImageData(0, 0, cellW, cellH).data;
      for (let y = cellH - 1; y >= 0; y -= 1) {
        let opaque = 0;
        for (let x = 0; x < cellW; x += 1) if (pixels[(y * cellW + x) * 4 + 3] > 90) opaque += 1;
        if (opaque > 5) return y + 1;
      }
      return cellH * .85;
    });
    const portrait = document.querySelector("#myrtle-portrait");
    const pctx = portrait.getContext("2d");
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, portrait.width, portrait.height);
    const size = 186;
    pctx.drawImage(assets.myrtle, 0, 0, cellW, cellH,
      (portrait.width - size) / 2, portrait.height - 10 - myrtleBaselines[0] / cellH * size, size, size);
  }

  imagesLoaded().then(() => {
    assetsReady = Object.values(assets).every(image => image.naturalWidth > 0);
    paintPortraits();
    startButton.disabled = !assetsReady;
    if (!assetsReady) {
      startButton.textContent = "Adventure unavailable";
      document.querySelector(".select-help").textContent = "Please reload when Myrtle's artwork has finished loading.";
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
      [360, 0, 399], [620, 0, 312], [1040, 1, 408], [1140, 0, 390],
      [1390, 2, 330], [1740, 3, 420], [1920, 0, 310], [2180, 0, 405],
      [2510, 1, 398], [2680, 0, 278], [2900, 2, 330], [3220, 3, 420],
      [3475, 0, 302], [3720, 0, 399], [4020, 1, 408], [4230, 0, 295],
      [4460, 2, 330], [4760, 3, 420], [4935, 0, 280], [5110, 0, 399]
    ];
    enemies = enemySpecs.map((e, i) => ({
      x: e[0], homeX: e[0], type: e[1], y: e[2], baseY: e[2], dir: i % 2 ? -1 : 1,
      range: e[1] === 0 ? 48 : 38, dead: false, phase: i * .7
    }));
    pickups = [
      [320, 406, 1], [650, 306, 2], [995, 389, 3], [1285, 285, 1],
      [1690, 405, 2], [2000, 308, 3], [2440, 380, 1], [2780, 273, 2],
      [3160, 407, 3], [3530, 298, 1], [4015, 390, 2], [4320, 288, 3],
      [4750, 412, 1], [5000, 278, 2]
    ].map((p, i) => ({ x: p[0], y: p[1], item: p[2], taken: false, phase: i * .4 }));
    feeders = [{ x: 1160, y: 365, used: false }, { x: 3200, y: 380, used: false }, { x: 4480, y: 365, used: false }];
  }

  function resetGame() {
    makeLevel();
    energy = 5;
    treats = 0;
    flies = 0;
    score = 0;
    cameraX = 0;
    hurtTimer = 0;
    clock = 0;
    reunionTime = 0;
    reunionPurrPlayed = false;
    floatingText = [];
    player = {
      x: 90, y: 360, w: 46, h: 54, vx: 0, vy: 0, grounded: false,
      dir: 1, invuln: 0, anim: 0, munch: 0, safeX: 90, safeY: 455
    };
    input.left = false;
    input.right = false;
    input.jumpQueued = false;
    keys.clear();
    updateHud();
    statusCopy.textContent = "Eat flies for points. Dodge the other bugs and find Sage & Pips.";
    reunionStatus.hidden = true;
    document.querySelectorAll(".touch-control").forEach(button => { button.disabled = false; });
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
    flyCount.textContent = "FLIES " + String(flies).padStart(2, "0");
    scoreCount.textContent = "SCORE " + String(score).padStart(4, "0");
  }

  function endGame(won) {
    if (won) { beginReunion(); return; }
    state = "over";
    stopMusic();
    overlay.hidden = false;
    overlayTitle.textContent = "Time for a kitten nap";
    overlayCopy.textContent = flies + " flies caught · " + score + " points. Try again to find Sage and Pips!";
    overlayIcon.textContent = "🐾";
    overlayButton.textContent = "Try again";
    effect("gameover");
  }

  function beginReunion() {
    if (state !== "play") return;
    state = "reunion";
    reunionTime = 0;
    score += 500;
    player.vx = 0;
    input.left = false;
    input.right = false;
    keys.clear();
    overlay.hidden = true;
    updateHud();
    statusCopy.textContent = "Myrtle found Sage & Pips! Let the playtime begin.";
    reunionStatus.hidden = false;
    reunionStatus.textContent = "Friends reunited! +500 points. Watch them play together, or restart for another adventure.";
    document.querySelectorAll(".touch-control").forEach(button => { button.disabled = true; });
    effect("win");
  }

  function eatFly(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    flies += 1;
    score += 200;
    player.munch = .7;
    floatingText.push({ x: enemy.x + 25, y: enemy.y, life: 1.1, text: "+200 · YUM!" });
    statusCopy.textContent = "Chomp! A fly snack earns 200 points.";
    updateHud();
    effect("chomp");
    if (flies % 3 === 1) playCatSound(catMeow);
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
    else if (soundOn && ["play", "reunion", "win"].includes(state)) startMusic();
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
    if (document.hidden) return;
    if (state === "reunion" || state === "win") {
      clock += dt;
      reunionTime += dt;
      if (reunionTime > 3 && !reunionPurrPlayed) {
        reunionPurrPlayed = true;
        playCatSound(catPurr);
      }
      if (state === "reunion" && reunionTime >= 9) {
        state = "win";
        statusCopy.textContent = "Adventure complete! " + flies + " flies · " + score + " points · three happy cats.";
      }
      return;
    }
    if (state !== "play" || !player) return;
    clock += dt;
    const stats = { speed: 245, jump: 450 };
    const direction = Number(input.right) - Number(input.left);
    player.munch = Math.max(0, player.munch - dt);
    floatingText = floatingText.filter(label => (label.life -= dt) > 0);
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
    if (hurtTimer > 0 && (hurtTimer -= dt) <= 0) statusCopy.textContent = "Eat flies, dodge other bugs, and find your friends.";

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
          if (p.w > 350) {
            player.safeX = Math.max(p.x + 18, Math.min(p.x + p.w - 70, player.x));
            player.safeY = p.y;
          }
          break;
        }
      }
    }
    if (player.y > H + 80) {
      loseEnergy(player.x - 100);
      if (state !== "play") return;
      player.x = player.safeX;
      player.y = player.safeY - player.h - 30;
      player.vy = 0;
    }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.x += enemy.dir * (enemy.type === 0 ? 58 : 44) * dt;
      if (Math.abs(enemy.x - enemy.homeX) > enemy.range) enemy.dir *= -1;
      enemy.phase += dt * (enemy.type === 0 ? 8 : 3);
      if (enemy.type === 0) enemy.y = enemy.baseY + Math.sin(enemy.phase) * 20;
      if (enemy.type === 2) enemy.y = enemy.baseY + Math.sin(enemy.phase) * 12;
      const box = { x: enemy.x + 4, y: enemy.y + 8, w: 42, h: 38 };
      if (enemy.type === 0) {
        const reach = { x: player.x - 8, y: player.y - 6, w: player.w + 16, h: player.h + 12 };
        if (touching(reach, box)) eatFly(enemy);
      } else if (touching(player, box) && player.invuln <= 0) {
        loseEnergy(enemy.x);
        if (state !== "play") return;
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

    if (player.x > 5210) { beginReunion(); return; }
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
    drawWaitingFriends();
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
      if (enemy.type === 0 && enemy.homeX === 360) {
        ctx.fillStyle = "#50694d";
        ctx.font = "bold 14px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FLY +200", enemy.x - cameraX + 26, enemy.y - 14);
      }
    }
  }

  function drawMyrtle(frame, centerX, feet, size, flip) {
    const image = assets.myrtle;
    if (!image.naturalWidth) return;
    const cw = image.naturalWidth / 4;
    const ch = image.naturalHeight / 3;
    const height = size * ch / cw;
    const baseline = myrtleBaselines[frame] || ch * .85;
    drawWorldSprite(image, (frame % 4) * cw, Math.floor(frame / 4) * ch,
      cw, ch, centerX - size / 2, feet - baseline / ch * height, size, height, flip);
  }

  function drawFriend(row, frame, centerX, feet, size, flip) {
    const image = assets.cats;
    if (!image.naturalWidth) return;
    const cw = image.naturalWidth / 4;
    const ch = image.naturalHeight / 3;
    drawWorldSprite(image, frame * cw, row * ch, cw, ch,
      centerX - size / 2, feet - size * .87, size, size, flip);
  }

  function drawWaitingFriends() {
    if (cameraX < 4290) return;
    const blanketX = 5170 - cameraX;
    ctx.fillStyle = "#b9cbb7";
    ctx.fillRect(blanketX, 462, 290, 16);
    ctx.fillStyle = "#edf0dc";
    for (let x = 24; x < 290; x += 56) ctx.fillRect(blanketX + x, 468, 6, 6);
    drawFriend(0, 0, 5280 - cameraX, 464 + Math.sin(clock * 2) * 1.5, 138, true);
    drawFriend(1, 0, 5390 - cameraX, 464 + Math.sin(clock * 2 + 1) * 1.5, 138, true);
    ctx.fillStyle = "#53614e";
    ctx.font = "bold 17px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sage & Pips are waiting!", 5300 - cameraX, 325);
  }

  function drawPlayer() {
    if (!player || !assets.myrtle.naturalWidth) return;
    if (player.invuln > 0 && Math.floor(clock * 17) % 2 === 0) return;
    let frame = clock % 4.6 > 4.43 ? 1 : 0;
    if (Math.abs(player.vx) > 30) frame = Math.floor(player.anim) % 2 === 0 ? 4 : 5;
    if (!player.grounded) frame = 6;
    if (player.munch > 0) frame = player.munch > .3 ? 7 : 8;
    drawMyrtle(frame, player.x - cameraX + player.w / 2, player.y + player.h + 6, 126, player.dir < 0);
    for (const label of floatingText) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, label.life * 2);
      ctx.fillStyle = "#426342";
      ctx.font = "bold 17px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label.text, label.x - cameraX, label.y - 22 - (1.1 - label.life) * 30);
      ctx.restore();
    }
  }

  function reunionActors(time) {
    if (time < 1.8) return [
      { cat: "myrtle", x: 150 + time / 1.8 * 260, feet: 430, size: 157, frame: Math.floor(time * 8) % 2 + 4, flip: false },
      { cat: "sage", x: 565, feet: 430, size: 174, frame: 0, flip: true },
      { cat: "pips", x: 720, feet: 430, size: 174, frame: 0, flip: true }
    ];
    const play = time - 1.8;
    return ["myrtle", "sage", "pips"].map((cat, i) => {
      const phase = play * .85 + i * 2.1;
      const hop = Math.abs(Math.sin(play * 2.8 + i * 1.6)) * 34;
      let frame = hop > 18 ? 3 : Math.floor(play * 5 + i) % 2 + 1;
      if (cat === "myrtle") {
        const pose = Math.floor(play * 2) % 6;
        frame = pose === 0 ? 9 : pose === 1 ? 10 : pose === 2 ? 11 : Math.floor(play * 6) % 2 + 4;
      }
      return { cat, x: 480 + Math.sin(phase) * (i === 0 ? 166 : 193),
        feet: 430 - hop, size: i === 0 ? 157 : 174, frame, flip: Math.cos(phase) < 0 };
    });
  }

  function drawReunion() {
    drawBackground();
    ctx.fillStyle = "#8e9f77";
    ctx.fillRect(0, 430, W, 110);
    ctx.fillStyle = "#c2cfaa";
    ctx.fillRect(0, 430, W, 6);
    ctx.fillStyle = "#dce3cc";
    ctx.fillRect(230, 452, 500, 46);
    ctx.fillStyle = "#bdcbb0";
    for (let x = 244; x < 730; x += 38) ctx.fillRect(x, 452, 10, 46);
    ctx.fillStyle = "#4c5e48";
    ctx.textAlign = "center";
    ctx.font = "bold 30px Nunito, sans-serif";
    ctx.fillText("Myrtle found his friends!", W / 2, 150);
    ctx.font = "18px Nunito, sans-serif";
    ctx.fillText("Time for a little chase, a pounce, and a happy purr.", W / 2, 185);

    const play = Math.max(0, reunionTime - 1.8);
    const ballX = 480 + Math.sin(play * .85 + .55) * 205;
    const ballY = 420 - Math.abs(Math.sin(play * 2.8 + .9)) * 25;
    ctx.fillStyle = "#c38f72";
    ctx.fillRect(Math.round(ballX - 11), Math.round(ballY - 5), 22, 10);
    ctx.fillRect(Math.round(ballX - 7), Math.round(ballY - 9), 14, 18);
    ctx.fillStyle = "#f0c5a1";
    ctx.fillRect(Math.round(ballX - 5), Math.round(ballY - 7), 3, 14);

    reunionActors(reunionTime).sort((a, b) => a.feet - b.feet).forEach(actor => {
      if (actor.cat === "myrtle") drawMyrtle(actor.frame, actor.x, actor.feet, actor.size, actor.flip);
      else drawFriend(actor.cat === "sage" ? 0 : 1, actor.frame, actor.x, actor.feet, actor.size, actor.flip);
    });
    ctx.fillStyle = "#4c5e48";
    ctx.font = "bold 18px Nunito, sans-serif";
    ctx.fillText("Sage · Myrtle · Pips", W / 2, 520);
  }

  function draw() {
    if (state === "reunion" || state === "win") { drawReunion(); return; }
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
