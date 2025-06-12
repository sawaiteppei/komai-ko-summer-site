const { google } = require('googleapis');

exports.handler = async () => {
  if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const message = 'Required environment variables are not set in Netlify.';
    console.error(message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message }),
    };
  }
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, thumbnailLink)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res.data.files || []),
    };
  } catch (error) {
    // ★★★ より詳細なエラーログを出力するように変更 ★★★
    console.error('Full error object in images function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Failed to fetch images.' }),
    };
  }
};