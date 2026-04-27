'use strict';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

const CFG = window.ROUTINE_CONFIG;
const $ = (id) => document.getElementById(id);
const AUDIO_PLAYBACK_VOLUME = 0.68;
const SPEECH_VOLUME = 0.72;
const BEEP_GAIN_MULTIPLIER = 1.7;

const UI = {
  brandName: $('brand-name'),
  brandSubtitle: $('brand-subtitle'),
  routineTitle: $('routine-title'),
  routineSummary: $('routine-summary'),
  presetPanel: $('preset-panel'),
  presetSelect: $('preset-select'),
  presetNote: $('preset-note'),
  modeAutoBtn: $('mode-auto-btn'),
  modeManualBtn: $('mode-manual-btn'),
  paceSlider: $('pace-slider'),
  paceValue: $('pace-value'),
  restSlider: $('rest-slider'),
  restValue: $('rest-value'),
  voiceName: $('voice-name'),
  testVoiceBtn: $('test-voice-btn'),
  toggleCuesBtn: $('toggle-cues-btn'),
  exerciseSettings: $('exercise-settings'),
  lastSessionCopy: $('last-session-copy'),
  lastSessionPreset: $('last-session-preset'),
  lastSessionDuration: $('last-session-duration'),
  lastSessionAt: $('last-session-at'),
  startBtn: $('start-btn'),
  homeView: $('home-view'),
  sessionView: $('session-view'),
  completeView: $('complete-view'),
  phaseBadge: $('phase-badge'),
  progressText: $('progress-text'),
  modeBadge: $('mode-badge'),
  currentLabel: $('current-label'),
  exerciseName: $('exercise-name'),
  exerciseCue: $('exercise-cue'),
  timerNumber: $('timer-number'),
  timerUnit: $('timer-unit'),
  holdWrap: $('hold-wrap'),
  holdNumber: $('hold-number'),
  nextCopy: $('next-copy'),
  statusRoutine: $('status-routine'),
  statusExercise: $('status-exercise'),
  statusSegment: $('status-segment'),
  prevBtn: $('prev-btn'),
  pauseBtn: $('pause-btn'),
  nextBtn: $('next-btn'),
  restartBtn: $('restart-btn'),
  skipBtn: $('skip-btn'),
  stopBtn: $('stop-btn'),
  doneBtn: $('done-btn'),
  completeRoutine: $('complete-routine'),
  completeExercises: $('complete-exercises'),
  completeDuration: $('complete-duration'),
  completeCopy: $('complete-copy'),
  jumpDialog: $('jump-dialog'),
  jumpList: $('jump-list'),
  openJumpBtn: $('open-jump-btn')
};

const app = {
  selectedPresetId: CFG.presets?.[0]?.id || 'default',
  mode: 'auto',
  globalPace: loadNumber('globalPace', CFG.defaultGlobalPace || 1),
  globalRestSec: loadNumber('globalRestSec', CFG.defaultRestSec || 60),
  voiceEnabled: loadBool('voiceEnabled', true),
  voices: [],
  selectedVoice: null,
  wakeLock: null,
  runnerToken: 0,
  paused: false,
  stopRequested: false,
  awaitingManual: false,
  session: null,
  sessionStartedAt: 0,
  currentSegmentRemainingMs: null,
  speechPrimed: false,
  audioManifest: null,
  currentAudio: null,
};

init();

async function init() {
  UI.brandName.textContent = CFG.brandLabel || CFG.appName;
  UI.brandSubtitle.textContent = CFG.headerSubtitle || CFG.subtitle || 'Guided routine';
  populatePresets();
  bindHome();
  bindSession();
  await loadAudioManifest();
  initVoices();
  renderHome();
  document.addEventListener('visibilitychange', handleVisibility);
}

function populatePresets() {
  if (!CFG.presets || CFG.presets.length <= 1) {
    UI.presetPanel.classList.add('hidden');
    return;
  }
  UI.presetSelect.innerHTML = '';
  CFG.presets.forEach((preset) => {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = preset.name;
    UI.presetSelect.appendChild(opt);
  });
  UI.presetSelect.value = app.selectedPresetId;
}

