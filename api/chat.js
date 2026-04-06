export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, contractText, chatHistory = [] } = req.body;

  if (!question || !contractText) {
    return res.status(400).json({ error: 'Missing question or contract text' });
  }

  try {
    const messages = [
      {
        role: 'system',
        content: `You are a legal contract expert. Answer questions about this specific contract in plain English. Be concise and direct. If something isn't in the contract, say so. Always remind users to consult a qualified attorney for legal decisions.\n\nContract:\n---\n${contractText.slice(0, 8000)}\n---`
      },
      ...chatHistory.slice(-10),
      { role: 'user', content: question }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 500, messages })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return res.status(200).json({ answer: data.choices[0].message.content.trim() });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
