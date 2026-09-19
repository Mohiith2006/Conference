import React, { useState } from "react";
import { 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  Star, 
  Award, 
  CheckCircle2, 
  Clock, 
  Send, 
  AlertCircle,
  Sparkles,
  UserCheck
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const ReviewerPortal = () => {
  const { papers, conferences, reviews, submitReview, isLoading } = useConference();
  const { currentUser } = useAuth();

  // Papers assigned to this reviewer or open in review queue
  const assignedPapers = papers.filter(
    (p) =>
      p &&
      p.status !== "withdrawn" &&
      (
        p.assigned_reviewers?.includes(currentUser?.uid) ||
        p.status === "submitted" ||
        p.status === "under_review" ||
        !p.assigned_reviewers ||
        p.assigned_reviewers.length === 0 ||
        currentUser?.role === "reviewer" ||
        reviews.some((r) => r.paper_id === p.id && r.reviewer_id === currentUser?.uid)
      )
  );

  const [activeReviewPaper, setActiveReviewPaper] = useState(null);

  // Review form states
  const [originality, setOriginality] = useState(4);
  const [technical, setTechnical] = useState(4);
  const [clarity, setClarity] = useState(4);
  const [relevance, setRelevance] = useState(5);
  const [overall, setOverall] = useState(4);
  const [comments, setComments] = useState("");
  const [confidentialNotes, setConfidentialNotes] = useState("");
  const [nominateBestPaper, setNominateBestPaper] = useState(false);
  const [formError, setFormError] = useState("");

  const getConference = (confId) => {
    return conferences.find((c) => c.id === confId);
  };

  const handleOpenReview = (paper) => {
    setActiveReviewPaper(paper);
    setFormError("");

    // If already reviewed, populate existing scores
    const existing = reviews.find(
      (r) => r.paper_id === paper.id && r.reviewer_id === currentUser?.uid
    );

    if (existing) {
      setOriginality(existing.scores?.originality || 4);
      setTechnical(existing.scores?.technical || 4);
      setClarity(existing.scores?.clarity || 4);
      setRelevance(existing.scores?.relevance || 5);
      setOverall(existing.scores?.overall || 4);
      setComments(existing.anonymized_comments || "");
      setConfidentialNotes(existing.confidential_organizer_comments || "");
      setNominateBestPaper(Boolean(existing.is_recommended_best_paper));
    } else {
      setOriginality(4);
      setTechnical(4);
      setClarity(4);
      setRelevance(5);
      setOverall(4);
      setComments("");
      setConfidentialNotes("");
      setNominateBestPaper(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!comments.trim()) {
      setFormError("Please provide constructive comments for the authors.");
      return;
    }

    try {
      await submitReview({
        paper_id: activeReviewPaper.id,
        scores: {
          originality: Number(originality),
          technical: Number(technical),
          clarity: Number(clarity),
          relevance: Number(relevance),
          overall: Number(overall),
        },
        anonymized_comments: comments.trim(),
        confidential_organizer_comments: confidentialNotes.trim(),
        is_recommended_best_paper: Boolean(nominateBestPaper),
      });

      setActiveReviewPaper(null);
    } catch (err) {
      setFormError(err.message || "Failed to submit review.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Reviewer Portal
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Assigned Peer Review Batch
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Evaluate submitted manuscripts, provide anonymized feedback, score rigor, and nominate standout candidates for <strong>Best Paper Awards</strong>.
        </p>
      </div>

      {/* Assigned Papers Dashboard */}
      {assignedPapers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Assigned Papers
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            There are no papers assigned to your reviewer profile at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assignedPapers.map((paper) => {
            const conf = getConference(paper.conference_id);
            const myReview = reviews.find(
              (r) => r.paper_id === paper.id && r.reviewer_id === currentUser?.uid
            );
            const isCompleted = Boolean(myReview);

            return (
              <div
                key={paper.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {conf?.title?.substring(0, 35)}...
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Review Submitted
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {paper.title}
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {paper.track}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      v{paper.version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                    {paper.abstract}
                  </p>

                  {myReview?.is_recommended_best_paper && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-bold">
                      <Award className="w-4 h-4 text-amber-500" />
                      Nominated by you for Best Paper Award
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {paper.file_url ? (
                    <a
                      href={paper.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Read PDF Manuscript
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No PDF attached</span>
                  )}

                  <button
                    onClick={() => handleOpenReview(paper)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                      isCompleted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                    }`}
                  >
                    {isCompleted ? "Edit Evaluation" : "Complete Review →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVIEW WORKSPACE MODAL */}
      {activeReviewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Paper Evaluation Workspace
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">
                  {activeReviewPaper.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveReviewPaper(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="my-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-5">
              {/* Scoring Criteria Matrix (1 to 5) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Scoring Criteria Matrix (1 = Poor, 5 = Exceptional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Originality & Novelty", val: originality, set: setOriginality },
                    { label: "Technical Rigor & Soundness", val: technical, set: setTechnical },
                    { label: "Clarity & Presentation", val: clarity, set: setClarity },
                    { label: "Conference Relevance", val: relevance, set: setRelevance },
                  ].map((crit, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {crit.label}
                        </span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {crit.val} / 5
                        </strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={crit.val}
                        onChange={(e) => crit.set(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Overall Score */}
                <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">
                      Overall Recommendation Rating:
                    </span>
                    <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                      ★ {overall} / 5.0
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={overall}
                    onChange={(e) => setOverall(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Anonymized Comments (Author-facing) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Constructive Review Comments (Anonymized to Authors) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Elaborate on strengths, potential methodological weaknesses, suggestions for empirical experiments, and camera-ready revisions..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Authors will see your comments labeled as <code>Reviewer #{'{N}'}</code>. Your name and affiliation remain private.
                </p>
              </div>

              {/* Confidential Remarks to Organizer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confidential Remarks (Organizer Committee Only)
                </label>
                <textarea
                  rows={2}
                  value={confidentialNotes}
                  onChange={(e) => setConfidentialNotes(e.target.value)}
                  placeholder="Optional confidential notes regarding ethical concerns, plagiarism, or session placement..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* BEST PAPER NOMINATION (Required Feature) */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nominateBestPaper}
                    onChange={(e) => setNominateBestPaper(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Nominate as Best Paper Candidate
                    </span>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400 mt-0.5">
                      Check this box to flag and forward this manuscript to the Conference Organizer's <strong>Final Decision Dashboard</strong> as an outstanding paper nomination.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveReviewPaper(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
