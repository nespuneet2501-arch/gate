import React, { useState } from 'react';
import { Student, SecurityLog, PickupRequest } from '../types';
import { 
  Upload, Search, Edit2, Calendar, MapPin, User, Mail, Phone, FileSpreadsheet, 
  Trash2, Shield, ArrowDownToLine, RefreshCw, AlertCircle, CheckCircle, FileText,
  CloudLightning, Database, Copy, Check
} from 'lucide-react';
import { sampleExcelCSVData, svgAvatars } from '../mockData';

interface AdminPanelProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  securityLogs: SecurityLog[];
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
  pickupRequests: PickupRequest[];
  setPickupRequests: React.Dispatch<React.SetStateAction<PickupRequest[]>>;
  addNotification: (title: string, body: string, type: 'pickup_request' | 'pickup_confirm' | 'system', studentId?: string) => void;
  addEmail: (to: string, subject: string, body: string) => void;
}

export default function AdminPanel({
  students,
  setStudents,
  securityLogs,
  setSecurityLogs,
  pickupRequests,
  setPickupRequests,
  addNotification,
  addEmail
}: AdminPanelProps) {
  // Tabs: 'students' | 'logs' | 'new_pickups' | 'config'
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'logs' | 'new_pickups' | 'config'>('students');
  const [sqlCopied, setSqlCopied] = useState(false);

  // Administrative credential change state management
  const [adminUsername, setAdminUsername] = useState(localStorage.getItem('goenka_principal_username') || 'admin');
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('goenka_principal_password') || 'admin123');
  const [teacherUsername, setTeacherUsername] = useState(localStorage.getItem('goenka_teacher_username') || 'teacher');
  const [teacherPassword, setTeacherPassword] = useState(localStorage.getItem('goenka_teacher_password') || 'teacher123');
  const [configSuccess, setConfigSuccess] = useState('');

  // Save new administrative credential pairs to persistent LocalStorage
  const handleSaveStaffCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('goenka_principal_username', adminUsername.trim());
    localStorage.setItem('goenka_principal_password', adminPassword);
    localStorage.setItem('goenka_teacher_username', teacherUsername.trim());
    localStorage.setItem('goenka_teacher_password', teacherPassword);
    setConfigSuccess('Principal & Advisor portal passwords updated successfully!');
    addNotification("Staff Security Updated", "Faculty gatekeeper portal login credentials and security salt values modified successfully.", "system");
    setTimeout(() => setConfigSuccess(''), 4000);
  };

  const handleAdminClearance = (reqId: string, action: 'approved' | 'rejected') => {
    const generatedOtp = Math.floor(100000 + Math.random() * 901500).toString(); // e.g. "821503"
    
    setPickupRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return {
          ...req,
          status: action === 'approved' ? 'approved' : 'rejected',
          adminApproval: action,
          approvedByRole: 'principal',
          approvedByName: 'Principal Dr. R. K. Goenka',
          adminVerificationTime: new Date().toISOString(),
          otpCode: action === 'approved' ? generatedOtp : undefined,
          verificationCode: action === 'approved' ? generatedOtp : req.verificationCode,
          codeExpiresAt: action === 'approved' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : req.codeExpiresAt
        };
      }
      return req;
    }));

    const req = pickupRequests.find(r => r.id === reqId);
    if (req) {
      const student = students.find(s => s.id === req.studentId);
      if (action === 'approved') {
        addNotification(
          "Principal Clearance Approved",
          `Delegate ${req.fullName} verified & authorized by Principal for student pickup.`,
          'system',
          req.studentId
        );
        
        const delegateMail = req.email || `${req.fullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
        
        // Dispatch email containing the OTP Code to the parent's email as well
        addEmail(
          student?.fatherEmail || 'parent@gmail.com',
          "GD GOENKA SECURITY: Secure Gate Pass Code Generated",
          `Dear Parent,\n\nThe school administration has verified and APPROVED the security clearance for your designated pickup person, ${req.fullName} (${req.relationship}), to pick up your child, ${student?.name || 'pupil'} (Class ${student?.className || 'N/A'}).\n\nYOUR SECURE GATE PASS CODE IS: ${generatedOtp}\n\nWe have sent this code directly to your parent app and your email. Please share this code with ${req.fullName} (the visitor) to present to the security gate personnel upon arrival. Gate personnel will verify this code through the security terminal to confirm authenticity.\n\nWarm regards,\nDr. R. K. Goenka\nPrincipal, GD Goenka School`
        );

        // Also notify the visitor/delegate of their pre-authorization with instructions to request the code from parent
        addEmail(
          delegateMail,
          "GD GOENKA DISPERSAL: Pre-Authorization Granted",
          `Dear ${req.fullName},\n\nThe Principal of GD Goenka School has authorized your security clearance as a new pickup individual for student ${student?.name || 'child'}.\n\nA secure 6-digit Gate Pass Code has been generated and sent directly to the child's Parent App & Parent Email.\n\nPlease obtain this verification code from the parent and present it to the security gate officers at the school entrance to authenticate your pickup permission.\n\nWarm regards,\nGD Goenka Administration`
        );
      } else {
        addNotification(
          "Admin Clearance Rejected",
          `Delegate registration for ${req.fullName} has been declined by the School Principal.`,
          'system',
          req.studentId
        );
      }
    }
  };

  const [studentSearch, setStudentSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  
  // Create / Edit Student state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  // File drag-and-drop feedback
  const [isDragging, setIsDragging] = useState(false);

  // Parse CSV string into students
  const handleParseCSV = (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header and at least one data row.');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newStudents: Student[] = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        // simple CSV parsing handling comma
        const values = currentLine.split(',').map(v => v.trim());
        
        // Find columns
        const stuId = values[0] || `STU${Math.floor(1000 + Math.random() * 9000)}`;
        const admNum = values[1] || `ADM${Date.now().toString().slice(-6)}${i}`;
        const name = values[2] || 'Unknown Student';
        const className = values[3] || 'Class 1';
        const section = values[4] || 'Section A';
        const dob = values[5] || '2018-01-01';
        const address = values[6] || 'School Campus';
        const fatherName = values[7] || 'Father';
        const motherName = values[8] || 'Mother';
        const fatherEmail = values[9] || 'father@example.com';
        const motherEmail = values[10] || 'mother@example.com';
        const fatherMobile = values[11] || '+91 99999 99999';
        const motherMobile = values[12] || '+91 99999 88888';

        // Custom default avatars for newly imported students
        const idHash = stuId.charCodeAt(stuId.length - 1) || 0;
        const studentHue = (idHash * 40) % 360;
        const parentHue = (idHash * 85) % 360;
        
        const customStudentPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${studentHue}, 80%, 93%)"/><circle cx="50" cy="40" r="21" fill="hsl(${studentHue}, 80%, 40%)"/><path d="M16 85 C 22 62, 78 62, 84 85 Z" fill="hsl(${studentHue}, 80%, 30%)"/><circle cx="43" cy="38" r="3" fill="white"/><circle cx="57" cy="38" r="3" fill="white"/><path d="M44 50 Q50 54 56 50" stroke="white" stroke-width="2.5" fill="none"/></svg>`;
        const customFatherPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${parentHue}, 70%, 95%)"/><circle cx="50" cy="38" r="20" fill="hsl(${parentHue}, 70%, 35%)"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="hsl(${parentHue}, 70%, 25%)"/><path d="M40 38 L45 38" stroke="white" stroke-width="2"/><path d="M55 38 L60 38" stroke="white" stroke-width="2"/><path d="M45 48 Q50 52 55 48" stroke="white" stroke-width="2" fill="none"/></svg>`;
        const customMotherPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${(parentHue + 120) % 360}, 70%, 95%)"/><circle cx="50" cy="38" r="18" fill="hsl(${(parentHue + 120) % 360}, 70%, 45%)"/><path d="M20 84 C 24 60, 76 60, 80 84 Z" fill="hsl(${(parentHue + 120) % 360}, 70%, 35%)"/><circle cx="43" cy="36" r="2.5" fill="white"/><circle cx="57" cy="36" r="2.5" fill="white"/><path d="M42 46 Q50 51 58 46" stroke="white" stroke-width="2" fill="none"/><path d="M35 34 C 40 20, 60 20, 65 34 Z" fill="hsl(${(parentHue + 120) % 360}, 70%, 15%)"/></svg>`;

        newStudents.push({
          id: stuId,
          admissionNumber: admNum,
          name,
          className,
          section,
          dob,
          address,
          photo: customStudentPhoto,
          fatherName,
          motherName,
          fatherEmail,
          motherEmail,
          fatherMobile,
          motherMobile,
          fatherPhoto: customFatherPhoto,
          motherPhoto: customMotherPhoto
        });
      }

      setStudents(prev => {
        // filter out matches or just combine
        const existingIds = new Set(prev.map(s => s.id));
        const filteredNew = newStudents.filter(s => !existingIds.has(s.id));
        return [...prev, ...filteredNew];
      });

      setCsvSuccess(`Successfully imported ${newStudents.length} students. Parent accounts generated automatically.`);
      setCsvError('');
      setCsvText('');

      addNotification(
        "Student Database Updated", 
        `Imported ${newStudents.length} new student records from Excel. Parent credentials created.`, 
        'system'
      );
    } catch (err: any) {
      setCsvError(err.message || 'Invalid CSV file format.');
      setCsvSuccess('');
    }
  };

  // Drag and drop handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          handleParseCSV(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Upload trigger
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          handleParseCSV(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadDemoCSV = () => {
    setCsvText(sampleExcelCSVData);
    setCsvError('');
    setCsvSuccess('');
  };

  // Photo updates via FileReader (capturing custom images)
  const handleAvatarUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    target: 'photo' | 'fatherPhoto' | 'motherPhoto'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          setStudentForm(prev => ({ ...prev, [target]: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save student form
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.id) {
      alert("Student Name and ID are required.");
      return;
    }

    if (isAddingStudent) {
      setStudents(prev => [...prev, studentForm as Student]);
      addNotification("New Profile Created", `Student ${studentForm.name} added to Database by School Registrar.`, "system");
    } else {
      setStudents(prev => prev.map(s => s.id === studentForm.id ? { ...s, ...studentForm } as Student : s));
      addNotification("Student Profile Updated", `Admin updated profile for ${studentForm.name}.`, "system");
    }

    setEditingStudent(null);
    setIsAddingStudent(false);
    setStudentForm({});
  };

  // Delete student record
  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete student ${name}? This will revoke parent access.`)) {
      setStudents(prev => prev.filter(s => s.id !== id));
      addNotification("Record Deleted", `Removed student record & linked parents for ${name}.`, "system");
    }
  };

  // Export Log CSV
  const exportLogsToCSV = () => {
    const headers = ["Log ID,Pickup Time,Student ID,Student Name,Class,Section,Verified Person,Relationship,Gate,Officer,Method,Status"];
    const rows = securityLogs.map(log => 
      `"${log.id}","${log.pickupTime}","${log.studentId}","${log.studentName}","${log.className}","${log.section}","${log.pickupPersonName}","${log.relationship}","${log.gateNumber}","${log.securityStaffName}","${log.verificationMethod}","${log.status}"`
    );
    const content = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `goenka_pickup_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students or logs
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.fatherName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.motherName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.className.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredLogs = securityLogs.filter(log => 
    log.studentName.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.pickupPersonName.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.gateNumber.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.status.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div id="admin-panel-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Shield size={200} className="text-slate-200 transform translate-x-12 -translate-y-8" />
        </div>
        <span className="bg-emerald-500/15 text-emerald-400 font-mono text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest font-semibold">
          Secure Core
        </span>
        <h2 className="text-2xl md:text-3xl font-display font-bold mt-3">School Registrar Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
          Import pupils, manage parents, verify logs, authorize audit updates, and track daily safe dispersal stats.
        </p>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px">
        <button
          id="tab-students"
          onClick={() => { setActiveSubTab('students'); setIsAddingStudent(false); setEditingStudent(null); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'students' 
              ? 'border-emerald-600 text-emerald-700 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={16} />
          Student & Parent Database
        </button>
        <button
          id="tab-logs"
          onClick={() => { setActiveSubTab('logs'); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'logs' 
              ? 'border-emerald-600 text-emerald-700 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield size={16} />
          Security Access Audit Trail
        </button>
        <button
          id="tab-new-pickups"
          onClick={() => { setActiveSubTab('new_pickups'); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'new_pickups' 
              ? 'border-emerald-600 text-emerald-700 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle size={16} />
          New Person Authorization Logs
          {pickupRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold">
              {pickupRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          id="tab-config"
          onClick={() => { setActiveSubTab('config'); }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'config' 
              ? 'border-emerald-600 text-emerald-700 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={16} />
          <span>Config & Password Settings</span>
        </button>
      </div>

      {/* Database & CSV Upload Tab */}
      {activeSubTab === 'students' && !editingStudent && !isAddingStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CSV Excel Importer Panel */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
            <h3 className="font-display font-bold text-slate-950 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={18} />
              Excel / CSV Student Bulk Import
            </h3>
            <p className="text-xs text-slate-600">
              Upload the standard GC Goenka pupil layout to automatically create profiles and configure parent permanent credentials.
            </p>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input 
                id="excel-file-upload-input"
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-sm font-semibold text-slate-900">Drag & Drop Excel CSV</p>
              <p className="text-xs text-slate-400 mt-1">or click to browse your desktop files</p>
            </div>

            <div className="flex gap-2">
              <button
                id="btn-load-sample"
                type="button"
                onClick={handleLoadDemoCSV}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 font-medium rounded-lg transition"
              >
                Load Sample CSV
              </button>
              <button
                id="btn-show-help"
                type="button"
                onClick={() => setShowCsvHelp(!showCsvHelp)}
                className="text-slate-500 border border-slate-200 hover:bg-slate-50 text-xs px-2.5 py-1.5 rounded-lg transition"
              >
                Show Schema Fields
              </button>
            </div>

            {showCsvHelp && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-slate-700">
                <strong>Headers Required:</strong><br />
                Student ID, Admission Number, Student Name, Class, Section, Date of Birth, Address, Father Name, Mother Name, Father Email, Mother Email, Father Mobile, Mother Mobile
              </div>
            )}

            {csvText && (
              <div className="space-y-2">
                <textarea
                  id="textarea-csv-editor"
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste raw CSV text here..."
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
                <button
                  id="btn-import-raw-csv"
                  onClick={() => handleParseCSV(csvText)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs py-2 font-semibold rounded-lg transition shadow-sm"
                >
                  Parse & Core Import Students
                </button>
              </div>
            )}

            {csvError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex gap-2">
                <AlertCircle className="shrink-0 text-rose-600" size={16} />
                <span>{csvError}</span>
              </div>
            )}

            {csvSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex gap-2">
                <CheckCircle className="shrink-0 text-emerald-600" size={16} />
                <span>{csvSuccess}</span>
              </div>
            )}

            {/* Simulated Parent Credentials display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5">
              <h4 className="text-xs font-bold font-display text-slate-800 flex items-center justify-between mb-2">
                <span>⚡ Simulated Parent Logins</span>
                <span className="text-[10px] text-emerald-600 font-mono">No SMS OTP Costs</span>
              </h4>
              <p className="text-[11px] text-slate-600 mb-2">
                Use these emails in the Parent Mobile view to switch profiles:
              </p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {students.map(s => (
                  <div key={s.id} className="text-[10px] bg-white border border-slate-100 p-2 rounded hover:shadow-xs transition">
                    <div className="font-bold text-slate-800 flex justify-between">
                      <span>{s.name} Parent</span>
                      <span className="text-slate-400">{s.id}</span>
                    </div>
                    <div className="text-slate-500 font-mono mt-0.5 truncate">{s.fatherEmail}</div>
                    <div className="text-slate-500 font-mono truncate">{s.motherEmail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Grid / Search */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <h3 className="font-display font-bold text-slate-950 flex items-center gap-2">
                Pupil Directory
                <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full font-sans font-medium">
                  {students.length} Total
                </span>
              </h3>
              
              <button
                id="btn-add-pupil"
                onClick={() => {
                  setStudentForm({
                    id: `STU${Math.floor(1000 + Math.random() * 9000)}`,
                    admissionNumber: `ADM2026${Math.floor(100 + Math.random() * 900)}`,
                    name: '',
                    className: 'Class 4',
                    section: 'Section A',
                    dob: '2016-01-01',
                    address: '',
                    photo: svgAvatars.student1,
                    fatherName: '',
                    motherName: '',
                    fatherEmail: '',
                    motherEmail: '',
                    fatherMobile: '',
                    motherMobile: '',
                    fatherPhoto: svgAvatars.father1,
                    motherPhoto: svgAvatars.mother1
                  });
                  setIsAddingStudent(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5 font-bold rounded-lg transition"
              >
                + Register New Pupil
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search size={16} />
              </span>
              <input
                id="student-search-input"
                type="text"
                placeholder="Search by student name, ID, class, or parent name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Student list */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                <p className="text-sm font-medium">No student records match "{studentSearch}"</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting your search query or upload students above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map(student => (
                  <div 
                    key={student.id} 
                    className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 p-4 rounded-xl flex flex-col justify-between transition group shadow-xs"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 bg-white rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={student.photo} 
                          alt={student.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <h4 className="font-bold text-slate-950 text-sm truncate font-display">{student.name}</h4>
                          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold shrink-0">
                            {student.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {student.className} • {student.section}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Adm: {student.admissionNumber}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-3 pt-2.5 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <div>
                        <span className="font-semibold block text-[10px] text-slate-400 uppercase tracking-wider">Father</span>
                        <span className="truncate block font-medium">{student.fatherName || 'Not Set'}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[10px] text-slate-400 uppercase tracking-wider">Mother</span>
                        <span className="truncate block font-medium">{student.motherName || 'Not Set'}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setStudentForm(student);
                          setIsAddingStudent(false);
                          setEditingStudent(student);
                        }}
                        className="text-slate-700 border border-slate-250 hover:bg-slate-100 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit2 size={12} />
                        Edit Profile / Photos
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="text-rose-600 border border-rose-100 hover:bg-rose-50 p-1.5 rounded-md text-xs transition"
                        title="Delete Student"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editing / Adding student form */}
      {(editingStudent || isAddingStudent) && (
        <form onSubmit={handleSaveStudent} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-display font-bold text-slate-900 text-lg">
              {isAddingStudent ? 'Add New Student Record' : `Edit Student: ${studentForm.name}`}
            </h3>
            <button
              type="button"
              onClick={() => { setEditingStudent(null); setIsAddingStudent(false); setStudentForm({}); }}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PHOTO UPLOADER COLUMN */}
            <div className="space-y-4 md:border-r md:border-slate-100 md:pr-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Photos Management</h4>
              
              {/* Pupil Photo */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Pupil Photograph</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={studentForm.photo || svgAvatars.student1} 
                      alt="Pupil" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="pupil-photo-upload"
                      onChange={(e) => handleAvatarUpload(e, 'photo')} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="pupil-photo-upload" 
                      className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold transition"
                    >
                      Upload Custom
                    </label>
                  </div>
                </div>
              </div>

              {/* Father Photo */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">Father's Photograph</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={studentForm.fatherPhoto || svgAvatars.father1} 
                      alt="Father" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="father-photo-upload"
                      onChange={(e) => handleAvatarUpload(e, 'fatherPhoto')} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="father-photo-upload" 
                      className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold transition"
                    >
                      Upload Custom
                    </label>
                  </div>
                </div>
              </div>

              {/* Mother Photo */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">Mother's Photograph</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={studentForm.motherPhoto || svgAvatars.mother1} 
                      alt="Mother" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="mother-photo-upload"
                      onChange={(e) => handleAvatarUpload(e, 'motherPhoto')} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="mother-photo-upload" 
                      className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold transition"
                    >
                      Upload Custom
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* PUPIL AND PARENTS DATA COLUMNS */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="sm:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Information</h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID * (Unique code)</label>
                <input
                  type="text"
                  required
                  disabled={!isAddingStudent}
                  placeholder="e.g. STU3004"
                  value={studentForm.id || ''}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 font-mono disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM20261122"
                  value={studentForm.admissionNumber || ''}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, admissionNumber: e.target.value }))}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ishita Mehra"
                  value={studentForm.name || ''}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={studentForm.className || 'Class 4'}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, className: e.target.value }))}
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    {["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={studentForm.section || 'Section A'}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, section: e.target.value }))}
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    {["Section A", "Section B", "Section C", "Section D"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={studentForm.dob || '2016-01-01'}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, dob: e.target.value }))}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. Row House 5, New Delhi"
                  value={studentForm.address || ''}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Guardians & Contacts</h4>
              </div>

              {/* FATHER */}
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block">Father Detail</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Father's Name</label>
                  <input
                    type="text"
                    placeholder="Father Name"
                    value={studentForm.fatherName || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, fatherName: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Father's Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 xxxxx xxxxx"
                    value={studentForm.fatherMobile || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, fatherMobile: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Father's Email</label>
                  <input
                    type="email"
                    placeholder="father@domain.com"
                    value={studentForm.fatherEmail || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, fatherEmail: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
              </div>

              {/* MOTHER */}
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <span className="text-[11px] font-bold text-pink-800 uppercase tracking-widest block">Mother Detail</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mother's Name</label>
                  <input
                    type="text"
                    placeholder="Mother Name"
                    value={studentForm.motherName || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, motherName: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mother's Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 xxxxx xxxxx"
                    value={studentForm.motherMobile || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, motherMobile: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mother's Email</label>
                  <input
                    type="email"
                    placeholder="mother@domain.com"
                    value={studentForm.motherEmail || ''}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, motherEmail: e.target.value }))}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => { setEditingStudent(null); setIsAddingStudent(false); setStudentForm({}); }}
              className="text-slate-600 hover:bg-slate-100 text-xs px-4 py-2 font-bold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-5 py-2 font-bold rounded-lg transition shadow-sm"
            >
              Save Student Record
            </button>
          </div>
        </form>
      )}

      {/* Access Audit Trail Log Tab */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-950 flex items-center gap-2 text-lg">
                Safe Dispersal Live Logs & Audit Trails
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Every scan and temp-approved handover event is recorded permanently in the logs below.
              </p>
            </div>

            <button
              id="btn-export-reports"
              onClick={exportLogsToCSV}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap self-start"
            >
              <ArrowDownToLine size={14} />
              Export Reports (CSV)
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search size={16} />
            </span>
            <input
              id="log-search-input"
              type="text"
              placeholder="Filter audits by student name, pickup person, gate, or status (e.g., AUTHORIZED or NOT_AUTHORIZED)..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3.5">Dispersal Timestamp</th>
                  <th className="p-3.5">Student Details</th>
                  <th className="p-3.5">Dispersal Person</th>
                  <th className="p-3.5">Verification Method / Gate / Officer</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No matching log events recorded in system.
                    </td>
                  </tr>
                ) : (
                  [...filteredLogs].sort((a,b) => b.pickupTime.localeCompare(a.pickupTime)).map(log => {
                    const statusConfig = {
                      AUTHORIZED: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'APPROVED PARENT' },
                      TEMPORARY_APPROVED: { bg: 'bg-amber-50 text-amber-850 border-amber-100', label: 'TEMP DELEGATE' },
                      NOT_AUTHORIZED: { bg: 'bg-rose-50 text-rose-800 border-rose-100', label: 'UNAUTHORIZED BLOCKED' }
                    };
                    const cfg = statusConfig[log.status] || { bg: 'bg-slate-50 text-slate-800 border-slate-100', label: log.status };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {new Date(log.pickupTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(log.pickupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{log.studentName}</div>
                          <div className="text-[10px] text-slate-500">{log.className} • {log.section} • {log.studentId}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <img 
                              referrerPolicy="no-referrer" 
                              src={log.pickupPersonPhoto} 
                              alt={log.pickupPersonName} 
                              className="w-7 h-7 rounded-full object-cover border border-slate-200" 
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{log.pickupPersonName}</div>
                              <div className="text-[10px] text-slate-400">{log.relationship}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{log.verificationMethod}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            {log.gateNumber} • verified by {log.securityStaffName}
                          </div>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Temporary Pickup Request Log / Approval Tab */}
      {activeSubTab === 'new_pickups' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-940 text-lg">
              Parent Delegation Clearances & Temporary Approved Lists
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Parents generate temporary codes from their application which populate here automatically for verification.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pickupRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active temporary pickup approvals generated in the last 24 hours.
              </div>
            ) : (
              [...pickupRequests].reverse().map(req => {
                const student = students.find(s => s.id === req.studentId);
                return (
                  <div 
                    key={req.id} 
                    className="border border-slate-200 bg-slate-50/40 p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center hover:border-slate-300 transition"
                  >
                    
                    {/* Delegation details */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={req.photograph} 
                          alt={req.fullName} 
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" 
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{req.fullName}</span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
                              {req.relationship}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Age: {req.age} • Mob: {req.mobileNumber}</div>
                          <div className="text-[11px] text-slate-400">Aadhaar: {req.aadhaarNumber}</div>
                        </div>
                      </div>

                      {req.notes && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                          " {req.notes} "
                        </div>
                      )}
                    </div>

                    {/* Pupil details */}
                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Pupil linked</span>
                      <div className="flex items-center gap-2">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={student?.photo || svgAvatars.student1} 
                          alt={student?.name} 
                          className="w-8 h-8 rounded-full border border-slate-200 object-cover" 
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{student?.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{student?.className} • {student?.section}</div>
                        </div>
                      </div>
                    </div>

                    {/* Authorization status */}
                    <div className="flex flex-col items-end md:items-end sm:items-start space-y-3 justify-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Workflow Status</span>
                      {req.status === 'pending' ? (
                        <div className="text-right sm:text-left">
                          <span className="inline-block bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md animate-pulse">
                            AWAITING PARENT APPROVAL
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">Verification Code pending approval</span>
                        </div>
                      ) : req.status === 'approved' ? (
                        <div className="text-right sm:text-left space-y-2 w-full md:w-auto">
                          <div className="space-y-1">
                            <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                              APPROVED BY PARENT
                            </span>
                            <div className="text-xs font-bold text-slate-900 flex items-center justify-end sm:justify-start gap-1">
                              CODE: <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{req.verificationCode}</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-150 pt-2 space-y-1 text-right sm:text-left">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">School Clearance Status</span>
                            {req.adminApproval === 'approved' ? (
                              <div className="space-y-1 text-right sm:text-left">
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md">
                                  <CheckCircle size={12} className="shrink-0" />
                                  PRINCIPAL CLEARANCE GRANTED
                                </span>
                                <span className="block text-[9.5px] font-medium text-slate-400 mt-0.5">Authorized by {req.approvedByName}</span>
                                {req.otpCode && (
                                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-1">
                                    <span>EMAIL OTP Code:</span>
                                    <span className="font-mono bg-white px-1 py-0.3 border border-slate-300 text-emerald-800 rounded select-all font-black">{req.otpCode}</span>
                                  </div>
                                )}
                              </div>
                            ) : req.adminApproval === 'rejected' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md">
                                  <AlertCircle size={12} className="shrink-0" />
                                  REJECTED BY ADMIN
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2 text-[10px] font-inter font-semibold text-amber-900 text-left leading-normal max-w-[200px]">
                                  ⚠️ Unknown Individual. Complete card validation checks before authorizing.
                                </div>
                                <div className="flex gap-2 justify-end sm:justify-start">
                                  <button
                                    onClick={() => handleAdminClearance(req.id, 'rejected')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-black transition cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => handleAdminClearance(req.id, 'approved')}
                                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded text-[10px] transition shadow-xs cursor-pointer"
                                  >
                                    Verify & Authorize
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-block bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                          REJECTED BY PARENT
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'config' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl animate-fade-in space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Portal Security & Credentials Config</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure and change the system usernames and passwords for Faculty Administration (Principal and Teachers).
            </p>
          </div>

          <form onSubmit={handleSaveStaffCredentials} className="space-y-5">
            {configSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={15} className="shrink-0 text-emerald-600" />
                <span>{configSuccess}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center gap-1.5 font-mono text-[#0b3294]">
                👑 Principal Account Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Username</label>
                  <input 
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg font-mono focus:outline-none focus:border-[#0b3294] mt-1"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Password</label>
                  <input 
                    type="text"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg font-mono focus:outline-none focus:border-[#0b3294] mt-1"
                    placeholder="admin123"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center gap-1.5 font-mono text-[#0b3294]">
                🏫 Teacher / Advisor Account Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Username</label>
                  <input 
                    type="text"
                    required
                    value={teacherUsername}
                    onChange={(e) => setTeacherUsername(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg font-mono focus:outline-none focus:border-[#0b3294] mt-1"
                    placeholder="teacher"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Password</label>
                  <input 
                    type="text"
                    required
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded-lg font-mono focus:outline-none focus:border-[#0b3294] mt-1"
                    placeholder="teacher123"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="submit"
                className="bg-[#0b3294] hover:bg-[#0b3294]/85 hover:scale-[1.01] active:scale-[0.99] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition duration-300 shadow-sm cursor-pointer uppercase tracking-wider"
              >
                Save Staff Credentials
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
