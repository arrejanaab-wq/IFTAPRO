import React, { useState } from "react";
import { Compass, Sparkles, MapPin, AlertCircle, ArrowRight, CornerDownRight, Percent, Info } from "lucide-react";

interface RouteOptimizerProps {
  onAddLog: (log: { date: string; unit: string; state: string; gallons: string; vendor: string }) => void;
  triggerToast: (msg: string, type?: "ok" | "err") => void;
}

interface RefuelStep {
  state: string;
  action: string;
  gallons: number;
  est_price: number;
  tax_rate: number;
  why: string;
}

interface OptimizationResult {
  route_summary: string;
  total_est_cost: string;
  total_savings: string;
  overall_strategy: string;
  refueling_plan: RefuelStep[];
  auditable_states: string[];
}

export default function RouteOptimizer({ onAddLog, triggerToast }: RouteOptimizerProps) {
  const [startPoint, setStartPoint] = useState<string>("Dallas, TX");
  const [endPoint, setEndPoint] = useState<string>("Chicago, IL");
  const [tankCapacity, setTankCapacity] = useState<string>("150");
  const [activeUnit, setActiveUnit] = useState<string>("Truck-101");
  const [loading, setLoading] = useState<boolean>(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);

  const sampleQuickRoutes = [
    { start: "Dallas, TX", end: "Chicago, IL", transit: "TX, OK, MO, IL" },
    { start: "Houston, TX", end: "Los Angeles, CA", transit: "TX, NM, AZ, CA" },
    { start: "Philadelphia, PA", end: "Miami, FL", transit: "PA, MD, VA, NC, SC, GA, FL" }
  ];

  const handleApplyQuickRoute = (r: { start: string; end: string }) => {
    setStartPoint(r.start);
    setEndPoint(r.end);
    setOptimization(null);
  };

  const runRouteOptimization = async () => {
    if (!startPoint || !endPoint) {
      triggerToast("Please input start and destination coordinates.", "err");
      return;
    }

    setLoading(true);
    setOptimization(null);

    try {
      const response = await fetch("/api/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startPoint,
          end: endPoint,
          tank_capacity: tankCapacity,
          unit: activeUnit
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      setOptimization(result);
      triggerToast("AI Refueling optimization plan computed!", "ok");
    } catch (err: any) {
      triggerToast("Failed to optimize route: " + err.message, "err");
    } finally {
      setLoading(false);
    }
  };

  // Quick insertion helpers for operators to instantly simulate fuel purchase from suggested plans
  const handleIncorporateSuggestedAction = (step: RefuelStep) => {
    const today = new Date().toISOString().split("T")[0];
    onAddLog({
      date: today,
      unit: activeUnit,
      state: step.state.toUpperCase(),
      gallons: String(step.gallons),
      vendor: `AI Suggested Station (${step.state.toUpperCase()})`
    });
    triggerToast(`Added suggested refuel of ${step.gallons} G in ${step.state.toUpperCase()} to fuel receipts!`, "ok");
  };

  return (
    <div id="routeOptimizerPanel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white flex items-center gap-2">
            <span>🌎 Route Optimization & Fuel Tax Surcharge planner</span>
            <span className="text-[10px] bg-green-500/10 text-green-400 font-bold px-2 py-0.5 rounded border border-green-500/10 uppercase">AI Grounding</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Calculate state surcharge matrices dynamically. Refuel in lower-tax jurisdictions (e.g., Oklahoma) instead of high-tax states (e.g., Illinois) to reduce final quarterly IFTA liabilities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left planner form card */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4 h-fit">
          <h3 className="font-display font-medium text-sm text-slate-200">Fuel Arbitrage Parameters</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1" htmlFor="routeUnitSelect">Unit Selection</label>
              <select 
                id="routeUnitSelect"
                value={activeUnit} 
                onChange={(e) => setActiveUnit(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 outline-none"
              >
                <option value="Truck-101">Truck-101 (Power Unit)</option>
                <option value="Truck-102">Truck-102 (Commercial Trailer)</option>
                <option value="Truck-103">Truck-103 (Logistics Unit)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1" htmlFor="originInput">Origin Hub</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input 
                    id="originInput"
                    value={startPoint} 
                    onChange={(e) => setStartPoint(e.target.value)} 
                    placeholder="e.g. Dallas, TX"
                    className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1" htmlFor="destInput">Destination Terminal</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 animate-pulse" />
                  <input 
                    id="destInput"
                    value={endPoint} 
                    onChange={(e) => setEndPoint(e.target.value)} 
                    placeholder="e.g. Chicago, IL"
                    className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1" htmlFor="tankInput">Usable Fuel Capacity (Gal)</label>
              <input 
                id="tankInput"
                type="number"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 focus:border-orange-500/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                placeholder="default 150 G"
              />
            </div>

            <button 
              onClick={runRouteOptimization}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-tr from-orange-500 to-red-600 text-white font-bold text-xs rounded-lg hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>Configuring State Surcharges...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Formulate Fuel Plan</span>
                </>
              )}
            </button>
          </div>

          <div className="border-t border-slate-900 pt-3 space-y-2">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500">Quick-Load Lanes</span>
            <div className="space-y-1.5">
              {sampleQuickRoutes.map((qr, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleApplyQuickRoute(qr)}
                  className="w-full text-left p-2 rounded bg-slate-950 border border-slate-900 hover:border-slate-800 transition flex justify-between items-center text-[11px] group text-slate-400"
                >
                  <div className="truncate">
                    <span className="font-bold text-slate-250 block">{qr.start} ➔ {qr.end}</span>
                    <span className="text-[10px] text-slate-500 block truncate">Transiting: {qr.transit}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right optimization visual results */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 lg:col-span-2 space-y-5 flex flex-col justify-between">
          {!optimization && !loading && (
            <div className="my-auto py-12 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-medium text-slate-200">Refueling Strategy Matrix is Ready</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a commercial route above and initiate the AI planning engine to obtain dynamic, tax-optimized coordinates.
                </p>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-900 rounded-lg max-w-md mx-auto flex gap-2 text-left items-start text-xs text-slate-400 font-normal leading-relaxed">
                <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Did you know?</strong> While diesel pricing might look identical at neighboring pumps, state base tax differentials (e.g. Indiana $0.530 vs Ohio $0.475) can cause up to $82 per tank in unseen IFTA adjustments due at quarter close.
                </span>
              </div>
            </div>
          )}

          {loading && (
            <div className="my-auto py-16 text-center space-y-4">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-900 text-orange-500 border border-slate-800 animate-spin">
                <Compass className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-slate-200">Querying Route-Optimization Matrix...</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Aligning highways across states, correlating pump surcharges, estimating target gallon consumption, and drafting arbitrage reports...
                </p>
              </div>
            </div>
          )}

          {optimization && !loading && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Strategic overview stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#070b13] rounded-lg border border-slate-850 p-3.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Route Distance Scope</span>
                  <span className="block font-display text-base font-bold text-white mt-1 select-none">{optimization.route_summary}</span>
                </div>
                <div className="bg-[#070b13] rounded-lg border border-slate-850 p-3.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Estimated Surcharge Cost</span>
                  <span className="block font-display text-base font-bold text-slate-200 mt-1 select-all">{optimization.total_est_cost}</span>
                </div>
                <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/15 p-3.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400 font-bold">Estimated Surcharge Savings</span>
                  <span className="block font-display text-base font-bold text-emerald-400 mt-1">{optimization.total_savings}</span>
                </div>
              </div>

              {/* Strategic Adviser alert */}
              <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/15 text-xs text-orange-300 leading-relaxed font-normal">
                <strong>AI Routing Strategy:</strong> {optimization.overall_strategy}
              </div>

              {/* Refuel stops stepper */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step-by-Step Dispatch Refueling Guidance</h4>
                
                <div className="space-y-3">
                  {optimization.refueling_plan.map((step, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#070b13]/80 p-4 rounded-xl border border-slate-850 hover:border-slate-800 transition gap-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase">{step.state}</span>
                            <span className="text-xs text-slate-300 font-bold">{step.action}</span>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 rounded">Surcharge: ${step.tax_rate.toFixed(3)}/G</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed select-none font-normal">{step.why}</p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto p-2 sm:p-0 bg-slate-950 sm:bg-transparent rounded border border-slate-900 sm:border-none">
                        <div className="sm:text-right">
                          <span className="block text-xs font-black text-slate-200">{step.gallons} Gallons</span>
                          <span className="block text-[10px] text-slate-500 font-mono">Est Price: ${step.est_price}/gal</span>
                        </div>
                        <button 
                          onClick={() => handleIncorporateSuggestedAction(step)}
                          className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-orange-400 rounded transition shrink-0 mt-0 sm:mt-1.5"
                        >
                          Fill Tank
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highway boundaries disclaimer */}
              <div className="p-3.5 bg-slate-950/45 rounded-lg border border-slate-850 text-xs text-slate-500 flex gap-2 items-start font-normal leading-relaxed">
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Auditable Lanes notice:</strong> Dispatch route suggestions represent simulated state compliance thresholds. High mileage transits through California, New York, or Pennsylvania without matching local invoices are prone to State Audits. Crossreference dispatchers regularly.
                </span>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
