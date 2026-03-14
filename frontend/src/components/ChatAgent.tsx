import React, { useState } from "react";
import { fetchLabAudit, chatWithAgent } from "../api";

interface ChatMessage {
  id: number;
  from: "user" | "agent";
  text: string;
}

let chatId = 0;

export const ChatAgent: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: ++chatId,
      from: "agent",
      text: "Ask me anything about your lab records. I use the database (lab_audit) and the Euron LLM to answer. Try: 'Summarize recent reports' or 'What glucose results do we have?'",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const pushMessage = (from: ChatMessage["from"], text: string) => {
    setMessages((prev) => [...prev, { id: ++chatId, from, text }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    pushMessage("user", trimmed);
    setInput("");

    try {
      setLoading(true);
      const labContext = await fetchLabAudit();
      const answer = await chatWithAgent(trimmed, labContext);
      pushMessage("agent", answer);
    } catch (err: any) {
      console.error(err);
      pushMessage(
        "agent",
        `Error: ${String(err?.message || err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Agent Chat</h1>
        <p className="sub">
          Ask questions about lab records. LLM (Euron) uses the lab_audit
          database to answer.
        </p>
      </header>
      <div className="card chat-card">
        <div className="chat-log">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.from === "user" ? "chat-bubble user" : "chat-bubble agent"
              }
            >
              <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
            </div>
          ))}
        </div>
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about reports, glucose, etc."
          />
          <button type="submit" disabled={loading}>
            {loading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};
