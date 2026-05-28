import React, { useState } from "react";
import { Sparkles, Grid, ArrowRight, CheckCircle, Info, RefreshCw, AlertTriangle } from "lucide-react";

interface SmartColumnMapperProps {
  csvHeaders: string[];
  csvType: "trip" | "fuel";
  onMappingApplied: (mappings: Record<string, string>) => void;
  triggerToast: (msg: string, type?: "ok" | "err") => void;
  onCancel: () => void;
}

export default function SmartColumnMapper({ csvHeaders, csvType, onMappingApplied, triggerToast, onCancel }: SmartColumnMapperProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    // Generate simple initial guess from headers
    const guess: Record<string, string> = {};
    const stdFields = csvType === "trip" 
      ? ["unit_number", "state", "miles", "date"] 
      : ["unit_number", "state", "gallons", "date", "vendor", "price_per_gal"];

    stdFields.forEach(field => {
      // Find a header that resembles this standard field
      const found = csvHeaders.find(h => {
        const cleanedH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanedF = field.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanedH.includes(cleanedF) || cleanedF.includes(cleanedH);
      });
      guess[field] = found || "";
    });

    return guess;
  });

  const handleManualMapChange = (stdField: string, csvHeader: string) => {
    setMappings(prev => ({ ...prev, [stdField]: csvHeader }));
  };

  const runSmartAlignment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/smart-map-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: csvHeaders,
          file_type: csvType
        })
      });

      if (!response.ok) {
        throw new Error(`Alignment service returned error status HTTP ${response.status}`);
      }

      const alignment = await response.json();
      setMappings(alignment);
      triggerToast("AI successfully aligned CSV columns!", "ok");
    } catch (err: any) {
      triggerToast("Smart mapper fallbacked to local heuristics: " + err.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMappingsAndCommit = () => {
    // Check if critical fields are mapped
    const criticalFields = csvType === "trip" ? ["unit_number", "state", "miles"] : ["unit_number", "state", "gallons"];
    const unmapped = criticalFields.filter(f => !mappings[f]);
    if (unmapped.length > 0) {
      triggerToast(`Please map all critical fields before committing metrics: ${unmapped.join(", ")}`, "err");
      return;
    }

    onMappingApplied(mappings);
    triggerToast("Columns aligned and csv data parsed!", "ok");
  };

  const standardFields = csvType === "trip"
    ? [
        { key: "unit_number", label: "Tractor / Truck ID (ID)", required: true, desc: "Used to distinguish mileage per commercial unit" },
        { key: "state", label: "State Code (Jurisdiction)", required: true, desc: "Two letter code of transit states (e.g. TX)" },
        { key: "miles", label: "Miles Traveled", required: true, desc: "Distance elapsed in this state" },
        { key: "date", label: "Date of Log", required: false, desc: "Calendar date associated with coordinates" }
      ]
    : [
        { key: "unit_number", label: "Tractor / Truck ID (ID)", required: true, desc: "Used to align fuel purchases to a specific truck unit" },
        { key: "state", label: "Purchase State (Jurisdiction)", required: true, desc: "Two letter code of terminal pump state (e.g. OK)" },
        { key: "gallons", label: "Gallons Ingested", required: true, desc: "Volume recorded on retail fuel register invoices" },
        { key: "date", label: "Date of Purchase", required: false, desc: "Invoice submittal date" },
        { key: "vendor", label: "Merchant Vendor", required: false, desc: "Merchant name (e.g. Pilot Flying J)" },
        { key: "price_per_gal", label: "Price / G", required: false, desc: "Dollar cost per commercial gallon charged" }
      ];

  return (
    <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-5 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-orange-400" />
            <h3 className="font-display font-semibold text-sm text-slate-200">
              Align Columns Schema: Mismatching Headers Detected
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            Your CSV contains unaligned column headings. Instruct the importer to map keys manually or use Gemini Cognitive Mapping.
          </p>
        </div>

        <button 
          onClick={runSmartAlignment}
          disabled={loading}
          className="px-3.5 py-1.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white rounded-lg text-xs font-bold hover:shadow transition duration-150 flex items-center gap-1.5 shrink-0 self-start sm:self-center disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Auto-Align Columns (AI)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Mapping selectors card */}
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Align Attributes Linkage</span>
          
          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {standardFields.map((field) => (
              <div key={field.key} className="p-3.5 rounded-xl bg-[#0c1424]/40 border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-slate-800 transition">
                <div className="space-y-0.5 max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 block">{field.label}</span>
                    {field.required && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-400/5 px-1 rounded">RQD</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block leading-tight font-normal">{field.desc}</span>
                </div>

                <select 
                  className="bg-[#070b13] border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none max-w-full sm:max-w-[150px] cursor-pointer"
                  value={mappings[field.key] || ""}
                  onChange={(e) => handleManualMapChange(field.key, e.target.value)}
                  id={`select-map-${field.key}`}
                >
                  <option value="">— Unmapped —</option>
                  {csvHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Informational block / Summary validation list */}
        <div className="rounded-xl bg-[#0c1424]/30 p-5 border border-slate-900 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Alignment Information</span>
            
            <div className="space-y-3 text-xs leading-relaxed font-normal text-slate-400">
              <div className="flex gap-2 items-start">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Active configuration:</strong> Formatted for <strong className="text-slate-200 capitalize">{csvType} dataset logs</strong>.
                </span>
              </div>
              
              <div className="flex gap-2 items-start">
                <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>How to use:</strong> Map each standard field to its corresponding column heading in your custom CSV spreadsheet.
                </span>
              </div>

              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Validation:</strong> Ensure your column values contain expected formats (e.g. numeric values in miles/gallons, and two-letter codes for states).
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleApplyMappingsAndCommit}
              className="px-4 py-2.5 bg-gradient-to-tr from-[#10b981] to-[#047857] hover:shadow-lg text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer flex-1"
            >
              Confirm Columns Alignment
            </button>
            <button 
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
