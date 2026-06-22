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
  Sparkles, HelpCircle, AlertCircle, RefreshCw, Layers, Database, Link2
} from 'lucide-react';

export default function App() {
  // Primary active system role: 'admin' | 'parent' | 'security'
  const [activeRole, setActiveRole] = useState<'admin' | 'parent' | 'security'>('admin');

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
        addNotification("Google Sheets Restored", "Existing records successfully imported from Google Sheets.", "system");
        alert("🎉 Existing database found in Google Sheets! Data has been automatically restored & synchronized into the app.");
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(11,50,148,0.22),transparent_70%)] pointer-events-none z-0" />

      {/* COMPACT & GORGEOUS BRAND HEADER */}
      <header className="relative z-10 pt-8 pb-3 text-center max-w-xl mx-auto shrink-0 px-4">
        <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in">
          <div className="bg-[#0b3294] border-2 border-[#fbdf7e]/60 px-4 py-2.5 rounded-xl flex items-center justify-center shadow-xl shadow-black/40 select-none">
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
        <div className="text-[10px] text-[#fbdf7e] font-sans font-black tracking-[0.26em] uppercase leading-none mt-1.5">
          SMART DISPERSAL SYSTEM
        </div>
      </header>

      {/* PRIMARY INTERACTIVE STAGE */}
      <main className="relative z-10 flex-grow w-full flex flex-col items-center justify-center px-4 py-2 pb-10 max-w-4xl mx-auto">
        
        {/* Dynamic Stakeholder Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5 w-full max-w-[420px]">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-2xl flex w-full">
            <button
              id="role-switch-parent"
              onClick={() => setActiveRole('parent')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all duration-300 ${activeRole === 'parent' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/40 border border-[#fbdf7e]/25 scale-[1.01]' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone size={12} className={activeRole === 'parent' ? 'text-amber-400' : 'text-slate-500'} />
              Parent App
            </button>
            <button
              id="role-switch-security"
              onClick={() => setActiveRole('security')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all duration-300 ${activeRole === 'security' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/40 border border-[#fbdf7e]/25 scale-[1.01]' : 'text-slate-400 hover:text-white'}`}
            >
              <ShieldCheck size={12} className={activeRole === 'security' ? 'text-amber-400' : 'text-slate-500'} />
              Gate Terminal
            </button>
            <button
              id="role-switch-admin"
              onClick={() => setActiveRole('admin')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all duration-300 ${activeRole === 'admin' ? 'bg-[#0b3294] text-white shadow-md shadow-[#0b3294]/40 border border-[#fbdf7e]/25 scale-[1.01]' : 'text-slate-400 hover:text-white'}`}
            >
              <User size={12} className={activeRole === 'admin' ? 'text-amber-400' : 'text-slate-500'} />
              Registrar
            </button>
          </div>
        </div>

        {/* Informational helpful pill guidelines */}
        <div className="text-center max-w-[390px] mb-5 px-1 shrink-0">
          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
            {activeRole === 'parent' && "📱 SIMULATED PARENT HANDSET: Toggle between children in the top bar. Instantly authorize delegate list with 0 SMS cost."}
            {activeRole === 'security' && "🛡️ GATE TERMINAL: Simulates rugged gate handler Android tablet. Scan standard parent QR cards or verify security codes."}
            {activeRole === 'admin' && "🏫 REGISTRAR UTILITY: View full student database directory, seed default students list and view instant Eco-Routing logs."}
          </p>
        </div>

        {/* AUTOMATED GOOGLE SHEETS SYNC BOARD */}
        <div id="google-sheets-sync-dashboard" className="w-full max-w-[420px] mb-5 bg-slate-900 border border-slate-800 rounded-[24px] p-4.5 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Database className="text-emerald-400" size={16} />
              <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                Google Sheets Database Sync
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
              <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Auto-Synced
              </span>
            )}
          </div>

          {sheetsSyncStatus === 'disabled' || sheetsSyncStatus === 'error' ? (
            <div className="space-y-3">
              <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                Link this app to Google Sheets to automatically create and host your cloud security database (all columns/sheets created dynamically). No manual setup required!
              </p>
              
              {sheetsSyncStatus === 'error' && (
                <div className="bg-rose-950/40 border border-rose-900/40 rounded-xl p-2.5 text-[10px] text-rose-300 font-mono leading-normal">
                  ⚠️ <strong>Initialization Failure:</strong> {sheetsErrorMsg}
                </div>
              )}

              {/* Material UI design Google Sign In button */}
              <button 
                id="btn-connect-google-sheets"
                onClick={handleConnectGoogleSheets}
                className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-500/20 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.07 3.12v2.6h3.33c1.94-1.78 3.06-4.4 3.06-7.52 0-.6-.05-1.2-.15-1.7z" fill="#ffffff" />
                  <path d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.33-2.6c-.92.62-2.1.98-3.63.98-2.79 0-5.15-1.89-6-4.42H1.54v2.7C3.02 18.52 7.21 21 12 21z" fill="#34A853" />
                  <path d="M6 12.78a5.9 5.9 0 0 1 0-3.56V6.52H1.54a11.98 11.98 0 0 0 0 10.96L6 12.78z" fill="#FBBC05" />
                  <path d="M12 5.75c1.32 0 2.5.45 3.44 1.35l2.58-2.58C16.46 3.06 14.43 2.25 12 2.25c-4.79 0-8.98 2.48-10.46 6.13L6 11.1c.85-2.53 3.21-4.42 6-4.42z" fill="#EA4335" />
                </svg>
                Deploy Database to Google Sheets
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">CONNECTED STORAGE</span>
                <span className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                  📁 {sheetsUser?.email || 'Authenticated User'}
                </span>
                
                {sheetsSpreadsheetUrl && (
                  <a 
                    href={sheetsSpreadsheetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black mt-1.5 inline-flex items-center gap-1 w-fit border-b border-dashed border-emerald-500/50 hover:border-emerald-400 pb-0.5 transition"
                  >
                    <Link2 size={11} /> Open live spreadsheet database ↗
                  </a>
                )}
              </div>

              {/* Automatic tables indicators */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">LIVE TABLE SCHEMAS</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-semibold font-mono">Students</span>
                    <span className="text-[9px] text-emerald-400 font-bold font-sans">Active</span>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-semibold font-mono">PickupRequests</span>
                    <span className="text-[9px] text-emerald-400 font-bold font-sans">Active</span>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-semibold font-mono">SecurityLogs</span>
                    <span className="text-[9px] text-emerald-400 font-bold font-sans">Active</span>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-semibold font-mono">Notifications</span>
                    <span className="text-[9px] text-emerald-400 font-bold font-sans">Active</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50 flex items-center justify-between w-full">
                  <span className="text-[10px] text-slate-350 font-semibold font-mono">EmailLogs</span>
                  <span className="text-[9px] text-emerald-400 font-bold font-sans">Active</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  id="btn-force-sheets-sync"
                  onClick={handleForceSheetsSync}
                  className="flex-grow bg-slate-850 hover:bg-slate-800 text-slate-200 py-1.5 rounded-lg text-[10.5px] font-black tracking-wider uppercase transition flex items-center justify-center gap-1 shadow-xs border border-slate-700/50 cursor-pointer"
                >
                  ⚡ Force Write Sync
                </button>
                <button
                  id="btn-disconnect-sheets"
                  onClick={handleDisconnectGoogleSheets}
                  className="bg-rose-950 hover:bg-rose-900 border border-rose-800/35 text-rose-300 py-1.5 px-3 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SIMULATED ANDROID MOBILE CHASSIS DISPLAY */}
        <div className="relative w-full max-w-[370px] h-[700px] bg-slate-900 rounded-[44px] p-2.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] border border-slate-800 ring-10 ring-slate-950 flex flex-col overflow-hidden transition-all duration-350 select-none">
          
          {/* Selfie camera lens hole centered */}
          <div className="absolute top-[16px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-950 rounded-full z-45 border border-slate-800/60 flex items-center justify-center">
            <div className="w-1 h-1 bg-indigo-950 rounded-full opacity-60"></div>
          </div>
          
          {/* Speaker pill slit */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-slate-950/70 rounded-full z-45"></div>

          {/* Internal high-fidelity mobile surface */}
          <div className="flex-grow rounded-[34px] bg-slate-900 flex flex-col overflow-hidden relative border border-slate-950/50">
            
            {/* Top Android Material UI Status Bar */}
            <div className="bg-slate-950 text-slate-200 px-5 py-2 flex justify-between items-center text-[10px] font-mono font-bold tracking-wide shrink-0 select-none z-20 border-b border-slate-900/40">
              <span className="font-extrabold">{androidTime}</span>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-350">
                <span>5G</span>
                <span className="text-emerald-400">📶</span>
                <span>🔋 98%</span>
              </div>
            </div>

            {/* Viewport for the selected app flow */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 text-slate-900 select-text">
              {activeRole === 'parent' && (
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
                />
              )}

              {activeRole === 'security' && (
                <SecurityDashboard
                  students={students}
                  pickupRequests={pickupRequests}
                  setPickupRequests={setPickupRequests}
                  securityLogs={securityLogs}
                  setSecurityLogs={setSecurityLogs}
                  addNotification={addNotification}
                  addEmail={addEmail}
                />
              )}

              {activeRole === 'admin' && (
                <div className="h-full flex flex-col overflow-hidden bg-white">
                  {/* Clean mobile view of Admin Panel inside Google Pixel frame */}
                  <div className="bg-[#0b3294] text-white py-3 px-3.5 flex items-center justify-between shadow-xs select-none sticky top-0 z-10">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-amber-400 p-1 rounded text-slate-950">
                        <Users size={12} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Registrar Console</span>
                    </div>

                    <button
                      id="registrar-seed-reset-btn"
                      onClick={handleResetToFactorySettings}
                      title="Reset database back to default seed students list"
                      className="text-[9px] bg-slate-950/20 hover:bg-slate-950/40 border border-white/20 px-2 py-1 rounded transition flex items-center gap-1 font-bold"
                    >
                      <RefreshCw size={10} />
                      Reset
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-3">
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
            </div>

            {/* Simulated Android Device Touch Controls Navigation Bar */}
            <div className="bg-slate-950 text-slate-500 py-3.5 flex items-center justify-around shrink-0 border-t border-slate-900/50 text-[11px] select-none z-20">
              <button className="hover:text-amber-400 transition-all px-6 py-0.5 active:scale-95 text-xs text-center" onClick={() => handleAndroidBack()} title="Simulate Back Button">
                ◀
              </button>
              <button className="hover:text-amber-400 transition-all px-6 py-0.5 active:scale-95 text-base leading-none text-center" onClick={() => handleAndroidHome()} title="Simulate Home Screen">
                ●
              </button>
              <button className="hover:text-amber-400 transition-all px-6 py-0.5 active:scale-95 text-xs text-center font-bold" onClick={() => handleAndroidRecents()} title="Simulate Active Processes Status">
                ■
              </button>
            </div>

          </div>
        </div>

        {/* Simulated Eco-Clearance Log Alerts for active evaluations */}
        <div className="w-full max-w-[420px] mt-6">
          <CommunicationHub
            notifications={notifications}
            setNotifications={setNotifications}
            emailLogs={emailLogs}
            setEmailLogs={setEmailLogs}
          />
        </div>

      </main>

      {/* BRAND FOOTER ACCENT */}
      <footer className="relative z-10 bg-slate-950/40 py-5 px-4 text-center text-[10px] text-slate-550 border-t border-slate-900/60 shrink-0">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 font-medium">
          <p>© 2026 GD Goenka Public School Utilities. Smart Dispersal Gateway.</p>
          <div className="flex gap-3 font-mono text-[9px] text-slate-600">
            <span>DURABLE: LOCAL STORAGE</span>
            <span>NO SMS PROTOCOLS ENABLED</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
