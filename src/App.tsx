import React, { useState, useEffect, useRef } from 'react';
import { Student, PickupRequest, SecurityLog, AppNotification, EmailLog } from './types';
import { 
  initialStudents, initialSecurityLogs, initialPickupRequests, 
  initialNotifications, initialEmailLogs 
} from './mockData';
import AdminPanel from './components/AdminPanel';
import ParentApp from './components/ParentApp';
import SecurityDashboard from './components/SecurityDashboard';
import CommunicationHub from './components/CommunicationHub';
import { 
  initSheetsAuth, loginWithGoogleSheets, logoutFromGoogleSheets, 
  createSpreadsheetWithTables, writeSheetData, readSheetData, 
  TABLE_SCHEMAS, studentToRow, rowToStudent, requestToRow, 
  rowToRequest, logToRow, rowToLog, notificationToRow, 
  rowToNotification, emailToRow, rowToEmail
} from './lib/sheets';
import {
  testFirebaseConnection,
  fetchStudentsFromFirebase,
  fetchPickupRequestsFromFirebase,
  fetchSecurityLogsFromFirebase,
  fetchNotificationsFromFirebase,
  fetchEmailLogsFromFirebase,
  saveStudentToFirebase,
  savePickupRequestToFirebase,
  saveSecurityLogToFirebase,
  saveNotificationToFirebase,
  saveEmailLogToFirebase,
  migrateAllToFirebase,
  clearAllFirebaseData,
  clearSelectedFirebaseCollections,
  deleteRecordFromFirebase,
  deleteMultipleRecordsFromFirebase
} from './lib/firebaseSync';
import { 
  ShieldCheck, Smartphone, User, Users, CheckCircle, Clock, Calendar, 
  Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Database, Link2,
  LogOut, GraduationCap, Lock, Building, MapPin, Key, Radio, LayoutDashboard, Shield, Flame
} from 'lucide-react';
import { CustomDialog, DialogType } from './components/CustomDialog';

