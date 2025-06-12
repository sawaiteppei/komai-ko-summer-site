const { google } = require('googleapis');
const Busboy = require('busboy');

// Helper to parse multipart/form-data
const parseMultipartForm = (event) => {
  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({
        headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] }
      });
      const uploads = [];
      busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          uploads.push({
            fileContent: Buffer.concat(chunks),
            filename,
            mimeType,
          });
        });
      });
      busboy.on('finish', () => resolve({ uploads }));
      busboy.on('error', err => reject(err));
      busboy.end(Buffer.from(event.body, 'base64'));
    } catch (error) {
        reject(error);
    }
  });
};

exports.handler = async (event) => {
  if (!process.env.GOOGLE_CREDENTIALS || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const message = 'Required environment variables are not set in Netlify.';
    console.error(message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message }),
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    
    const { uploads } = await parseMultipartForm(event);
    if (!uploads || uploads.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ message: 'No files were uploaded.'})};
    }

    const uploadPromises = uploads.map(async (upload) => {
      const { fileContent, filename, mimeType } = upload;
      const { Readable } = require('stream');
      const bufferStream = new Readable();
      bufferStream.push(fileContent);
      bufferStream.push(null);

      const file = await drive.files.create({
        resource: { name: filename, parents: [folderId] },
        media: { mimeType: mimeType, body: bufferStream },
        fields: 'id',
      });

      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      return file.data.id;
    });
    
    await Promise.all(uploadPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Files uploaded successfully!' }),
    };
  } catch (error) {
    // ★★★ より詳細なエラーログを出力するように変更 ★★★
    console.error('Full error object in upload function:', error); 
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'An unknown error occurred during upload.' }),
    };
  }
};
