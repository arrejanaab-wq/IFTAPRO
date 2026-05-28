import React, { useState } from "react";
import { Camera, Sparkles, Upload, Receipt, Trash2, ArrowRight, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

interface ReceiptOCRData {
  gallons: string;
  date: string;
  vendor: string;
  state: string;
  amount: string;
  confidence: string;
}

interface ReceiptScannerProps {
  onAddFuelRecord: (record: { date: string; unit: string; state: string; gallons: string; vendor: string }) => void;
  triggerToast: (msg: string, type?: "ok" | "err") => void;
}

export default function ReceiptScanner({ onAddFuelRecord, triggerToast }: ReceiptScannerProps) {
  const [selectedMock, setSelectedMock] = useState<number | null>(null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRData | null>(null);
  const [activeUnit, setActiveUnit] = useState<string>("Truck-101");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mockReceipts = [
    {
      id: 1,
      vendor: "Loves Travel Stops #432",
      address: "Loves Dallas Central - 432 S Expressway, Dallas TX 75201",
      date: "2026-05-10",
      gallons: "125.40",
      state: "TX",
      amount: "413.82",
      price_per_gal: "3.30"
    },
    {
      id: 2,
      vendor: "Pilot Flying J #883",
      address: "Pilot Oklahoma West - 100 Interstate 40, OKC OK 73108",
      date: "2026-05-15",
      gallons: "85.20",
      state: "OK",
      amount: "264.12",
      price_per_gal: "3.10"
    },
    {
      id: 3,
      vendor: "TA Express Travel Center",
      address: "TA Travelcenters - 788 Highway Road, Troy IL 62294",
      date: "2026-05-22",
      gallons: "112.50",
      state: "IL",
      amount: "485.43",
      price_per_gal: "4.315"
    }
  ];

  const handleSelectMock = (idx: number) => {
    setSelectedMock(idx);
    setCustomFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFile(file);
      setSelectedMock(null);
      setOcrResult(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const runOCRAutoScan = async () => {
    setOcrLoading(true);
    setOcrResult(null);

    // Let's either formulate parameters from our selected thermal mockup or custom file upload
    let payload = {};
    if (selectedMock !== null) {
      const mock = mockReceipts[selectedMock];
      payload = {
        image: "MOCK_RECEIPT_STUB",
        mock_vendor: mock.vendor,
        mock_date: mock.date,
        mock_gallons: mock.gallons,
        mock_state: mock.state,
        mock_amount: mock.amount
      };
    } else if (previewUrl) {
      // Send uploaded base64 data
      payload = { image: previewUrl };
    } else {
      triggerToast("Please select a sample thermal receipt or upload an invoice PNG/JPG.", "err");
      setOcrLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ocr-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`OCR service endpoint returned HTTP ${response.status}`);
      }

      const result = await response.json();
      setOcrResult(result);
      triggerToast("Receipt processing complete!", "ok");
    } catch (err: any) {
      triggerToast("OCR Scanning failed: " + err.message, "err");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCommitToDatabase = () => {
    if (!ocrResult) return;
    
    // Auto-commit to core state registers
    onAddFuelRecord({
      date: ocrResult.date,
      unit: activeUnit,
      state: ocrResult.state.toUpperCase(),
      gallons: ocrResult.gallons,
      vendor: ocrResult.vendor
    });

    triggerToast(`Added ${ocrResult.gallons} G in ${ocrResult.state.toUpperCase()} to ${activeUnit} fuel ledger!`, "ok");
    setOcrResult(null);
    setSelectedMock(null);
    setCustomFile(null);
    setPreviewUrl(null);
  };

  return (
    <div id="receiptScannerPanel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white flex items-center gap-2">
            <span>OCR Fuel Receipt Scanner & Digital Ingestion</span>
            <span className="text-xs bg-orange-500/10 text-orange-400 font-bold px-2 px-1 rounded-full border border-orange-500/10">OCR AI</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Remove tedious manual parameters. Upload a digital ticket snapshot and let our cognitive engine extract gallons, state codes, invoice values, merchant vendors, and fuel dates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: upload file trigger or select sample (7 columns wide) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Upload / Camera zone widget */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">Ingest New Snapshots</span>
              <span className="text-slate-400 font-semibold font-mono">Compatible file types: PNG, JPG, JPEG</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Box or file browser upload */}
              <div 
                className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 relative"
                onClick={() => document.getElementById("ocrFileInput")?.click()}
              >
                <div className="p-2.5 rounded-full bg-slate-900 text-slate-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-semibold text-xs text-slate-350">Choose local snapshot</span>
                  <span className="block text-[10px] text-slate-500 pt-0.5">or camera roll library</span>
                </div>
                <input 
                  id="ocrFileInput" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCustomUpload} 
                />
              </div>

              {/* Or manual camera simulate */}
              <div 
                className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                onClick={() => handleSelectMock(0)}
              >
                <div className="p-2.5 rounded-full bg-slate-900 text-slate-400">
                  <Camera className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="block font-semibold text-xs text-slate-350">Simulate scanner snap</span>
                  <span className="block text-[10px] text-slate-500 pt-0.5">using mock physical cards</span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Mock stub selector */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-3.5">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Inspect available test invoice receipts:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mockReceipts.map((mock, idx) => (
                <button 
                  key={mock.id}
                  onClick={() => handleSelectMock(idx)}
                  className={`p-3 text-left rounded-lg bg-slate-950/80 border transition flex flex-col justify-between h-32 select-none ${
                    selectedMock === idx 
                      ? "border-orange-500 bg-orange-500/5 shadow" 
                      : "border-slate-850 hover:border-slate-800 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[10px] text-orange-400 block tracking-wide uppercase">{mock.state} Purchase</span>
                    <span className="text-xs font-black text-slate-200 block truncate leading-tight">{mock.vendor.split(" ")[0]} ticket</span>
                  </div>
                  <div>
                    <span className="block text-xs font-mono font-bold text-slate-400">{mock.gallons} G</span>
                    <span className="block text-xs font-black text-slate-200 mt-1">${mock.amount} sum</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration unit selector */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="block text-xs font-bold text-slate-350">Target Assignee Unit:</span>
              <p className="text-[11px] text-slate-400">Verify select fleet truck registering this receipt file.</p>
            </div>
            <select 
              id="ocrAssigneeSelect"
              value={activeUnit} 
              onChange={(e) => setActiveUnit(e.target.value)}
              className="bg-[#070b13] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none w-full sm:w-48"
            >
              <option value="Truck-101">Truck-101 (Power Unit)</option>
              <option value="Truck-102">Truck-102 (Commercial Trailer)</option>
              <option value="Truck-103">Truck-103 (Logistics Unit)</option>
            </select>
          </div>

        </div>

        {/* Right column: Digital thermal receipt render and scan attributes results (5 columns wide) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4 flex flex-col h-full justify-between">
            <h3 className="font-display font-medium text-sm text-slate-200 border-b border-slate-900 pb-2 flex items-center gap-1">
              <Receipt className="w-4 h-4 text-orange-400" />
              <span>Digital Receipt Viewer</span>
            </h3>

            {/* Simulated thermal crumpled paper stub layout */}
            {selectedMock === null && !previewUrl && (
              <div className="my-auto py-12 text-center text-slate-500 text-xs">
                No tickets currently under scope. Click a snapshot preview stub to activate digitized analysis.
              </div>
            )}

            {(selectedMock !== null || previewUrl) && !ocrResult && (
              <div className="bg-[#f0f2f5] text-slate-800 p-5 rounded border border-slate-450 font-mono shadow-md text-xs space-y-3 mx-auto w-full max-w-[280px] text-left">
                <div className="text-center font-black">
                  <h3>* COMMERCIAL INVOICE *</h3>
                  <div>-------------</div>
                </div>

                {selectedMock !== null ? (
                  <>
                    <div className="space-y-0.5">
                      <span className="font-black">MERCHANT:</span> {mockReceipts[selectedMock].vendor.toUpperCase()}
                      <span className="font-black block text-[10px] select-all leading-tight text-slate-550">{mockReceipts[selectedMock].address}</span>
                    </div>
                    <div>
                      <div>-------------</div>
                      <span className="font-black">DATE:</span> {mockReceipts[selectedMock].date}
                    </div>
                    <div>
                      <span className="font-black">VOLUME GALLONS:</span> {mockReceipts[selectedMock].gallons} G
                      <span className="block font-black">STATE PROVINCE:</span> {mockReceipts[selectedMock].state}
                      <span className="block font-black">UNIT PRICE / G:</span> ${mockReceipts[selectedMock].price_per_gal} /G
                    </div>
                    <div>-------------</div>
                    <div className="flex justify-between font-black text-sm">
                      <span>MONETARY SUM:</span>
                      <span>${mockReceipts[selectedMock].amount}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <span className="text-xs bg-slate-300 px-2 py-0.5 rounded font-sans inline-block">File Snapshot Loaded</span>
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Local Fuel Purchase Receipt Stub" 
                        referrerPolicy="no-referrer"
                        className="max-h-48 rounded object-contain border mx-auto shadow"
                      />
                    )}
                  </div>
                )}

                <div className="text-center text-[10px] pt-2">
                  <span>* DIGITAL COMPLIANCE ARCHIVE *</span>
                </div>

                <button 
                  onClick={runOCRAutoScan}
                  disabled={ocrLoading}
                  className="w-full mt-3 py-2 bg-[#0c1424] hover:bg-[#1c223a] text-white font-bold text-xs rounded transition flex items-center justify-center gap-1 p-2 focus:ring-none shadow-sm cursor-pointer"
                >
                  {ocrLoading ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Digesting stub...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      <span>Digitize Receipt (AI)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Decoded OCR parser results values */}
            {ocrResult && !ocrLoading && (
              <div className="space-y-4 animate-fade-in my-auto">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/15 flex gap-2 items-center text-xs text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span>Successfully processed OCR transaction tags!</span>
                </div>

                <div className="bg-[#070b13] p-4 rounded-xl border border-slate-850 space-y-3 font-sans text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">AI Extracted Parameters</span>
                  
                  <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-900/50">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Vendor Merchant</span>
                      <span className="text-slate-200 block font-semibold">{ocrResult.vendor}</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Receipt Date</span>
                      <span className="text-slate-200 block font-mono">{ocrResult.date}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Jurisdiction</span>
                      <span className="text-slate-200 block font-bold font-mono text-orange-400 uppercase">{ocrResult.state}</span>
                    </div>
                    <div className="space-y-0.5 text-center">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Fuel Gallons</span>
                      <span className="text-slate-200 block font-bold font-mono text-blue-400">{ocrResult.gallons} G</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Total Spent</span>
                      <span className="text-slate-200 block font-bold font-mono text-emerald-400">${ocrResult.amount}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-905 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Audit compliance trust:</span>
                    <span className="text-emerald-500 font-bold uppercase">{ocrResult.confidence}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 bg-[#070b13]/40 border border-slate-900 rounded-lg text-slate-400 text-[10px] flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>This digitized ticket parameters will automatically flow into driver calculations, completing MPG balances.</span>
                  </div>
                  
                  <button 
                    onClick={handleCommitToDatabase}
                    className="w-full py-2.5 bg-gradient-to-tr from-[#10b981] to-[#047857] hover:shadow-lg text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Commit & Add to Fleet Ledgers</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