function bindHome() {
  UI.presetSelect?.addEventListener('change', () => {
    app.selectedPresetId = UI.presetSelect.value;
    persist('selectedPresetId', app.selectedPresetId);
    renderHome();
  });
  const storedPreset = localStorage.getItem(storageKey('selectedPresetId'));
  if (storedPreset && CFG.presets?.find(p => p.id === storedPreset)) app.selectedPresetId = storedPreset;
  UI.modeAutoBtn.addEventListener('click', () => setMode('auto'));
  UI.modeManualBtn.addEventListener('click', () => setMode('manual'));
  UI.paceSlider.value = String(app.globalPace);
  UI.paceSlider.addEventListener('input', () => {
    app.globalPace = parseFloat(UI.paceSlider.value);
    persist('globalPace', app.globalPace);
    renderHome();
  });
  UI.restSlider.value = String(app.globalRestSec);
  UI.restSlider.addEventListener('input', () => {
    app.globalRestSec = parseInt(UI.restSlider.value, 10);
    persist('globalRestSec', app.globalRestSec);
    renderHome();
  });
  UI.testVoiceBtn.addEventListener('click', async () => {
    await primeSpeech();
    await speak('Voice check. Smooth and steady.', true, 1);
  });
  UI.toggleCuesBtn.addEventListener('click', () => {
    app.voiceEnabled = !app.voiceEnabled;
    persist('voiceEnabled', app.voiceEnabled);
    renderHome();
  });
  UI.startBtn.addEventListener('click', startSession);
  UI.doneBtn.addEventListener('click', () => {
    showView('home');
    renderHome();
  });
  UI.openJumpBtn.disabled = true;
  UI.openJumpBtn.addEventListener('click', () => {
    if (app.session) UI.jumpDialog.showModal();
  });
}

function bindSession() {
  UI.pauseBtn.addEventListener('click', () => {
    if (app.awaitingManual) {
      startAwaitedManualExercise();
      return;
    }
    app.paused = !app.paused;
    if (app.currentAudio) {
      try {
        if (app.paused) app.currentAudio.pause();
        else app.currentAudio.play().catch(() => {});
      } catch (_) {}
    }
    if (!app.paused) speechSynthesis.resume?.();
    setPauseButtonState(app.paused ? 'play' : 'pause');
  });
  UI.prevBtn.addEventListener('click', () => jumpExercise(Math.max(0, (app.session?.exerciseIndex || 0) - 1)));
  UI.nextBtn.addEventListener('click', () => {
    if (app.awaitingManual) return startAwaitedManualExercise();
    jumpExercise(Math.min((app.session?.timeline.length || 1) - 1, (app.session?.exerciseIndex || 0) + 1));
  });
  UI.restartBtn.addEventListener('click', () => jumpExercise(app.session?.exerciseIndex || 0));
  UI.skipBtn?.addEventListener('click', () => skipSegment());
  UI.stopBtn.addEventListener('click', stopSession);
}

function setMode(mode) {
  app.mode = mode;
  persist('mode', mode);
  renderHome();
}
app.mode = localStorage.getItem(storageKey('mode')) || 'auto';

function renderHome() {
  const preset = getSelectedPreset();
  UI.routineTitle.textContent = preset.name || CFG.appName;
  UI.routineSummary.textContent = preset.summary || 'Guided session';
  UI.presetNote.textContent = preset.note || '';
  UI.modeAutoBtn.classList.toggle('active', app.mode === 'auto');
  UI.modeManualBtn.classList.toggle('active', app.mode === 'manual');
  UI.modeBadge.textContent = app.mode.toUpperCase();
  UI.paceValue.textContent = `${app.globalPace.toFixed(2)}×`;
  UI.restValue.textContent = `${app.globalRestSec}s`;
  UI.toggleCuesBtn.textContent = app.voiceEnabled ? 'Voice on' : 'Voice off';
  UI.startBtn.textContent = preset.restDay ? '☾ Open rest day' : '▶ Start session';
  UI.openJumpBtn.disabled = true;
  renderExerciseSettings(preset);
  renderLastSession();
}

