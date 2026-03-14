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

async function chatWithLabContext({ userQuery, labContext }) {
  const apiKey = process.env.EURON_API_KEY;
  if (!apiKey) {
    throw new Error("EURON_API_KEY must be set in your .env");
  }

  const contextStr =
    labContext && labContext.length > 0
      ? labContext
          .map(
            (r, i) =>
              `${i + 1}. Report ${r.report_id}: ${r.test_name}=${r.result_value}, AI: ${r.ai_summary || "-"}, Status: ${r.status || "-"}, Tx: ${r.tx_id || "-"}`
          )
          .join("\n")
      : "No lab records in database yet.";

  const prompt = `You are an AI assistant for a Smart Lab Registry (Hedera Apex 2026). You help users query lab records stored in the lab_audit database.

For greetings or "who are you" type questions: give a brief, friendly 1–2 sentence intro (e.g. "I'm the Smart Lab Registry assistant. I can help you query lab reports, summarize results, and answer questions about glucose, HbA1c, etc.").

For data questions: use the lab records below. Give a concise answer. If the question cannot be answered from the records, say so.

Lab records (from database):
${contextStr}

User question: ${userQuery}`;

  const body = {
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: false,
  };

  const res = await fetch("https://api.euron.one/api/v1/euri/chat/completions", {
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
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    data.choices?.[0]?.delta?.content?.trim() ||
    "I couldn't generate a response."
  );
}

module.exports = { summarizeLabResult, chatWithLabContext };

