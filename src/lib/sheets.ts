import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, 
  onAuthStateChanged, User, signOut 
} from 'firebase/auth';
import { 
  Student, PickupRequest, SecurityLog, AppNotification, EmailLog 
} from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse firebase initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required scopes for Google Drive and Google Sheets APIs
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Compress or shorten massive base64 or SVG data to avoid Google Sheets 50,000 cell characters limit
export const cleanForSheet = (val: any): string => {
  if (!val) return '';
  const str = String(val);
  if (str.length > 2000) {
    if (str.startsWith('data:image/') || str.includes('<svg')) {
      const type = str.includes('<svg') ? 'SVG XML Icon' : 'Base64 Image';
      return `[${type} Ref - Saved in Secure App Sandbox]`;
    }
    return str.substring(0, 2000) + '... (truncated)';
  }
  return str;
};

// Initialize Auth
export const initSheetsAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but token is not in-memory, we can try to retrieve it or require sign-in
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Sign in via Firebase Popup
export const loginWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sheets Sign in failure:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out
export const logoutFromGoogleSheets = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('goenka_sheets_spreadsheet_id');
};

// Table headers definitions
export const TABLE_SCHEMAS = {
  Students: [
    'id', 'admissionNumber', 'name', 'className', 'section', 'dob', 
    'address', 'fatherName', 'motherName', 'fatherEmail', 'motherEmail', 
    'fatherMobile', 'motherMobile'
  ],
  PickupRequests: [
    'id', 'studentId', 'fullName', 'age', 'mobileNumber', 'email', 'otpCode', 
    'relationship', 'photograph', 'aadhaarNumber', 'aadhaarPhoto', 'notes', 
    'status', 'createdAt', 'approvedAt', 'verificationCode', 'codeExpiresAt', 
    'isUsed', 'adminApproval', 'approvedByRole', 'approvedByName', 'adminVerificationTime'
  ],
  SecurityLogs: [
    'id', 'pickupTime', 'studentId', 'studentName', 'className', 'section', 
    'pickupPersonName', 'relationship', 'gateNumber', 'securityStaffName', 
    'verificationMethod', 'status', 'pickupPersonPhoto'
  ],
  Notifications: [
    'id', 'title', 'body', 'timestamp', 'studentId', 'type', 'isRead'
  ],
  EmailLogs: [
    'id', 'to', 'subject', 'body', 'timestamp'
  ]
};

// Check and verify or create the spreadsheet & tables
export const createSpreadsheetWithTables = async (token: string): Promise<{ id: string; url: string }> => {
  // First, check if spreadsheet ID is cached
  const cachedId = localStorage.getItem('goenka_sheets_spreadsheet_id');
  if (cachedId) {
    try {
      // Validate spreadsheet access
      const verifyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cachedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (verifyRes.ok) {
        return {
          id: cachedId,
          url: `https://docs.google.com/spreadsheets/d/${cachedId}/edit`
        };
      }
    } catch {
      console.log("Cached Spreadsheet not verified or accessible, creating a new one.");
    }
  }

  // Define sheets payload
  const sheets = Object.keys(TABLE_SCHEMAS).map(title => ({
    properties: { title }
  }));

  // Create the database spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      properties: {
        title: '🔒 GD Goenka Smart Dispersal Security Database'
      },
      sheets
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Save ID in local state limiters
  localStorage.setItem('goenka_sheets_spreadsheet_id', spreadsheetId);

  // Initialize the schemas headers inside the sheets
  for (const [sheetName, headers] of Object.entries(TABLE_SCHEMAS)) {
    await writeSheetData(token, spreadsheetId, sheetName, [headers]);
  }

  return { id: spreadsheetId, url: spreadsheetUrl };
};

// Clear sheet values
export const clearSheetValues = async (token: string, spreadsheetId: string, sheetName: string) => {
  const range = `${sheetName}!A1:Z5000`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Rewrite or write data to a specific sheet range
export const writeSheetData = async (
  token: string, 
  spreadsheetId: string, 
  sheetName: string, 
  values: any[][]
) => {
  const range = `${sheetName}!A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, 
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ values })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Error writing sheet data for ${sheetName}:`, errorText);
  }
};

