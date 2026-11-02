const test = require('node:test');
const assert = require('node:assert/strict');

test('Polaroid photo gallery helper functions and data normalization', async (t) => {
  function normalizeGallery(rawGallery, fallbackHero) {
    if (!Array.isArray(rawGallery) || rawGallery.length === 0) {
      return fallbackHero ? [{ src: fallbackHero, note: 'Tom', sticker: '🧸' }] : [];
    }

    const defaultNotes = [
      'Tom tròn 1 tuổi 🎂',
      'Cậu bé hay cười ✨',
      'Khoảnh khắc đáng yêu 💛',
      'Chàng trai của ba mẹ 🎈',
      'Ngoan ngoãn & vui tươi 🥰'
    ];
    const defaultStickers = ['🧸', '⭐', '🌟', '🎈', '👑'];

    return rawGallery.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          src: item,
          note: defaultNotes[idx % defaultNotes.length],
          sticker: defaultStickers[idx % defaultStickers.length]
        };
      }
      return {
        src: item.src || fallbackHero || '',
        note: item.note || defaultNotes[idx % defaultNotes.length],
        sticker: item.sticker || defaultStickers[idx % defaultStickers.length]
      };
    });
  }

  function getNextIndex(currentIndex, totalCount) {
    if (totalCount <= 0) return 0;
    return (currentIndex + 1) % totalCount;
  }

  await t.test('normalizeGallery normalizes array of strings', () => {
    const raw = ['images/tom-01.jpg', 'images/tom-02.jpg'];
    const normalized = normalizeGallery(raw, 'images/tom-cover.jpg');

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].src, 'images/tom-01.jpg');
    assert.equal(normalized[0].note, 'Tom tròn 1 tuổi 🎂');
    assert.equal(normalized[0].sticker, '🧸');
    assert.equal(normalized[1].src, 'images/tom-02.jpg');
  });

  await t.test('normalizeGallery handles objects with custom note and sticker', () => {
    const raw = [
      { src: 'images/tom-01.jpg', note: 'Thiên thần nhỏ', sticker: '✨' }
    ];
    const normalized = normalizeGallery(raw, 'images/tom-cover.jpg');

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].src, 'images/tom-01.jpg');
    assert.equal(normalized[0].note, 'Thiên thần nhỏ');
    assert.equal(normalized[0].sticker, '✨');
  });

  await t.test('normalizeGallery falls back to hero image when gallery is empty', () => {
    const normalized = normalizeGallery([], 'images/tom-cover.jpg');
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].src, 'images/tom-cover.jpg');
  });

  await t.test('getNextIndex cycles properly', () => {
    assert.equal(getNextIndex(0, 5), 1);
    assert.equal(getNextIndex(3, 5), 4);
    assert.equal(getNextIndex(4, 5), 0);
  });
});
