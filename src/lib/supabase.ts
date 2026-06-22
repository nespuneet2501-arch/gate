import { createClient } from '@supabase/supabase-js';
import { Student, PickupRequest, SecurityLog, AppNotification, EmailLog } from '../types';

// Read values from Vite environment variables safely
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPERBASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPERBASE_ANON_KEY || '';

// Initialize client if details are provided
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Complete PostgreSQL schema script for user's Supabase instance
export const SUPABASE_SQL_SCHEMA = `-- GD Goenka Public School - Smart Dispersal System Schema Setup
-- Paste this script directly in your Supabase SQL Editor (https://supabase.com/dashboard) and run it.

-- Enable UUID generation support (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  admission_number TEXT NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section TEXT NOT NULL,
  dob TEXT NOT NULL,
  address TEXT NOT NULL,
  photo TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  father_email TEXT NOT NULL,
  mother_email TEXT NOT NULL,
  father_mobile TEXT NOT NULL,
  mother_mobile TEXT NOT NULL,
  father_photo TEXT NOT NULL,
  mother_photo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pickup Requests / Delegate Approvals Table
CREATE TABLE IF NOT EXISTS pickup_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT,
  otp_code TEXT,
  relationship TEXT NOT NULL,
  photograph TEXT NOT NULL,
  aadhaar_number TEXT NOT NULL,
  aadhaar_photo TEXT NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TEXT NOT NULL,
  approved_at TEXT,
  verification_code TEXT,
  code_expires_at TEXT,
  is_used BOOLEAN DEFAULT false,
  admin_approval TEXT,
  approved_by_role TEXT,
  approved_by_name TEXT,
  admin_verification_time TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Security logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id TEXT PRIMARY KEY,
  pickup_time TEXT NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section TEXT NOT NULL,
  pickup_person_name TEXT NOT NULL,
  pickup_person_photo TEXT NOT NULL,
  relationship TEXT NOT NULL,
  gate_number TEXT NOT NULL,
  security_staff_name TEXT NOT NULL,
  verification_method TEXT NOT NULL,
  status TEXT CHECK (status IN ('AUTHORIZED', 'TEMPORARY_APPROVED', 'NOT_AUTHORIZED'))
);

-- 4. App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('pickup_request', 'pickup_confirm', 'system')) NOT NULL,
  is_read BOOLEAN DEFAULT false
);

-- 5. Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Indexes for performance & quick scans
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name, section);
CREATE INDEX IF NOT EXISTS idx_requests_student ON pickup_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_code ON pickup_requests(verification_code);
CREATE INDEX IF NOT EXISTS idx_logs_student ON security_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);

-- Disable Row Level Security (RLS) or enable permissive policies for prototyping
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;

-- Insert demonstration initial seed data
INSERT INTO students (id, admission_number, name, class_name, section, dob, address, photo, father_name, mother_name, father_email, mother_email, father_mobile, mother_mobile, father_photo, mother_photo)
VALUES 
('STU101', 'ADM2026001', 'Aarav Sharma', 'Class 2', 'A', '2019-04-12', 'B-102, Gold Croft Apartments, Dwarka Sector 11, New Delhi', 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=200', 'Vijay Sharma', 'Meera Sharma', 'vijay.sharma@example.com', 'meera.sharma@example.com', '+91 98101 23456', '+91 98101 65432', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'),
('STU102', 'ADM2026002', 'Rhea Malhotra', 'Class 4', 'B', '2017-08-22', 'Block C4, House 145, Vasant Kunj, New Delhi', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', 'Rohan Malhotra', 'Divya Malhotra', 'rohan.malhotra@example.com', 'divya.malhotra@example.com', '+91 99581 00221', '+91 99581 44331', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
`;

// Map fields between local camelCase types and postgres snake_case columns
export function mapStudentFromDB(row: any): Student {
  return {
    id: row.id,
    admissionNumber: row.admission_number,
    name: row.name,
    className: row.class_name,
    section: row.section,
    dob: row.dob,
    address: row.address,
    photo: row.photo,
    fatherName: row.father_name,
    motherName: row.mother_name,
    fatherEmail: row.father_email,
    motherEmail: row.mother_email,
    fatherMobile: row.father_mobile,
    motherMobile: row.mother_mobile,
    fatherPhoto: row.father_photo,
    motherPhoto: row.mother_photo
  };
}

export function mapStudentToDB(s: Student): any {
  return {
    id: s.id,
    admission_number: s.admissionNumber,
    name: s.name,
    class_name: s.className,
    section: s.section,
    dob: s.dob,
    address: s.address,
    photo: s.photo,
    father_name: s.fatherName,
    mother_name: s.motherName,
    father_email: s.fatherEmail,
    mother_email: s.motherEmail,
    father_mobile: s.fatherMobile,
    mother_mobile: s.motherMobile,
    father_photo: s.fatherPhoto,
    mother_photo: s.motherPhoto
  };
}

export function mapPickupRequestFromDB(row: any): PickupRequest {
  return {
    id: row.id,
    studentId: row.student_id,
    fullName: row.full_name,
    age: row.age,
    mobileNumber: row.mobile_number,
    email: row.email,
    otpCode: row.otp_code,
    relationship: row.relationship,
    photograph: row.photograph,
    aadhaarNumber: row.aadhaar_number,
    aadhaarPhoto: row.aadhaar_photo,
    notes: row.notes,
    status: row.status as any,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    verificationCode: row.verification_code,
    codeExpiresAt: row.code_expires_at,
    isUsed: row.is_used,
    adminApproval: row.admin_approval,
    approvedByRole: row.approved_by_role,
    approvedByName: row.approved_by_name,
    adminVerificationTime: row.admin_verification_time
  };
}

