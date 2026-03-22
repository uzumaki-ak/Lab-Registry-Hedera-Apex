import type { LabReportInput, AgentExecutionResult, AuditRecord } from "./types";

const AGENT_API_URL =
  (import.meta.env.VITE_AGENT_API_URL as string | undefined) ||
  "http://localhost:4000";

const MIRROR_NODE_URL =
  (import.meta.env.VITE_MIRROR_NODE_URL as string | undefined) ||
  "https://testnet.mirrornode.hedera.com";

const LAB_REGISTRY_CONTRACT_ID =
  (import.meta.env.VITE_LAB_REGISTRY_CONTRACT_ID as string | undefined) ||
  "0.0.8321102"; // UPDATED FROM 8221212

export async function executeAgent(
  payload: LabReportInput
): Promise<AgentExecutionResult> {
  const res = await fetch(`${AGENT_API_URL}/api/execute-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agent API error: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchMirrorNodeAudit(): Promise<AuditRecord[]> {
  const url = `${MIRROR_NODE_URL}/api/v1/contracts/${LAB_REGISTRY_CONTRACT_ID}/results?order=desc&limit=5`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mirror node error: ${res.status} ${text}`);
  }

  const data = await res.json();

  return (data.results ?? []).map((tx: any, index: number) => {
    const ts = tx.timestamp ? Number(tx.timestamp.split(".")[0]) * 1000 : Date.now();
    const ok = !tx.error_message;
    return {
      id: String(index),
      txId: tx.hash || tx.transaction_id || `tx-${index}`,
      aiSummary: "(from Mirror Node)",
      status: ok ? "AUTHENTICATED" : "FAILED",
      timestamp: new Date(ts).toLocaleString(),
    } as AuditRecord;
  });
}

export interface LabAuditRow {
  id: string;
  report_id: string | null;
  patient_evm: string | null;
  patient_name: string | null;
  test_name: string | null;
  result_value: string | null;
  ai_summary: string | null;
  ipfs_cid: string | null;
  tx_id: string | null;
  status: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export async function fetchLabAudit(patientEvm?: string) {
  const { supabase } = await import("./supabaseClient");
  if (!supabase) return [];
  
  let query = supabase
    .from("lab_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (patientEvm) {
    query = query.eq("patient_evm", patientEvm);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LabAuditRow[];
}

export async function chatWithAgent(query: string, labContext: LabAuditRow[]): Promise<string> {
  const url =
    (import.meta.env.VITE_AGENT_API_URL as string | undefined) || "http://localhost:4000";
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, labContext }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.answer ?? "No response.";
}

export function hederaTxUrl(txId: string | null): string | null {
  if (!txId || !txId.includes("@")) return null;
  return `https://hashscan.io/testnet/transaction/${encodeURIComponent(txId)}`;
}

export async function insertLabAudit(row: Partial<LabAuditRow>) {
  const { supabase } = await import("./supabaseClient");
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("lab_audit").insert(row);
  if (error) throw new Error(error.message);
}
export async function verifyOnChainReport(id: number) {
  const response = await fetch(`${AGENT_API_URL}/api/verify-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to verify report");
  }
  return response.json();
}

export async function rejectOnChainReport(id: number, reason: string) {
  const response = await fetch(`${AGENT_API_URL}/api/reject-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reject report");
  }
  return response.json();
}

export async function handleTransferRequest(id: number, approve: boolean, note: string) {
  const response = await fetch(`${AGENT_API_URL}/api/handle-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, approve, note }),
  });
  if (!response.ok) throw new Error("Failed to handle transfer");
  return response.json();
}

export async function setAutomationStatus(status: boolean) {
  const response = await fetch(`${AGENT_API_URL}/api/set-automation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to set automation status");
  return response.json();
}

export async function setAnchorFee(fee: number) {
  const response = await fetch(`${AGENT_API_URL}/api/set-fee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fee }),
  });
  if (!response.ok) throw new Error("Failed to set anchor fee");
  return response.json();
}

export async function fetchTreasuryStats() {
  const response = await fetch(`${AGENT_API_URL}/api/treasury-stats`);
  if (!response.ok) throw new Error("Failed to fetch treasury stats");
  return response.json();
}
export async function requestDataTransfer(id: number) {
  const response = await fetch(`${AGENT_API_URL}/api/request-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to initiate data portability handshake");
  }
  return response.json();
}