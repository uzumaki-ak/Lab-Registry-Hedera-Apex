const DEFAULT_MODEL = process.env.EURON_MODEL || "gemini-2.5-flash";

async function summarizeLabResult({ hashedPatientId, testName, resultValue }) {
  const apiKey = process.env.EURON_API_KEY;
  if (!apiKey) {
    throw new Error("EURON_API_KEY must be set in your .env");
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
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: false,
  };

  const url = "https://api.euron.one/api/v1/euri/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Euron API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const text =
    data.choices?.[0]?.message?.content?.trim() ||
    data.choices?.[0]?.delta?.content?.trim() ||
    "AI Analysis: No summary generated";

  return text;
}

module.exports = { summarizeLabResult };