// Fetch values from a spreadsheet
export const readSheetData = async (
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<any[][] | null> => {
  try {
    const range = `${sheetName}!A1:Z5000`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.values || null;
  } catch (error) {
    console.error(`Failed to read sheet data for ${sheetName}:`, error);
    return null;
  }
};

// Row converters for Students
export const studentToRow = (student: Student) => {
  return [
    student.id,
    student.admissionNumber,
    student.name,
    student.className,
    student.section,
    student.dob,
    student.address,
    student.fatherName,
    student.motherName,
    student.fatherEmail,
    student.motherEmail,
    student.fatherMobile,
    student.motherMobile
  ];
};

export const rowToStudent = (row: any[]): Student => {
  return {
    id: String(row[0] || ''),
    admissionNumber: String(row[1] || ''),
    name: String(row[2] || ''),
    className: String(row[3] || ''),
    section: String(row[4] || ''),
    dob: String(row[5] || ''),
    address: String(row[6] || ''),
    photo: '', // Base Mock SVG fallback used locally
    fatherName: String(row[7] || ''),
    motherName: String(row[8] || ''),
    fatherEmail: String(row[9] || ''),
    motherEmail: String(row[10] || ''),
    fatherMobile: String(row[11] || ''),
    motherMobile: String(row[12] || ''),
    fatherPhoto: '',
    motherPhoto: ''
  };
};

// Row converters for PickupRequests
export const requestToRow = (req: PickupRequest) => {
  return [
    req.id,
    req.studentId,
    req.fullName,
    req.age,
    req.mobileNumber,
    req.email || '',
    req.otpCode || '',
    req.relationship,
    cleanForSheet(req.photograph),
    req.aadhaarNumber,
    cleanForSheet(req.aadhaarPhoto),
    req.notes || '',
    req.status,
    req.createdAt,
    req.approvedAt || '',
    req.verificationCode || '',
    req.codeExpiresAt || '',
    req.isUsed ? 'TRUE' : 'FALSE',
    req.adminApproval || '',
    req.approvedByRole || '',
    req.approvedByName || '',
    req.adminVerificationTime || ''
  ];
};

export const rowToRequest = (row: any[]): PickupRequest => {
  return {
    id: String(row[0] || ''),
    studentId: String(row[1] || ''),
    fullName: String(row[2] || ''),
    age: Number(row[3] || 0),
    mobileNumber: String(row[4] || ''),
    email: String(row[5] || ''),
    otpCode: String(row[6] || ''),
    relationship: String(row[7] || ''),
    photograph: String(row[8] || ''),
    aadhaarNumber: String(row[9] || ''),
    aadhaarPhoto: String(row[10] || ''),
    notes: String(row[11] || ''),
    status: (row[12] || 'pending') as any,
    createdAt: String(row[13] || ''),
    approvedAt: row[14] ? String(row[14]) : undefined,
    verificationCode: row[15] ? String(row[15]) : undefined,
    codeExpiresAt: row[16] ? String(row[16]) : undefined,
    isUsed: String(row[17]).toUpperCase() === 'TRUE',
    adminApproval: row[18] ? (row[18] as any) : undefined,
    approvedByRole: row[19] ? (row[19] as any) : undefined,
    approvedByName: row[20] ? String(row[20]) : undefined,
    adminVerificationTime: row[21] ? String(row[21]) : undefined
  };
};

// Row converters for SecurityLogs
export const logToRow = (l: SecurityLog) => {
  return [
    l.id,
    l.pickupTime,
    l.studentId,
    l.studentName,
    l.className,
    l.section,
    l.pickupPersonName,
    l.relationship,
    l.gateNumber,
    l.securityStaffName,
    l.verificationMethod,
    l.status,
    cleanForSheet(l.pickupPersonPhoto)
  ];
};

export const rowToLog = (row: any[]): SecurityLog => {
  return {
    id: String(row[0] || ''),
    pickupTime: String(row[1] || ''),
    studentId: String(row[2] || ''),
    studentName: String(row[3] || ''),
    className: String(row[4] || ''),
    section: String(row[5] || ''),
    pickupPersonName: String(row[6] || ''),
    relationship: String(row[7] || ''),
    gateNumber: String(row[8] || ''),
    securityStaffName: String(row[9] || ''),
    verificationMethod: (row[10] || 'QR Scan') as any,
    status: (row[11] || 'AUTHORIZED') as any,
    pickupPersonPhoto: String(row[12] || '')
  };
};

// Row converters for Notifications
export const notificationToRow = (n: AppNotification) => {
  return [
    n.id,
    n.title,
    n.body,
    n.timestamp,
    n.studentId || '',
    n.type,
    n.isRead ? 'TRUE' : 'FALSE'
  ];
};

export const rowToNotification = (row: any[]): AppNotification => {
  return {
    id: String(row[0] || ''),
    title: String(row[1] || ''),
    body: String(row[2] || ''),
    timestamp: String(row[3] || ''),
    studentId: row[4] ? String(row[4]) : undefined,
    type: (row[5] || 'system') as any,
    isRead: String(row[6]).toUpperCase() === 'TRUE'
  };
};

// Row converters for EmailLogs
export const emailToRow = (e: EmailLog) => {
  return [
    e.id,
    e.to,
    e.subject,
    e.body,
    e.timestamp
  ];
};

export const rowToEmail = (row: any[]): EmailLog => {
  return {
    id: String(row[0] || ''),
    to: String(row[1] || ''),
    subject: String(row[2] || ''),
    body: String(row[3] || ''),
    timestamp: String(row[4] || '')
  };
};
