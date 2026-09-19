import React, { useState, useEffect } from "react";
import {
  subscribeReviewerPapers,
  subscribeReviewerReviews,
  subscribePublishedConferences,
  submitReview
} from "../../services/firebaseService";
import { useAuth } from "../../context/useAuth";
import {
  FileText,
  Award,
  ExternalLink,
  FolderOpen,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Edit3,
  AlertTriangle,
  History,
  ShieldCheck,
  Calendar
} from "lucide-react";

const RECOMMENDATIONS = [
  { id: "strong accept", label: "Strong Accept", desc: "Top 5% paper; must be accepted", color: "border-emerald-600 bg-emerald-50 text-emerald-800" },
  { id: "accept", label: "Accept", desc: "Good contribution; meets publication bar", color: "border-sage-600 bg-sage-50 text-sage-800" },
  { id: "borderline", label: "Borderline", desc: "Could accept or reject; needs discussion", color: "border-amber-500 bg-amber-50 text-amber-800" },
  { id: "reject", label: "Reject", desc: "Below standard; notable flaws or missing rigor", color: "border-rose-400 bg-rose-50 text-rose-800" },
  { id: "strong reject", label: "Strong Reject", desc: "Severe flaws, fatal errors, or out of scope", color: "border-red-600 bg-red-50 text-red-900" },
];

const formatDeadline = (isoString) => {
  if (!isoString) return "No deadline specified";
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? isoString
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
  } catch {
    return isoString;
  }
};

const isDeadlinePassed = (isoString) => {
  if (!isoString) return false;
  try {
    return new Date().getTime() > new Date(isoString).getTime();
  } catch {
    return false;
  }
};

