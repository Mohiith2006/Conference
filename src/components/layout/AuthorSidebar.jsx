import React from "react";
import { 
  Send, 
  Files, 
  CreditCard, 
  CalendarDays, 
  Award, 
  Sparkles, 
  CheckCircle2,
  Lock,
  ChevronRight
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const AuthorSidebar = ({ activeScreen, setActiveScreen }) => {
  const { papers, isConferenceEnded } = useConference();
  const { currentUser } = useAuth();

  const authorPapers = papers.filter(p => p.author_id === currentUser?.uid);
  const acceptedPapers = authorPapers.filter(p => p.status === "accepted");
  const finalizedPapers = authorPapers.filter(p => p.status === "finalized");
  const hasCertificatesAvailable = finalizedPapers.some(p => isConferenceEnded(p.conference_id));

  const screens = [
    {
      id: "submit",
      title: "1. Submit Paper",
      subtitle: "Manuscript upload & deadline check",
      icon: Send,
      badge: null,
      color: "text-indigo-500",
    },
    {
      id: "submissions",
      title: "2. My Submissions",
      subtitle: "State machine & anonymized reviews",
      icon: Files,
      badge: authorPapers.length ? `${authorPapers.length} papers` : null,
      color: "text-blue-500",
    },
    {
      id: "registration",
      title: "3. Registration & Camera-Ready",
      subtitle: "Conditional unlock upon acceptance",
      icon: CreditCard,
      badge: acceptedPapers.length > 0 ? "Action Required" : null,
      badgeType: acceptedPapers.length > 0 ? "alert" : "neutral",
      color: "text-amber-500",
      isLocked: acceptedPapers.length === 0 && finalizedPapers.length === 0
    },
    {
      id: "schedule",
      title: "4. My Schedule",
      subtitle: "Presentation room & timetable",
      icon: CalendarDays,
      badge: finalizedPapers.length > 0 ? "Scheduled" : null,
      color: "text-emerald-500",
    },
    {
      id: "certificates",
      title: "5. Certificates & Documents",
      subtitle: "Post-conference certificate & patents",
      icon: Award,
      badge: hasCertificatesAvailable ? "Ready" : null,
      badgeType: hasCertificatesAvailable ? "success" : "neutral",
      color: "text-purple-500",
    },
  ];

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm sticky top-20">
        
        {/* Portal Header */}
        <div className="px-3 py-2 mb-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Author Portal
            </span>
            <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
              5 Screens
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Manuscript lifecycle from submission to presentation
          </p>
        </div>

        {/* 5 Screen Navigation Items */}
        <nav className="space-y-1.5">
          {screens.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full group text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                  isActive
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-sm"
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-100 dark:hover:border-slate-800"
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors mt-0.5 shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? "text-indigo-900 dark:text-indigo-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {item.title}
                    </span>

                    {item.isLocked && (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {item.subtitle}
                  </p>

                  {item.badge && (
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.badgeType === "alert"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse"
                            : item.badgeType === "success"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 mt-2 transition-transform ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 translate-x-0.5"
                      : "text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Quick Author Guidelines */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Double-Blind Peer Review
          </div>
          <p>
            Anonymity is strictly enforced. Reviewer identities are never disclosed to authors.
          </p>
        </div>

      </div>
    </aside>
  );
};
