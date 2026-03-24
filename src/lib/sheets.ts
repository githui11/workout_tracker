import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID!;

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export async function readTab(tabName: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'`,
  });
  return (res.data.values as string[][]) || [];
}

export async function updateCells(
  tabName: string,
  range: string,
  values: (string | number)[][]
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function batchUpdate(
  tabName: string,
  updates: { range: string; values: (string | number)[][] }[]
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates.map((u) => ({
        range: `'${tabName}'!${u.range}`,
        values: u.values,
      })),
    },
  });
}
