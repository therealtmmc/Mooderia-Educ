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
    const { messages, appState } = req.body;
    
    // Retrieve your secret API Key hidden securely in Vercel settings
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Gemini API Key configuration on Vercel.' });
    }

    const stateContextText = `You are Mooderia AI Copilot. You assist the student by controlling the app, navigating, or just answering academic questions. 
Current App State context:
- Active Tab: ${appState?.activeTab || 'N/A'}
- Sound Enabled: ${appState?.soundOn}
- Existing Folders: ${appState?.folders?.map(f => f.name).join(", ") || 'None'}

If the user asks to change tabs, mute/unmute, or create a folder, use the provided tools. If the tools complete the action, you can also add a friendly text response acknowledging it.`;

    const tools = [{
      functionDeclarations: [
        {
          name: "navigate",
          description: "Navigate to a specific tab in the app.",
          parameters: {
            type: "OBJECT",
            properties: { 
              tab: { type: "STRING", description: "Must be one of: 'folders', 'quizzes', 'profile', 'analytics'" } 
            },
            required: ["tab"]
          }
        },
        {
          name: "toggleSound",
          description: "Turn the app sound effects on or off.",
          parameters: {
            type: "OBJECT",
            properties: { 
              enabled: { type: "BOOLEAN", description: "True to enable sound, false to mute." } 
            },
            required: ["enabled"]
          }
        },
        {
          name: "createFolder",
          description: "Create a new workspace folder for the user.",
          parameters: {
            type: "OBJECT",
            properties: { 
              name: { type: "STRING", description: "Name of the folder." },
              description: { type: "STRING", description: "Short description of the folder." }
            },
            required: ["name"]
          }
        }
      ]
    }];

    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Connect to Google Generative AI API safely
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: { parts: [{ text: stateContextText }] },
        tools: tools,
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    const data = await googleResponse.json();
    
    if (data.error) {
       console.error("Gemini API Error:", data.error);
       return res.status(500).json({ error: data.error.message || 'API Error' });
    }

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    let text = "";
    let functionCalls = [];

    parts.forEach(part => {
       if (part.text) text += part.text;
       if (part.functionCall) {
          functionCalls.push({
             name: part.functionCall.name,
             args: part.functionCall.args
          });
       }
    });

    return res.status(200).json({ text: text.trim(), functionCalls });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Connection Error' });
  }
}
