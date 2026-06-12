/**
 * Copy rendered values from a source Google Sheets tab into a destination sheet.
 *
 * Setup:
 * 1. Create a destination spreadsheet that will only store copied values.
 * 2. Open Extensions > Apps Script from the destination spreadsheet.
 * 3. Replace the default script with this file's contents.
 * 4. Fill in SOURCE_SPREADSHEET_ID, SOURCE_SHEET_ID, and DESTINATION_SHEET_NAME.
 * 5. Run syncLotteConfirmedValues() once manually and approve permissions.
 * 6. Run installHourlyTrigger() once if you want automatic refresh.
 */

const SOURCE_SPREADSHEET_ID = "PUT_SOURCE_SPREADSHEET_ID_HERE";
const SOURCE_SHEET_ID = 764279967;
const DESTINATION_SHEET_NAME = "lotte_confirm_values";

function syncLotteConfirmedValues() {
  const sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sourceSheet = getSheetById_(sourceSpreadsheet, SOURCE_SHEET_ID);

  if (!sourceSheet) {
    throw new Error(`Source sheet not found for gid ${SOURCE_SHEET_ID}`);
  }

  const values = sourceSheet.getDataRange().getDisplayValues();
  const destinationSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const destinationSheet = ensureTargetSheet_(
    destinationSpreadsheet,
    DESTINATION_SHEET_NAME,
  );

  destinationSheet.clearContents();

  if (values.length === 0 || values[0].length === 0) {
    return;
  }

  destinationSheet
    .getRange(1, 1, values.length, values[0].length)
    .setValues(values);
}

function installHourlyTrigger() {
  const existing = ScriptApp.getProjectTriggers().find(
    (trigger) => trigger.getHandlerFunction() === "syncLotteConfirmedValues",
  );

  if (existing) {
    return;
  }

  ScriptApp.newTrigger("syncLotteConfirmedValues")
    .timeBased()
    .everyHours(1)
    .create();
}

function removeSyncTriggers() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === "syncLotteConfirmedValues") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getSheetById_(spreadsheet, sheetId) {
  return spreadsheet.getSheets().find((sheet) => sheet.getSheetId() === sheetId) || null;
}

function ensureTargetSheet_(spreadsheet, sheetName) {
  const existing = spreadsheet.getSheetByName(sheetName);

  if (existing) {
    return existing;
  }

  return spreadsheet.insertSheet(sheetName);
}
