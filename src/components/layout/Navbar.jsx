import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  User, 
  LogOut, 
  Flame, 
  Moon, 
  Sun, 
  ChevronDown, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useConference } from "../../context/ConferenceContext";
import { isFirebaseConfigured } from "../../firebase/config";
import { FirebaseConfigModal } from "../common/FirebaseConfigModal";

export const Navbar = ({ darkMode, setDarkMode }) => {
  const { currentUser, currentRole, logout, switchDemoUser, availableDemoUsers } = useAuth();
  const { resetDemoData, actionMessage } = useConference();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case "organizer":
        return {
          label: "Organizer Portal",
          color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800",
          icon: Building2
        };
      case "reviewer":
        return {
          label: "Reviewer Portal",
          color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800",
          icon: ShieldCheck
        };
      case "author":
      default:
        return {
          label: "Author Portal",
          color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
          icon: FileText
        };
    }
  };

  const roleInfo = getRoleBadge(currentRole);
  const RoleIcon = roleInfo.icon;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-lg">
                🏛️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                    ConfHub
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    RBAC
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Academic Peer Review & Conference System</span>
                </div>
              </div>
            </div>

            {/* Quick Role-Switcher Bar (Evaluation & RBAC Demonstration) */}
            <div className="hidden md:flex items-center p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2.5">
                Switch Role:
              </span>
              <button
                onClick={() => switchDemoUser("author")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  currentRole === "author"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Author
              </button>
              <button
                onClick={() => switchDemoUser("reviewer")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  currentRole === "reviewer"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Reviewer
              </button>
              <button
                onClick={() => switchDemoUser("organizer")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  currentRole === "organizer"
                    ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Organizer
              </button>
            </div>

            {/* Right actions: Firebase status, theme, reset, user */}
            <div className="flex items-center gap-2.5">
              {/* Firebase Status Badge */}
              <button
                onClick={() => setShowConfigModal(true)}
                title="Click to view database connection status"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                  isFirebaseConfigured
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${isFirebaseConfigured ? "text-amber-500 fill-amber-500" : "text-indigo-500"}`} />
                <span className="hidden sm:inline">
                  {isFirebaseConfigured ? "Cloud Synced" : "Local Mode"}
                </span>
              </button>

              {/* Reset Data Button */}
              <button
                onClick={resetDemoData}
                title="Reset sample papers, reviews & conferences to default"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <img
                    src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || "User")}&background=6366f1&color=fff`}
                    alt={currentUser?.name}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/30"
                  />
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                      {currentUser?.name || "User"}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize font-medium">
                      {currentUser?.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {currentUser?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {currentUser?.email}
                      </p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {currentUser?.affiliation}
                      </p>
                    </div>

                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Switch Persona
                      </p>
                      {availableDemoUsers.map((u) => (
                        <button
                          key={u.uid}
                          onClick={() => {
                            switchDemoUser(u.uid);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                            currentUser?.uid === u.uid
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div>
                            <div className="truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{u.role}</div>
                          </div>
                          {currentUser?.uid === u.uid && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Action notification toast bar if any message exists */}
        {actionMessage && (
          <div className={`px-4 py-2 text-xs font-medium text-center transition-all ${
            actionMessage.type === "error"
              ? "bg-rose-500 text-white"
              : actionMessage.type === "info"
              ? "bg-blue-600 text-white"
              : "bg-emerald-600 text-white"
          }`}>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {actionMessage.message}
            </span>
          </div>
        )}
      </header>

      {/* Floating Active Portal Pill on Mobile */}
      <div className="md:hidden bg-slate-100 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <RoleIcon className="w-4 h-4 text-indigo-500" />
          <span>{roleInfo.label}</span>
        </div>
        <div className="flex gap-1">
          {["author", "reviewer", "organizer"].map((r) => (
            <button
              key={r}
              onClick={() => switchDemoUser(r)}
              className={`px-2 py-0.5 text-[11px] rounded font-semibold capitalize ${
                currentRole === r
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <FirebaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
};
