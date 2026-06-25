import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Student, PickupRequest, SecurityLog, AppNotification, EmailLog } from '../types';
import { 
  CreditCard, UserCheck, History, Bell, Settings, ArrowRight, Download, 
  Upload, Sparkles, Check, Phone, Mail, FileText, AlertCircle, Trash2, 
  UserPlus, RefreshCw, Smartphone, Eye, CheckCircle
} from 'lucide-react';
import { svgAvatars } from '../mockData';

// Downscale images to avoid exceeding Firestore 1MB document size limit
const downscaleImage = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    // If it's a small placeholder or SVG avatar, return it as is
    if (!base64Str || base64Str.startsWith('data:image/svg+xml')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG to keep size extremely small (e.g. 10-25KB)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

const formatRequestTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { time: 'Unknown Time', date: 'Unknown Date' };
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    return { time: timeStr, date: dateStr };
  } catch (e) {
    return { time: 'Unknown Time', date: 'Unknown Date' };
  }
};

interface ParentAppProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  pickupRequests: PickupRequest[];
  setPickupRequests: React.Dispatch<React.SetStateAction<PickupRequest[]>>;
  securityLogs: SecurityLog[];
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  emailLogs: EmailLog[];
  setEmaillogs: React.Dispatch<React.SetStateAction<EmailLog[]>>;
  addNotification: (title: string, body: string, type: 'pickup_request' | 'pickup_confirm' | 'system', studentId?: string) => void;
  addEmail: (to: string, subject: string, body: string) => void;
  loggedInParentStudentId: string | null;
}

