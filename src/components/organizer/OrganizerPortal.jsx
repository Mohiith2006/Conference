import React, { useState } from "react";
import {
  Building2,
  Plus,
  Eye,
  EyeOff,
  Calendar,
  Award,
  Star,
  ExternalLink,
  Filter
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const OrganizerPortal = () => {
  const { 
    conferences, 
    papers, 
    reviews, 
    createConference, 
    toggleConferenceStatus, 
    makeFinalDecision, 
    assignReviewers, 
    assignSchedule,
    isLoading 
  } = useConference();

  const { availableDemoUsers } = useAuth();
  const reviewersList = availableDemoUsers.filter((u) => u.role === "reviewer");

  const [activeTab, setActiveTab] = useState("decisions"); // 'decisions' | 'conferences'
  const [selectedConfFilter, setSelectedConfFilter] = useState("all");

  // Create Conference Form Modal
  const [showCreateConfModal, setShowCreateConfModal] = useState(false);
  const [confTitle, setConfTitle] = useState("");
  const [confDesc, setConfDesc] = useState("");
  const [confSubmissionDeadline, setConfSubmissionDeadline] = useState("2026-12-01T23:59");
  const [confReviewDeadline, setConfReviewDeadline] = useState("2026-12-20T23:59");
  const [confEndDate, setConfEndDate] = useState("2026-12-30T18:00");
  const [confTracks, setConfTracks] = useState("AI & Machine Learning, Distributed Systems, Cybersecurity");
  const [confStatus, setConfStatus] = useState("published");

  // Schedule Modal
  const [schedulingPaper, setSchedulingPaper] = useState(null);
  const [schedRoom, setSchedRoom] = useState("Main Hall A - Turing Auditorium");
  const [schedTime, setSchedTime] = useState("10:00 AM - 10:30 AM EST");
  const [schedDate, setSchedDate] = useState("Dec 26, 2026");
  const [schedChair, setSchedChair] = useState("Prof. Eleanor Vance");

  // Reviewer Assign Modal
  const [assigningPaper, setAssigningPaper] = useState(null);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  const filteredPapers = papers.filter((p) => {
    if (selectedConfFilter !== "all" && p.conference_id !== selectedConfFilter) {
      return false;
    }
    return true;
  });

  const handleCreateConferenceSubmit = async (e) => {
    e.preventDefault();
    if (!confTitle.trim()) return;

    await createConference({
      title: confTitle.trim(),
      description: confDesc.trim(),
      submission_deadline: new Date(confSubmissionDeadline).toISOString(),
      review_deadline: new Date(confReviewDeadline).toISOString(),
      end_date: new Date(confEndDate).toISOString(),
      tracks: confTracks.split(",").map((t) => t.trim()).filter(Boolean),
      status: confStatus,
      location: "San Francisco, CA & Hybrid"
    });

    setConfTitle("");
    setConfDesc("");
    setShowCreateConfModal(false);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingPaper) return;

    await assignSchedule(schedulingPaper.id, {
      room: schedRoom,
      time: schedTime,
      date: schedDate,
      track: schedulingPaper.track,
      session_chair: schedChair
    });

    setSchedulingPaper(null);
  };

  const handleSaveReviewerAssignment = async () => {
    if (!assigningPaper) return;
    await assignReviewers(assigningPaper.id, selectedReviewers);
    setAssigningPaper(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Organizer Executive Portal
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Conference Administration & Final Decisions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage conferences, publish/unpublish calls, review reviewer recommendations, and issue final Accepted/Rejected decisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateConfModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Conference
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 gap-6">
          <button
            onClick={() => setActiveTab("decisions")}
            className={`pb-3 text-xs font-bold tracking-wide transition flex items-center gap-2 border-b-2 ${
              activeTab === "decisions"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Star className="w-4 h-4" />
            Final Decision Dashboard ({papers.length} Papers)
          </button>

          <button
            onClick={() => setActiveTab("conferences")}
            className={`pb-3 text-xs font-bold tracking-wide transition flex items-center gap-2 border-b-2 ${
              activeTab === "conferences"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Conferences & Visibility ({conferences.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: FINAL DECISION DASHBOARD */}
      {/* ======================================================== */}
      {activeTab === "decisions" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="w-4 h-4" />
              <span>Filter by Conference:</span>
              <select
                value={selectedConfFilter}
                onChange={(e) => setSelectedConfFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="all">All Conferences</option>
                {conferences.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Reviewer "Best Paper" nominations receive priority highlight tags below.
            </div>
          </div>

          {/* Papers Decision Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Manuscript & Author</th>
                    <th className="p-4">Track</th>
                    <th className="p-4">Assigned Reviewers</th>
                    <th className="p-4">Review Scores</th>
                    <th className="p-4">Recommendations</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4 text-right">Organizer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPapers.map((paper) => {
                    const paperReviews = reviews.filter((r) => r.paper_id === paper.id);
                    const bestPaperNomination = paperReviews.some((r) => r.is_recommended_best_paper);
                    const avgScore =
                      paperReviews.length > 0
                        ? (
                            paperReviews.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) /
                            paperReviews.length
                          ).toFixed(1)
                        : null;

                    return (
                      <tr
                        key={paper.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition ${
                          bestPaperNomination ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                        }`}
                      >
                        {/* Title & Author */}
                        <td className="p-4 max-w-xs">
                          <div className="font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {paper.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>Author: {paper.author_name}</span>
                            <span>• v{paper.version}</span>
                            {paper.file_url && (
                              <a
                                href={paper.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> PDF
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Track */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                            {paper.track}
                          </span>
                        </td>

                        {/* Assigned Reviewers */}
                        <td className="p-4">
                          <div className="space-y-1">
                            {paper.assigned_reviewers?.length > 0 ? (
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {paper.assigned_reviewers.length} Reviewer(s) Assigned
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                Unassigned
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setAssigningPaper(paper);
                                setSelectedReviewers(paper.assigned_reviewers || []);
                              }}
                              className="block text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                            >
                              Assign / Manage
                            </button>
                          </div>
                        </td>

                        {/* Review Scores */}
                        <td className="p-4">
                          {avgScore ? (
                            <div>
                              <span className="font-extrabold text-sm text-amber-500">
                                ★ {avgScore} / 5.0
                              </span>
                              <div className="text-[10px] text-slate-400">
                                ({paperReviews.length} reviews submitted)
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Pending evaluation
                            </span>
                          )}
                        </td>

                        {/* Recommendations */}
                        <td className="p-4">
                          {bestPaperNomination ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              Best Paper Flag
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard</span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold ${
                              paper.status === "accepted"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : paper.status === "rejected"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : paper.status === "finalized"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                : paper.status === "under_review"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {paper.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Accept Decision */}
                            <button
                              onClick={() => makeFinalDecision(paper.id, "accepted")}
                              title="Issue Official Acceptance"
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg font-bold transition"
                            >
                              Accept
                            </button>

                            {/* Reject Decision */}
                            <button
                              onClick={() => makeFinalDecision(paper.id, "rejected")}
                              title="Issue Rejection"
                              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg font-bold transition"
                            >
                              Reject
                            </button>

                            {/* Assign Presentation Schedule Slot */}
                            {["accepted", "finalized"].includes(paper.status) && (
                              <button
                                onClick={() => {
                                  setSchedulingPaper(paper);
                                  if (paper.schedule) {
                                    setSchedRoom(paper.schedule.room || "");
                                    setSchedTime(paper.schedule.time || "");
                                    setSchedDate(paper.schedule.date || "");
                                    setSchedChair(paper.schedule.session_chair || "");
                                  }
                                }}
                                title="Set Room, Time & Track for author schedule"
                                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg font-semibold transition"
                              >
                                Schedule
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CONFERENCES & VISIBILITY */}
      {/* ======================================================== */}
      {activeTab === "conferences" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conferences.map((conf) => {
            const isPublished = conf.status === "published";
            const submissionEnded = new Date().getTime() > new Date(conf.submission_deadline).getTime();
            const conferenceEnded = new Date().getTime() > new Date(conf.end_date).getTime();

            return (
              <div
                key={conf.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isPublished
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {conf.status}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">
                      {conf.title}
                    </h3>
                  </div>

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleConferenceStatus(conf.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isPublished
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    }`}
                  >
                    {isPublished ? "Unpublish (Draft)" : "Publish Conference"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {conf.description}
                </p>

                {/* Deadlines Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-[11px] p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Submission Deadline</span>
                    <strong className={submissionEnded ? "text-rose-500" : "text-slate-700 dark:text-slate-200"}>
                      {new Date(conf.submission_deadline).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Review Deadline</span>
                    <strong className="text-slate-700 dark:text-slate-200">
                      {new Date(conf.review_deadline).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Conference End Date</span>
                    <strong className={conferenceEnded ? "text-purple-600" : "text-slate-700 dark:text-slate-200"}>
                      {new Date(conf.end_date).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Visibility: {isPublished ? "Visible in Author Submission Portal" : "Hidden from Authors (Draft)"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CONFERENCE MODAL */}
      {showCreateConfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Conference Event
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify conference details, deadlines, and publishing status.
            </p>

            <form onSubmit={handleCreateConferenceSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Conference Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={confTitle}
                  onChange={(e) => setConfTitle(e.target.value)}
                  placeholder="e.g. IEEE World Congress on Evolutionary Computation 2027"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={confDesc}
                  onChange={(e) => setConfDesc(e.target.value)}
                  placeholder="Conference scope and academic objectives..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paper Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={confSubmissionDeadline}
                    onChange={(e) => setConfSubmissionDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Review Deadline
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={confReviewDeadline}
                    onChange={(e) => setConfReviewDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Conference End Date
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={confEndDate}
                    onChange={(e) => setConfEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tracks (Comma separated)
                </label>
                <input
                  type="text"
                  value={confTracks}
                  onChange={(e) => setConfTracks(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Publishing Status
                </label>
                <select
                  value={confStatus}
                  onChange={(e) => setConfStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="published">Published (Visible immediately to authors)</option>
                  <option value="draft">Draft (Hidden from Author Portal)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateConfModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md"
                >
                  Create & Save Conference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {schedulingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Presentation Timetable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              For "{schedulingPaper.title}"
            </p>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Presentation Room
                </label>
                <input
                  type="text"
                  required
                  value={schedRoom}
                  onChange={(e) => setSchedRoom(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time Slot
                </label>
                <input
                  type="text"
                  required
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  required
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Session Chair
                </label>
                <input
                  type="text"
                  value={schedChair}
                  onChange={(e) => setSchedChair(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSchedulingPaper(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN REVIEWER MODAL */}
      {assigningPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Reviewers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              For "{assigningPaper.title}"
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Note: Assigning a reviewer automatically transitions paper status from "submitted" to "under_review".
            </p>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {reviewersList.map((rev) => {
                const isChecked = selectedReviewers.includes(rev.uid);
                return (
                  <label
                    key={rev.uid}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedReviewers(selectedReviewers.filter((id) => id !== rev.uid));
                        } else {
                          setSelectedReviewers([...selectedReviewers, rev.uid]);
                        }
                      }}
                      className="rounded text-purple-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {rev.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {rev.affiliation}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningPaper(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReviewerAssignment}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                Save Reviewers
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
