const actions = {
  tummy: { sprite: "pet_tummy.png", title: "A gentle tummy rub", sound: "purr", delay: 600, note: "Sage enjoys a turn, then Pips gets a turn.", delta: { joy: 14 } },
  feed: { sprite: "pet_feed.png", title: "A tasty meal", sound: "meow", delay: 600, note: "One by one, they enjoy their meal.", delta: { hunger: 24, energy: 3 } },
  drink: { sprite: "pet_drink.png", title: "A refreshing drink", sound: "purr", delay: 600, note: "One by one, they stop at the fountain.", delta: { water: 28 } },
  sleep: { sprite: "pet_sleep.png", title: "A cozy little nap", sound: "purr", delay: 850, note: "Sage settles first; Pips has a cozy turn next.", delta: { energy: 25, hunger: -3 } },
  play: { sprite: "pet_play.png", title: "Feather-toy fun", sound: "meow", delay: 600, note: "Sage bats the feather, then Pips takes a turn.", delta: { joy: 20, energy: -12, hunger: -5, water: -4 } },
  zoomies: { sprite: "pet_zoomies.png", title: "Happy paws on the move!", sound: "meow", delay: 600, note: "Sage dashes first, then Pips has the zoomies.", delta: { joy: 24, energy: -22, hunger: -7, water: -6 } },
  wrestle: { sprite: "pet_wrestle.png", title: "A friendly tumble, then a cuddle", sound: "meow", delay: 600, note: "A gentle play fight ends in a friendly cuddle.", delta: { joy: 16, energy: -12, hunger: -4 } }
};
const defaults = { hunger: 68, water: 72, joy: 76, energy: 82 };
let values = { ...defaults };
try { values = { ...defaults, ...JSON.parse(localStorage.getItem("sage-pips-care") || "{}") }; } catch {}
let soundEnabled = localStorage.getItem("sage-pips-sound") !== "false";
let selected = "feed";
let frame = 0;
let timer = null;
let activeAudio = null;
const canvas = document.querySelector("#cat-scene");
const ctx = canvas.getContext("2d", { alpha: true });
const title = document.querySelector("#scene-title");
const note = document.querySelector("#scene-note");
const soundButton = document.querySelector("#sound-toggle");
const sprites = new Map();

function renderMeters() {
  for (const [name, value] of Object.entries(values)) {
    const meter = document.querySelector(`[data-meter="${name}"]`);
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    values[name] = clamped;
    meter.setAttribute("aria-valuenow", String(clamped));
    meter.querySelector(".meter-value").textContent = `${clamped}%`;
    meter.querySelector(".meter-track span").style.setProperty("--value", `${clamped}%`);
  }
  localStorage.setItem("sage-pips-care", JSON.stringify(values));
}

function getSprite(path) {
  if (!sprites.has(path)) {
    const image = new Image();
    image.src = `./${path}`;
    image.onload = drawFrame;
    sprites.set(path, image);
  }
  return sprites.get(path);
}

function drawFrame() {
  const action = actions[selected];
  const image = getSprite(action.sprite);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!image.complete || !image.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  const column = frame % 4;
  const row = Math.floor(frame / 4);
  ctx.drawImage(image, column * 256, row * 341, 256, 341, 0, 0, 256, 341);
  canvas.setAttribute("aria-label", `${selected === "wrestle" ? "Sage and Pips" : row === 0 ? "Sage" : "Pips"} — ${action.title}`);
}

function playSound(kind) {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  if (!soundEnabled) return;
  activeAudio = new Audio(`./cat_${kind}.mp3`);
  activeAudio.volume = 0.48;
  activeAudio.play().catch(() => {});
}

function chooseAction(name, play = true) {
  if (!actions[name]) return;
  selected = name;
  frame = 0;
  const action = actions[name];
  title.textContent = action.title;
  note.textContent = action.note;
  document.querySelectorAll(".action").forEach(button => {
    const active = button.dataset.action === name;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  clearInterval(timer);
  drawFrame();
  timer = setInterval(() => { frame = (frame + 1) % 8; drawFrame(); }, action.delay);
  if (play) {
    for (const [key, delta] of Object.entries(action.delta)) values[key] += delta;
    renderMeters();
    playSound(action.sound);
  }
}

document.querySelectorAll(".action").forEach(button => {
  button.setAttribute("aria-pressed", String(button.dataset.action === selected));
  button.addEventListener("click", () => chooseAction(button.dataset.action));
});
soundButton.classList.toggle("muted", !soundEnabled);
soundButton.setAttribute("aria-label", soundEnabled ? "Mute sounds" : "Turn sounds on");
soundButton.setAttribute("aria-pressed", String(soundEnabled));
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("sage-pips-sound", String(soundEnabled));
  soundButton.classList.toggle("muted", !soundEnabled);
  soundButton.setAttribute("aria-label", soundEnabled ? "Mute sounds" : "Turn sounds on");
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  if (!soundEnabled && activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
});
renderMeters();
chooseAction(selected, false);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
