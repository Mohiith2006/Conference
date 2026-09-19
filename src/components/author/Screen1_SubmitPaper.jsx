import React, { useState } from "react";
import { 
  UploadCloud, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  FileText, 
  Tag, 
  Users, 
  Info,
  Calendar,
  Lock
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const Screen1_SubmitPaper = ({ onSuccess }) => {
  const { getPublishedConferences, submitPaper, isSubmissionOpen, isLoading } = useConference();
  const { currentUser } = useAuth();

  const publishedConferences = getPublishedConferences();

  const [selectedConfId, setSelectedConfId] = useState(
    publishedConferences[0]?.id || ""
  );

  const selectedConf = publishedConferences.find((c) => c.id === selectedConfId);

  // Form states
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [track, setTrack] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [coAuthors, setCoAuthors] = useState([]);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState("");

  // When selected conference changes, reset the track default - adjusted
  // directly during render rather than via an effect.
  const [trackForConfId, setTrackForConfId] = useState(selectedConf?.id);
  if (selectedConf?.id !== trackForConfId) {
    setTrackForConfId(selectedConf?.id);
    setTrack(selectedConf?.tracks?.[0] || "");
  }

  // Deadline validation logic: current_date < submission_deadline
  const deadlinePassed = selectedConf ? !isSubmissionOpen(selectedConf.id) : false;
  const deadlineFormatted = selectedConf
    ? new Date(selectedConf.submission_deadline).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
      })
    : "";

  const handleAddKeyword = (e) => {
    if ((e.key === "Enter" || e.key === ",") && keywordInput.trim()) {
      e.preventDefault();
      const val = keywordInput.trim().replace(/^,|,$/g, "");
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
      }
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (tag) => {
    setKeywords(keywords.filter((k) => k !== tag));
  };

  const handleAddCoAuthor = () => {
    setCoAuthors([
      ...coAuthors,
      { name: "", email: "", affiliation: "" }
    ]);
  };

  const handleUpdateCoAuthor = (index, field, value) => {
    const updated = [...coAuthors];
    updated[index][field] = value;
    setCoAuthors(updated);
  };

  const handleRemoveCoAuthor = (index) => {
    setCoAuthors(coAuthors.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedConfId) {
      setFormError("Please select a published conference.");
      return;
    }

    if (deadlinePassed) {
      setFormError("Cannot submit: the conference submission deadline has already elapsed.");
      return;
    }

    if (!title.trim() || !abstract.trim() || !track) {
      setFormError("Please provide paper title, abstract, and track.");
      return;
    }

    if (!file) {
      setFormError("Please upload a PDF manuscript for submission.");
      return;
    }

    try {
      await submitPaper({
        conference_id: selectedConfId,
        title: title.trim(),
        abstract: abstract.trim(),
        track,
        keywords,
        co_authors: coAuthors.filter((ca) => ca.name.trim()),
        file
      });

      // Clear form
      setTitle("");
      setAbstract("");
      setKeywords([]);
      setCoAuthors([]);
      setFile(null);

      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(err.message || "Failed to submit paper.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 mb-2">
              Author Portal • Screen 1 of 5
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Submit Paper Manuscript
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Submit your original academic research. Submissions are automatically locked with version 1 and set to <strong>"submitted"</strong> state.
            </p>
          </div>

          {/* Conference Selector */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Target Conference
            </label>
            <select
              value={selectedConfId}
              onChange={(e) => setSelectedConfId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {publishedConferences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Showing only published conferences
            </span>
          </div>
        </div>

        {/* Deadline Status Banner */}
        {selectedConf && (
          <div
            className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition-all ${
              deadlinePassed
                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"
                : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            {deadlinePassed ? (
              <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs flex-1">
              <div className="font-bold flex items-center justify-between">
                <span>
                  {deadlinePassed
                    ? "Submission Window Closed"
                    : "Submissions are Currently Open"}
                </span>
                <span className="text-[11px] font-mono opacity-80">
                  Deadline: {deadlineFormatted}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] opacity-90">
                {deadlinePassed
                  ? "The official paper submission deadline for this conference has passed. The submission form is locked in accordance with the conference rules."
                  : "All papers submitted before this deadline are assigned version 1 and enter the peer review queue."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Paper Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Paper Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={deadlinePassed}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Robust Decentralized Byzantine Fault Tolerance in Heterogeneous Networks"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:cursor-not-allowed"
          />
        </div>

        {/* Track & Keywords Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject Track <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={deadlinePassed}
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:cursor-not-allowed"
            >
              {selectedConf?.tracks?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Keywords (Press Enter or Comma to add)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {keywords.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-100 dark:border-indigo-900"
                >
                  <Tag className="w-3 h-3 text-indigo-400" />
                  {tag}
                  {!deadlinePassed && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(tag)}
                      className="hover:text-rose-500 text-slate-400 ml-0.5"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
              <input
                type="text"
                disabled={deadlinePassed}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleAddKeyword}
                placeholder={keywords.length ? "" : "Add keywords..."}
                className="flex-1 min-w-[100px] text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Abstract <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            disabled={deadlinePassed}
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Provide a concise summary of the problem, methodology, key theoretical or empirical findings, and primary contributions (typically 150-300 words)."
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-850 disabled:cursor-not-allowed"
          />
        </div>

        {/* Co-Authors List */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                Co-Authors
              </h3>
              <p className="text-[11px] text-slate-400">
                Primary author: <strong>{currentUser?.name}</strong> ({currentUser?.affiliation})
              </p>
            </div>
            {!deadlinePassed && (
              <button
                type="button"
                onClick={handleAddCoAuthor}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Co-Author
              </button>
            )}
          </div>

          {coAuthors.length > 0 ? (
            <div className="space-y-2.5">
              {coAuthors.map((ca, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700"
                >
                  <input
                    type="text"
                    placeholder="Full Name"
                    disabled={deadlinePassed}
                    value={ca.name}
                    onChange={(e) => handleUpdateCoAuthor(idx, "name", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="Institutional Email"
                    disabled={deadlinePassed}
                    value={ca.email}
                    onChange={(e) => handleUpdateCoAuthor(idx, "email", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Affiliation / University"
                    disabled={deadlinePassed}
                    value={ca.affiliation}
                    onChange={(e) => handleUpdateCoAuthor(idx, "affiliation", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  {!deadlinePassed && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCoAuthor(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No additional co-authors added.</p>
          )}
        </div>

        {/* PDF Manuscript File Upload (Firebase Storage) */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Initial PDF Manuscript <span className="text-rose-500">*</span>
          </label>

          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              deadlinePassed
                ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 cursor-not-allowed opacity-60"
                : file
                ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20"
                : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer"
            }`}
          >
            <input
              type="file"
              id="manuscript-file-input"
              accept=".pdf"
              disabled={deadlinePassed}
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
              className="hidden"
            />
            <label
              htmlFor={deadlinePassed ? undefined : "manuscript-file-input"}
              className={deadlinePassed ? "cursor-not-allowed" : "cursor-pointer"}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 rounded-full text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for manuscript upload
                    </p>
                  </div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold underline">
                    Click to replace PDF
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Click to upload manuscript PDF, or drag and drop
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PDF format required (Standard IEEE / ACM 2-column format recommended, max 25MB)
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Form Submission Action */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {deadlinePassed ? (
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Submission button is disabled because the deadline has passed.
              </span>
            ) : (
              <span>Manuscript will be saved with Status = <strong>submitted</strong> and Version = <strong>1</strong>.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={deadlinePassed || isLoading}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              deadlinePassed
                ? "bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/20 active:scale-[0.98]"
            }`}
          >
            {isLoading ? (
              <span>Uploading Manuscript...</span>
            ) : deadlinePassed ? (
              <>
                <Lock className="w-4 h-4" />
                Submission Closed
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Paper (v1)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
