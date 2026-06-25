import React, { useState, useEffect } from 'react';
import { Student, SecurityLog, PickupRequest } from '../types';
import { 
  Scan, ShieldCheck, HelpCircle, Check, X, AlertTriangle, Play, Smartphone, 
  Map, UserCheck, ShieldAlert, KeyRound, Building, Watch, RefreshCcw
} from 'lucide-react';
import { svgAvatars, gatesList, officersList } from '../mockData';

interface SecurityDashboardProps {
  students: Student[];
  pickupRequests: PickupRequest[];
  setPickupRequests: React.Dispatch<React.SetStateAction<PickupRequest[]>>;
  securityLogs: SecurityLog[];
  setSecurityLogs: React.Dispatch<React.SetStateAction<SecurityLog[]>>;
  addNotification: (title: string, body: string, type: 'pickup_request' | 'pickup_confirm' | 'system', studentId?: string) => void;
  addEmail: (to: string, subject: string, body: string) => void;
}

export default function SecurityDashboard({
  students,
  pickupRequests,
  setPickupRequests,
  securityLogs,
  setSecurityLogs,
  addNotification,
  addEmail
}: SecurityDashboardProps) {
  
  // Gate settings
  const [activeGate, setActiveGate] = useState(gatesList[0]);
  const [activeOfficer, setActiveOfficer] = useState(officersList[0]);

  // Tab mode: 'existing_parent' | 'temp_code' | 'new_visitor'
  const [securityTab, setSecurityTab] = useState<'existing_parent' | 'temp_code' | 'new_visitor'>('existing_parent');

  // Input for existing parent manual verification
  const [inputAdmissionNo, setInputAdmissionNo] = useState('');

  // States for 'Verify New Visitor'
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [visitorRelationship, setVisitorRelationship] = useState('Guardian / Family Friend');
  const [visitorAadhaar, setVisitorAadhaar] = useState('');
  const [visitorStudentId, setVisitorStudentId] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [visitorPhoto, setVisitorPhoto] = useState(svgAvatars.father2);
  const [visitorAadhaarPhoto, setVisitorAadhaarPhoto] = useState((svgAvatars as any).aadhaarPhoto || svgAvatars.student1);

  // Hard Copy scan tracker
  const [scanIsHardCopy, setScanIsHardCopy] = useState(false);
  const [scanIsPrincipalOtp, setScanIsPrincipalOtp] = useState(false);

  // Scanning simulation state
  const [scanningStudentId, setScanningStudentId] = useState('');
  const [scanningRole, setScanningRole] = useState<'father' | 'mother'>('father');

  // Input for temporary 6-digit approval code
  const [inputTempCode, setInputTempCode] = useState('');

  // Active status panel display
  // null | 'AUTHORIZED' | 'TEMPORARY_APPROVED' | 'NOT_AUTHORIZED'
  const [scanResultStatus, setScanResultStatus] = useState<'AUTHORIZED' | 'TEMPORARY_APPROVED' | 'NOT_AUTHORIZED' | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [scannedPersonDetails, setScannedPersonDetails] = useState<{
    name: string;
    photo: string;
    relationship: string;
    aadhaar?: string;
    aadhaarPhoto?: string;
    notes?: string;
  } | null>(null);

  // Error messaging state (RED)
  const [errorMessage, setErrorMessage] = useState('');

  // Reset scanner state
  const handleResetScanner = () => {
    setScanResultStatus(null);
    setScannedStudent(null);
    setScannedPersonDetails(null);
    setErrorMessage('');
    setInputTempCode('');
    setScanningStudentId('');
    setScanIsHardCopy(false);
    setScanIsPrincipalOtp(false);
  };

  // Perform QR scan simulation
  const handleSimulateQRScan = (studentId: string, role: 'father' | 'mother', hardCopy: boolean = false) => {
    handleResetScanner();
    setScanIsHardCopy(hardCopy);
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage("E-Card Error: Scanned Student payload does not exist in local school cache.");
      return;
    }

    setScannedStudent(student);
    
    if (role === 'father') {
      setScannedPersonDetails({
        name: student.fatherName,
        photo: student.fatherPhoto || svgAvatars.father1,
        relationship: 'Father'
      });
    } else {
      setScannedPersonDetails({
        name: student.motherName,
        photo: student.motherPhoto || svgAvatars.mother1,
        relationship: 'Mother'
      });
    }

    setScanResultStatus('AUTHORIZED');
  };

  // Verify parent by ID or Admission Number (Admit Card QR)
  const handleVerifyParentById = (admissionNoOrId: string, role: 'father' | 'mother') => {
    handleResetScanner();
    const cleanInput = admissionNoOrId.trim().toUpperCase();
    if (!cleanInput) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage("Input Error: Please provide a Student ID, Admission Number, or Parent ID.");
      return;
    }

    const student = students.find(s => 
      s.admissionNumber.toUpperCase() === cleanInput || 
      s.id.toUpperCase() === cleanInput
    );

    if (!student) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage(`Verification Failed: No parent record or student found with ID/Admission No "${cleanInput}".`);
      return;
    }

    setScannedStudent(student);
    if (role === 'father') {
      setScannedPersonDetails({
        name: student.fatherName,
        photo: student.fatherPhoto || svgAvatars.father1,
        relationship: 'Father'
      });
    } else {
      setScannedPersonDetails({
        name: student.motherName,
        photo: student.motherPhoto || svgAvatars.mother1,
        relationship: 'Mother'
      });
    }
    setScanResultStatus('AUTHORIZED');
    setScanIsHardCopy(true); // Verified via pre-existing parent ID
  };

  // Register and verify a new visitor on-the-spot at the gate
  const handleRegisterNewVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorMobile.trim() || !visitorStudentId || !visitorRelationship) {
      alert("Please fill in all required fields for New Visitor Verification.");
      return;
    }

    const targetStudent = students.find(s => s.id === visitorStudentId);
    if (!targetStudent) {
      alert("Selected student not found in current school database.");
      return;
    }

    // Generate a temporary request record representing the visitor
    const tempRequestId = `REQ_V${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest: PickupRequest = {
      id: tempRequestId,
      studentId: visitorStudentId,
      fullName: visitorName,
      age: 35,
      mobileNumber: visitorMobile,
      relationship: `${visitorRelationship} (New Visitor Verified)`,
      photograph: visitorPhoto || svgAvatars.father2,
      aadhaarNumber: visitorAadhaar || 'Not Disclosed',
      aadhaarPhoto: visitorAadhaarPhoto || (svgAvatars as any).aadhaarPhoto,
      notes: visitorNotes || 'Gate-side direct check-in & manual validation.',
      status: 'approved',
      createdAt: new Date().toISOString(),
      isUsed: false,
      isDelegated: true,
      adminApproval: 'approved',
      approvedByRole: 'gate_officer',
      approvedByName: activeOfficer,
      verificationCode: 'VISITOR',
    };

    // Update state to include this new visitor record
    setPickupRequests(prev => [newRequest, ...prev]);

    // Load into scanner viewfinder viewport instantly
    setScannedStudent(targetStudent);
    setScannedPersonDetails({
      name: newRequest.fullName,
      photo: newRequest.photograph,
      relationship: newRequest.relationship,
      aadhaar: newRequest.aadhaarNumber,
      aadhaarPhoto: newRequest.aadhaarPhoto,
      notes: newRequest.notes
    });
    setScanResultStatus('TEMPORARY_APPROVED');

    alert(`🎉 Visitor "${visitorName}" registered & authorized successfully for student "${targetStudent.name}". Details loaded into gate viewfinder for student dispersal!`);
    
    // Reset visitor form inputs
    setVisitorName('');
    setVisitorMobile('');
    setVisitorRelationship('Guardian / Family Friend');
    setVisitorAadhaar('');
    setVisitorNotes('');
  };

  // Perform Temporary verification code input
  const handleVerifyTempCode = (codeText: string) => {
    handleResetScanner();
    const cleanCode = codeText.trim();
    if (!cleanCode) return;

    // Search for code in approved pickup requests or principal authorized delegation records
    const matchedRequest = pickupRequests.find(r => 
      (r.verificationCode === cleanCode && r.status === 'approved') ||
      (r.otpCode === cleanCode && r.adminApproval === 'approved')
    );
    
    if (!matchedRequest) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage("Code Mismatch: Provided temporary code/OTP is incorrect, already used, or expired.");
      return;
    }

    if (matchedRequest.isUsed) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage("Token Security Warning: Code was already utilized for previous student dispersal.");
      return;
    }

    // Found! Get associated student
    const student = students.find(s => s.id === matchedRequest.studentId);
    if (!student) {
      setScanResultStatus('NOT_AUTHORIZED');
      setErrorMessage("Consistency Error: Code is valid but student no longer exists in current records.");
      return;
    }

    // Check if matched via Principal OTP Code
    const isPrincipalOtpMatched = matchedRequest.otpCode === cleanCode;
    if (isPrincipalOtpMatched) {
      setScanIsPrincipalOtp(true);
      
      // Auto-assume parent authorization dynamically in global state
      setPickupRequests(prev => prev.map(r => r.id === matchedRequest.id ? { ...r, status: 'approved', verificationCode: r.otpCode } : r));
      
      // Notify
      alert(`🎉 Principal Secure OTP verified successfully!\n\nThis new individual has been authorized. Parent consent is automatically assumed.`);
    }

    setScannedStudent(student);
    setScannedPersonDetails({
      name: matchedRequest.fullName,
      photo: matchedRequest.photograph,
      relationship: matchedRequest.relationship,
      aadhaar: matchedRequest.aadhaarNumber,
      aadhaarPhoto: matchedRequest.aadhaarPhoto,
      notes: matchedRequest.notes
    });

    setScanResultStatus('TEMPORARY_APPROVED');
  };

  // On-the-spot Gate Personnel Delegate Clearance
  const handleGateApproval = (reqId: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    setPickupRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'approved',
          adminApproval: 'approved',
          approvedByRole: 'gate_officer',
          approvedByName: activeOfficer, 
          verificationCode: r.verificationCode || code,
          codeExpiresAt: r.codeExpiresAt || expiry,
          adminVerificationTime: new Date().toISOString()
        };
      }
      return r;
    }));

    // Find custom request instantly
    const matchedReq = pickupRequests.find(r => r.id === reqId);
    if (matchedReq) {
      const finalCode = matchedReq.verificationCode || code;
      const student = students.find(s => s.id === matchedReq.studentId);
      
      addNotification(
        "Gate-side Delegate Authorization",
        `Officer ${activeOfficer} verified Aadhaar & authorized ${matchedReq.fullName} (${matchedReq.relationship}) to pick up ${student?.name || 'student'} via on-the-spot gate check.`,
        'system',
        matchedReq.studentId
      );

      setInputTempCode(finalCode);
      
      // Auto-load details into guard viewfinder viewport
      setTimeout(() => {
        handleResetScanner();
        setScannedStudent(student || null);
        setScannedPersonDetails({
          name: matchedReq.fullName,
          photo: matchedReq.photograph,
          relationship: matchedReq.relationship,
          aadhaar: matchedReq.aadhaarNumber,
          aadhaarPhoto: matchedReq.aadhaarPhoto,
          notes: matchedReq.notes
        });
        setScanResultStatus('TEMPORARY_APPROVED');
      }, 50);

      alert(`On-the-spot identity verified! Delegate approved. Details loaded into terminal for child release.`);
    }
  };

  // Release student action (Creates Log entry and triggers notifications)
  const handleReleaseStudent = () => {
    if (!scannedStudent || !scannedPersonDetails || !scanResultStatus) return;

    const logId = `LOG${Math.floor(100 + Math.random() * 900)}`;
    const newLog: SecurityLog = {
      id: logId,
      pickupTime: new Date().toISOString(),
      studentId: scannedStudent.id,
      studentName: scannedStudent.name,
      className: scannedStudent.className,
      section: scannedStudent.section,
      pickupPersonName: scannedPersonDetails.name,
      pickupPersonPhoto: scannedPersonDetails.photo,
      relationship: scannedPersonDetails.relationship,
      gateNumber: activeGate,
      securityStaffName: activeOfficer,
      verificationMethod: scanResultStatus === 'AUTHORIZED' 
        ? (scanIsHardCopy ? 'Hard Copy QR Scan' : 'QR Scan') 
        : (scanIsPrincipalOtp ? 'Principal OTP Verified (Parent Assumed)' : 'Temp Verification Code'),
      status: scanResultStatus
    };

    // Save log entry persistent
    setSecurityLogs(prev => [newLog, ...prev]);

    // Mark temp request as used if it was a code release
    if (scanResultStatus === 'TEMPORARY_APPROVED') {
      const codeUsedIdx = pickupRequests.findIndex(r => r.verificationCode === inputTempCode || r.otpCode === inputTempCode);
      if (codeUsedIdx > -1) {
        setPickupRequests(prev => prev.map((r, i) => i === codeUsedIdx ? { ...r, isUsed: true } : r));
      }
    }

    // Trigger instant Parent in-app and email confirmation alert
    // "Your child Aarav Sharma was picked up at 2:42 PM by Amit Sharma."
    const timeFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const notificationMessage = scanIsHardCopy 
      ? `Physical Dispersal Verification: Your child ${scannedStudent.name} was picked up at ${timeFormatted} by checking standard physical Hard Copy ID QR Card. Genuine parent checked & verified from local records.`
      : scanIsPrincipalOtp
        ? `Principal OTP Handover Verification: Your child ${scannedStudent.name} was released at ${timeFormatted} to ${scannedPersonDetails.name} (${scannedPersonDetails.relationship}) via secure delegation OTP check (cleared and pre-authorized by Principal).`
        : `Your child ${scannedStudent.name} was safely picked up at ${timeFormatted} by ${scannedPersonDetails.name} (${scannedPersonDetails.relationship}) from ${activeGate} under ${activeOfficer}'s verification.`;
    
    addNotification(
      "Student Dispersal Confirmed", 
      notificationMessage, 
      'pickup_confirm', 
      scannedStudent.id
    );

    addEmail(
      scannedStudent.fatherEmail,
      "Pupil Dispersal Confirmation Receipt - GOENKA SMART DISPERSAL",
      `Dear ${scannedStudent.fatherName} & ${scannedStudent.motherName},\n\nThis is a secure safety hand-over receipt from GD Goenka Core Dispersal.\n\nYour child, ${scannedStudent.name} (Class ${scannedStudent.className}, Section ${scannedStudent.section}) has been safely picked up.\n\nHandover details:\n- Dispersed to: ${scannedPersonDetails.name} (${scannedPersonDetails.relationship})\n- Timestamp: ${new Date().toLocaleString()}\n- School Gate: ${activeGate}\n- Security Staff: ${activeOfficer}\n- Verification Method: ${newLog.verificationMethod}${scanIsHardCopy ? ' (Physical ID Hard Copy Card scanned, auto matched, verified genuine)' : ''}${scanIsPrincipalOtp ? ' (Principal Security OTP Code email-verified, parent delegation auto-assumed)' : ''}\n\nThank you for choosing GD Goenka's Secure Gate systems. No SMS costs were incurred during this eco-friendly verification.\n\nWarm regards,\nGD Goenka Administration`
    );

    alert(`Pupil ${scannedStudent.name} released successfully. Log stored. Notifications dispatched instantly!`);
    handleResetScanner();
  };

  return (
    <div id="security-dashboard-container" className="space-y-6">
      
      {/* Configuration line (Selection of Gate/Staff) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="text-slate-500 shrink-0" size={20} />
          <div>
            <h3 className="font-display font-semibold text-sm text-slate-900 leading-none">Security Configuration</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Please ensure correct gate assignment before confirming handovers.</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gate Location</label>
            <select
              value={activeGate}
              onChange={(e) => { setActiveGate(e.target.value); handleResetScanner(); }}
              className="text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {gatesList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verified By (Staff)</label>
            <select
              value={activeOfficer}
              onChange={(e) => { setActiveOfficer(e.target.value); handleResetScanner(); }}
              className="text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              {officersList.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Verification Inputs Panels (Col: 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 h-fit">
          
          {/* Sub Header for Terminal Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              id="security-tab-regular"
              onClick={() => { setSecurityTab('regular'); handleResetScanner(); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition ${securityTab === 'regular' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Regular Parent QR
            </button>
            <button
              id="security-tab-temp"
              onClick={() => { setSecurityTab('new_person'); handleResetScanner(); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition ${securityTab === 'new_person' ? 'bg-white text-slate-950 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Verify Temp Code
            </button>
          </div>

          {/* Regular QR scan simulator layout */}
          {securityTab === 'regular' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-center space-y-0 shadow-sm">
                
                {/* Visual Top Bar */}
                <div className="bg-slate-800 px-3 py-2 border-b border-slate-750 text-center flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-widest animate-pulse flex items-center gap-1.5 mx-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Scanner Active
                  </span>
                </div>
                
                {/* Viewfinder Graphics */}
                <div className="aspect-square bg-slate-950 relative flex items-center justify-center p-8 overflow-hidden">
                  <div className="absolute inset-6 border-2 border-dashed border-slate-800 rounded-2xl"></div>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border-2 border-emerald-500 rounded-lg flex items-center justify-center bg-slate-900/30">
                    <div className="w-28 h-28 bg-white p-1.5 rounded shadow-lg">
                      <svg viewBox="0 0 24 24" className="w-full h-full text-slate-900" fill="currentColor">
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 3h2v2h-2v-2zm3 0h3v2h-3v-2zm-6-3h2v2h-2v-2zm0-3h2v2h-2v-2zm3 3h2v2h-2v-2z"/>
                      </svg>
                    </div>
                    {/* Laser scanning line */}
                    <div className="absolute w-full h-1 bg-emerald-500/80 blur-[2px] top-4 animate-bounce"></div>
                  </div>
                  
                  <div className="absolute bottom-2.5 text-slate-400 text-[10px] font-mono uppercase tracking-wider text-center px-4">
                    Align pupil ID card with central focus
                  </div>
                </div>

                {/* Selection Fields */}
                <div className="p-4 space-y-4 text-left bg-slate-50 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Pupil</label>
                    <select
                      id="security-select-sim-student"
                      value={scanningStudentId}
                      onChange={(e) => setScanningStudentId(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- Choose Pupil to Scan Card --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id} - {s.className})</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Categories */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                        📱 Mode A: Scan Parent Mobile App QR (Digital)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="btn-scan-role-father"
                          type="button"
                          disabled={!scanningStudentId}
                          onClick={() => { setScanningRole('father'); handleSimulateQRScan(scanningStudentId, 'father', false); }}
                          className={`py-2 text-xs font-bold rounded-lg transition border uppercase cursor-pointer ${
                            !scanningStudentId 
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                              : scanningRole === 'father' && scannedStudent?.id === scanningStudentId && !scanIsHardCopy
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-2xs' 
                                : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                          }`}
                        >
                          Father E-App
                        </button>
                        <button
                          id="btn-scan-role-mother"
                          type="button"
                          disabled={!scanningStudentId}
                          onClick={() => { setScanningRole('mother'); handleSimulateQRScan(scanningStudentId, 'mother', false); }}
                          className={`py-2 text-xs font-bold rounded-lg transition border uppercase cursor-pointer ${
                            !scanningStudentId 
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                              : scanningRole === 'mother' && scannedStudent?.id === scanningStudentId && !scanIsHardCopy
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-2xs' 
                                : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                          }`}
                        >
                          Mother E-App
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                        📄 Mode B: Scan Printed Hard Copy QR (Zero Questions Bypass)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="btn-scan-hardcopy-father"
                          type="button"
                          disabled={!scanningStudentId}
                          onClick={() => { setScanningRole('father'); handleSimulateQRScan(scanningStudentId, 'father', true); }}
                          className={`py-2 text-xs font-bold rounded-lg transition border uppercase cursor-pointer ${
                            !scanningStudentId 
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                              : scanningRole === 'father' && scannedStudent?.id === scanningStudentId && scanIsHardCopy
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs' 
                                : 'bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100'
                          }`}
                        >
                          Father Hard Copy
                        </button>
                        <button
                          id="btn-scan-hardcopy-mother"
                          type="button"
                          disabled={!scanningStudentId}
                          onClick={() => { setScanningRole('mother'); handleSimulateQRScan(scanningStudentId, 'mother', true); }}
                          className={`py-2 text-xs font-bold rounded-lg transition border uppercase cursor-pointer ${
                            !scanningStudentId 
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' 
                              : scanningRole === 'mother' && scannedStudent?.id === scanningStudentId && scanIsHardCopy
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs' 
                                : 'bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100'
                          }`}
                        >
                          Mother Hard Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {scanningStudentId && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[10.5px] text-amber-850 text-center font-semibold">
                      ⚡ Permanent credentials checked instantly. Scan triggers immediate live clearance.
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* Emergency code verification form layout */}
          {securityTab === 'new_person' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <KeyRound size={22} className="text-slate-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-normal uppercase tracking-wider">Delegated Temporary Code</h4>
                  <p className="text-[11px] text-slate-650 mt-1">
                    Enter the single-use 6-digit approval code generated in the parent portal.
                  </p>
                </div>

                <div className="text-left space-y-3.5">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Enter 6-Digit Gate Pass / OTP *
                    </label>
                    <input 
                      id="input-security-verify-code"
                      type="text" 
                      maxLength={6}
                      placeholder="e.g. 582741"
                      value={inputTempCode}
                      onChange={(e) => setInputTempCode(e.target.value)}
                      className="w-full text-center font-mono font-bold text-3xl p-4 bg-white border-2 border-slate-400 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:border-[#0b3294] focus:ring-4 focus:ring-[#0b3294]/10 shadow-md transition-all duration-150"
                    />
                  </div>

                  <button
                    id="btn-verify-temp-code-action"
                    disabled={!inputTempCode}
                    onClick={() => handleVerifyTempCode(inputTempCode)}
                    className="w-full bg-[#0b3294] hover:bg-[#082672] text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Run Live Security Verification
                  </button>
                </div>
              </div>

              {/* Helpful tips of active approved codes */}
              <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 font-sans">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  💡 Active Approved Codes in Portal
                </span>
                <p className="text-[10px] text-slate-600 mb-2">
                  Select one of these approved temporary codes to test the verification:
                </p>
                <div className="space-y-1">
                  {pickupRequests.filter(r => r.status === 'approved' && !r.isUsed).length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No approved codes. Go to Parent view to create one under setting.</span>
                  ) : (
                    pickupRequests.filter(r => r.status === 'approved' && !r.isUsed).map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setInputTempCode(r.verificationCode || '');
                          handleVerifyTempCode(r.verificationCode || '');
                        }}
                        className="w-full p-2 bg-white hover:bg-emerald-50 hover:border-emerald-250 border border-slate-200 rounded text-left text-[11px] flex items-center justify-between transition font-medium"
                      >
                        <div>
                          <strong>{r.fullName}</strong> ({r.relationship})
                        </div>
                        <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-1 rounded text-[10px] font-bold">
                          {r.verificationCode}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Gate on-the-spot delegate authorization list */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 font-sans space-y-2">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldAlert size={12} className="text-amber-600 animate-pulse shrink-0" />
                  📋 Gate-side Clearance (Unknown Visitors Desk)
                </span>
                <p className="text-[10.5px] text-slate-650 leading-normal">
                  If an unknown visitor presents at the gates without School/Admin clearance, inspect their physical ID and authorize them on-the-spot.
                </p>
                <div className="space-y-2">
                  {pickupRequests.filter(r => r.status === 'approved' && r.adminApproval !== 'approved' && !r.isUsed).length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic block">No visitor requests awaiting gate clearance.</span>
                  ) : (
                    pickupRequests.filter(r => r.status === 'approved' && r.adminApproval !== 'approved' && !r.isUsed).map(r => {
                      const student = students.find(s => s.id === r.studentId);
                      return (
                        <div key={r.id} className="p-3 bg-white border border-amber-150 rounded-lg space-y-2">
                          <div className="flex gap-2.5 items-start">
                            <img referrerPolicy="no-referrer" src={r.photograph} alt={r.fullName} className="w-9 h-9 rounded object-cover border border-slate-200" />
                            <div className="text-[11px] leading-tight flex-1">
                              <strong className="text-slate-900 block">{r.fullName} ({r.relationship})</strong>
                              <span className="text-slate-500 block">Linked Child: {student?.name || 'Student'} ({student?.className})</span>
                              <span className="text-slate-400 block mt-0.5 text-[9.5px]">Aadhaar: {r.aadhaarNumber}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGateApproval(r.id)}
                            className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded text-[10px] transition cursor-pointer uppercase tracking-wider border border-amber-600/30"
                          >
                            ✓ Verify ID & Authorize Delegate at Gate
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Local Active Gate Log history summary */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recent handovers ({activeGate})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {securityLogs.filter(log => log.gateNumber === activeGate).length === 0 ? (
                <div className="text-[10px] text-slate-400 italic">No students released from this gate yet.</div>
              ) : (
                securityLogs.filter(log => log.gateNumber === activeGate).slice(0, 3).map(log => (
                  <div key={log.id} className="bg-slate-50 border border-slate-100 p-2 rounded text-[10.5px] flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900">{log.studentName}</strong>
                      <span className="text-slate-400 block text-[9.5px]">Picked by {log.pickupPersonName} • {new Date(log.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold ${
                      log.status === 'AUTHORIZED' 
                        ? 'bg-emerald-50 text-emerald-800' 
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      RELEASED
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Verification Status Window Screen (Col: 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Watch size={16} className="text-emerald-700" />
              Live Camera / Verification Canvas
            </h3>
            {scanResultStatus && (
              <button
                id="btn-clear-canvas"
                onClick={handleResetScanner}
                className="text-[10px] text-slate-500 border border-slate-200 hover:bg-slate-100 rounded px-2 py-1 font-bold"
              >
                Clear Terminal Screen
              </button>
            )}
          </div>

          {/* If nothing is scanned yet */}
          {!scanResultStatus ? (
            <div className="border-4 border-dashed border-slate-100/80 rounded-2xl p-12 text-center text-slate-400 flex flex-col justify-center items-center h-[350px] space-y-3">
              <Scan size={44} className="text-slate-300 animate-pulse" />
              <p className="text-sm font-semibold text-slate-800">Ready to Scan Parent Identity Cards</p>
              <p className="text-xs text-slate-650 max-w-sm font-light">
                Use the quick selection tools on the left to trigger a simulated QR scan or verify a temporary manual parental permission voucher.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* BIG STATUS CONTAINER */}
              {scanResultStatus === 'AUTHORIZED' && (
                <div id="status-banner-authorized" className={`rounded-xl overflow-hidden shadow-md text-white ${scanIsHardCopy ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                      <UserCheck size={28} className="text-emerald-105 animate-bounce" />
                      <span className="text-xl font-black tracking-tight uppercase font-display">
                        {scanIsHardCopy ? 'GENUINE PARENT (HARD COPY)' : 'AUTHORIZED PICKUP'}
                      </span>
                    </div>
                    <span className="bg-emerald-800/60 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      {scanIsHardCopy ? 'HARD COPY VERIFIED' : 'GUARD VERIFIED'}
                    </span>
                  </div>
                  <div className="bg-emerald-50 px-5 py-2.5 border-t border-emerald-500/20 text-emerald-950 text-xs font-semibold">
                     {scanIsHardCopy 
                       ? "✓ Hard-copy scan matched against database. ZERO QUESTIONS REQUIRED - True parent verified genuine." 
                       : "Pupil linked is verified for safe release to the presenting guardian."}
                  </div>
                </div>
              )}

              {scanResultStatus === 'TEMPORARY_APPROVED' && (
                <div id="status-banner-temp-approved" className={`rounded-xl overflow-hidden shadow-md ${
                  scanIsPrincipalOtp ? 'bg-indigo-600 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                }`}>
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={28} className={scanIsPrincipalOtp ? "text-indigo-100" : "text-slate-900"} />
                      <span className="text-xl font-black tracking-tight uppercase font-display">
                        {scanIsPrincipalOtp ? 'PRINCIPAL AUTHORIZED OTP' : 'TEMP APPROVED PICKUP'}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      scanIsPrincipalOtp ? 'bg-indigo-700 text-white' : 'bg-amber-600/60 text-slate-950 border border-amber-600/20'
                    }`}>
                      {scanIsPrincipalOtp ? 'PARENT LEVEL ASSUMED' : 'SINGLE-USE TOKEN'}
                    </span>
                  </div>
                  <div className={`px-5 py-2.5 border-t text-xs font-semibold ${
                    scanIsPrincipalOtp ? 'bg-indigo-50 text-indigo-950 border-indigo-500/20' : 'bg-amber-50 text-amber-950 border-amber-500/20'
                  }`}>
                     {scanIsPrincipalOtp 
                       ? "✓ Secure administrative OTP successfully verified at gate. Parent delegation is automatically assumed." 
                       : "Temporary delegation checked. Ensure Aadhaar photo below matches presenting delegate."}
                  </div>
                </div>
              )}

              {scanResultStatus === 'NOT_AUTHORIZED' && (
                <div id="status-banner-refused" className="bg-rose-600 text-white rounded-xl overflow-hidden shadow-md">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                      <ShieldAlert size={28} className="text-rose-100" />
                      <span className="text-xl font-black tracking-tight uppercase font-display">NOT AUTHORIZED</span>
                    </div>
                    <span className="bg-rose-700/60 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">ACCESS DENIED</span>
                  </div>
                  <div className="bg-rose-50 px-5 py-2.5 border-t border-rose-500/20 text-rose-950 text-xs font-semibold">
                    {errorMessage || 'Clearance blocked by system rules.'}
                  </div>
                </div>
              )}

              {/* DETAILS COMPARISON GRAPHICS */}
              {scannedStudent && scannedPersonDetails && (
                <div className="space-y-4">
                  
                  {/* Photo comparison panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Pupil card profile */}
                    <div className="border border-slate-200 bg-slate-50/40 p-4 rounded-2xl space-y-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                        Linked Student Details
                      </span>
                      
                      <div className="flex gap-3">
                        <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={scannedStudent.photo} 
                            alt="Student" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 font-display text-sm leading-tight">{scannedStudent.name}</h4>
                          <p className="text-xs text-slate-650 font-medium">{scannedStudent.className} • {scannedStudent.section}</p>
                          <p className="text-[11px] text-slate-400">Adm No: {scannedStudent.admissionNumber}</p>
                          <p className="text-[10px] text-slate-400">ID: {scannedStudent.id}</p>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-650 font-medium">
                        <div>🏡 <strong>Address:</strong> {scannedStudent.address}</div>
                        <div>📅 <strong>DOB:</strong> {scannedStudent.dob}</div>
                      </div>
                    </div>

                    {/* Verified Pickup Person */}
                    <div className="border border-slate-200 bg-slate-50/40 p-4 rounded-2xl space-y-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                        Presenting Pickup Person
                      </span>

                      <div className="flex gap-3">
                        <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={scannedPersonDetails.photo} 
                            alt="Pickup Person" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 font-display text-sm leading-tight">{scannedPersonDetails.name}</h4>
                          <span className="inline-block bg-slate-150 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                            {scannedPersonDetails.relationship}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">Verified via {scanResultStatus === 'AUTHORIZED' ? 'Permanent QR' : 'Approval Token Code'}</p>
                        </div>
                      </div>

                      {/* Display Aadhaar card values if Temporary delegate pickup */}
                      {scanResultStatus === 'TEMPORARY_APPROVED' && (
                        <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl space-y-2 text-xs text-slate-700 font-medium">
                          <div className="flex justify-between">
                            <span>🪪 <strong>Aadhaar:</strong></span>
                            <span className="font-mono">{scannedPersonDetails.aadhaar}</span>
                          </div>
                          
                          {scannedPersonDetails.notes && (
                            <div className="border-t border-amber-100/50 pt-1.5 mt-1 text-[11px] italic text-slate-600">
                              " {scannedPersonDetails.notes} "
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* LARGE ACTION BUTTON TO HAND OVER */}
                  {scanResultStatus !== 'NOT_AUTHORIZED' && (
                    <div className="pt-3 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={handleResetScanner}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition uppercase"
                      >
                        Cancel Release
                      </button>
                      <button
                        id="btn-confirm-dispersal"
                        onClick={handleReleaseStudent}
                        className={`flex-2 font-black py-3 rounded-xl text-xs text-white uppercase tracking-wider shadow-md hover:scale-[1.01] transition duration-200 ${
                          scanResultStatus === 'AUTHORIZED'
                            ? 'bg-emerald-700 hover:bg-emerald-800'
                            : 'bg-amber-700 hover:bg-amber-800'
                        }`}
                      >
                        ✓ Release Pupil & Log Dispersal
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
