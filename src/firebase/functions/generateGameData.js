/**
 * Mooderia Education — Centralized Cloud Function Execution Script
 * 
 * Target Endpoint: HTTPS Callable Cloud Function (generateGameData)
 * Runtime: Node.js (Firebase Functions Gen 2)
 * 
 * 📄 Description: This function runs securely in the GCP cloud environment. It prevents 
 * intellectual theft or security credential leaks on client devices by proxying all requests 
 * securely using the Google GenAI SDK and saving results into Firestore on behalf of authenticated students.
 * 
 * 🛠️ Deployment Instructions:
 * 1. Initialize functions folder: `firebase init functions` (choose JavaScript or TypeScript)
 * 2. Ensure package.json defines dependencies:
 *    - "firebase-admin": "^12.0.0"
 *    - "firebase-functions": "^6.0.0"
 *    - "@google/genai": "^2.4.0"
 * 3. Configure API Keys in Firebase environment shell:
 *    `firebase functions:secrets:set GEMINI_API_KEY=your_key_here`
 */

const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

// Initialize Admin Session
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();

exports.generateGameData = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"] }, async (req, res) => {
  // Enforce structured POST protocols
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method operations verified by active CORS protocol." });
  }

  // 1. Secure Authentication Shield Check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access: Missing required Bearer Auth Identity credentials." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (authError) {
    console.error("[Function Auth Fail] Token validation expired:", authError);
    return res.status(403).json({ error: "Forbidden access: Identity token evaluation failed validation." });
  }

  const { setId } = req.body;
  if (!setId) {
    return res.status(400).json({ error: "Missing payload parameter: 'setId' parameter target is specified mandatory." });
  }

  const docRef = db.collection("study_sets").doc(setId);
  
  try {
    // 2. Fetch the target materials database representation
    const setSnap = await docRef.get();
    if (!setSnap.exists) {
      return res.status(404).json({ error: `Dataset referenced at setId '${setId}' is non-existent.` });
    }

    const setData = setSnap.data();

    // Prevent cross-tenant information leaking
    if (setData.owner_id !== decodedToken.uid) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to build study exercises for another owner." });
    }

    const textToAnalyze = setData.extracted_plain_text;
    const documentTitle = setData.title;

    // 3. Initiate connection with Google AI Studio SDK with absolute server-side security isolation
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("[GCP Environment State Error] GEMINI_API_KEY secret environment missing.");
      return res.status(500).json({ error: "Internal Gateway Error: Server AI credentials pending setup." });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    
    console.log(`[Central AI Bridge] Prompting Gemini 2.5 Flash to study materials: "${documentTitle}"`);

    // Force exact formatting schema with strict system instructions
    const promptInstructions = `
      You are Mooderia's highly energetic, Kahoot-like AI gamified study assistant.
      Analyze the research material provided below, and generate:
      1. A set of highly interactive multiple choice quiz items.
      2. Comprehensive flashcard questions and standard clue-answers for spaced repetition loops.

      You must generate your output strictly in JSON according to this exact structural block schema:
      {
        "quiz": [
          {
            "question": "Clear, gamified question string...",
            "options": ["Correct Answer Option", "Wrong Distractor A", "Wrong Distractor B", "Wrong Distractor C"],
            "answer": "Correct Answer Option"
          }
        ],
        "flashcards": [
          {
            "front": "Topic or questioning side...",
            "back": "Detailed answer matching learning nodes.",
            "clue": "Quick 2-word helpful hint (optional)"
          }
        ]
      }

      CRITICAL CONSTRAINTS:
      - Return ONLY the raw valid JSON payload.
      - NEVER include markdown wraps (e.g. \`\`\`json ... \`\`\`), HTML tags, or conversations.
      - Distractors in options must be plausible and engaging.
      - Base everything strictly on the extracted lecture node text material.
    `;

    const userPrompt = `
      Document Title: ${documentTitle}
      Lecture Extracted Content:
      "${textToAnalyze}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: promptInstructions,
        // Enforce solid json parsing from top level
        responseMimeType: "application/json"
      }
    });

    const aiTextOutput = response.text || "";
    
    // Parse response cleanly
    let finalPayload;
    try {
      finalPayload = JSON.parse(aiTextOutput.trim());
    } catch (parseFail) {
      console.error("[JSON Parsing Malform] Raw AI response failed evaluation. Raw text:", aiTextOutput);
      return res.status(500).json({ 
        error: "AI Generation Pipeline Malformed", 
        details: "AI delivered inconsistent syntax layout. Rerun to rebuild." 
      });
    }

    // 4. Safely update collection item saving output into the structural StudySet nested content
    const updateStats = {
      generated_content: {
        quiz: finalPayload.quiz || [],
        flashcards: finalPayload.flashcards || []
      },
      ai_processed_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.update(updateStats);

    console.log(`[Central AI Bridge] Successfully generated and cached study elements for set: ${setId}`);
    
    return res.status(200).json({
      success: true,
      setId: setId,
      generated_content: updateStats.generated_content
    });

  } catch (error) {
    console.error("[AI Processing Routine Critical Fail]:", error);
    return res.status(500).json({ 
      error: "AI engine processing cycle crashed abortively.", 
      message: error.message 
    });
  }
});
