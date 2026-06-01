import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Zap, Globe, Check, Star, ArrowRight, Truck, Info, Coins, Shield } from 'lucide-react';
import { api } from '../api';

export default function SaasBilling() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [truckCount, setTruckCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const PRICE_PER_TRUCK = 15;

  useEffect(() => {
    api.trucks.list().then(data => {
      setTruckCount(data.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const calculateTotal = () => {
    const base = truckCount * PRICE_PER_TRUCK;
    return billingCycle === 'annual' ? base * 12 * 0.8 : base; // 20% annual discount
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">SaaS Subscription & Fleet Billing</h2>
          <p className="text-slate-400 text-sm mt-1">
            Dynamic per-asset pricing that scales with your fleet growth.
          </p>
        </div>
        
        {/* Toggle */}
        <div className="flex items-center gap-4 bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${billingCycle === 'monthly' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Annual
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">-20%</span>
          </button>
        </div>
      </div>

      {/* ── METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Active Fleet Size</span>
            <span className="block text-xl font-display text-white font-bold">{truckCount} Registered Units</span>
            <span className="block text-[10px] text-slate-500 italic">Updated via Fleet Assets</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Current {billingCycle} Rate</span>
            <span className="block text-xl font-display text-emerald-400 font-bold">${calculateTotal().toLocaleString()} / {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            <span className="block text-[10px] text-slate-500">Next billing: Jun 01, 2026</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1424]/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">Compliance Shield</span>
            <span className="block text-xl font-display text-white font-bold">Active & Insured</span>
            <span className="block text-[10px] text-slate-500">Full Audit Protection Enabled</span>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── PRICING CARD & DETAILS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
            <div className="relative bg-[#0c1424] border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">Fleet Pro</h3>
                  <p className="text-xs text-slate-500">Professional IFTA Automation</p>
                </div>
                <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-black text-white">${calculateTotal().toLocaleString()}</span>
                  <span className="text-slate-500 text-sm font-bold">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Pricing: ${PRICE_PER_TRUCK}/unit per month
                </p>
              </div>

              <div className="pt-6 border-t border-slate-800/50 space-y-4">
                {[
                  "Unlimited State Jurisdictions",
                  "AI Anomaly & Audit Risk Scan",
                  "Smart CSV/Excel Header Mapper",
                  "Route Optimization Surcharges",
                  "Receipt OCR Digitization",
                  "Multi-User Dispatcher Role Support"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-xs text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-gradient-to-tr from-orange-500 to-red-600 text-white font-bold text-sm rounded-2xl hover:shadow-xl hover:shadow-orange-500/20 active:scale-[0.98] transition">
                Manage Billing Method
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0c1424]/60 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              How your billing works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200">Asset-Based Scaling</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We don't believe in rigid tiers. Instead, we bill a flat **$15 per truck** per month. If you add a truck mid-month, we prorate the charge. If you remove one, your next bill will be lower.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200">Unlimited Everything Else</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your price is only tied to your truck count. You get unlimited data uploads, unlimited state filings, and full access to our AI suite regardless of fleet size.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Payment Method</p>
                    <p className="text-[10px] text-slate-500">Visa ending in 4421 • Expires 08/28</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-slate-800 transition">
                  Update Card
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1424]/60 border border-slate-800 rounded-3xl p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Enterprise Security</h4>
                <p className="text-xs text-slate-500">PCI-DSS Compliant • AES-256 Encryption</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Verified Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
