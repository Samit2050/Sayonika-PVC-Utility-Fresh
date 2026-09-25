import React, { useState, useEffect } from 'react';
import { Key, Lock, AlertCircle, X, Check, Sparkles, Eye, EyeOff, Wand2, Type } from 'lucide-react';
import { BatchItem } from '../types';
import { extractAllPasswordCandidatesFromFileName } from '../utils/nameHelper';

interface PasswordModalProps {
  item: BatchItem | null;
  onUnlock: (password: string, rememberForBatch: boolean) => void;
  onClose: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  item,
  onUnlock,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberForBatch, setRememberForBatch] = useState(true);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (item) {
      const extracted = extractAllPasswordCandidatesFromFileName(item.name);
      setCandidates(extracted);
      if (item.password) {
        setPassword(item.password.toUpperCase());
      } else if (extracted.length > 0) {
        // Auto-fill from PDF name in CAPITAL LETTERS
        setPassword(extracted[0]);
      } else {
        setPassword('');
      }
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setShowError(true);
      return;
    }
    // Always pass password in CAPITAL LETTERS
    onUnlock(password.trim().toUpperCase(), rememberForBatch);
  };

  const handleSelectCandidate = (cand: string) => {
    setPassword(cand.toUpperCase());
    setShowError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Password Protected PDF</h3>
            <p className="text-xs text-slate-400 truncate max-w-[260px]">{item.name}</p>
          </div>
        </div>

        {/* Autofill Password Detected from PDF Name */}
        {candidates.length > 0 && (
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Autofill Detected from PDF Name (CAPITAL):</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                UPPERCASE
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCandidate(cand)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                    password === cand
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700'
                  }`}
                >
                  <span>{cand}</span>
                  {password === cand && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* UIDAI / Income Tax Password Format Helper */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs mb-4">
          <div className="flex items-center justify-between font-semibold text-amber-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Standard Password Rules:</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <Type className="w-3 h-3" />
              <span>ALL CAPS ONLY</span>
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            <strong className="text-amber-400">e-Aadhaar:</strong> First 4 letters of name in CAPITAL + 4-digit Year of Birth (e.g. <span className="font-mono text-white">SAMI1994</span>).<br />
            <strong className="text-blue-400">e-PAN Card:</strong> Date of Birth in DDMMYYYY without slashes (e.g. <span className="font-mono text-white">01011990</span>).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Enter PDF Password:
              </label>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">
                Auto-Capitalized
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { 
                  // Force UPPERCASE capital letters
                  setPassword(e.target.value.toUpperCase()); 
                  setShowError(false); 
                }}
                placeholder="e.g. SAMI1994 or DDMMYYYY"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 pr-10 text-sm text-slate-100 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {showError && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Password cannot be empty</span>
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberForBatch}
              onChange={(e) => setRememberForBatch(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>Remember & use this password for remaining batch items</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Unlock & Decrypt (CAPITAL)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
