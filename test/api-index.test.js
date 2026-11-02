const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('api/index helper functions and metadata injection', async (t) => {
  const { escapeHtml, injectPersonalization } = require('../api/index.js');
  const sampleHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  await t.test('escapeHtml handles dangerous characters correctly', () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.equal(escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#39;s');
    assert.equal(escapeHtml(''), '');
    assert.equal(escapeHtml(null), '');
  });

  await t.test('injectPersonalization updates title and OG tags with guest name and warm description', () => {
    const guest = 'Anh Trường';
    const output = injectPersonalization(sampleHtml, guest);

    assert.ok(output.includes('<title>Tom tròn 1 tuổi 🎂 - Thân gửi Anh Trường</title>'));
    assert.ok(output.includes('<meta property="og:title" content="Tom tròn 1 tuổi 🎂 - Thân gửi Anh Trường"'));
    assert.ok(output.includes('<meta property="og:description" content="Gia đình Tom trân trọng kính mời Anh Trường đến chung vui tiệc thôi nôi cùng bé vào 18:00 Thứ Bảy, 14/11/2026."'));
  });

  await t.test('injectPersonalization escapes XSS in guest name for tags', () => {
    const maliciousGuest = 'Hacker<script>alert(1)</script>';
    const output = injectPersonalization(sampleHtml, maliciousGuest);

    assert.ok(!output.includes('<script>alert(1)</script>'));
    assert.ok(output.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });

  await t.test('injectPersonalization returns unmodified HTML when guest is empty or whitespace', () => {
    assert.equal(injectPersonalization(sampleHtml, ''), sampleHtml);
    assert.equal(injectPersonalization(sampleHtml, '   '), sampleHtml);
    assert.equal(injectPersonalization(sampleHtml, null), sampleHtml);
  });

  await t.test('serverless handler responds with status 200 and personalized HTML', () => {
    const handler = require('../api/index.js');

    let responseData = '';
    let responseStatus = 0;
    const headers = {};

    const req = {
      query: { guest: 'Bác Hùng' }
    };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      setHeader(k, v) {
        headers[k] = v;
        return this;
      },
      send(data) {
        responseData = data;
        return this;
      }
    };

    handler(req, res);

    assert.equal(responseStatus, 200);
    assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
    assert.ok(responseData.includes('Thân gửi Bác Hùng'));
  });
});
