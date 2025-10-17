// /api/apirewrite.js
// Install dependencies: npm install openai

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function addHumanTexture(text) {
  const variations = [
    { regex: /\bHowever\b/g, replace: ["That said", "But", "On the flip side", "Though"] },
    { regex: /\bMoreover\b/g, replace: ["Also", "Plus", "And yeah", "What's more"] },
    { regex: /\bin order to\b/g, replace: ["to", "so I can", "just to"] },
    { regex: /\bIt is important to\b/g, replace: ["You should", "It's key to", "I'd say it's worth"] },
  ];
  let result = text;
  variations.forEach(({ regex, replace }) => {
    result = result.replace(regex, () => replace[Math.floor(Math.random() * replace.length)]);
  });
  return result;
}

function cleanInput(s) {
  return (s || "").toString().trim().slice(0, 6000).replace(/[<>]/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, anecdote1, anecdote2, extraDetail, toneHint } = req.body;

    if (!text || !anecdote1 || !anecdote2) {
      return res.status(400).json({ error: "Text and two personal details are required" });
    }

    const prompt = `
You are a human editor. Rewrite the text below to:
- Sound natural and human.
- Include these personal details subtly: "${anecdote1}", "${anecdote2}".
- Match the tone: ${toneHint || "friendly, conversational"}.
- Include additional context if provided: "${extraDetail || ""}".
- Output only the rewritten text.

Text:
-----
${text}
-----
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.0,
      max_tokens: 2000,
    });

    let rewritten = (completion.choices?.[0]?.message?.content || "").trim();
    rewritten = addHumanTexture(rewritten);

    const suggestions = [
      "Add a personal opinion on one key point.",
      "Insert a real-life example from your experience.",
      "Vary sentence starters for better flow.",
      "Include a question or rhetorical aside.",
      "Check and adjust any awkward phrasing manually."
    ];

    const disclosure = "This text was refined with an automated assistant. Manually review and add your own edits for authenticity.";

    res.status(200).json({ rewritten, suggestions, disclosure });
  } catch (err) {
    console.error("Rewrite error:", err);
    res.status(500).json({ error: "Rewrite failed", details: String(err) });
  }
}

