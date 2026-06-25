export interface Student {
  id: string; // e.g. STU101
  admissionNumber: string; // e.g. ADM2026001
  name: string;
  className: string;
  section: string;
  dob: string;
  address: string;
  photo: string; // data URL or URL
  fatherName: string;
  motherName: string;
  fatherEmail: string;
  motherEmail: string;
  fatherMobile: string;
  motherMobile: string;
  fatherPhoto: string; // data URL or URL
  motherPhoto: string; // data URL or URL
  isParentBlocked?: boolean; // If true, parent is blocked from making changes or creating requests
}

export interface PickupRequest {
  id: string;
  studentId: string;
  fullName: string;
  age: number;
  mobileNumber: string;
  email?: string; // Delegate / visitor email to receive the OTP
  otpCode?: string; // Principal authorized OTP
  relationship: string;
  photograph: string; // base64 / photourl
  aadhaarNumber: string;
  aadhaarPhoto: string; // base64 / photourl
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  verificationCode?: string; // 6-digit code or temporary QR token
  codeExpiresAt?: string; // ISO string (30 mins from approval)
  isUsed?: boolean;
  isDelegated?: boolean; // True if delegated to an unknown/non-relative individual
  
  // School Admin & Gate clearance fields
  adminApproval?: 'pending' | 'approved' | 'rejected';
  approvedByRole?: 'principal' | 'gate_officer' | 'system_override';
  approvedByName?: string;
  adminVerificationTime?: string;
  adminVerificationNotes?: string;
}

export interface SecurityLog {
  id: string;
  pickupTime: string; // ISO string
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  pickupPersonName: string;
  pickupPersonPhoto: string;
  relationship: string; // e.g., Father, Mother, Uncle, Driver, etc.
  gateNumber: string;
  securityStaffName: string;
  verificationMethod: 'QR Scan' | 'Temp Verification Code' | 'Temporary QR' | 'Manual Admin Override' | 'Hard Copy QR Scan' | 'Principal OTP Verified (Parent Assumed)';
  status: 'AUTHORIZED' | 'TEMPORARY_APPROVED' | 'NOT_AUTHORIZED';
}

export interface SecurityStaff {
  id: string;
  name: string;
  gateNumber: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  studentId?: string;
  type: 'pickup_request' | 'pickup_confirm' | 'system';
  isRead: boolean;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}
