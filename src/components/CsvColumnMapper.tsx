import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, AlertCircle, FileSpreadsheet, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';
import { Student } from '../types';

interface CsvColumnMapperProps {
  isOpen: boolean;
  csvHeaders: string[];
  csvRows: string[][];
  onConfirm: (mappedStudents: Student[]) => void;
  onCancel: () => void;
}

interface TargetField {
  key: keyof Omit<Student, 'photo' | 'fatherPhoto' | 'motherPhoto'> | 'studentId';
  label: string;
  hindiLabel: string;
  required: boolean;
  description: string;
  exacts: string[];
  contains: string[];
  excludes: string[];
  defaultValue: string;
}

export const CsvColumnMapper: React.FC<CsvColumnMapperProps> = ({
  isOpen,
  csvHeaders,
  csvRows,
  onConfirm,
  onCancel,
}) => {
  // Define our desired target database schema fields
  const targetFields: TargetField[] = [
    {
      key: 'admissionNumber',
      label: 'Admission Number',
      hindiLabel: 'एडमिशन नंबर (अनिवार्य)',
      required: true,
      description: 'Primary unique registration/admission number for the student.',
      exacts: ['admission number', 'admissionnumber', 'adm number', 'admnumber', 'adm no', 'admno', 'admission no', 'admissionno', 'admission', 'enrollment number', 'enrollmentnumber', 'enrollment', 'roll number', 'rollnumber', 'rollno', 'roll no', 'reg no', 'reg number', 'registration'],
      contains: ['admission', 'enrollment', 'adm no', 'adm num', 'roll no', 'reg no', 'registration'],
      excludes: ['id', 'email', 'phone', 'mobile', 'father', 'mother', 'parent'],
      defaultValue: '',
    },
    {
      key: 'name',
      label: 'Student Name',
      hindiLabel: 'छात्र का नाम (अनिवार्य)',
      required: true,
      description: 'The full name of the student.',
      exacts: ['student name', 'studentname', 'name', 'fullname', 'full name', 'student', 'pupil name', 'pupilname', 'pupil'],
      contains: ['student name', 'fullname', 'full name', 'pupil name', 'student_name', 'name'],
      excludes: ['father', 'mother', 'parent', 'guardian', 'teacher', 'admin', 'officer', 'staff', 'id', 'email', 'phone', 'mobile', 'class', 'sec'],
      defaultValue: 'Unknown Student',
    },
    {
      key: 'className',
      label: 'Class',
      hindiLabel: 'कक्षा (अनिवार्य)',
      required: true,
      description: 'Current class/grade of the student.',
      exacts: ['class', 'grade', 'standard', 'classname', 'class name', 'class_name'],
      contains: ['class', 'grade', 'standard'],
      excludes: ['father', 'mother', 'parent', 'teacher', 'email', 'phone', 'mobile', 'id', 'sec'],
      defaultValue: 'Class 1',
    },
    {
      key: 'section',
      label: 'Section',
      hindiLabel: 'सेक्शन / वर्ग (अनिवार्य)',
      required: true,
      description: 'Section within the class.',
      exacts: ['section', 'sec', 'sectionname', 'section name', 'section_name'],
      contains: ['section', 'sec'],
      excludes: ['class', 'id', 'email', 'phone', 'mobile', 'father', 'mother', 'parent'],
      defaultValue: 'Section A',
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      hindiLabel: 'जन्म तिथि',
      required: false,
      description: 'Student\'s date of birth.',
      exacts: ['dob', 'date of birth', 'dateofbirth', 'birthdate', 'birth date', 'birth_date', 'date_of_birth'],
      contains: ['dob', 'birth', 'date of birth'],
      excludes: ['admission', 'father', 'mother', 'parent', 'email', 'phone', 'mobile', 'id'],
      defaultValue: '2018-01-01',
    },
    {
      key: 'address',
      label: 'Address',
      hindiLabel: 'पता',
      required: false,
      description: 'Student\'s residential address.',
      exacts: ['address', 'residence', 'street', 'city', 'house', 'location', 'addr'],
      contains: ['address', 'residence', 'street', 'city', 'location', 'addr'],
      excludes: ['email', 'phone', 'mobile', 'father', 'mother', 'parent', 'name', 'id'],
      defaultValue: 'School Campus',
    },
    {
      key: 'fatherName',
      label: 'Father Name',
      hindiLabel: 'पिता का नाम',
      required: false,
      description: 'Full name of the student\'s father.',
      exacts: ['father name', 'fathername', 'father', 'fathers name', 'father_name', 'guardian name', 'guardian'],
      contains: ['father', 'guardian'],
      excludes: ['email', 'phone', 'mobile', 'id', 'mother', 'contact', 'number'],
      defaultValue: 'Father',
    },
    {
      key: 'motherName',
      label: 'Mother Name',
      hindiLabel: 'माता का नाम',
      required: false,
      description: 'Full name of the student\'s mother.',
      exacts: ['mother name', 'mothername', 'mother', 'mothers name', 'mother_name'],
      contains: ['mother'],
      excludes: ['email', 'phone', 'mobile', 'id', 'father', 'contact', 'number'],
      defaultValue: 'Mother',
    },
    {
      key: 'fatherEmail',
      label: 'Father Email',
      hindiLabel: 'पिता का ईमेल',
      required: false,
      description: 'Primary email address of the father (used for Parent Portal login).',
      exacts: ['father email', 'fatheremail', 'femail', 'f_email', 'father_email'],
      contains: ['father email', 'father_email', 'f_email', 'guardian email'],
      excludes: ['mother', 'm_email', 'memail'],
      defaultValue: '',
    },
    {
      key: 'motherEmail',
      label: 'Mother Email',
      hindiLabel: 'माता का ईमेल',
      required: false,
      description: 'Primary email address of the mother (used for Parent Portal login).',
      exacts: ['mother email', 'motheremail', 'memail', 'm_email', 'mother_email'],
      contains: ['mother email', 'mother_email', 'm_email'],
      excludes: ['father', 'f_email', 'femail'],
      defaultValue: '',
    },
    {
      key: 'fatherMobile',
      label: 'Father Mobile',
      hindiLabel: 'पिता का मोबाइल नंबर',
      required: false,
      description: 'Primary contact/mobile number of the father.',
      exacts: ['father mobile', 'fathermobile', 'fatherphone', 'father_phone', 'father_mobile', 'fmobile', 'fphone', 'father contact', 'fathercontact', 'father_contact', 'fathers primary contact number', "father's primary contact number", "father's contact number", 'fathers contact number', 'father primary contact', 'father contact number'],
      contains: ['father mobile', 'father phone', 'father contact', 'f_mobile', 'f_phone', 'f_contact', "father's primary contact", "father's contact", 'fathers contact', 'primary contact', 'contact number'],
      excludes: ['mother', 'mphone', 'mmobile'],
      defaultValue: '+91 99999 99999',
    },
    {
      key: 'motherMobile',
      label: 'Mother Mobile',
      hindiLabel: 'माता का मोबाइल नंबर',
      required: false,
      description: 'Primary contact/mobile number of the mother.',
      exacts: ['mother mobile', 'mothermobile', 'motherphone', 'mother_phone', 'mother_mobile', 'mmobile', 'mphone', 'mother contact', 'mothercontact', 'mother_contact', 'mothers primary contact number', "mother's primary contact number", "mother's contact number", 'mothers contact number', 'mother primary contact', 'mother contact number'],
      contains: ['mother mobile', 'mother phone', 'mother contact', 'm_mobile', 'm_phone', 'm_contact', "mother's primary contact", "mother's contact", 'mothers contact', 'primary contact', 'contact number'],
      excludes: ['father', 'fphone', 'fmobile'],
      defaultValue: '+91 99999 88888',
    },
    {
      key: 'studentId',
      label: 'Student ID',
      hindiLabel: 'स्टूडेंट आईडी (वैकल्पिक)',
      required: false,
      description: 'Optional. If not selected, it will be automatically generated from the Admission Number.',
      exacts: ['student id', 'studentid', 'id', 'pupil id', 'pupilid', 'student_id'],
      contains: ['student id', 'pupil id', 'student_id'],
      excludes: ['admission', 'enrollment', 'roll', 'father', 'mother', 'parent', 'email', 'phone', 'mobile', 'class'],
      defaultValue: '',
    },
  ];

  // Store the mapping state: targetField.key -> index of csvHeaders
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize auto-fuzzy-matching on mount or CSV header changes
  useEffect(() => {
    if (csvHeaders.length > 0) {
      const initialMappings: Record<string, number> = {};
      const headersLower = csvHeaders.map(h => h.trim().toLowerCase());

      targetFields.forEach(field => {
        let matchedIndex = -1;

        // 1. First try exact matches
        for (let i = 0; i < headersLower.length; i++) {
          const hNorm = headersLower[i].replace(/[^a-z0-9]/g, '');
          if (field.excludes.some(exc => headersLower[i].includes(exc))) continue;
          if (field.exacts.some(ex => headersLower[i] === ex || hNorm === ex.replace(/[^a-z0-9]/g, ''))) {
            matchedIndex = i;
            break;
          }
        }

        // 2. Then try contains-based matches
        if (matchedIndex === -1) {
          for (let i = 0; i < headersLower.length; i++) {
            if (field.excludes.some(exc => headersLower[i].includes(exc))) continue;
            if (field.contains.some(c => headersLower[i].includes(c))) {
              matchedIndex = i;
              break;
            }
          }
        }

        initialMappings[field.key] = matchedIndex;
      });

      setMappings(initialMappings);
    }
  }, [csvHeaders]);

  if (!isOpen || csvHeaders.length === 0) return null;

  const handleSelectChange = (fieldKey: string, valueStr: string) => {
    const idx = parseInt(valueStr, 10);
    setMappings(prev => ({
      ...prev,
      [fieldKey]: idx,
    }));
  };

  // Completely remove control characters and replacement boxes (like \uFFFD) to keep data absolutely pristine
  const sanitizeValue = (val: string): string => {
    if (!val) return '';
    return val
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, "")
      .trim()
      .replace(/^"|"$/g, "") // strip leading/trailing quotes if they survived
      .trim();
  };

  // Compile final mapped list of students
  const getMappedStudents = (): Student[] => {
    const students: Student[] = [];

    csvRows.forEach((row, rowIndex) => {
      if (row.length === 0 || (row.length === 1 && !row[0])) return;

      const cleanValues = row.map(v => sanitizeValue(v));
      const nonCount = cleanValues.filter(v => v.length > 0).length;
      if (nonCount <= 1) return;

      const getValue = (fieldKey: keyof Omit<Student, 'photo' | 'fatherPhoto' | 'motherPhoto'> | 'studentId', fallbackVal: string): string => {
        const headerIdx = mappings[fieldKey];
        if (headerIdx !== undefined && headerIdx !== -1 && cleanValues[headerIdx] !== undefined && cleanValues[headerIdx] !== '') {
          return cleanValues[headerIdx];
        }
        return fallbackVal;
      };

      const admNum = getValue('admissionNumber', `ADM${Date.now().toString().slice(-6)}${rowIndex}`);
      
      // Handle optional student ID mapping
      let stuId = getValue('studentId', '');
      if (!stuId) {
        // Automatically generate clean Student ID from Admission Number as requested
        const cleanAdm = admNum.replace(/[^a-zA-Z0-9]/g, '');
        stuId = `STU-${cleanAdm}` || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const name = getValue('name', 'Unknown Student');
      const className = getValue('className', 'Class 1');
      const section = getValue('section', 'Section A');
      const dob = getValue('dob', '2018-01-01');
      const address = getValue('address', 'School Campus');
      const fatherName = getValue('fatherName', 'Father');
      const motherName = getValue('motherName', 'Mother');

      // Dynamically build clean default emails if missing from cells
      const defaultFatherEmail = fatherName !== 'Father' 
        ? `${fatherName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`
        : `father${admNum.replace(/[^a-zA-Z0-9]/g, '')}@example.com`;
        
      const defaultMotherEmail = motherName !== 'Mother'
        ? `${motherName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`
        : `mother${admNum.replace(/[^a-zA-Z0-9]/g, '')}@example.com`;

      const fatherEmail = getValue('fatherEmail', defaultFatherEmail);
      const motherEmail = getValue('motherEmail', defaultMotherEmail);
      const fatherMobile = getValue('fatherMobile', '+91 99999 99999');
      const motherMobile = getValue('motherMobile', '+91 99999 88888');

      // Custom default avatars for newly imported students
      const idHash = stuId.charCodeAt(stuId.length - 1) || 0;
      const studentHue = (idHash * 40) % 360;
      const parentHue = (idHash * 85) % 360;
      
      const customStudentPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${studentHue}, 80%, 93%)"/><circle cx="50" cy="40" r="21" fill="hsl(${studentHue}, 80%, 40%)"/><path d="M16 85 C 22 62, 78 62, 84 85 Z" fill="hsl(${studentHue}, 80%, 30%)"/><circle cx="43" cy="38" r="3" fill="white"/><circle cx="57" cy="38" r="3" fill="white"/><path d="M44 50 Q50 54 56 50" stroke="white" stroke-width="2.5" fill="none"/></svg>`;
      const customFatherPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${parentHue}, 70%, 95%)"/><circle cx="50" cy="38" r="20" fill="hsl(${parentHue}, 70%, 35%)"/><path d="M18 82 C 22 58, 78 58, 82 82 Z" fill="hsl(${parentHue}, 70%, 25%)"/><path d="M40 38 L45 38" stroke="white" stroke-width="2"/><path d="M55 38 L60 38" stroke="white" stroke-width="2"/><path d="M45 48 Q50 52 55 48" stroke="white" stroke-width="2" fill="none"/></svg>`;
      const customMotherPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="hsl(${(parentHue + 120) % 360}, 70%, 95%)"/><circle cx="50" cy="38" r="18" fill="hsl(${(parentHue + 120) % 360}, 70%, 45%)"/><path d="M20 84 C 24 60, 76 60, 80 84 Z" fill="hsl(${(parentHue + 120) % 360}, 70%, 35%)"/><circle cx="43" cy="36" r="2.5" fill="white"/><circle cx="57" cy="36" r="2.5" fill="white"/><path d="M42 46 Q50 51 58 46" stroke="white" stroke-width="2" fill="none"/><path d="M35 34 C 40 20, 60 20, 65 34 Z" fill="hsl(${(parentHue + 120) % 360}, 70%, 15%)"/></svg>`;

      students.push({
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
        motherPhoto: customMotherPhoto,
      });
    });

    return students;
  };

  const handleImportClick = () => {
    // Validate required fields
    const missingFields = targetFields
      .filter(f => f.required && (mappings[f.key] === undefined || mappings[f.key] === -1))
      .map(f => `${f.label} (${f.hindiLabel})`);

    if (missingFields.length > 0) {
      setValidationError(`Please map all mandatory database columns first: ${missingFields.join(', ')}`);
      return;
    }

    setValidationError(null);
    const finalStudents = getMappedStudents();
    onConfirm(finalStudents);
  };

  const firstRow = csvRows[0] || [];
  const previewMapped = getMappedStudents().slice(0, 3);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-8 max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight flex items-center gap-2">
                <span>Excel/CSV Column Comparison & Linker</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">Active Workspace</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                कॉलम-टू-कॉलम तुलना: Link columns of your uploaded spreadsheet with database keys by name.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Body Container with scrolling */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Mapping Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Hand: Descriptive Target database layout columns */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                  <Sparkles size={13} className="text-emerald-500" />
                  <span>1. Map Desired Format's Columns (डेटाबेस कॉलम लिंकर)</span>
                </h3>
                <span className="text-[10px] text-slate-450 font-mono">Matched automatically by fuzzy algorithm</span>
              </div>

              {/* Mapper Fields list */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                {targetFields.map((field) => {
                  const currentMappedIdx = mappings[field.key] ?? -1;
                  const isMapped = currentMappedIdx !== -1;
                  const sampleValue = isMapped && firstRow[currentMappedIdx] ? firstRow[currentMappedIdx] : '';

                  return (
                    <div 
                      key={field.key} 
                      className={`p-3.5 border rounded-xl transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        isMapped 
                          ? 'bg-emerald-50/45 border-emerald-200/80 shadow-xs' 
                          : field.required 
                            ? 'bg-rose-50/30 border-rose-100' 
                            : 'bg-slate-50/60 border-slate-100'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-display text-slate-900">{field.label}</span>
                          {field.required && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-semibold font-mono uppercase">Required</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight font-medium">{field.hindiLabel}</p>
                        <p className="text-[9px] text-slate-400 font-sans leading-none mt-1">{field.description}</p>
                      </div>

                      {/* Visual link action */}
                      <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                        <ArrowRight className={`text-slate-300 hidden md:block ${isMapped ? 'text-emerald-500' : ''}`} size={16} />
                        
                        <div className="space-y-1 w-full md:w-48">
                          <select
                            value={currentMappedIdx}
                            onChange={(e) => handleSelectChange(field.key, e.target.value)}
                            className={`w-full text-xs rounded-lg border px-2.5 py-1.5 font-semibold focus:outline-hidden transition-all ${
                              isMapped 
                                ? 'bg-white border-emerald-300 text-slate-950 font-sans shadow-sm ring-1 ring-emerald-200' 
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <option value="-1">-- Don't Map (Not Selected) --</option>
                            {csvHeaders.map((header, idx) => (
                              <option key={idx} value={idx}>
                                {header}
                              </option>
                            ))}
                          </select>

                          {/* Dynamic value preview row */}
                          {isMapped && (
                            <div className="text-[9.5px] text-slate-500 truncate max-w-[190px] pl-1 font-mono">
                              Preview: <span className="font-bold text-slate-700 italic">"{sampleValue || '(empty)'}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Hand: Uploaded raw Excel preview & database visualization */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                  <FileSpreadsheet size={13} className="text-indigo-500" />
                  <span>2. Uploaded Excel Sheet Preview (First 3 Rows)</span>
                </h3>
              </div>

              {/* Raw CSV list */}
              <div className="bg-slate-55 border border-slate-200 rounded-xl p-3.5 space-y-2.5 max-h-[180px] overflow-y-auto">
                <p className="text-[10px] text-slate-500 leading-normal">
                  The raw columns and rows detected from your uploaded file:
                </p>
                <div className="overflow-x-auto border border-slate-100 rounded-lg bg-white">
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        {csvHeaders.map((h, i) => (
                          <th key={i} className="p-2 border-r border-slate-100 whitespace-nowrap font-bold text-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-100 last:border-none text-slate-600">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-100 whitespace-nowrap truncate max-w-28">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database desired output compilation preview */}
              <div className="border-b border-slate-100 pb-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                  <Check size={13} className="text-emerald-600" />
                  <span>3. Database Destination Live Preview (How it will save)</span>
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-[10.5px] text-slate-600 leading-relaxed font-sans">
                  Behold! The final compiled records that will save to Google Cloud Firestore based on your linked configurations:
                </p>

                {previewMapped.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 text-center rounded-xl text-xs text-slate-400 font-sans italic">
                    Map required fields to view live database table preview.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {previewMapped.map((student, sIdx) => (
                      <div key={sIdx} className="bg-white border border-slate-100 p-3 rounded-xl hover:shadow-xs transition relative overflow-hidden flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 truncate pr-2">{student.name}</h4>
                            <span className="text-[9.5px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100">
                              {student.id}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-semibold">
                            {student.className} • {student.section}
                          </div>
                          <div className="text-[9px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 mt-1 font-mono">
                            <span>ADM: <strong className="text-slate-600 font-bold">{student.admissionNumber}</strong></span>
                            <span>Father: <span className="text-slate-600">{student.fatherName}</span></span>
                            <span>F-Mob: <span className="text-slate-600">{student.fatherMobile}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {csvRows.length > 3 && (
                      <div className="text-center text-[10px] text-slate-400 font-mono py-1">
                        + {csvRows.length - 3} more student profiles queued...
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Validation and Alert area */}
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-xs text-rose-800 font-sans">
              <AlertCircle className="shrink-0 text-rose-600" size={18} />
              <div>
                <strong className="block font-bold">Matching Errors Detected:</strong>
                <span className="mt-0.5 block font-medium leading-relaxed">{validationError}</span>
              </div>
            </div>
          )}

          {/* Verification Tip */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 flex gap-2.5 items-start text-[10.5px] text-amber-800 leading-normal">
            <HelpCircle size={15} className="shrink-0 text-amber-500 mt-0.5" />
            <p className="font-sans font-medium">
              <strong>Important Matching Guideline:</strong> If your uploaded file has a different header (e.g., <strong>"Fathers Contact"</strong>, <strong>"Mobile Number"</strong>), select it from the dropdown next to the respective field. This maps the spreadsheet data with high precision.
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-250 p-4.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            Cancel & Clear File
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-100 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <span>🚀 Import Linked Database</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
