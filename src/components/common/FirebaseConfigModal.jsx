import React, { useState } from "react";
import { X, Flame, CheckCircle, Database, ShieldAlert, RefreshCw } from "lucide-react";
import { currentFirebaseConfig, isFirebaseConfigured } from "../../firebase/config";

export const FirebaseConfigModal = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState({
    apiKey: currentFirebaseConfig.apiKey || "",
    authDomain: currentFirebaseConfig.authDomain || "",
    projectId: currentFirebaseConfig.projectId || "",
    storageBucket: currentFirebaseConfig.storageBucket || "",
    messagingSenderId: currentFirebaseConfig.messagingSenderId || "",
    appId: currentFirebaseConfig.appId || "",
  });

  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("confhub_firebase_config", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem("confhub_firebase_config");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Cloud Database Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live cloud connection & synchronization status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div className="my-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 bg-slate-50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800">
          {isFirebaseConfigured ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Cloud Database Connected: <code className="font-mono">{currentFirebaseConfig.projectId}</code>
              </span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                Operating in <strong>Zero-Setup Simulation Mode</strong> with local storage reactivity & pre-seeded papers and reviews.
              </span>
            </>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="conference-mgmt-..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                placeholder="project.domain.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storage Bucket
              </label>
              <input
                type="text"
                value={config.storageBucket}
                onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                placeholder="project.appspot.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                App ID
              </label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="1:123456789:web:..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            Tip: Credentials can also be specified in your local environment configuration file.
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 font-medium"
            >
              Reset to Local Demo
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                {saved ? <CheckCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {saved ? "Saved & Reloading..." : "Save & Connect"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