export default function App() {
  // Primary active system role: 'admin' | 'parent' | 'security'
  const [activeRole, setActiveRole] = useState<'admin' | 'parent' | 'security'>('admin');

  // Custom Dialog System State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    requireValidationText?: string;
    validationPlaceholder?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const showDialog = (config: {
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    requireValidationText?: string;
    validationPlaceholder?: string;
    onConfirm: () => void;
  }) => {
    setDialogState({
      isOpen: true,
      ...config
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  // Custom states matching user requirements
  const [activeTab, setActiveTab] = useState<'staff' | 'parent' | 'gate' | 'home'>('home');
  const [loggedInRole, setLoggedInRole] = useState<'principal' | 'teacher' | 'parent' | 'gate' | null>(null);

  // New auth states
  const [loggedInParentStudentId, setLoggedInParentStudentId] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [staffLoginType, setStaffLoginType] = useState<'principal' | 'teacher'>('principal');

  // Core reactive data states
  const [students, setStudents] = useState<Student[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Google Sheets integration state
  const [sheetsUser, setSheetsUser] = useState<any>(() => {
    const saved = localStorage.getItem('goenka_sheets_user_email');
    return saved ? { email: saved } : null;
  });
  const [sheetsToken, setSheetsToken] = useState<string | null>(() => {
    return localStorage.getItem('goenka_sheets_token') || null;
  });
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('goenka_sheets_spreadsheet_id') || null;
  });
  const [sheetsSpreadsheetUrl, setSheetsSpreadsheetUrl] = useState<string | null>(() => {
    const id = localStorage.getItem('goenka_sheets_spreadsheet_id');
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
  });
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<'disabled' | 'connected' | 'syncing' | 'synced' | 'error'>(() => {
    const savedStatus = localStorage.getItem('goenka_sheets_sync_status');
    return (savedStatus as any) || 'disabled';
  });
  const [sheetsErrorMsg, setSheetsErrorMsg] = useState<string>('');

  const [databaseMode, setDatabaseMode] = useState<'local' | 'sheets' | 'firebase'>('firebase');

  useEffect(() => {
    localStorage.setItem('goenka_database_mode', databaseMode);
  }, [databaseMode]);

  // Firebase Firestore Direct Sync States
  const [firebaseConnecting, setFirebaseConnecting] = useState(false);
  const [firebaseMigrating, setFirebaseMigrating] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // References for Incremental Sync Checks
  const lastStudentsRef = useRef<Student[]>([]);
  const lastRequestsRef = useRef<PickupRequest[]>([]);
  const lastLogsRef = useRef<SecurityLog[]>([]);
  const lastNotifsRef = useRef<AppNotification[]>([]);
  const lastEmailsRef = useRef<EmailLog[]>([]);

  // Function to load entire base dataset from Firestore
  const loadFirebaseDatabase = async () => {
    setFirebaseConnecting(true);
    setFirebaseError(null);
    try {
      const conn = await testFirebaseConnection();
      if (!conn) {
        setFirebaseStatus('error');
        setFirebaseError('Database offline or firewall restriction.');
        setFirebaseConnecting(false);
        return;
      }
      setFirebaseStatus('connected');
      
      const loadedStudents = await fetchStudentsFromFirebase();
      const loadedRequests = await fetchPickupRequestsFromFirebase();
      const loadedLogs = await fetchSecurityLogsFromFirebase();
      const loadedNotifs = await fetchNotificationsFromFirebase();
      const loadedEmails = await fetchEmailLogsFromFirebase();
      
      if (loadedStudents.length > 0) {
        setStudents(loadedStudents);
        setPickupRequests(loadedRequests);
        setSecurityLogs(loadedLogs);
        setNotifications(loadedNotifs);
        setEmailLogs(loadedEmails);
        
        // Cache in lastRefs immediately to avoid loop on initial read
        lastStudentsRef.current = loadedStudents;
        lastRequestsRef.current = loadedRequests;
        lastLogsRef.current = loadedLogs;
        lastNotifsRef.current = loadedNotifs;
        lastEmailsRef.current = loadedEmails;
      } else {
        console.log("Firestore collections are dry. Prompting for bulk migration.");
      }
    } catch (err: any) {
      setFirebaseStatus('error');
      setFirebaseError(err.message || 'Firestore connection handshake failed.');
    } finally {
      setFirebaseConnecting(false);
    }
  };

  // Trigger loading when entering Firebase mode
  useEffect(() => {
    if (databaseMode === 'firebase') {
      loadFirebaseDatabase();
    }
  }, [databaseMode]);

  // Bulk migration handler
  const handleMigrateToFirebase = async () => {
    setFirebaseMigrating(true);
    try {
      const res = await migrateAllToFirebase(students, pickupRequests, securityLogs, notifications, emailLogs);
      if (res.success) {
        showDialog({
          title: "Cloud Migration Successful 🚀",
          message: `Your school directory has been successfully transferred to Google Cloud Firestore:\n\n• Students: ${res.counts.students} records\n• Pickup Requests: ${res.counts.requests} records\n• Gate Entry Logs: ${res.counts.logs} records\n• Notifications: ${res.counts.notifications} records\n• Email Dispatches: ${res.counts.emails} records`,
          type: 'success',
          onConfirm: closeDialog
        });
        setFirebaseStatus('connected');
        await loadFirebaseDatabase();
      }
    } catch (err: any) {
      showDialog({
        title: "Migration Failed",
        message: `Could not transfer database records: ${err.message || err}`,
        type: 'error',
        onConfirm: closeDialog
      });
    } finally {
      setFirebaseMigrating(false);
    }
  };

  // Delete uploaded data from Firestore database and local states (can be selective)
  const handleWipeDatabase = async (collectionsToWipe?: string[]) => {
    const defaultCols = ['students', 'pickupRequests', 'securityLogs', 'notifications', 'emailLogs'];
    const targets = collectionsToWipe && collectionsToWipe.length > 0 ? collectionsToWipe : defaultCols;
    
    const label = targets.length === defaultCols.length ? "all records" : targets.map(c => {
      if (c === 'students') return 'Student Directory';
      if (c === 'pickupRequests') return 'Pickup Passes';
      if (c === 'securityLogs') return 'Gate Entry Logs';
      if (c === 'notifications') return 'App Notifications';
      if (c === 'emailLogs') return 'Email Dispatches';
      return c;
    }).join(", ");

    showDialog({
      title: "Confirm Live Database Purge",
      message: `⚠️ CONFIRM CLEAR: This will permanently delete the selected ${label} from both the Live Google Cloud Firestore database and your local browser storage.\n\nThis operation is IRREVERSIBLE.`,
      type: 'danger',
      confirmText: 'Yes, Purge Live Data',
      cancelText: 'Cancel Purge',
      onConfirm: async () => {
        closeDialog();
        setFirebaseConnecting(true);
        try {
          if (databaseMode === 'firebase' && firebaseStatus === 'connected') {
            await clearSelectedFirebaseCollections(targets);
          }
          
          // Reset local state variables selectively
          if (targets.includes('students')) {
            setStudents([]);
            lastStudentsRef.current = [];
            localStorage.removeItem('goenka_students');
          }
          if (targets.includes('pickupRequests')) {
            setPickupRequests([]);
            lastRequestsRef.current = [];
            localStorage.removeItem('goenka_requests');
          }
          if (targets.includes('securityLogs')) {
            setSecurityLogs([]);
            lastLogsRef.current = [];
            localStorage.removeItem('goenka_logs');
          }
          if (targets.includes('notifications')) {
            setNotifications([]);
            lastNotifsRef.current = [];
            localStorage.removeItem('goenka_notifs');
          }
          if (targets.includes('emailLogs')) {
            setEmailLogs([]);
            lastEmailsRef.current = [];
            localStorage.removeItem('goenka_emails');
          }
          
          showDialog({
            title: "Live Database Purge Complete",
            message: `✅ Selected [${label}] has been completely reset to an empty state in both your Cloud Database and local sandbox.`,
            type: 'success',
            onConfirm: closeDialog
          });
        } catch (err: any) {
          showDialog({
            title: "Database Purge Failed",
            message: `Error during selective purge: ${err.message || err}`,
            type: 'error',
            onConfirm: closeDialog
          });
        } finally {
          setFirebaseConnecting(false);
        }
      }
    });
  };

  // Delete specific student records and sync immediately
  const handleDeleteStudents = async (ids: string[]) => {
    setFirebaseConnecting(true);
    try {
      if (databaseMode === 'firebase' && firebaseStatus === 'connected') {
        await deleteMultipleRecordsFromFirebase('students', ids);
      }
      setStudents(prev => prev.filter(s => !ids.includes(s.id)));
      
      // Also remove local storage fallback
      const stored = localStorage.getItem('goenka_students');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Student[];
          const filtered = parsed.filter(s => !ids.includes(s.id));
          localStorage.setItem('goenka_students', JSON.stringify(filtered));
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err: any) {
      showDialog({
        title: "Deletion Sync Failed",
        message: `Could not delete records from Firestore cloud database: ${err.message || err}`,
        type: 'error',
        onConfirm: closeDialog
      });
    } finally {
      setFirebaseConnecting(false);
    }
  };

  // Direct writing side-effects for Firestore Sync when data changes
  useEffect(() => {
    if (databaseMode !== 'firebase' || firebaseStatus !== 'connected' || firebaseConnecting) return;
    const prev = lastStudentsRef.current;
    const changed = students.filter(s => {
      const p = prev.find(item => item.id === s.id);
      return !p || JSON.stringify(p) !== JSON.stringify(s);
    });
    if (changed.length > 0) {
      changed.forEach(async (student) => {
        try { await saveStudentToFirebase(student); } catch (e) { console.error(e); }
      });
    }
    lastStudentsRef.current = students;
  }, [students, databaseMode, firebaseStatus, firebaseConnecting]);

  useEffect(() => {
    if (databaseMode !== 'firebase' || firebaseStatus !== 'connected' || firebaseConnecting) return;
    const prev = lastRequestsRef.current;
    const changed = pickupRequests.filter(r => {
      const p = prev.find(item => item.id === r.id);
      return !p || JSON.stringify(p) !== JSON.stringify(r);
    });
    if (changed.length > 0) {
      changed.forEach(async (req) => {
        try { await savePickupRequestToFirebase(req); } catch (e) { console.error(e); }
      });
    }
    lastRequestsRef.current = pickupRequests;
  }, [pickupRequests, databaseMode, firebaseStatus, firebaseConnecting]);

  useEffect(() => {
    if (databaseMode !== 'firebase' || firebaseStatus !== 'connected' || firebaseConnecting) return;
    const prev = lastLogsRef.current;
    const changed = securityLogs.filter(l => {
      const p = prev.find(item => item.id === l.id);
      return !p || JSON.stringify(p) !== JSON.stringify(l);
    });
    if (changed.length > 0) {
      changed.forEach(async (log) => {
        try { await saveSecurityLogToFirebase(log); } catch (e) { console.error(e); }
      });
    }
    lastLogsRef.current = securityLogs;
  }, [securityLogs, databaseMode, firebaseStatus, firebaseConnecting]);

  useEffect(() => {
    if (databaseMode !== 'firebase' || firebaseStatus !== 'connected' || firebaseConnecting) return;
    const prev = lastNotifsRef.current;
    const changed = notifications.filter(n => {
      const p = prev.find(item => item.id === n.id);
      return !p || JSON.stringify(p) !== JSON.stringify(n);
    });
    if (changed.length > 0) {
      changed.forEach(async (notif) => {
        try { await saveNotificationToFirebase(notif); } catch (e) { console.error(e); }
      });
    }
    lastNotifsRef.current = notifications;
  }, [notifications, databaseMode, firebaseStatus, firebaseConnecting]);

  useEffect(() => {
    if (databaseMode !== 'firebase' || firebaseStatus !== 'connected' || firebaseConnecting) return;
    const prev = lastEmailsRef.current;
    const changed = emailLogs.filter(el => {
      const p = prev.find(item => item.id === el.id);
      return !p || JSON.stringify(p) !== JSON.stringify(el);
    });
    if (changed.length > 0) {
      changed.forEach(async (email) => {
        try { await saveEmailLogToFirebase(email); } catch (e) { console.error(e); }
      });
    }
    lastEmailsRef.current = emailLogs;
  }, [emailLogs, databaseMode, firebaseStatus, firebaseConnecting]);

  // Dynamic status bar time state
  const [androidTime, setAndroidTime] = useState('09:41 AM');


  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' translates to '12'
      setAndroidTime(`${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Automated background polling loop for real-time immediate updates
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      
      if (databaseMode === 'firebase' && firebaseStatus === 'connected' && !firebaseConnecting && !firebaseMigrating) {
        try {
          const loadedRequests = await fetchPickupRequestsFromFirebase();
          const loadedNotifs = await fetchNotificationsFromFirebase();
          const loadedLogs = await fetchSecurityLogsFromFirebase();
          const loadedEmails = await fetchEmailLogsFromFirebase();
          const loadedStudents = await fetchStudentsFromFirebase();
          
          if (active) {
            if (JSON.stringify(loadedRequests) !== JSON.stringify(lastRequestsRef.current)) {
              setPickupRequests(loadedRequests);
              lastRequestsRef.current = loadedRequests;
            }
            if (JSON.stringify(loadedNotifs) !== JSON.stringify(lastNotifsRef.current)) {
              setNotifications(loadedNotifs);
              lastNotifsRef.current = loadedNotifs;
            }
            if (JSON.stringify(loadedLogs) !== JSON.stringify(lastLogsRef.current)) {
              setSecurityLogs(loadedLogs);
              lastLogsRef.current = loadedLogs;
            }
            if (JSON.stringify(loadedEmails) !== JSON.stringify(lastEmailsRef.current)) {
              setEmailLogs(loadedEmails);
              lastEmailsRef.current = loadedEmails;
            }
            if (loadedStudents.length > 0 && JSON.stringify(loadedStudents) !== JSON.stringify(lastStudentsRef.current)) {
              setStudents(loadedStudents);
              lastStudentsRef.current = loadedStudents;
            }
          }
        } catch (e) {
          console.error("Auto polling sync failed: ", e);
        }
      } else {
        // LocalStorage fallback sync (handles tabs running in same browser)
        try {
          const storedRequests = localStorage.getItem('goenka_requests');
          if (storedRequests) {
            const parsed = JSON.parse(storedRequests) as PickupRequest[];
            if (JSON.stringify(parsed) !== JSON.stringify(pickupRequests)) {
              setPickupRequests(parsed);
            }
          }
          const storedNotifs = localStorage.getItem('goenka_notifs');
          if (storedNotifs) {
            const parsed = JSON.parse(storedNotifs) as AppNotification[];
            if (JSON.stringify(parsed) !== JSON.stringify(notifications)) {
              setNotifications(parsed);
            }
          }
          const storedLogs = localStorage.getItem('goenka_logs');
          if (storedLogs) {
            const parsed = JSON.parse(storedLogs) as SecurityLog[];
            if (JSON.stringify(parsed) !== JSON.stringify(securityLogs)) {
              setSecurityLogs(parsed);
            }
          }
          const storedEmails = localStorage.getItem('goenka_emails');
          if (storedEmails) {
            const parsed = JSON.parse(storedEmails) as EmailLog[];
            if (JSON.stringify(parsed) !== JSON.stringify(emailLogs)) {
              setEmailLogs(parsed);
            }
          }
        } catch (e) {
          console.error("Local storage sync error", e);
        }
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [databaseMode, firebaseStatus, firebaseConnecting, firebaseMigrating, pickupRequests, notifications, securityLogs, emailLogs]);

  const handleAndroidHome = () => {
    setActiveTab('home');
  };

  const handleAndroidBack = () => {
    // Dispatch event to parent app if in a sub-screen
    const event = new CustomEvent('android-back-pressed');
    window.dispatchEvent(event);
    
    setTimeout(() => {
      if (activeTab !== 'home') {
        const isSubScreen = localStorage.getItem('parent_is_sub_screen') === 'true';
        if (isSubScreen && activeTab === 'parent') {
          // Handled internally in ParentApp
        } else {
          setActiveTab('home');
        }
      }
    }, 50);
  };

  const handleAndroidRecents = () => {
    showDialog({
      title: "📱 Multitasking Active",
      message: "Simulated Android Recents Panel: Your logged-in portals and data synchronization services are actively cached and running securely in the background.",
      type: 'info',
      onConfirm: closeDialog
    });
  };

  // Simulation Wizard Scenario State
  const [activeTipScenario, setActiveTipScenario] = useState<number | null>(1);

  // Load from LocalStorage/MockData on mount
  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem('goenka_students');
      const savedRequests = localStorage.getItem('goenka_requests');
      const savedLogs = localStorage.getItem('goenka_logs');
      const savedNotifs = localStorage.getItem('goenka_notifs');
      const savedEmails = localStorage.getItem('goenka_emails');

      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed)) {
          const containsAnkit = parsed.some((s: any) => s && (s.name === "Ankit Goel" || s.name === "Ankit"));
          if (!containsAnkit) {
            const ankitObj = initialStudents.find(s => s.name === "Ankit Goel" || s.id === "STU3004");
            if (ankitObj) parsed.push(ankitObj);
          }
          setStudents(parsed);
        } else {
          setStudents(initialStudents);
        }
      } else {
        setStudents(initialStudents);
      }

      if (savedRequests) {
        const reqs = JSON.parse(savedRequests);
        if (Array.isArray(reqs)) {
          const seenReqs = new Set<string>();
          const uniqueReqs = reqs.map((req: any, index: number) => {
            if (!req.id || seenReqs.has(req.id)) {
              req.id = `REQ_${Date.now()}_${index}_${Math.floor(Math.random() * 1000000)}`;
            }
            seenReqs.add(req.id);
            return req;
          });
          setPickupRequests(uniqueReqs);
        } else {
          setPickupRequests(initialPickupRequests);
        }
      } else {
        setPickupRequests(initialPickupRequests);
      }

      if (savedLogs) {
        const logs = JSON.parse(savedLogs);
        if (Array.isArray(logs)) {
          const seenLogs = new Set<string>();
          const uniqueLogs = logs.map((log: any, index: number) => {
            if (!log.id || seenLogs.has(log.id)) {
              log.id = `LOG_${Date.now()}_${index}_${Math.floor(Math.random() * 1000000)}`;
            }
            seenLogs.add(log.id);
            return log;
          });
          setSecurityLogs(uniqueLogs);
        } else {
          setSecurityLogs(initialSecurityLogs);
        }
      } else {
        setSecurityLogs(initialSecurityLogs);
      }

      if (savedNotifs) {
        const notifs = JSON.parse(savedNotifs);
        if (Array.isArray(notifs)) {
          const seenNotifs = new Set<string>();
          const uniqueNotifs = notifs.map((notif: any, index: number) => {
            if (!notif.id || seenNotifs.has(notif.id)) {
              notif.id = `NOTIF_${Date.now()}_${index}_${Math.floor(Math.random() * 1000000)}`;
            }
            seenNotifs.add(notif.id);
            return notif;
          });
          setNotifications(uniqueNotifs);
        } else {
          setNotifications(initialNotifications);
        }
      } else {
        setNotifications(initialNotifications);
      }

      if (savedEmails) {
        const emails = JSON.parse(savedEmails);
        if (Array.isArray(emails)) {
          const seenEmails = new Set<string>();
          const uniqueEmails = emails.map((email: any, index: number) => {
            if (!email.id || seenEmails.has(email.id)) {
              email.id = `EML_${Date.now()}_${index}_${Math.floor(Math.random() * 1000000)}`;
            }
            seenEmails.add(email.id);
            return email;
          });
          setEmailLogs(uniqueEmails);
        } else {
          setEmailLogs(initialEmailLogs);
        }
      } else {
        setEmailLogs(initialEmailLogs);
      }
    } catch (e) {
      console.error("Local storage recovery failed, falling back to mock initializations.", e);
      setStudents(initialStudents);
      setPickupRequests(initialPickupRequests);
      setSecurityLogs(initialSecurityLogs);
      setNotifications(initialNotifications);
      setEmailLogs(initialEmailLogs);
    }
  }, []);

  // Google Sheets Authentication Listener on Mount
  useEffect(() => {
    if (databaseMode !== 'sheets') return;

    const unsubscribe = initSheetsAuth(
      async (user, token) => {
        setSheetsUser(user);
        setSheetsToken(token);
        const cachedId = localStorage.getItem('goenka_sheets_spreadsheet_id');
        if (cachedId) {
          setSheetsSpreadsheetId(cachedId);
          setSheetsSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${cachedId}/edit`);
          setSheetsSyncStatus('connected');
          // Automatically sync data
          bootstrapSheetsWithAppState(token, cachedId);
        } else {
          // If no cached sheet ID exists yet (first-time login via redirect),
          // set up the spreadsheet and tables automatically on return!
          try {
            setSheetsSyncStatus('syncing');
            const sheetDetails = await createSpreadsheetWithTables(token);
            setSheetsSpreadsheetId(sheetDetails.id);
            setSheetsSpreadsheetUrl(sheetDetails.url);
            
            localStorage.setItem('goenka_sheets_sync_status', 'connected');
            localStorage.setItem('goenka_sheets_user_email', user.email || '');
            localStorage.setItem('goenka_sheets_token', token);
            localStorage.setItem('goenka_sheets_spreadsheet_id', sheetDetails.id);
            
            setSheetsSyncStatus('connected');
            // Bootstrap/Seed the database
            await bootstrapSheetsWithAppState(token, sheetDetails.id);
          } catch (err: any) {
            console.error("Auto-setup Sheets after redirect login failure:", err);
            setSheetsSyncStatus('error');
            setSheetsErrorMsg(err.message || 'Auto-setup Sheets Failed');
          }
        }
      },
      () => {
        const cachedId = localStorage.getItem('goenka_sheets_spreadsheet_id');
        const cachedToken = localStorage.getItem('goenka_sheets_token');
        if (cachedToken && cachedId) {
          setSheetsToken(cachedToken);
          setSheetsSpreadsheetId(cachedId);
          setSheetsSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${cachedId}/edit`);
          setSheetsSyncStatus('connected');
          bootstrapSheetsWithAppState(cachedToken, cachedId);
          return;
        }
        setSheetsUser(null);
        setSheetsToken(null);
        setSheetsSpreadsheetId(null);
        setSheetsSpreadsheetUrl(null);
        setSheetsSyncStatus('disabled');
      }
    );
    return () => unsubscribe();
  }, [databaseMode]);

  // Automatic setup of Google Sheets Database & Bootstrap Tables
  const handleConnectGoogleSheets = async () => {
    try {
      setSheetsSyncStatus('syncing');
      
      const authResult = await loginWithGoogleSheets();
      if (authResult) {
        const { user, accessToken } = authResult;
        setSheetsUser(user);
        setSheetsToken(accessToken);
        
        // Setup spreadsheet & tables automatically!
        const sheetDetails = await createSpreadsheetWithTables(accessToken);
        setSheetsSpreadsheetId(sheetDetails.id);
        setSheetsSpreadsheetUrl(sheetDetails.url);
        
        localStorage.setItem('goenka_sheets_sync_status', 'connected');
        localStorage.setItem('goenka_sheets_user_email', user.email || '');
        localStorage.setItem('goenka_sheets_token', accessToken);
        
        setSheetsSyncStatus('connected');
        
        // Bootstrap/Sow the database! Checks if sheets contain active data, loads them or writes down local state.
        await bootstrapSheetsWithAppState(accessToken, sheetDetails.id);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsSyncStatus('error');
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('unauthorized-domain') || errMsg.toLowerCase().includes('unauthorized_domain') || errMsg.toLowerCase().includes('domain')) {
        setSheetsErrorMsg('Firebase: Error (auth/unauthorized-domain). Secure cloud database sync is restricted in third-party environments like ' + window.location.hostname + ' unless you link your own Firebase project credentials.');
      } else {
        setSheetsErrorMsg(errMsg || 'Verification / Login Failed');
      }
    }
  };

  const handleDisconnectGoogleSheets = async () => {
    showDialog({
      title: "Disconnect Sheets Integration?",
      message: "Are you sure you want to disconnect Google Sheets integration? Your local client state and school logs will remain completely safe in browser storage, but automatic cloud spreadsheet writes will stop.",
      type: 'confirm',
      confirmText: 'Disconnect Sheets',
      cancelText: 'Keep Connected',
      onConfirm: async () => {
        closeDialog();
        try {
          await logoutFromGoogleSheets();
          
          // Clear caches and reset states
          localStorage.removeItem('goenka_sheets_sync_status');
          localStorage.removeItem('goenka_sheets_user_email');
          localStorage.removeItem('goenka_sheets_token');
          localStorage.removeItem('goenka_sheets_spreadsheet_id');
          
          setSheetsUser(null);
          setSheetsToken(null);
          setSheetsSpreadsheetId(null);
          setSheetsSpreadsheetUrl(null);
          setSheetsSyncStatus('disabled');
          addNotification("Google Sheets Disconnected", "Google Sheets synchronization active service terminated.", "system");

          showDialog({
            title: "Sheets Disconnected",
            message: "Successfully logged out from Google Sheets and disabled real-time cloud sheet syncing.",
            type: 'success',
            onConfirm: closeDialog
          });
        } catch (err: any) {
          showDialog({
            title: "Logout Error",
            message: `Logout failed: ${err.message}`,
            type: 'error',
            onConfirm: closeDialog
          });
        }
      }
    });
  };

  const bootstrapSheetsWithAppState = async (token: string, spreadsheetId: string) => {
    try {
      setSheetsSyncStatus('syncing');
      
      // Check if spreadsheet contains active student data with rows
      const existingStudents = await readSheetData(token, spreadsheetId, 'Students');
      if (existingStudents && existingStudents.length > 1) {
        // Sheet already has data! Let's read it into our App State so we don't overwrite!
        // Read Students
        const loadedStudents = existingStudents.slice(1).map(rowToStudent);
        const mergedStudents = loadedStudents.map((s, i) => ({
          ...s,
          photo: initialStudents[i % initialStudents.length]?.photo || s.photo,
          fatherPhoto: initialStudents[i % initialStudents.length]?.fatherPhoto || s.fatherPhoto,
          motherPhoto: initialStudents[i % initialStudents.length]?.motherPhoto || s.motherPhoto,
        }));

        // Read Requests
        const existingRequests = await readSheetData(token, spreadsheetId, 'PickupRequests');
        const loadedRequests = existingRequests && existingRequests.length > 1 
          ? existingRequests.slice(1).map(rowToRequest) 
          : [];
        const mergedRequests = loadedRequests.map((r, i) => ({
          ...r,
          photograph: initialPickupRequests[i % initialPickupRequests.length]?.photograph || r.photograph,
          aadhaarPhoto: initialPickupRequests[i % initialPickupRequests.length]?.aadhaarPhoto || r.aadhaarPhoto,
        }));

        // Read SecurityLogs
        const existingLogs = await readSheetData(token, spreadsheetId, 'SecurityLogs');
        const loadedLogs = existingLogs && existingLogs.length > 1 
          ? existingLogs.slice(1).map(rowToLog) 
          : [];

        // Read Notifications
        const existingNotifs = await readSheetData(token, spreadsheetId, 'Notifications');
        const loadedNotifs = existingNotifs && existingNotifs.length > 1 
          ? existingNotifs.slice(1).map(rowToNotification) 
          : [];

        // Read EmailLogs
        const existingEmails = await readSheetData(token, spreadsheetId, 'EmailLogs');
        const loadedEmails = existingEmails && existingEmails.length > 1 
          ? existingEmails.slice(1).map(rowToEmail) 
          : [];

        // Set states - if loaded lists contain items, merge them!
        if (mergedStudents.length > 0) setStudents(mergedStudents);
        if (mergedRequests.length > 0) setPickupRequests(mergedRequests);
        if (loadedLogs.length > 0) setSecurityLogs(loadedLogs);
        if (loadedNotifs.length > 0) setNotifications(loadedNotifs);
        if (loadedEmails.length > 0) setEmailLogs(loadedEmails);

        setSheetsSyncStatus('synced');
        addNotification("Google Sheets Restored", "Existing records successfully imported from Google Sheets. App synchronized in real-time.", "system");
        return;
      }

      // If spreadsheet has no records, bootstrap write current local state!
      const studentsPayload = [TABLE_SCHEMAS.Students, ...students.map(studentToRow)];
      const requestsPayload = [TABLE_SCHEMAS.PickupRequests, ...pickupRequests.map(requestToRow)];
      const logsPayload = [TABLE_SCHEMAS.SecurityLogs, ...securityLogs.map(logToRow)];
      const notifsPayload = [TABLE_SCHEMAS.Notifications, ...notifications.map(notificationToRow)];
      const emailsPayload = [TABLE_SCHEMAS.EmailLogs, ...emailLogs.map(emailToRow)];

      await writeSheetData(token, spreadsheetId, 'Students', studentsPayload);
      await writeSheetData(token, spreadsheetId, 'PickupRequests', requestsPayload);
      await writeSheetData(token, spreadsheetId, 'SecurityLogs', logsPayload);
      await writeSheetData(token, spreadsheetId, 'Notifications', notifsPayload);
      await writeSheetData(token, spreadsheetId, 'EmailLogs', emailsPayload);

      setSheetsSyncStatus('synced');
      addNotification("Google Sheets Synchronized", "Google Sheets initialized. Current local tables exported.", "system");
    } catch (err: any) {
      console.error(err);
      setSheetsSyncStatus('error');
      
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('401')) {
        setSheetsErrorMsg('Your Google Sheets authorization session has expired. Firebase token limits are exactly 1 hour. Simply click the button below to log back in and resume background real-time sync.');
      } else {
        setSheetsErrorMsg(errMsg || 'Failed to initialize or read tables from Google Sheets.');
      }
    }
  };

  const handleForceSheetsSync = async () => {
    if (!sheetsToken || !sheetsSpreadsheetId) return;
    try {
      setSheetsSyncStatus('syncing');
      
      const studentsPayload = [TABLE_SCHEMAS.Students, ...students.map(studentToRow)];
      const requestsPayload = [TABLE_SCHEMAS.PickupRequests, ...pickupRequests.map(requestToRow)];
      const logsPayload = [TABLE_SCHEMAS.SecurityLogs, ...securityLogs.map(logToRow)];
      const notifsPayload = [TABLE_SCHEMAS.Notifications, ...notifications.map(notificationToRow)];
      const emailsPayload = [TABLE_SCHEMAS.EmailLogs, ...emailLogs.map(emailToRow)];

      await Promise.all([
        writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Students', studentsPayload),
        writeSheetData(sheetsToken, sheetsSpreadsheetId, 'PickupRequests', requestsPayload),
        writeSheetData(sheetsToken, sheetsSpreadsheetId, 'SecurityLogs', logsPayload),
        writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Notifications', notifsPayload),
        writeSheetData(sheetsToken, sheetsSpreadsheetId, 'EmailLogs', emailsPayload)
      ]);

      setSheetsSyncStatus('synced');
      showDialog({
        title: "Database Forced Sync Success! ⚡",
        message: "All 5 tables on your Google Spreadsheet (Pupils, Pickup Passes, Logs, Notifications, Emails) have been fully rewritten and cloud-synchronized.",
        type: 'success',
        onConfirm: closeDialog
      });
    } catch (err: any) {
      console.error("Manual force sync failure:", err);
      setSheetsSyncStatus('error');
      showDialog({
        title: "Sync Failed",
        message: `Sync operation failed: ${err.message}`,
        type: 'error',
        onConfirm: closeDialog
      });
    }
  };

  const handleSyncError = (err: any) => {
    console.error("Sheets sync error:", err);
    if (err.message && (
      err.message.includes('expired') || 
      err.message.includes('unauthorized') || 
      err.message.includes('forbidden') || 
      err.message.includes('permission') ||
      err.message.includes('401') ||
      err.message.includes('403')
    )) {
      setSheetsSyncStatus('error');
      setSheetsErrorMsg(err.message || 'Google Sheets session inactive. Please reconnect.');
    }
  };

  // Auto-sync students to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && students.length > 0) {
      const payload = [TABLE_SCHEMAS.Students, ...students.map(studentToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Students', payload).catch(e => {
        console.error("Sheets auto-sync students error:", e);
        handleSyncError(e);
      });
    }
  }, [students, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync requests to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && pickupRequests.length > 0) {
      const payload = [TABLE_SCHEMAS.PickupRequests, ...pickupRequests.map(requestToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'PickupRequests', payload).catch(e => {
        console.error("Sheets auto-sync requests error:", e);
        handleSyncError(e);
      });
    }
  }, [pickupRequests, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync logs to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && securityLogs.length > 0) {
      const payload = [TABLE_SCHEMAS.SecurityLogs, ...securityLogs.map(logToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'SecurityLogs', payload).catch(e => {
        console.error("Sheets auto-sync logs error:", e);
        handleSyncError(e);
      });
    }
  }, [securityLogs, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync notifications to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && notifications.length > 0) {
      const payload = [TABLE_SCHEMAS.Notifications, ...notifications.map(notificationToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Notifications', payload).catch(e => {
        console.error("Sheets auto-sync notifications error:", e);
        handleSyncError(e);
      });
    }
  }, [notifications, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync email logs to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && emailLogs.length > 0) {
      const payload = [TABLE_SCHEMAS.EmailLogs, ...emailLogs.map(emailToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'EmailLogs', payload).catch(e => {
        console.error("Sheets auto-sync email logs error:", e);
        handleSyncError(e);
      });
    }
  }, [emailLogs, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Save changes to localStorage on any data updates
  useEffect(() => {
    localStorage.setItem('goenka_sheets_sync_status', sheetsSyncStatus);
  }, [sheetsSyncStatus]);

  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem('goenka_students', JSON.stringify(students));
    }
  }, [students]);

  useEffect(() => {
    if (pickupRequests.length > 0) {
      localStorage.setItem('goenka_requests', JSON.stringify(pickupRequests));
    }
  }, [pickupRequests]);

  useEffect(() => {
    if (securityLogs.length > 0) {
      localStorage.setItem('goenka_logs', JSON.stringify(securityLogs));
    }
  }, [securityLogs]);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('goenka_notifs', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (emailLogs.length > 0) {
      localStorage.setItem('goenka_emails', JSON.stringify(emailLogs));
    }
  }, [emailLogs]);

  // Global helpers to add system notifications & emails
  const addNotification = (title: string, body: string, type: 'pickup_request' | 'pickup_confirm' | 'system', studentId?: string) => {
    const uniqueSuffix = Math.floor(Math.random() * 1000000);
    const newNotif: AppNotification = {
      id: `NOTIF${Date.now()}_${uniqueSuffix}`,
      title,
      body,
      timestamp: new Date().toISOString(),
      studentId: studentId || students[0]?.id,
      type,
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const addEmail = (to: string, subject: string, body: string) => {
    const uniqueSuffix = Math.floor(Math.random() * 1000000);
    const newEmail: EmailLog = {
      id: `EML${Date.now()}_${uniqueSuffix}`,
      to,
      subject,
      body,
      timestamp: new Date().toISOString()
    };
    setEmailLogs(prev => [newEmail, ...prev]);
  };

  // Reset core database to factory demonstration settings
  const handleResetToFactorySettings = async () => {
    showDialog({
      title: "Reset Database to Demo Settings?",
      message: "This will restore the Student & Authorization database back to standard default settings, clearing any custom entries or uploads. Are you sure you want to proceed?",
      type: 'confirm',
      confirmText: 'Reset to Defaults',
      cancelText: 'Cancel Reset',
      onConfirm: () => {
        closeDialog();
        localStorage.removeItem('goenka_students');
        localStorage.removeItem('goenka_requests');
        localStorage.removeItem('goenka_logs');
        localStorage.removeItem('goenka_notifs');
        localStorage.removeItem('goenka_emails');

        setStudents(initialStudents);
        setPickupRequests(initialPickupRequests);
        setSecurityLogs(initialSecurityLogs);
        setNotifications(initialNotifications);
        setEmailLogs(initialEmailLogs);
        
        addNotification("System Cleared", "Verification database successfully restored to standard demonstration setup.", "system");

        setTimeout(() => {
          showDialog({
            title: "Database Reset Complete",
            message: "The school database has been successfully restored to standard factory demonstration records.",
            type: 'success',
            onConfirm: closeDialog
          });
        }, 300);
      }
    });
  };

  // Authenticate user login credentials across roles
  const handleRoleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (activeTab === 'staff') {
      if (staffLoginType === 'principal') {
        const expectedUser = localStorage.getItem('goenka_principal_username') || 'admin';
        const expectedPass = localStorage.getItem('goenka_principal_password') || 'admin123';
        if (loginUsername.trim() === expectedUser && loginPassword === expectedPass) {
          setLoggedInRole('principal');
          setLoginUsername('');
          setLoginPassword('');
        } else {
          setLoginError('Invalid Principal username or password.');
        }
      } else {
        const expectedUser = localStorage.getItem('goenka_teacher_username') || 'teacher';
        const expectedPass = localStorage.getItem('goenka_teacher_password') || 'teacher123';
        if (loginUsername.trim() === expectedUser && loginPassword === expectedPass) {
          setLoggedInRole('teacher');
          setLoginUsername('');
          setLoginPassword('');
        } else {
          setLoginError('Invalid Teacher username or password.');
        }
      }
    } else if (activeTab === 'parent') {
      // Find student by admission number (case-insensitive)
      const matchedStudent = students.find(
        s => s.admissionNumber.trim().toLowerCase() === loginUsername.trim().toLowerCase()
      );
      if (!matchedStudent) {
        setLoginError('No matching student with this Admission Number.');
        return;
      }

      // Check passwords
      let savedPasswordsMap: Record<string, string> = {};
      try {
        const storedStr = localStorage.getItem('goenka_parent_passwords');
        if (storedStr) {
          savedPasswordsMap = JSON.parse(storedStr);
        }
      } catch (err) {}
      const expectedPass = savedPasswordsMap[matchedStudent.admissionNumber] || matchedStudent.admissionNumber;

      if (loginPassword === expectedPass) {
        setLoggedInParentStudentId(matchedStudent.id);
        setLoggedInRole('parent');
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError(`Incorrect password. Default is your student's Admission Number (${matchedStudent.admissionNumber}).`);
      }
    } else if (activeTab === 'gate') {
      const expectedUser = 'gate';
      const expectedPass = 'gate123';
      if (loginUsername.trim() === expectedUser && loginPassword === expectedPass) {
        setLoggedInRole('gate');
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError('Invalid Gate Guard username or password.');
      }
    }
  };

  // Dispersal stats metrics
  const totalStudents = students.length;
  // Dispersals completed today (June 17 or current date logs)
  const statsDispersalsToday = securityLogs.filter(log => {
    const logDate = new Date(log.pickupTime).toISOString().split('T')[0];
    const todayStr = '2026-06-17'; // Anchor to current demonstration local time date
    return logDate === todayStr || logDate === new Date().toISOString().split('T')[0];
  }).length;

  const activeAuthorizationsToday = pickupRequests.filter(req => req.status === 'approved' && !req.isUsed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden min-w-[320px]">
      
      {/* Decorative ambient radial backdrop glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(11,50,148,0.25),transparent_65%)] pointer-events-none z-0" />

      {/* COMPACT & GORGEOUS BRAND HEADER */}
      <header className="relative z-10 pt-6 pb-2 text-center max-w-4xl mx-auto shrink-0 px-4">
        <div className="flex items-center justify-center gap-2 mb-1 animate-fade-in">
          <div className="bg-[#0b3294] border-2 border-[#fbdf7e]/60 px-5 py-2.5 rounded-xl flex items-center justify-center shadow-2xl shadow-black/40 select-none">
            <span className="font-serif font-extrabold text-[#fbdf7e] text-sm md:text-base tracking-wide uppercase pr-1.5">GD</span>
            
            {/* Iconic flying gold bird symbol */}
            <div className="w-8 h-5 select-none pb-0.5">
              <svg viewBox="0 0 100 64" className="w-full h-full filter drop-shadow-[0_1.5px_2px_rgba(251,223,126,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M5 45C22 41 40 18 32 4C41 15 45 28 69 30C83 29 90 22 93 17C86 26 75 33 66 36C56 39 46 47 43 59C41 47 25 43 5 45ZM43 59C38 48 20 46 5 45M5 45C10 40 22 40 32 4" 
                  fill="url(#goldGradientLogoApp)" 
                  stroke="url(#goldGradientLogoApp)"
                  strokeWidth="0.5"
                />
                <defs>
                  <linearGradient id="goldGradientLogoApp" x1="5" y1="4" x2="93" y2="59" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFF7D6" />
                    <stop offset="25%" stopColor="#FBDF7E" />
                    <stop offset="65%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#916B00" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <span className="font-serif font-extrabold text-[#fbdf7e] text-sm md:text-base tracking-wide uppercase pl-1.5">GOENKA</span>
          </div>
        </div>
        <div className="text-[10px] text-[#fbdf7e] font-sans font-black tracking-[0.3em] uppercase leading-none mt-1">
          SMART DISPERSAL PORTAL
        </div>
      </header>

      {/* MASTER RESPONSIVE GRID PANEL */}
      <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3 pb-12">
        
        {/* RESPONSIVE SEGMENTED LEVEL BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-slate-900/65 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Select Campus Gateway
            </h2>
          </div>

          {/* Core Navigation Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto font-sans">
            <button
              id="role-switch-home"
              onClick={() => {
                setActiveTab('home');
              }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'home' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent cursor-pointer'}`}
            >
              <LayoutDashboard size={14} className={activeTab === 'home' ? 'text-amber-400' : 'text-slate-500'} />
              Home Screen
            </button>

            <button
              id="role-switch-admin"
              onClick={() => {
                setActiveTab('staff');
                setActiveRole('admin');
                setStaffLoginType('principal');
                setLoginUsername('admin');
                setLoginPassword('');
                setLoginError('');
              }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'staff' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent cursor-pointer'}`}
            >
              <GraduationCap size={14} className={activeTab === 'staff' ? 'text-amber-400' : 'text-slate-500'} />
              Principal / Teacher
            </button>

            <button
              id="role-switch-parent"
              onClick={() => {
                setActiveTab('parent');
                setActiveRole('parent');
                setLoginUsername('');
                setLoginPassword('');
                setLoginError('');
              }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'parent' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent cursor-pointer'}`}
            >
              <Smartphone size={14} className={activeTab === 'parent' ? 'text-amber-400' : 'text-slate-500'} />
              Parent Portal
            </button>

            <button
              id="role-switch-security"
              onClick={() => {
                setActiveTab('gate');
                setActiveRole('security');
                setLoginUsername('gate');
                setLoginPassword('');
                setLoginError('');
              }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'gate' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent cursor-pointer'}`}
            >
              <ShieldCheck size={14} className={activeTab === 'gate' ? 'text-amber-400' : 'text-slate-500'} />
              Gate Terminal
            </button>
          </div>
        </div>

        {/* 2-COLUMN GRID (Left column: Active Hub content, Right column: Live Analytics & Sheets Hub) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 8-COLUMNS: MAIN WORKSPACE CONTAINER */}
          <div className="lg:col-span-8 flex flex-col gap-6 font-sans">

            {/* Unified Simulated Android Device / App Frame */}
            <div className="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col relative">
              
              {/* Interactive Workspace App Views */}
              <div className="flex-grow">
                
                {activeTab === 'home' && (
                  <div className="bg-slate-950 p-6 md:p-8 relative overflow-hidden animate-fade-in text-slate-100 flex flex-col items-center justify-center min-h-[550px] w-full">
                    {/* Simulated Android Status Bar */}
                    <div className="absolute top-0 inset-x-0 bg-slate-900/60 border-b border-slate-900/30 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400 font-semibold select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold font-sans">GD GOENKA CORE</span>
                        <span>100% Secure</span>
                      </div>
                      <div>{androidTime}</div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#0b3294]/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Main Launcher Content */}
                    <div className="w-full text-center space-y-6 pt-6 pb-2 relative z-10">
                      <div className="space-y-2">
                        <div className="text-[44px] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-white leading-none">
                          {androidTime.split(' ')[0]}
                        </div>
                        <p className="text-[11px] font-extrabold font-mono text-slate-400 tracking-widest uppercase">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                      </div>

                      <div className="max-w-md mx-auto bg-slate-900/55 border border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-inner">
                        <h2 className="text-xs font-black text-[#fbdf7e] flex items-center justify-center gap-1.5 uppercase tracking-wider">
                          🏫 GD Goenka Smart Dispersal Hub
                        </h2>
                        <p className="text-[10.5px] text-slate-450 leading-relaxed font-medium">
                          Welcome to the safe dispersal environment. Open any of the secure Android application nodes below to manage gateways.
                        </p>
                      </div>

                      {/* Android Launcher Icons Grid */}
                      <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto pt-2">
                        {/* Faculty App Launcher */}
                        <button
                          onClick={() => {
                            setActiveTab('staff');
                            setActiveRole('admin');
                            setStaffLoginType('principal');
                            setLoginUsername('admin');
                            setLoginPassword('');
                            setLoginError('');
                          }}
                          className="flex flex-col items-center gap-2 group transition cursor-pointer active:scale-95"
                        >
                          <div className="w-14 h-14 bg-gradient-to-br from-[#0b3294] to-blue-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 border border-blue-400/20 transition-all duration-150">
                            <GraduationCap size={28} className="text-white" />
                          </div>
                          <div className="text-center leading-tight">
                            <span className="block text-[11px] font-bold text-slate-200">Faculty App</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">
                              {loggedInRole === 'principal' || loggedInRole === 'teacher' ? '🟢 Logged In' : '🔒 Secure'}
                            </span>
                          </div>
                        </button>

                        {/* Parent App Launcher */}
                        <button
                          onClick={() => {
                            setActiveTab('parent');
                            setActiveRole('parent');
                            setLoginUsername('');
                            setLoginPassword('');
                            setLoginError('');
                          }}
                          className="flex flex-col items-center gap-2 group transition cursor-pointer active:scale-95"
                        >
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 border border-emerald-400/20 transition-all duration-150">
                            <Smartphone size={26} className="text-white" />
                          </div>
                          <div className="text-center leading-tight">
                            <span className="block text-[11px] font-bold text-slate-200">Parent Guardian</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">
                              {loggedInRole === 'parent' ? '🟢 Logged In' : '🔒 Secure'}
                            </span>
                          </div>
                        </button>

                        {/* Gate Dispatch App Launcher */}
                        <button
                          onClick={() => {
                            setActiveTab('gate');
                            setActiveRole('security');
                            setLoginUsername('gate');
                            setLoginPassword('');
                            setLoginError('');
                          }}
                          className="flex flex-col items-center gap-2 group transition cursor-pointer active:scale-95"
                        >
                          <div className="w-14 h-14 bg-gradient-to-br from-sky-600 to-sky-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 border border-sky-400/20 transition-all duration-150">
                            <ShieldCheck size={26} className="text-white" />
                          </div>
                          <div className="text-center leading-tight">
                            <span className="block text-[11px] font-bold text-slate-200">Gate Dispatch</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">
                              {loggedInRole === 'gate' ? '🟢 Logged In' : '🔒 Secure'}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* UN-AUTHENTICATED ACCESS CONTROL PANELS (FIRST LOGIN VIEW SELECTIONS) */}
                {activeTab === 'staff' && loggedInRole !== 'principal' && loggedInRole !== 'teacher' && (
                  <div className="bg-slate-900 p-6 md:p-8 relative overflow-hidden animate-fade-in shadow-[#0b3294]/5 w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0b3294]/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="text-center max-w-xl mx-auto mb-6">
                      <div className="bg-[#0b3294]/35 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-[#fbdf7e]/20 text-[#fbdf7e]">
                        <GraduationCap size={24} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
                        {staffLoginType === 'principal' ? 'GD Goenka Principal Console' : 'Faculty Advisor Workspace'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Verify credentials to access administrative systems, student rosters, and database integrations.
                      </p>
                    </div>

                    <form onSubmit={handleRoleLogin} className="max-w-md mx-auto bg-slate-950/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                      {loginError && (
                        <div className="bg-rose-950/45 border border-rose-900/30 text-rose-350 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          {staffLoginType === 'principal' ? 'Principal Username' : 'Advisor Username'}
                        </label>
                        <input 
                          type="text"
                          required
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono"
                          placeholder={staffLoginType === 'principal' ? 'e.g. admin' : 'e.g. teacher'}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          Password
                        </label>
                        <input 
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono"
                          placeholder="••••••••"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0b3294] hover:bg-[#0b3294]/85 active:scale-[0.99] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-[#fbdf7e]/20 cursor-pointer"
                      >
                        Authenticate {staffLoginType === 'principal' ? 'Principal' : 'Teacher'}
                      </button>

                      <div className="text-center pt-2">
                        {staffLoginType === 'principal' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStaffLoginType('teacher');
                              setLoginUsername('teacher');
                              setLoginPassword('');
                              setLoginError('');
                            }}
                            className="text-[11px] text-slate-400 hover:text-[#fbdf7e] font-bold"
                          >
                            Are you a class teacher? Switch to Teacher Login →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setStaffLoginType('principal');
                              setLoginUsername('admin');
                              setLoginPassword('');
                              setLoginError('');
                            }}
                            className="text-[11px] text-slate-400 hover:text-[#fbdf7e] font-bold"
                          >
                            ← Back to Principal Portal Login
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'parent' && loggedInRole !== 'parent' && (
                  <div className="bg-slate-900 p-6 md:p-8 relative overflow-hidden animate-fade-in shadow-emerald-950/5 w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0b3294]/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="text-center max-w-xl mx-auto mb-6">
                      <div className="bg-[#0b3294]/35 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-[#fbdf7e]/20 text-[#fbdf7e]">
                        <Smartphone size={24} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">Parent Digital Gateway Login</h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Check your child's schedule, coordinate safe pick-ups, authorize temp delegates, and scan digital barcodes.
                      </p>
                    </div>

                    <form onSubmit={handleRoleLogin} className="max-w-md mx-auto bg-slate-950/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                      {loginError && (
                        <div className="bg-rose-950/45 border border-rose-900/30 text-rose-350 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          Child's Admission Number
                        </label>
                        <input 
                          type="text"
                          required
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono uppercase"
                          placeholder="e.g. ADM2026001"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          Parent Password
                        </label>
                        <input 
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono"
                          placeholder="••••••••"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0b3294] hover:bg-[#0b3294]/85 active:scale-[0.99] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-[#fbdf7e]/20 cursor-pointer"
                      >
                        Authenticate Parent
                      </button>

                      <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-normal font-semibold">
                        🔑 <strong className="text-[#fbdf7e]">First time login info:</strong> Enter your child's Admission Number (e.g., <span className="font-mono text-[#fbdf7e]">ADM2026001</span>) as both the Admission Number and the password. You can change your password inside the parent profile page after logging in or retain the admission number.
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'gate' && loggedInRole !== 'gate' && (
                  <div className="bg-slate-900 p-6 md:p-8 relative overflow-hidden animate-fade-in shadow-rose-950/5 w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0b3294]/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="text-center max-w-xl mx-auto mb-6">
                      <div className="bg-[#0b3294]/35 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-[#fbdf7e]/20 text-[#fbdf7e]">
                        <ShieldCheck size={24} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">Gate Dispersal Guard Terminal</h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Rugged tactical port for gate entry marshals. Instantly scan student barcode cards, log parent vehicle numbers, and verify clearance OTP certificates.
                      </p>
                    </div>

                    <form onSubmit={handleRoleLogin} className="max-w-md mx-auto bg-slate-950/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                      {loginError && (
                        <div className="bg-rose-950/45 border border-rose-900/30 text-rose-350 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          Gate Officer ID
                        </label>
                        <input 
                          type="text"
                          required
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono"
                          placeholder="e.g. gate"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                          Security Passcode
                        </label>
                        <input 
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-900/90 border border-slate-850 rounded-xl focus:border-amber-400/50 text-slate-100 focus:outline-none font-mono"
                          placeholder="••••••••"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0b3294] hover:bg-[#0b3294]/85 active:scale-[0.99] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-[#fbdf7e]/20 cursor-pointer"
                      >
                        Authenticate Gate Marshall
                      </button>

                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 text-center font-semibold">
                        🔑 Default ID is <span className="text-[#fbdf7e] font-mono">gate</span> and password is <span className="text-[#fbdf7e] font-mono">gate123</span>
                      </div>
                    </form>
                  </div>
                )}


                {/* ACTIVE WORKSPACE PANELS (AUTHENTICATED COMPONENT CONTAINER SPLIT SYSTEM) */}
                {activeTab === 'staff' && (loggedInRole === 'principal' || loggedInRole === 'teacher') && (
                  <div className="bg-white text-slate-900 relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                    
                    {/* Faculty App Bar */}
                    <div className="bg-[#0b3294] text-white py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-[#fbdf7e] text-slate-950 p-2.5 rounded-xl">
                          <GraduationCap size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] text-amber-300/90 font-mono tracking-widest font-black uppercase">FACULTY CONTROLLER HUB</div>
                          <h3 className="text-sm font-bold tracking-tight">
                            Logged in as: {loggedInRole === 'principal' ? 'Principal Dr. R. K. Goenka' : 'Teacher Ms. Ananya Sharma'}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={handleResetToFactorySettings}
                          title="Reset database back to default seed students list"
                          className="text-[11px] bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-white cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          Reset Seed
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('home'); // Go to home instead of logging out!
                          }}
                          className="text-[11px] bg-red-600 hover:bg-red-500 hover:scale-[1.01] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-white ml-2 cursor-pointer"
                        >
                          <LogOut size={12} />
                          Minimize App
                        </button>
                      </div>
                    </div>

                    {/* Main Admin Console Page */}
                    <div className="flex-grow overflow-x-hidden p-4 md:p-6 bg-slate-50">
                      <AdminPanel
                        students={students}
                        setStudents={setStudents}
                        securityLogs={securityLogs}
                        setSecurityLogs={setSecurityLogs}
                        pickupRequests={pickupRequests}
                        setPickupRequests={setPickupRequests}
                        addNotification={addNotification}
                        addEmail={addEmail}
                        notifications={notifications}
                        emailLogs={emailLogs}
                        onWipeDatabase={handleWipeDatabase}
                        onDeleteStudents={handleDeleteStudents}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'parent' && loggedInRole === 'parent' && (() => {
                  const loggedInStudent = students.find(s => s.id === loggedInParentStudentId) || students[0];
                  return (
                    <div className="bg-white text-slate-900 relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                      
                      {/* Parent App Bar */}
                      <div className="bg-slate-900 text-white py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-emerald-600 text-white p-2.5 rounded-xl">
                            <Smartphone size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] text-emerald-400 font-mono tracking-widest font-black uppercase">SECURE GUARDIAN FEED</div>
                            <h3 className="text-sm font-bold tracking-tight">
                              {loggedInStudent ? `${loggedInStudent.fatherName} / ${loggedInStudent.motherName} • Linked Pupil: ${loggedInStudent.name}` : 'Parent Secure Portal'}
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab('home'); // Minimize to Home instead of logging out!
                          }}
                          className="text-[11.5px] bg-[#0b3294] hover:bg-[#0b3294]/85 hover:scale-[1.01] border-2 border-[#fbdf7e]/40 px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-black text-white cursor-pointer self-end sm:self-auto"
                        >
                          <LogOut size={12} />
                          Minimize App
                        </button>
                      </div>

                      {/* Parent Application container */}
                      <div className="flex-grow bg-slate-50">
                        <ParentApp
                          students={students}
                          setStudents={setStudents}
                          pickupRequests={pickupRequests}
                          setPickupRequests={setPickupRequests}
                          securityLogs={securityLogs}
                          notifications={notifications}
                          setNotifications={setNotifications}
                          emailLogs={emailLogs}
                          setEmaillogs={setEmailLogs}
                          addNotification={addNotification}
                          addEmail={addEmail}
                          loggedInParentStudentId={loggedInParentStudentId}
                        />
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'gate' && loggedInRole === 'gate' && (
                  <div className="bg-white text-slate-100 relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                    
                    {/* Gate Terminal Bar */}
                    <div className="bg-slate-950 text-white py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md border-b border-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-sky-600 p-2.5 rounded-xl">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] text-sky-400 font-mono tracking-widest font-black uppercase">TACTICAL DISPERSAL DISPATCH</div>
                          <h3 className="text-sm font-bold tracking-tight">
                            Officer Guard Terminal • GD Goenka Bus Gate
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('home'); // Minimize to Home instead of disconnecting!
                        }}
                        className="text-[11px] bg-red-950 hover:bg-red-900 border border-red-900/50 hover:scale-[1.01] px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-red-200 self-end sm:self-auto cursor-pointer"
                      >
                        <LogOut size={12} strokeWidth={2.5} />
                        Minimize Terminal
                      </button>
                    </div>

                    {/* Gate Security core application screen */}
                    <div className="flex-grow bg-slate-900 text-slate-100">
                      <SecurityDashboard
                        students={students}
                        pickupRequests={pickupRequests}
                        setPickupRequests={setPickupRequests}
                        securityLogs={securityLogs}
                        setSecurityLogs={setSecurityLogs}
                        addNotification={addNotification}
                        addEmail={addEmail}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Simulated Android Physical Navigation Bar */}
              <div className="bg-slate-950 border-t border-slate-900/60 px-12 py-3 flex items-center justify-between select-none shrink-0 relative z-25">
                {/* Back Button */}
                <button
                  id="android-back-phys"
                  onClick={handleAndroidBack}
                  className="w-12 h-12 rounded-full hover:bg-slate-900 active:scale-90 flex items-center justify-center transition-all cursor-pointer group"
                  title="Simulated Android Back"
                >
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-slate-400 group-hover:border-r-[#fbdf7e] border-b-[6px] border-b-transparent transform translate-x-[-1px] transition-colors"></div>
                </button>

                {/* Home Button */}
                <button
                  id="android-home-phys"
                  onClick={handleAndroidHome}
                  className="w-12 h-12 rounded-full hover:bg-slate-900 active:scale-90 flex items-center justify-center transition-all cursor-pointer group"
                  title="Simulated Android Home"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 group-hover:border-[#fbdf7e] transition-colors"></div>
                </button>

                {/* Recents Button */}
                <button
                  id="android-recents-phys"
                  onClick={handleAndroidRecents}
                  className="w-12 h-12 rounded-full hover:bg-slate-900 active:scale-90 flex items-center justify-center transition-all cursor-pointer group"
                  title="Simulated Android Recents"
                >
                  <div className="w-3 h-3 border-2 border-slate-400 rounded-xs group-hover:border-[#fbdf7e] transition-colors"></div>
                </button>
              </div>

            </div>
          </div>


          {/* RIGHT 4-COLUMNS: REAL-TIME ANALYTICS & GOOGLE SHEETS DASHBOARD */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* REAL-TIME SYSTEM LIVE STATS GRID */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-[#0b3294]/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="text-amber-400" size={16} />
                <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                  Portal Safe Attendance
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-950/50 p-4.5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    Pupils Registered
                  </span>
                  <div className="text-2xl font-black text-[#fbdf7e] tracking-tight">
                    {totalStudents}
                  </div>
                </div>

                <div className="bg-slate-950/50 p-4.5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    Safe Dispersals
                  </span>
                  <div className="text-2xl font-black text-emerald-450 tracking-tight">
                    {statsDispersalsToday}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 bg-slate-950/45 border border-slate-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Approved Temp Delegates:</span>
                <span className="bg-[#0b3294]/50 border border-[#fbdf7e]/20 text-[#fbdf7e] text-[10.5px] px-2.5 py-0.5 rounded-full font-black">
                  {activeAuthorizationsToday} Verified
                </span>
              </div>
            </div>

            {/* AUTOMATED GOOGLE SHEETS SYNC BOARD */}
            <div id="google-sheets-sync-dashboard" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="text-emerald-400" size={16} />
                  <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                    School Database Sync
                  </h3>
                </div>
                
                {/* Status light */}
                {databaseMode === 'firebase' ? (
                  firebaseStatus === 'connected' ? (
                    <span className="text-[9.5px] bg-amber-950/40 text-amber-400 border border-amber-900/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                      🔥 Firestore Online
                    </span>
                  ) : firebaseConnecting ? (
                    <span className="text-[9.5px] bg-slate-950 text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block animate-ping" />
                      Connecting...
                    </span>
                  ) : (
                    <span className="text-[9.5px] bg-rose-955/35 text-rose-450 border border-rose-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-550 inline-block" />
                      Offline
                    </span>
                  )
                ) : databaseMode === 'local' ? (
                  <span className="text-[9.5px] bg-emerald-950/40 text-emerald-450 border border-emerald-900/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    LOCAL ACTIVE
                  </span>
                ) : (
                  <>
                    {sheetsSyncStatus === 'disabled' && (
                      <span className="text-[9px] bg-slate-950 text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        ● Offline
                      </span>
                    )}
                    {sheetsSyncStatus === 'error' && (
                      sheetsErrorMsg.toLowerCase().includes('domain') || sheetsErrorMsg.toLowerCase().includes('unauthorized-domain') ? (
                        <span className="text-[9px] bg-slate-950/70 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                          LOCAL SANDBOX
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-950/40 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          ● Sync Error
                        </span>
                      )
                    )}
                    {sheetsSyncStatus === 'syncing' && (
                      <span className="text-[9px] bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                        Syncing...
                      </span>
                    )}
                    {(sheetsSyncStatus === 'connected' || sheetsSyncStatus === 'synced') && (
                      <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Auto-Synced
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Database Mode Indicator */}
              <div id="db-mode-selector" className="bg-slate-950 p-2.5 rounded-xl border border-slate-850/80 mb-4 text-center select-none">
                <span className="text-[10.5px] font-extrabold text-amber-400 flex items-center justify-center gap-1.5">
                  🔥 Google Cloud Firestore Connection Active
                </span>
              </div>

              {databaseMode === 'firebase' ? (
                <div className="space-y-3.5 animate-fade-in text-[11px] text-slate-350">
                  <div className="bg-amber-950/15 border border-amber-500/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-450">
                      <Flame size={14} className="text-amber-400" />
                      Direct Firebase Firestore Active
                    </div>
                    
                    <p className="leading-relaxed text-[10.5px] text-slate-400">
                      The Smart Dispersal System now operates on your cloud-hosted <strong>Google Cloud Firestore Database</strong>. All pupil rosters, gate pass verifications, OTP approvals, and notifications sync immediately from the cloud with zero authorization popups or sandbox blocks!
                    </p>

                    {firebaseStatus === 'connected' && (
                      <div className="bg-emerald-950/15 border border-emerald-500/10 p-3 rounded-xl text-[10.5px] text-emerald-400 font-medium leading-relaxed">
                        ✨ <strong>Cloud DB Connection:</strong> Direct secure synchronization verified. Changes made in the staff principal portal or security terminal propagate in real time.
                      </div>
                    )}

                    {firebaseError && (
                      <div className="bg-rose-950/30 border border-rose-500/15 p-3 rounded-xl text-[10.5px] text-rose-300 font-mono leading-relaxed">
                        ⚠️ Handshake failed: {firebaseError}
                        <button 
                          onClick={() => loadFirebaseDatabase()}
                          className="block mt-2 bg-rose-800/85 hover:bg-rose-700 hover:text-white text-white p-1 px-2 rounded font-bold cursor-pointer transition text-[9px] uppercase tracking-wider"
                        >
                          Retry Connection
                        </button>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Rosters, OTP Requests, & Dispatch Logs:</span>
                        <span className="text-[10px] text-amber-405 font-bold bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/15">
                          {students.length} Pupils • {pickupRequests.length} Passes
                        </span>
                      </div>

                      {/* Explicit interactive migration tool */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase text-amber-450 tracking-wider flex items-center gap-1.5">
                          <RefreshCw size={11} className={`${firebaseMigrating ? 'animate-spin' : ''} text-amber-400`} />
                          Database Migration Toolkit
                        </span>
                        <p className="text-[9.5px] text-slate-450 leading-relaxed">
                          Are Firestore collections unpopulated? Copy all your secure sandbox data, students, active OTP credentials, and history logs straight onto Firestore with 1-click.
                        </p>
                        
                        <button
                          onClick={handleMigrateToFirebase}
                          disabled={firebaseMigrating}
                          className="mt-1 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition duration-150 shadow-md transform hover:translate-y-[-1px] active:translate-y-0 cursor-pointer disabled:opacity-50"
                        >
                          {firebaseMigrating ? 'Migrating Records...' : '🚀 Transfer All to Firebase'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : databaseMode === 'local' ? (
                <div className="space-y-3.5 animate-fade-in text-[11px] text-slate-350">
                  <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                      Client Sandbox Engine Live
                    </div>
                    <p className="leading-relaxed text-[10.5px] text-slate-400">
                      The school gateway portal has successfully booted with its **High-Performance Client Database Engine**. All student, pickup request, OTP dispersal, and delegate records save instantly to your device secure local database sandbox with pristine execution speed and 100% offline uptime!
                    </p>
                    
                    <div className="space-y-1.5 pt-2.5 border-t border-slate-800/50">
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-300">
                        <span className="text-emerald-400 font-bold">✓</span> Real-Time Offline Operations Active
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-300">
                        <span className="text-emerald-400 font-bold">✓</span> Stored Securely in Browser Cache
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-300">
                        <span className="text-emerald-400 font-bold">✓</span> Ready for Vercel/Static Deployments
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal bg-slate-950/40 p-3 rounded-xl border border-slate-850/60 leading-normal">
                    💡 If you need to synchronise records across multiple dynamic devices, tap <strong>Google Sheets Sync</strong> in the switcher above to link your cloud spreadsheet!
                  </p>
                </div>
              ) : (
                /* Google Sheets Mode */
                sheetsSyncStatus === 'disabled' || sheetsSyncStatus === 'error' ? (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Link Goenka Dispersal System directly to Google Sheets to automatically synchronize student records & parent gate-passes instantly from the cloud.
                    </p>
                    
                    {sheetsSyncStatus === 'error' && (
                      <div className="space-y-3 animate-fade-in">
                        {sheetsErrorMsg.toLowerCase().includes('domain') || sheetsErrorMsg.toLowerCase().includes('unauthorized-domain') ? (
                          <div className="bg-amber-950/20 border border-amber-500/25 rounded-xl p-3.5 space-y-2 text-[11px] text-amber-200">
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-400">
                              🛡️ Firebase Sandboxed Environment Active
                            </div>
                            <p className="text-slate-350 leading-relaxed text-[10.5px]">
                              Since the app is running on a custom deployment environment (<code className="bg-slate-900 px-1 text-slate-200 font-semibold">{window.location.hostname}</code>) outside of the authorized development environment, Google popup authentication is restricted by Firebase domain security properties.
                            </p>
                            <div className="bg-emerald-950/30 border border-emerald-500/10 p-2.5 rounded-lg text-emerald-300 font-medium text-[10.5px] leading-relaxed">
                              💡 <strong>Sandbox Engine Activated:</strong> The school gate portal has gracefully activated the **High-Performance Local Database**. All dispersals, delegate approvals, OTPs, notifications, and logs are 100% active, saving instantly to your device local database sandbox with pristine execution!
                            </div>
                          </div>
                        ) : (
                          <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-3 text-[10px] text-rose-300 font-mono leading-normal">
                            ⚠️ Message: {sheetsErrorMsg}
                          </div>
                        )}

                        {/* Google Sheets Scope Permissions Guide */}
                        {(sheetsErrorMsg.toLowerCase().includes('forbidden') || 
                          sheetsErrorMsg.toLowerCase().includes('permission') || 
                          sheetsErrorMsg.toLowerCase().includes('scope') || 
                          (sheetsErrorMsg.toLowerCase().includes('unauthorized') && !sheetsErrorMsg.toLowerCase().includes('domain'))) && (
                          <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[9.5px]">
                              <Database size={12} className="text-emerald-440" />
                              📝 Google Drive & Sheets Permission Fix
                            </div>
                            <p className="text-slate-400 leading-relaxed text-[10.5px]">
                              Google requires you to explicitly grant the app permission to modify files and sheets in your Drive.
                            </p>
                            <div className="space-y-1.5 text-slate-300 text-[10.5px] font-medium leading-normal bg-slate-900/50 p-2.5 rounded-lg border border-slate-850">
                              <div><strong className="text-emerald-300">1.</strong> Click the red <strong className="text-rose-350">Disconnect / Reset</strong> button below.</div>
                              <div><strong className="text-emerald-300">2.</strong> Click <strong className="text-emerald-400">Deploy Google Sheets Database</strong> to sign in.</div>
                              <div><strong className="text-emerald-300">3.</strong> In the Google login screen, <strong className="text-emerald-300">MAKE SURE TO TICK/CHECK</strong> both optional permission boxes:</div>
                              <ul className="list-disc list-inside pl-1 text-[9.5px] text-slate-400 space-y-0.5 leading-normal">
                                <li>"See, edit, create, and delete all your Google Sheets spreadsheets"</li>
                                <li>"See, edit, create, and delete only the specific Google Drive files..."</li>
                              </ul>
                              <div className="pt-1"><strong className="text-emerald-300">4.</strong> Click <strong className="text-slate-200">Continue</strong> and your databases will link instantly!</div>
                            </div>
                          </div>
                        )}

                        {/* Firebase Domain Whitelist Guide */}
                        {(sheetsErrorMsg.toLowerCase().includes('unauthorized-domain') || 
                          sheetsErrorMsg.toLowerCase().includes('unauthorized domain') || 
                          sheetsErrorMsg.toLowerCase().includes('domain') ||
                          sheetsErrorMsg.toLowerCase().includes('popup')) && (
                          <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-4 space-y-3 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                              <Database size={13} className="text-amber-400" />
                              🔑 Firebase Authorized Domain Setup (Vercel Fix)
                            </div>
                            
                            <p className="text-slate-400 leading-relaxed text-[10.5px]">
                              Google/Firebase Auth requires you to authorize your deployment domain path to permit Google popup login flows on new web servers.
                            </p>

                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5 text-[10px] text-slate-300">
                              <span className="text-[9.5px] uppercase font-bold tracking-wider text-rose-450 block font-mono">⚡ No-Code Alternative (Run Anywhere)</span>
                              <p className="text-slate-400 leading-relaxed">
                                If you don't need real-time multi-device cloud synchronization, choose <strong className="text-emerald-400">🔒 Local Secure Sandbox</strong> in the switcher above. The application will run entirely in high-performance local database sandbox mode, persisting your records locally on any device instantly with zero errors!
                              </p>
                            </div>

                            <div className="space-y-3 pt-1">
                              <div className="bg-emerald-950/25 border border-emerald-500/10 p-3 rounded-lg space-y-1.5">
                                <span className="text-[10.5px] font-bold text-emerald-400 block">Or, Whitelist this Domain on Firebase:</span>
                                <p className="text-slate-300 text-[10px] leading-relaxed">
                                  Open your <strong>Firebase Console</strong> project settings under <strong>Authentication &gt; Settings &gt; Authorized Domains</strong>, click <strong>Add Domain</strong>, and paste the domain below:
                                </p>
                                
                                <div className="flex items-center gap-1 mt-1 font-mono">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={window.location.hostname} 
                                    className="bg-slate-950 text-emerald-400 text-[10px] p-1.5 px-2 rounded-lg border border-slate-800 flex-grow select-all focus:outline-none font-semibold"
                                  />
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(window.location.hostname);
                                      showDialog({
                                        title: "Domain Copied",
                                        message: `Successfully copied authorized hostname "${window.location.hostname}" to clipboard. You can now paste this directly into your Firebase Authentication console setup!`,
                                        type: 'success',
                                        onConfirm: closeDialog
                                      });
                                    }}
                                    className="bg-emerald-800 text-white hover:bg-emerald-700 p-1.5 px-2.5 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer active:scale-95 transition"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Material UI design action buttons layout */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        id="btn-connect-google-sheets"
                        onClick={handleConnectGoogleSheets}
                        className="flex-grow bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 border border-emerald-500/20 cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.07 3.12v2.6h3.33c1.94-1.78 3.06-4.4 3.06-7.52 0-.6-.05-1.2-.15-1.7z" fill="#ffffff" />
                          <path d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.33-2.6c-.92.62-2.1.98-3.63.98-2.79 0-5.15-1.89-6-4.42H1.54v2.7C3.02 18.52 7.21 21 12 21z" fill="#34A853" />
                          <path d="M6 12.78a5.9 5.9 0 0 1 0-3.56V6.52H1.54a11.98 11.98 0 0 0 0 10.96L6 12.78z" fill="#FBBC05" />
                          <path d="M12 5.75c1.32 0 2.5.45 3.44 1.35l2.58-2.58C16.46 3.06 14.43 2.25 12 2.25c-4.79 0-8.98 2.48-10.46 6.13L6 11.1c.85-2.53 3.21-4.42 6-4.42z" fill="#EA4335" />
                        </svg>
                        {sheetsSyncStatus === 'error' ? 'Retry Integration Setup' : 'Deploy Google Sheets Database'}
                      </button>

                      {sheetsSyncStatus === 'error' && (
                        <button
                          onClick={async () => {
                            try {
                              await logoutFromGoogleSheets();
                            } catch (e) {
                              console.error(e);
                            }
                            setSheetsUser(null);
                            setSheetsToken(null);
                            setSheetsSpreadsheetId(null);
                            setSheetsSpreadsheetUrl(null);
                            setSheetsSyncStatus('disabled');
                            setDatabaseMode('local');
                          }}
                          className="bg-rose-950/45 hover:bg-rose-900 border border-rose-900/30 text-rose-350 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Disconnect / Reset
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">CONNECTED STORAGE</span>
                      <span className="text-xs font-bold text-slate-250 truncate block">
                        📁 {sheetsUser?.email || 'Authenticated Account'}
                      </span>
                      
                      {sheetsSpreadsheetUrl && (
                        <a 
                          href={sheetsSpreadsheetUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10.5px] text-emerald-450 hover:text-emerald-350 font-black inline-flex items-center gap-1 w-fit border-b border-dashed border-emerald-500/50 hover:border-emerald-450 pb-0.5 mt-1"
                        >
                          <Link2 size={11} /> Open spreadsheet database ↗
                        </a>
                      )}
                    </div>

                    {/* Schema active markers */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">SYNCED TABLES CONTROLLER</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['Students', 'PickupRequests', 'SecurityLogs', 'Notifications', 'EmailLogs'].map((n) => (
                          <div key={n} className="bg-slate-950/45 p-2 rounded-lg border border-slate-850 flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-300 font-mono">{n}</span>
                            <span className="text-[9.5px] text-emerald-400 font-bold">Active</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Force sync */}
                    <div className="flex gap-2 pt-1">
                      <button
                        id="btn-force-sheets-sync"
                        onClick={handleForceSheetsSync}
                        className="flex-grow bg-slate-850 hover:bg-slate-800 text-slate-200 py-2.5 rounded-xl text-[10.5px] font-black tracking-widest uppercase transition flex items-center justify-center gap-1.5 border border-slate-700/50 cursor-pointer"
                      >
                        ⚡ Force Sync Database
                      </button>
                      <button
                        id="btn-disconnect-sheets"
                        onClick={handleDisconnectGoogleSheets}
                        className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-905 text-rose-350 py-2 px-3 rounded-xl text-[10.5px] font-bold transition cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* REAL-TIME COMM HUB TRIGGER FEED */}
            <div className="w-full">
              <CommunicationHub
                notifications={notifications}
                setNotifications={setNotifications}
                emailLogs={emailLogs}
                setEmailLogs={setEmailLogs}
              />
            </div>

          </div>

        </div>

      </main>

      {/* BRAND FOOTER ACCENT */}
      <footer className="relative z-10 bg-slate-950/40 py-5 px-4 text-center text-[10px] text-slate-550 border-t border-slate-900/60 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 font-semibold text-[10.5px]">
          <p>© 2026 GD Goenka Public School. Responsive Smart Dispersal Gateway Portals.</p>
          <div className="flex gap-4 font-mono text-[9px] text-slate-655 uppercase tracking-wider">
            <span>Durable Storage: Local Sandbox</span>
            <span>Cloud Sync: Active Sheets Database</span>
          </div>
        </div>
      </footer>

      {/* Reusable non-native custom dialog */}
      <CustomDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        requireValidationText={dialogState.requireValidationText}
        validationPlaceholder={dialogState.validationPlaceholder}
        onConfirm={dialogState.onConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
