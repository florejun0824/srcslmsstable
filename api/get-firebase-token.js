// api/get-firebase-token.js
import admin from 'firebase-admin';

// Initialize Admin SDK using your Vercel Environment Variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // This replace() is critical because environment variables sometimes mess up the \n formatting
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // Setup CORS for standard Node.js Vercel API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // In Vercel Node.js functions, req.body is already parsed if it's JSON
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const db = admin.firestore();

    // 1. Query the database for the user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', username).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // 2. Securely verify the password on the backend
    if (password !== userData.password) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // 3. Check if the account is restricted
    if (userData.isRestricted) {
      return res.status(403).json({ error: "This account has been restricted. Please contact an administrator." });
    }

    // 4. GENERATE THE TOKEN
    // We use the exact Firestore Document ID so Firebase knows exactly who they are
    const uid = userDoc.id; 
    
    // We can also pass "claims" like their role so Firebase Rules can use them later
    const customToken = await admin.auth().createCustomToken(uid, {
      role: userData.role 
    });

    // 5. Send it back to React!
    return res.status(200).json({ token: customToken });

  } catch (error) {
    console.error("Auth API Error:", error);
    return res.status(500).json({ error: "Internal Server Error. Could not generate token." });
  }
}