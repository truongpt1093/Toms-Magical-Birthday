const test = require('node:test');
const assert = require('node:assert/strict');

// Import from script.js
const { normalizeGallery, parseFormattedNoteParts } = require('../script.js');

test('Polaroid photo gallery helper functions and data normalization', async (t) => {
  await t.test('normalizeGallery normalizes array of strings with milestone fallbacks', () => {
    const raw = ['images/test-1.jpg', 'images/test-2.jpg'];
    const result = normalizeGallery(raw, 'images/hero.jpg');
    assert.equal(result.length, 2);
    assert.equal(result[0].src, 'images/test-1.jpg');
    assert.equal(result[0].milestone, 'Sơ sinh');
    assert.equal(result[0].badge, '🍼 Sơ sinh');
    assert.ok(result[0].note);
    assert.ok(result[0].sticker);
  });

  await t.test('normalizeGallery handles 7-milestone objects with custom badge, milestone, note and sticker', () => {
    const raw = [
      {
        id: '10thang',
        milestone: '10T',
        badge: '🐾 10 Tháng',
        src: 'images/Tom-10thang.jpg',
        note: 'Biết bám vịn thành cũi đứng vững và men theo từng bước nhỏ 👣',
        sticker: '🧸'
      }
    ];
    const result = normalizeGallery(raw, 'images/hero.jpg');
    assert.equal(result.length, 1);
    assert.equal(result[0].milestone, '10T');
    assert.equal(result[0].badge, '🐾 10 Tháng');
    assert.equal(result[0].src, 'images/Tom-10thang.jpg');
    assert.equal(result[0].note, 'Biết bám vịn thành cũi đứng vững và men theo từng bước nhỏ 👣');
    assert.equal(result[0].sticker, '🧸');
  });

  await t.test('normalizeGallery falls back to hero image and 1 Tuổi milestone when gallery is empty, null, or undefined', () => {
    const emptyRes = normalizeGallery([], 'images/hero.jpg');
    assert.equal(emptyRes.length, 1);
    assert.equal(emptyRes[0].src, 'images/hero.jpg');
    assert.equal(emptyRes[0].milestone, '1 Tuổi');
    assert.equal(emptyRes[0].badge, '🎂 1 Tuổi');

    const nullRes = normalizeGallery(null, 'images/hero.jpg');
    assert.equal(nullRes.length, 1);
    assert.equal(nullRes[0].src, 'images/hero.jpg');

    const undefRes = normalizeGallery(undefined, 'images/hero.jpg');
    assert.equal(undefRes.length, 1);
    assert.equal(undefRes[0].src, 'images/hero.jpg');
  });

  await t.test('normalizeGallery handles corrupt or null items inside array gracefully', () => {
    const corrupt = [null, { invalid: true }];
    const result = normalizeGallery(corrupt, 'images/hero.jpg');
    assert.equal(result.length, 2);
    assert.equal(result[0].src, 'images/hero.jpg');
    assert.equal(result[0].milestone, 'Sơ sinh');
    assert.equal(result[1].src, 'images/hero.jpg');
    assert.equal(result[1].milestone, '1T');
  });

  await t.test('preserves raw strings in badge, milestone, and note for safe textContent insertion', () => {
    const raw = [{
      id: 'xss',
      milestone: '<script>alert(1)</script>',
      badge: '<img src=x onerror=alert(2)>',
      src: 'images/test.jpg',
      note: '<b>Hello</b>',
      sticker: '🎈'
    }];
    const result = normalizeGallery(raw, 'images/hero.jpg');
    assert.equal(result[0].milestone, '<script>alert(1)</script>');
    assert.equal(result[0].badge, '<img src=x onerror=alert(2)>');
    assert.equal(result[0].note, '<b>Hello</b>');
  });

  await t.test('parseFormattedNoteParts correctly parses markdown asterisks into highlight tokens', () => {
    assert.ok(typeof parseFormattedNoteParts === 'function', 'parseFormattedNoteParts must be exported');
    const note = "Thiên thần nhỏ bé **diệu kỳ**,\nTrong tim ba mẹ **khắc ghi** từng giờ.";
    const lines = parseFormattedNoteParts(note);
    assert.equal(lines.length, 2);

    // Line 1
    assert.equal(lines[0][0].text, 'Thiên thần nhỏ bé ');
    assert.equal(lines[0][0].isHighlight, false);
    assert.equal(lines[0][1].text, 'diệu kỳ');
    assert.equal(lines[0][1].isHighlight, true);
    assert.equal(lines[0][2].text, ',');
    assert.equal(lines[0][2].isHighlight, false);

    // Line 2
    assert.equal(lines[1][0].text, 'Trong tim ba mẹ ');
    assert.equal(lines[1][0].isHighlight, false);
    assert.equal(lines[1][1].text, 'khắc ghi');
    assert.equal(lines[1][1].isHighlight, true);
  });

  await t.test('normalizeGallery handles 10-milestone full story timeline from ultrasound to 1 year', () => {
    const raw = [
      { id: 'sieuam', milestone: '25W', badge: '🐣 Mầm sống', src: 'images/tom-01-sieuam.jpg', note: 'Thiên thần nhỏ bé **diệu kỳ**,\nTrong tim ba mẹ **khắc ghi** từng giờ.', sticker: '🐣' },
      { id: 'sosinh', milestone: '0T', badge: '🍼 Sơ sinh', src: 'images/tom-02-sosinh.jpg', note: 'Oe oe cất tiếng **chào đời**,\nNiềm vui ba mẹ **rạng ngời** từ đây.', sticker: '🍼' },
      { id: 'daythang', milestone: '1T', badge: '🌕 Đầy tháng', src: 'images/tom-03-daythang.jpg', note: 'Một tháng bụ bẫm **đáng yêu**,\nCả nhà cưng nựng **sớm chiều nâng niu**.', sticker: '🧸' },
      { id: '3thang', milestone: '3T', badge: '🌱 3 Tháng', src: 'images/tom-04-3thang.jpg', note: 'Ba tháng lật lẫy **cười tươi**,\nMá phính tròn xoe **khiến người người mê**.', sticker: '⭐' },
      { id: '4thang', milestone: '4T', badge: '☀️ 4 Tháng', src: 'images/tom-05-4thang.jpg', note: 'Bốn tháng nhoẻn miệng **cười xinh**,\nNhư tia nắng ấm **lung linh** góc nhà.', sticker: '🌟' },
      { id: '9thang', milestone: '9T', badge: '🐾 9 Tháng', src: 'images/tom-06-9thang.jpg', note: 'Chín tháng ngồi vững **chẳng lo**,\nMắt tròn lấp lánh **tò mò** nhìn quanh.', sticker: '🎈' },
      { id: 'tapdung', milestone: 'Tập đứng', badge: '🌿 Chập chững', src: 'images/tom-07-1tuoi-tapdung.jpg', note: 'Mũ cói, yếm jeans, **ủng vàng**,\nTom chập chững bước **hiên ngang** giữa vườn.', sticker: '🌿' },
      { id: 'ngonghinh', milestone: 'Hồn nhiên', badge: '🥰 Đáng yêu', src: 'images/tom-08-1tuoi-ngonghinh.jpg', note: 'Chu môi làm dáng **điệu đà**,\nNét cười ngộ nghĩnh **cả nhà đều mê**.', sticker: '🐥' },
      { id: 'sinhnhat', milestone: 'Sinh nhật', badge: '🎂 Thôi nôi', src: 'images/tom-09-1tuoi-sinhnhat.jpg', note: 'Gấu bông đội nón **quây quần**,\nCùng Tom đón tuổi **muôn phần hân hoan**.', sticker: '🎂' },
      { id: 'hoangtu', milestone: '1 Tuổi', badge: '👑 1 Tuổi', src: 'images/tom-10-1tuoi-hoangtu.jpg', note: 'Hoàng tử bé nhỏ **bảnh bao**,\nTuổi mới rạng rỡ **dạt dào yêu thương**.', sticker: '👑' }
    ];
    const result = normalizeGallery(raw, 'images/tom-10-1tuoi-hoangtu.jpg');
    assert.equal(result.length, 10);
    assert.equal(result[0].badge, '🐣 Mầm sống');
    assert.equal(result[0].milestone, '25W');
    assert.equal(result[9].milestone, '1 Tuổi');
    assert.equal(result[9].badge, '👑 1 Tuổi');
  });
});

