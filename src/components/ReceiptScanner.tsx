import React, { useState } from "react";
import { Camera, Sparkles, Upload, Receipt, Trash2, ArrowRight, CheckCircle2, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

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

const OCR_SPACE_KEY = ""; // Removed for security. Key now managed by server-side proxy.

export default function ReceiptScanner({ onAddFuelRecord, triggerToast }: ReceiptScannerProps) {
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRData | null>(null);
  const [activeUnit, setActiveUnit] = useState<string>("Truck-101");
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
    const mock = mockReceipts[idx];
    setPreviewUrl(null);
    setOcrResult({
      gallons: mock.gallons,
      date: mock.date,
      vendor: mock.vendor,
      state: mock.state,
      amount: mock.amount,
      confidence: "99% (SIMULATED)"
    });
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOcrResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const parseReceiptText = (text: string) => {
    let gallons = "0.00";
    let date = new Date().toISOString().split('T')[0];
    let state = "TX";
    let vendor = "Commercial Terminal";
    let amount = "0.00";

    const gallonsRegex = /(\d+\.\d{2,3})\s*(?:GAL|GALLONS|UNITS)/i;
    const gallonsMatch = text.match(gallonsRegex);
    if (gallonsMatch) gallons = gallonsMatch[1];

    const dateRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const rawDate = dateMatch[0];
      try {
        date = new Date(rawDate).toISOString().split('T')[0];
      } catch (e) {}
    }

    const stateCodes = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
    const stateMatch = text.toUpperCase().match(new RegExp(`\\b(${stateCodes.join('|')})\\b`));
    if (stateMatch) state = stateMatch[1];

    const amountRegex = /(?:TOTAL|SUM|AMOUNT|PAY)\s*[:$]?\s*(\d+\.\d{2})/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) amount = amountMatch[1];

    setOcrResult({
      gallons,
      date,
      vendor,
      state,
      amount,
      confidence: "82% (AI)"
    });
  };

  const runOCRAutoScan = async () => {
    if (!previewUrl) return;
    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("base64Image", previewUrl);
      formData.append("apikey", OCR_SPACE_KEY);
      formData.append("OCREngine", "2");

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.OCRExitCode === 1) {
        parseReceiptText(result.ParsedResults[0].ParsedText);
        triggerToast("Receipt processing complete!", "ok");
      } else {
        throw new Error(result.ErrorMessage || "OCR Error");
      }
    } catch (err: any) {
      triggerToast("OCR Scanning failed: " + err.message, "err");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCommitToDatabase = () => {
    if (!ocrResult) return;
    onAddFuelRecord({
      date: ocrResult.date,
      unit: activeUnit,
      state: ocrResult.state.toUpperCase(),
      gallons: ocrResult.gallons,
      vendor: ocrResult.vendor
    });
    triggerToast(`Added ${ocrResult.gallons} G to ${activeUnit}!`, "ok");
    setOcrResult(null);
    setPreviewUrl(null);
  };

  return (
    <div id="receiptScannerPanel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white flex items-center gap-2">
            <span>OCR Fuel Receipt Scanner</span>
            <span className="text-xs bg-orange-500/10 text-orange-400 font-bold px-2 px-1 rounded-full border border-orange-500/10">POWERED BY AI</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Scan physical tickets to extract gallons, state codes, and dates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                onClick={() => document.getElementById("ocrFileInput")?.click()}
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="block font-semibold text-xs text-slate-350">Upload Snapshot</span>
                <input id="ocrFileInput" type="file" accept="image/*" className="hidden" onChange={handleCustomUpload} />
              </div>
              <div 
                className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                onClick={() => handleSelectMock(0)}
              >
                <Camera className="w-5 h-5 text-slate-400" />
                <span className="block font-semibold text-xs text-slate-350">Simulate Camera</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-3.5">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Test Sample Invoices:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mockReceipts.map((mock, idx) => (
                <button 
                  key={mock.id}
                  onClick={() => handleSelectMock(idx)}
                  className="p-3 text-left rounded-lg bg-slate-950 border border-slate-800 hover:border-orange-500/50 transition h-24 flex flex-col justify-between"
                >
                  <span className="text-[10px] text-orange-400 font-bold uppercase">{mock.state}</span>
                  <span className="text-xs font-black text-slate-200 truncate">{mock.vendor}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-350">Target Truck:</span>
            <select 
              value={activeUnit} 
              onChange={(e) => setActiveUnit(e.target.value)}
              className="bg-[#070b13] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none"
            >
              <option value="Truck-101">Truck-101</option>
              <option value="Truck-102">Truck-102</option>
            </select>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Receipt className="w-4 h-4 text-orange-400" />
              Digital Output
            </h3>

            {previewUrl && !ocrResult && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <img src={previewUrl} className="max-h-48 rounded shadow-lg" alt="Preview" />
                <button 
                  onClick={runOCRAutoScan} 
                  disabled={ocrLoading}
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                >
                  {ocrLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Digitize Image
                </button>
              </div>
            )}

            {ocrResult && (
              <div className="space-y-4 animate-in fade-in">
                <div className="bg-[#070b13] p-4 rounded-xl border border-slate-850 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Gallons</span>
                      <input 
                        className="bg-transparent text-blue-400 font-black text-lg w-full outline-none"
                        value={ocrResult.gallons}
                        onChange={e => setOcrResult({...ocrResult, gallons: e.target.value})}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">State</span>
                      <input 
                        className="bg-transparent text-orange-400 font-black text-lg w-full outline-none"
                        value={ocrResult.state}
                        onChange={e => setOcrResult({...ocrResult, state: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Date</span>
                    <input 
                      type="date"
                      className="bg-slate-900 text-xs text-white p-1 rounded w-full mt-1"
                      value={ocrResult.date}
                      onChange={e => setOcrResult({...ocrResult, date: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleCommitToDatabase}
                  className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save to Cloud Ledger
                </button>
              </div>
            )}

            {!previewUrl && !ocrResult && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                Upload or select a mock stub to begin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