function renderExerciseSettings(preset) {
  const all = [...(preset.warmups || []), ...(preset.exercises || [])];
  UI.exerciseSettings.innerHTML = '';
  all.forEach((exercise) => {
    const pace = getExercisePace(exercise.key);
    const wrap = document.createElement('div');
    wrap.className = 'exercise-setting';
    const firstSegment = exercise.segments?.[0] || null;
    const meta = firstSegment ? `${exercise.phase === 'warmup' ? 'Warm-up' : 'Main'} · ${segmentDescriptor(firstSegment)}` : (exercise.phase === 'warmup' ? 'Warm-up' : 'Main');
    wrap.innerHTML = `
      <div class="exercise-setting-header">
        <div>
          <div class="exercise-setting-title">${escapeHtml(exercise.name)}</div>
          <small>${escapeHtml(meta)}</small>
        </div>
        <strong>${pace.toFixed(2)}×</strong>
      </div>
      <input type="range" min="0.50" max="1.75" step="0.05" value="${pace.toFixed(2)}" data-key="${exercise.key}" />
    `;
    wrap.querySelector('input').addEventListener('input', (e) => {
      setExercisePace(exercise.key, parseFloat(e.target.value));
      renderHome();
    });
    UI.exerciseSettings.appendChild(wrap);
  });
}

function getSelectedPreset() {
  return CFG.presets?.find((p) => p.id === app.selectedPresetId) || CFG.presets?.[0] || CFG;
}

function buildTimeline(preset) {
  if (preset.restDay) {
    return [{ key: 'rest-day', phase: 'rest', name: preset.name, cue: preset.note || 'Light walking only.', manualEligible: false, segments: [{ type: 'timed', label: 'Rest day', durationSec: 15, announce: 'Rest day. Light walking only. No loaded work today.' }] }];
  }
  const base = [...(preset.warmups || []), ...(preset.exercises || [])].map((exercise) => ({
    ...exercise,
    segments: (exercise.segments || []).map((segment) => ({ ...segment }))
  }));
  for (let i = 0; i < base.length - 1; i += 1) {
    const current = base[i];
    const next = base[i + 1];
    if (current.phase === 'main' && next.phase === 'main') {
      current.segments.push({ type: 'rest', durationSec: app.globalRestSec || CFG.defaultRestSec || 60, label: 'Exercise break', announce: `Next: ${next.name}. Rest starts now.` });
    }
  }
  return base;
}

async function startSession() {
  const preset = getSelectedPreset();
  const timeline = buildTimeline(preset);
  app.runnerToken += 1;
  app.stopRequested = false;
  app.paused = false;
  app.awaitingManual = false;
  app.sessionStartedAt = Date.now();
  app.session = { preset, timeline, exerciseIndex: 0, segmentIndex: 0, completedExercises: 0 };
  setPauseButtonState('pause');
  await primeSpeech();
  await acquireWakeLock();
  UI.openJumpBtn.disabled = false;
  showView('session');
  renderJumpList();
  if (!preset.restDay) {
    await runLeadIn(app.runnerToken);
  }
  if (app.mode === 'manual' && timeline[0] && timeline[0].phase === 'main') {
    app.session.pendingManualStart = true;
  }
  runCurrentPosition(app.runnerToken).catch(() => {});
}

async function runLeadIn(token) {
  const preset = app.session?.preset || {};
  const introText = resolveLeadInSpeech(preset);
  setDisplay({ phase: 'READY', label: '', name: preset.name || CFG.appName, cue: 'Get set.', number: '', unit: '', next: '' });
  hideHoldDisplay();
  const spokenMs = await speak(introText, true, 1);
  await waitRemaining(CFG.introLeadInSec * 1000, spokenMs, token);
}

