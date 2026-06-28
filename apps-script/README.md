# Google Sheets Sync Setup

This connects the Chalet Booking app to a Google Sheet in **your own** Google
account. No third-party server is involved — your data stays with you.

## 1. Create the spreadsheet

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
2. Name it something like `Chalet Bookings Data`.

## 2. Add the script

1. In the spreadsheet menu, click **Extensions → Apps Script**.
2. Delete any sample code, then paste the entire contents of
   [Code.gs](Code.gs).
3. Near the top, change the line:

   ```js
   var TOKEN = 'change-me-secret';
   ```

   to a secret word of your own, e.g. `var TOKEN = 'chalet-2026-oman';`
   Remember this value — you'll enter the same one in the app.
4. Click the **Save** (disk) icon.

## 3. Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, then **Authorize access** and allow the permissions
   (Google will warn it's unverified — that's expected for your own script).
5. Copy the **Web app URL** ending in `/exec`.

## 4. Connect the app

1. Open the Chalet app and go to **Settings**.
2. Paste the Web app URL into **Apps Script Web App URL**.
3. Enter the same **token** you set in step 2.3.
4. Click **Save Settings**, then **Sync Now**.

The sheet will auto-create three tabs: `Bookings`, `OperationCosts`,
`CostTypes`. Editing data in the app and pressing **Sync Now** (or reopening the
app with auto-sync on) keeps the sheet and your devices in step using
last-write-wins by timestamp.

## Notes

- If you change `TOKEN` later, re-enter it in the app's Settings.
- After editing `Code.gs`, create a **new deployment** (or "Manage deployments →
  Edit → New version") for changes to take effect.
- Deleting a record in the app keeps a hidden tombstone row (`deleted = TRUE`)
  so the deletion also reaches your other devices.
