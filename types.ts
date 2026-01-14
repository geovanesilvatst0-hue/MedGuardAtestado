
export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export type Permission = 
  | 'EMPLOYEE_READ' | 'EMPLOYEE_WRITE' | 'EMPLOYEE_DELETE'
  | 'CERT_READ' | 'CERT_WRITE' | 'CERT_DELETE'
  | 'USER_MANAGEMENT' | 'IMPORT' | 'EXPORT' | 'VIEW_SENSITIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

// Added missing ConfidenceLevel type exported for CertificateForm.tsx
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractionConfidence {
  issueDate: number;
  startDate: number;
  endDate: number;
  days: number;
  cid: number;
  doctorName: number;
  crm: number;
  patientName: number;
  type: number;
}

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  registration: string;
  department: string;
  role: string;
  createdAt: string;
}

export interface MedicalCertificate {
  id: string;
  employeeId: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  days: number;
  cid?: string;
  doctorName: string;
  crm: string;
  fileUrl?: string;
  fileName?: string;
  status: CertificateStatus;
  type: 'Doença' | 'Acidente' | 'Maternidade' | 'Outros';
  extractionConfidence?: ExtractionConfidence;
  createdAt?: string;
  observations?: string;
}
