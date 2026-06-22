import React, { useState } from 'react';
import { AppNotification, EmailLog } from '../types';
import { Bell, Mail, Smartphone, RefreshCw, Layers, Check, Trash } from 'lucide-react';

interface CommunicationHubProps {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  emailLogs: EmailLog[];
  setEmailLogs: React.Dispatch<React.SetStateAction<EmailLog[]>>;
}

export default function CommunicationHub({
  notifications,
  setNotifications,
  emailLogs,
  setEmailLogs
}: CommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'email'>('app');

  const handleClearLogs = () => {
    if (activeTab === 'app') {
      setNotifications([]);
    } else {
      setEmailLogs([]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[340px] transition-all duration-300">
      
      {/* Header of communication router */}
      <div className="bg-slate-900 px-4 py-3.5 text-white flex items-center justify-between border-b-2 border-amber-500">
        <div className="flex items-center gap-2">
          <Layers className="text-amber-400 animate-pulse" size={18} />
          <div>
            <h3 className="font-display font-medium text-xs tracking-wider uppercase">Eco-Clearance Router</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Live SMS-Free Delivery Hub (Simulated)</p>
          </div>
        </div>

        <button
          onClick={handleClearLogs}
          title="Clear Feed"
          className="text-slate-400 hover:text-white transition duration-200 p-1 rounded hover:bg-slate-850 hover:bg-slate-800"
        >
          <Trash size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 p-1 bg-slate-100 shrink-0">
        <button
          id="btn-comm-app-notifs"
          onClick={() => setActiveTab('app')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'app' 
              ? 'bg-white text-slate-900 shadow-sm border-b-2 border-amber-500' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone size={13} />
          App Push ({notifications.length})
        </button>
        <button
          id="btn-comm-email-logs"
          onClick={() => setActiveTab('email')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
            activeTab === 'email' 
              ? 'bg-white text-slate-900 shadow-sm border-b-2 border-amber-500' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail size={13} />
          SMTP Email ({emailLogs.length})
        </button>
      </div>

      {/* List Feeds */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        
        {activeTab === 'app' ? (
          notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold italic">
              No Push alerts routed yet. Scan or authorized to trigger.
            </div>
          ) : (
            [...notifications].reverse().map(notif => (
              <div 
                key={notif.id} 
                className="bg-white border border-slate-150 p-3 rounded-xl shadow-3xs space-y-1 relative overflow-hidden group hover:border-slate-350 transition duration-350"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    notif.type === 'pickup_request' 
                      ? 'bg-amber-50 text-amber-800 border border-amber-100'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                  }`}>
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900 pt-1 font-display leading-tight">{notif.title}</h4>
                <p className="text-[10.5px] text-slate-650 leading-relaxed font-semibold">
                  {notif.body}
                </p>

                {/* Micro green tick for read state */}
                <span className="absolute bottom-2 right-2 text-emerald-600 opacity-20 group-hover:opacity-100 transition duration-300">
                  <Check size={12} />
                </span>
              </div>
            ))
          )
        ) : (
          emailLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold italic">
              No email transaction packets sent.
            </div>
          ) : (
            [...emailLogs].reverse().map(eml => (
              <div 
                key={eml.id} 
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs space-y-2 text-xs hover:border-slate-300 transition duration-200"
              >
                <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[10px] text-slate-500 font-mono">
                  <span className="truncate max-w-40 font-semibold">To: {eml.to} 🔗</span>
                  <span>{new Date(eml.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight font-display">{eml.subject}</h4>
                  <p className="text-[10.5px] text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                    {eml.body}
                  </p>
                </div>

                <div className="pt-1 text-[9.5px] text-slate-400 font-mono flex justify-between">
                  <span>Routing: RESEND_SMTP</span>
                  <span>SSL SECURE</span>
                </div>
              </div>
            ))
          )
        )}

      </div>

      {/* Information Footer */}
      <div className="bg-slate-550 px-4 py-2 bg-slate-50 border-t border-slate-210 text-[9.5px] text-slate-500 flex justify-between items-center shrink-0">
        <span>● Active SMTP Hub Port: 587</span>
        <span className="font-mono text-slate-400 font-semibold uppercase">Zero SMS Charges</span>
      </div>

    </div>
  );
}
