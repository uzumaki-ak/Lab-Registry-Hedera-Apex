export type UserRole = "admin" | "doctor";

export interface LabReportInput {
  id: number;
  patientName: string;
  patientAddress: string;
  testName: string;
  resultValue: string | number;
}

export interface AgentExecutionResult {
  id: number;
  patientAddress: string;
  hashedPatientId: string;
  testName: string;
  resultValue: string | number;
  aiSummary: string;
  hedera: {
    status: string;
    transactionId: string;
  };
}

export interface AuditRecord {
  id: string;
  txId: string;
  aiSummary: string;
  status: "AUTHENTICATED" | "FAILED";
  timestamp: string;
}

