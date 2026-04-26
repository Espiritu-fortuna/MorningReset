(() => {
  const count = (label, reps, paceSec, extra = {}) => ({ type: 'count', label, reps, paceSec, ...extra });
  const timed = (label, durationSec, extra = {}) => ({ type: 'timed', label, durationSec, ...extra });
  const hold = (label, durationSec, extra = {}) => ({ type: 'hold', label, durationSec, ...extra });
  const breath = (label, cycles, inhaleSec, exhaleSec, extra = {}) => ({ type: 'breath', label, cycles, inhaleSec, exhaleSec, ...extra });
  const rest = (durationSec, extra = {}) => ({ type: 'rest', durationSec, ...extra });

  function standardMorningMain() {
    return [
      {
        key: 'reverse-lunge',
        phase: 'main',
        name: 'Dumbbell Reverse Lunge',
        cue: 'Torso tall. Step backward. Drive through the front heel.',
        manualEligible: true,
        segments: [
          count('Set 1', 20, 3.2, { announce: 'Dumbbell Reverse Lunge. Set 1. Twenty total reps, alternating.' }),
          rest(60, { announce: 'Rest. Set 2 of reverse lunges is next.' }),
          count('Set 2', 20, 3.2, { announce: 'Reverse Lunge. Set 2. Twenty total reps, alternating.' }),
          rest(60, { announce: 'Rest. Set 3 of reverse lunges is next.' }),
          count('Set 3', 20, 3.2, { announce: 'Reverse Lunge. Set 3. Twenty total reps, alternating.' })
        ]
      },
      {
        key: 'weighted-glute-bridge',
        phase: 'main',
        name: 'Weighted Glute Bridge',
        cue: 'Tuck tailbone first. Lift. Hard squeeze. No hyperextension.',
        manualEligible: true,
        segments: [
          count('Set 1', 12, 4.8, { announce: 'Weighted Glute Bridge. Set 1. Three second squeeze at the top of every rep.', holdSec: 3 }),
          rest(60, { announce: 'Rest. Set 2 of glute bridges is next.' }),
          count('Set 2', 12, 4.8, { announce: 'Weighted Glute Bridge. Set 2.', holdSec: 3 }),
          rest(60, { announce: 'Rest. Set 3 of glute bridges is next.' }),
          count('Set 3', 12, 4.8, { announce: 'Weighted Glute Bridge. Set 3.', holdSec: 3 })
        ]
      },
      {
        key: 'floor-press',
        phase: 'main',
        name: 'Dumbbell Floor Press',
        cue: 'Elbows touch the floor, then press. Shoulder blades stay squeezed.',
        manualEligible: true,
        segments: [
          count('Set 1', 10, 3.5, { announce: 'Dumbbell Floor Press. Set 1.' }),
          rest(60, { announce: 'Rest. Set 2 of floor press is next.' }),
          count('Set 2', 10, 3.5, { announce: 'Dumbbell Floor Press. Set 2.' }),
          rest(60, { announce: 'Rest. Set 3 of floor press is next.' }),
          count('Set 3', 10, 3.5, { announce: 'Dumbbell Floor Press. Set 3.' })
        ]
      },
      {
        key: 'pullover',
        phase: 'main',
        name: 'Lying Dumbbell Pullover',
        cue: 'Slow arc over the head. Slight bend in the arms. Deep stretch, then pull back.',
        manualEligible: true,
        segments: [
          count('Set 1', 10, 4.0, { announce: 'Lying Dumbbell Pullover. Set 1.' }),
          rest(60, { announce: 'Rest. Set 2 of pullovers is next.' }),
          count('Set 2', 10, 4.0, { announce: 'Lying Dumbbell Pullover. Set 2.' }),
          rest(60, { announce: 'Rest. Set 3 of pullovers is next.' }),
          count('Set 3', 10, 4.0, { announce: 'Lying Dumbbell Pullover. Set 3.' })
        ]
      },
      {
        key: 'suitcase-carry',
        phase: 'main',
        name: 'Dumbbell Suitcase Carry',
        cue: 'Walk tall. No leaning. Keep hips and shoulders level.',
        manualEligible: true,
        segments: [
          timed('Right side, round 1', 30, { announce: 'Suitcase Carry. Right side, round 1.' }),
          rest(60, { announce: 'Rest. Left side, round 1 is next.' }),
          timed('Left side, round 1', 30, { announce: 'Suitcase Carry. Left side, round 1.' }),
          rest(60, { announce: 'Rest. Right side, round 2 is next.' }),
          timed('Right side, round 2', 30, { announce: 'Suitcase Carry. Right side, round 2.' }),
          rest(60, { announce: 'Rest. Left side, round 2 is next.' }),
          timed('Left side, round 2', 30, { announce: 'Suitcase Carry. Left side, round 2.' })
        ]
      }
    ];
  }

  function lightMorningMain() {
    return [
      {
        key: 'reverse-lunge-light',
        phase: 'main',
        name: 'Bodyweight Reverse Lunge',
        cue: 'Same pattern, slower control, longer holds at the bottom.',
        manualEligible: true,
        segments: [
          count('Set 1', 20, 4.6, { announce: 'Bodyweight Reverse Lunge. Set 1. Hold each rep a little longer.' }),
          rest(60, { announce: 'Rest. Set 2 is next.' }),
          count('Set 2', 20, 4.6, { announce: 'Bodyweight Reverse Lunge. Set 2.' }),
          rest(60, { announce: 'Rest. Set 3 is next.' }),
          count('Set 3', 20, 4.6, { announce: 'Bodyweight Reverse Lunge. Set 3.' })
        ]
      },
      {
        key: 'glute-bridge-light',
        phase: 'main',
        name: 'Glute Bridge, Light Day',
        cue: 'Posterior pelvic tilt first. Longer squeeze at the top.',
        manualEligible: true,
        segments: [
          count('Set 1', 12, 5.6, { announce: 'Glute Bridge. Set 1. Slow controlled tempo.', holdSec: 3 }),
          rest(60, { announce: 'Rest. Set 2 is next.' }),
          count('Set 2', 12, 5.6, { announce: 'Glute Bridge. Set 2.', holdSec: 3 }),
          rest(60, { announce: 'Rest. Set 3 is next.' }),
          count('Set 3', 12, 5.6, { announce: 'Glute Bridge. Set 3.', holdSec: 3 })
        ]
      },
      {
        key: 'floor-press-light',
        phase: 'main',
        name: 'Bodyweight Floor Press Pattern',
        cue: 'Use the same movement pattern with no dumbbells. Control the pause on the floor.',
        manualEligible: true,
        segments: [
          count('Set 1', 10, 4.8, { announce: 'Floor Press Pattern. Set 1. Slower time under tension.' }),
          rest(60, { announce: 'Rest. Set 2 is next.' }),
          count('Set 2', 10, 4.8, { announce: 'Floor Press Pattern. Set 2.' }),
          rest(60, { announce: 'Rest. Set 3 is next.' }),
          count('Set 3', 10, 4.8, { announce: 'Floor Press Pattern. Set 3.' })
        ]
      },
      {
        key: 'pullover-light',
        phase: 'main',
        name: 'Pullover Pattern, Light Day',
        cue: 'Longer stretch and longer return. No suitcase carry on day 6.',
        manualEligible: true,
        segments: [
          count('Set 1', 10, 5.0, { announce: 'Pullover Pattern. Set 1.' }),
          rest(60, { announce: 'Rest. Set 2 is next.' }),
          count('Set 2', 10, 5.0, { announce: 'Pullover Pattern. Set 2.' }),
          rest(60, { announce: 'Rest. Set 3 is next.' }),
          count('Set 3', 10, 5.0, { announce: 'Pullover Pattern. Set 3.' })
        ]
      }
    ];
  }

  const warmups = [
    { key: 'arm-circles-forward', phase: 'warmup', name: 'Arm Circles', cue: 'Small to large circles.', manualEligible: false, segments: [timed('Forward · 30 sec', 30, { announce: 'Warm-up. Arm circles forward.' })] },
    { key: 'arm-circles-backward', phase: 'warmup', name: 'Arm Circles', cue: 'Reverse direction.', manualEligible: false, segments: [timed('Backward · 30 sec', 30, { announce: 'Arm circles backward.' })] },
    { key: 'shoulder-rolls-forward', phase: 'warmup', name: 'Shoulder Rolls', cue: 'Controlled forward circles.', manualEligible: false, segments: [count('Forward · 10 reps', 10, 1.0, { announce: 'Shoulder rolls forward.' })] },
    { key: 'shoulder-rolls-backward', phase: 'warmup', name: 'Shoulder Rolls', cue: 'Reverse with the same control.', manualEligible: false, segments: [count('Backward · 10 reps', 10, 1.0, { announce: 'Shoulder rolls backward.' })] },
    { key: 'shoulder-shrugs', phase: 'warmup', name: 'Shoulder Shrugs', cue: 'Lift and lower without rushing.', manualEligible: false, segments: [count('Shrugs · 10 reps', 10, 1.0, { announce: 'Shoulder shrugs.' })] },
    { key: 'hip-circles-left-forward', phase: 'warmup', name: 'Standing Hip Circles', cue: 'Raise the knee and draw smooth circles.', manualEligible: false, segments: [count('Left forward · 10 reps', 10, 1.4, { announce: 'Standing hip circles. Left side, first direction.' })] },
    { key: 'hip-circles-left-reverse', phase: 'warmup', name: 'Standing Hip Circles', cue: 'Same leg, reverse direction.', manualEligible: false, segments: [count('Left reverse · 10 reps', 10, 1.4, { announce: 'Left side, reverse direction.' })] },
    { key: 'hip-circles-right-forward', phase: 'warmup', name: 'Standing Hip Circles', cue: 'Switch sides, first direction.', manualEligible: false, segments: [count('Right forward · 10 reps', 10, 1.4, { announce: 'Right side, first direction.' })] },
    { key: 'hip-circles-right-reverse', phase: 'warmup', name: 'Standing Hip Circles', cue: 'Same side, reverse direction.', manualEligible: false, segments: [count('Right reverse · 10 reps', 10, 1.4, { announce: 'Right side, reverse direction.' })] },
    { key: 'knee-pulls', phase: 'warmup', name: 'Standing Knee Pulls', cue: 'Alternate sides, gentle pull toward the chest.', manualEligible: false, segments: [timed('Alternating · 30 sec', 30, { announce: 'Standing knee pulls, alternating.' })] },
    { key: 'heel-raises', phase: 'warmup', name: 'Heel Raises', cue: 'Rise onto the balls of the feet, control down.', manualEligible: false, segments: [count('20 reps', 20, 1.8, { announce: 'Heel raises.' })] }
  ];

  window.ROUTINE_CONFIG = {
    appName: 'MorningReset',
    brandLabel: '☀ MORNING RESET',
    shortName: 'Morning',
    themeColor: '#05070b',
    subtitle: 'Same morning every day',
    headerSubtitle: 'Daily morning flow',
    introLeadInSec: 5,
    announcementDelaySec: 2,
    defaultGlobalPace: 1,
    defaultRestSec: 60,
    presets: [
      {
        id: 'standard',
        name: 'Standard morning',
        note: 'Default 30-minute routine. Warm-up plus loaded work.',
        summary: 'Warm-up plus 5 loaded exercises.',
        warmups,
        exercises: standardMorningMain()
      },
      {
        id: 'day6',
        name: 'Day 6 lighter',
        note: 'Bodyweight only. Longer holds, no suitcase carry.',
        summary: 'Lighter bodyweight version with slower time under tension.',
        warmups,
        exercises: lightMorningMain()
      },
      {
        id: 'day7',
        name: 'Day 7 rest',
        note: 'Full rest. Light walking only.',
        summary: 'Rest-day reminder only.',
        restDay: true,
        warmups: [],
        exercises: []
      }
    ]
  };
})();
