const { google } = require('googleapis');
const admin = require('firebase-admin');

try {
  if (admin.apps.length === 0 && process.env.SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) { console.error('Firebase Admin initialization error', e); }

const getDrive = () => {
    const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    return google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] }) });
};

exports.handler = async (event) => {
  if (!process.env.SERVICE_ACCOUNT_JSON || !process.env.APP_ID) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Server environment variables are not configured correctly.'}) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }
  try {
    const { fileId } = JSON.parse(event.body);
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileId is required.' }) };
    }
    const drive = getDrive();
    await drive.files.delete({ fileId: fileId });

    const db = admin.firestore();
    const appId = process.env.APP_ID;
    const docRef = db.collection(`artifacts`).doc(appId).collection('public').doc('data').collection('photos').doc(fileId);
    await docRef.delete();

    return { statusCode: 200, body: JSON.stringify({ message: 'File and comments deleted successfully.' }) };
  } catch (error) {
    console.error('Error in delete function:', error);
    return { statusCode: 500, body: JSON.stringify({ message: error.message || 'An unknown error occurred during deletion.' }) };
  }
};