async function runCurrentPosition(token) {
  if (!app.session || token !== app.runnerToken || app.stopRequested) return;
  const exercise = app.session.timeline[app.session.exerciseIndex];
  if (!exercise) return completeSession();
  if (app.session.pendingManualStart) return waitForManualStart();
  const segment = exercise.segments[app.session.segmentIndex];
  if (!segment) return advanceExercise(token);

  const nextExercise = app.session.timeline[app.session.exerciseIndex + 1] || null;
  const nextName = nextExercise ? nextExercise.name : 'Finish';
  const segmentTitle = segment.label || exercise.name;
  const segmentMeta = segmentDescriptor(segment);
  setDisplay({
    phase: exercise.phase === 'warmup' ? 'WARM-UP' : (segment.type === 'rest' ? 'REST' : 'WORK'),
    label: segment.type === 'rest' ? 'Rest block' : (segmentMeta ? `${segmentTitle} · ${segmentMeta}` : segmentTitle),
    name: exercise.name,
    cue: exercise.cue,
    number: segment.type === 'count' ? segment.reps : displayDuration(exercise, segment),
    unit: segment.type === 'count' ? 'REPS' : 'SECONDS',
    next: `Up next: ${nextName}`
  });
  syncHoldDisplay(segment);
  UI.progressText.textContent = `${app.session.exerciseIndex + 1} / ${app.session.timeline.length}`;
  if (UI.statusRoutine) UI.statusRoutine.textContent = app.session.preset.name;
  if (UI.statusExercise) UI.statusExercise.textContent = exercise.name;
  if (UI.statusSegment) UI.statusSegment.textContent = segmentMeta ? `${segmentTitle} · ${segmentMeta}` : segmentTitle;

  if (segment.type === 'rest') {
    await speak(segment.announce || `Rest. ${segment.label || ''}`.trim(), true, 1);
    await runCountdownSegment(segment, token, true);
    stepForward();
    return runCurrentPosition(token);
  }

  await speak(segment.announce || exercise.name, true, 1);
  await runAnnouncementPrep(segment, token);

  if (segment.type === 'count') {
    await runCountSegment(exercise, segment, token);
  } else if (segment.type === 'timed' || segment.type === 'hold') {
    await runCountdownSegment(segment, token, false);
  } else if (segment.type === 'breath') {
    await runBreathSegment(segment, token);
  }

  stepForward();
  return runCurrentPosition(token);
}

function waitForManualStart() {
  app.awaitingManual = true;
  setPauseButtonState('manual');
  UI.phaseBadge.textContent = 'MANUAL';
  UI.currentLabel.textContent = 'Awaiting your tap';
  UI.exerciseCue.textContent = 'Warm-ups auto-run. Main exercises wait for Next in manual mode.';
}

function startAwaitedManualExercise() {
  if (!app.awaitingManual) return;
  app.awaitingManual = false;
  if (app.session) app.session.pendingManualStart = false;
  setPauseButtonState('pause');
  runCurrentPosition(app.runnerToken).catch(() => {});
}

function stepForward() {
  if (!app.session) return;
  const exercise = app.session.timeline[app.session.exerciseIndex];
  if (app.session.segmentIndex < exercise.segments.length - 1) {
    app.session.segmentIndex += 1;
    return;
  }
  app.session.completedExercises += 1;
  app.session.exerciseIndex += 1;
  app.session.segmentIndex = 0;
  const upcoming = app.session.timeline[app.session.exerciseIndex];
  app.session.pendingManualStart = Boolean(app.mode === 'manual' && upcoming && upcoming.phase === 'main');
}

async function advanceExercise(token) {
  const finished = app.session?.timeline?.[app.session.exerciseIndex] || null;
  stepForward();
  const upcoming = app.session?.timeline?.[app.session.exerciseIndex] || null;
  if (finished && upcoming && finished.phase === 'warmup' && upcoming.phase === 'main') {
    await runWarmupToMainTransition(upcoming, token);
  }
  return runCurrentPosition(token);
}

async function runWarmupToMainTransition(upcoming, token) {
  setDisplay({
    phase: 'READY',
    label: 'Warm-up complete',
    name: upcoming.name,
    cue: upcoming.cue || 'Get into position.',
    number: 5,
    unit: 'PREP',
    next: `Up next: ${upcoming.name}`
  });
  UI.statusExercise.textContent = upcoming.name;
  UI.statusSegment.textContent = 'Transition';
  await speak(`Warm-up complete. Next: ${upcoming.name}.`, true, 1);
  await runPrepCountdown(5, token, 'PREP');
}

async function runAnnouncementPrep(segment, token) {
  const prepSec = Math.max(0, CFG.announcementDelaySec || 0);
  if (!prepSec) return;
  await waitMs(prepSec * 1000, token);
}

async function runPrepCountdown(seconds, token, unit = 'PREP') {
  for (let remaining = seconds; remaining > 0; remaining -= 1) {
    ensureAlive(token);
    UI.timerNumber.textContent = String(remaining);
    UI.timerUnit.textContent = unit;
    fireTimerCue(remaining, { loudFinal: true, voiceFinal: true });
    await waitMs(1000, token);
  }
  UI.timerNumber.textContent = '0';
  UI.timerUnit.textContent = unit;
}

