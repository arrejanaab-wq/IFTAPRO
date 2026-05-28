import React from "react";
import { AlertTriangle, Clock, Calendar, CheckSquare, Bell, ArrowRight } from "lucide-react";
import { CalculationResults } from "../types";

interface DeadlineAlertsProps {
  results: CalculationResults | null;
  onNavigateToTab: (tabId: string) => void;
}

export default function DeadlineAlerts({ results, onNavigateToTab }: DeadlineAlertsProps) {
  // Extract state results with 0 fuel purchases in states they drove
  const complianceGaps: { unit: string; state: string; miles: number }[] = [];
  
  if (results) {
    Object.entries(results).forEach(([unitName, unitData]) => {
      Object.entries(unitData.stateResults).forEach(([st, data]) => {
        if (data.mi > 0 && data.gp === 0) {
          complianceGaps.push({
            unit: unitName,
            state: st,
            miles: data.mi
          });
        }
      });
    });
  }

  const notifications = [
    {
      id: "deadline-ifta",
      type: "URGENT",
      title: "Q2 2026 IFTA Filing Deadline",
      description: "Final quarterly form submittals and licensing settlements must be filed with your home jurisdiction by July 31, 2026.",
      dueDate: "July 31, 2026",
      daysLeft: 64,
      icon: Calendar,
      badge: "Quarterly Tax",
      color: "border-red-500/35 bg-red-500/5 text-red-400"
    },
    {
      id: "irp-renewal",
      type: "WARNING",
      title: "Apportioned IRP Registration Expiring",
      description: "Tractor Unit #102 Cab Card apportioned plates are scheduled to expire in 12 days. Renew credentials via state DOT hub shortly.",
      dueDate: "June 10, 2026",
      daysLeft: 12,
      icon: Clock,
      badge: "IRP Plates",
      color: "border-amber-500/35 bg-amber-500/5 text-amber-400"
    },
    {
      id: "oregon-hut",
      type: "INFO",
      title: "Oregon weight-mile Highway Use Tax (HUT)",
      description: "If any fleet vehicle traveled through Oregon state borders, you must catalog Weight-Distance logs separate from normal IFTA returns.",
      dueDate: "July 31, 2026",
      daysLeft: 64,
      icon: AlertTriangle,
      badge: "OR State HUT",
      color: "border-blue-500/35 bg-blue-500/5 text-blue-400"
    },
    {
      id: "irs-2290",
      type: "ALERT",
      title: "Heavy Highway Vehicle Use Tax (Form 2290)",
      description: "Annual IRS filing window for commercial rigs exceeding 55,000 lbs gross weight begins July 1st.",
      dueDate: "August 31, 2026",
      daysLeft: 95,
      icon: Bell,
      badge: "IRS Federal Tax",
      color: "border-purple-500/35 bg-purple-500/5 text-purple-400"
    }
  ];

  return (
    <div id="deadlineAlertsPanel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white flex items-center gap-2">
            <span>Fleet Deadlines & Compliance Center</span>
            <span className="text-xs bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/10">Action Required</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Stay ahead of severe DOT compliance timelines, state weight-distance filings, and audits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Compliance warnings panel / Missing Receipt Detector */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="font-display font-medium text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span>🚨 Missing Fuel Receipt Detector</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold font-mono bg-slate-950 px-2 py-0.5 border border-slate-800 rounded">
              {complianceGaps.length} Gaps Outstanding
            </span>
          </div>

          {complianceGaps.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-[#070b13]/55 rounded-lg border border-slate-900">
              <span className="text-2xl block">✅</span>
              <h4 className="font-medium text-xs text-slate-200">No Auditing Irregularities Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All states with recorded odometer passage contain fuel purchase allocations. Zero missing-receipt vulnerabilities detected.
              </p>
              <button 
                onClick={() => onNavigateToTab("upload")}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-orange-400 font-semibold transition"
              >
                Upload more fleet data
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-red-950/20 rounded-lg border border-red-500/15 text-xs text-red-300">
                <strong>Attention Coordinator:</strong> Driving through jurisdictions without refueling creates full base-rate tax exposure without any fuel pump tax-paid credits.
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {complianceGaps.map((gap, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#070b13] p-3 rounded-lg border border-slate-850 hover:border-slate-800 transition gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono">{gap.unit}</span>
                        <span className="font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px] border border-red-500/10">MISSING RECEIPT</span>
                      </div>
                      <p className="text-xs text-slate-400 font-normal">
                        Logged <strong className="text-slate-200">{gap.miles} miles</strong> through <strong className="text-red-400 uppercase">{gap.state}</strong> but has <strong className="text-slate-200">0.0 Gallons</strong> registered.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onNavigateToTab("ocr")}
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] rounded transition flex items-center gap-1"
                      >
                        Scan Receipt
                      </button>
                      <button 
                        onClick={() => onNavigateToTab("manual")}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-[11px] rounded border border-slate-800 transition"
                      >
                        Enter Manually
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Timeline Widget */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4">
          <h3 className="font-display font-medium text-sm text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>Upcoming Tax Deadlines</span>
          </h3>
          
          <div className="space-y-3.5">
            {notifications.map((notif) => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className={`rounded-xl border p-4.5 space-y-3 ${notif.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-slate-950 border border-slate-850">{notif.badge}</span>
                    <span className="text-[10px] font-mono font-semibold">{notif.daysLeft} days left</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs">{notif.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-1 font-normal">{notif.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[10px]">
                    <span className="text-slate-500 font-semibold font-mono">Due Date: {notif.dueDate}</span>
                    <button className="text-orange-400 hover:text-orange-350 transition flex items-center gap-0.5">
                      <span>Resolve</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
