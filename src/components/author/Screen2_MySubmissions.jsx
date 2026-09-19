import React, { useState } from "react";
import { 
  FileText, 
  Edit3, 
  Trash2, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  Tag,
  AlertTriangle,
  FileCheck,
  Send
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const Screen2_MySubmissions = ({ onNavigateToScreen }) => {
  const { papers, conferences, updatePaper, withdrawPaper, getPaperReviewsForAuthor, isLoading } = useConference();
  const { currentUser } = useAuth();

  const authorPapers = papers.filter((p) => p.author_id === currentUser?.uid);

  // States for expandable reviews
  const [expandedPaperId, setExpandedPaperId] = useState(null);

  // States for editing a submitted paper
  const [editingPaper, setEditingPaper] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [editTrack, setEditTrack] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  // Withdraw confirm modal
  const [withdrawingPaper, setWithdrawingPaper] = useState(null);

  const getConferenceTitle = (confId) => {
    return conferences.find((c) => c.id === confId)?.title || "Conference";
  };

  const getStatusBadge = (status, version) => {
    switch (status) {
      case "submitted":
        return {
          label: `Submitted (v${version})`,
          bg: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
          icon: Clock,
          subtext: "Editable or Withdrawable"
        };
      case "under_review":
        return {
          label: "Under Review",
          bg: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          icon: Lock,
          subtext: "Completely Locked (Withdraw Only)"
        };
      case "accepted":
        return {
          label: "Accepted",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          icon: CheckCircle2,
          subtext: "Locked • Scores & Reviews Unlocked"
        };
      case "rejected":
        return {
          label: "Rejected",
          bg: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
          icon: XCircle,
          subtext: "Locked • Feedback Unlocked"
        };
      case "finalized":
        return {
          label: "Finalized",
          bg: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
          icon: FileCheck,
          subtext: "Camera-Ready & Registration Done"
        };
      case "withdrawn":
      default:
        return {
          label: "Withdrawn",
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
          icon: AlertTriangle,
          subtext: "Archived"
        };
    }
  };

  const handleStartEdit = (paper) => {
    if (paper.status !== "submitted") return;
    setEditingPaper(paper);
    setEditTitle(paper.title);
    setEditAbstract(paper.abstract);
    setEditTrack(paper.track);
    setEditKeywords(paper.keywords?.join(", ") || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPaper) return;
    await updatePaper(editingPaper.id, {
      title: editTitle,
      abstract: editAbstract,
      track: editTrack,
      keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    });
    setEditingPaper(null);
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawingPaper) return;
    await withdrawPaper(withdrawingPaper.id);
    setWithdrawingPaper(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 mb-2">
              Author Portal • Screen 2 of 5
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              My Submissions & State Machine
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track peer review state machine transitions, manage initial submissions, and inspect anonymized feedback.
            </p>
          </div>

          <button
            onClick={() => onNavigateToScreen && onNavigateToScreen("submit")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Submit New Paper
          </button>
        </div>
      </div>

      {/* State Machine Overview Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 text-xs">
          <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            1. Submitted State
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-[11px]">
            No reviewer assigned yet. Paper is fully editable or withdrawable by the author.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 text-xs">
          <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            2. Under Review State
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-[11px]">
            Completely locked (read-only). Editing disabled. Withdraw preserved. Reviews concealed.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs">
          <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            3. Decided State
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-[11px]">
            Fully locked. Anonymized scores and constructive comments unlock for viewing.
          </p>
        </div>
      </div>

      {/* Papers List */}
      {authorPapers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No submissions found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            You haven't submitted any papers under this account yet. Head over to Screen 1 to submit your first paper.
          </p>
          <button
            onClick={() => onNavigateToScreen && onNavigateToScreen("submit")}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            Go to Submit Paper
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {authorPapers.map((paper) => {
            const badge = getStatusBadge(paper.status, paper.version);
            const BadgeIcon = badge.icon;
            const isSubmitted = paper.status === "submitted";
            const isUnderReview = paper.status === "under_review";
            const isDecided = ["accepted", "rejected", "finalized"].includes(paper.status);
            const isAccepted = paper.status === "accepted";
            const isExpanded = expandedPaperId === paper.id;
            const paperReviews = getPaperReviewsForAuthor(paper.id);

            // Compute aggregate score if reviews exist
            const avgScore =
              paperReviews.length > 0
                ? (
                    paperReviews.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) /
                    paperReviews.length
                  ).toFixed(1)
                : null;

            return (
              <div
                key={paper.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Paper Card Main Content */}
                <div className="p-6 space-y-4">
                  
                  {/* Top metadata row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {badge.subtext}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Conference: <strong className="text-slate-700 dark:text-slate-300">{getConferenceTitle(paper.conference_id)}</strong>
                    </div>
                  </div>

                  {/* Title & Track */}
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {paper.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                        {paper.track}
                      </span>
                      {paper.keywords?.map((kw) => (
                        <span
                          key={kw}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Abstract snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {paper.abstract}
                  </p>

                  {/* Co-Authors and File info */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      Co-Authors:{" "}
                      {paper.co_authors?.length > 0 ? (
                        <strong className="text-slate-700 dark:text-slate-300">
                          {paper.co_authors.map((ca) => ca.name).join(", ")}
                        </strong>
                      ) : (
                        <span className="italic">Sole Author</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {paper.file_url && (
                        <a
                          href={paper.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {paper.file_name || "Manuscript PDF"}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* State Machine Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Left: State explanation */}
                    <div className="text-[11px]">
                      {isSubmitted && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          ✓ No reviewers assigned yet. You may freely edit or withdraw this manuscript.
                        </span>
                      )}
                      {isUnderReview && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Assigned to reviewers. Manuscript is locked. You can only withdraw.
                        </span>
                      )}
                      {isAccepted && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Paper Accepted! Please complete Camera-Ready & Registration in Screen 3.
                        </span>
                      )}
                    </div>

                    {/* Right: Actions depending on State Machine */}
                    <div className="flex items-center gap-2">
                      {/* Editable only in 'submitted' */}
                      {isSubmitted && (
                        <button
                          onClick={() => handleStartEdit(paper)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                          Edit (Increment Version)
                        </button>
                      )}

                      {/* Withdrawable in 'submitted' or 'under_review' */}
                      {(isSubmitted || isUnderReview) && (
                        <button
                          onClick={() => setWithdrawingPaper(paper)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Withdraw
                        </button>
                      )}

                      {/* Screen 3 shortcut for accepted papers */}
                      {isAccepted && (
                        <button
                          onClick={() => onNavigateToScreen && onNavigateToScreen("registration")}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                        >
                          Camera-Ready & Payment →
                        </button>
                      )}

                      {/* Expandable Review Scores & Comments for Decided Papers */}
                      {isDecided && (
                        <button
                          onClick={() =>
                            setExpandedPaperId(isExpanded ? null : paper.id)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition"
                        >
                          <Star className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                          {isExpanded ? "Hide Review Feedback" : "View Anonymized Reviews"}
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* EXPANDABLE REVIEW FEEDBACK (Unlocked for accepted / rejected) */}
                {isDecided && isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-850/70 border-t border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          Peer Review Feedback & Aggregated Scores
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Reviewer identities are protected under double-blind peer review rules.
                        </p>
                      </div>

                      {avgScore && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Aggregate Score:
                          </span>
                          <span className="text-sm font-extrabold text-amber-500 flex items-center gap-1">
                            ★ {avgScore} / 5.0
                          </span>
                        </div>
                      )}
                    </div>

                    {paperReviews.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Formal decision was recorded directly by the Conference Organizer. Detailed breakdown is archived.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {paperReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                {rev.reviewer_code}
                              </span>
                              <div className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                Overall: {rev.scores?.overall} / 5.0
                              </div>
                            </div>

                            {/* Score Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block text-[10px]">Originality</span>
                                <strong className="text-slate-700 dark:text-slate-200">{rev.scores?.originality} / 5</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block text-[10px]">Technical Quality</span>
                                <strong className="text-slate-700 dark:text-slate-200">{rev.scores?.technical} / 5</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block text-[10px]">Clarity</span>
                                <strong className="text-slate-700 dark:text-slate-200">{rev.scores?.clarity} / 5</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block text-[10px]">Relevance</span>
                                <strong className="text-slate-700 dark:text-slate-200">{rev.scores?.relevance} / 5</strong>
                              </div>
                            </div>

                            {/* Anonymized Constructive Comments */}
                            <div className="pt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                              <span className="font-bold block text-slate-900 dark:text-white mb-1">
                                Anonymized Reviewer Comments:
                              </span>
                              {rev.anonymized_comments}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MODAL (Increment Version) */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Manuscript (Creates Version {editingPaper.version + 1})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manuscripts in <strong>"submitted"</strong> state can be revised before reviewers are assigned.
            </p>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Abstract
                </label>
                <textarea
                  rows={4}
                  required
                  value={editAbstract}
                  onChange={(e) => setEditAbstract(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPaper(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Save as Version {editingPaper.version + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW CONFIRMATION MODAL */}
      {withdrawingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Withdraw Submission?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Are you sure you want to withdraw <strong>"{withdrawingPaper.title}"</strong>? This will pull the manuscript from the review process.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setWithdrawingPaper(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Keep Manuscript
              </button>
              <button
                onClick={handleConfirmWithdraw}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Yes, Withdraw Paper
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
