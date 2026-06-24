import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, getDocs, getDoc, collection, 
  writeBatch, deleteDoc, getDocFromServer, initializeFirestore 
} from 'firebase/firestore';
import { Student, PickupRequest, SecurityLog, AppNotification, EmailLog } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const getMergedFirebaseConfig = () => {
  const env = (import.meta as any).env || {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
    appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || ""
  };
};

const app = getApps().length === 0 ? initializeApp(getMergedFirebaseConfig()) : getApp();

// Use initializeFirestore with forced long polling for maximum cross-device and network compatibility
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Critical constraint: Validation test connection to Firestore on initialization
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    // We query a path that is allowed in firestore.rules to avoid permission-denied issues
    await getDocFromServer(doc(db, 'students', 'conn_test_ping'));
    return true;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('the client is offline') || errMsg.includes('Failed to get document')) {
      console.error("Please check your Firebase configuration. Client is currently offline or failed to reach server.", errMsg);
      return false;
    }
    // Any other error from the server (like permission-denied, not-found, etc.) indicates we are ONLINE and connected!
    console.log("Firebase handshake reached server:", errMsg);
    return true;
  }
}

// -------------------------------------------------------------
// STUDENTS FIRESTORE SYNC
// -------------------------------------------------------------
export async function fetchStudentsFromFirebase(): Promise<Student[]> {
  const colRef = collection(db, 'students');
  const snap = await getDocs(colRef);
  const result: Student[] = [];
  snap.forEach((docSnap) => {
    result.push(docSnap.data() as Student);
  });
  return result;
}

export async function saveStudentToFirebase(student: Student): Promise<void> {
  if (!student.id) return;
  const docRef = doc(db, 'students', student.id);
  await setDoc(docRef, student);
}

// -------------------------------------------------------------
// PICKUP REQUESTS FIRESTORE SYNC
// -------------------------------------------------------------
export async function fetchPickupRequestsFromFirebase(): Promise<PickupRequest[]> {
  const colRef = collection(db, 'pickupRequests');
  const snap = await getDocs(colRef);
  const result: PickupRequest[] = [];
  snap.forEach((docSnap) => {
    result.push(docSnap.data() as PickupRequest);
  });
  return result;
}

export async function savePickupRequestToFirebase(request: PickupRequest): Promise<void> {
  if (!request.id) return;
  const docRef = doc(db, 'pickupRequests', request.id);
  await setDoc(docRef, request);
}

// -------------------------------------------------------------
// SECURITY LOGS FIRESTORE SYNC
// -------------------------------------------------------------
export async function fetchSecurityLogsFromFirebase(): Promise<SecurityLog[]> {
  const colRef = collection(db, 'securityLogs');
  const snap = await getDocs(colRef);
  const result: SecurityLog[] = [];
  snap.forEach((docSnap) => {
    result.push(docSnap.data() as SecurityLog);
  });
  return result;
}

export async function saveSecurityLogToFirebase(log: SecurityLog): Promise<void> {
  if (!log.id) return;
  const docRef = doc(db, 'securityLogs', log.id);
  await setDoc(docRef, log);
}

// -------------------------------------------------------------
// NOTIFICATIONS FIRESTORE SYNC
// -------------------------------------------------------------
export async function fetchNotificationsFromFirebase(): Promise<AppNotification[]> {
  const colRef = collection(db, 'notifications');
  const snap = await getDocs(colRef);
  const result: AppNotification[] = [];
  snap.forEach((docSnap) => {
    result.push(docSnap.data() as AppNotification);
  });
  return result;
}

export async function saveNotificationToFirebase(notif: AppNotification): Promise<void> {
  if (!notif.id) return;
  const docRef = doc(db, 'notifications', notif.id);
  await setDoc(docRef, notif);
}

// -------------------------------------------------------------
// EMAIL LOGS FIRESTORE SYNC
// -------------------------------------------------------------
export async function fetchEmailLogsFromFirebase(): Promise<EmailLog[]> {
  const colRef = collection(db, 'emailLogs');
  const snap = await getDocs(colRef);
  const result: EmailLog[] = [];
  snap.forEach((docSnap) => {
    result.push(docSnap.data() as EmailLog);
  });
  return result;
}

export async function saveEmailLogToFirebase(email: EmailLog): Promise<void> {
  if (!email.id) return;
  const docRef = doc(db, 'emailLogs', email.id);
  await setDoc(docRef, email);
}

// -------------------------------------------------------------
// BULK DATA MIGRATION ENGINE
// -------------------------------------------------------------
export async function migrateAllToFirebase(
  students: Student[],
  requests: PickupRequest[],
  logs: SecurityLog[],
  notifications: AppNotification[],
  emails: EmailLog[]
): Promise<{ success: boolean; counts: { students: number; requests: number; logs: number; notifications: number; emails: number } }> {
  const counts = { students: 0, requests: 0, logs: 0, notifications: 0, emails: 0 };
  
  // Migrate Students in batches
  if (students.length > 0) {
    let batch = writeBatch(db);
    let count = 0;
    for (const student of students) {
      if (!student.id) continue;
      const ref = doc(db, 'students', student.id);
      batch.set(ref, student);
      count++;
      counts.students++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // Migrate requests
  if (requests.length > 0) {
    let batch = writeBatch(db);
    let count = 0;
    for (const req of requests) {
      if (!req.id) continue;
      const ref = doc(db, 'pickupRequests', req.id);
      batch.set(ref, req);
      count++;
      counts.requests++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // Migrate Security Logs
  if (logs.length > 0) {
    let batch = writeBatch(db);
    let count = 0;
    for (const log of logs) {
      if (!log.id) continue;
      const ref = doc(db, 'securityLogs', log.id);
      batch.set(ref, log);
      count++;
      counts.logs++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // Migrate Notifications
  if (notifications.length > 0) {
    let batch = writeBatch(db);
    let count = 0;
    for (const notif of notifications) {
      if (!notif.id) continue;
      const ref = doc(db, 'notifications', notif.id);
      batch.set(ref, notif);
      count++;
      counts.notifications++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // Migrate Email Logs
  if (emails.length > 0) {
    let batch = writeBatch(db);
    let count = 0;
    for (const email of emails) {
      if (!email.id) continue;
      const ref = doc(db, 'emailLogs', email.id);
      batch.set(ref, email);
      count++;
      counts.emails++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  return { success: true, counts };
}