export default function ParentApp({
  students,
  setStudents,
  pickupRequests,
  setPickupRequests,
  securityLogs,
  notifications,
  setNotifications,
  emailLogs,
  setEmaillogs,
  addNotification,
  addEmail,
  loggedInParentStudentId
}: ParentAppProps) {
  
  // Active Parent credentials simulation
  const initialIndex = loggedInParentStudentId 
    ? students.findIndex(s => s.id === loggedInParentStudentId)
    : 0;
  const [activeParentIndex, setActiveParentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const activeStudent = students[activeParentIndex] || students[0];
  const [showChildPicker, setShowChildPicker] = useState(false);

  // Sync activeParentIndex if loggedInParentStudentId changes
  useEffect(() => {
    if (loggedInParentStudentId) {
      const idx = students.findIndex(s => s.id === loggedInParentStudentId);
      if (idx >= 0) {
        setActiveParentIndex(idx);
      }
    }
  }, [loggedInParentStudentId, students]);

  // Mobile App screen: 'dashboard' | 'idcard' | 'new_pickup' | 'history' | 'profile' | 'notifications'
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'idcard' | 'new_pickup' | 'history' | 'profile' | 'notifications'>('dashboard');

  // Digital secure QR code representation
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Contact info editting state
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryMobile, setPrimaryMobile] = useState('');
  const [photoUpdateMessage, setPhotoUpdateMessage] = useState('');
  const [parentPassword, setParentPasswordInternal] = useState('');

  // Child info editing states
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childAddress, setChildAddress] = useState('');
  const [childFatherName, setChildFatherName] = useState('');
  const [childMotherName, setChildMotherName] = useState('');
  const [childMotherMobile, setChildMotherMobile] = useState('');
  const [childMotherEmail, setChildMotherEmail] = useState('');

  // Load parent passwords on active student change
  useEffect(() => {
    if (activeStudent) {
      try {
        const stored = localStorage.getItem('goenka_parent_passwords');
        if (stored) {
          const map = JSON.parse(stored);
          setParentPasswordInternal(map[activeStudent.admissionNumber] || activeStudent.admissionNumber);
        } else {
          setParentPasswordInternal(activeStudent.admissionNumber);
        }
      } catch (e) {
        setParentPasswordInternal(activeStudent.admissionNumber);
      }
    }
  }, [activeStudent]);

  // Authorize New Pickup State
  const [newPickupName, setNewPickupName] = useState('');
  const [newPickupAge, setNewPickupAge] = useState(30);
  const [newPickupMobile, setNewPickupMobile] = useState('');
  const [newPickupEmail, setNewPickupEmail] = useState('');
  const [newPickupRelationship, setNewPickupRelationship] = useState('Driver');
  const [newPickupAadhaar, setNewPickupAadhaar] = useState('');
  const [newPickupNotes, setNewPickupNotes] = useState('');
  const [newPickupPhoto, setNewPickupPhoto] = useState(svgAvatars.tempGuardian1);
  const [newPickupAadhaarPhoto, setNewPickupAadhaarPhoto] = useState(svgAvatars.aadhaarPhoto);

  // Load parent info when switching student (activeStudent)
  useEffect(() => {
    if (activeStudent) {
      setPrimaryEmail(activeStudent.fatherEmail);
      setPrimaryMobile(activeStudent.fatherMobile);
      setChildName(activeStudent.name || '');
      setChildDob(activeStudent.dob || '');
      setChildAddress(activeStudent.address || '');
      setChildFatherName(activeStudent.fatherName || '');
      setChildMotherName(activeStudent.motherName || '');
      setChildMotherMobile(activeStudent.motherMobile || '');
      setChildMotherEmail(activeStudent.motherEmail || '');
      
      // Generate Secure Permanent QR data
      // Encodes Student ID + Parent Name + Validation Key
      const secureQrPayload = JSON.stringify({
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        classSection: `${activeStudent.className} - ${activeStudent.section}`,
        parentHash: `SECURE_TOKEN_${activeStudent.id}_${activeStudent.fatherName.replace(/\s+/g, '')}`
      });

      QRCode.toDataURL(secureQrPayload, { margin: 2, scale: 4 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error("Error generating static Parent QR code:", err));
    }
  }, [activeStudent]);

  // Handle Parent photo uploads
  const handleParentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, role: 'father' | 'mother') => {
    if (activeStudent?.isParentBlocked) {
      alert("Error: Your parent data modification privileges are blocked by the school.");
      return;
    }
    const file = e.target.files?.[0];
    if (file && activeStudent) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          downscaleImage(base64).then(scaled => {
            // update in students database
            setStudents(prev => prev.map(s => s.id === activeStudent.id ? {
              ...s,
              [role === 'father' ? 'fatherPhoto' : 'motherPhoto']: scaled
            } : s));
            setPhotoUpdateMessage(`Successfully updated ${role}'s photograph.`);
            setTimeout(() => setPhotoUpdateMessage(''), 3000);

            addNotification(
              "Guardians Directory Updated", 
              `Parent updated ${role === 'father' ? 'Father' : 'Mother'}'s digital ID photograph.`, 
              'system',
              activeStudent.id
            );
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Authorize New Pickup Person
  const handleCreatePickupRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStudent?.isParentBlocked) {
      alert("Error: Your parent delegation privileges are blocked by the school.");
      return;
    }
    if (!newPickupName || !newPickupMobile || !newPickupAadhaar) {
      alert("Please fill in Name, Mobile number, and Aadhaar card number.");
      return;
    }

    const requestId = `REQ${Math.floor(1000 + Math.random() * 9000)}`;
    const isDelegated = newPickupRelationship === 'Unknown Person (Delegated)';
    const newRequest: PickupRequest = {
      id: requestId,
      studentId: activeStudent.id,
      fullName: newPickupName,
      age: Number(newPickupAge),
      mobileNumber: newPickupMobile,
      email: newPickupEmail || `${newPickupName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      relationship: newPickupRelationship,
      photograph: newPickupPhoto,
      aadhaarNumber: newPickupAadhaar,
      aadhaarPhoto: newPickupAadhaarPhoto,
      notes: newPickupNotes,
      status: 'approved', // Pre-approved by parent on submission
      adminApproval: 'pending', // Sent directly to school for clearance
      createdAt: new Date().toISOString(),
      isDelegated: isDelegated
    };

    setPickupRequests(prev => [...prev, newRequest]);
    
    // Reset fields
    setNewPickupName('');
    setNewPickupMobile('');
    setNewPickupEmail('');
    setNewPickupAadhaar('');
    setNewPickupNotes('');
    setNewPickupPhoto(svgAvatars.tempGuardian1);
    setNewPickupAadhaarPhoto(svgAvatars.aadhaarPhoto);

    // Go back to dashboard to handle approval
    setActiveScreen('dashboard');

    // Notify the parent instantly
    addNotification(
      `School Review Dispatched`,
      `Your delegation request for ${newRequest.fullName} (${newRequest.relationship}) has been sent to school. Awaiting Principal clearance and OTP dispatch.`,
      'system',
      activeStudent.id
    );
  };

  // Approve / Reject Workflow action helper
  const handleWorkflowAction = (reqId: string, action: 'approve' | 'reject') => {
    const isApprove = action === 'approve';
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. 582741
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes validity

    setPickupRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: isApprove ? 'approved' : 'rejected',
          adminApproval: isApprove ? 'pending' : undefined, // Require administration clearance
          verificationCode: isApprove ? code : undefined,
          codeExpiresAt: isApprove ? expiry : undefined,
          approvedAt: new Date().toISOString()
        };
      }
      return r;
    }));

    // Find request details
    const reqObj = pickupRequests.find(r => r.id === reqId);
    if (reqObj) {
      if (isApprove) {
        addNotification(
          "Pickup Authorized Successfully", 
          `Verification Code ${code} generated for ${reqObj.fullName}. Expires in 30 minutes.`, 
          'system',
          activeStudent.id
        );
        addEmail(
          primaryEmail || activeStudent.fatherEmail, 
          "Emergency Dispersal Authorization Code - GOENKA SMART DISPERSAL", 
          `Dear ${activeStudent.fatherName},\n\nYour request to authorize ${reqObj.fullName} (${reqObj.relationship}) to pick up ${activeStudent.name} (Class ${activeStudent.className}) has been APPROVED.\n\nTEMPORARY SINGLE-USE VERIFICATION CODE: ${code}\nThis code is valid for 30 minutes only. Share this code with the authorized person. Do not share your permanent ID card QR.\n\nWarm regards,\nGD Goenka Administration`
        );
      } else {
        addNotification("Authorization Rejected", `We have canceled the delegation clearance request for ${reqObj.fullName}.`, "system", activeStudent.id);
      }
    }
  };

  // Read upload for temp photo / Aadhaar
  const handleTempFileRead = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'aadhaar') => {
    if (activeStudent?.isParentBlocked) {
      alert("Error: Your parent delegation privileges are blocked by the school.");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          downscaleImage(base64).then(scaled => {
            if (field === 'photo') setNewPickupPhoto(scaled);
            else setNewPickupAadhaarPhoto(scaled);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile details
  const handleSaveContactConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStudent?.isParentBlocked) {
      alert("Error: Your parent data modification privileges are blocked by the school.");
      return;
    }
    if (activeStudent) {
      setStudents(prev => prev.map(s => s.id === activeStudent.id ? {
        ...s,
        name: childName,
        dob: childDob,
        address: childAddress,
        fatherName: childFatherName,
        motherName: childMotherName,
        fatherEmail: primaryEmail,
        fatherMobile: primaryMobile,
        motherMobile: childMotherMobile,
        motherEmail: childMotherEmail
      } : s));

      // Save custom portal passwords in local storage mapper
      try {
        const stored = localStorage.getItem('goenka_parent_passwords') || '{}';
        const map = JSON.parse(stored);
        map[activeStudent.admissionNumber] = parentPassword;
        localStorage.setItem('goenka_parent_passwords', JSON.stringify(map));
      } catch (err) {
        console.error("Error saving parent password:", err);
      }

      setPhotoUpdateMessage("Profile settings updated successfully!");
      addNotification("Contact Details Updated", "Contact details, portal passwords, and dispersal report routing preferences were updated in the school profile.", "system", activeStudent.id);
      setTimeout(() => setPhotoUpdateMessage(''), 3000);
    }
  };

  // Helper: Download mock action
  const handleMockDownloadIDCard = () => {
    alert("Downloading PDF parent identity pass... Generated High-Resolution PDF copy stored to physical downloads.");
    addNotification("ID PDF Exported", `Parent Pass downloaded for ${activeStudent.name}.`, "system", activeStudent.id);
  };

  // Filter logs for this student
  const childLogs = securityLogs.filter(log => log.studentId === activeStudent.id);

  // Active pending requests for this student inside this mobile app
  const childRequests = pickupRequests.filter(req => req.studentId === activeStudent.id);

  return (
    <div className="bg-slate-50 w-full h-full text-slate-900 flex flex-col justify-between overflow-hidden relative font-sans">
      
      {/* Immersive Android Styled Toolbar Header */}
      <div className="bg-slate-900 text-white border-b border-slate-850 px-3.5 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          
          {/* Linked sibling inline switcher */}
          <div className="relative">
            <button 
              id="parent-child-picker-trigger"
              onClick={() => setShowChildPicker(!showChildPicker)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-xl border border-slate-700 transition text-[10px] font-bold text-slate-100"
              title="Click to switch links between siblings"
            >
              <img 
                referrerPolicy="no-referrer" 
                src={activeStudent?.photo} 
                alt={activeStudent?.name} 
                className="w-5.5 h-5.5 rounded-full object-cover border border-amber-400"
              />
              <div className="text-left leading-none max-w-[110px] truncate">
                <span className="block text-[6px] text-slate-400 font-mono font-bold leading-none mb-0.5">ACTIVE CHILD</span>
                {activeStudent?.name}
              </div>
              <span className="text-[7.5px] text-amber-400">▼</span>
            </button>

            {showChildPicker && (
              <div id="parent-child-picker-dropdown" className="absolute left-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl py-1 z-30 animate-in fade-in duration-100">
                <p className="text-[8px] font-black text-slate-400 px-3 py-1.5 uppercase tracking-wider border-b border-slate-900 mb-1">Linked Profiles</p>
                {students.map((student, idx) => (
                  <button
                    key={student.id}
                    id={`parent-select-student-${student.id}`}
                    onClick={() => {
                      setActiveParentIndex(idx);
                      setActiveScreen('dashboard');
                      setShowChildPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-900 flex items-center gap-2.5 transition ${activeParentIndex === idx ? 'bg-amber-400/10 text-amber-400 font-bold' : 'text-slate-350'}`}
                  >
                    <img 
                      referrerPolicy="no-referrer" 
                      src={student.photo} 
                      alt={student.name} 
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] truncate leading-none font-bold">{student.name}</p>
                      <p className="text-[8px] text-slate-400 leading-none mt-1">{student.className} • {student.section}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bell badge button */}
        <button 
          id="mob-btn-bell"
          onClick={() => setActiveScreen('notifications')} 
          className="relative p-1.5 hover:bg-slate-850 rounded-full transition"
        >
          <Bell size={16} className="text-slate-200" />
          {notifications.filter(n => !n.isRead && n.studentId === activeStudent?.id).length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center font-extrabold shadow animate-bounce">
              {notifications.filter(n => !n.isRead && n.studentId === activeStudent?.id).length}
            </span>
          )}
        </button>
      </div>

      {/* Main active app body scroll area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">

              {/* Dashboard Home */}
              {activeScreen === 'dashboard' && (
                <div className="space-y-4">
                  
                  {/* Active Pupil Hero Card info */}
                  <div className="bg-emerald-800 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10">
                      <Sparkles size={110} />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <img 
                        referrerPolicy="no-referrer" 
                        src={activeStudent.photo} 
                        alt={activeStudent.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-white/20 bg-emerald-900 shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] bg-white/20 text-emerald-100 px-2 py-0.5 rounded-full block w-fit font-medium">
                          Active Student Link
                        </span>
                        <h4 className="font-bold text-sm tracking-tight mt-0.5 truncate">{activeStudent.name}</h4>
                        <p className="text-[10px] text-emerald-100 font-medium">{activeStudent.className} • {activeStudent.section}</p>
                      </div>
                    </div>
                  </div>

                  {/* Blocked Parent Alert Banner */}
                  {activeStudent?.isParentBlocked && (
                    <div className="bg-red-50 border-2 border-red-355 p-3.5 rounded-2xl flex items-start gap-3 text-red-900 shadow-sm animate-pulse">
                      <AlertCircle className="text-red-750 shrink-0 mt-0.5" size={18} />
                      <div className="text-left">
                        <span className="text-xs font-black block">Permissions Suspended</span>
                        <span className="text-[10px] text-slate-700 block mt-0.5 leading-snug">
                          The school administration has blocked your portal's permission to submit emergency pickup delegation requests or change family records.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Immediate Quick Actions Buttons - PLACED AT THE TOP FOR DIRECT INSTANT VISIBILITY */}
                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* View ID Button */}
                    <button
                      id="btn-parent-id-pass"
                      onClick={() => setActiveScreen('idcard')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center text-center group transition text-xs font-semibold shadow-2xs"
                    >
                      <CreditCard className="text-emerald-700 group-hover:scale-105 transition mb-2" size={18} />
                      Parent Digital ID
                    </button>

                    {/* Authorize Temp Button */}
                    <button
                      id="btn-parent-authorize-temp"
                      onClick={() => {
                        if (activeStudent?.isParentBlocked) {
                          alert("Error: Your parent delegation privileges are blocked by the school.");
                          return;
                        }
                        setActiveScreen('new_pickup');
                      }}
                      className={`p-3 rounded-xl flex flex-col items-center justify-center text-center group transition text-xs font-semibold border shadow-2xs ${
                        activeStudent?.isParentBlocked 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' 
                          : 'bg-[#0b3294] text-white hover:bg-[#0b3294]/90 border-[#fbdf7e]/20'
                      }`}
                    >
                      <UserPlus className={`${activeStudent?.isParentBlocked ? 'text-slate-400' : 'text-[#fbdf7e]'} group-hover:scale-105 transition mb-2`} size={18} />
                      Authorize Delegate
                    </button>

                  </div>

                  {/* Parent Pickup Requests List at the Top (Sorted strictly by newest first!) */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Your Pickup Requests (Most Recent First)</h4>
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">LIVE AUTO-SYNC</span>
                    </div>

                    {childRequests.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                        No active or historic delegate pickup requests filed.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...childRequests]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map(req => {
                            const reqTime = formatRequestTime(req.createdAt);
                            return (
                              <div 
                                key={req.id} 
                                className={`p-4 rounded-xl border ${
                                  req.adminApproval === 'approved' 
                                    ? 'bg-indigo-50/95 border-indigo-250 shadow-3xs' 
                                    : req.adminApproval === 'rejected' 
                                    ? 'bg-rose-50/90 border-rose-200' 
                                    : 'bg-amber-50/80 border-amber-300'
                                } space-y-2.5 text-left`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="text-xs text-slate-700 leading-tight">
                                    Request for <strong className="text-slate-900 font-extrabold">{req.fullName}</strong> ({req.relationship})
                                    {req.isDelegated && (
                                      <span className="ml-1.5 inline-block bg-amber-500/20 text-amber-955 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase border border-amber-500/30">
                                        DELEGATED
                                      </span>
                                    )}
                                    <div className="text-[11px] text-slate-700 mt-2 bg-white/75 border border-slate-200/60 px-2 py-1 rounded-lg inline-block text-left">
                                      📬 Received: <strong className="font-black text-slate-900">{reqTime.time}</strong> on <strong className="font-black text-slate-900">{reqTime.date}</strong>
                                    </div>
                                  </div>
                                  <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                    req.adminApproval === 'approved' 
                                      ? 'bg-indigo-600 text-white' 
                                      : req.adminApproval === 'rejected' 
                                      ? 'bg-rose-600 text-white' 
                                      : 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
                                  }`}>
                                    {req.adminApproval === 'approved' ? 'Approved' : req.adminApproval === 'rejected' ? 'Rejected' : 'Pending Review'}
                                  </span>
                                </div>

                                {/* Approved OTP Pass */}
                                {req.adminApproval === 'approved' && !req.isUsed && (
                                  <div className="space-y-2 bg-white p-3 rounded-lg border border-indigo-200 shadow-3xs">
                                    <p className="text-[10px] text-slate-700 leading-normal">
                                      ✨ <strong>Gate-Pass OTP:</strong> Give this code to <strong className="font-bold text-slate-900">{req.fullName}</strong> to show at the gates:
                                    </p>
                                    <div className="text-center py-1">
                                      <span className="font-mono text-2xl font-black text-indigo-800 tracking-widest select-all">
                                        {req.otpCode || req.verificationCode}
                                      </span>
                                    </div>
                                    <span className="block text-[8px] text-slate-450 text-center uppercase tracking-wider font-bold">Valid for 24 Hours</span>
                                  </div>
                                )}

                                {/* Pending Review Details */}
                                {req.adminApproval === 'pending' && (
                                  <div className="bg-white/70 text-slate-600 text-[9.5px] p-2 rounded border border-amber-250/50 flex justify-between items-center">
                                    <span>Aadhaar: <strong className="font-mono font-bold text-slate-850">{req.aadhaarNumber}</strong></span>
                                    <span className="font-semibold text-amber-700 animate-pulse">Awaiting School Clearance...</span>
                                  </div>
                                )}

                                {/* Rejected Details */}
                                {req.adminApproval === 'rejected' && (
                                  <p className="text-[10px] text-rose-950 font-medium leading-relaxed">
                                    Administration rejected temporary pickup privileges due to credentials audit mismatch. Please contact the office.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Pickup Requests list header */}

                  {/* Parent ID mini banner link */}
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <History size={15} className="text-slate-500" />
                      <span>Immediate Pickup History</span>
                    </div>
                    <button 
                      onClick={() => setActiveScreen('history')}
                      className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      View All <ArrowRight size={10} />
                    </button>
                  </div>

                  {/* Recent Log display */}
                  <div className="space-y-1.5">
                    {childLogs.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 rounded-lg text-[10px] text-slate-400">
                        No previous student pickup events recorded.
                      </div>
                    ) : (
                      childLogs.slice(0, 2).map(log => (
                        <div key={log.id} className="bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold block text-slate-900">{log.pickupPersonName}</span>
                            <span className="text-[9px] text-slate-400 block">{new Date(log.pickupTime).toLocaleString()}</span>
                          </div>
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">
                            Safe Dispersal
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* Digital Parent Identity Pass Container */}
              {activeScreen === 'idcard' && (
                <div className="space-y-4">
                  
                  {/* Permanent ID card visual component */}
                  <div className="bg-white rounded-2xl border border-slate-250 p-4.5 shadow-sm text-center font-sans space-y-3.5 relative overflow-hidden">
                    
                    {/* Security Watermark tag */}
                    <div className="absolute top-1 transform hover:scale-105 transition right-1 text-[8px] bg-slate-900 text-white font-mono rounded px-1.5 py-0.5 tracking-wider font-bold">
                      PERMANENT SECURE ACCESS
                    </div>

                    {/* School Name Grid */}
                    <div className="text-center border-b border-dashed border-slate-200 pb-2">
                      <h4 className="font-display font-extrabold text-neutral-900 text-[13px] tracking-tight uppercase leading-none">
                        GD GOENKA PUBLIC SCHOOL
                      </h4>
                      <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                        Smart Dispersal Digital Card
                      </p>
                    </div>

                    {/* Photos grid */}
                    <div className="grid grid-cols-3 gap-1.5 items-center justify-center">
                      
                      {/* Pupil photo */}
                      <div className="text-center space-y-1">
                        <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 overflow-hidden mx-auto flex items-center justify-center">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={activeStudent.photo} 
                            alt="Pupil" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">PUPIL</span>
                      </div>

                      {/* Father Avatar */}
                      <div className="text-center space-y-1">
                        <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 overflow-hidden mx-auto flex items-center justify-center">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={activeStudent.fatherPhoto} 
                            alt="Father" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">FATHER</span>
                      </div>

                      {/* Mother Avatar */}
                      <div className="text-center space-y-1">
                        <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 overflow-hidden mx-auto flex items-center justify-center">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={activeStudent.motherPhoto} 
                            alt="Mother" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">MOTHER</span>
                      </div>

                    </div>

                    {/* QR Code Segment */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 max-w-44 mx-auto hover:bg-slate-100 transition duration-300">
                      {qrCodeDataUrl ? (
                        <img 
                          referrerPolicy="no-referrer" 
                          src={qrCodeDataUrl} 
                          alt="Permanent Security QR Code" 
                          className="w-full max-w-36 h-auto mx-auto border border-white"
                        />
                      ) : (
                        <div className="w-36 h-36 mx-auto flex items-center justify-center bg-slate-200 animate-pulse text-[10px] text-slate-400">
                          LOADING Permanent Secure QR
                        </div>
                      )}
                      
                      {/* Sub message */}
                      <p className="text-[9px] font-mono text-slate-500 font-semibold tracking-wider uppercase mt-1.5">
                        SECURE-{activeStudent.id}
                      </p>
                    </div>

                    {/* Student Info Details */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-left text-xs font-semibold">
                      <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-800">
                        <span className="text-slate-450 text-[10px]">Pupil Name</span>
                        <span className="font-bold text-right truncate max-w-28">{activeStudent.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-800">
                        <span className="text-slate-450 text-[10px]">Class & Sec</span>
                        <span>{activeStudent.className} • {activeStudent.section}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-800">
                        <span className="text-slate-450 text-[10px]">Student ID</span>
                        <span className="font-mono text-slate-900">{activeStudent.id}</span>
                      </div>
                      <div className="flex justify-between text-slate-800">
                        <span className="text-slate-450 text-[10px]">Contact</span>
                        <span>{activeStudent.fatherMobile}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2">
                    <button
                      id="btn-back-home"
                      onClick={() => setActiveScreen('dashboard')}
                      className="flex-1 border border-slate-250 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
                    >
                      Back to Home
                    </button>
                    <button
                      id="btn-download-pass"
                      onClick={handleMockDownloadIDCard}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Download size={13} />
                      Download Pass
                    </button>
                  </div>

                </div>
              )}

              {/* Authorize New Pickup Person screen */}
              {activeScreen === 'new_pickup' && (
                <form onSubmit={handleCreatePickupRequest} className="space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xs text-slate-805 uppercase tracking-wider">
                      Temporary Delegate Authorization
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setActiveScreen('dashboard')}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[10.5px] text-slate-600 leading-normal">
                    Authorize a driver, uncle, or family friend to pick up {activeStudent.name}. GD Goenka requires full credentials & Aadhaar for security release.
                  </p>

                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                    
                    {/* Photo upload mock triggers */}
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 leading-none uppercase">Delegate Photo</label>
                        <div className="flex items-center gap-2">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={newPickupPhoto} 
                            alt="Delegate" 
                            className="w-10 h-10 rounded border border-slate-200 object-cover" 
                          />
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="new-delegate-photo" 
                            onChange={(e) => handleTempFileRead(e, 'photo')} 
                            className="hidden" 
                          />
                          <label htmlFor="new-delegate-photo" className="text-[9px] bg-slate-150 p-1.5 rounded cursor-pointer font-bold hover:bg-slate-200">
                            Upload
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 leading-none uppercase">Aadhaar Photo</label>
                        <div className="flex items-center gap-2">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={newPickupAadhaarPhoto} 
                            alt="Aadhaar" 
                            className="w-10 h-6 rounded border border-slate-200 object-cover" 
                          />
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="new-delegate-aadhaar" 
                            onChange={(e) => handleTempFileRead(e, 'aadhaar')} 
                            className="hidden" 
                          />
                          <label htmlFor="new-delegate-aadhaar" className="text-[9px] bg-slate-150 p-1.5 rounded cursor-pointer font-bold hover:bg-slate-200">
                            Upload
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Delegate Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Ramesh Kumar"
                        value={newPickupName}
                        onChange={(e) => setNewPickupName(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Age</label>
                        <input 
                          type="number" 
                          value={newPickupAge}
                          onChange={(e) => setNewPickupAge(Number(e.target.value))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Relation *</label>
                        <select 
                          value={newPickupRelationship}
                          onChange={(e) => setNewPickupRelationship(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white bg-no-repeat"
                        >
                          {["Uncle", "Aunt", "Driver", "Family Friend", "Grand Parent", "Neighbor", "Unknown Person (Delegated)"].map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Number *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. +91 98765 xxxxx"
                        value={newPickupMobile}
                        onChange={(e) => setNewPickupMobile(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address (To Receive Security OTP)</label>
                      <input 
                        type="email" 
                        placeholder="delegate@example.com (optional)"
                        value={newPickupEmail}
                        onChange={(e) => setNewPickupEmail(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Aadhaar Card No. *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="xxxx - xxxx - 8492"
                        value={newPickupAadhaar}
                        onChange={(e) => setNewPickupAadhaar(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Notes / Instructions</label>
                      <textarea 
                        rows={2}
                        placeholder="e.g. Uncle coming in red i10"
                        value={newPickupNotes}
                        onChange={(e) => setNewPickupNotes(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>

                  </div>

                  <button
                    id="btn-submit-pickup"
                    type="submit"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition duration-300 shadow-sm uppercase tracking-wider"
                  >
                    Submit Clearance Request
                  </button>

                </form>
              )}

              {/* Complete history screen */}
              {activeScreen === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xs text-slate-805 uppercase tracking-wider">
                      Student Pickup Audits
                    </h3>
                    <button 
                      onClick={() => setActiveScreen('dashboard')}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      Back
                    </button>
                  </div>

                  <div className="space-y-2">
                    {childLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium">
                        No previous dispersed handovers on record.
                      </div>
                    ) : (
                      childLogs.map(log => (
                        <div key={log.id} className="bg-white border border-slate-220 p-3.5 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-mono text-slate-400">{log.id}</span>
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">
                              Dispersed Handover
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2.5">
                            <img 
                              referrerPolicy="no-referrer" 
                              src={log.pickupPersonPhoto} 
                              alt="Person" 
                              className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" 
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{log.pickupPersonName}</div>
                              <div className="text-[10px] text-slate-500">Relationship: {log.relationship}</div>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-1.5 mt-1.5 text-[9.5px] text-slate-650 grid grid-cols-2 gap-1 font-medium">
                            <div>🕒 {new Date(log.pickupTime).toLocaleString()}</div>
                            <div className="text-right">🏡 {log.gateNumber} • {log.verificationMethod}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Notifications Center screens inside Mob */}
              {activeScreen === 'notifications' && (
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-xs text-slate-820 uppercase tracking-wider">
                      Notifications Box
                    </h3>
                    <button 
                      onClick={() => {
                        // Mark all as read
                        setNotifications(prev => prev.map(n => n.studentId === activeStudent.id ? { ...n, isRead: true } : n));
                        setActiveScreen('dashboard');
                      }}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      Home
                    </button>
                  </div>

                  <div className="space-y-2">
                    {notifications.filter(n => n.studentId === activeStudent.id).length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium bg-slate-100/50 rounded-xl">
                        No app alerts on record.
                      </div>
                    ) : (
                      [...notifications]
                        .filter(n => n.studentId === activeStudent.id)
                        .reverse()
                        .map(notif => (
                          <div 
                            key={notif.id} 
                            className={`p-3 rounded-xl border text-xs shadow-3xs transition ${
                              notif.isRead ? 'bg-white border-slate-200 text-slate-700' : 'bg-emerald-50/75 border-emerald-250 text-slate-900'
                            }`}
                          >
                            <div className="flex justify-between items-start font-bold">
                              <span>{notif.title}</span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10.5px] mt-1 text-slate-600 leading-relaxed font-semibold">
                              {notif.body}
                            </p>
                          </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Profile Config Settings */}
              {activeScreen === 'profile' && (
                <form onSubmit={handleSaveContactConfig} className="space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wider">
                      Parent Identity Configuration
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setActiveScreen('dashboard')}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      Back
                    </button>
                  </div>

                  <div className="space-y-3.5 bg-white p-4.5 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                      Continuous Photo Audit
                    </h4>

                    {photoUpdateMessage && (
                      <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2.5 rounded font-bold">
                        {photoUpdateMessage}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="space-y-1 text-center">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={activeStudent.fatherPhoto} 
                          alt="Father" 
                          className="w-12 h-12 rounded-full border border-slate-200 object-cover mx-auto" 
                        />
                        <span className="block text-[9px] font-bold text-slate-450 uppercase mt-1">Father Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="father-avatar" 
                          className="hidden" 
                          onChange={(e) => handleParentPhotoUpload(e, 'father')} 
                        />
                        <label htmlFor="father-avatar" className="inline-block text-[9px] bg-slate-100 text-slate-700 px-2 py-1 rounded cursor-pointer font-bold hover:bg-slate-200">
                          Update Photo
                        </label>
                      </div>

                      <div className="space-y-1 text-center">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={activeStudent.motherPhoto} 
                          alt="Mother" 
                          className="w-12 h-12 rounded-full border border-slate-200 object-cover mx-auto" 
                        />
                        <span className="block text-[9px] font-bold text-slate-500 uppercase mt-1">Mother Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="mother-avatar" 
                          className="hidden" 
                          onChange={(e) => handleParentPhotoUpload(e, 'mother')} 
                        />
                        <label htmlFor="mother-avatar" className="inline-block text-[9px] bg-slate-100 text-slate-700 px-2 py-1 rounded cursor-pointer font-bold hover:bg-slate-200">
                          Update Photo
                        </label>
                      </div>
                    </div>

                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 pt-2">
                      Notification Preferences
                    </h4>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Primary Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={primaryEmail}
                          onChange={(e) => setPrimaryEmail(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Primary Mobile Number</label>
                        <input 
                          type="text" 
                          required
                          value={primaryMobile}
                          onChange={(e) => setPrimaryMobile(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>
                    </div>

                    <h4 className="text-[10px] font-bold text-[#0b3294] uppercase tracking-wider border-b border-slate-100 pb-1 pt-2">
                      Child's Information Settings
                    </h4>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Child's Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={childName}
                          onChange={(e) => setChildName(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Child's Date of Birth</label>
                        <input 
                          type="date" 
                          required
                          value={childDob}
                          onChange={(e) => setChildDob(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Home Address</label>
                        <textarea 
                          rows={2}
                          required
                          value={childAddress}
                          onChange={(e) => setChildAddress(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Father's Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={childFatherName}
                          onChange={(e) => setChildFatherName(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Mother's Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={childMotherName}
                          onChange={(e) => setChildMotherName(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Mother's Mobile Number</label>
                        <input 
                          type="text" 
                          required
                          value={childMotherMobile}
                          onChange={(e) => setChildMotherMobile(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Mother's Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={childMotherEmail}
                          onChange={(e) => setChildMotherEmail(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3.5">
                      <label className="block text-[10px] font-bold text-emerald-850 uppercase tracking-wide">Change Portal Login Password</label>
                      <input 
                        type="text" 
                        required
                        value={parentPassword}
                        onChange={(e) => setParentPasswordInternal(e.target.value)}
                        className="w-full text-xs p-2 bg-emerald-50/30 border border-emerald-250 rounded-lg focus:bg-white font-mono mt-1"
                        placeholder="Change or keep password"
                      />
                        <span className="block text-[9px] text-slate-400 mt-1 font-semibold">
                          Default password is your child's Admission Number. You can change it here or retain it.
                        </span>
                      </div>
                    </div>

                  <button
                    id="btn-save-parent-profile-settings"
                    type="submit"
                    className="w-full bg-emerald-750 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition duration-300 shadow-sm"
                  >
                    Save Changes
                  </button>

                </form>
              )}

      </div>

      {/* Modern Material Design 3 Bottom Navigation bar */}
      <div className="bg-white border-t border-slate-150 px-3 py-2 flex items-center justify-around sticky bottom-0 z-10 shrink-0 shadow-lg">
        <button
          id="mob-nav-home"
          onClick={() => setActiveScreen('dashboard')}
          className={`flex flex-col items-center p-1.5 transition ${activeScreen === 'dashboard' ? 'text-[#0b3294] font-black scale-102' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <Smartphone size={17} />
          <span className="text-[9.5px] mt-0.5">Home</span>
        </button>
        <button
          id="mob-nav-pass"
          onClick={() => setActiveScreen('idcard')}
          className={`flex flex-col items-center p-1.5 transition ${activeScreen === 'idcard' ? 'text-[#0b3294] font-black scale-102' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <CreditCard size={17} />
          <span className="text-[9.5px] mt-0.5">ID Pass</span>
        </button>
        <button
          id="mob-nav-temp"
          onClick={() => setActiveScreen('new_pickup')}
          className={`flex flex-col items-center p-1.5 transition ${activeScreen === 'new_pickup' ? 'text-[#0b3294] font-black scale-102' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <UserPlus size={17} />
          <span className="text-[9.5px] mt-0.5">Delegate</span>
        </button>
        <button
          id="mob-nav-profile"
          onClick={() => setActiveScreen('profile')}
          className={`flex flex-col items-center p-1.5 transition ${activeScreen === 'profile' ? 'text-[#0b3294] font-black scale-102' : 'text-slate-400 hover:text-slate-700'}`}
        >
          <Settings size={17} />
          <span className="text-[9.5px] mt-0.5">Settings</span>
        </button>
      </div>

    </div>
  );
}
