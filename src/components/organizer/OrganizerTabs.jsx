import React, { useState, useEffect } from "react";
import {
  subscribeConferences,
  subscribeAllPapers,
  subscribeReviews,
  subscribeReviewers,
  subscribeAllUsers,
  createConference,
  updateConference,
  deleteConference,
  makeFinalDecision,
  assignReviewers,
  assignSchedule,
  updateUserRole
} from "../../services/firebaseService";
import { useAuth } from "../../context/useAuth";
import { OrganizerScheduling } from "./OrganizerScheduling";
import {
  Building2,
  Plus,
  Award,
  FileText,
  Trash2,
  AlertCircle,
  Users,
  ShieldCheck,
  CalendarDays
} from "lucide-react";

// Helper for formatting default values for HTML datetime-local inputs
const getDefaultDatetime = (daysAhead = 14) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Safe ISO string converter that never throws RangeError
const parseISOSafely = (val, fallbackDays = 30) => {
  if (!val) {
    const d = new Date();
    d.setDate(d.getDate() + fallbackDays);
    return d.toISOString();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export const OrganizerTabs = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();

  const [conferences, setConferences] = useState([]);
  const [papers, setPapers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [roleUpdatingUid, setRoleUpdatingUid] = useState(null);

  const handleAssignScheduleFromModule = async (paperId, scheduleData) => {
    // Optimistic UI update
    setPapers((prev) =>
      prev.map((p) => (p.id === paperId ? { ...p, schedule: scheduleData } : p))
    );
    await assignSchedule(paperId, scheduleData);
  };

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubConfs = subscribeConferences((data) => {
      setConferences(data);
    });

    const unsubPapers = subscribeAllPapers((data) => {
      setPapers(data);
    });

    const unsubReviews = subscribeReviews((data) => {
      setReviews(data);
    });

    const unsubReviewers = subscribeReviewers((data) => {
      setReviewers(data);
    });

    const unsubUsers = subscribeAllUsers((data) => {
      setAllUsers(data);
    });

    return () => {
      unsubConfs();
      unsubPapers();
      unsubReviews();
      unsubReviewers();
      unsubUsers();
    };
  }, []);

  // Self-service signup can only ever create an Author (enforced at the
  // Firestore create rule, not just the UI - see firestore.rules). Promoting
  // someone to Reviewer/Organizer is the only way those roles get assigned,
  // and it's an update to an existing account, never a role chosen at signup.
  const handleChangeUserRole = async (uid, newRole) => {
    setRoleUpdatingUid(uid);
    try {
      await updateUserRole(uid, newRole);
    } catch (err) {
      console.error("Failed to update user role:", err);
    } finally {
      setRoleUpdatingUid(null);
    }
  };

  // Create Conference Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [reviewDeadline, setReviewDeadline] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tracks, setTracks] = useState("Artificial Intelligence, Distributed Systems, Cybersecurity");
  const [status, setStatus] = useState("published");
  const [savingConf, setSavingConf] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleOpenCreateModal = () => {
    setTitle("");
    setDescription("");
    setSubmissionDeadline(getDefaultDatetime(14));
    setReviewDeadline(getDefaultDatetime(21));
    setEndDate(getDefaultDatetime(30));
    setTracks("Artificial Intelligence, Distributed Systems, Cybersecurity");
    setStatus("published");
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleQuickFill = () => {
    setTitle("IEEE Global Conference on Artificial Intelligence & Systems 2026");
    setDescription("Premier international academic venue for peer-reviewed research in AI, distributed consensus, and machine intelligence.");
    setSubmissionDeadline(getDefaultDatetime(14));
    setReviewDeadline(getDefaultDatetime(21));
    setEndDate(getDefaultDatetime(30));
    setTracks("Artificial Intelligence, Distributed Systems, Cybersecurity, Machine Learning");
    setStatus("published");
    setCreateError("");
  };

  const handleCreateConf = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError("Please enter a conference title.");
      return;
    }

    setSavingConf(true);
    setCreateError("");

    const subIso = parseISOSafely(submissionDeadline, 14);
    const revIso = parseISOSafely(reviewDeadline || submissionDeadline, 21);
    const endIso = parseISOSafely(endDate, 30);

    const confData = {
      title: title.trim(),
      description: description.trim() || "Academic research conference.",
      submission_deadline: subIso,
      review_deadline: revIso,
      end_date: endIso,
      tracks: tracks.split(",").map((t) => t.trim()).filter(Boolean),
      status,
      organizer_id: userProfile?.uid || "organizer",
      organizer_name: userProfile?.name || "Organizer",
      created_at: new Date().toISOString()
    };

    // Close modal and reset form INSTANTLY in 0ms
    setShowCreateModal(false);
    setSavingConf(false);
    setTitle("");
    setDescription("");
    setCreateError("");

    try {
      const realId = await createConference(confData);
      // Immediately reflect with real Firestore ID in UI
      setConferences((prev) => [{ ...confData, id: realId }, ...prev.filter((c) => c.id !== realId)]);
    } catch (err) {
      console.error("Error creating conference:", err);
    }
  };

  const handleToggleStatus = async (conf) => {
    if (!conf?.id) return;
    const nextStatus = conf.status === "published" ? "draft" : "published";
    // OPTIMISTIC UPDATE
    setConferences((prev) =>
      prev.map((c) => (c.id === conf.id ? { ...c, status: nextStatus } : c))
    );
    try {
      await updateConference(conf.id, { status: nextStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      // Revert on error
      setConferences((prev) =>
        prev.map((c) => (c.id === conf.id ? { ...c, status: conf.status } : c))
      );
    }
  };

  const handleDeleteConf = async (confId) => {
    if (!confId) return;
    if (!window.confirm("Are you sure you wish to delete this conference?")) return;
    setConferences((prev) => prev.filter((c) => c.id !== confId));
    try {
      await deleteConference(confId);
    } catch (err) {
      console.error("Failed to delete conference:", err);
    }
  };

  const handleMakeDecision = async (paperId, decision) => {
    // OPTIMISTIC UPDATE
    setPapers((prev) =>
      prev.map((p) => (p.id === paperId ? { ...p, status: decision } : p))
    );
    try {
      await makeFinalDecision(paperId, decision);
    } catch (err) {
      console.error("Failed to save final decision:", err);
    }
  };

  // Schedule Modal
  const [schedulingPaper, setSchedulingPaper] = useState(null);
  const [schedRoom, setSchedRoom] = useState("Auditorium Hall A");
  const [schedTime, setSchedTime] = useState("10:00 AM - 10:30 AM");
  const [schedDate, setSchedDate] = useState("Conference Day 1");
  const [schedChair, setSchedChair] = useState("Prof. Session Chair");

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingPaper) return;
    const targetId = schedulingPaper.id;
    const scheduleData = {
      room: schedRoom,
      time: schedTime,
      date: schedDate,
      track: schedulingPaper.track,
      chair: schedChair
    };

    // OPTIMISTIC UPDATE
    setPapers((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, schedule: scheduleData } : p))
    );
    setSchedulingPaper(null);

    await assignSchedule(targetId, scheduleData);
  };

  // Assign Reviewer Modal
  const [assigningPaper, setAssigningPaper] = useState(null);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);

  const handleOpenAssign = (paper) => {
    setAssigningPaper(paper);
    setSelectedReviewerIds(paper.assigned_reviewers || []);
  };

  const handleSaveAssign = async () => {
    if (!assigningPaper) return;
    const targetId = assigningPaper.id;
    const revs = [...selectedReviewerIds];

    // OPTIMISTIC UPDATE
    setPapers((prev) =>
      prev.map((p) =>
        p.id === targetId
          ? { ...p, assigned_reviewers: revs, status: revs.length > 0 ? "under_review" : "submitted" }
          : p
      )
    );
    setAssigningPaper(null);
    await assignReviewers(targetId, revs);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: CONFERENCES MANAGEMENT */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "conferences" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-beige-200 pb-4">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
                Organizer Executive Portal
              </span>
              <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
                Conferences Management
              </h2>
              <p className="text-xs text-ink-600 mt-1">
                Create new academic events and control publishing visibility for Author submission lists.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Conference
            </button>
          </div>

          {/* Blank state if no conferences created yet */}
          {conferences.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <Building2 className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Conferences Created Yet
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 mb-4">
                No conference proceedings found. Click "Create Conference" above to initialize your first academic event.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 rounded-sm shadow-xs"
              >
                Create First Conference
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conferences.map((conf) => {
                const isPublished = conf.status === "published";
                return (
                  <div key={conf.id} className="bg-white border border-beige-200 p-6 rounded-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isPublished
                            ? "bg-sage-50 border-sage-600 text-sage-700"
                            : "bg-beige-100 border-ink-600 text-ink-800"
                        }`}>
                          {isPublished ? "Published" : "Draft (Hidden)"}
                        </span>
                        <h3 className="font-serif text-base font-bold text-ink-900 mt-1.5 leading-snug">
                          {conf.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleStatus(conf)}
                          className="text-xs font-serif underline text-ink-800 hover:text-ink-600"
                        >
                          {isPublished ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => handleDeleteConf(conf.id)}
                          className="text-ink-400 hover:text-terracotta-700 p-1 rounded-sm transition"
                          title="Delete Conference"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-ink-600 line-clamp-2">
                      {conf.description || "Academic conference venue."}
                    </p>

                    <div className="grid grid-cols-3 gap-2 p-3 bg-beige-50 border border-beige-200 text-[11px] rounded-sm">
                      <div>
                        <span className="text-ink-400 font-mono text-[9px] uppercase block">Submission Deadline</span>
                        <strong className="text-ink-800 font-serif">
                          {new Date(conf.submission_deadline).toLocaleDateString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-ink-400 font-mono text-[9px] uppercase block">Review Deadline</span>
                        <strong className="text-ink-800 font-serif">
                          {new Date(conf.review_deadline).toLocaleDateString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-ink-400 font-mono text-[9px] uppercase block">Concludes</span>
                        <strong className="text-ink-800 font-serif">
                          {new Date(conf.end_date).toLocaleDateString()}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-ink-500 pt-1 border-t border-beige-200 flex items-center justify-between">
                      <span>Tracks: {conf.tracks?.join(", ") || "General"}</span>
                      <span className="font-mono text-[10px]">ID: {conf.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CREATE CONFERENCE MODAL */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
              <div className="bg-white border border-beige-300 w-full max-w-lg p-6 rounded-sm space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-beige-200 pb-2">
                  <h3 className="font-serif font-bold text-base text-ink-900">
                    Create Conference Event
                  </h3>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-[11px] font-serif text-ink-600 underline hover:text-ink-900"
                  >
                    ⚡ Autofill Sample Event
                  </button>
                </div>

                {createError && (
                  <div className="p-2.5 bg-terracotta-50 border border-terracotta-200 text-terracotta-800 text-xs rounded-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateConf} className="space-y-3">
                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Conference Title <span className="text-terracotta-700">*</span></label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. IEEE Global AI & Systems Colloquium 2026"
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Scope, topics, and objectives..."
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-serif font-bold mb-1">Submission Deadline <span className="text-terracotta-700">*</span></label>
                      <input
                        type="datetime-local"
                        required
                        value={submissionDeadline}
                        onChange={(e) => setSubmissionDeadline(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-beige-300 rounded-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-serif font-bold mb-1">Review Deadline</label>
                      <input
                        type="datetime-local"
                        value={reviewDeadline}
                        onChange={(e) => setReviewDeadline(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-beige-300 rounded-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-serif font-bold mb-1">End Date <span className="text-terracotta-700">*</span></label>
                      <input
                        type="datetime-local"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-beige-300 rounded-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Tracks (Comma separated)</label>
                    <input
                      type="text"
                      value={tracks}
                      onChange={(e) => setTracks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Visibility Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50"
                    >
                      <option value="published">Published (Visible immediately to authors)</option>
                      <option value="draft">Draft (Hidden from Author Portal)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-beige-200">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-3 py-1.5 text-xs font-serif border border-beige-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingConf}
                      className="px-4 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50 rounded-sm disabled:opacity-50"
                    >
                      {savingConf ? "Creating Event..." : "Create Conference"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: FINAL DECISION DASHBOARD */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "decisions" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Organizer Executive Portal
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              Final Decision & Best Paper Dashboard
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Receives reviewer recommendations, aggregated scores, and Best Paper flags to issue final Accept/Reject decisions and presentation schedules.
            </p>
          </div>

          {/* Blank state if no papers submitted to Firestore */}
          {papers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <FileText className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Manuscripts Submitted
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                Papers submitted by Authors will dynamically appear in this table for reviewer assignment and final decisions.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-beige-200 rounded-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-beige-100 border-b border-beige-200 font-serif font-bold text-ink-800">
                  <tr>
                    <th className="p-3">Manuscript & Author</th>
                    <th className="p-3">Track</th>
                    <th className="p-3">Reviewers</th>
                    <th className="p-3">Evaluation Scores</th>
                    <th className="p-3">Recommendations</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-200">
                  {papers.map((paper) => {
                    const paperReviews = reviews.filter((r) => r.paper_id === paper.id);
                    const hasBestPaperNomination = paperReviews.some((r) => r.is_recommended_best_paper);
                    const avgScore = paperReviews.length > 0
                      ? (paperReviews.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) / paperReviews.length).toFixed(1)
                      : null;

                    return (
                      <tr key={paper.id} className={hasBestPaperNomination ? "bg-beige-50/70" : ""}>
                        <td className="p-3 max-w-xs">
                          <div className="font-serif font-bold text-ink-900 leading-snug">
                            {paper.title}
                          </div>
                          <div className="text-[11px] text-ink-500 mt-0.5">
                            Author: {paper.author_name} ({paper.author_email})
                          </div>
                          {paper.file_url && (
                            <a href={paper.file_url} target="_blank" rel="noreferrer" className="text-[10px] underline text-ink-800 flex items-center gap-0.5 mt-1 font-serif">
                              <FileText className="w-3 h-3" /> View Manuscript PDF
                            </a>
                          )}
                        </td>

                        <td className="p-3 text-ink-700">
                          {paper.track}
                        </td>

                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="font-mono text-[11px] text-ink-700 block">
                              {paper.assigned_reviewers?.length || 0} Assigned
                            </span>
                            <button
                              onClick={() => handleOpenAssign(paper)}
                              className="text-[10px] font-serif underline text-ink-800 hover:text-ink-600"
                            >
                              Assign Reviewers
                            </button>
                          </div>
                        </td>

                        <td className="p-3">
                          {avgScore ? (
                            <div>
                              <span className="font-serif font-bold text-ink-900 text-xs">
                                ★ {avgScore} / 5.0
                              </span>
                              <div className="text-[10px] text-ink-500">
                                ({paperReviews.length} reviews filed)
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-400 italic">No reviews yet</span>
                          )}
                        </td>

                        <td className="p-3">
                          {hasBestPaperNomination ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-ink-900 bg-white font-serif font-bold text-[10px] text-ink-900">
                              <Award className="w-3 h-3 text-terracotta-700" />
                              Best Paper Flag
                            </span>
                          ) : (
                            <span className="text-ink-400 text-[11px]">Regular</span>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            paper.status === "accepted" || paper.status === "finalized"
                              ? "bg-sage-50 border-sage-600 text-sage-700"
                              : paper.status === "rejected"
                              ? "bg-terracotta-50 border-terracotta-600 text-terracotta-700"
                              : "bg-beige-100 border-beige-300 text-ink-800"
                          }`}>
                            {paper.status}
                          </span>
                        </td>

                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleMakeDecision(paper.id, "accepted")}
                            className="px-2.5 py-1 text-xs font-serif font-bold border border-sage-600 text-sage-700 hover:bg-sage-50 rounded-sm transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleMakeDecision(paper.id, "rejected")}
                            className="px-2.5 py-1 text-xs font-serif font-bold border border-terracotta-600 text-terracotta-700 hover:bg-terracotta-50 rounded-sm transition"
                          >
                            Reject
                          </button>
                          {(paper.status === "accepted" || paper.status === "finalized") && (
                            <button
                              onClick={() => {
                                if (setActiveTab) {
                                  setActiveTab("scheduling");
                                } else {
                                  setSchedulingPaper(paper);
                                  if (paper.schedule) {
                                    setSchedRoom(paper.schedule.room || "");
                                    setSchedTime(paper.schedule.time || "");
                                    setSchedDate(paper.schedule.date || "");
                                    setSchedChair(paper.schedule.chair || "");
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-serif font-bold border border-ink-900 text-ink-900 hover:bg-beige-100 rounded-sm inline-flex items-center gap-1 shadow-2xs"
                            >
                              <CalendarDays className="w-3 h-3" />
                              Schedule
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SCHEDULE MODAL */}
          {schedulingPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
              <div className="bg-white border border-beige-300 w-full max-w-md p-6 rounded-sm space-y-4">
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Assign Presentation Schedule
                </h3>
                <p className="text-xs text-ink-500">For "{schedulingPaper.title}"</p>

                <form onSubmit={handleSaveSchedule} className="space-y-3">
                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Room Assignment</label>
                    <input
                      type="text"
                      required
                      value={schedRoom}
                      onChange={(e) => setSchedRoom(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Time Slot</label>
                    <input
                      type="text"
                      required
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Date</label>
                    <input
                      type="text"
                      required
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Session Chair</label>
                    <input
                      type="text"
                      value={schedChair}
                      onChange={(e) => setSchedChair(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-beige-200">
                    <button
                      type="button"
                      onClick={() => setSchedulingPaper(null)}
                      className="px-3 py-1.5 text-xs font-serif border border-beige-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50"
                    >
                      Save Timetable
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ASSIGN REVIEWER MODAL */}
          {assigningPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
              <div className="bg-white border border-beige-300 w-full max-w-md p-6 rounded-sm space-y-4">
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Assign Reviewers
                </h3>
                <p className="text-xs text-ink-500">For "{assigningPaper.title}"</p>

                {reviewers.length === 0 ? (
                  <p className="text-xs text-ink-500 italic py-2">
                    No users registered with Reviewer role found. Users must register with Reviewer role to be assigned.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {reviewers.map((rev) => {
                      const isChecked = selectedReviewerIds.includes(rev.uid);
                      return (
                        <label key={rev.uid} className="flex items-center gap-2 p-2 border border-beige-200 bg-beige-50 rounded-sm text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedReviewerIds(selectedReviewerIds.filter((id) => id !== rev.uid));
                              } else {
                                setSelectedReviewerIds([...selectedReviewerIds, rev.uid]);
                              }
                            }}
                          />
                          <div>
                            <span className="font-serif font-bold text-ink-900">{rev.name}</span>
                            <span className="text-ink-500 text-[10px] block">{rev.affiliation || rev.email}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-beige-200">
                  <button
                    type="button"
                    onClick={() => setAssigningPaper(null)}
                    className="px-3 py-1.5 text-xs font-serif border border-beige-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssign}
                    className="px-4 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB: 5. PROGRAM SCHEDULING & CONFLICT DETECTION                   */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "scheduling" && (
        <OrganizerScheduling
          conferences={conferences}
          papers={papers}
          onAssignSchedule={handleAssignScheduleFromModule}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: USER MANAGEMENT — promote Authors to Reviewer/Organizer */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Organizer Executive Portal
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              User Management
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Self-service signup only ever creates an Author account. Promote an existing account to Reviewer or Organizer here — this is the only way those roles are assigned.
            </p>
          </div>

          {allUsers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <Users className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Registered Users Yet
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                Registered accounts will appear here once authors sign up.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-beige-200 rounded-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-beige-100 border-b border-beige-200 font-serif font-bold text-ink-800">
                  <tr>
                    <th className="p-3">Name &amp; Email</th>
                    <th className="p-3">Affiliation</th>
                    <th className="p-3">Current Role</th>
                    <th className="p-3 text-right">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-200">
                  {allUsers.map((u) => {
                    const uRole = (u.role || "author").toLowerCase().trim();
                    const isSelf = u.uid === userProfile?.uid;
                    return (
                      <tr key={u.uid}>
                        <td className="p-3">
                          <div className="font-serif font-bold text-ink-900">
                            {u.name || "Unnamed User"}
                            {isSelf && <span className="ml-1.5 text-[10px] font-mono text-ink-400 uppercase">(you)</span>}
                          </div>
                          <div className="text-[11px] text-ink-500 mt-0.5">{u.email}</div>
                        </td>
                        <td className="p-3 text-ink-700">{u.affiliation || "—"}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            uRole === "organizer"
                              ? "bg-beige-150 border-ink-800 text-ink-900"
                              : uRole === "reviewer"
                              ? "bg-sage-50 border-sage-600 text-sage-700"
                              : "bg-beige-100 border-beige-300 text-ink-700"
                          }`}>
                            <ShieldCheck className="w-3 h-3 inline -mt-0.5 mr-1" />
                            {uRole}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <select
                            value={uRole}
                            disabled={isSelf || roleUpdatingUid === u.uid}
                            onChange={(e) => handleChangeUserRole(u.uid, e.target.value)}
                            className="px-2.5 py-1.5 text-xs font-serif border border-beige-300 rounded-sm bg-beige-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isSelf ? "You cannot change your own role" : "Change this user's role"}
                          >
                            <option value="author">Author</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="organizer">Organizer</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
