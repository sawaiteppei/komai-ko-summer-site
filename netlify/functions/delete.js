const { google } = require('googleapis');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin ---
// Service account is passed via environment variable
try {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase Admin initialization error', e);
}
const db = admin.firestore();

// --- Initialize Google Drive ---
const getDrive = () => {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }
  
  // Check for all required environment variables
  if (!process.env.GOOGLE_CREDENTIALS || !process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.APP_ID) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Server environment variables are not configured correctly.'}) };
  }

  try {
    const { fileId } = JSON.parse(event.body);
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileId is required.' }) };
    }

    const drive = getDrive();
    
    // --- Delete from Google Drive ---
    await drive.files.delete({ fileId: fileId });

    // --- Delete from Firestore ---
    const appId = process.env.APP_ID;
    const docRef = db.collection(`/artifacts/${appId}/public/data/photos`).doc(fileId);
    await docRef.delete();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File and comments deleted successfully.' }),
    };
  } catch (error) {
    console.error('Error in delete function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'An unknown error occurred during deletion.' }),
    };
  }
};
