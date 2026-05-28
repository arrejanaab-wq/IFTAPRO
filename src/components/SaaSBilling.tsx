import React, { useState } from "react";
import { Check, Coins, ShieldCheck, CreditCard, ChevronRight, Zap } from "lucide-react";

export default function SaasBilling() {
  const [activePlan, setActivePlan] = useState<string>("fleet");
  const [aiCredits, setAiCredits] = useState<number>(300);
  const [showBillingAlert, setShowBillingAlert] = useState<boolean>(false);

  const tiers = [
    {
      id: "starter",
      name: "Starter Bundle",
      price: "$29",
      period: "per truck / mo",
      desc: "Perfect for single truckers or owner-operator fleets under quarterly sign-offs.",
      truckLimit: "Up to 3 Vehicles",
      ocrCredits: "25 AI OCR Receipts / mo",
      features: [
        "Full base regional tax calculator",
        "PDF Quarterly Form printing",
        "Manual mileage & fuel ingestion",
        "Standard base audit analysis",
        "Commercial email desk support"
      ],
      badge: "Owner-Op",
      color: "border-slate-800 bg-[#0c1424]/40"
    },
    {
      id: "fleet",
      name: "Commercial Fleet",
      price: "$89",
      period: "per month flat",
      desc: "Designed for midscale regional carriers seeking complete route optimizations and integrations.",
      truckLimit: "Up to 50 Vehicles",
      ocrCredits: "300 AI OCR Receipts / mo",
      features: [
        "Unrestricted state rate schedules",
        "AI CSV automated column mapping",
        "Bulk national fuel card API integrations",
        "Cognitive fuel tax audit risk scans",
        "Cheapest state route advice engine",
        "Missing ticket audit gap warnings"
      ],
      badge: "MOST POPULAR",
      color: "border-orange-500/40 bg-gradient-to-br from-[#0c1424] to-[#161a29]"
    },
    {
      id: "enterprise",
      name: "Logistics Enterprise",
      price: "$249",
      period: "per month flat",
      desc: "High volume compliance control desks with fully customized reporting layers.",
      truckLimit: "Unlimited Vehicles",
      ocrCredits: "Unlimited AI Receipts",
      features: [
        "All lower-tier automation features",
        "Google Maps API routing Grounding",
        "Direct DOT filing bureau connectors",
        "Multi-user coordinator team permissions",
        "Dedicated compliance audit supervisor",
        "Custom API integration adapters"
      ],
      badge: "Global Freight",
      color: "border-purple-500/30 bg-[#0c1424]/40"
    }
  ];

  const invoices = [
    { date: "May 01, 2026", desc: "Commercial Fleet Plan - Monthly Sub", amount: "$89.00", card: "Visa ending in 8832", status: "Paid" },
    { date: "Apr 01, 2026", desc: "Commercial Fleet Plan - Monthly Sub", amount: "$89.00", card: "Visa ending in 8832", status: "Paid" },
    { date: "Mar 15, 2026", desc: "AI OCR Token Top-up (+100 credits)", amount: "$15.00", card: "Visa ending in 8832", status: "Paid" },
    { date: "Mar 01, 2026", desc: "Commercial Fleet Plan - Monthly Sub", amount: "$89.00", card: "Visa ending in 8832", status: "Paid" }
  ];

  const handlePlanSelect = (tierId: string) => {
    setActivePlan(tierId);
    if (tierId === "starter") setAiCredits(25);
    else if (tierId === "fleet") setAiCredits(300);
    else setAiCredits(9999);
    
    setShowBillingAlert(true);
    setTimeout(() => setShowBillingAlert(false), 3000);
  };

  const handleTopUpCredits = () => {
    setAiCredits(prev => prev + 100);
    setShowBillingAlert(true);
    setTimeout(() => setShowBillingAlert(false), 3000);
  };

  return (
    <div id="saasBillingPanel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-white">SaaS Plans & Subscription Billing</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your fleet subscription details, analyze AI credits usage quotas, and adjust pricing tiers.
          </p>
        </div>
      </div>

      {showBillingAlert && (
        <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <ShieldCheck className="w-4 h-4" />
          <span>Subscription status successfully updated! Quotas adjusted.</span>
        </div>
      )}

      {/* Subscription usage status indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Active Subscription Tier</span>
            <span className="block text-lg font-display text-white capitalize font-bold">{activePlan} Bundle</span>
            <span className="block text-xs text-slate-400">Renews on Jun 01, 2026</span>
          </div>
          <div className="p-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">AI OCR Scanning Tokens</span>
              <span className="block text-lg font-display text-white font-bold">
                {activePlan === "enterprise" ? "Unlimited" : `${aiCredits} Credits`}
              </span>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          {activePlan !== "enterprise" && (
            <div className="pt-2">
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full" style={{ width: `${(182 / aiCredits) * 100}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>182 used this month</span>
                <span>{aiCredits - 182} remaining</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">SaaS Fuel Cost Savings</span>
            <span className="block text-[#10b981] font-display text-lg font-bold">+$1,452.18 / avg yr</span>
            <span className="block text-xs text-slate-400">via intelligent refueling suggestions</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Coins className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Subscription Pricing Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isSelected = activePlan === tier.id;
          return (
            <div 
              key={tier.id} 
              className={`rounded-xl border p-6 flex flex-col justify-between space-y-6 transition hover:translate-y-[-2px] ${tier.color} relative overflow-hidden`}
            >
              {tier.badge && (
                <div className="absolute top-4 right-4 text-[10px] font-extrabold uppercase bg-orange-500 text-white px-2.5 py-0.5 rounded-full font-mono">
                  {tier.badge}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-slate-100 text-base">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-black text-white">{tier.price}</span>
                    <span className="text-xs text-slate-400 font-semibold">{tier.period}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1 select-none font-normal">{tier.desc}</p>
                </div>

                <div className="border-t border-slate-900 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-indigo-300 font-semibold">
                    <span>Fleet Support:</span>
                    <span>{tier.truckLimit}</span>
                  </div>
                  <div className="flex justify-between text-orange-400 font-semibold">
                    <span>AI Quota:</span>
                    <span>{tier.ocrCredits}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs text-slate-350 select-none font-normal items-start">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => handlePlanSelect(tier.id)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected 
                    ? "bg-gradient-to-tr from-orange-500 to-red-600 text-white active:translate-y-[1px]" 
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>{isSelected ? "👑 Active Subscription" : "Upgrade to plan"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Transactions & topups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 lg:col-span-2 space-y-4">
          <h3 className="font-display font-medium text-sm text-slate-200">Billing & Payment History</h3>
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-3">Billing Date</th>
                  <th className="p-3">Billing Description</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Invoice Sum</th>
                  <th className="p-3 text-center">Settled State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs font-sans text-slate-350">
                {invoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 p-3">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{inv.date}</td>
                    <td className="p-3 font-medium text-slate-200">{inv.desc}</td>
                    <td className="p-3 font-mono text-[11px]">{inv.card}</td>
                    <td className="p-3 text-right font-black font-mono text-slate-200">{inv.amount}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1424]/60 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-display font-medium text-sm text-orange-400 flex items-center gap-1">
              <Zap className="w-4 h-4" /> Need Extra AI Credits?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Running high volumes of digital receipt uploads? Add instant credit top-ups without modifying your baseline monthly software subscription tiers.
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 text-center flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-sans font-semibold">+100 Scan Credits</span>
              <span className="font-black text-emerald-400">$15.00</span>
            </div>
            <button 
              onClick={handleTopUpCredits}
              className="w-full py-2 bg-gradient-to-tr from-gray-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold transition"
            >
              Purchase extra credits (+100)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