async function runCountSegment(exercise, segment, token) {
  const pace = app.globalPace * getExercisePace(exercise.key);
  const perRepMs = Math.max(450, (segment.paceSec * 1000) / pace);
  const alternatingSides = Boolean(segment.alternatingSides);
  const fixedSide = segment.side || null;
  const sides = alternatingSides ? ['Left', 'Right'] : [fixedSide];
  const baseLabel = segment.label || exercise.name;
  syncHoldDisplay(segment);
  clearHoldCounter();
  for (let rep = 1; rep <= segment.reps; rep++) {
    for (const side of sides) {
      ensureAlive(token);
      const repStartedAt = Date.now();
      UI.timerNumber.textContent = String(rep);
      UI.timerUnit.textContent = side ? side.toUpperCase() : 'REPS';
      UI.currentLabel.textContent = side ? `${baseLabel} · ${side}` : baseLabel;
      if (alternatingSides) {
        await speak(side || '', true, 1.02);
        if (segment.holdSec) {
          await runRepHold(segment, token);
        }
      } else if (segment.holdSec) {
        await speak(String(rep), true, 1.05);
        await runRepHold(segment, token);
      } else {
        await speak(String(rep), true, 1.05);
      }
      const elapsedMs = Date.now() - repStartedAt;
      await waitRemaining(perRepMs, elapsedMs, token);
      clearHoldCounter();
    }
  }
}

async function runRepHold(segment, token) {
  const holdSec = Math.max(1, Math.round(segment.holdSec));
  syncHoldDisplay(segment);
  for (let remaining = holdSec; remaining > 0; remaining -= 1) {
    ensureAlive(token);
    UI.holdNumber.textContent = String(remaining);
    beep(remaining <= 3 ? 980 : 820, remaining <= 3 ? 0.16 : 0.12, remaining <= 3 ? 0.085 : 0.07);
    await waitMs(1000, token);
  }
  clearHoldCounter();
}

async function runCountdownSegment(segment, token, isRest) {
  let remainingSec = displayDuration(app.session.timeline[app.session.exerciseIndex], segment);
  while (remainingSec > 0) {
    ensureAlive(token);
    UI.timerNumber.textContent = String(remainingSec);
    UI.timerUnit.textContent = 'SECONDS';
    fireTimerCue(remainingSec, { loudFinal: !isRest, voiceFinal: false, rest: isRest });
    await waitMs(1000, token);
    remainingSec -= 1;
  }
  UI.timerNumber.textContent = '0';
}

async function runBreathSegment(segment, token) {
  const pace = app.globalPace;
  for (let i = 1; i <= segment.cycles; i++) {
    ensureAlive(token);
    UI.timerNumber.textContent = String(i);
    UI.timerUnit.textContent = 'BREATH';
    UI.exerciseCue.textContent = 'Inhale through the nose, then long controlled exhale.';
    const inhaleSpokenMs = await speak('Inhale', true, 0.98);
    await waitRemaining((segment.inhaleSec * 1000) / pace, inhaleSpokenMs, token);
    UI.timerUnit.textContent = 'EXHALE';
    const exhaleSpokenMs = await speak('Exhale', true, 0.95);
    await waitRemaining((segment.exhaleSec * 1000) / pace, exhaleSpokenMs, token);
  }
}

function displayDuration(exercise, segment) {
  const exercisePace = exercise ? getExercisePace(exercise.key) : 1;
  if (segment.type === 'timed' || segment.type === 'hold') return Math.max(1, Math.round(segment.durationSec / (app.globalPace * exercisePace)));
  if (segment.type === 'rest') return Math.max(1, Math.round(segment.durationSec));
  return segment.durationSec || 0;
}

async function waitMs(ms, token, countdown = null, unit = '') {
  let remaining = ms;
  while (remaining > 0) {
    ensureAlive(token);
    if (app.paused) {
      await sleep(120);
      continue;
    }
    const slice = Math.min(120, remaining);
    await sleep(slice);
    remaining -= slice;
    if (countdown !== null) {
      const display = Math.max(1, Math.ceil(remaining / 1000));
      UI.timerNumber.textContent = String(display);
      UI.timerUnit.textContent = unit;
    }
  }
  if (countdown !== null) {
    UI.timerNumber.textContent = '0';
    UI.timerUnit.textContent = unit;
  }
}

