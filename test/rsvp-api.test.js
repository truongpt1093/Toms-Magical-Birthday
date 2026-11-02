const test = require('node:test');
const assert = require('node:assert/strict');

test('api/rsvp validation and payload processing', async (t) => {
  const { validateRsvpPayload, sanitizeInput } = require('../api/rsvp.js');

  await t.test('keeps validated text plain for upstream storage', () => {
    assert.equal(sanitizeInput('  <script>alert(1)</script>Anh Trường  '), '<script>alert(1)</script>Anh Trường');
    assert.equal(sanitizeInput(''), '');
    assert.equal(sanitizeInput(null), '');
  });

  await t.test('validateRsvpPayload accepts valid data', () => {
    const payload = {
      guestName: 'Gia đình chị Hường',
      status: 'Sẽ tham dự',
      adults: 2,
      children: 1,
      note: 'Chúc mừng sinh nhật Tom!'
    };
    const validated = validateRsvpPayload(payload);
    assert.equal(validated.valid, true);
    assert.equal(validated.data.guestName, 'Gia đình chị Hường');
    assert.equal(validated.data.adults, 2);
    assert.equal(validated.data.children, 1);
  });

  await t.test('validateRsvpPayload rejects missing guestName', () => {
    const payload = {
      guestName: '',
      status: 'Sẽ tham dự'
    };
    const validated = validateRsvpPayload(payload);
    assert.equal(validated.valid, false);
    assert.ok(validated.error.includes('guestName'));
  });

  await t.test('validateRsvpPayload defaults numbers gracefully when not provided', () => {
    const payload = {
      guestName: 'Chú Nam',
      status: 'Không thể tham gia'
    };
    const validated = validateRsvpPayload(payload);
    assert.equal(validated.valid, true);
    assert.equal(validated.data.adults, 0);
    assert.equal(validated.data.children, 0);
  });

  await t.test('bounds note length without HTML re-encoding', () => {
    const rawNote = 'a'.repeat(499) + '<b>';
    const payload = {
      guestName: 'Cô Lan',
      note: rawNote
    };
    const validated = validateRsvpPayload(payload);
    assert.equal(validated.data.note, 'a'.repeat(499) + '<');
  });

  await t.test('handler handles OPTIONS method with CORS', async () => {
    const handler = require('../api/rsvp.js');
    let ended = false;
    let status = 0;
    const headers = {};
    const req = { method: 'OPTIONS' };
    const res = {
      setHeader(k, v) { headers[k] = v; return this; },
      status(s) { status = s; return this; },
      end() { ended = true; return this; }
    };
    await handler(req, res);
    assert.equal(status, 204);
    assert.equal(ended, true);
    assert.equal(headers['Access-Control-Allow-Origin'], '*');
    assert.equal(headers['Access-Control-Allow-Credentials'], undefined);
  });

  await t.test('handler rejects non-POST methods with 405', async () => {
    const handler = require('../api/rsvp.js');
    let status = 0;
    let jsonBody = null;
    const req = { method: 'GET' };
    const res = {
      setHeader() { return this; },
      status(s) { status = s; return this; },
      json(data) { jsonBody = data; return this; }
    };
    await handler(req, res);
    assert.equal(status, 405);
    assert.equal(jsonBody.success, false);
  });

  await t.test('handler rejects invalid payload with 400', async () => {
    const handler = require('../api/rsvp.js');
    let status = 0;
    let jsonBody = null;
    const req = { method: 'POST', body: { guestName: '' } };
    const res = {
      setHeader() { return this; },
      status(s) { status = s; return this; },
      json(data) { jsonBody = data; return this; }
    };
    await handler(req, res);
    assert.equal(status, 400);
    assert.equal(jsonBody.success, false);
  });

  await t.test('handler always forwards to the hardcoded webhook', async () => {
    const handler = require('../api/rsvp.js');
    const originalFetch = global.fetch;
    let status = 0;
    let jsonBody = null;
    let fetchUrl = null;
    try {
      global.fetch = async (url) => {
        fetchUrl = url;
        return {
          ok: true,
          text: async () => JSON.stringify({ success: true, action: 'updated' })
        };
      };
      const res = {
        setHeader() { return this; },
        status(s) { status = s; return this; },
        json(data) { jsonBody = data; return this; }
      };
      await handler({ method: 'POST', body: { guestName: 'Bác Ba' } }, res);
      assert.equal(status, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(fetchUrl, handler.GOOGLE_SCRIPT_URL);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('handler forwards with timeout and returns upstream data on success', async () => {
    const handler = require('../api/rsvp.js');
    const originalFetch = global.fetch;
    let fetchOptions = null;
    try {
      global.fetch = async (url, options) => {
        fetchOptions = options;
        assert.equal(url, handler.GOOGLE_SCRIPT_URL);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, result: 'success' })
        };
      };

      let status = 0;
      let jsonBody = null;
      const res = {
        setHeader() { return this; },
        status(s) { status = s; return this; },
        json(data) { jsonBody = data; return this; }
      };
      await handler({ method: 'POST', body: { guestName: 'Bác Ba' } }, res);
      assert.equal(status, 200);
      assert.equal(jsonBody.success, true);
      assert.deepEqual(jsonBody.data, { success: true, result: 'success' });
      assert.ok(fetchOptions.signal instanceof AbortSignal);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('handler returns 502 when upstream Google Apps Script returns not ok', async () => {
    const handler = require('../api/rsvp.js');
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: false,
        status: 500
      });

      let status = 0;
      let jsonBody = null;
      const req = {
        method: 'POST',
        body: {
          guestName: 'Bác Ba'
        }
      };
      const res = {
        setHeader() { return this; },
        status(s) { status = s; return this; },
        json(data) { jsonBody = data; return this; }
      };
      await handler(req, res);
      assert.equal(status, 502);
      assert.equal(jsonBody.success, false);
      assert.equal(jsonBody.error, 'Upstream Google Apps Script error');
    } finally {
      global.fetch = originalFetch;
    }
  });
  await t.test('handler propagates upstream business failure as an error', async () => {
    const handler = require('../api/rsvp.js');
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: true,
        text: async () => JSON.stringify({ success: false, error: 'Server busy' })
      });

      let status = 0;
      let jsonBody = null;
      const res = {
        setHeader() { return this; },
        status(s) { status = s; return this; },
        json(data) { jsonBody = data; return this; }
      };
      await handler({ method: 'POST', body: { guestName: 'Bác Ba' } }, res);
      assert.equal(status, 502);
      assert.deepEqual(jsonBody, { success: false, error: 'Server busy' });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
