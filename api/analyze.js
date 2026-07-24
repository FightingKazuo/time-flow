export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt" });

    const apiKey = process.env.GEMINI_API_KEY;
    const url    = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
    });

    const data = await response.json();

    if(data.error) return res.status(500).json({ error: data.error.message });

    // Geminiのレスポンス形式をClaudeと同じ形式に変換
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ content: [{ text }] });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
