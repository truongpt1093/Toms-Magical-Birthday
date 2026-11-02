const test = require('node:test');
const assert = require('node:assert/strict');

test('google-apps-script.js webhook behavior', async (t) => {
  // Helper to create mock Google Apps Script environment
  function createMockEnvironment(initialRows = [], lockSuccess = true) {
    const sheetData = initialRows.map(row => [...row]); // 2D array of rows
    const cellNotes = {}; // key: "row,col" -> note

    const mockSheet = {
      getLastRow: () => sheetData.length,
      getRange: (startRow, startCol, numRows, numCols) => {
        return {
          getValues: () => {
            const values = [];
            for (let r = startRow - 1; r < startRow - 1 + numRows; r++) {
              const rowVal = [];
              for (let c = startCol - 1; c < startCol - 1 + numCols; c++) {
                rowVal.push(sheetData[r] ? sheetData[r][c] : "");
              }
              values.push(rowVal);
            }
            return values;
          },
          setValue: (val) => {
            const r = startRow - 1;
            const c = startCol - 1;
            while (sheetData.length <= r) {
              sheetData.push([]);
            }
            sheetData[r][c] = val;
          },
          setNote: (note) => {
            cellNotes[`${startRow},${startCol}`] = note;
          }
        };
      },
      appendRow: (rowArr) => {
        sheetData.push([...rowArr]);
      }
    };

    let lockAcquired = false;
    let lockReleased = false;

    const mockLock = {
      tryLock: (timeout) => {
        if (lockSuccess) {
          lockAcquired = true;
          return true;
        }
        return false;
      },
      releaseLock: () => {
        lockReleased = true;
      }
    };

    const mockSpreadsheet = {
      getSheets: () => [mockSheet],
      getActiveSheet: () => mockSheet
    };

    const mockContentService = {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => {
        let mime = null;
        return {
          setMimeType: (m) => {
            mime = m;
            return {
              getContent: () => text,
              getMimeType: () => mime
            };
          }
        };
      }
    };

    const mockUtilities = {
      formatDate: (date, tz, fmt) => '18:30 17/09/2026'
    };

    return {
      sheetData,
      cellNotes,
      mockSheet,
      mockSpreadsheet,
      mockLock,
      mockContentService,
      mockUtilities,
      getLockStatus: () => ({ lockAcquired, lockReleased })
    };
  }

  await t.test('doGet returns active status and JSON MIME type', () => {
    const env = createMockEnvironment();
    global.ContentService = env.mockContentService;

    const { doGet } = require('../google-apps-script.js');
    const result = doGet({});
    assert.equal(result.getMimeType(), 'application/json');
    const parsed = JSON.parse(result.getContent());
    assert.equal(parsed.status, 'RSVP webhook active');
  });

  await t.test('doPost returns server busy error when lock cannot be acquired', () => {
    const env = createMockEnvironment([], false); // lockSuccess = false
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };

    const { doPost } = require('../google-apps-script.js');
    const result = doPost({ postData: { contents: JSON.stringify({ guestName: 'Anh Trường' }) } });
    const parsed = JSON.parse(result.getContent());

    assert.equal(parsed.success, false);
    assert.equal(parsed.error, 'Server busy, lock acquisition timed out');
    assert.equal(env.getLockStatus().lockReleased, false);
  });

  await t.test('doPost rejects missing guestName', () => {
    const env = createMockEnvironment();
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };

    const { doPost } = require('../google-apps-script.js');
    const result = doPost({ postData: { contents: JSON.stringify({ guestName: '  ' }) } });
    const parsed = JSON.parse(result.getContent());
    assert.equal(parsed.success, false);
    assert.equal(parsed.error, 'Missing guest name');
    assert.equal(env.getLockStatus().lockReleased, true);
  });

  await t.test('doPost matches existing guest case-insensitively and updates columns C, D, E, F with note', () => {
    // Header row at index 0 (Row 1), existing guest at index 1 (Row 2)
    const initialRows = [
      ['Tên khách mời', 'Link thiệp mời', 'Xác nhận tham dự', 'Số lượng người lớn', 'Số lượng trẻ em', 'Tổng cộng'],
      ['Anh Trường', 'https://domain/?guest=Anh+Tr%C6%B0%E1%BB%9Dng', '', '', '', '']
    ];
    const env = createMockEnvironment(initialRows);
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };
    global.SpreadsheetApp = {
      getActiveSpreadsheet: () => env.mockSpreadsheet
    };
    global.Utilities = env.mockUtilities;

    const { doPost } = require('../google-apps-script.js');
    const payload = {
      guestName: '  anh trường  ',
      status: 'Sẽ tham dự',
      adults: 2,
      children: 1,
      note: 'Chúc mừng sinh nhật Tom!'
    };

    const res = doPost({ postData: { contents: JSON.stringify(payload) } });
    const parsed = JSON.parse(res.getContent());

    assert.equal(parsed.success, true);
    assert.equal(parsed.action, 'updated');
    assert.equal(parsed.row, 2);
    assert.equal(parsed.totalGuests, 3);

    // Verify row contents
    const updatedRow = env.sheetData[1]; // Row 2 (0-indexed 1)
    assert.equal(updatedRow[2], 'Sẽ tham dự'); // Col C
    assert.equal(updatedRow[3], 2); // Col D
    assert.equal(updatedRow[4], 1); // Col E
    assert.equal(updatedRow[5], 3); // Col F

    // Verify cell note on Col C (row 2, col 3)
    assert.ok(env.cellNotes['2,3'].includes('[18:30 17/09/2026] Sẽ tham dự'));
    assert.ok(env.cellNotes['2,3'].includes('Lời chúc: Chúc mừng sinh nhật Tom!'));
  });

  await t.test('doPost appends new row when guest is not in sheet', () => {
    const initialRows = [
      ['Tên khách mời', 'Link thiệp mời', 'Xác nhận tham dự', 'Số lượng người lớn', 'Số lượng trẻ em', 'Tổng cộng'],
      ['Anh Trường', 'https://domain/?guest=Anh+Tr%C6%B0%E1%BB%9Dng', 'Sẽ tham dự', 2, 0, 2]
    ];
    const env = createMockEnvironment(initialRows);
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };
    global.SpreadsheetApp = {
      getActiveSpreadsheet: () => env.mockSpreadsheet
    };
    global.Utilities = env.mockUtilities;

    const { doPost } = require('../google-apps-script.js');
    const payload = {
      guestName: 'Cô Lan',
      status: 'Không thể tham gia',
      adults: 0,
      children: 0,
      note: 'Tiếc quá không tham gia được, chúc con mau ăn chóng lớn!'
    };

    const res = doPost({ postData: { contents: JSON.stringify(payload) } });
    const parsed = JSON.parse(res.getContent());

    assert.equal(parsed.success, true);
    assert.equal(parsed.action, 'appended');
    assert.equal(parsed.row, 3);

    const newRow = env.sheetData[2]; // Row 3
    assert.equal(newRow[0], 'Cô Lan'); // Col A
    assert.equal(newRow[1], ''); // Col B
    assert.equal(newRow[2], 'Không thể tham gia'); // Col C
    assert.equal(newRow[3], 0); // Col D
    assert.equal(newRow[4], 0); // Col E
    assert.equal(newRow[5], 0); // Col F

    assert.ok(env.cellNotes['3,3'].includes('Không thể tham gia'));
    assert.ok(env.cellNotes['3,3'].includes('Lời chúc: Tiếc quá không tham gia được'));
  });

  await t.test('doPost falls back to empty string when adults and children are invalid numbers', () => {
    const initialRows = [
      ['Tên khách mời', 'Link thiệp mời', 'Xác nhận tham dự', 'Số lượng người lớn', 'Số lượng trẻ em', 'Tổng cộng'],
      ['Anh Trường', 'https://domain/?guest=Anh+Tr%C6%B0%E1%BB%9Dng', '', '', '', '']
    ];
    const env = createMockEnvironment(initialRows);
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };
    global.SpreadsheetApp = {
      getActiveSpreadsheet: () => env.mockSpreadsheet
    };
    global.Utilities = env.mockUtilities;

    const { doPost } = require('../google-apps-script.js');
    const payload = {
      guestName: 'Anh Trường',
      status: 'Sẽ tham dự',
      adults: 'not-a-number',
      children: 'invalid'
    };

    const res = doPost({ postData: { contents: JSON.stringify(payload) } });
    const parsed = JSON.parse(res.getContent());

    assert.equal(parsed.success, true);
    assert.equal(parsed.adults, '');
    assert.equal(parsed.children, '');
    assert.equal(parsed.totalGuests, 0);
  });

  await t.test('doPost falls back to getActiveSheet if getSheets returns empty array', () => {
    const initialRows = [
      ['Tên khách mời', 'Link thiệp mời', 'Xác nhận tham dự', 'Số lượng người lớn', 'Số lượng trẻ em', 'Tổng cộng'],
      ['Anh Trường', 'https://domain/?guest=Anh+Tr%C6%B0%E1%BB%9Dng', '', '', '', '']
    ];
    const env = createMockEnvironment(initialRows);
    global.ContentService = env.mockContentService;
    global.LockService = { getScriptLock: () => env.mockLock };
    global.SpreadsheetApp = {
      getActiveSpreadsheet: () => ({
        getSheets: () => [],
        getActiveSheet: () => env.mockSheet
      })
    };
    global.Utilities = env.mockUtilities;

    const { doPost } = require('../google-apps-script.js');
    const res = doPost({ postData: { contents: JSON.stringify({ guestName: 'Anh Trường' }) } });
    const parsed = JSON.parse(res.getContent());

    assert.equal(parsed.success, true);
    assert.equal(parsed.action, 'updated');
  });
});