export function mapPickupRequestToDB(r: PickupRequest): any {
  return {
    id: r.id,
    student_id: r.studentId,
    full_name: r.fullName,
    age: r.age,
    mobile_number: r.mobileNumber,
    email: r.email || null,
    otp_code: r.otpCode || null,
    relationship: r.relationship,
    photograph: r.photograph,
    aadhaar_number: r.aadhaarNumber,
    aadhaar_photo: r.aadhaarPhoto,
    notes: r.notes || '',
    status: r.status,
    created_at: r.createdAt,
    approved_at: r.approvedAt || null,
    verification_code: r.verificationCode || null,
    code_expires_at: r.codeExpiresAt || null,
    is_used: r.isUsed || false,
    admin_approval: r.adminApproval || null,
    approved_by_role: r.approvedByRole || null,
    approved_by_name: r.approvedByName || null,
    admin_verification_time: r.adminVerificationTime || null
  };
}

export function mapSecurityLogFromDB(row: any): SecurityLog {
  return {
    id: row.id,
    pickupTime: row.pickup_time,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name,
    section: row.section,
    pickupPersonName: row.pickup_person_name,
    pickupPersonPhoto: row.pickup_person_photo,
    relationship: row.relationship,
    gateNumber: row.gate_number,
    securityStaffName: row.security_staff_name,
    verificationMethod: row.verification_method as any,
    status: row.status as any
  };
}

export function mapSecurityLogToDB(l: SecurityLog): any {
  return {
    id: l.id,
    pickup_time: l.pickupTime,
    student_id: l.studentId,
    student_name: l.studentName,
    class_name: l.className,
    section: l.section,
    pickup_person_name: l.pickupPersonName,
    pickup_person_photo: l.pickupPersonPhoto,
    relationship: l.relationship,
    gate_number: l.gateNumber,
    security_staff_name: l.securityStaffName,
    verification_method: l.verificationMethod,
    status: l.status
  };
}

export function mapNotificationFromDB(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    timestamp: row.timestamp,
    studentId: row.student_id,
    type: row.type as any,
    isRead: row.is_read
  };
}

export function mapNotificationToDB(n: AppNotification): any {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    timestamp: n.timestamp,
    student_id: n.studentId || null,
    type: n.type,
    is_read: n.isRead
  };
}

export function mapEmailLogFromDB(row: any): EmailLog {
  return {
    id: row.id,
    to: row.to,
    subject: row.subject,
    body: row.body,
    timestamp: row.timestamp
  };
}

export function mapEmailLogToDB(e: EmailLog): any {
  return {
    id: e.id,
    to: e.to,
    subject: e.subject,
    body: e.body,
    timestamp: e.timestamp
  };
}

/**
 * Robust loading helper from Supabase.
 * If tables are missing or connection fails, it catches errors gracefully.
 */
export async function loadFromSupabase(): Promise<{
  students?: Student[];
  pickupRequests?: PickupRequest[];
  securityLogs?: SecurityLog[];
  notifications?: AppNotification[];
  emailLogs?: EmailLog[];
  success: boolean;
  error?: string;
  tablesMissing?: boolean;
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase URL/Key missing in .env.' };
  }

  try {
    // 1. Load students
    const { data: sData, error: sErr } = await supabase.from('students').select('*');
    if (sErr) {
      if (sErr.code === '42P01') { // Relation does not exist
        return { success: false, error: 'Database tables do not exist in Supabase yet.', tablesMissing: true };
      }
      throw sErr;
    }

    // 2. Load requests
    const { data: rData, error: rErr } = await supabase.from('pickup_requests').select('*');
    if (rErr) throw rErr;

    // 3. Load logs
    const { data: lData, error: lErr } = await supabase.from('security_logs').select('*');
    if (lErr) throw lErr;

    // 4. Load notifications
    const { data: nData, error: nErr } = await supabase.from('notifications').select('*');
    if (nErr) throw nErr;

    // 5. Load email logs
    const { data: eData, error: eErr } = await supabase.from('email_logs').select('*');
    if (eErr) throw eErr;

    return {
      success: true,
      students: (sData || []).map(mapStudentFromDB),
      pickupRequests: (rData || []).map(mapPickupRequestFromDB),
      securityLogs: (lData || []).map(mapSecurityLogFromDB),
      notifications: (nData || []).map(mapNotificationFromDB),
      emailLogs: (eData || []).map(mapEmailLogFromDB)
    };
  } catch (err: any) {
    console.error('Supabase fetch failure:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Push an individual record or table to Supabase to keep them actively synchronized
 */
export async function saveToSupabase(
  table: 'students' | 'pickup_requests' | 'security_logs' | 'notifications' | 'email_logs',
  item: any
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).upsert(item);
    if (error) {
      console.warn(`Failed syncing to ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Network sync exception for ${table}:`, e);
    return false;
  }
}

/**
 * Fully wipe tables list on Supabase (Simulates reset back to factory seed data)
 */
export async function wipeAndSeedSupabase(initialStudents: Student[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Drop records
    await supabase.from('email_logs').delete().neq('id', 'WIPE_ALL');
    await supabase.from('notifications').delete().neq('id', 'WIPE_ALL');
    await supabase.from('security_logs').delete().neq('id', 'WIPE_ALL');
    await supabase.from('pickup_requests').delete().neq('id', 'WIPE_ALL');
    await supabase.from('students').delete().neq('id', 'WIPE_ALL');

    // Re-insert initial student seeds
    const mapped = initialStudents.map(mapStudentToDB);
    const { error } = await supabase.from('students').insert(mapped);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Failed resetting Supabase database seeds:', e);
    return false;
  }
}