async function waitRemaining(targetMs, spentMs, token, countdown = null, unit = '') {
  const remaining = Math.max(0, targetMs - Math.max(0, spentMs || 0));
  await waitMs(remaining, token, countdown, unit);
}

function ensureAlive(token) {
  if (token !== app.runnerToken || app.stopRequested) throw new Error('stale-run');
}

function jumpExercise(index) {
  if (!app.session) return;
  if (index < 0 || index >= app.session.timeline.length) return;
  app.runnerToken += 1;
  app.paused = false;
  app.awaitingManual = false;
  stopActiveSpeech();
  hideHoldDisplay();
  app.session.exerciseIndex = index;
  app.session.segmentIndex = 0;
  const chosen = app.session.timeline[index];
  app.session.pendingManualStart = Boolean(app.mode === 'manual' && chosen && chosen.phase === 'main');
  setPauseButtonState(app.session.pendingManualStart ? 'manual' : 'pause');
  runCurrentPosition(app.runnerToken).catch(() => {});
  if (UI.jumpDialog.open) UI.jumpDialog.close();
}

function renderJumpList() {
  if (!app.session) return;
  UI.jumpList.innerHTML = '';
  app.session.timeline.forEach((exercise, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jump-item';
    btn.innerHTML = `<strong>${idx + 1}. ${escapeHtml(exercise.name)}</strong><small>${escapeHtml(exercise.phase === 'warmup' ? 'Warm-up' : 'Main')}</small>`;
    btn.addEventListener('click', () => jumpExercise(idx));
    UI.jumpList.appendChild(btn);
  });
}

function stopSession() {
  app.stopRequested = true;
  app.runnerToken += 1;
  app.paused = false;
  app.awaitingManual = false;
  hideHoldDisplay();
  stopActiveSpeech();
  releaseWakeLock();
  app.session = null;
  UI.openJumpBtn.disabled = true;
  showView('home');
  renderHome();
}

function completeSession() {
  hideHoldDisplay();
  const elapsed = Date.now() - app.sessionStartedAt;
  const summary = {
    preset: app.session?.preset?.name || CFG.appName,
    exercises: app.session?.timeline?.length || 0,
    durationMs: elapsed,
    completedAt: new Date().toISOString()
  };
  persistJson('lastSession', summary);
  UI.completeRoutine.textContent = summary.preset;
  UI.completeExercises.textContent = `${summary.exercises}`;
  UI.completeDuration.textContent = formatDuration(summary.durationMs);
  UI.completeCopy.textContent = app.session?.preset?.restDay ? 'Rest day logged locally.' : 'Finished offline and ready to rerun anytime.';
  releaseWakeLock();
  app.session = null;
  UI.openJumpBtn.disabled = true;
  showView('complete');
}

function skipSegment() {
  if (!app.session) return;
  app.runnerToken += 1;
  app.paused = false;
  app.awaitingManual = false;
  stopActiveSpeech();
  hideHoldDisplay();
  stepForward();
  setPauseButtonState(app.session?.pendingManualStart ? 'manual' : 'pause');
  runCurrentPosition(app.runnerToken).catch(() => {});
}

function syncHoldDisplay(segment) {
  if (!UI.holdWrap) return;
  const show = Boolean(segment && segment.type === 'count' && segment.holdSec);
  UI.holdWrap.classList.toggle('hidden', !show);
  if (!show) clearHoldCounter();
}

function clearHoldCounter() {
  if (!UI.holdNumber) return;
  UI.holdNumber.textContent = '';
}

function hideHoldDisplay() {
  if (!UI.holdWrap) return;
  UI.holdWrap.classList.add('hidden');
  clearHoldCounter();
}

function stopActiveSpeech() {
  speechSynthesis?.cancel?.();
  if (app.currentAudio) {
    try { app.currentAudio.pause(); } catch (_) {}
    app.currentAudio = null;
  }
}

