import React from "react";

export const Landing: React.FC = () => {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Smart Lab Registry</h1>
        <p className="sub">
          Verifiable AI diagnostics on Hedera — automated from lab result to
          immutable anchor.
        </p>
      </header>
      <div className="grid-two">
        <section className="card">
          <h2>What this Agent Does</h2>
          <ul className="bullets">
            <li>
              Listens for lab results from the UI and locally hashes patient
              identifiers.
            </li>
            <li>
              Calls an LLM to produce a short diagnostic summary, without ever
              sending PII.
            </li>
            <li>
              Anchors the summary to the LabRegistry V5 contract on Hedera with
              HTS badge gating.
            </li>
          </ul>
        </section>
        <section className="card">
          <h2>FAQ</h2>
          <dl className="faq">
            <dt>Where does the AI run?</dt>
            <dd>
              In an LLM proxy service (Gemini-compatible). The agent only sends
              hashed IDs and clinical values.
            </dd>
            <dt>What is stored on-chain?</dt>
            <dd>
              A compact AI summary, technician/agent label, and patient EVM
              address, behind V5 RBAC + HTS checks.
            </dd>
            <dt>How do we verify?</dt>
            <dd>
              Every workflow emits a Hedera transaction that appears in the
              Audit Trail and on HashScan.
            </dd>
          </dl>
        </section>
      </div>
      <footer className="landing-footer">
        <p>Built for Hedera Apex 2026 · Agent pipeline by Uzumaki</p>
      </footer>
    </div>
  );
};

