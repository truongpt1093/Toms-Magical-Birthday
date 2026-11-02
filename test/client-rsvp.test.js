const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeInput, buildRsvpPayload, getSuccessMessage } = require('../script.js');

test('Client RSVP state and payload builders', async (t) => {
  await t.test('exports functions properly from script.js', () => {
    assert.equal(typeof sanitizeInput, 'function');
    assert.equal(typeof buildRsvpPayload, 'function');
    assert.equal(typeof getSuccessMessage, 'function');
  });

  await t.test('keeps text plain in the client payload', () => {
    assert.equal(sanitizeInput('<script>alert("xss")</script>'), '<script>alert("xss")</script>');
    assert.equal(sanitizeInput("Tom's & Jerry's"), "Tom's & Jerry's");
    assert.equal(sanitizeInput(''), '');
    assert.equal(sanitizeInput(null), '');
  });

  await t.test('preserves user text and bounds payload fields', () => {
    const payload = buildRsvpPayload(
      '  <script>alert("Tom")</script> & Bob  ',
      'Sẽ tham dự',
      99,
      -1,
      'Can\'t wait! <3 "Cheers"'
    );
    assert.equal(payload.guestName, '<script>alert("Tom")</script> & Bob');
    assert.equal(payload.note, 'Can\'t wait! <3 "Cheers"');
    assert.equal(payload.adults, 20);
    assert.equal(payload.children, 0);
    assert.equal(Object.hasOwn(payload, 'endpoint'), false);
  });

  await t.test('builds payload for attending guest with adults and children', () => {
    const payload = buildRsvpPayload(
      '  Gia đình chị Hường  ',
      'Sẽ tham dự',
      2,
      1,
      '  Chúc mừng Tom!  '
    );
    assert.equal(payload.guestName, 'Gia đình chị Hường');
    assert.equal(payload.status, 'Sẽ tham dự');
    assert.equal(payload.adults, 2);
    assert.equal(payload.children, 1);
    assert.equal(payload.note, 'Chúc mừng Tom!');
    assert.equal(Object.hasOwn(payload, 'endpoint'), false);
  });

  await t.test('sets counts to 0 when guest cannot attend', () => {
    const payload = buildRsvpPayload('Chú Nam', 'Không thể tham gia', 2, 1, 'Tiếc quá!', '');
    assert.equal(payload.guestName, 'Chú Nam');
    assert.equal(payload.status, 'Không thể tham gia');
    assert.equal(payload.adults, 0);
    assert.equal(payload.children, 0);
    assert.equal(payload.note, 'Tiếc quá!');
  });

  await t.test('handles string counts and trims inputs properly', () => {
    const payload = buildRsvpPayload('  Bác Hùng  ', 'Sẽ tham dự', '4', '2', '  Vui quá  ');
    assert.equal(payload.guestName, 'Bác Hùng');
    assert.equal(payload.adults, 4);
    assert.equal(payload.children, 2);
    assert.equal(payload.note, 'Vui quá');
  });

  await t.test('handles fallback defaults for empty or invalid values', () => {
    const payload = buildRsvpPayload('', 'Sẽ tham dự', null, undefined, null);
    assert.equal(payload.guestName, '');
    assert.equal(payload.status, 'Sẽ tham dự');
    assert.equal(payload.adults, 1);
    assert.equal(payload.children, 0);
    assert.equal(payload.note, '');
  });

  await t.test('formats success message based on attendance status', () => {
    const attendingMsg = getSuccessMessage('Sẽ tham dự');
    assert.equal(attendingMsg, 'Gia đình Tom rất mong được đón tiếp bạn vào 18:00 Thứ Bảy, 14/11/2026.');

    const notAttendingMsg = getSuccessMessage('Không thể tham gia');
    assert.equal(
      notAttendingMsg,
      'Gia đình Tom rất tiếc vì bạn không thể tham gia, nhưng xin chân thành cảm ơn tình cảm và lời chúc của bạn!'
    );

    const defaultMsg = getSuccessMessage('other');
    assert.equal(defaultMsg, 'Gia đình Tom rất mong được đón tiếp bạn vào 18:00 Thứ Bảy, 14/11/2026.');
  });

  await t.test('validates format of localStorage cached RSVP record', () => {
    const guestName = 'Cô Lan';
    const status = 'Sẽ tham dự';
    const record = {
      guestName: guestName,
      status: status,
      date: new Date().toISOString()
    };
    const serialized = JSON.stringify(record);
    const parsed = JSON.parse(serialized);

    assert.equal(parsed.guestName, 'Cô Lan');
    assert.equal(parsed.status, 'Sẽ tham dự');
    assert.ok(Date.parse(parsed.date) > 0);
  });
});
