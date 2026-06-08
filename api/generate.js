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
    const { text, mode } = req.body;
    
    // Retrieve your secret API Key hidden securely in Vercel settings
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Gemini API Key configuration on Vercel.' });
    }

    // Embed the Mooderia System Instruction Prompt directly in the secure backend
    const systemInstruction = `You are the AI brain of Mooderia Education, a playful, Kahoot-like gamified study platform. Convert the student notes into game data. 
CRITICAL: Output ONLY a raw, clean JSON array. NEVER wrap the output in markdown text blocks like \`\`\`json. Never say hello or write explanations.

Format for mode 'quiz': [{"question":"text", "options":["A","B","C","D"], "answer":"exact match"}]
Format for mode 'flashcards': [{"front":"concept", "back":"explanation"}]`;

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
      return res.status(500).json({ error: 'AI failed to generate structural data.' });
    }

    // Send the clean quiz/flashcard string back to the website dashboard
    return res.status(200).json({ result: JSON.parse(rawAiText.trim()) });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Connection Error' });
  }
}
