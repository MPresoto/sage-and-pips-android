(() => {
  "use strict";

  // An original, unhurried 48-second meadow theme at 80 beats per minute.
  // Each row is a bar: [beat, MIDI note, length in beats]. Gaps are rests.
  const BEAT = 60 / 80;
  const MELODY = [
    [[0, 64, 1.2], [1.5, 67, .8], [3, 64, .8]],
    [[.5, 60, 1.2], [2.5, 64, 1]],
    [[0, 62, 1], [1.5, 60, 1.6]],
    [[.5, 59, 1], [2, 62, 1.2]],
    [[0, 62, 1.2], [2, 65, 1]],
    [[.5, 64, .8], [2, 60, 1.5]],
    [[0, 67, 1], [1.5, 64, 1], [3, 62, .6]],
    [[0, 59, 1.4], [2.5, 62, .8]],
    [[.5, 64, 1], [2, 67, 1.2]],
    [[0, 67, 1], [2, 64, 1.3]],
    [[.5, 69, .8], [2, 67, 1.2]],
    [[0, 65, 1.2], [2, 64, 1]],
    [[.5, 62, 1], [2, 65, 1.2]],
    [[0, 64, .8], [1.5, 62, 1.4]],
    [[.5, 60, 1.8]],
    [[0, 64, 1.4], [2.5, 60, .8]]
  ];
  const CHORDS = [
    [48, 55], [45, 52], [41, 48], [43, 50],
    [50, 57], [41, 48], [48, 55], [43, 50],
    [48, 55], [47, 55], [45, 52], [41, 48],
    [50, 57], [43, 50], [48, 55], [48, 55]
  ];
  let playback = null;

  function voice(run, midi, when, duration, volume, type, attack) {
    const oscillator = run.context.createOscillator();
    const envelope = run.context.createGain();
    const end = when + duration;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), when);
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.linearRampToValueAtTime(volume, when + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(envelope);
    envelope.connect(run.filter);
    run.voices.add(oscillator);
    oscillator.onended = () => {
      run.voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(when);
    oscillator.stop(end + .03);
  }

  function schedule(run) {
    // Schedule one short bar ahead; Web Audio keeps notes evenly spaced
    // even if a browser timer is a little late.
    while (playback === run && run.nextTime < run.context.currentTime + .18) {
      const bar = run.bar % MELODY.length;
      const when = Math.max(run.nextTime, run.context.currentTime + .02);
      MELODY[bar].forEach(([beat, midi, length]) => {
        voice(run, midi, when + beat * BEAT, length * BEAT, .022, "triangle", .055);
      });
      CHORDS[bar].forEach((midi, index) => {
        voice(run, midi, when + index * .035, 3.5 * BEAT, .009, "sine", .3);
      });
      run.bar += 1;
      run.nextTime = when + 4 * BEAT;
    }
  }

  function stop() {
    const run = playback;
    if (!run) return;
    playback = null;
    window.clearInterval(run.timer);
    const now = run.context.currentTime;
    run.mix.gain.cancelScheduledValues(now);
    run.mix.gain.setTargetAtTime(0, now, .012);
    // Cancel future notes too, so muting or hiding the game leaves no
    // queued melody to sound after the current bar.
    run.voices.forEach(oscillator => {
      try { oscillator.stop(now + .06); } catch (_) {}
    });
    window.setTimeout(() => {
      run.filter.disconnect();
      run.mix.disconnect();
    }, 90);
  }

  function start(context, destination) {
    stop();
    if (!context || !destination || context.state === "closed") return;
    const mix = context.createGain();
    const filter = context.createBiquadFilter();
    mix.gain.setValueAtTime(0, context.currentTime);
    mix.gain.linearRampToValueAtTime(.6, context.currentTime + .09);
    filter.type = "lowpass";
    filter.frequency.value = 1300;
    filter.Q.value = .45;
    filter.connect(mix);
    mix.connect(destination);
    const run = { context, mix, filter, voices: new Set(), bar: 0,
      nextTime: context.currentTime + .08, timer: null };
    playback = run;
    schedule(run);
    run.timer = window.setInterval(() => schedule(run), 100);
  }

  window.SnackQuestMusic = Object.freeze({ start, stop });
})();
