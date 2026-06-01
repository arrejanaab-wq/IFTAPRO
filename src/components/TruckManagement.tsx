import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Shield, Info, Edit3, Save, X } from 'lucide-react';
import { api } from '../api';

interface TruckData {
  _id?: string;
  unit_id: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
}

interface TruckManagementProps {
  triggerToast: (msg: string, type?: "ok" | "err") => void;
  onTrucksChange?: (count: number) => void;
}

export default function TruckManagement({ triggerToast, onTrucksChange }: TruckManagementProps) {
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<TruckData>({
    unit_id: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: ''
  });

  const loadTrucks = async () => {
    try {
      const data = await api.trucks.list();
      setTrucks(data);
      if (onTrucksChange) onTrucksChange(data.length);
    } catch (error) {
      triggerToast("Failed to load trucks", "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrucks();
  }, []);

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.trucks.create(formData);
      triggerToast("Truck registered successfully!", "ok");
      setIsAdding(false);
      setFormData({ unit_id: '', make: '', model: '', year: new Date().getFullYear(), vin: '' });
      loadTrucks();
    } catch (error: any) {
      triggerToast(error.message || "Failed to add truck", "err");
    }
  };

  const handleDeleteTruck = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this truck from your fleet?")) return;
    try {
      await api.trucks.delete(id);
      triggerToast("Truck removed from fleet", "ok");
      loadTrucks();
    } catch (error) {
      triggerToast("Failed to delete truck", "err");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-red-600/20 flex items-center justify-center border border-orange-500/30">
            <Truck className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Fleet Asset Management</h2>
            <p className="text-xs text-slate-400">Manage registered units and regulatory compliance details</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-orange-500 to-red-600 text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add New Unit
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#0c1424] border border-orange-500/30 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              Register New Asset
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddTruck} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unit ID (Tractor #)</label>
              <input
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:border-orange-500 outline-none transition"
                placeholder="TRK-101"
                value={formData.unit_id}
                onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Make</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:border-orange-500 outline-none transition"
                placeholder="Freightliner / Kenworth"
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Model</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:border-orange-500 outline-none transition"
                placeholder="Cascadia / T680"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Year</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:border-orange-500 outline-none transition"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">VIN (Vehicle Identification Number)</label>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 focus:border-orange-500 outline-none transition"
                placeholder="17-digit code"
                value={formData.vin}
                onChange={e => setFormData({ ...formData, vin: e.target.value })}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 bg-slate-900 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-2 bg-gradient-to-tr from-orange-500 to-red-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 hover:scale-105 transition"
              >
                Complete Registration
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#0c1424] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            Active Fleet Inventory ({trucks.length})
          </h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <Info className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-300 font-medium">Billing is calculated per active unit</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-t-transparent border-orange-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-500 italic">Syncing asset inventory...</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Truck className="w-8 h-8 text-slate-700" />
            </div>
            <h4 className="text-white font-bold mb-1">No Trucks Registered</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">You must register at least one unit before adding IFTA trip logs or fuel transactions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unit ID</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Asset Details</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">VIN</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {trucks.map((truck) => (
                  <tr key={truck._id} className="hover:bg-slate-900/40 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-orange-500/30 transition">
                          <Truck className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition" />
                        </div>
                        <span className="text-xs font-bold text-white">{truck.unit_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-300 font-medium">{truck.year} {truck.make}</span>
                        <span className="text-[10px] text-slate-500 italic">{truck.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {truck.vin || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button 
                          onClick={() => triggerToast("Edit coming soon!")}
                          className="p-2 text-slate-500 hover:text-blue-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTruck(truck._id!)}
                          className="p-2 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
