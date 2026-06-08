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
    // Graceful fallback for local development or alternative configurations
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Allow your frontend to communicate with this function
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
    const { text, mode, userId, setId } = req.body;
    
    if (!text || !mode || !userId || !setId) {
      return res.status(400).json({ error: 'Missing required configuration parameters: text, mode, userId, or setId.' });
    }

    // Retrieve your secret API Key hidden securely in Vercel settings
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Gemini API Key configuration on Vercel.' });
    }

    // --- INTEGRATED MASTER PROMPT STRATEGY FOR GOOGLE AI STUDIO ---
    const systemInstruction = `You are the central AI brain of Mooderia Education, a playful, Kahoot-like gamified study platform. Your job is to convert student lecture text into structural data game formats. 
CRITICAL COMPLIANCE RULES:
1. Output ONLY a raw, un-wrapped JSON code array.
2. NEVER wrap code blocks inside markdown tags like \`\`\`json.
3. No conversational headers, explanations, or salutations allowed.

Format requirements based on mode:
- Mode 'quiz': [{"question":"String", "options":["A","B","C","D"], "answer":"Exact match string"}]
- Mode 'flashcards': [{"front":"Concept term string", "back":"Short concise explanation string"}]`;

    const userPrompt = `Mode: ${mode}\n\nNotes Material:\n${text}`;

    // Connect to Google Generative AI API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json' // Forces Gemini to send pure JSON code back
        }
      })
    });

    const data = await googleResponse.json();
    
    // Extract the raw text payload from Google's response structure
    const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawAiText) {
      console.error("[AI Result Error] Google response parsing payload:", JSON.stringify(data));
      return res.status(500).json({ error: 'AI failed to generate structural data.' });
    }

    const parsedJsonData = JSON.parse(rawAiText.trim());

    // Save and cache directly into Cloud Firestore to optimize system loads
    const studySetRef = db.collection('study_sets').doc(setId);
    const docSnap = await studySetRef.get();

    const timestamp = new Date().toISOString();
    
    // Cache management
    let payloadToSave = {};
    if (docSnap.exists) {
      const existingData = docSnap.data();
      const currentGenContent = existingData.generated_content || {};
      
      currentGenContent[mode] = parsedJsonData;

      payloadToSave = {
        generated_content: currentGenContent,
        ai_processed_at: timestamp
      };
      await studySetRef.update(payloadToSave);
    } else {
      payloadToSave = {
        set_id: setId,
        owner_id: userId,
        title: "Untitled Material",
        source_file_type: "txt",
        extracted_plain_text: text,
        generated_content: {
          [mode]: parsedJsonData
        },
        ai_processed_at: timestamp
      };
      await studySetRef.set(payloadToSave);
    }

    // Return the clean gamified array directly back to your frontend layout components
    return res.status(200).json({ success: true, result: parsedJsonData });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return res.status(500).json({ error: 'Internal pipeline connectivity failure.', details: error.message });
  }
}
