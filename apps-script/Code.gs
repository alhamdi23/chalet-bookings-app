/**
 * Chalet Booking App — Google Sheets sync backend.
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app):
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Then copy the /exec URL into the app's Settings screen, along with the same
 * TOKEN you set below.
 *
 * The app sends/receives three collections: bookings, operationCosts, costTypes.
 * Records are merged last-write-wins by their `updatedAt` timestamp. Deleted
 * records are kept as tombstones (deleted = TRUE) so deletions propagate.
 */

// CHANGE THIS to a secret of your choice and use the same value in the app.
var TOKEN = 'change-me-secret';

var SHEETS = {
  bookings: {
    name: 'Bookings',
    columns: [
      'id', 'customerName', 'customerPhone', 'customerEmail',
      'bookingType', 'checkInDate', 'checkOutDate', 'price', 'insurancePrice',
      'tags', 'note', 'status', 'createdAt', 'updatedAt', 'deleted',
    ],
    numeric: ['price', 'insurancePrice'],
    boolean: ['deleted'],
    json: ['tags'],
  },
  operationCosts: {
    name: 'OperationCosts',
    columns: ['id', 'costTypeId', 'amount', 'date', 'note', 'createdAt', 'updatedAt', 'deleted'],
    numeric: ['amount'],
    boolean: ['deleted'],
    json: [],
  },
  costTypes: {
    name: 'CostTypes',
    columns: ['id', 'name', 'active', 'createdAt', 'updatedAt', 'deleted'],
    numeric: [],
    boolean: ['active', 'deleted'],
    json: [],
  },
};

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet(config) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    sheet = ss.insertSheet(config.name);
  }
  // Ensure header row.
  var firstRow = sheet.getRange(1, 1, 1, config.columns.length).getValues()[0];
  var hasHeader = firstRow[0] === config.columns[0];
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, config.columns.length).setValues([config.columns]);
  }
  return sheet;
}

function readCollection(config) {
  var sheet = getSheet(config);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  var values = sheet.getRange(2, 1, lastRow - 1, config.columns.length).getValues();
  var records = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) {
      continue;
    }
    var record = {};
    for (var c = 0; c < config.columns.length; c++) {
      var key = config.columns[c];
      var value = row[c];
      if (config.numeric.indexOf(key) >= 0) {
        value = Number(value) || 0;
      } else if (config.boolean.indexOf(key) >= 0) {
        value = value === true || value === 'TRUE' || value === 'true';
      } else if (config.json.indexOf(key) >= 0) {
        try {
          var parsed = value ? JSON.parse(value) : [];
          value = parsed && parsed.length ? parsed : [];
        } catch (err) {
          value = [];
        }
      } else {
        value = value === null || value === undefined ? '' : String(value);
      }
      record[key] = value;
    }
    records.push(record);
  }
  return records;
}

function writeCollection(config, incoming) {
  var sheet = getSheet(config);
  var existing = readCollection(config);
  var byId = {};
  for (var i = 0; i < existing.length; i++) {
    byId[existing[i].id] = existing[i];
  }
  for (var j = 0; j < incoming.length; j++) {
    var rec = incoming[j];
    if (!rec || !rec.id) {
      continue;
    }
    var prev = byId[rec.id];
    if (!prev || String(rec.updatedAt) > String(prev.updatedAt)) {
      byId[rec.id] = rec;
    }
  }
  var ids = Object.keys(byId);
  var output = [config.columns];
  for (var k = 0; k < ids.length; k++) {
    var record = byId[ids[k]];
    var row = [];
    for (var c = 0; c < config.columns.length; c++) {
      var col = config.columns[c];
      var cell = record[col];
      if (config.json.indexOf(col) >= 0) {
        cell = JSON.stringify(cell || []);
      }
      row.push(cell);
    }
    output.push(row);
  }
  sheet.clearContents();
  sheet.getRange(1, 1, output.length, config.columns.length).setValues(output);
}

function doGet(e) {
  var token = e && e.parameter ? e.parameter.token : '';
  if (token !== TOKEN) {
    return jsonOut({ error: 'Invalid token' });
  }
  return jsonOut({
    bookings: readCollection(SHEETS.bookings),
    operationCosts: readCollection(SHEETS.operationCosts),
    costTypes: readCollection(SHEETS.costTypes),
  });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ error: 'Invalid JSON body' });
  }
  if (!body || body.token !== TOKEN) {
    return jsonOut({ error: 'Invalid token' });
  }
  if (body.bookings) {
    writeCollection(SHEETS.bookings, body.bookings);
  }
  if (body.operationCosts) {
    writeCollection(SHEETS.operationCosts, body.operationCosts);
  }
  if (body.costTypes) {
    writeCollection(SHEETS.costTypes, body.costTypes);
  }
  return jsonOut({ ok: true });
}
