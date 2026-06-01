import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Truck, 
  Fuel, 
  Compass, 
  TrendingUp, 
  Sparkles, 
  Upload, 
  Grid, 
  FileText, 
  Coins, 
  Percent, 
  Plus, 
  Download, 
  Maximize2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Search, 
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Info,
  User as UserIcon,
  Cloud,
  LogIn,
  LogOut
} from "lucide-react";
import { TripRecord, FuelRecord, CalculationResults, AIAnalysisResponse, StateResult, UnitCalculatedData } from "./types";
import { IFTA_RATES, STATE_NAMES, QUARTERS, SAMPLE_FUEL_CARD } from "./data";
import { parseCSV, calculateIFTA, generatePDFHTML } from "./utils";

// Import modular dashboard subcomponents
import DeadlineAlerts from "./components/DeadlineAlerts";
import SaasBilling from "./components/SaaSBilling";
import RouteOptimizer from "./components/RouteOptimizer";
import ReceiptScanner from "./components/ReceiptScanner";
import SmartColumnMapper from "./components/SmartColumnMapper";
import FleetAnalytics from "./components/FleetAnalytics";
import TruckManagement from "./components/TruckManagement";
import LoginModal from "./components/LoginModal";

// API Integration imports
import { api } from "./api";

export default function App() {
  const [tab, setTab] = useState<string>("dashboard");
  const [quarter, setQuarter] = useState<string>("Q2 2026");
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [fuel, setFuel] = useState<FuelRecord[]>([]);
  const [results, setResults] = useState<CalculationResults | null>(null);

  // Firebase auth & synchronizer state hooks
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [trucks, setTrucks] = useState<any[]>([]);

  // Listen to Auth State changes & self-register users
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.auth.me().then((data) => {
        if (data.error) {
          localStorage.removeItem("token");
          setUser(null);
        } else {
          setUser(data);
        }
        setAuthLoading(false);
      }).catch(() => {
        setAuthLoading(false);
      });
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Sync state with cloud database if signed in
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [loadedTrips, loadedFuel, loadedTrucks] = await Promise.all([
          api.trips.list(),
          api.fuel.list(),
          api.trucks.list()
        ]);
        setTrips(loadedTrips);
        setFuel(loadedFuel);
        setTrucks(loadedTrucks);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [user]);

  // Auth Operations
  const handleSignIn = async () => {
    setIsLoginModalOpen(true);
  };

  const handleAuthSuccess = (user: any, token: string) => {
    localStorage.setItem("token", token);
    setUser(user);
    setIsLoginModalOpen(false);
  };

  const handleGoogleSignIn = async (response: any) => {
    try {
      const data = await api.auth.google(response.credential);
      if (data.token) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        triggerToast("Signed in with Google successfully!", "ok");
      }
    } catch (error: any) {
      triggerToast("Google sign-in error: " + error.message, "err");
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setTrips([]);
    setFuel([]);
    setResults(null);
    setAnomalies(null);
    setFuelCardLoaded(false);
    setUploadMsg({ trip: "", fuel: "" });
    triggerToast("Signed out. Reverted to local Guest sandbox.", "ok");
  };

  const [activeUnit, setActiveUnit] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [fuelCardLoaded, setFuelCardLoaded] = useState<boolean>(false);
  const [rateSearch, setRateSearch] = useState<string>("");

  // Manual trip inputs
  const [manualTrip, setManualTrip] = useState<{ unit: string; state: string; miles: string; date: string }>({
    unit: "",
    state: "TX",
    miles: "",
    date: ""
  });

  // Manual fuel inputs
  const [manualFuel, setManualFuel] = useState<{ unit: string; state: string; gallons: string; date: string }>({
    unit: "",
    state: "TX",
    gallons: "",
    date: ""
  });

  // AI Response States
  const [anomalies, setAnomalies] = useState<AIAnalysisResponse | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState<boolean>(false);
  const [anomalyError, setAnomalyError] = useState<string | null>(null);

  // Upload feedback States
  const [uploadMsg, setUploadMsg] = useState<{ trip: string; fuel: string }>({ trip: "", fuel: "" });
  const [dragOver, setDragOver] = useState<{ trip: boolean; fuel: boolean }>({ trip: false, fuel: false });

  // SMART HEADER ALIGNER STATE
  const [tempParsedHeaders, setTempParsedHeaders] = useState<string[]>([]);
  const [tempParsedRows, setTempParsedRows] = useState<any[]>([]);
  const [activeMapperType, setActiveMapperType] = useState<"trip" | "fuel" | null>(null);

  const tripFileInput = useRef<HTMLInputElement>(null);
  const fuelFileInput = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Safe manual addition helper (used by OCR and Optimizer results)
  const handleAddFuelDirect = async (record: { date: string; unit: string; state: string; gallons: string; vendor: string }) => {
    if (user) {
      try {
        await api.fuel.create({
          unit: record.unit,
          state: record.state.toUpperCase().slice(0, 2),
          gallons: String(record.gallons),
          date: record.date || new Date().toISOString().split("T")[0],
          vendor: record.vendor || "Standard Terminal",
          price_per_gal: 3.45
        });
        const nextFuel = await api.fuel.list();
        setFuel(nextFuel);
        triggerToast("Fuel ticket added & synced to Cloud!", "ok");
      } catch (error) {
        console.error("Error adding fuel:", error);
      }
    } else {
      const freshFuel: FuelRecord = {
        date: record.date || new Date().toISOString().split("T")[0],
        unit: record.unit,
        state: record.state.toUpperCase(),
        gallons: record.gallons,
        vendor: record.vendor,
        price_per_gal: 3.45
      };
      const nextFuel = [...fuel, freshFuel];
      setFuel(nextFuel);
      
      if (trips.length > 0) {
        const calculation = calculateIFTA(trips, nextFuel);
        setResults(calculation);
      }
      triggerToast("Fuel ticket recorded locally!");
    }
  };

  const handleApplySmartMapping = async (mappings: Record<string, string>) => {
    if (!activeMapperType || tempParsedRows.length === 0) return;

    const normalized = tempParsedRows.map(row => {
      const mappedRow: any = {};
      const actualUnitKey = mappings["unit_number"];
      const actualStateKey = mappings["state"];
      
      mappedRow.unit = row[actualUnitKey] || "Unknown";
      mappedRow.state = (row[actualStateKey] || "TX").toUpperCase();
      mappedRow.date = row[mappings["date"]] || new Date().toISOString().split("T")[0];

      if (activeMapperType === "trip") {
        const actualMilesKey = mappings["miles"];
        mappedRow.miles = String(row[actualMilesKey] || "0");
      } else {
        const actualGallonsKey = mappings["gallons"];
        mappedRow.gallons = String(row[actualGallonsKey] || "0");
        mappedRow.vendor = row[mappings["vendor"]] || "Standard Terminal";
        mappedRow.price_per_gal = parseFloat(String(row[mappings["price_per_gal"]] || "3.45"));
      }
      return mappedRow;
    });

    if (activeMapperType === "trip") {
      if (user) {
        try {
          await Promise.all(normalized.map(t => api.trips.create(t)));
          const nextTrips = await api.trips.list();
          setTrips(nextTrips);
          setUploadMsg((u) => ({ ...u, trip: `✅ ${normalized.length} trip rows synced` }));
          triggerToast(`Successfully synced ${normalized.length} trips to Cloud!`);
        } catch (error) {
          console.error("Error syncing trips:", error);
        }
      } else {
        setTrips((prev) => [...prev, ...normalized]);
        setUploadMsg((u) => ({ ...u, trip: `✅ ${normalized.length} trip rows loaded` }));
        triggerToast(`Successfully loaded ${normalized.length} distance records via Smart Mapping!`);
      }
    } else {
      if (user) {
        try {
          await Promise.all(normalized.map(f => api.fuel.create(f)));
          const nextFuel = await api.fuel.list();
          setFuel(nextFuel);
          setUploadMsg((u) => ({ ...u, fuel: `✅ ${normalized.length} transactions synced` }));
          triggerToast(`Successfully synced ${normalized.length} fuel tickets to Cloud!`);
        } catch (error) {
          console.error("Error syncing fuel:", error);
        }
      } else {
        setFuel((prev) => [...prev, ...normalized]);
        setUploadMsg((u) => ({ ...u, fuel: `✅ ${normalized.length} fuel transactions loaded via Smart Mapping` }));
        triggerToast(`Successfully loaded ${normalized.length} fuel records via Smart Mapping!`);
      }
    }

    // Clean up
    setTempParsedHeaders([]);
    setTempParsedRows([]);
    setActiveMapperType(null);
  };

  // Drag and drop or Browse logic
  const handleFile = (file: File, type: "trip" | "fuel") => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      triggerToast("Invalid format. Please upload .csv or .xlsx spreadsheets.", "err");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let parsed: any[] = [];

        if (isExcel) {
          const bstr = e.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          parsed = XLSX.utils.sheet_to_json(ws);
        } else {
          const text = e.target?.result as string;
          parsed = parseCSV(text);
        }
        
        if (parsed.length === 0) {
          triggerToast("File parsed 0 rows. Please verify content.", "err");
          return;
        }

        // Intercept column headers to determine if mapping overlay is necessary
        const parsedKeys = Object.keys(parsed[0]);
        const hasUnit = parsedKeys.includes("unit_number") || parsedKeys.includes("unit") || parsedKeys.includes("truck_id") || parsedKeys.includes("truck");
        const hasState = parsedKeys.includes("state") || parsedKeys.includes("jurisdiction") || parsedKeys.includes("st");
        const hasMiles = type === "trip" && (parsedKeys.includes("miles") || parsedKeys.includes("distance") || parsedKeys.includes("driven_miles"));
        const hasGallons = type === "fuel" && (parsedKeys.includes("gallons") || parsedKeys.includes("quantity") || parsedKeys.includes("vol") || parsedKeys.includes("qty"));

        const isFullyMapped = hasUnit && hasState && (type === "trip" ? hasMiles : hasGallons);

        if (!isFullyMapped) {
          setTempParsedHeaders(parsedKeys);
          setTempParsedRows(parsed);
          setActiveMapperType(type);
          triggerToast("Column mismatch detected! Launching Smart CSV Mapping Wizard...", "err");
        } else {
          const normalized = parsed.map(row => {
            const mappedRow: any = {};
            if (type === "trip") {
              mappedRow.unit = row.unit_number || row.unit || row.truck_id || row.truck;
              mappedRow.state = (row.state || row.jurisdiction || row.st || "TX").toUpperCase();
              mappedRow.miles = String(row.miles || row.distance || row.driven_miles || "0");
              mappedRow.date = row.date || new Date().toISOString().split("T")[0];
            } else {
              mappedRow.unit = row.unit_number || row.unit || row.truck_id || row.truck;
              mappedRow.state = (row.state || row.jurisdiction || row.st || "TX").toUpperCase();
              mappedRow.gallons = String(row.gallons || row.quantity || row.vol || row.qty || "0");
              mappedRow.date = row.date || new Date().toISOString().split("T")[0];
              mappedRow.vendor = row.vendor || row.merchant || "Standard Terminal";
              mappedRow.price_per_gal = parseFloat(String(row.price_per_gal || row.rate || "3.45"));
            }
            return mappedRow;
          });

          if (type === "trip") {
            if (user) {
              try {
                await Promise.all(normalized.map(t => api.trips.create(t)));
                const nextTrips = await api.trips.list();
                setTrips(nextTrips);
                setUploadMsg((u) => ({ ...u, trip: `✅ ${normalized.length} trip rows synced` }));
                triggerToast(`Successfully uploaded & synced ${normalized.length} trip logs to Cloud!`, "ok");
              } catch (error) {
                console.error("Error uploading trips:", error);
              }
            } else {
              setTrips((prev) => [...prev, ...normalized]);
              setUploadMsg((u) => ({ ...u, trip: `✅ ${normalized.length} trip rows loaded` }));
              triggerToast(`Successfully loaded ${normalized.length} distance records!`);
            }
          } else {
            if (user) {
              try {
                await Promise.all(normalized.map(f => api.fuel.create(f)));
                const nextFuel = await api.fuel.list();
                setFuel(nextFuel);
                setUploadMsg((u) => ({ ...u, fuel: `✅ ${normalized.length} fuel records synced` }));
                triggerToast(`Successfully uploaded & synced ${normalized.length} fuel invoices to Cloud!`, "ok");
              } catch (error) {
                console.error("Error uploading fuel:", error);
              }
            } else {
              setFuel((prev) => [...prev, ...normalized]);
              setUploadMsg((u) => ({ ...u, fuel: `✅ ${normalized.length} fuel transactions loaded` }));
              triggerToast(`Successfully loaded ${normalized.length} fuel records!`);
            }
          }
        }
      } catch (err: any) {
        triggerToast("Failed to parse CSV file: " + err.message, "err");
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent, type: "trip" | "fuel") => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [type]: false }));
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  };

  // Execution calculation
  const triggerCalculation = () => {
    if (trips.length === 0 && fuel.length === 0) {
      triggerToast("No datasets found. Import CSVs or enter records first.", "err");
      return;
    }
    const calculation = calculateIFTA(trips, fuel);
    setResults(calculation);
    setActiveUnit("all");
    setAnomalies(null); 
    setTab("results");
    triggerToast("Calculations completed for " + Object.keys(calculation).length + " units!");
  };

  // Server-side AI analysis calling modern Gemini setup
  const runAIAnalysis = async () => {
    if (!results) {
      triggerToast("Please perform calculation steps first.", "err");
      return;
    }
    setAnomalyLoading(true);
    setAnomalyError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ results })
      });
      
      if (!response.ok) {
        throw new Error(`Service returned HTTP ${response.status}`);
      }

      const parsedJSON = await response.json();
      setAnomalies(parsedJSON);
      triggerToast("AI Analysis complete!", "ok");
    } catch (e: any) {
      setAnomalyError(e.message || "Something went wrong during generation flow.");
      triggerToast("AI Analysis engine failed.", "err");
    } finally {
      setAnomalyLoading(false);
    }
  };

  // Exports
  const handleExportPDF = () => {
    if (!results) return;
    const htmlReport = generatePDFHTML(results, quarter);
    const blob = new Blob([htmlReport], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    
    // Creating virtual link and click trigger
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `IFTA_Report_${quarter.replace(/\s+/g, "_")}.html`;
    link.click();
    triggerToast("📄 HTML detailed report generated! Open in your browser for print / PDF layout.");
  };

  const handleExportCSV = () => {
    if (!results) return;
    const content = [
      ["Unit Number", "Jurisdiction", "State Name", "Miles Traveled", "Gallons Consumed", "Gallons Purchased", "Effective Tax Rate", "Tax Owed", "Tax Paid", "Net Due"]
    ];

    (Object.entries(results) as [string, UnitCalculatedData][]).forEach(([unitName, dataset]) => {
      (Object.entries(dataset.stateResults) as [string, StateResult][]).forEach(([st, data]) => {
        content.push([
          unitName,
          st,
          STATE_NAMES[st] || "Unknown",
          String(data.mi),
          String(data.gc),
          String(data.gp),
          String(data.rate),
          String(data.owed),
          String(data.paid),
          String(data.net)
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + content.map(v => v.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IFTA_Report_${quarter.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("📥 Calculation output exported to CSV.");
  };

  const triggerClearTripsOnly = async () => {
    if (user) {
      try {
        const tripsCol = collection(db, "users", user.uid, "trips");
        const tripsSnapshot = await getDocs(tripsCol);
        const tripBatches = [];
        let currentBatch = writeBatch(db);
        let count = 0;
        tripsSnapshot.forEach((docSnapshot) => {
          currentBatch.delete(docSnapshot.ref);
          count++;
          if (count === 400) {
            tripBatches.push(currentBatch);
            currentBatch = writeBatch(db);
            count = 0;
          }
        });
        if (count > 0) tripBatches.push(currentBatch);
        for (const b of tripBatches) {
          await b.commit();
        }
        setUploadMsg(p => ({ ...p, trip: "" }));
        triggerToast("Trips cloud records cleared successfully.", "ok");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trips`);
      }
    } else {
      setTrips([]);
      setUploadMsg(p => ({ ...p, trip: "" }));
      triggerToast("Trips cleared locally.");
    }
  };

  const triggerClearFuelOnly = async () => {
    if (user) {
      try {
        const fuelCol = collection(db, "users", user.uid, "fuel");
        const fuelSnapshot = await getDocs(fuelCol);
        const fuelBatches = [];
        let currentBatch = writeBatch(db);
        let count = 0;
        fuelSnapshot.forEach((docSnapshot) => {
          currentBatch.delete(docSnapshot.ref);
          count++;
          if (count === 400) {
            fuelBatches.push(currentBatch);
            currentBatch = writeBatch(db);
            count = 0;
          }
        });
        if (count > 0) fuelBatches.push(currentBatch);
        for (const b of fuelBatches) {
          await b.commit();
        }
        setUploadMsg(p => ({ ...p, fuel: "" }));
        triggerToast("Fuel cloud records cleared successfully.", "ok");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/fuel`);
      }
    } else {
      setFuel([]);
      setUploadMsg(p => ({ ...p, fuel: "" }));
      triggerToast("Fuel cleared locally.");
    }
  };

  const loadSimulatedFuelCard = async () => {
    const records: FuelRecord[] = SAMPLE_FUEL_CARD.map((item) => ({
      unit: item.unit,
      state: item.state,
      gallons: String(item.gallons),
      date: item.date,
      price_per_gal: item.price_per_gal,
      vendor: item.vendor
    }));

    const tripRecords: TripRecord[] = [
      { date: "2026-04-01", unit: "Truck-101", state: "TX", miles: "450" },
      { date: "2026-04-03", unit: "Truck-101", state: "LA", miles: "320" },
      { date: "2026-04-04", unit: "Truck-101", state: "MS", miles: "150" }, // Arkansas/Mississippi tax segments (Missing Receipt Gaps!)
      
      { date: "2026-04-08", unit: "Truck-102", state: "IL", miles: "510" },
      { date: "2026-04-12", unit: "Truck-102", state: "IN", miles: "300" },
      { date: "2026-04-14", unit: "Truck-102", state: "KY", miles: "220" }, // Kentucky gap
      
      { date: "2026-04-18", unit: "Truck-103", state: "OH", miles: "400" },
      { date: "2026-04-22", unit: "Truck-103", state: "PA", miles: "580" },
      { date: "2026-04-24", unit: "Truck-103", state: "NY", miles: "120" } // New York gap
    ];

    if (user) {
      try {
        await writeBatchChunked(user.uid, "fuel", records);
        await writeBatchChunked(user.uid, "trips", tripRecords);
        setFuelCardLoaded(true);
        triggerToast(`⛽ Mapped ${records.length} fuel invoices & parsed ${tripRecords.length} logs strictly on cloud!`, "ok");
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    } else {
      setFuel(records);
      setTrips(tripRecords);
      setFuelCardLoaded(true);
      triggerToast(`⛽ Mapped ${records.length} fuel invoices & parsed ${tripRecords.length} matching tripmeter logs! Ready to analyze.`);
    }
  };

  const validateTruck = (unitId: string) => {
    return trucks.some(t => t.unit_id === unitId);
  };

  const addManualTripRecord = async () => {
    if (!manualTrip.unit || !manualTrip.miles || isNaN(parseFloat(manualTrip.miles))) {
      triggerToast("Please provide valid Truck ID and distance miles numerical.", "err");
      return;
    }
    if (user && !validateTruck(manualTrip.unit)) {
      triggerToast(`Unit ${manualTrip.unit} is not registered. Please add it in Fleet Assets first.`, "err");
      return;
    }

    if (user) {
      try {
        await api.trips.create({
          unit: manualTrip.unit,
          state: manualTrip.state.toUpperCase().slice(0, 2),
          miles: String(manualTrip.miles),
          date: manualTrip.date || new Date().toISOString().split("T")[0]
        });
        const nextTrips = await api.trips.list();
        setTrips(nextTrips);
        setManualTrip({ unit: "", state: "TX", miles: "", date: "" });
        triggerToast("Trip recorded on MongoDB Cloud!", "ok");
      } catch (error) {
        console.error("Error adding trip:", error);
      }
    } else {
      setTrips((prev) => [...prev, { ...manualTrip }]);
      setManualTrip({ unit: "", state: "TX", miles: "", date: "" });
      triggerToast("Trip recorded locally!");
    }
  };

  const addManualFuelRecord = async () => {
    if (!manualFuel.unit || !manualFuel.gallons || isNaN(parseFloat(manualFuel.gallons))) {
      triggerToast("Please input valid Truck ID and gallons volume numerical.", "err");
      return;
    }
    if (user && !validateTruck(manualFuel.unit)) {
      triggerToast(`Unit ${manualFuel.unit} is not registered. Please add it in Fleet Assets first.`, "err");
      return;
    }

    if (user) {
      try {
        await api.fuel.create({
          unit: manualFuel.unit,
          state: manualFuel.state.toUpperCase().slice(0, 2),
          gallons: String(manualFuel.gallons),
          date: manualFuel.date || new Date().toISOString().split("T")[0],
          vendor: "Standard Terminal",
          price_per_gal: 3.45
        });
        const nextFuel = await api.fuel.list();
        setFuel(nextFuel);
        setManualFuel({ unit: "", state: "TX", gallons: "", date: "" });
        triggerToast("Fuel transaction recorded on MongoDB Cloud!", "ok");
      } catch (error) {
        console.error("Error adding fuel:", error);
      }
    } else {
      setFuel((prev) => [...prev, { ...manualFuel }]);
      setManualFuel({ unit: "", state: "TX", gallons: "", date: "" });
      triggerToast("Fuel transaction recorded locally!");
    }
  };

  const triggerClearAll = async () => {
    if (user) {
      try {
        // In a real app, you might have a dedicated "clear all" endpoint
        // For now, we'll delete them one by one or just inform the user
        triggerToast("Clear All not fully implemented for API yet. Please delete individual records or wait for bulk endpoint.", "err");
      } catch (error) {
        console.error("Error clearing data:", error);
      }
    } else {
      setTrips([]);
      setFuel([]);
      setResults(null);
      setAnomalies(null);
      setFuelCardLoaded(false);
      setUploadMsg({ trip: "", fuel: "" });
      triggerToast("All local databases cleared successfully.");
    }
  };

  // Summaries
  const totalNet = results ? (Object.values(results) as UnitCalculatedData[]).reduce((s, u) => s + u.netTotal, 0) : 0;
  const totalMiles = results ? (Object.values(results) as UnitCalculatedData[]).reduce((s, u) => s + u.totalMiles, 0) : 0;
  const totalUnits = results ? Object.keys(results).length : 0;

  const severityColorClass = (sev: "LOW" | "MEDIUM" | "HIGH") => {
    if (sev === "HIGH") return { text: "text-red-400 border-red-500/20 bg-red-500/10", border: "border-l-red-500", key: "HIGH" };
    if (sev === "MEDIUM") return { text: "text-amber-400 border-amber-500/20 bg-amber-500/10", border: "border-l-amber-500", key: "MEDIUM" };
    return { text: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", border: "border-l-emerald-500", key: "LOW" };
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans selection:bg-orange-500 selection:text-white pb-12">
      
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#070b13]/90 border-b border-slate-800/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-xl shadow-lg shadow-orange-500/10">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-medium text-lg leading-tight tracking-tight">IFTA Pro</div>
              <div className="text-xs text-slate-400 font-sans">Fleet Tax Management Platform</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Google Authentication / Firebase Cloud Sync Status Widget */}
            {authLoading ? (
              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500">
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-slate-400 animate-spin" />
                <span>Checking Cloud Session...</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3 bg-slate-900/60 border border-emerald-500/20 px-3 py-1 bg-gradient-to-r from-emerald-500/[0.02] to-transparent rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full border border-emerald-500/30" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                        {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : <UserIcon className="w-3 h-3" />}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#070b13] rounded-full animate-pulse" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">Cloud Sync Active</div>
                    <div className="text-[11px] font-medium text-slate-200 mt-0.5 max-w-[120px] truncate leading-none">
                      {user.displayName || user.displayName || user.email?.split("@")[0]}
                    </div>
                  </div>
                </div>
                <button
                  id="signOutBtn"
                  title="Sign Out to Guest Mode"
                  className="p-1 px-1.5 rounded bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-3 h-3" />
                  <span className="text-[10px]">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                  <span>Guest Mode (Local)</span>
                </span>
                <button
                  id="googleSignInBtn"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#070b13] font-semibold text-[11px] rounded-md transition duration-150 flex items-center gap-1 cursor-pointer shadow-sm"
                  onClick={handleSignIn}
                >
                  <LogIn className="w-3 h-3 text-slate-800" />
                  <span>Sign In / Sync</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Target Period:</span>
              <select 
                className="bg-transparent text-slate-200 outline-none focus:ring-0 text-xs border-none p-0 pr-6 ml-1 cursor-pointer"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                id="quarterSelect"
              >
                {QUARTERS.map(q => <option key={q} value={q} className="bg-slate-950 text-slate-300">{q}</option>)}
              </select>
            </div>

            {results && (
              <div className="flex items-center gap-1.5">
                <button 
                  id="exportCsvBtn"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 font-medium hover:border-slate-700 hover:text-white transition flex items-center gap-1"
                  onClick={handleExportCSV}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button 
                  id="exportPdfBtn"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 font-medium hover:border-slate-700 hover:text-white transition flex items-center gap-1"
                  onClick={handleExportPDF}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>
              </div>
            )}

            <button 
              id="calcIftaBtn"
              className="px-4 py-2 bg-gradient-to-tr from-orange-500 to-red-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-[1px] transition duration-150 flex items-center gap-1.5 cursor-pointer"
              onClick={triggerCalculation}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Calculate IFTA</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── TABS NAV ── */}
      <div className="bg-[#090f1a] border-b border-slate-900/60 sticky top-[73px] z-30 sub-nav-classes">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto flex gap-1.5 py-2.5 scrollbar-thin scrollbar-thumb-slate-800">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "assets", label: "🚛 Fleet Assets" },
            { id: "analytics", label: "📊 Fleet Intelligence" },
            { id: "optimization", label: "🌎 Route Surcharges" },
            { id: "ocr", label: "📸 Receipt OCR" },
            { id: "deadlines", label: "🔔 Alerts & Deadlines" },
            { id: "upload", label: "Upload CSV" },
            { id: "manual", label: "Manual Entry" },
            { id: "fuelcard", label: "Fuel Card Sync" },
            { id: "rates", label: "Diesel Tax Rates" },
            { id: "results", label: "Calculation Results" },
            { id: "ai", label: "AI Audit & Risks" },
            { id: "billing", label: "💰 SaaS Billing", role: "owner" }
          ].filter(item => !item.role || (user && user.role === item.role)).map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                id={`tabBtn-${item.id}`}
                className={`px-3.5 py-2.5 rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center ${
                  isActive 
                    ? "bg-gradient-to-br from-orange-500/15 to-red-600/15 border border-orange-500/35 text-orange-400 font-semibold" 
                    : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
                }`}
                onClick={() => setTab(item.id)}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8 animate-fade-in">

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>Fleet Tax Compliance Center</span>
                  <span className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold border border-orange-500/20 px-2.5 py-1 rounded-full">{quarter} Period</span>
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Automate the tracking, verification, calculations, and reporting of multi-jurisdiction fleet transactions under International Fuel Tax Agreement protocols.
                </p>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Trip Distance Records", count: trips.length, unit: "rows loaded", icon: Compass, color: "text-orange-400 bg-orange-500/5 border-orange-500/10" },
                { label: "Fuel Ingestion Records", count: fuel.length, unit: "transactions", icon: Fuel, color: "text-blue-400 bg-blue-500/5 border-blue-500/10" },
                { label: "Registered Fleet Units", count: results ? totalUnits : "—", unit: "vehicles reported", icon: Truck, color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" },
                { 
                  label: totalNet >= 0 ? "Net Tax Due" : "Net Credit balance", 
                  count: results ? `$${Math.abs(totalNet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—", 
                  unit: results ? (totalNet >= 0 ? "Owed to jurisdictions" : "Filing Credit") : "Pending Calculation", 
                  icon: Coins, 
                  color: totalNet >= 0 ? "text-red-400 bg-red-500/5 border-red-500/10" : "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className={`rounded-xl border p-5 transition hover:shadow-lg hover:shadow-slate-950/40 bg-[#0c1424]/90 ${stat.color}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                        <div>
                          <span className="block font-display text-2xl font-bold tracking-tight text-white">{stat.count}</span>
                          <span className="block text-xs mt-0.5 text-slate-400">{stat.unit}</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DASHBOARD ACTIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-medium text-base text-white">Tax Workflow Workflow</h3>
                </div>

                <div className="space-y-4">
                  {[
                    { number: "1", title: "Ingest Telematics Or CSVs", body: "Upload trip mileage files and commercial fuel tickets under the Upload tab." },
                    { number: "2", title: "Calculate Fuel MPG Matrices", body: "Our computational engine resolves unit-specific fuel economies to map average MPGs." },
                    { number: "3", title: "Run Cognitive Audit Audit", body: "Utilize advanced Gemini analytical modules to inspect fuel logs of audit flags." },
                    { number: "4", title: "Filing and Sign-off", body: "Generate compliant PDF/HTML forms or exports to final file with your licensing bureau." },
                  ].map((step) => (
                    <div key={step.number} className="flex gap-3 items-start group">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition duration-200">
                        {step.number}
                      </div>
                      <div className="text-xs space-y-0.5">
                        <h4 className="font-semibold text-slate-200 group-hover:text-orange-400 transition">{step.title}</h4>
                        <p className="text-slate-400 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-6 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-medium text-base text-white">Universal CSV Column Schema</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Compatible Formats</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#070b13] rounded-lg border border-slate-800/60 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-semibold text-orange-400">📊 Distance / Mileage logs</span>
                      <span className="text-[10px] text-slate-500 font-mono">Accepts unit_number, state, miles, date</span>
                    </div>
                    <pre className="text-[11px] font-mono text-cyan-400 leading-relaxed whitespace-pre-wrap select-all bg-slate-950 p-2.5 rounded border border-slate-900">
unit_number, state, miles, date{"\n"}
Truck-101,   TX,    450,   2026-04-01{"\n"}
Truck-101,   LA,    320,   2026-04-02{"\n"}
Truck-102,   IL,    510,   2026-04-03
                    </pre>
                  </div>

                  <div className="bg-[#070b13] rounded-lg border border-slate-800/60 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-semibold text-blue-400">⛽ Fuel Purchases records</span>
                      <span className="text-[10px] text-slate-500 font-mono">Accepts unit_number, state, gallons, date</span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all bg-slate-950 p-2.5 rounded border border-slate-900">
unit_number, state, gallons, date{"\n"}
Truck-101,   TX,    85.00,   2026-04-01{"\n"}
Truck-101,   LA,    70.50,   2026-04-02{"\n"}
Truck-102,   IL,    92.00,   2026-04-03
                    </pre>
                  </div>
                </div>

                <div className="flex gap-2 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    <strong>Header Normalization:</strong> The importer tolerates and automatically translates alias headers like: <em>unit_number, truck_id, jurisdiction, quantity, st, driven_miles.</em>
                  </p>
                </div>
              </div>

            </div>

            {/* QUICK LINK CARD ACTIONS */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1424]/90 p-5 flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-200">Need immediate sandbox test data?</h4>
                <p className="text-xs text-slate-400 mt-0.5">Toggle our instant telematics demo data under the Fuel Card tab, then hit calculate.</p>
              </div>
              <div className="flex gap-2.5">
                <button className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 transition pointer-events-auto" onClick={() => loadSimulatedFuelCard()}>
                  Load Instant Sample
                </button>
                <button className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer" onClick={() => setTab("upload")}>
                  Upload My Files
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ FLEET ASSETS ════ */}
        {tab === "assets" && (
          <TruckManagement 
            triggerToast={triggerToast} 
            onTrucksChange={(count) => {
              // Refresh trucks list to ensure state consistency
              api.trucks.list().then(setTrucks);
            }} 
          />
        )}

        {/* SMART COLUMN ALIGNER OVERLAY PANEL */}
        {activeMapperType && tempParsedHeaders.length > 0 && (
          <div className="mb-8">
            <SmartColumnMapper 
              csvHeaders={tempParsedHeaders} 
              csvType={activeMapperType} 
              onMappingApplied={handleApplySmartMapping} 
              triggerToast={triggerToast} 
              onCancel={() => {
                setTempParsedHeaders([]);
                setTempParsedRows([]);
                setActiveMapperType(null);
              }}
            />
          </div>
        )}

        {/* ════ FLEET INTELLIGENCE & ANALYTICS ════ */}
        {tab === "analytics" && (
          <FleetAnalytics results={results} tripsCount={trips.length} fuelCount={fuel.length} />
        )}

        {/* ════ ROUTE SURCHARGES OPTIMIZATION ════ */}
        {tab === "optimization" && (
          <RouteOptimizer onAddLog={handleAddFuelDirect} triggerToast={triggerToast} />
        )}

        {/* ════ RECEIPT OCR SCANNER ════ */}
        {tab === "ocr" && (
          <ReceiptScanner onAddFuelRecord={handleAddFuelDirect} triggerToast={triggerToast} />
        )}

        {/* ════ DEADLINE ALERTS & MISSING RECEIPT DETECTOR ════ */}
        {tab === "deadlines" && (
          <DeadlineAlerts results={results} onNavigateToTab={(newTab) => setTab(newTab)} />
        )}

        {/* ════ SUBSCRIPTION SAAS BILLING ════ */}
        {tab === "billing" && (
          <SaasBilling />
        )}

        {/* ════ UPLOAD CSV ════ */}
        {tab === "upload" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-semibold text-xl text-white">Import Telematics Datasets</h2>
              <p className="text-sm text-slate-400 mt-1">
                Drag-and-drop or click to browse local CSV log sheets from logging books or fuel ticket summaries.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Trip Ingestion Card */}
              <div className="rounded-xl border border-slate-800/85 bg-[#0c1424]/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-orange-400" />
                    <span className="font-semibold text-slate-200 text-sm">🗺️ Distance / Trip Records</span>
                  </div>
                  {uploadMsg.trip ? (
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 rounded-full">{uploadMsg.trip}</span>
                  ) : (
                    <span className="text-xs text-slate-500">Pending upload</span>
                  )}
                </div>

                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    dragOver.trip ? "border-orange-500 bg-orange-500/5" : "border-slate-800 hover:border-slate-600 bg-slate-950/40"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver((p) => ({ ...p, trip: true })); }}
                  onDragLeave={() => setDragOver((p) => ({ ...p, trip: false }))}
                  onDrop={(e) => onDrop(e, "trip")}
                  onClick={() => tripFileInput.current?.click()}
                  id="dragDropTrip"
                >
                  <Upload className={`w-8 h-8 mb-3 transition ${dragOver.trip ? "text-orange-400 scale-110" : "text-slate-500"}`} />
                  <span className="block font-medium text-xs text-slate-300">Drag & drop trip mileage CSV here</span>
                  <span className="block text-[11px] text-slate-500 mt-1">or click to choose files</span>
                  <input 
                    type="file" 
                    ref={tripFileInput} 
                    accept=".csv,text/csv" 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0], "trip"); e.target.value = ""; }} 
                  />
                </div>

                {trips.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{trips.length} loaded records — Preview (first 5 rows)</span>
                      <button className="text-[11px] text-red-400 flex items-center gap-1 hover:underline" onClick={triggerClearTripsOnly} id="clearTripsBtn">
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    </div>

                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-900/50">
                              <th className="py-2.5 px-3">Unit Name</th>
                              <th className="py-2.5 px-3">State</th>
                              <th className="py-2.5 px-3 text-right">Miles</th>
                              <th className="py-2.5 px-3">Log Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/60 font-sans text-xs">
                            {trips.slice(0, 5).map((row, index) => (
                              <tr key={index} className="hover:bg-slate-900/40">
                                <td className="py-2 px-3 text-slate-300 font-medium">{row.unit_number || row.unit || row.truck || "N/A"}</td>
                                <td className="py-2 px-3 text-slate-400 uppercase">{row.state || row.jurisdiction || "—"}</td>
                                <td className="py-2 px-3 text-right text-slate-3s text-orange-400 font-semibold">{row.miles || row.taxable_miles || 0} mi</td>
                                <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{row.date || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {trips.length > 5 && (
                        <div className="bg-slate-900/10 text-center py-1.5 text-[11px] text-slate-500 border-t border-slate-900/40">
                          and {trips.length - 5} additional rows...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fuel Ingestion Card */}
              <div className="rounded-xl border border-slate-800/85 bg-[#0c1424]/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-slate-200 text-sm">⛽ Fuel Purchase Logs</span>
                  </div>
                  {uploadMsg.fuel ? (
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 rounded-full">{uploadMsg.fuel}</span>
                  ) : (
                    <span className="text-xs text-slate-500">Pending upload</span>
                  )}
                </div>

                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    dragOver.fuel ? "border-blue-500 bg-blue-500/5" : "border-slate-800 hover:border-slate-600 bg-slate-950/40"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver((p) => ({ ...p, fuel: true })); }}
                  onDragLeave={() => setDragOver((p) => ({ ...p, fuel: false }))}
                  onDrop={(e) => onDrop(e, "fuel")}
                  onClick={() => fuelFileInput.current?.click()}
                  id="dragDropFuel"
                >
                  <Upload className={`w-8 h-8 mb-3 transition ${dragOver.fuel ? "text-blue-400 scale-110" : "text-slate-500"}`} />
                  <span className="block font-medium text-xs text-slate-300">Drag & drop fuel purchases CSV here</span>
                  <span className="block text-[11px] text-slate-500 mt-1">or click to choose files</span>
                  <input 
                    type="file" 
                    ref={fuelFileInput} 
                    accept=".csv,text/csv" 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0], "fuel"); e.target.value = ""; }} 
                  />
                </div>

                {fuel.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{fuel.length} loaded records — Preview (first 5 rows)</span>
                      <button className="text-[11px] text-red-400 flex items-center gap-1 hover:underline" onClick={triggerClearFuelOnly} id="clearFuelBtn">
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    </div>

                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-900/50">
                              <th className="py-2.5 px-3">Unit Name</th>
                              <th className="py-2.5 px-3">State</th>
                              <th className="py-2.5 px-3 text-right">Gallons</th>
                              <th className="py-2.5 px-3">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/60 font-sans text-xs">
                            {fuel.slice(0, 5).map((row, index) => (
                              <tr key={index} className="hover:bg-slate-900/40">
                                <td className="py-2 px-3 text-slate-300 font-medium">{row.unit_number || row.unit || row.truck || "N/A"}</td>
                                <td className="py-2 px-3 text-slate-400 uppercase">{row.state || row.jurisdiction || "—"}</td>
                                <td className="py-2 px-3 text-right text-blue-400 font-semibold">{row.gallons || row.quantity || 0} G</td>
                                <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{row.date || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {fuel.length > 5 && (
                        <div className="bg-slate-900/10 text-center py-1.5 text-[11px] text-slate-500 border-t border-slate-900/40">
                          and {fuel.length - 5} additional rows...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 rounded-xl bg-[#0c1424] border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Ready to compile distances and invoices? Let the math solver formulate state consumption balances.
              </span>
              <div className="flex gap-2">
                <button 
                  id="calcFromUpload"
                  className="px-5 py-2.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white font-semibold text-xs rounded-lg hover:shadow-lg transition cursor-pointer"
                  onClick={triggerCalculation}
                >
                  Calculate Combined IFTA
                </button>
                {(trips.length > 0 || fuel.length > 0) && (
                  <button 
                    id="clearFromUpload"
                    className="px-4 py-2 bg-red-950/20 hover:bg-red-900/30 text-xs text-red-400 border border-red-500/20 rounded-lg transition"
                    onClick={triggerClearAll}
                  >
                    Clear All Ingestion
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ════ MANUAL DATA ENTRY ════ */}
        {tab === "manual" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-semibold text-xl text-white">Manual Record Ingestion</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter logs raw. Good for recording a few missing trips or individual localized invoices on standard filing forms.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Trip Entry */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-5 space-y-4">
                <div className="flex items-center gap-1.5 text-[#f97316] font-semibold text-sm">
                  <Compass className="w-4 h-4" />
                  <h4>Log Trip / Odometer Distance</h4>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="tripUnitId">Select Registered Truck</label>
                    <select 
                      id="tripUnitId"
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition"
                      value={manualTrip.unit}
                      onChange={(e) => setManualTrip(prev => ({ ...prev, unit: e.target.value }))}
                    >
                      <option value="" className="bg-slate-950">-- Choose Truck --</option>
                      {trucks.map(t => (
                        <option key={t._id} value={t.unit_id} className="bg-slate-950">{t.unit_id} ({t.make})</option>
                      ))}
                    </select>
                    {trucks.length === 0 && (
                      <p className="text-[10px] text-red-400 mt-1">No trucks registered. Go to "Fleet Assets" first.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="tripJurisdictionSelect">Jurisdiction Jurisdiction</label>
                      <select 
                        id="tripJurisdictionSelect"
                        className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
                        value={manualTrip.state}
                        onChange={(e) => setManualTrip(p => ({ ...p, state: e.target.value }))}
                      >
                        {Object.entries(STATE_NAMES).map(([stKey, stName]) => (
                          <option key={stKey} value={stKey} className="bg-slate-950">{stKey} - {stName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="tripMilesInput">Miles Traveled</label>
                      <input 
                        id="tripMilesInput"
                        className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition" 
                        type="number"
                        min="0"
                        placeholder="e.g. 350"
                        value={manualTrip.miles}
                        onChange={(e) => setManualTrip(prev => ({ ...prev, miles: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="tripDate">Movement Date</label>
                    <input 
                      id="tripDate"
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition" 
                      type="date"
                      value={manualTrip.date}
                      onChange={(e) => setManualTrip(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <button 
                    id="addTripBtn"
                    className="w-full py-2.5 rounded-lg bg-orange-600/10 text-orange-400 hover:bg-orange-600/20 border border-orange-500/20 text-xs font-semibold transition cursor-pointer"
                    onClick={addManualTripRecord}
                  >
                    Add Trip Entry
                  </button>
                </div>

                {trips.length > 0 && (
                  <div className="pt-4 border-t border-slate-900/50">
                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2">Manually Registered Distance Logs ({trips.length})</span>
                    <div className="max-h-48 overflow-y-auto border border-slate-800/80 rounded-lg bg-slate-950/40">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left text-[10px] text-slate-500 uppercase">
                            <th className="p-2">Unit</th>
                            <th className="p-2">State</th>
                            <th className="p-2 text-right">Miles</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                          {trips.map((row, index) => (
                            <tr key={index} className="text-slate-300">
                              <td className="p-2 font-semibold text-orange-400">{row.unit || row.unit_number}</td>
                              <td className="p-2 uppercase">{row.state}</td>
                              <td className="p-2 text-right">{row.miles} mi</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Fuel Entry */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-5 space-y-4">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-sm">
                  <Fuel className="w-4 h-4" />
                  <h4>Log Fuel Purchase Receipt</h4>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="fuelUnitId">Select Registered Truck</label>
                    <select 
                      id="fuelUnitId"
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition"
                      value={manualFuel.unit}
                      onChange={(e) => setManualFuel(prev => ({ ...prev, unit: e.target.value }))}
                    >
                      <option value="" className="bg-slate-950">-- Choose Truck --</option>
                      {trucks.map(t => (
                        <option key={t._id} value={t.unit_id} className="bg-slate-950">{t.unit_id} ({t.make})</option>
                      ))}
                    </select>
                    {trucks.length === 0 && (
                      <p className="text-[10px] text-red-400 mt-1">No trucks registered. Go to "Fleet Assets" first.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="fuelJurisdictionSelect">Purchase State</label>
                      <select 
                        id="fuelJurisdictionSelect"
                        className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
                        value={manualFuel.state}
                        onChange={(e) => setManualFuel(p => ({ ...p, state: e.target.value }))}
                      >
                        {Object.entries(STATE_NAMES).map(([stKey, stName]) => (
                          <option key={stKey} value={stKey} className="bg-slate-950">{stKey} - {stName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="fuelGallonsInput">Gallons Purchased</label>
                      <input 
                        id="fuelGallonsInput"
                        className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition" 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 75.0"
                        value={manualFuel.gallons}
                        onChange={(e) => setManualFuel(prev => ({ ...prev, gallons: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5" htmlFor="fuelDate">Invoice Date</label>
                    <input 
                      id="fuelDate"
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition" 
                      type="date"
                      value={manualFuel.date}
                      onChange={(e) => setManualFuel(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <button 
                    id="addFuelBtn"
                    className="w-full py-2.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 text-xs font-semibold transition cursor-pointer"
                    onClick={addManualFuelRecord}
                  >
                    Add Fuel Receipt
                  </button>
                </div>

                {fuel.length > 0 && (
                  <div className="pt-4 border-t border-slate-900/50">
                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2">Manually Registered Invoices ({fuel.length})</span>
                    <div className="max-h-48 overflow-y-auto border border-slate-800/80 rounded-lg bg-slate-950/40">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-left text-[10px] text-slate-500 uppercase">
                            <th className="p-2">Unit</th>
                            <th className="p-2">State</th>
                            <th className="p-2 text-right">Gallons</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                          {fuel.map((row, index) => (
                            <tr key={index} className="text-slate-300">
                              <td className="p-2 font-semibold text-blue-400">{row.unit || row.unit_number}</td>
                              <td className="p-2 uppercase">{row.state}</td>
                              <td className="p-2 text-right">{row.gallons || row.quantity} G</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="pt-4 flex gap-2">
              <button className="px-5 py-2.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white text-xs font-bold rounded-lg hover:shadow-lg transition cursor-pointer" onClick={triggerCalculation}>
                Compile Local Data Points
              </button>
            </div>
          </div>
        )}

        {/* ════ FUEL CARD SYNC ════ */}
        {tab === "fuelcard" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-semibold text-xl text-white">Commercial Fuel Card API Integrations</h2>
              <p className="text-sm text-slate-400 mt-1">
                Establish paperless integrations directly with national commercial billing networks to instantly synchronize transactions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Comdata Network", status: "Coming Soon", icon: "🌐", body: "Direct telematics sync with Comdata Mastercard fleet portfolios.", border: "border-slate-800/60" },
                { name: "WEX Cards", status: "Coming Soon", icon: "💎", body: "EFS & WEX billing import modules via automated secure endpoints.", border: "border-slate-800/60" },
                { name: "Pilot Flying J", status: "Coming Soon", icon: "🔥", body: "Sync receipts instantly using Pilot Flying J MyRewards+ business profiles.", border: "border-slate-800/60" },
                { name: "TCS Fuel Card", status: "Coming Soon", icon: "🚀", body: "Ingest fuel ticket registers via automated portal query adapters.", border: "border-slate-800/60" },
                { name: "Love's Connect", status: "Coming Soon", icon: "❤️", body: "Map transactions from Love's commercial diesel accounts securely.", border: "border-slate-800/60" },
                { name: "Instant Telematics Sandbox", status: "Ready to Test", icon: "⚡", body: "Import 6 robust multijurisdictional transactions right now to test the tax workflow.", border: "border-orange-500/20 bg-orange-500/5", active: true },
              ].map((prov, i) => (
                <div key={i} className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 bg-[#0c1424]/60 ${prov.border}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{prov.icon}</span>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                        prov.active 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}>{prov.status}</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-sm text-slate-200">{prov.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{prov.body}</p>
                    </div>
                  </div>

                  {prov.active && (
                    <button 
                      id="loadSandboxBtn"
                      className="w-full py-2 bg-gradient-to-tr from-orange-500 to-red-600 text-white rounded-lg text-xs font-semibold hover:shadow-md transition duration-150 cursor-pointer"
                      disabled={fuelCardLoaded}
                      onClick={loadSimulatedFuelCard}
                    >
                      {fuelCardLoaded ? "Loaded - Ready to Calculate IFTA" : "Trigger Sandbox Import"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/30 p-5 space-y-4">
              <span className="block text-xs uppercase font-black text-slate-400 tracking-wider">Simulated API Ingest Feed</span>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/60 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-3">Log Date</th>
                        <th className="p-3">Fleet Unit</th>
                        <th className="p-3">State</th>
                        <th className="p-3 text-right">Gallons</th>
                        <th className="p-3 text-right">Price/G</th>
                        <th className="p-3 text-right">Invoice Sum</th>
                        <th className="p-3">Retail Merchant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-xs font-sans">
                      {SAMPLE_FUEL_CARD.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-900/40 text-slate-300">
                          <td className="p-3 font-mono text-slate-500">{row.date}</td>
                          <td className="p-3 font-semibold text-orange-400">{row.unit}</td>
                          <td className="p-3"><span className="bg-slate-900 px-2 py-0.5 rounded text-[11px] border border-slate-800 font-semibold">{row.state}</span></td>
                          <td className="p-3 text-right text-slate-200 mt-0.5 font-semibold">{row.gallons} G</td>
                          <td className="p-3 text-right text-emerald-400">${row.price_per_gal.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">${(row.gallons * row.price_per_gal).toFixed(2)}</td>
                          <td className="p-3 text-slate-400">{row.vendor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {fuelCardLoaded && (
                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-slate-350">Demo fuel card transactions mapped. Don't forget to upload or input trip miles to map distances!</span>
                  </div>
                  <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer" onClick={triggerCalculation}>
                    Proceed to Calculate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ DIESEL TAX RATES ════ */}
        {tab === "rates" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-semibold text-xl text-white">Commercial Diesel regional Subcharge Matrices</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Applicable Q2 2026 diesel fuel surcharge rates per gallon for the 48 mainland states.
                </p>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input 
                  id="rateSearchInput"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 outline-none transition" 
                  placeholder="Filter states (e.g. CA, Texas)..."
                  value={rateSearch}
                  onChange={(e) => setRateSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Highest rates */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-5 space-y-4">
                <h4 className="font-display font-medium text-sm text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Top 10 Highest Tax Jurisdictions
                </h4>

                <div className="space-y-2">
                  {Object.entries(IFTA_RATES)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([st, rate], index) => (
                      <div key={st} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-mono w-4">{index + 1}</span>
                          <span className="font-mono font-bold text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">{st}</span>
                          <span className="text-xs text-slate-400">{STATE_NAMES[st]}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-20 bg-slate-900 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full" style={{ width: `${(rate / 0.8) * 100}%` }}></div>
                          </div>
                          <span className="font-mono text-xs font-bold text-red-400">${rate.toFixed(3)}/G</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Lowest rates */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1424]/60 p-5 space-y-4">
                <h4 className="font-display font-medium text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Top 10 Lowest Tax Jurisdictions
                </h4>

                <div className="space-y-2">
                  {Object.entries(IFTA_RATES)
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, 10)
                    .map(([st, rate], index) => (
                      <div key={st} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-mono w-4">{index + 1}</span>
                          <span className="font-mono font-bold text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">{st}</span>
                          <span className="text-xs text-slate-400">{STATE_NAMES[st]}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-20 bg-slate-900 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full" style={{ width: `${(rate / 0.8) * 100}%` }}></div>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-400">${rate.toFixed(3)}/G</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
            </div>

            {/* FULL MATRIX */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1424]/90 p-5 space-y-4">
              <h3 className="font-display font-medium text-base text-white">Full Surcharge Schedule</h3>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0c1424] z-10">
                      <tr className="bg-slate-900 hover:bg-slate-900 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-3">State Identifier</th>
                        <th className="p-3">Jurisdiction Name</th>
                        <th className="p-3">Surcharge Rate ($/gal)</th>
                        <th className="p-3">Annualized Charge Surcharge (per 10k G)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-xs font-sans">
                      {Object.entries(IFTA_RATES)
                        .filter(([st, stName]) => {
                          const query = rateSearch.toLowerCase();
                          return st.toLowerCase().includes(query) || (STATE_NAMES[st] || "").toLowerCase().includes(query);
                        })
                        .sort((a, b) => (STATE_NAMES[a[0]] || "").localeCompare(STATE_NAMES[b[0]] || ""))
                        .map(([st, rate]) => (
                          <tr key={st} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="p-3 font-mono font-bold">{st}</td>
                            <td className="p-3 text-slate-400">{STATE_NAMES[st] || "—"}</td>
                            <td className={`p-3 font-mono font-semibold ${
                              rate > 0.45 
                                ? "text-red-400" 
                                : rate > 0.25 
                                  ? "text-amber-400" 
                                  : "text-emerald-400"
                            }`}>${rate.toFixed(3)}</td>
                            <td className="p-3 font-mono text-slate-500">${(rate * 10000).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                * Note: Surcharges dynamically adapt according to macro fuel adjustments. Verify base licensing updates on official clearing portals before submittal.
              </div>
            </div>
          </div>
        )}

        {/* ════ CALCULATION RESULTS ════ */}
        {tab === "results" && (
          <div className="space-y-6">
            
            {!results ? (
              <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-12 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                  <Percent className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-slate-200">Pending Computation</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Please upload standard CSV billing registries or enter parameters manually, then resolve computations.
                  </p>
                </div>
                <div className="flex gap-2.5 justify-center">
                  <button className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition" onClick={() => setTab("upload")}>
                    Import CSV Files
                  </button>
                  <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition" onClick={() => setTab("manual")}>
                    Add Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* GLOBAL OVERVIEW STRIPS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Target Surcharge Period", value: quarter, color: "text-slate-200" },
                    { label: "Fleet Transited Miles", value: `${totalMiles.toLocaleString()} mi`, color: "text-blue-400" },
                    { label: "Vehicles Reported", value: `${totalUnits} active`, color: "text-orange-400" },
                    { 
                      label: totalNet >= 0 ? "Outstanding Tax Liability" : "Expected Filing Refund", 
                      value: `$${Math.abs(totalNet).toFixed(2)}`, 
                      color: totalNet >= 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold" 
                    },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl bg-[#0c1424]/90 border border-slate-800/80 p-4">
                      <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{stat.label}</span>
                      <span className={`block font-display text-xl tracking-tight mt-1.5 ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* PILOT UNIT SELECTION CHIPS */}
                <div className="space-y-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Focus Unit Scope</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition duration-150 cursor-pointer ${
                        activeUnit === "all" 
                          ? "bg-gradient-to-tr from-orange-500 to-red-600 text-white border-transparent shadow shadow-orange-500/10" 
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800"
                      }`}
                      onClick={() => setActiveUnit("all")}
                    >
                      All Combined Units
                    </button>
                    {Object.keys(results).map((unit) => (
                      <button 
                        key={unit} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition duration-150 cursor-pointer ${
                          activeUnit === unit 
                            ? "bg-gradient-to-tr from-orange-500 to-red-600 text-white border-transparent shadow shadow-orange-500/10" 
                            : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800"
                        }`}
                        onClick={() => setActiveUnit(unit)}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COMBINED DISPOSITION TABLE */}
                {activeUnit === "all" && (
                  <div className="rounded-xl border border-slate-800 bg-[#0c1424]/90 p-5 space-y-4">
                    <h3 className="font-display font-medium text-base text-white">Consolidated Fleet Balance Sheet</h3>
                    
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-900 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <th className="p-3">Fleet Unit</th>
                            <th className="p-3 text-right">Compiled Distance</th>
                            <th className="p-3 text-right">Gallons Consumed</th>
                            <th className="p-3 text-right">Adjusted MPG</th>
                            <th className="p-3 text-center">Effective States</th>
                            <th className="p-3 text-right">Net Tax Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-xs font-sans">
                          {(Object.entries(results) as [string, UnitCalculatedData][]).map(([unit, data]) => (
                            <tr key={unit} className="hover:bg-slate-900/40 text-slate-300 cursor-pointer" onClick={() => setActiveUnit(unit)}>
                              <td className="p-3 font-bold text-orange-400 flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                <span>{unit}</span>
                              </td>
                              <td className="p-3 text-right font-mono">{data.totalMiles.toLocaleString()} mi</td>
                              <td className="p-3 text-right font-mono">{data.totalGallons.toFixed(1)} G</td>
                              <td className={`p-3 text-right font-mono font-bold ${
                                data.mpg < 5.0 
                                  ? "text-red-400" 
                                  : data.mpg > 8.0 
                                    ? "text-emerald-400" 
                                    : "text-slate-200"
                              }`}>{data.mpg}</td>
                              <td className="p-3 text-center font-mono">{Object.keys(data.stateResults).length}</td>
                              <td className="p-3 text-right font-mono">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  data.netTotal >= 0 
                                    ? "bg-red-500/10 text-red-400 border-red-500/10" 
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                                }`}>
                                  {data.netTotal >= 0 
                                    ? `+$${data.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} owed` 
                                    : `-$${Math.abs(data.netTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} credit`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-900 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Grand Net Surcharge Balance</span>
                      <span className={`font-display text-xl font-bold tracking-tight ${totalNet >= 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {totalNet >= 0 
                          ? `$${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })} DUE` 
                          : `$${Math.abs(totalNet).toLocaleString(undefined, { minimumFractionDigits: 2 })} FILEABLE CREDIT`}
                      </span>
                    </div>
                  </div>
                )}

                {/* INDIVIDUAL UNIT SHEET */}
                {activeUnit !== "all" && results[activeUnit] && (() => {
                  const data = results[activeUnit];
                  return (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* SPECIFIC UNIT STAT GRIDS */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: "Distance", value: `${data.totalMiles.toLocaleString()} mi`, color: "text-slate-200" },
                          { label: "Gallons Ingested", value: `${data.totalGallons.toFixed(1)} G`, color: "text-slate-200" },
                          { label: "Average MPG Fuel Economy", value: `${data.mpg}`, color: data.mpg < 5 ? "text-red-400 font-bold" : data.mpg > 8 ? "text-emerald-400 font-bold" : "text-amber-400" },
                          { label: "Transited States", value: `${Object.keys(data.stateResults).length}`, color: "text-slate-200" },
                          { 
                            label: "Outstanding Liability", 
                            value: `$${Math.abs(data.netTotal).toFixed(2)}`, 
                            color: data.netTotal >= 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold" 
                          },
                        ].map((stat, i) => (
                          <div key={i} className="rounded-xl bg-[#0c1424]/90 border border-slate-800/80 p-4">
                            <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{stat.label}</span>
                            <span className={`block font-display text-lg tracking-tight mt-1 ${stat.color}`}>{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* JURISDICTION BREAKDOWN TABLE */}
                      <div className="rounded-xl border border-slate-800 bg-[#0c1424]/90 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-medium text-base text-white">Jurisdictional Ledger: {activeUnit}</h3>
                          <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1" onClick={() => setActiveUnit("all")}>
                            Back to Grand Summary
                          </button>
                        </div>

                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-900 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                <th className="p-3">Jurisdiction</th>
                                <th className="p-3 text-right">Distance (mi)</th>
                                <th className="p-3 text-right">Cons. (gal)</th>
                                <th className="p-3 text-right">Purch. (gal)</th>
                                <th className="p-3 text-right">Tax Rate ($/G)</th>
                                <th className="p-3 text-right">Tax Owed</th>
                                <th className="p-3 text-right">Tax Paid</th>
                                <th className="p-3 text-right">Net Balance Due</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 text-xs font-mono text-slate-300">
                              {(Object.entries(data.stateResults) as [string, StateResult][])
                                .sort((a,b) => Math.abs(b[1].net) - Math.abs(a[1].net))
                                .map(([st, s]) => {
                                  const rawS = s as StateResult;
                                  return (
                                    <tr key={st} className="hover:bg-slate-900/40">
                                      <td className="p-3 font-sans font-bold">
                                        <span className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 mr-1">{st}</span>
                                        <span className="text-xs text-slate-400 font-normal hidden lg:inline">{STATE_NAMES[st]}</span>
                                      </td>
                                      <td className="p-3 text-right">{rawS.mi.toLocaleString()}</td>
                                      <td className="p-3 text-right">{rawS.gc.toFixed(1)}</td>
                                      <td className="p-3 text-right">{rawS.gp.toFixed(1)}</td>
                                      <td className="p-3 text-right text-slate-500">${rawS.rate.toFixed(3)}</td>
                                      <td className="p-3 text-right text-amber-400">${rawS.owed.toFixed(2)}</td>
                                      <td className="p-3 text-right text-emerald-400">${rawS.paid.toFixed(2)}</td>
                                      <td className="p-3 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                          rawS.net >= 0 
                                            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        }`}>
                                          {rawS.net >= 0 ? `+$${rawS.net.toFixed(2)}` : `-$${Math.abs(rawS.net).toFixed(2)}`}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-900 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Combined Surcharge: {activeUnit}</span>
                          <span className={`font-display text-lg font-bold tracking-tight ${data.netTotal >= 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {data.netTotal >= 0 
                              ? `$${data.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} DUE` 
                              : `$${Math.abs(data.netTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} OUTSTANDING CREDIT`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* RUN ANOMALY ACTIONS */}
                <div className="p-6 rounded-xl border border-slate-800 bg-gradient-to-r from-[#0c1424] to-[#121c32] flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="space-y-1">
                    <h4 className="font-display font-medium text-white flex items-center gap-1.5 text-sm md:text-base">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                      <span>Execute compliance audit audit scan?</span>
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Let Gemini analyze your fuel entries automatically to track down fuel consumption anomalies or optimization savings.
                    </p>
                  </div>
                  <button 
                    id="triggerAiScan"
                    className="px-5 py-2.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white font-bold text-xs rounded-lg hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    onClick={() => { setTab("ai"); runAIAnalysis(); }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Anomaly Scan</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ════ AI COMPLIANCE ANALYSIS ════ */}
        {tab === "ai" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-semibold text-xl text-white flex items-center gap-2">
                  <span>AI Audit, Risks and Optimizations</span>
                  {anomalies && (
                    <span className={`text-xs font-bold border px-3 py-1 rounded-full ${severityColorClass(anomalies.overall_risk).text}`}>
                      RISK FACTOR: {anomalies.overall_risk}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Leveraging server-side cognitive analysis models, Gemini scans mileage datasets against regulatory tax thresholds to flag anomalies.
                </p>
              </div>

              {results && !anomalyLoading && (
                <button 
                  id="reRunAiBtn"
                  className="px-4 py-2 border border-slate-850 bg-[#0c1424] hover:bg-[#121c32] rounded-lg text-xs font-semibold text-orange-400 transition" 
                  onClick={runAIAnalysis}
                >
                  Reload AI Audit
                </button>
              )}
            </div>

            {!results ? (
              <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-12 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-slate-200">Pending Execution results</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Compile calculations first before checking with cognitive models.
                  </p>
                </div>
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition" onClick={() => setTab("upload")}>
                  Upload Datasets
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* IDLE READY TO CHECK STATE */}
                {!anomalies && !anomalyLoading && (
                  <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-12 text-center space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-slate-900 text-orange-400 border border-slate-800 animate-pulse">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-medium text-slate-200">Audit Desk Ready for Scan</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Scans {totalUnits} unit(s) transiting {totalMiles.toLocaleString()} total miles for tax mismatches and non-matching fueling gaps.
                      </p>
                    </div>
                    <button 
                      id="launchInitAiScan"
                      className="px-5 py-2.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white text-xs font-bold rounded-lg hover:shadow-lg transition cursor-pointer" 
                      onClick={runAIAnalysis}
                    >
                      Initialize Gemini Audit Scan
                    </button>
                  </div>
                )}

                {/* COMPUTING LOADING STATE */}
                {anomalyLoading && (
                  <div className="rounded-xl border border-slate-850 bg-[#0c1424]/60 p-16 text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-900 text-orange-500 border border-slate-800">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-semibold text-slate-200">Gemini Parsing Fleet Records...</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Sifting distance charts, checking state densities, highlighting MPG boundaries, and calculating audit compliance risk...
                      </p>
                    </div>
                  </div>
                )}

                {/* FAILED STATE */}
                {anomalyError && (
                  <div className="rounded-xl border border-slate-800 bg-red-950/10 p-8 text-center space-y-4">
                    <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/10">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-red-400">Analysis Solvers Fault</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">{anomalyError}</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-950 border border-slate-800 text-xs font-medium rounded-lg text-slate-300" onClick={runAIAnalysis}>
                      Retry Server Connection
                    </button>
                  </div>
                )}

                {/* RESULTS POPULATED OUT */}
                {anomalies && !anomalyLoading && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Overall Summary Assessment banner */}
                    <div className={`rounded-xl border p-5 flex flex-col md:flex-row gap-4 items-start md:items-center ${severityColorClass(anomalies.overall_risk).text} border-l-4 ${severityColorClass(anomalies.overall_risk).border}`}>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850/60 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Audit Assessment Summary</span>
                        <p className="text-xs md:text-sm text-slate-200 font-medium leading-relaxed">{anomalies.summary}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left Block: Outliers list */}
                      <div className="space-y-4">
                        <h3 className="font-display font-medium text-base text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-3.5 text-orange-400" /> Exceptions Flagged
                        </h3>

                        {(!anomalies.anomalies || anomalies.anomalies.length === 0) ? (
                          <div className="rounded-xl p-8 border border-slate-850/60 bg-[#0c1424]/40 text-center space-y-2">
                            <span className="block text-xl">🎉</span>
                            <span className="block font-semibold text-xs text-slate-300">Clean Logs Report</span>
                            <span className="block text-[11px] text-slate-500">No telemetry outliers or matching issues parsed by Gemini.</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {anomalies.anomalies.map((anom, i) => {
                              const sevStyle = severityColorClass(anom.severity);
                              return (
                                <div key={i} className={`rounded-xl border bg-slate-950/30 p-4.5 space-y-3.5 border-l-4 ${sevStyle.border} border-slate-850`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/60 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sevStyle.text}`}>{anom.severity}</span>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{anom.type}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-orange-400 bg-orange-500/5 px-2 py-0.5 border border-orange-500/10 rounded">{anom.unit}</span>
                                  </div>

                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-slate-250 text-xs md:text-sm">{anom.title}</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed font-normal">{anom.detail}</p>
                                  </div>

                                  <div className="bg-slate-950/80 p-3 rounded border border-slate-900 flex items-start gap-1.5 text-blue-400">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span className="text-xs font-medium leading-relaxed"><strong>Action:</strong> {anom.recommendation}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Block: Optimization & Filing Checklist */}
                      <div className="space-y-6">
                        
                        {/* Optimizations */}
                        <div className="space-y-4">
                          <h3 className="font-display font-medium text-base text-white flex items-center gap-1.5">
                            <Coins className="w-4 h-3.5 text-emerald-400" /> cost planning Surcharges
                          </h3>

                          {anomalies.optimizations && anomalies.optimizations.map((opt, i) => (
                            <div key={i} className="rounded-xl border border-slate-800 bg-[#0c1424]/40 p-4.5 space-y-2.5">
                              <div className="flex justify-between items-start gap-3">
                                <h4 className="font-semibold text-slate-200 text-xs md:text-sm">{opt.title}</h4>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                                  Est. {opt.potential_savings}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-normal">{opt.detail}</p>
                            </div>
                          ))}
                        </div>

                        {/* Filing Checklist form */}
                        <div className="space-y-4">
                          <h3 className="font-display font-medium text-base text-white flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-3.5 text-orange-500" /> filing validation roadmap
                          </h3>

                          <div className="rounded-xl border border-slate-800 bg-[#0c1424]/20 p-5 space-y-3.5">
                            {anomalies.filing_checklist && anomalies.filing_checklist.map((item, i) => (
                              <label key={i} className="flex gap-3 items-start select-none cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  className="w-4.5 h-4.5 rounded border-slate-800 bg-slate-950 text-orange-600 focus:ring-0 focus:ring-offset-0 mt-0.5 shrink-0" 
                                />
                                <span className="text-xs text-slate-350 leading-relaxed group-hover:text-slate-100 transition">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* TOAST SYSTEM notifications */}
      {toast && (
        <div 
          style={{ animation: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4.5 py-3 rounded-xl shadow-2xl font-semibold text-xs border ${
            toast.type === "err" 
              ? "bg-red-950/90 text-red-300 border-red-500/20" 
              : "bg-emerald-950/90 text-emerald-300 border-emerald-500/20"
          }`}
        >
          {toast.type === "err" ? <AlertCircle className="w-4.5 h-4.5" /> : <CheckCircle className="w-4.5 h-4.5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onSuccess={handleAuthSuccess}
        triggerToast={triggerToast}
      />

      {/* FOOTER METRICS AND METADATA */}
      <footer className="border-t border-slate-800/80 mt-20 pt-6 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
        <div className="flex items-center gap-1.5">
          <span>IFTA Pro Suite </span>
          <span>•</span>
          <span>Quarterly Tax Compliance Portal</span>
          <span>•</span>
          <span className="text-slate-600 font-semibold">{quarter} Rates</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 hover:text-slate-400 transition">
          <Info className="w-3 h-3" />
          <span>Rates are advisory Q2 2026. Crosscheck regulatory listings at IFTA central (iftach.org) prior to audits.</span>
        </div>
      </footer>

    </div>
  );
}