export const ReviewerTabs = ({ activeTab = "assigned", setActiveTab }) => {
  const { userProfile } = useAuth();
  const reviewerId = userProfile?.uid;

  const [currentTab, setCurrentTab] = useState(activeTab || "assigned");
  useEffect(() => {
    if (activeTab) setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabSwitch = (tab) => {
    setCurrentTab(tab);
    if (setActiveTab) setActiveTab(tab);
  };

  const [papers, setPapers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [conferences, setConferences] = useState([]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubPapers = subscribeReviewerPapers(reviewerId, (data) => {
      setPapers(data);
    });

    const unsubReviews = subscribeReviewerReviews(reviewerId, (data) => {
      setReviews(data);
    });

    const unsubConfs = subscribePublishedConferences((data) => {
      setConferences(data);
    });

    return () => {
      unsubPapers();
      unsubReviews();
      unsubConfs();
    };
  }, [reviewerId]);

  // Review Modal State
  const [evaluatingPaper, setEvaluatingPaper] = useState(null);
  const [originality, setOriginality] = useState(4);
  const [technical, setTechnical] = useState(4);
  const [clarity, setClarity] = useState(4);
  const [overall, setOverall] = useState(4);
  const [anonymizedComments, setAnonymizedComments] = useState("");
  const [confidentialComments, setConfidentialComments] = useState("");
  const [recommendation, setRecommendation] = useState("accept");
  const [isBestPaper, setIsBestPaper] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");

  const handleOpenEvaluation = (paper) => {
    setEvaluatingPaper(paper);
    setFormError("");

    const conf = conferences.find((c) => c.id === paper.conference_id);
    const deadlinePassed = isDeadlinePassed(conf?.review_deadline);
    const existing = reviews.find(
      (r) => r.paper_id === paper.id && r.reviewer_id === reviewerId
    );

    if (existing) {
      setOriginality(existing.scores?.originality || 4);
      setTechnical(existing.scores?.technical || 4);
      setClarity(existing.scores?.clarity || 4);
      setOverall(existing.scores?.overall || 4);
      setAnonymizedComments(existing.anonymized_comments || "");
      setConfidentialComments(existing.confidential_comments || "");
      setRecommendation(existing.recommendation || "accept");
      setIsBestPaper(Boolean(existing.is_recommended_best_paper));
      // Locked by default if already submitted
      setIsEditing(false);
    } else {
      setOriginality(4);
      setTechnical(4);
      setClarity(4);
      setOverall(4);
      setAnonymizedComments("");
      setConfidentialComments("");
      setRecommendation("accept");
      setIsBestPaper(false);
      // If deadline passed, cannot edit new review either
      setIsEditing(!deadlinePassed);
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!evaluatingPaper) return;
    const conf = conferences.find((c) => c.id === evaluatingPaper.conference_id);
    if (isDeadlinePassed(conf?.review_deadline)) {
      setFormError("Cannot submit evaluation: the review deadline for this conference has passed.");
      return;
    }

    if (!anonymizedComments.trim()) {
      setFormError("Please provide constructive comments for the authors.");
      return;
    }

    const paperReviews = reviews.filter((r) => r.paper_id === evaluatingPaper.id);
    const existing = reviews.find(
      (r) => r.paper_id === evaluatingPaper.id && r.reviewer_id === reviewerId
    );
    const reviewerCode = existing?.reviewer_code || `Reviewer #${paperReviews.length + 1}`;

    const reviewPayload = {
      id: existing?.id || `rev-${Date.now()}`,
      paper_id: evaluatingPaper.id,
      reviewer_id: reviewerId,
      reviewer_code: reviewerCode,
      scores: {
        originality: Number(originality),
        technical: Number(technical),
        clarity: Number(clarity),
        overall: Number(overall),
      },
      anonymized_comments: anonymizedComments.trim(),
      confidential_comments: confidentialComments.trim(),
      recommendation,
      status: "completed",
      is_recommended_best_paper: Boolean(isBestPaper),
      submitted_at: existing?.submitted_at || new Date().toISOString()
    };

    // Optimistically update local reviews list
    setReviews((prev) => [
      reviewPayload,
      ...prev.filter((r) => !(r.paper_id === evaluatingPaper.id && r.reviewer_id === reviewerId))
    ]);
    setEvaluatingPaper(null);

    try {
      await submitReview(reviewPayload);
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
  };

  // Completed reviews for Review History tab
  const myCompletedReviews = reviews.filter((r) => r.reviewer_id === reviewerId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header & Tab Navigation */}
      <div className="border-b border-beige-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Reviewer Peer Review Portal
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-0.5">
              {currentTab === "history" ? "Evaluation History & Records" : "Assigned Manuscripts for Review"}
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              {currentTab === "history"
                ? "Read-only archive of all peer reviews submitted by your reviewer profile."
                : "Evaluate submitted manuscripts, score rubrics, and deliver double-blind constructive feedback."}
            </p>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-beige-100 border border-beige-200 rounded-sm self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleTabSwitch("assigned")}
              className={`px-3 py-1.5 text-xs font-serif transition rounded-xs flex items-center gap-1.5 ${
                currentTab === "assigned"
                  ? "bg-white text-ink-900 font-bold shadow-2xs border border-beige-300"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Assigned Manuscripts ({papers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("history")}
              className={`px-3 py-1.5 text-xs font-serif transition rounded-xs flex items-center gap-1.5 ${
                currentTab === "history"
                  ? "bg-white text-ink-900 font-bold shadow-2xs border border-beige-300"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Review History ({myCompletedReviews.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ASSIGNED MANUSCRIPTS                               */}
      {/* ========================================================= */}
      {currentTab === "assigned" && (
        <>
          {papers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <FolderOpen className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Manuscripts in Review Queue
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto mt-1">
                There are currently no papers in your review queue. Once an Author submits a manuscript to an active conference, it will immediately appear here for evaluation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {papers.map((paper) => {
                const conf = conferences.find((c) => c.id === paper.conference_id);
                const deadlinePassed = isDeadlinePassed(conf?.review_deadline);
                const myReview = reviews.find(
                  (r) => r.paper_id === paper.id && r.reviewer_id === reviewerId
                );
                const isCompleted = myReview?.status === "completed" || Boolean(myReview);

                return (
                  <div
                    key={paper.id}
                    className="bg-white border border-beige-200 p-6 rounded-sm space-y-4 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="space-y-3">
                      {/* Conference & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-ink-500 truncate">
                          {conf?.title || "Academic Conference"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {deadlinePassed && (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-700">
                              Deadline Passed
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              isCompleted
                                ? "bg-sage-50 border-sage-600 text-sage-700"
                                : "bg-amber-50 border-amber-600 text-amber-800"
                            }`}
                          >
                            {isCompleted ? "Completed ✓" : "Pending Review"}
                          </span>
                        </div>
                      </div>

                      {/* Paper Title */}
                      <h3 className="font-serif text-base font-bold text-ink-900 leading-snug">
                        {paper.title}
                      </h3>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                        <span className="font-semibold">{paper.track}</span>
                        <span>•</span>
                        <span className="font-mono">v{paper.version || 1}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px] text-ink-500">
                          <Calendar className="w-3 h-3 text-ink-400" />
                          Review Deadline: {formatDeadline(conf?.review_deadline)}
                        </span>
                      </div>

                      {/* Abstract */}
                      <p className="text-xs text-ink-600 line-clamp-3 font-sans leading-relaxed">
                        {paper.abstract}
                      </p>

                      {/* Best paper badge if nominated */}
                      {myReview?.is_recommended_best_paper && (
                        <div className="p-2 bg-beige-50 border border-ink-900 text-ink-900 text-[11px] font-serif font-bold flex items-center gap-1.5 rounded-sm">
                          <Award className="w-3.5 h-3.5 text-terracotta-700 shrink-0" />
                          Forwarded to Program Committee as Best Paper Recommendation
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-beige-200 flex items-center justify-between gap-3">
                      {paper.file_url ? (
                        <a
                          href={paper.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-serif underline text-ink-800 hover:text-ink-900 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Read Manuscript PDF</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 italic">No PDF attached</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEvaluation(paper)}
                        className={`px-3.5 py-1.5 text-xs font-serif font-bold uppercase tracking-wider rounded-sm transition ${
                          isCompleted
                            ? "bg-beige-100 hover:bg-beige-200 text-ink-900 border border-beige-300"
                            : "bg-ink-900 hover:bg-ink-800 text-beige-50 shadow-xs"
                        }`}
                      >
                        {isCompleted ? "View / Edit Review" : "Complete Review"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REVIEW HISTORY                                     */}
      {/* ========================================================= */}
      {currentTab === "history" && (
        <div className="space-y-4">
          {myCompletedReviews.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <History className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Review History Yet
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto mt-1">
                You have not submitted any reviews yet. Complete evaluations in your assigned queue to record your permanent review history.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myCompletedReviews.map((rev) => {
                const paper = papers.find((p) => p.id === rev.paper_id);
                const conf = conferences.find((c) => c.id === paper?.conference_id);
                const recInfo = RECOMMENDATIONS.find(
                  (r) => r.id === (rev.recommendation || "").toLowerCase()
                ) || RECOMMENDATIONS[1];

                return (
                  <div
                    key={rev.id}
                    className="bg-white border border-beige-200 p-6 rounded-sm shadow-2xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-beige-200 pb-3">
                      <div>
                        <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-ink-500">
                          {conf?.title || "Conference"}
                        </span>
                        <h3 className="font-serif text-base font-bold text-ink-900 mt-0.5">
                          {paper?.title || "Manuscript Review"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-sage-400 bg-sage-50 text-sage-800 font-bold uppercase">
                          Status: Completed
                        </span>
                        <span
                          className={`text-[10px] font-serif px-2.5 py-0.5 rounded border font-bold uppercase tracking-wider ${recInfo.color}`}
                        >
                          {recInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Rubric Score Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-beige-50 border border-beige-200 rounded-xs">
                        <div className="text-[10px] uppercase font-mono text-ink-500">Originality</div>
                        <div className="font-serif font-bold text-sm text-ink-900 mt-0.5">
                          {rev.scores?.originality || "-"}/5
                        </div>
                      </div>
                      <div className="p-2 bg-beige-50 border border-beige-200 rounded-xs">
                        <div className="text-[10px] uppercase font-mono text-ink-500">Technical Rigor</div>
                        <div className="font-serif font-bold text-sm text-ink-900 mt-0.5">
                          {rev.scores?.technical || "-"}/5
                        </div>
                      </div>
                      <div className="p-2 bg-beige-50 border border-beige-200 rounded-xs">
                        <div className="text-[10px] uppercase font-mono text-ink-500">Clarity</div>
                        <div className="font-serif font-bold text-sm text-ink-900 mt-0.5">
                          {rev.scores?.clarity || "-"}/5
                        </div>
                      </div>
                      <div className="p-2 bg-beige-100 border border-beige-300 rounded-xs">
                        <div className="text-[10px] uppercase font-mono text-ink-700 font-bold">Overall Score</div>
                        <div className="font-serif font-bold text-sm text-ink-900 mt-0.5">
                          {rev.scores?.overall || "-"}/5
                        </div>
                      </div>
                    </div>

                    {/* Comments Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Author Comments */}
                      <div className="p-3 bg-white border border-beige-200 rounded-sm">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1 font-bold">
                          Comments for the Author (Shared post-decision)
                        </span>
                        <p className="text-ink-700 font-sans leading-relaxed whitespace-pre-wrap">
                          {rev.anonymized_comments || "No comments provided."}
                        </p>
                      </div>

                      {/* Confidential PC Comments */}
                      <div className="p-3 bg-beige-50/60 border border-beige-200 rounded-sm">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-600 mb-1 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-ink-500" />
                          Confidential Committee Remarks (Hidden from author)
                        </span>
                        <p className="text-ink-700 font-sans leading-relaxed whitespace-pre-wrap">
                          {rev.confidential_comments || "None provided."}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-beige-200 flex items-center justify-between text-xs text-ink-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Submitted on {formatDeadline(rev.submitted_at)}</span>
                        {rev.is_recommended_best_paper && (
                          <span className="inline-flex items-center gap-1 text-terracotta-700 font-semibold ml-2">
                            <Award className="w-3 h-3" /> Best Paper Nominee
                          </span>
                        )}
                      </div>

                      {paper && (
                        <button
                          type="button"
                          onClick={() => handleOpenEvaluation(paper)}
                          className="text-xs font-serif underline text-ink-800 hover:text-ink-900"
                        >
                          Open Review Form
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* REVIEW EVALUATION WORKSPACE MODAL                         */}
      {/* ========================================================= */}
      {evaluatingPaper && (() => {
        const conf = conferences.find((c) => c.id === evaluatingPaper.conference_id);
        const deadlinePassed = isDeadlinePassed(conf?.review_deadline);
        const existing = reviews.find(
          (r) => r.paper_id === evaluatingPaper.id && r.reviewer_id === reviewerId
        );
        const isCompleted = existing?.status === "completed" || Boolean(existing);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-beige-300 w-full max-w-2xl p-6 md:p-8 rounded-sm space-y-5 my-8 shadow-xl">
              
              {/* Modal Header */}
              <div className="border-b border-beige-200 pb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-500">
                    Peer Review Evaluation • {conf?.title || "Conference"}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-ink-900 mt-0.5">
                    {evaluatingPaper.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-ink-600 mt-1">
                    <span className="font-semibold">{evaluatingPaper.track}</span>
                    <span>•</span>
                    <span className="font-mono">v{evaluatingPaper.version || 1}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] text-ink-500">
                      <Calendar className="w-3 h-3 text-ink-400" />
                      Review Deadline: {formatDeadline(conf?.review_deadline)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEvaluatingPaper(null)}
                  className="text-ink-400 hover:text-ink-800 text-2xl font-serif leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Deadline & Lock Logic Banner */}
              {deadlinePassed ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-sm text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-serif text-rose-900">Review Window Closed</strong>
                    The review deadline for this conference has passed ({formatDeadline(conf?.review_deadline)}). This evaluation is locked permanently and can no longer be modified.
                  </div>
                </div>
              ) : isCompleted && !isEditing ? (
                <div className="p-3.5 bg-beige-100 border border-beige-300 rounded-sm flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-ink-800">
                    <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-serif text-ink-900">Evaluation Submitted & Completed</strong>
                      This review is currently locked against accidental changes. You may unlock and edit your evaluation anytime before the deadline.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm transition shrink-0 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Unlock to Edit</span>
                  </button>
                </div>
              ) : isCompleted && isEditing ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-sm text-xs text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    Editing Mode Active — Make revisions below and save.
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-[11px] font-serif underline text-amber-800 hover:text-amber-950"
                  >
                    Lock without saving
                  </button>
                </div>
              ) : null}

              {/* Error Message */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-sm text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEvaluation} className="space-y-4">
                
                {/* 1. Rubric Scores (Numeric 1-5) */}
                <div className="space-y-2.5">
                  <span className="text-xs font-serif font-bold uppercase tracking-wider text-ink-800 block">
                    Rubric Scores (Numeric 1–5)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Originality & Novelty", val: originality, set: setOriginality },
                      { label: "Technical Quality & Rigor", val: technical, set: setTechnical },
                      { label: "Clarity & Organization", val: clarity, set: setClarity },
                      { label: "Overall Quality Assessment", val: overall, set: setOverall },
                    ].map((crit, idx) => (
                      <div key={idx} className="p-3 bg-beige-50 border border-beige-200 rounded-sm">
                        <div className="flex justify-between font-serif font-semibold mb-2">
                          <span className="text-ink-800">{crit.label}</span>
                          <span className="font-bold font-mono text-ink-900">{crit.val} / 5</span>
                        </div>
                        {/* Numeric 1-5 Buttons */}
                        <div className="grid grid-cols-5 gap-1">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              disabled={!isEditing || deadlinePassed}
                              onClick={() => crit.set(score)}
                              className={`py-1 text-xs font-mono font-bold rounded-xs border transition ${
                                crit.val === score
                                  ? "bg-ink-900 text-beige-50 border-ink-900 shadow-2xs"
                                  : "bg-white text-ink-700 border-beige-300 hover:bg-beige-100 disabled:opacity-50"
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Recommendation (strong accept / accept / borderline / reject / strong reject) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-serif font-bold uppercase tracking-wider text-ink-800">
                    Final Recommendation <span className="text-terracotta-700">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                    {RECOMMENDATIONS.map((opt) => {
                      const isSelected = recommendation === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={!isEditing || deadlinePassed}
                          onClick={() => setRecommendation(opt.id)}
                          className={`p-2 text-center rounded-sm border transition flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? `${opt.color} font-bold ring-1 ring-ink-900 shadow-xs`
                              : "bg-white text-ink-700 border-beige-300 hover:bg-beige-50 disabled:opacity-50"
                          }`}
                        >
                          <span className="text-[11px] font-serif font-bold leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Comments for the Author */}
                <div>
                  <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                    Comments for the Author <span className="text-terracotta-700">*</span>
                  </label>
                  <p className="text-[10px] text-ink-500 mb-1.5 font-sans">
                    Shared with the author once the official conference decision is made. Double-blind: do not include self-identifying references.
                  </p>
                  <textarea
                    rows={4}
                    required
                    disabled={!isEditing || deadlinePassed}
                    value={anonymizedComments}
                    onChange={(e) => setAnonymizedComments(e.target.value)}
                    placeholder="Provide constructive feedback: summarize strengths, theoretical gaps, empirical concerns, and requested revisions..."
                    className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100/60 disabled:text-ink-600 font-sans leading-relaxed"
                  />
                </div>

                {/* 4. Confidential Comments for the Program Committee */}
                <div>
                  <label className="block text-xs font-serif font-bold text-ink-800 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-ink-600" />
                    Confidential Comments for the Program Committee
                  </label>
                  <p className="text-[10px] text-ink-500 mb-1.5 font-sans">
                    Strictly confidential between you and the committee. <strong>Never shown to the author</strong> under any circumstances.
                  </p>
                  <textarea
                    rows={2}
                    disabled={!isEditing || deadlinePassed}
                    value={confidentialComments}
                    onChange={(e) => setConfidentialComments(e.target.value)}
                    placeholder="Confidential notes on ethics, novelty doubts, dual submission, or program priority..."
                    className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100/60 disabled:text-ink-600 font-sans leading-relaxed"
                  />
                </div>

                {/* Best Paper Nomination */}
                <div className="p-3 bg-beige-50 border border-beige-300 rounded-sm">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isEditing || deadlinePassed}
                      checked={isBestPaper}
                      onChange={(e) => setIsBestPaper(e.target.checked)}
                      className="mt-0.5 accent-ink-900"
                    />
                    <div>
                      <span className="text-xs font-serif font-bold text-ink-900 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-terracotta-700" />
                        Nominate as Best Paper Candidate
                      </span>
                      <p className="text-[11px] text-ink-600 mt-0.5">
                        Highlight and forward this manuscript to the Organizer's Final Decision Dashboard for standout award consideration.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-beige-200">
                  <button
                    type="button"
                    onClick={() => setEvaluatingPaper(null)}
                    className="px-4 py-1.5 text-xs font-serif border border-beige-300 bg-white hover:bg-beige-100 text-ink-800 rounded-sm transition"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2">
                    {isCompleted && !isEditing && !deadlinePassed && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm transition flex items-center gap-1.5"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Unlock to Edit</span>
                      </button>
                    )}

                    {isEditing && !deadlinePassed && (
                      <button
                        type="submit"
                        className="px-5 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm transition shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-sage-400" />
                        <span>{isCompleted ? "Save Updated Evaluation" : "Submit Completed Review"}</span>
                      </button>
                    )}
                  </div>
                </div>

              </form>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
