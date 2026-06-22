import React, { useState, useEffect } from 'react';
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
  loadFromSupabase, saveToSupabase, isSupabaseConfigured, supabase, 
  wipeAndSeedSupabase, SUPABASE_SQL_SCHEMA, mapStudentToDB, 
  mapPickupRequestToDB, mapSecurityLogToDB, mapNotificationToDB, 
  mapEmailLogToDB 
} from './lib/supabase';
import { 
  initSheetsAuth, loginWithGoogleSheets, logoutFromGoogleSheets, 
  createSpreadsheetWithTables, writeSheetData, readSheetData, 
  TABLE_SCHEMAS, studentToRow, rowToStudent, requestToRow, 
  rowToRequest, logToRow, rowToLog, notificationToRow, 
  rowToNotification, emailToRow, rowToEmail 
} from './lib/sheets';
import { 
  ShieldCheck, Smartphone, User, Users, CheckCircle, Clock, Calendar, 
  Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Database, Link2,
  LogOut, GraduationCap, Lock, Building, MapPin, Key, Radio, LayoutDashboard, Shield
} from 'lucide-react';

export default function App() {
  // Primary active system role: 'admin' | 'parent' | 'security'
  const [activeRole, setActiveRole] = useState<'admin' | 'parent' | 'security'>('admin');

  // Custom states matching user requirements
  const [activeTab, setActiveTab] = useState<'staff' | 'parent' | 'gate'>('staff');
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

  // Supabase states
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'disabled' | 'connected' | 'error' | 'tables_missing'>('disabled');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState('');

  // Google Sheets integration state
  const [sheetsUser, setSheetsUser] = useState<any>(null);
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState<string | null>(null);
  const [sheetsSpreadsheetUrl, setSheetsSpreadsheetUrl] = useState<string | null>(null);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<'disabled' | 'connected' | 'syncing' | 'synced' | 'error'>('disabled');
  const [sheetsErrorMsg, setSheetsErrorMsg] = useState<string>('');

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

  const handleAndroidHome = () => {
    alert("Simulated Android Home Gesture: Swiping up to return to home/dashboard.");
  };

  const handleAndroidBack = () => {
    alert("Simulated Android Back Gesture. Navigate back 1 level.");
  };

  const handleAndroidRecents = () => {
    alert("Simulated Android Recents gesture. Multi-tasking list: GD Goenka Dispersal background services are ACTIVE.");
  };

  // Simulation Wizard Scenario State
  const [activeTipScenario, setActiveTipScenario] = useState<number | null>(1);

  // Load from Supabase (if configured) or fallback to LocalStorage/MockData
  useEffect(() => {
    async function initializeDatabase() {
      if (isSupabaseConfigured) {
        setSupabaseLoading(true);
        const res = await loadFromSupabase();
        setSupabaseLoading(false);

        if (res.success && res.students && res.pickupRequests && res.securityLogs && res.notifications && res.emailLogs) {
          setStudents(res.students);
          setPickupRequests(res.pickupRequests);
          setSecurityLogs(res.securityLogs);
          setNotifications(res.notifications);
          setEmailLogs(res.emailLogs);
          setSupabaseStatus('connected');
          return;
        } else {
          setSupabaseErrorMsg(res.error || 'Unknown Supabase connection error');
          if (res.tablesMissing) {
            setSupabaseStatus('tables_missing');
          } else {
            setSupabaseStatus('error');
          }
        }
      } else {
        setSupabaseStatus('disabled');
      }

      // LOCAL STORAGE FALLBACK
      try {
        const savedStudents = localStorage.getItem('goenka_students');
        const savedRequests = localStorage.getItem('goenka_requests');
        const savedLogs = localStorage.getItem('goenka_logs');
        const savedNotifs = localStorage.getItem('goenka_notifs');
        const savedEmails = localStorage.getItem('goenka_emails');

        if (savedStudents) setStudents(JSON.parse(savedStudents));
        else setStudents(initialStudents);

        if (savedRequests) setPickupRequests(JSON.parse(savedRequests));
        else setPickupRequests(initialPickupRequests);

        if (savedLogs) setSecurityLogs(JSON.parse(savedLogs));
        else setSecurityLogs(initialSecurityLogs);

        if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        else setNotifications(initialNotifications);

        if (savedEmails) setEmailLogs(JSON.parse(savedEmails));
        else setEmailLogs(initialEmailLogs);
      } catch (e) {
        console.error("Local storage recovery failed, falling back to mock initializations.", e);
        setStudents(initialStudents);
        setPickupRequests(initialPickupRequests);
        setSecurityLogs(initialSecurityLogs);
        setNotifications(initialNotifications);
        setEmailLogs(initialEmailLogs);
      }
    }

    initializeDatabase();
  }, []);

  // Google Sheets Authentication Listener on Mount
  useEffect(() => {
    const unsubscribe = initSheetsAuth(
      (user, token) => {
        setSheetsUser(user);
        setSheetsToken(token);
        const cachedId = localStorage.getItem('goenka_sheets_spreadsheet_id');
        if (cachedId) {
          setSheetsSpreadsheetId(cachedId);
          setSheetsSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${cachedId}/edit`);
          setSheetsSyncStatus('connected');
          // Automatically sync data
          bootstrapSheetsWithAppState(token, cachedId);
        }
      },
      () => {
        setSheetsUser(null);
        setSheetsToken(null);
        setSheetsSyncStatus('disabled');
      }
    );
    return () => unsubscribe();
  }, []);

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
        setSheetsSyncStatus('connected');
        
        // Bootstrap/Sow the database! Checks if sheets contain active data, loads them or writes down local state.
        await bootstrapSheetsWithAppState(accessToken, sheetDetails.id);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsSyncStatus('error');
      setSheetsErrorMsg(err.message || 'Verification / Login Failed');
    }
  };

  const handleDisconnectGoogleSheets = async () => {
    if (confirm("Disconnect Google Sheets integration? Your local state remains safe, but automatic cloud sheet sync will stop.")) {
      try {
        await logoutFromGoogleSheets();
        setSheetsUser(null);
        setSheetsToken(null);
        setSheetsSpreadsheetId(null);
        setSheetsSpreadsheetUrl(null);
        setSheetsSyncStatus('disabled');
        addNotification("Google Sheets Disconnected", "Google Sheets synchronization active service terminated.", "system");
      } catch (err: any) {
        alert("Logout error: " + err.message);
      }
    }
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
      setSheetsErrorMsg('Failed to initialize or read tables from Google Sheets.');
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
      alert("⚡ Database Forced Sync Success! All 5 tables on your Google Spreadsheet have been written and verified.");
    } catch (err: any) {
      console.error("Manual force sync failure:", err);
      setSheetsSyncStatus('error');
      alert("Sync failed: " + err.message);
    }
  };

  // Auto-sync students to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && students.length > 0) {
      const payload = [TABLE_SCHEMAS.Students, ...students.map(studentToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Students', payload).catch(e => 
        console.error("Sheets auto-sync students error:", e)
      );
    }
  }, [students, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync requests to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && pickupRequests.length > 0) {
      const payload = [TABLE_SCHEMAS.PickupRequests, ...pickupRequests.map(requestToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'PickupRequests', payload).catch(e => 
        console.error("Sheets auto-sync requests error:", e)
      );
    }
  }, [pickupRequests, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync logs to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && securityLogs.length > 0) {
      const payload = [TABLE_SCHEMAS.SecurityLogs, ...securityLogs.map(logToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'SecurityLogs', payload).catch(e => 
        console.error("Sheets auto-sync logs error:", e)
      );
    }
  }, [securityLogs, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync notifications to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && notifications.length > 0) {
      const payload = [TABLE_SCHEMAS.Notifications, ...notifications.map(notificationToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'Notifications', payload).catch(e => 
        console.error("Sheets auto-sync notifications error:", e)
      );
    }
  }, [notifications, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Auto-sync email logs to Google Sheets on changes
  useEffect(() => {
    if (sheetsToken && sheetsSpreadsheetId && sheetsSyncStatus === 'synced' && emailLogs.length > 0) {
      const payload = [TABLE_SCHEMAS.EmailLogs, ...emailLogs.map(emailToRow)];
      writeSheetData(sheetsToken, sheetsSpreadsheetId, 'EmailLogs', payload).catch(e => 
        console.error("Sheets auto-sync email logs error:", e)
      );
    }
  }, [emailLogs, sheetsToken, sheetsSpreadsheetId, sheetsSyncStatus]);

  // Save changes to localStorage on any data updates, and auto-sync individual records to Supabase if connected
  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem('goenka_students', JSON.stringify(students));
      if (supabaseStatus === 'connected') {
        students.forEach(s => {
          saveToSupabase('students', mapStudentToDB(s));
        });
      }
    }
  }, [students, supabaseStatus]);

  useEffect(() => {
    if (pickupRequests.length > 0) {
      localStorage.setItem('goenka_requests', JSON.stringify(pickupRequests));
      if (supabaseStatus === 'connected') {
        pickupRequests.forEach(r => {
          saveToSupabase('pickup_requests', mapPickupRequestToDB(r));
        });
      }
    }
  }, [pickupRequests, supabaseStatus]);

  useEffect(() => {
    if (securityLogs.length > 0) {
      localStorage.setItem('goenka_logs', JSON.stringify(securityLogs));
      if (supabaseStatus === 'connected') {
        securityLogs.forEach(l => {
          saveToSupabase('security_logs', mapSecurityLogToDB(l));
        });
      }
    }
  }, [securityLogs, supabaseStatus]);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('goenka_notifs', JSON.stringify(notifications));
      if (supabaseStatus === 'connected') {
        notifications.forEach(n => {
          saveToSupabase('notifications', mapNotificationToDB(n));
        });
      }
    }
  }, [notifications, supabaseStatus]);

  useEffect(() => {
    if (emailLogs.length > 0) {
      localStorage.setItem('goenka_emails', JSON.stringify(emailLogs));
      if (supabaseStatus === 'connected') {
        emailLogs.forEach(e => {
          saveToSupabase('email_logs', mapEmailLogToDB(e));
        });
      }
    }
  }, [emailLogs, supabaseStatus]);

  // Global helpers to add system notifications & emails
  const addNotification = (title: string, body: string, type: 'pickup_request' | 'pickup_confirm' | 'system', studentId?: string) => {
    const newNotif: AppNotification = {
      id: `NOTIF${Date.now()}`,
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
    const newEmail: EmailLog = {
      id: `EML${Date.now()}`,
      to,
      subject,
      body,
      timestamp: new Date().toISOString()
    };
    setEmailLogs(prev => [newEmail, ...prev]);
  };

  // Reset core database to factory demonstration settings
  const handleResetToFactorySettings = async () => {
    if (confirm("Reset Student & Authorization Database back to default settings?")) {
      localStorage.removeItem('goenka_students');
      localStorage.removeItem('goenka_requests');
      localStorage.removeItem('goenka_logs');
      localStorage.removeItem('goenka_notifs');
      localStorage.removeItem('goenka_emails');

      if (supabaseStatus === 'connected') {
        setSupabaseLoading(true);
        const ok = await wipeAndSeedSupabase(initialStudents);
        setSupabaseLoading(false);
        if (ok) {
          addNotification("System Reset", "Supabase cloud database successfully cleared and re-seeded.", "system");
        } else {
          alert("Note: Local database was cleared, but unable to reset all tables on Supabase cloud. Please verify schema permissions.");
        }
      }

      setStudents(initialStudents);
      setPickupRequests(initialPickupRequests);
      setSecurityLogs(initialSecurityLogs);
      setNotifications(initialNotifications);
      setEmailLogs(initialEmailLogs);
      
      addNotification("System Cleared", "Verification database successfully restored to standard demonstration setup.", "system");
      alert("Database reset successfully!");
    }
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
      const expectedPass = savedPasswordsMap[matchedStudent.admissionNumber] || 'student123';

      if (loginPassword === expectedPass) {
        setLoggedInParentStudentId(matchedStudent.id);
        setLoggedInRole('parent');
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError('Incorrect password. Default is student123.');
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
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
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
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'staff' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent'}`}
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
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'parent' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent'}`}
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
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wider uppercase transition-all duration-300 ${activeTab === 'gate' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/30 border border-[#fbdf7e]/35 scale-[1.02]' : 'bg-slate-950/40 text-slate-400 hover:text-white border border-transparent'}`}
            >
              <ShieldCheck size={14} className={activeTab === 'gate' ? 'text-amber-400' : 'text-slate-500'} />
              Gate Terminal
            </button>
          </div>
        </div>

        {/* 2-COLUMN GRID (Left column: Active Hub content, Right column: Live Analytics & Sheets Hub) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 8-COLUMNS: MAIN WORKSPACE CONTAINER */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* UN-AUTHENTICATED ACCESS CONTROL PANELS (FIRST LOGIN VIEW SELECTIONS) */}
            {activeTab === 'staff' && loggedInRole !== 'principal' && loggedInRole !== 'teacher' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in shadow-[#0b3294]/5">
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
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in shadow-emerald-950/5">
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
                    🔑 <strong className="text-[#fbdf7e]">First time login info:</strong> Enter your child's Admission Number (e.g., <span className="font-mono text-[#fbdf7e]">ADM2026001</span>) and the default password <span className="font-mono text-[#fbdf7e]">student123</span>. You can change your password inside the parent profile page after logging in.
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'gate' && loggedInRole !== 'gate' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in shadow-rose-950/5">
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
              <div className="bg-white text-slate-900 border border-slate-250 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                
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
                        setLoggedInRole(null);
                      }}
                      className="text-[11px] bg-red-600 hover:bg-red-500 hover:scale-[1.01] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-white ml-2 cursor-pointer"
                    >
                      <LogOut size={12} />
                      Logout
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
                    supabaseStatus={supabaseStatus}
                    supabaseErrorMsg={supabaseErrorMsg}
                    supabaseLoading={supabaseLoading}
                  />
                </div>
              </div>
            )}

            {activeTab === 'parent' && loggedInRole === 'parent' && (() => {
              const loggedInStudent = students.find(s => s.id === loggedInParentStudentId) || students[0];
              return (
                <div className="bg-white border text-slate-900 border-slate-200 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                  
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
                        setLoggedInRole(null);
                        setLoggedInParentStudentId(null);
                      }}
                      className="text-[11.5px] bg-[#0b3294] hover:bg-[#0b3294]/85 hover:scale-[1.01] border-2 border-[#fbdf7e]/40 px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-black text-white cursor-pointer self-end sm:self-auto"
                    >
                      <LogOut size={12} />
                      Log Out Portal
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
              <div className="bg-white border text-slate-100 border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[690px] w-full animate-fade-in">
                
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
                      setLoggedInRole(null);
                    }}
                    className="text-[11px] bg-red-950 hover:bg-red-900 border border-red-900/50 hover:scale-[1.01] px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-red-200 self-end sm:self-auto cursor-pointer"
                  >
                    <LogOut size={12} strokeWidth={2.5} />
                    Disconnect Gate
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
                    Google Sheets Database
                  </h3>
                </div>
                
                {/* Status light */}
                {sheetsSyncStatus === 'disabled' && (
                  <span className="text-[9px] bg-slate-950 text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    ● Offline
                  </span>
                )}
                {sheetsSyncStatus === 'error' && (
                  <span className="text-[9px] bg-rose-950/40 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    ● Sync Error
                  </span>
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
              </div>

              {sheetsSyncStatus === 'disabled' || sheetsSyncStatus === 'error' ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                    Link Goenka Dispersal System directly to Google Sheets to automatically synchronize student records & parent gate-passes instantly from the cloud.
                  </p>
                  
                  {sheetsSyncStatus === 'error' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-3 text-[10px] text-rose-300 font-mono leading-normal">
                        ⚠️ Message: {sheetsErrorMsg}
                      </div>

                      {/* Google Sheets Scope Permissions Guide */}
                      {(sheetsErrorMsg.toLowerCase().includes('forbidden') || 
                        sheetsErrorMsg.toLowerCase().includes('permission') || 
                        sheetsErrorMsg.toLowerCase().includes('access') ||
                        sheetsErrorMsg.toLowerCase().includes('scope') || 
                        sheetsErrorMsg.toLowerCase().includes('unauthorized')) && (
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
                        <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[9.5px]">
                            <Database size={12} className="text-amber-400" />
                            🔑 Quick 1-Minute Firebase Whitelist Fix
                          </div>
                          <p className="text-slate-400 leading-relaxed text-[10.5px]">
                            Since the app is hosted inside the secure AI Studio development preview iframe, Google requires whitelisting this preview domain in your Firebase Authentication.
                          </p>
                          <div className="space-y-1.5 text-slate-300 text-[10.5px] font-medium leading-normal bg-slate-900/50 p-2.5 rounded-lg border border-slate-850">
                            <div><strong className="text-amber-200">1.</strong> Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console ↗</a></div>
                            <div><strong className="text-amber-200">2.</strong> Select project: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">gen-lang-client-0530494758</code></div>
                            <div><strong className="text-amber-200">3.</strong> In the left sidebar, click **Authentication** (usually at the top of the list, or under the **Build** dropdown. If not visible, search "Authentication" at the top).</div>
                            <div><strong className="text-amber-200">4.</strong> On the Authentication dashboard, look at the top menu tabs and click **Settings** (next to *Users*, *Sign-in method*, etc.).</div>
                            <div><strong className="text-amber-200">5.</strong> On the left side-menu of that Settings page, click **Authorized domains**.</div>
                            <div><strong className="text-amber-200">6.</strong> Click the **Add domain** button and paste the copied domain below:</div>
                            <div className="flex items-center gap-1 mt-1 font-mono">
                              <input 
                                type="text" 
                                readOnly 
                                value={window.location.hostname} 
                                className="bg-slate-950 text-emerald-450 text-[10px] p-1.5 px-2 rounded-lg border border-slate-800 flex-grow select-all focus:outline-none"
                              />
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.hostname);
                                  alert("Domain copied to clipboard! Paste it into Firebase Authorized Domains.");
                                }}
                                className="bg-emerald-800 text-white hover:bg-emerald-700 p-1.5 px-2.5 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer active:scale-95 transition"
                              >
                                Copy
                              </button>
                            </div>
                            {window.location.hostname.includes('-dev-') && (
                              <div className="text-[9.5px] text-amber-400/80 mt-1 leading-normal italic">
                                *Tip: If you'll share this app, also add the preview domain: <code className="bg-slate-950 px-1 font-mono">{window.location.hostname.replace('-dev-', '-pre-')}</code>
                              </div>
                            )}
                            <div className="pt-1"><strong className="text-amber-200">7.</strong> After adding, click the button below to connect!</div>
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

    </div>
  );
}
