import admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Graceful fallback for local dev or alternative configurations
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Setup Cross-Origin Headers for CORS Secure handshake
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, pointsToAdd } = req.body;

    if (!userId || pointsToAdd === undefined) {
      return res.status(400).json({ error: 'Invalid parameters: ' + JSON.stringify(req.body) });
    }

    const pts = parseInt(pointsToAdd, 10);
    // Anti-cheat verification cap check
    if (isNaN(pts) || pts > 100 || pts < 0) {
      return res.status(400).json({ error: 'Score verification failed or malicious exploit detected.' });
    }

    const userDocRef = db.collection('users').doc(userId);

    // Safely increment user points deep behind the system firewall
    await userDocRef.update({
      total_xp: admin.firestore.FieldValue.increment(pts)
    });

    return res.status(200).json({ success: true, message: 'XP parameters successfully verified.' });

  } catch (error) {
    console.error("XP Sync Verification Error:", error);
    return res.status(500).json({ error: 'Server authentication drop or database connection failure.', details: error.message });
  }
}
