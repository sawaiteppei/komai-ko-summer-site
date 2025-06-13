const { google } = require('googleapis');

exports.handler = async () => {
  if (!process.env.SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Server environment variables are not configured correctly.' }) };
  }
  try {
    const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, thumbnailLink, webContentLink)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(res.data.files || []) };
  } catch (error) {
    console.error('Error in images function:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message || 'Failed to fetch images.' }) };
  }
};