function showView(which) {
  [UI.homeView, UI.sessionView, UI.completeView].forEach((view) => view.classList.remove('active'));
  UI.openJumpBtn.classList.toggle('hidden', which !== 'session');
  if (which === 'home') UI.homeView.classList.add('active');
  else if (which === 'session') UI.sessionView.classList.add('active');
  else UI.completeView.classList.add('active');
}

function setDisplay({ phase, label, name, cue, number, unit, next }) {
  UI.phaseBadge.textContent = phase;
  UI.currentLabel.textContent = label;
  UI.exerciseName.textContent = name;
  UI.exerciseCue.textContent = cue;
  UI.timerNumber.textContent = String(number);
  UI.timerUnit.textContent = unit;
  if (UI.nextCopy) UI.nextCopy.textContent = next || '';
}

async function loadAudioManifest() {
  try {
    const res = await fetch('./audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    app.audioManifest = await res.json();
    if (app.audioManifest?.engine) {
      UI.voiceName.textContent = `Bundled audio (${app.audioManifest.engine})`;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function initVoices() {
  if (!window.speechSynthesis) {
    if (!app.audioManifest) UI.voiceName.textContent = 'Unavailable';
    return;
  }
  const load = () => {
    app.voices = speechSynthesis.getVoices() || [];
    if (!app.voices.length) return;
    app.selectedVoice = app.voices.find(v => v.name === 'Google UK English Female')
      || app.voices.find(v => v.name === 'Google US English')
      || app.voices.find(v => v.lang?.startsWith('en') && v.name?.includes('Google'))
      || app.voices.find(v => v.lang?.startsWith('en'))
      || app.voices[0];
    if (!app.audioManifest) UI.voiceName.textContent = app.selectedVoice?.name || 'System voice';
  };
  load();
  speechSynthesis.addEventListener('voiceschanged', load);
}

async function primeSpeech() {
  if (app.speechPrimed || !window.speechSynthesis) return;
  try {
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    warm.rate = 1;
    warm.voice = app.selectedVoice;
    speechSynthesis.cancel();
    speechSynthesis.speak(warm);
  } catch (_) {}
  app.speechPrimed = true;
}

function bundledAudioPath(text) {
  if (!app.audioManifest || !text) return null;
  const manifest = app.audioManifest;
  if (/^\d+$/.test(String(text)) && manifest.numbers?.[String(text)]) return manifest.numbers[String(text)];
  return manifest.phrases?.[text] || null;
}

function resolveLeadInSpeech(preset) {
  const preferred = preset.introSpeech || CFG.introSpeech || preset.name || CFG.appName;
  if (!app.audioManifest || bundledAudioPath(preferred)) return preferred;
  const firstExercise = app.session?.timeline?.[0] || null;
  const firstSegment = firstExercise?.segments?.[0] || null;
  const fallback = firstSegment?.announce || firstExercise?.name || preferred;
  return fallback;
}


function fireTimerCue(value, options = {}) {
  const { loudFinal = false, voiceFinal = false, rest = false } = options;
  const finalWindow = loudFinal ? 3 : 0;
  const isFinal = value <= finalWindow && finalWindow > 0;
  if (isFinal && voiceFinal && app.voiceEnabled) {
    speakDetached(String(value));
    return;
  }
  const freq = isFinal ? 960 : (rest ? 640 : 780);
  const volume = isFinal ? 0.18 : (rest ? 0.1 : 0.14);
  const duration = isFinal ? 0.09 : 0.07;
  beep(freq, volume, duration);
}

function speakDetached(text) {
  if (!text) return;
  const bundled = bundledAudioPath(text);
  if (bundled) {
    try {
      const audio = new Audio(bundled);
      audio.preload = 'auto';
      audio.volume = AUDIO_PLAYBACK_VOLUME;
      audio.play().catch(() => {});
      return;
    } catch (_) {}
  }
  if (!window.speechSynthesis || !app.voiceEnabled) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = app.selectedVoice;
    u.rate = 1;
    u.pitch = 1;
    u.volume = SPEECH_VOLUME;
    speechSynthesis.speak(u);
  } catch (_) {}
}

function beep(freq = 760, volume = 0.1, durationSec = 0.08) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!app.beepCtx) app.beepCtx = new Ctx();
    const ctx = app.beepCtx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.min(0.35, volume * BEEP_GAIN_MULTIPLIER), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  } catch (_) {}
}

