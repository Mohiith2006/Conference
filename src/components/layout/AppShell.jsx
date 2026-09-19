import React from "react";
import { useAuth } from "../../context/useAuth";
import { AcademicChatbot } from "../chat/AcademicChatbot";
import {
  Building2,
  ShieldCheck,
  LogOut,
  Send,
  Files,
  CreditCard,
  CalendarDays,
  Award,
  ChevronRight,
  LayoutDashboard,
  Users,
  History
} from "lucide-react";

export const AppShell = ({ activeTab, setActiveTab, children }) => {
  const { userProfile, currentRole, logout } = useAuth();
  const normalizedRole = (currentRole || "author").toLowerCase().trim();

  // Navigation tabs configured by Role (Defaults to Author 6 Tabs)
  const getNavItems = () => {
    if (normalizedRole === "organizer") {
      return [
        { id: "conferences", label: "Conferences Management", icon: Building2, sub: "Create events & publish" },
        { id: "decisions", label: "Final Decision Dashboard", icon: Award, sub: "Best paper reviews & decisions" },
        { id: "scheduling", label: "Program Scheduling", icon: CalendarDays, sub: "Build sessions & detect conflicts" },
        { id: "users", label: "User Management", icon: Users, sub: "Promote authors to Reviewer/Organizer" },
      ];
    }

    if (normalizedRole === "reviewer") {
      return [
        { id: "assigned", label: "Assigned Manuscripts", icon: ShieldCheck, sub: "Peer review queue & scoring" },
        { id: "history", label: "Review History", icon: History, sub: "Completed evaluations log" },
      ];
    }

    // Default to Author 6 Tabs (with Dashboard Overview as first/landing tab)
    return [
      { id: "overview", label: "Dashboard (Overview)", icon: LayoutDashboard, sub: "Personal metrics & proceedings" },
      { id: "submit", label: "1. Submit Paper", icon: Send, sub: "Manuscript upload & deadline" },
      { id: "submissions", label: "2. My Submissions", icon: Files, sub: "State machine & reviews" },
      { id: "registration", label: "3. Registration & Camera-Ready", icon: CreditCard, sub: "Conditional unlock" },
      { id: "schedule", label: "4. My Schedule", icon: CalendarDays, sub: "Timetable & room slot" },
      { id: "certificates", label: "5. Certificates & Documents", icon: Award, sub: "Post-conference cert & patents" },
    ];
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    switch (normalizedRole) {
      case "organizer": return "Organizer Portal";
      case "reviewer": return "Reviewer Portal";
      case "author": return "Author Portal (6 Tabs)";
      default: return "Author Portal (6 Tabs)";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-beige-50 text-ink-900">
      
      {/* ========================================================= */}
      {/* PERSISTENT VERTICAL SIDEBAR ON THE LEFT */}
      {/* ========================================================= */}
      <aside className="w-full md:w-72 bg-beige-100 border-r border-beige-200 flex flex-col justify-between shrink-0">
        
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-beige-200 bg-beige-150/50">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded border border-ink-900 flex items-center justify-center font-serif text-xs font-bold text-ink-900">
                🏛
              </span>
              <div>
                <h1 className="font-serif font-bold text-sm tracking-wide text-ink-900 uppercase">
                  CONFERENCE PORTAL
                </h1>
                <p className="text-[10px] text-ink-500 font-mono tracking-widest uppercase">
                  Peer Review System
                </p>
              </div>
            </div>

            {/* Role Badge (read-only - role is assigned at registration or by an organizer, never self-service) */}
            <div className="mt-4 pt-3 border-t border-beige-200 flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-500 font-bold">
                Designated Role
              </span>
              <span className="text-[10px] uppercase font-serif font-bold px-2 py-0.5 rounded border border-ink-900 bg-white text-ink-900">
                {normalizedRole}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-ink-400">
              Navigation Menu
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left p-2.5 rounded-sm transition-all flex items-start gap-3 border ${
                    isActive
                      ? "bg-white border-ink-900 shadow-2xs text-ink-900"
                      : "border-transparent text-ink-600 hover:bg-beige-150 hover:text-ink-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-ink-900" : "text-ink-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-serif font-bold truncate">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-ink-500 truncate mt-0.5">
                      {item.sub}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-ink-900 mt-1 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-beige-200 bg-beige-150/40">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded border border-beige-300 bg-white flex items-center justify-center font-serif font-bold text-xs text-ink-700">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-serif font-bold text-ink-900 truncate">
                {userProfile?.name || "Academic User"}
              </div>
              <div className="text-[10px] text-ink-500 truncate">
                {userProfile?.affiliation || userProfile?.email}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full py-1.5 px-3 text-xs font-serif text-ink-700 hover:text-ink-900 border border-beige-300 hover:border-ink-800 bg-white rounded-sm transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>

      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT WITH TOP HEADER */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header for Global Controls & Academic Context */}
        <header className="h-14 border-b border-beige-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-ink-600 font-serif">
            <span>Conference Management System</span>
            <span>/</span>
            <span className="font-bold text-ink-900">{getRoleLabel()}</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-ink-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-beige-300 bg-beige-50 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              System Online & Synced
            </span>
          </div>
        </header>

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto max-w-6xl w-full mx-auto">
          {children}
        </main>

      </div>

      {/* Global AI Academic Assistant Chatbot FAB (fixed bottom-6 right-6) */}
      <AcademicChatbot />

    </div>
  );
};
