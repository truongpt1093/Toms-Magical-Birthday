const test = require('node:test');
const assert = require('node:assert/strict');
const { getScene5Opener, SCENE_DURATIONS, calculateIntentPause, shouldTriggerOpenOnGesture, shouldTriggerSceneAdvanceGesture } = require('../script.js');

test('Client-side guest greeting formatting logic', async (t) => {
  function formatGuestGreeting(template, guestName, defaultGreeting) {
    if (!guestName || !guestName.trim()) {
      return defaultGreeting;
    }
    return template.replace('{guest}', guestName.trim());
  }

  await t.test('formats greeting when guest name is provided', () => {
    const template = 'Sự hiện diện và lời chúc của {guest} là niềm hạnh phúc lớn nhất của Tom và cả gia đình!';
    const defaultGreeting = 'Sự hiện diện của Cô Chú, Bác và Bạn bè là món quà ý nghĩa nhất dành cho Tom trong ngày sinh nhật đầu đời!';
    const result = formatGuestGreeting(template, 'Anh Trường', defaultGreeting);
    assert.equal(result, 'Sự hiện diện và lời chúc của Anh Trường là niềm hạnh phúc lớn nhất của Tom và cả gia đình!');
  });

  await t.test('falls back to default greeting when guest name is absent or empty', () => {
    const template = 'Sự hiện diện và lời chúc của {guest} là niềm hạnh phúc lớn nhất của Tom và cả gia đình!';
    const defaultGreeting = 'Sự hiện diện của Cô Chú, Bác và Bạn bè là món quà ý nghĩa nhất dành cho Tom trong ngày sinh nhật đầu đời!';
    assert.equal(formatGuestGreeting(template, '', defaultGreeting), defaultGreeting);
    assert.equal(formatGuestGreeting(template, '   ', defaultGreeting), defaultGreeting);
    assert.equal(formatGuestGreeting(template, null, defaultGreeting), defaultGreeting);
  });

  await t.test('formats Scene 5 opener based on guest presence using script.js getScene5Opener', () => {
    const withGuest = getScene5Opener('Gia đình chị Hường');
    assert.equal(withGuest.introText, 'Gia đình trân trọng kính mời:');
    assert.equal(withGuest.guestName, 'Gia đình chị Hường');
    assert.equal(withGuest.showBadge, true);

    const withoutGuest = getScene5Opener('');
    assert.equal(withoutGuest.introText, 'Gia đình trân trọng kính mời Quý người thân & Bạn bè');
    assert.equal(withoutGuest.guestName, '');
    assert.equal(withoutGuest.showBadge, false);

    const withNull = getScene5Opener(null);
    assert.equal(withNull.introText, 'Gia đình trân trọng kính mời Quý người thân & Bạn bè');
    assert.equal(withNull.showBadge, false);
  });
});

test('4-Scene navigation controller configuration', async (t) => {
  await t.test('has 4 scene durations defined with Scene 4 as finale (0ms)', () => {
    assert.ok(SCENE_DURATIONS, 'SCENE_DURATIONS must be exported by script.js');
    const durations = SCENE_DURATIONS;
    assert.equal(Object.keys(durations).length, 4);
    assert.equal(durations[1], 12000);
    assert.equal(durations[2], 14000);
    assert.equal(durations[3], 60000);
    assert.equal(durations[4], 0);
  });

  await t.test('freezeSceneOnUserInteraction pauses scene and stops polaroid auto-rotate', () => {
    assert.ok(typeof calculateIntentPause === 'function', 'calculateIntentPause must be exported by script.js');
    const pauseState = calculateIntentPause();
    assert.equal(pauseState.isPaused, true);
    assert.equal(pauseState.stopAutoRotate, true);
  });

  await t.test('shouldTriggerOpenOnGesture allows swipe up and swipe left on Scene 1', () => {
    assert.ok(typeof shouldTriggerOpenOnGesture === 'function', 'shouldTriggerOpenOnGesture must be exported');
    // Swipe up on Scene 1
    assert.equal(shouldTriggerOpenOnGesture(0, -50, 1), true);
    // Swipe left on Scene 1
    assert.equal(shouldTriggerOpenOnGesture(-50, 0, 1), true);
    // Swipe down on Scene 1 (should NOT trigger)
    assert.equal(shouldTriggerOpenOnGesture(0, 50, 1), false);
    // Swipe right on Scene 1 (should NOT trigger)
    assert.equal(shouldTriggerOpenOnGesture(50, 0, 1), false);
    // Tiny tap/jitter on Scene 1 (should NOT trigger)
    assert.equal(shouldTriggerOpenOnGesture(-10, -10, 1), false);
    // Swipe on other scenes (should NOT trigger Scene 1 opener)
    assert.equal(shouldTriggerOpenOnGesture(0, -50, 2), false);
    assert.equal(shouldTriggerOpenOnGesture(-50, 0, 3), false);
  });
  await t.test('shouldTriggerSceneAdvanceGesture detects swipe up and swipe left on Scene 1 and Scene 3', () => {
    assert.ok(typeof shouldTriggerSceneAdvanceGesture === 'function', 'shouldTriggerSceneAdvanceGesture must be exported');
    assert.equal(shouldTriggerSceneAdvanceGesture(0, -50, 1), true);
    assert.equal(shouldTriggerSceneAdvanceGesture(-50, 0, 1), true);
    assert.equal(shouldTriggerSceneAdvanceGesture(0, 50, 1), false);
    assert.equal(shouldTriggerSceneAdvanceGesture(0, -50, 3), true);
    assert.equal(shouldTriggerSceneAdvanceGesture(-60, 0, 3), true);
    assert.equal(shouldTriggerSceneAdvanceGesture(0, 50, 3), false);
    assert.equal(shouldTriggerSceneAdvanceGesture(60, 0, 3), false);
    assert.equal(shouldTriggerSceneAdvanceGesture(0, -50, 2), false);
  });
});
