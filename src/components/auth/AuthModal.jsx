import React, { useState } from "react";
import { 
  User, 
  Lock, 
  Mail, 
  Building, 
  ShieldCheck, 
  FileText, 
  Building2, 
  ArrowRight,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register, switchDemoUser, availableDemoUsers, loading, error } = useAuth();

  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("author");
  const [affiliation, setAffiliation] = useState("");
  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (mode === "login") {
      const ok = await login(email, password);
      if (ok) onClose();
    } else {
      if (!name.trim()) {
        setLocalError("Please enter your name.");
        return;
      }
      const ok = await register(name, email, password, role, affiliation);
      if (ok) onClose();
    }
  };

  const handleQuickDemoSelect = (uid) => {
    switchDemoUser(uid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30 text-xl font-bold">
            🏛️
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === "login" ? "Sign In to ConfHub" : "Create Account"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Role-Based Access Control (Organizer • Reviewer • Author)
          </p>
        </div>

        {/* 1-Click Demo Profiles Bar */}
        <div className="my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            Or Click a Demo Account:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {availableDemoUsers.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => handleQuickDemoSelect(u.uid)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-center transition group"
              >
                <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                  {u.role}
                </div>
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {u.name.split(" ")[1] || u.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designated Role (RBAC)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="author">Author (Screen 1 to 5 Portal)</option>
                  <option value="reviewer">Reviewer (Evaluation Dashboard)</option>
                  <option value="organizer">Organizer (Executive Dashboard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Affiliation
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@university.edu"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4"
          >
            <span>{mode === "login" ? "Sign In" : "Create Account & Sign In"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Register
              </button>
            </span>
          ) : (
            <span>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
