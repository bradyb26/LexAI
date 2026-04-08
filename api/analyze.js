export default async function handler(req, res) {
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
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `You are a senior commercial attorney with 20+ years of experience reviewing complex contracts for Fortune 500 companies. Your job is to produce a thorough, professional-grade contract analysis that a practicing lawyer would find genuinely useful.

Analyze the contract provided and return ONLY a valid JSON object in exactly this format. Be exhaustive — do not summarize or skip details. Every financial figure, deadline, obligation, right, and risk must be captured:

{
  "summary": "3-5 sentence plain English executive summary covering: what type of contract this is, who the parties are and their roles, the core deal structure, the key financial terms, and the duration",

  "parties": [
    {
      "name": "Full legal name of party",
      "role": "Their role in the contract (e.g. Licensor, Buyer, Employer)",
      "jurisdiction": "Where they are incorporated or based",
      "obligations_summary": "One sentence summary of their primary obligations"
    }
  ],

  "dates": [
    {
      "label": "Short label for this date or deadline",
      "detail": "Full explanation of what this date means, what triggers it, and what happens if it is missed"
    }
  ],

  "financials": [
    {
      "label": "Name of this financial term",
      "amount": "Exact dollar amount or percentage",
      "detail": "Full explanation including when it is due, how it is calculated, and consequences of non-payment"
    }
  ],

  "obligations": [
    {
      "party": "Name of the party with this obligation",
      "obligation": "Specific obligation",
      "consequence": "What happens if this obligation is not met"
    }
  ],

  "rights": [
    {
      "party": "Name of the party holding this right",
      "right": "Description of the right",
      "conditions": "Any conditions or limitations on this right"
    }
  ],

  "termination": {
    "initial_term": "Length and start of initial term",
    "renewal": "How and when the contract renews",
    "termination_for_cause": "Conditions allowing termination for cause and notice required",
    "termination_for_convenience": "Whether either party can terminate without cause and conditions",
    "notice_period": "Required notice period for termination",
    "post_termination": "Key obligations that survive termination"
  },

  "risks": [
    {
      "severity": "critical|high|medium|low",
      "category": "Financial|Legal|Operational|IP|Compliance|Other",
      "title": "Short title for this risk",
      "description": "Detailed description of the risk including the specific clause it comes from",
      "recommendation": "Practical recommendation for how to address or mitigate this risk"
    }
  ],

  "missing_clauses": [
    {
      "clause": "Name of missing or weak clause",
      "importance": "high|medium|low",
      "explanation": "Why this clause is important and what risk its absence creates"
    }
  ],

  "governing_law": {
    "jurisdiction": "Governing law jurisdiction",
    "dispute_resolution": "Full description of dispute resolution process",
    "venue": "Where disputes must be filed or arbitrated"
  },

  "overall_risk_score": "1-10 number representing overall contract risk (10 = extremely high risk)",
  "overall_risk_summary": "2-3 sentence summary of the overall risk profile of this contract and the top 2-3 things the reviewing party should focus on before signing"
}

CRITICAL INSTRUCTIONS:
- Use gpt-4o level analysis — be thorough, precise, and professional
- Extract EVERY financial figure, deadline, and obligation — do not generalize
- The risks array must contain ALL significant risks — aim for 6-10 risks minimum on complex contracts
- The missing_clauses array should flag any standard clauses that are absent or unusually weak
- Write as if you are billing $500/hour and a client's business depends on this analysis
- Return ONLY the JSON object with no additional text, markdown, or code blocks`
          },
          {
            role: 'user',
            content: `Please perform a comprehensive legal analysis of this contract:\n\n${contract}`
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    let raw = data.choices[0].message.content.trim();

    // Strip markdown code blocks if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const result = JSON.parse(raw);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