async function playBundled(path) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    try {
      const audio = new Audio(path);
      app.currentAudio = audio;
      audio.preload = 'auto';
      audio.volume = AUDIO_PLAYBACK_VOLUME;
      audio.onended = () => {
        if (app.currentAudio === audio) app.currentAudio = null;
        resolve(Date.now() - startedAt);
      };
      audio.onerror = () => {
        if (app.currentAudio === audio) app.currentAudio = null;
        resolve(0);
      };
      audio.play().catch(() => {
        if (app.currentAudio === audio) app.currentAudio = null;
        resolve(0);
      });
    } catch (_) {
      app.currentAudio = null;
      resolve(0);
    }
  });
}

async function speak(text, cancel = true, rate = 1) {
  if (!app.voiceEnabled || !text) return 0;
  if (cancel) stopActiveSpeech();
  const bundled = bundledAudioPath(text);
  if (bundled) {
    return playBundled(bundled);
  }
  if (app.audioManifest) return 0;
  if (!window.speechSynthesis) return 0;
  speechSynthesis.resume?.();
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = app.selectedVoice;
    u.rate = rate;
    u.pitch = 1;
    u.volume = SPEECH_VOLUME;
    u.onend = () => setTimeout(() => resolve(Date.now() - startedAt), 40);
    u.onerror = () => resolve(0);
    speechSynthesis.speak(u);
  });
}

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (!app.wakeLock) app.wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {}
}

function releaseWakeLock() {
  if (app.wakeLock) app.wakeLock.release().catch(() => {});
  app.wakeLock = null;
}

async function handleVisibility() {
  if (document.visibilityState === 'visible' && app.session) {
    await acquireWakeLock();
    speechSynthesis.resume?.();
  }
}

function setPauseButtonState(mode) {
  if (!UI.pauseBtn) return;
  if (mode === 'play') {
    UI.pauseBtn.textContent = '▶';
    UI.pauseBtn.title = 'Resume';
    return;
  }
  if (mode === 'manual') {
    UI.pauseBtn.textContent = '▶';
    UI.pauseBtn.title = 'Start next';
    return;
  }
  UI.pauseBtn.textContent = '⏸';
  UI.pauseBtn.title = 'Pause';
}

function segmentDescriptor(segment) {
  if (!segment) return '';
  if (segment.type === 'count') {
    const repsText = segment.alternatingSides ? `${segment.reps} reps per side` : `${segment.reps} reps${segment.side ? ` · ${segment.side}` : ''}`;
    return `${repsText}${segment.holdSec ? ` · ${segment.holdSec}s hold` : ''}`;
  }
  if (segment.type === 'timed' || segment.type === 'hold' || segment.type === 'rest') return `${segment.durationSec}s`;
  if (segment.type === 'breath') return `${segment.cycles} cycles`;
  return '';
}

function renderLastSession() {
  const last = loadJson('lastSession', null);
  if (!last) {
    UI.lastSessionCopy.textContent = 'No completed session saved yet.';
    UI.lastSessionPreset.textContent = '—';
    UI.lastSessionDuration.textContent = '—';
    UI.lastSessionAt.textContent = '—';
    return;
  }
  UI.lastSessionCopy.textContent = 'Saved locally on this device for a quick confidence check.';
  UI.lastSessionPreset.textContent = last.preset || '—';
  UI.lastSessionDuration.textContent = formatDuration(last.durationMs || 0);
  UI.lastSessionAt.textContent = new Date(last.completedAt).toLocaleString();
}

function getExercisePace(key) {
  return loadNumber(`pace:${key}`, 1);
}
function setExercisePace(key, val) {
  persist(`pace:${key}`, val);
}
function persist(key, value) {
  localStorage.setItem(storageKey(key), String(value));
}
function persistJson(key, value) {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}
function loadJson(key, fallback) {
  const raw = localStorage.getItem(storageKey(key));
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}
function loadNumber(key, fallback) {
  const raw = localStorage.getItem(storageKey(key));
  return raw === null ? fallback : parseFloat(raw);
}
function loadBool(key, fallback) {
  const raw = localStorage.getItem(storageKey(key));
  return raw === null ? fallback : raw === 'true';
}
function storageKey(key) {
  return `${CFG.shortName}:${key}`;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function formatDuration(ms) {
  const total = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
