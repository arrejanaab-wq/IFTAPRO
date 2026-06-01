import React, { useState } from 'react';
import { X, Mail, Lock, User, Shield, Truck, LogIn, Sparkles } from 'lucide-react';
import { api } from '../api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  triggerToast: (msg: string, type?: "ok" | "err") => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess, triggerToast }: LoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'owner' as 'owner' | 'dispatcher'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = isRegister 
        ? await api.auth.register(formData)
        : await api.auth.login({ email: formData.email, password: formData.password });

      if (result.error) {
        triggerToast(result.error, "err");
      } else {
        onSuccess(result.user, result.token);
        triggerToast(isRegister ? "Account created successfully!" : "Logged in successfully!", "ok");
        onClose();
      }
    } catch (error: any) {
      triggerToast("Authentication failed: " + error.message, "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#070b13]/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0c1424] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-tr from-orange-500/10 to-red-600/10 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white">{isRegister ? "Create Account" : "Welcome Back"}</h3>
              <p className="text-xs text-slate-400">Access your fleet tax center</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                required
                type="email"
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Your Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition ${
                    formData.role === 'owner' 
                      ? "bg-orange-500/10 border-orange-500/40 text-orange-400" 
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                  onClick={() => setFormData({ ...formData, role: 'owner' })}
                >
                  <Shield className="w-4 h-4" />
                  Fleet Owner
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition ${
                    formData.role === 'dispatcher' 
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-400" 
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                  onClick={() => setFormData({ ...formData, role: 'dispatcher' })}
                >
                  <Sparkles className="w-4 h-4" />
                  Dispatcher
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-gradient-to-tr from-orange-500 to-red-600 text-white font-bold text-xs rounded-lg hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-px transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isRegister ? "Create Fleet Account" : "Sign In to Fleet"}
          </button>
        </form>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            {isRegister ? "Already have an account?" : "Don't have an account yet?"}{' '}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-orange-400 font-bold hover:underline"
            >
              {isRegister ? "Sign In" : "Register Now"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
