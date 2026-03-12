const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function summarizeLabResult({ hashedPatientId, testName, resultValue }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set in your .env");
  }

  const prompt = `
You are a clinical decision support assistant.
Given an anonymized lab result, generate a short, clear medical summary that would be suitable to store on-chain.

Constraints:
- Do NOT include the patient's real name or any identifying information.
- Reference the patient only via their anonymized ID.
- Be concise (max 1–2 sentences).

Input:
- Patient ID (hashed): ${hashedPatientId}
- Test: ${testName}
- Result value: ${resultValue}
`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "AI Analysis: No summary generated";

  return text;
}

module.exports = { summarizeLabResult };

