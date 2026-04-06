export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contract } = req.body;

  if (!contract || contract.trim().length === 0) {
    return res.status(400).json({ error: 'No contract provided' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a legal contract analyzer. Analyze contracts and return ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence plain English summary of what this contract is about",
  "dates": [
    {"label": "Date label", "detail": "What this date means"}
  ],
  "obligations": [
    "Party A must do X",
    "Party B must do Y"
  ],
  "risks": [
    {"severity": "high|medium|low", "description": "Description of risk"}
  ]
}
Return ONLY the JSON object, no other text.`
          },
          {
            role: 'user',
            content: `Analyze this contract:\n\n${contract}`
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const result = JSON.parse(raw);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
