import { Student, SecurityLog, PickupRequest, AppNotification, EmailLog } from './types';

// Simple high-quality inline SVG avatars for student, father, and mother photos
export const svgAvatars = {
  student1: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23E0F2FE"/><circle cx="50" cy="40" r="22" fill="%230284C7"/><path d="M15 85 C 20 62, 80 62, 85 85 Z" fill="%230369A1"/><circle cx="42" cy="38" r="3" fill="white"/><circle cx="58" cy="38" r="3" fill="white"/><path d="M44 50 Q50 56 56 50" stroke="white" stroke-width="2.5" fill="none"/></svg>`,
  father1: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23F0FDF4"/><circle cx="50" cy="38" r="20" fill="%2316A34A"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="%2315803D"/><path d="M40 38 L45 38" stroke="white" stroke-width="2"/><path d="M55 38 L60 38" stroke="white" stroke-width="2"/><path d="M45 48 Q50 52 55 48" stroke="white" stroke-width="2" fill="none"/></svg>`,
  mother1: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23FDF2F8"/><circle cx="50" cy="38" r="18" fill="%23DB2777"/><path d="M20 84 C 24 60, 76 60, 80 84 Z" fill="%23BE185D"/><circle cx="43" cy="36" r="2.5" fill="white"/><circle cx="57" cy="36" r="2.5" fill="white"/><path d="M42 46 Q50 51 58 46" stroke="white" stroke-width="2" fill="none"/><path d="M35 34 C 40 20, 60 20, 65 34 Z" fill="%23500724"/></svg>`,

  student2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23FEF9C3"/><circle cx="50" cy="42" r="20" fill="%23CA8A04"/><path d="M16 86 C 22 64, 78 64, 84 86 Z" fill="%23A16207"/><circle cx="43" cy="40" r="2.5" fill="white"/><circle cx="57" cy="40" r="2.5" fill="white"/><path d="M45 51 Q50 55 55 51" stroke="white" stroke-width="2.5" fill="none"/></svg>`,
  father2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23EFF6FF"/><circle cx="50" cy="38" r="22" fill="%232563EB"/><path d="M15 85 C 20 60, 80 60, 85 85 Z" fill="%231D4ED8"/><circle cx="42" cy="36" r="3" fill="white"/><circle cx="58" cy="36" r="3" fill="white"/><path d="M43 46 Q50 50 57 46" stroke="white" stroke-width="2" fill="none"/></svg>`,
  mother2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23FAF5FF"/><circle cx="50" cy="38" r="19" fill="%239333EA"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="%237E22CE"/><circle cx="43" cy="36" r="2.5" fill="white"/><circle cx="57" cy="36" r="2.5" fill="white"/><path d="M42 46 Q50 52 58 46" stroke="white" stroke-width="2" fill="none"/></svg>`,

  student3: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23FFF1F2"/><circle cx="50" cy="40" r="21" fill="%23E11D48"/><path d="M16 85 C 22 62, 78 62, 84 85 Z" fill="%23BE123C"/><circle cx="42" cy="38" r="3" fill="white"/><circle cx="58" cy="38" r="3" fill="white"/><path d="M44 50 Q50 54 56 50" stroke="white" stroke-width="2.5" fill="none"/></svg>`,
  father3: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23ECFDF5"/><circle cx="50" cy="38" r="20" fill="%23059669"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="%23047857"/><circle cx="42" cy="36" r="3" fill="white"/><circle cx="58" cy="36" r="3" fill="white"/><path d="M45 46 Q50 50 55 46" stroke="white" stroke-width="2" fill="none"/></svg>`,
  mother3: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23FFF7ED"/><circle cx="50" cy="40" r="18" fill="%23EA580C"/><path d="M20 84 C 24 60, 76 60, 80 84 Z" fill="%23C2410C"/><circle cx="43" cy="38" r="2.5" fill="white"/><circle cx="57" cy="38" r="2.5" fill="white"/><path d="M44 48 Q50 53 56 48" stroke="white" stroke-width="2" fill="none"/></svg>`,

  tempGuardian1: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23ECEFF1"/><circle cx="50" cy="36" r="20" fill="%23546E7A"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="%23455A64"/><circle cx="42" cy="34" r="2.5" fill="white"/><circle cx="58" cy="34" r="2.5" fill="white"/><path d="M45 46 Q50 49 55 46" stroke="white" stroke-width="2" fill="none"/></svg>`,
  aadhaarPhoto: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="160" height="100"><rect width="160" height="100" rx="6" fill="%23F3F4F6" stroke="%23D1D5DB" stroke-width="2"/><rect x="10" y="10" width="35" height="12" fill="%23059669" rx="2"/><text x="15" y="19" font-family="sans-serif" font-size="8" fill="white" font-weight="bold">AADHAAR</text><circle cx="25" cy="50" r="15" fill="%239CA3AF"/><rect x="50" y="30" width="100" height="6" fill="%239CA3AF" rx="2"/><rect x="50" y="42" width="70" height="6" fill="%239CA3AF" rx="2"/><rect x="50" y="54" width="85" height="6" fill="%239CA3AF" rx="2"/><text x="15" y="85" font-family="sans-serif" font-size="9" fill="%23111827" font-weight="bold">xxxx - xxxx - 8492</text></svg>`
};

export const initialStudents: Student[] = [
  {
    id: "STU3001",
    admissionNumber: "ADM20241029",
    name: "Aarav Sharma",
    className: "Class 4",
    section: "Section A",
    dob: "2016-04-12",
    address: "D-402, Gauri Apartments, GD Goenka Road, New Delhi",
    photo: svgAvatars.student1,
    fatherName: "Amit Sharma",
    motherName: "Kavita Sharma",
    fatherEmail: "amit.sharma@gmail.com",
    motherEmail: "kavita.sharma@gmail.com",
    fatherMobile: "+91 98112 34567",
    motherMobile: "+91 98119 87654",
    fatherPhoto: svgAvatars.father1,
    motherPhoto: svgAvatars.mother1
  },
  {
    id: "STU3002",
    admissionNumber: "ADM20230504",
    name: "Diya Patel",
    className: "Class 2",
    section: "Section B",
    dob: "2018-09-25",
    address: "12A, Orchid Residency, Sector 56, Gurgaon",
    photo: svgAvatars.student2,
    fatherName: "Rajesh Patel",
    motherName: "Shilpa Patel",
    fatherEmail: "rajesh.patel@yahoo.com",
    motherEmail: "shilpa.patel@gmail.com",
    fatherMobile: "+91 99551 12233",
    motherMobile: "+91 99554 43322",
    fatherPhoto: svgAvatars.father2,
    motherPhoto: svgAvatars.mother2
  },
  {
    id: "STU3003",
    admissionNumber: "ADM20250912",
    name: "Kabir Sen",
    className: "Class 5",
    section: "Section C",
    dob: "2015-11-01",
    address: "Plot 88, Vasant Vihar, New Delhi",
    photo: svgAvatars.student3,
    fatherName: "Joy Sen",
    motherName: "Riya Sen",
    fatherEmail: "joy.sen@outlook.com",
    motherEmail: "riya.sen@gmail.com",
    fatherMobile: "+91 98765 43210",
    motherMobile: "+91 98761 23456",
    fatherPhoto: svgAvatars.father3,
    motherPhoto: svgAvatars.mother3
  },
  {
    id: "STU3004",
    admissionNumber: "ADM20260401",
    name: "Ankit Goel",
    className: "Class 3",
    section: "Section A",
    dob: "2017-02-15",
    address: "C-12, Green Park, New Delhi",
    photo: svgAvatars.student1,
    fatherName: "Sanjay Goel",
    motherName: "Meenakshi Goel",
    fatherEmail: "sanjay.goel@gmail.com",
    motherEmail: "meenakshi.goel@gmail.com",
    fatherMobile: "+91 95551 23456",
    motherMobile: "+91 95556 54321",
    fatherPhoto: svgAvatars.father1,
    motherPhoto: svgAvatars.mother1
  }
];

export const initialSecurityLogs: SecurityLog[] = [
  {
    id: "LOG101",
    pickupTime: "2026-06-16T14:40:12.000",
    studentId: "STU3001",
    studentName: "Aarav Sharma",
    className: "Class 4",
    section: "Section A",
    pickupPersonName: "Amit Sharma",
    pickupPersonPhoto: svgAvatars.father1,
    relationship: "Father",
    gateNumber: "Gate 1",
    securityStaffName: "Officer Ram Singh",
    verificationMethod: "QR Scan",
    status: "AUTHORIZED"
  },
  {
    id: "LOG102",
    pickupTime: "2026-06-16T14:42:55.000",
    studentId: "STU3002",
    studentName: "Diya Patel",
    className: "Class 2",
    section: "Section B",
    pickupPersonName: "Shilpa Patel",
    pickupPersonPhoto: svgAvatars.mother2,
    relationship: "Mother",
    gateNumber: "Main Gate",
    securityStaffName: "Officer Vijay Kumar",
    verificationMethod: "QR Scan",
    status: "AUTHORIZED"
  },
  {
    id: "LOG103",
    pickupTime: "2026-06-15T14:55:00.000",
    studentId: "STU3003",
    studentName: "Kabir Sen",
    className: "Class 5",
    section: "Section C",
    pickupPersonName: "Ramesh Sen (Driver)",
    pickupPersonPhoto: svgAvatars.tempGuardian1,
    relationship: "Driver",
    gateNumber: "Gate 2",
    securityStaffName: "Officer Vijay Kumar",
    verificationMethod: "Temp Verification Code",
    status: "TEMPORARY_APPROVED"
  }
];

export const initialPickupRequests: PickupRequest[] = [
  {
    id: "REQ501",
    studentId: "STU3001",
    fullName: "Amitesh Sharma",
    age: 42,
    mobileNumber: "+91 98112 00011",
    relationship: "Uncle",
    photograph: svgAvatars.tempGuardian1,
    aadhaarNumber: "xxxx-xxxx-8492",
    aadhaarPhoto: svgAvatars.aadhaarPhoto,
    notes: "Coming today because father has a late meeting. Bringing blue hatchback DL 3C XX 1234.",
    status: "approved",
    createdAt: "2026-06-16T10:00:00.000",
    approvedAt: "2026-06-16T10:05:00.000",
    verificationCode: "582741",
    codeExpiresAt: "2500-12-31T23:59:59.000", // valid long-term for demo
    isUsed: false
  },
  {
    id: "REQ502",
    studentId: "STU3003",
    fullName: "Harish Gupta",
    age: 35,
    mobileNumber: "+91 99112 23344",
    relationship: "Family Friend",
    photograph: svgAvatars.tempGuardian1,
    aadhaarNumber: "xxxx-xxxx-9999",
    aadhaarPhoto: svgAvatars.aadhaarPhoto,
    notes: "Taking Kabir for birthday party setup",
    status: "pending",
    createdAt: "2026-06-17T08:00:00.000"
  },
  {
    id: "REQ503",
    studentId: "STU3002",
    fullName: "Rohan Khanna",
    age: 38,
    mobileNumber: "+91 97115 67890",
    relationship: "Family Driver",
    photograph: svgAvatars.tempGuardian1,
    aadhaarNumber: "xxxx-xxxx-4432",
    aadhaarPhoto: svgAvatars.aadhaarPhoto,
    notes: "Assigned by parent to drive Tanya Goel home today.",
    status: "approved",
    adminApproval: "pending",
    createdAt: "2026-06-18T06:00:00.000",
    approvedAt: "2026-06-18T06:05:00.000",
    verificationCode: "741258",
    codeExpiresAt: "2500-12-31T23:59:59.000",
    isUsed: false
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: "NOTIF001",
    title: "New Pickup Requested",
    body: "Amitesh Sharma (Uncle) has been authorized to pick up Aarav Sharma today.",
    timestamp: "2026-06-16T10:05:00.000",
    studentId: "STU3001",
    type: "pickup_request",
    isRead: true
  },
  {
    id: "NOTIF002",
    title: "Pickup Confirmation",
    body: "Your child Aarav Sharma was picked up at 2:40 PM by Amit Sharma at Gate 1.",
    timestamp: "2026-06-16T14:40:12.000",
    studentId: "STU3001",
    type: "pickup_confirm",
    isRead: false
  }
];

export const initialEmailLogs: EmailLog[] = [
  {
    id: "EML001",
    to: "amit.sharma@gmail.com",
    subject: "Emergency Pickup Code Approved - GOENKA SMART DISPERSAL",
    body: "Dear Amit Sharma, your request to authorize Amitesh Sharma (Uncle) to pick up Aarav Sharma has been approved. The single-use Verification Code is: 582741 (Valid for 30 minutes). Support Helpdesk: +91-11-224455.",
    timestamp: "2026-06-16T10:05:00.000"
  },
  {
    id: "EML002",
    to: "amit.sharma@gmail.com",
    subject: "Student Pickup Confirmed - GD Goenka Dispersal",
    body: "Dear kavita.sharma@gmail.com and amit.sharma@gmail.com, your child Aarav Sharma (Class 4, Section A) was safely picked up by Father (Amit Sharma) on 2026-06-16 at 2:40 PM from Gate 1. Handover successfully verified. Thank you for your cooperation.",
    timestamp: "2026-06-16T14:40:20.000"
  }
];

export const gatesList = ["Gate 1", "Gate 2", "Main Gate", "Junior Wing Gate"];
export const officersList = ["Officer Ram Singh", "Officer Vijay Kumar", "Inspector Sanjay Pal"];

export const sampleExcelCSVData = `Student ID,Admission Number,Student Name,Class,Section,Date of Birth,Address,Father Name,Mother Name,Father Email,Mother Email,Father Mobile,Mother Mobile
STU3004,ADM20251122,Ishita Mehra,Class 3,Section B,2017-08-14,Row House 5, Green Glen, New Delhi,Vikram Mehra,Nisha Mehra,vikram.mehra@gmail.com,nisha.mehra@gmail.com,+91 98888 77777,+91 98888 66666
STU3005,ADM20260408,Rohan Verma,Class 1,Section C,2019-12-05,Apartment 3C, DLF Phase 5, Gurgaon,Alok Verma,Smita Verma,alok.verma@yahoo.com,smita.verma@gmail.com,+91 95551 11222,+91 95551 22333
STU3006,ADM20240930,Ananya Iyer,Class 4,Section A,2016-10-22,B-140, Safdurjung Enclave, New Delhi,Karthik Iyer,Gauri Iyer,karthik.iyer@gmail.com,gauri.iyer@gmail.com,+91 91112 33445,+91 91112 55667`;
