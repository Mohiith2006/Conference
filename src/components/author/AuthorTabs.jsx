import React, { useState, useEffect } from "react";
import {
  subscribePublishedConferences,
  subscribeAuthorPapers,
  subscribeAuthorReviews,
  subscribeDocuments,
  submitPaper, 
  updatePaper, 
  withdrawPaper, 
  uploadCameraReady, 
  completeRegistration,
  uploadSupplementaryDoc,
  deleteSupplementaryDoc
} from "../../services/firebaseService";
import { useAuth } from "../../context/useAuth";
import {
  Send,
  Files,
  CalendarDays,
  Award,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Calendar,
  Tag,
  ArrowRight
} from "lucide-react";

export const AuthorTabs = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();
  const authorId = userProfile?.uid;

  // Live Firestore State (Zero hardcoded mock data)
  const [conferences, setConferences] = useState([]);
  const [papers, setPapers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubConfs = subscribePublishedConferences((data) => {
      setConferences(data);
    });

    const unsubPapers = subscribeAuthorPapers(authorId, (data) => {
      setPapers(data);
    });

    const unsubReviews = subscribeAuthorReviews(authorId, (data) => {
      setReviews(data);
    });

    const unsubDocs = subscribeDocuments(authorId, (data) => {
      setDocuments(data);
    });

    return () => {
      unsubConfs();
      unsubPapers();
      unsubReviews();
      unsubDocs();
    };
  }, [authorId]);

  // Only published conferences are visible to authors
  const publishedConferences = conferences.filter((c) => c.status === "published");

  // =========================================================================
  // PERSONAL STATS METRICS (Calculated exclusively for logged-in user)
  // Strict Privacy: Double-blind isolation, zero exposure of other authors
  // =========================================================================
  const totalSubmissions = papers.length;
  const underReviewCount = papers.filter((p) => p.status === "under_review").length;
  const actionRequiredCount = papers.filter(
    (p) => p.status === "accepted" && (!p.camera_ready_url || !p.registration_completed)
  ).length;

  const handleSelectConferenceForSubmission = (confId) => {
    setSelectedConfId(confId);
    if (setActiveTab) setActiveTab("submit");
  };

  // =========================================================================
  // TAB 1: SUBMIT PAPER
  // =========================================================================
  const [selectedConfIdRaw, setSelectedConfId] = useState("");
  // Default to the first published conference once the list loads, without an
  // effect (adjusting state during render avoids an extra render pass).
  const selectedConfId =
    selectedConfIdRaw || (publishedConferences.length > 0 ? publishedConferences[0].id : "");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [track, setTrack] = useState("");
  const [keywords, setKeywords] = useState("");
  const [coAuthors, setCoAuthors] = useState([]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const activeConf = publishedConferences.find((c) => c.id === selectedConfId);

  // Reset the selected track to the new conference's first track whenever the
  // selected conference changes, adjusted directly during render instead of
  // via an effect (see the App.jsx PortalRouter comment for why).
  const [trackForConfId, setTrackForConfId] = useState(activeConf?.id);
  if (activeConf?.id !== trackForConfId) {
    setTrackForConfId(activeConf?.id);
    setTrack(activeConf?.tracks?.[0] || "");
  }

  // Logic: Check Firebase current date. Only accept submissions if current_date < submission_deadline
  const isSubmissionOpen = () => {
    if (!activeConf) return false;
    if (!activeConf.submission_deadline) return true;
    const deadlineTime = new Date(activeConf.submission_deadline).getTime();
    const nowTime = new Date().getTime();
    return isNaN(deadlineTime) || nowTime < deadlineTime;
  };

  const submissionOpen = isSubmissionOpen();

  const handleAddCoAuthor = () => {
    setCoAuthors([...coAuthors, { name: "", email: "", affiliation: "" }]);
  };

  const handleUpdateCoAuthor = (index, field, value) => {
    const updated = [...coAuthors];
    updated[index][field] = value;
    setCoAuthors(updated);
  };

  const handleRemoveCoAuthor = (index) => {
    setCoAuthors(coAuthors.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!activeConf) {
      setSubmitError("No published conference selected.");
      return;
    }

    if (!submissionOpen) {
      setSubmitError("Submission window is closed: submission deadline has passed.");
      return;
    }

    if (!file) {
      setSubmitError("Please upload your PDF manuscript.");
      return;
    }

    // Generate canonical paperId up-front
    const generatedPaperId = `paper-${Date.now()}`;

    // OPTIMISTIC UI UPDATE: Instantly reflect submission in state with canonical paperId
    const optimisticPaper = {
      id: generatedPaperId,
      conference_id: selectedConfId,
      author_id: authorId || "user-author-01",
      author_name: userProfile?.name || "Author",
      author_email: userProfile?.email || "",
      title: title.trim(),
      abstract: abstract.trim(),
      track,
      keywords: Array.isArray(keywords) ? keywords : keywords.split(",").map(k => k.trim()).filter(Boolean),
      co_authors: coAuthors.filter((ca) => ca.name.trim()),
      status: "submitted",
      version: 1,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      assigned_reviewers: ["user-reviewer-01", "user-reviewer-02"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setPapers((prev) => [optimisticPaper, ...prev.filter((p) => p.id !== generatedPaperId)]);
    setSubmitSuccess("Paper manuscript submitted successfully (v1, Status: Submitted).");
    
    const paperPayload = {
      id: generatedPaperId,
      conference_id: selectedConfId,
      author_id: authorId || "user-author-01",
      author_name: userProfile?.name || "Author",
      author_email: userProfile?.email || "",
      title: title.trim(),
      abstract: abstract.trim(),
      track,
      keywords,
      co_authors: coAuthors.filter((ca) => ca.name.trim()),
      file
    };

    // Clear form immediately
    setTitle("");
    setAbstract("");
    setKeywords("");
    setCoAuthors([]);
    setFile(null);
    setSubmitting(true);

    // Switch view quickly without waiting for network
    setTimeout(() => {
      setActiveTab("submissions");
    }, 400);

    try {
      await submitPaper(paperPayload);
    } catch (err) {
      console.error("Background paper submission error:", err);
      // If error, rollback optimistic paper
      setPapers((prev) => prev.filter((p) => p.id !== optimisticPaper.id));
      setSubmitError(err.message || "Failed to submit paper.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // TAB 2: MY SUBMISSIONS (State Machine)
  // =========================================================================
  const [expandedPaperId, setExpandedPaperId] = useState(null);
  const [editingPaper, setEditingPaper] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAbstract, setEditAbstract] = useState("");

  const handleStartEdit = (paper) => {
    if (paper.status !== "submitted") return;
    setEditingPaper(paper);
    setEditTitle(paper.title);
    setEditAbstract(paper.abstract);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPaper) return;
    const targetId = editingPaper.id;
    const nextVersion = (editingPaper.version || 1) + 1;

    // OPTIMISTIC UPDATE
    setPapers((prev) =>
      prev.map((p) =>
        p.id === targetId ? { ...p, title: editTitle, abstract: editAbstract, version: nextVersion } : p
      )
    );
    setEditingPaper(null);

    await updatePaper(targetId, {
      title: editTitle,
      abstract: editAbstract,
      version: nextVersion
    });
  };

  const handleWithdraw = async (paperId) => {
    if (window.confirm("Are you sure you wish to withdraw this paper? This action is permanent.")) {
      // OPTIMISTIC UPDATE
      setPapers((prev) =>
        prev.map((p) => (p.id === paperId ? { ...p, status: "withdrawn" } : p))
      );
      await withdrawPaper(paperId);
    }
  };

  // =========================================================================
  // TAB 3: REGISTRATION & CAMERA-READY (Conditional)
  // =========================================================================
  const acceptedPapers = papers.filter((p) => p.status === "accepted" || p.status === "finalized");
  const [selectedAcceptedPaperIdRaw, setSelectedAcceptedPaperId] = useState("");
  // Default to the first accepted paper once the list loads, derived during
  // render rather than synced via an effect.
  const selectedAcceptedPaperId =
    selectedAcceptedPaperIdRaw || (acceptedPapers.length > 0 ? acceptedPapers[0].id : "");

  const activeAcceptedPaper = acceptedPapers.find((p) => p.id === selectedAcceptedPaperId);

  // Action 1: Camera-Ready
  const [cameraReadyFile, setCameraReadyFile] = useState(null);
  const [uploadingCR, setUploadingCR] = useState(false);

  const handleUploadCR = async (e) => {
    e.preventDefault();
    if (!cameraReadyFile || !activeAcceptedPaper) return;
    setUploadingCR(true);
    try {
      await uploadCameraReady(
        activeAcceptedPaper.id,
        activeAcceptedPaper.conference_id,
        authorId,
        cameraReadyFile,
        activeAcceptedPaper.registration_completed
      );
      setCameraReadyFile(null);
    } finally {
      setUploadingCR(false);
    }
  };

  // Action 2: Registration & Payment
  const [tier, setTier] = useState("Academic ($300)");
  const [discountCode, setDiscountCode] = useState("");
  const [paying, setPaying] = useState(false);

  const handlePayRegistration = async (e) => {
    e.preventDefault();
    if (!activeAcceptedPaper) return;
    setPaying(true);

    const hasCR = Boolean(activeAcceptedPaper.camera_ready_url);
    const nextStatus = hasCR ? "finalized" : "accepted";

    // Optimistic UI update: instantly mark paid and finalized
    setPapers((prev) =>
      prev.map((p) =>
        p.id === activeAcceptedPaper.id
          ? { ...p, registration_completed: true, registration_tier: tier, status: nextStatus }
          : p
      )
    );

    try {
      const baseFee = tier.includes("150") ? 150 : tier.includes("500") ? 500 : 300;
      const discount = discountCode.toUpperCase() === "EARLYBIRD" ? 50 : 0;
      await completeRegistration(activeAcceptedPaper.id, {
        tier,
        amountPaid: Math.max(0, baseFee - discount),
        discountCode,
        hasCameraReady: hasCR
      });
    } finally {
      setPaying(false);
    }
  };

  // =========================================================================
  // TAB 4: MY SCHEDULE
  // =========================================================================
  const finalizedPapers = papers.filter((p) => p.status === "finalized" && p.schedule);

  // =========================================================================
  // TAB 5: CERTIFICATES & DOCUMENTS
  // =========================================================================
  // Certificates: ONLY after conference end_date has passed
  const handleDownloadCertificate = async (paper) => {
    const conf = conferences.find((c) => c.id === paper.conference_id);
    if (!conf) return;

    // jsPDF (~180KB) is only needed here, on the certificate screen, so it's
    // dynamically imported instead of bundled into the main app chunk.
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    // Academic parchment background
    doc.setFillColor(250, 248, 245);
    doc.rect(0, 0, 297, 210, "F");

    // Double frame border
    doc.setDrawColor(43, 40, 38);
    doc.setLineWidth(1.2);
    doc.rect(12, 12, 273, 186);

    doc.setDrawColor(168, 153, 132);
    doc.setLineWidth(0.4);
    doc.rect(15, 15, 267, 180);

    // Header
    doc.setFont("times", "italic");
    doc.setTextColor(110, 100, 90);
    doc.setFontSize(12);
    doc.text("Scholarly Academic Peer Review Proceedings", 148.5, 32, { align: "center" });

    doc.setFont("times", "bold");
    doc.setTextColor(28, 26, 24);
    doc.setFontSize(26);
    doc.text("CERTIFICATE OF PRESENTATION", 148.5, 48, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(66, 61, 56);
    doc.text("This document confirms and certifies that", 148.5, 62, { align: "center" });

    // Author Name
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(28, 26, 24);
    doc.text((userProfile?.name || paper.author_name).toUpperCase(), 148.5, 78, { align: "center" });

    doc.setDrawColor(168, 153, 132);
    doc.line(70, 82, 227, 82);

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(94, 87, 80);
    doc.text(userProfile?.affiliation || "Academic Institution", 148.5, 88, { align: "center" });

    // Paper Description
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(43, 40, 38);
    doc.text("has successfully presented the peer-reviewed scholarly research paper:", 148.5, 102, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(15);
    const splitTitle = doc.splitTextToSize(`"${paper.title}"`, 220);
    doc.text(splitTitle, 148.5, 114, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(`at the official sessions of ${conf.title}`, 148.5, 134, { align: "center" });

    const endDateFormatted = new Date(conf.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    doc.setFontSize(11);
    doc.setTextColor(110, 100, 90);
    doc.text(`Concluded: ${endDateFormatted} • Indexed in Official Proceedings`, 148.5, 142, { align: "center" });

    // Signatures
    doc.line(40, 172, 100, 172);
    doc.line(197, 172, 257, 172);
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 26, 24);
    doc.text("General Conference Chair", 70, 178, { align: "center" });
    doc.text("Program Committee Lead", 227, 178, { align: "center" });

    doc.save(`Certificate_${paper.id}.pdf`);
  };

  // Document Library
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("patent");
  const [docPaperId, setDocPaperId] = useState(papers[0]?.id || "");
  const [docFile, setDocFile] = useState(null);
  const [docLink, setDocLink] = useState("");

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const optimisticDoc = {
      id: `doc-${Date.now()}`,
      paper_id: docPaperId || papers[0]?.id || "general",
      author_id: authorId,
      title: docTitle.trim(),
      doc_type: docType,
      file_url: docFile ? URL.createObjectURL(docFile) : null,
      external_link: docLink.trim() || null,
      uploaded_at: new Date().toISOString()
    };

    // Optimistic UI update: instantly show in library
    setDocuments((prev) => [optimisticDoc, ...prev]);

    const titleToSave = docTitle.trim();
    const linkToSave = docLink.trim();
    const fileToSave = docFile;
    const pId = docPaperId || papers[0]?.id || "general";

    setDocTitle("");
    setDocLink("");
    setDocFile(null);

    uploadSupplementaryDoc({
      paper_id: pId,
      author_id: authorId,
      title: titleToSave,
      doc_type: docType,
      file: fileToSave,
      external_link: linkToSave || null
    }).catch((err) => {
      console.error("Background upload doc error:", err);
    });
  };

  // =========================================================================
  // RENDER CORRESPONDING TAB (Defaults to Overview if activeTab is unset)
  // =========================================================================
  const currentTab = ["overview", "submit", "submissions", "registration", "schedule", "certificates"].includes(activeTab)
    ? activeTab
    : "overview";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* ----------------------------------------------------------------- */}
      {/* TAB 0: AUTHOR OVERVIEW DASHBOARD (NEW DEFAULT LANDING PAGE)       */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header with Personalized Welcome Message */}
          <div className="border-b border-beige-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
                Author Portal • Dashboard Overview
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink-900 mt-1">
                Welcome back, {userProfile?.name || "Author"}
              </h2>
              <p className="text-xs text-ink-600 mt-1.5 max-w-2xl">
                Personal academic workspace for tracking double-blind peer reviews, manuscript revisions, and official conference proceedings.
              </p>
            </div>
            
            <button
              onClick={() => setActiveTab("submit")}
              className="self-start md:self-auto px-4 py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 rounded-sm hover:bg-ink-800 transition flex items-center gap-2 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Manuscript</span>
            </button>
          </div>

          {/* Personal Stats Row: 3 Metric Cards querying strictly currentUser's data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Metric 1: Total Submissions */}
            <div 
              onClick={() => setActiveTab("submissions")}
              className="bg-white border border-beige-200 p-5 rounded-sm shadow-2xs hover:border-ink-800 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500 font-semibold">
                  Total Submissions
                </span>
                <div className="w-8 h-8 rounded-sm bg-beige-100 border border-beige-200 flex items-center justify-center text-ink-700 group-hover:bg-ink-900 group-hover:text-beige-50 group-hover:border-ink-900 transition-colors">
                  <Files className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-ink-900">
                {totalSubmissions}
              </div>
              <div className="mt-2 text-[11px] text-ink-500 flex items-center justify-between">
                <span>Papers authored under your account</span>
                <span className="group-hover:translate-x-0.5 transition-transform text-ink-900 font-bold">→</span>
              </div>
            </div>

            {/* Metric 2: Under Review */}
            <div 
              onClick={() => setActiveTab("submissions")}
              className="bg-white border border-beige-200 p-5 rounded-sm shadow-2xs hover:border-ink-800 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500 font-semibold">
                  Under Review
                </span>
                <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:bg-ink-900 group-hover:text-beige-50 group-hover:border-ink-900 transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-ink-900">
                {underReviewCount}
              </div>
              <div className="mt-2 text-[11px] text-ink-500 flex items-center justify-between">
                <span>In double-blind peer evaluation</span>
                <span className="group-hover:translate-x-0.5 transition-transform text-ink-900 font-bold">→</span>
              </div>
            </div>

            {/* Metric 3: Action Required */}
            <div 
              onClick={() => setActiveTab("registration")}
              className={`bg-white border p-5 rounded-sm shadow-2xs hover:border-ink-800 transition cursor-pointer group ${
                actionRequiredCount > 0 ? "border-terracotta-400/80 bg-terracotta-50/10" : "border-beige-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500 font-semibold">
                  Action Required
                </span>
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center transition-colors ${
                  actionRequiredCount > 0
                    ? "bg-terracotta-100 text-terracotta-800 border border-terracotta-300"
                    : "bg-sage-50 text-sage-700 border border-sage-200"
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-ink-900 flex items-center gap-2">
                <span>{actionRequiredCount}</span>
                {actionRequiredCount > 0 && (
                  <span className="text-[10px] font-mono uppercase font-normal px-2 py-0.5 bg-terracotta-100 text-terracotta-800 rounded border border-terracotta-300">
                    Pending
                  </span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-ink-500 flex items-center justify-between">
                <span>{actionRequiredCount > 0 ? "Accepted papers pending CR or fee" : "All submissions up to date"}</span>
                <span className="group-hover:translate-x-0.5 transition-transform text-ink-900 font-bold">→</span>
              </div>
            </div>

          </div>

          {/* Active Conferences Feed (Real-time onSnapshot) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-beige-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink-900">
                  Active Conference Proceedings
                </h3>
                <p className="text-xs text-ink-500">
                  Verified calls for papers accepting manuscript submissions.
                </p>
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 bg-beige-150 border border-beige-300 text-ink-700 rounded-sm">
                {publishedConferences.length} Call{publishedConferences.length === 1 ? "" : "s"} Open
              </span>
            </div>

            {publishedConferences.length === 0 ? (
              <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
                <FolderOpen className="w-10 h-10 text-ink-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-sm text-ink-800">
                  No Active Conferences Available
                </h4>
                <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                  There are currently no published conferences open for manuscript submission. When an organizer publishes a conference, it will immediately appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {publishedConferences.map((conf) => {
                  const subDate = conf.submission_deadline
                    ? new Date(conf.submission_deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "TBD";

                  const isDeadlinePassed = conf.submission_deadline
                    ? new Date().getTime() > new Date(conf.submission_deadline).getTime()
                    : false;

                  return (
                    <div 
                      key={conf.id}
                      className="bg-white border border-beige-200 rounded-sm p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-beige-400 transition"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-serif font-bold text-base text-ink-900 leading-snug">
                            {conf.title}
                          </h4>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${
                            isDeadlinePassed
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-sage-50 text-sage-700 border-sage-200"
                          }`}>
                            {isDeadlinePassed ? "Closed" : "Active Call"}
                          </span>
                        </div>

                        <p className="text-xs text-ink-600 line-clamp-3 leading-relaxed">
                          {conf.description || "Official peer-reviewed academic conference accepting original research papers."}
                        </p>

                        <div className="pt-2 border-t border-beige-150 space-y-2">
                          <div className="flex items-center gap-2 text-[11px] text-ink-600">
                            <Calendar className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                            <span className="font-semibold text-ink-800">Submission Deadline:</span>
                            <span className="font-mono">{subDate}</span>
                          </div>

                          {conf.tracks && conf.tracks.length > 0 && (
                            <div className="flex items-start gap-2 text-[11px] text-ink-600">
                              <Tag className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
                              <div className="flex flex-wrap gap-1">
                                {conf.tracks.map((t, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-1.5 py-0.5 bg-beige-100 border border-beige-200 text-[10px] text-ink-700 rounded-xs"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-beige-150 flex items-center justify-between">
                        <span className="text-[10px] text-ink-400 font-mono">
                          ID: {conf.id.substring(0, 10)}...
                        </span>
                        <button
                          disabled={isDeadlinePassed}
                          onClick={() => handleSelectConferenceForSubmission(conf.id)}
                          className="px-3.5 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <span>Submit Manuscript</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
      
      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: SUBMIT PAPER */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "submit" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Author Portal • Tab 1 of 5
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              Submit Academic Manuscript
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Upload original research to a published conference. Deadlines are verified against official academic timestamps.
            </p>
          </div>

          {/* Blank state if no conferences published */}
          {publishedConferences.length === 0 ? (
            <div className="bg-white border border-beige-200 p-10 text-center rounded-sm">
              <FolderOpen className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Published Conferences Available
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                Conferences must be created and published by an Organizer before submissions open. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Conference Selector & Deadline Check */}
              <div className="bg-white border border-beige-200 p-5 rounded-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                      Select Published Conference
                    </label>
                    <select
                      value={selectedConfId}
                      onChange={(e) => setSelectedConfId(e.target.value)}
                      className="w-full sm:w-96 px-3 py-2 text-xs border border-beige-300 rounded-sm bg-beige-50 text-ink-900 focus:outline-none focus:border-ink-800"
                    >
                      {publishedConferences.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeConf && (
                    <div className="text-xs sm:text-right">
                      <span className="text-ink-500 block text-[11px] font-mono uppercase">
                        Submission Deadline
                      </span>
                      <span className="font-serif font-bold text-ink-800">
                        {new Date(activeConf.submission_deadline).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-time Deadline Logic Status */}
                {activeConf && (
                  <div className={`mt-4 p-3 rounded-sm border text-xs flex items-center gap-2 ${
                    submissionOpen
                      ? "bg-beige-50 border-beige-300 text-ink-800"
                      : "bg-terracotta-50 border-terracotta-100 text-terracotta-800"
                  }`}>
                    {submissionOpen ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-ink-700 shrink-0" />
                        <span>Submission portal is active. Current date is before the submission deadline.</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-terracotta-700 shrink-0" />
                        <span className="font-semibold">
                          Submission deadline has passed. Submissions for this conference are closed.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submission Form */}
              <form onSubmit={handleFormSubmit} className="bg-white border border-beige-200 p-6 md:p-8 rounded-sm space-y-5">
                {submitError && (
                  <div className="p-3 bg-terracotta-50 border border-terracotta-100 text-terracotta-800 text-xs flex items-center gap-2 rounded-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 bg-sage-50 border border-sage-100 text-sage-700 text-xs flex items-center gap-2 rounded-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                    Paper Title <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!submissionOpen}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Asynchronous Consensus in Byzantine Fault Tolerant Systems"
                    className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                      Subject Track <span className="text-terracotta-700">*</span>
                    </label>
                    <select
                      required
                      disabled={!submissionOpen}
                      value={track}
                      onChange={(e) => setTrack(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100"
                    >
                      {activeConf?.tracks?.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                      Keywords (Comma separated)
                    </label>
                    <input
                      type="text"
                      disabled={!submissionOpen}
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. Distributed Systems, Consensus, Cryptography"
                      className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                    Abstract <span className="text-terracotta-700">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    disabled={!submissionOpen}
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Provide a comprehensive academic summary of methodology and contributions (150-300 words)..."
                    className="w-full px-3 py-2 text-xs border border-beige-300 rounded-sm bg-white text-ink-900 focus:outline-none focus:border-ink-800 disabled:bg-beige-100"
                  />
                </div>

                {/* Co-Authors List */}
                <div className="pt-2 border-t border-beige-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-serif font-bold text-ink-800">Co-Authors</span>
                      <p className="text-[11px] text-ink-500">Primary author: {userProfile?.name} ({userProfile?.affiliation})</p>
                    </div>
                    {submissionOpen && (
                      <button
                        type="button"
                        onClick={handleAddCoAuthor}
                        className="text-xs font-serif text-ink-800 underline hover:text-ink-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Co-Author
                      </button>
                    )}
                  </div>

                  {coAuthors.map((ca, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={ca.name}
                        onChange={(e) => handleUpdateCoAuthor(idx, "name", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={ca.email}
                        onChange={(e) => handleUpdateCoAuthor(idx, "email", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Affiliation"
                        value={ca.affiliation}
                        onChange={(e) => handleUpdateCoAuthor(idx, "affiliation", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCoAuthor(idx)}
                        className="p-1.5 text-ink-400 hover:text-terracotta-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* File Upload (Firebase Storage) */}
                <div className="pt-2 border-t border-beige-200">
                  <label className="block text-xs font-serif font-bold text-ink-800 mb-1">
                    Manuscript PDF Upload <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    disabled={!submissionOpen}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-ink-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-beige-300 file:bg-beige-100 file:text-ink-800 file:text-xs file:font-serif file:rounded-sm hover:file:bg-beige-150 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-ink-500 mt-1">
                    PDF format only. Files are securely encrypted and stored.
                  </p>
                </div>

                <div className="pt-4 border-t border-beige-200 flex items-center justify-between">
                  <span className="text-[11px] text-ink-500 italic">
                    On save: status = "submitted", version = 1.
                  </span>
                  <button
                    type="submit"
                    disabled={!submissionOpen || submitting}
                    className="px-6 py-2.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 disabled:bg-beige-300 disabled:text-ink-500 transition rounded-sm flex items-center gap-2"
                  >
                    {submitting ? (
                      <span>Uploading Manuscript...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Paper (v1)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: MY SUBMISSIONS (State Machine) */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "submissions" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Author Portal • Tab 2 of 5
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              My Research Submissions
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Strict state machine enforcement: <strong>submitted</strong> (editable/withdrawable), <strong>under_review</strong> (read-only), <strong>accepted/rejected</strong> (scores unlocked).
            </p>
          </div>

          {/* Blank state if no papers submitted yet */}
          {papers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <Files className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Submissions on Record
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 mb-4">
                You have not submitted any manuscripts to the conference system yet.
              </p>
              <button
                onClick={() => setActiveTab("submit")}
                className="px-4 py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 rounded-sm hover:bg-ink-800"
              >
                Go to Submit Paper
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {papers.map((paper) => {
                const conf = conferences.find((c) => c.id === paper.conference_id);
                const isSubmitted = paper.status === "submitted";
                const isUnderReview = paper.status === "under_review";
                const isDecided = ["accepted", "rejected", "finalized"].includes(paper.status);
                const paperReviews = reviews.filter((r) => r.paper_id === paper.id);
                const isExpanded = expandedPaperId === paper.id;

                const avgScore = paperReviews.length > 0
                  ? (paperReviews.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) / paperReviews.length).toFixed(1)
                  : null;

                return (
                  <div key={paper.id} className="bg-white border border-beige-200 rounded-sm p-6 space-y-3">
                    
                    {/* Status Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          paper.status === "accepted" || paper.status === "finalized"
                            ? "bg-sage-50 border-sage-600 text-sage-700"
                            : paper.status === "rejected"
                            ? "bg-terracotta-50 border-terracotta-600 text-terracotta-700"
                            : paper.status === "under_review"
                            ? "bg-beige-150 border-ink-600 text-ink-800"
                            : "bg-beige-50 border-beige-400 text-ink-700"
                        }`}>
                          {paper.status.replace("_", " ")} (v{paper.version})
                        </span>

                        <span className="text-[11px] text-ink-500 font-mono">
                          ID: {paper.id.substring(0, 10)}...
                        </span>
                      </div>

                      <span className="text-xs font-serif text-ink-600">
                        {conf?.title || "Conference"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-base font-bold text-ink-900 leading-snug">
                      {paper.title}
                    </h3>

                    <p className="text-xs text-ink-600 line-clamp-2">
                      {paper.abstract}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-beige-200 text-xs text-ink-500">
                      <div>
                        Track: <span className="font-semibold text-ink-800">{paper.track}</span>
                      </div>

                      {paper.file_url && (
                        <a
                          href={paper.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-serif underline text-ink-800 hover:text-ink-600 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Uploaded PDF
                        </a>
                      )}
                    </div>

                    {/* State Machine Actions */}
                    <div className="pt-3 border-t border-beige-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-ink-500">
                        {isSubmitted && "State: Submitted (No reviewer assigned yet). Manuscript is editable and withdrawable."}
                        {isUnderReview && "State: Under Review. Manuscript is locked (read-only). Scores are hidden."}
                        {isDecided && "State: Decided. Aggregated scores and comments unlocked."}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Editable if submitted */}
                        {isSubmitted && (
                          <button
                            onClick={() => handleStartEdit(paper)}
                            className="px-3 py-1 text-xs font-serif border border-beige-300 hover:border-ink-800 bg-white rounded-sm"
                          >
                            Edit (v{paper.version + 1})
                          </button>
                        )}

                        {/* Withdrawable if submitted or under_review */}
                        {(isSubmitted || isUnderReview) && (
                          <button
                            onClick={() => handleWithdraw(paper.id)}
                            className="px-3 py-1 text-xs font-serif text-terracotta-700 border border-terracotta-100 hover:bg-terracotta-50 rounded-sm"
                          >
                            Withdraw
                          </button>
                        )}

                        {/* Expandable Review Scores & Comments for Decided Papers */}
                        {isDecided && (
                          <button
                            onClick={() => setExpandedPaperId(isExpanded ? null : paper.id)}
                            className="px-3 py-1 text-xs font-serif font-bold border border-ink-900 bg-beige-100 hover:bg-beige-150 rounded-sm flex items-center gap-1.5"
                          >
                            <span>{isExpanded ? "Close Reviews" : "View Anonymized Reviews"}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDED REVIEW FEEDBACK DRAWER */}
                    {isDecided && isExpanded && (
                      <div className="mt-4 p-4 bg-beige-50 border border-beige-200 rounded-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-beige-200 pb-2">
                          <span className="font-serif font-bold text-xs uppercase tracking-wider text-ink-800">
                            Double-Blind Evaluation Feedback
                          </span>
                          {avgScore && (
                            <span className="font-serif font-bold text-xs text-ink-900">
                              Average Score: {avgScore} / 5.0
                            </span>
                          )}
                        </div>

                        {paperReviews.length === 0 ? (
                          <p className="text-xs text-ink-500 italic">
                            Decision was recorded by Organizer. No reviewer comments filed.
                          </p>
                        ) : (
                          paperReviews.map((rev, idx) => (
                            <div key={rev.id || idx} className="bg-white p-3 border border-beige-200 rounded-sm space-y-2">
                              <div className="flex items-center justify-between text-xs font-serif font-bold text-ink-800">
                                <span>{rev.reviewer_code || `Reviewer #${idx + 1}`}</span>
                                <span>Overall: {rev.scores?.overall} / 5</span>
                              </div>

                              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-ink-600 pt-1">
                                <div>Originality: {rev.scores?.originality}/5</div>
                                <div>Technical: {rev.scores?.technical}/5</div>
                                <div>Clarity: {rev.scores?.clarity}/5</div>
                                <div>Relevance: {rev.scores?.relevance}/5</div>
                              </div>

                              <p className="text-xs text-ink-700 bg-beige-50 p-2.5 rounded-sm border border-beige-200 leading-relaxed font-sans">
                                "{rev.anonymized_comments}"
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* EDIT MODAL */}
          {editingPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
              <div className="bg-white border border-beige-300 w-full max-w-lg p-6 rounded-sm space-y-4">
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Revise Manuscript (Creates Version {editingPaper.version + 1})
                </h3>
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-serif font-bold mb-1">Abstract</label>
                    <textarea
                      rows={4}
                      required
                      value={editAbstract}
                      onChange={(e) => setEditAbstract(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-beige-300 rounded-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-beige-200">
                    <button
                      type="button"
                      onClick={() => setEditingPaper(null)}
                      className="px-3 py-1.5 text-xs font-serif border border-beige-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50"
                    >
                      Save Version {editingPaper.version + 1}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: REGISTRATION & CAMERA-READY (Conditional) */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "registration" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Author Portal • Tab 3 of 5
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              Registration & Camera-Ready Submissions
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Conditional requirement: active only for accepted papers. Requires both Camera-Ready upload and Registration Payment.
            </p>
          </div>

          {/* Blank state if no accepted papers */}
          {acceptedPapers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <Lock className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                Camera-Ready & Registration Locked
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto mt-1">
                This tab activates conditionally only after one of your submitted papers receives an official <strong>"accepted"</strong> status decision from the conference committee.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Paper Selector */}
              {acceptedPapers.length > 1 && (
                <div className="bg-white border border-beige-200 p-4 rounded-sm flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-ink-800">Select Accepted Paper:</span>
                  <select
                    value={selectedAcceptedPaperId}
                    onChange={(e) => setSelectedAcceptedPaperId(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50"
                  >
                    {acceptedPapers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title.substring(0, 50)}... ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeAcceptedPaper && (
                <div className="space-y-6">
                  
                  {/* Status Banner */}
                  <div className="p-4 bg-white border border-beige-200 rounded-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-ink-900">
                        {activeAcceptedPaper.title}
                      </span>
                      <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        activeAcceptedPaper.status === "finalized"
                          ? "bg-sage-50 border-sage-600 text-sage-700"
                          : "bg-beige-100 border-ink-800 text-ink-900"
                      }`}>
                        {activeAcceptedPaper.status === "finalized" ? "Paper Finalized" : "Accepted (Incomplete)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 border border-beige-200 bg-beige-50 rounded-sm flex items-center justify-between text-xs">
                        <span>1. Camera-Ready PDF</span>
                        <span className="font-bold">
                          {activeAcceptedPaper.camera_ready_url ? "✓ Uploaded" : "Pending"}
                        </span>
                      </div>
                      <div className="p-3 border border-beige-200 bg-beige-50 rounded-sm flex items-center justify-between text-xs">
                        <span>2. Registration Fee</span>
                        <span className="font-bold">
                          {activeAcceptedPaper.registration_completed ? "✓ Paid" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Two Independent Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Action 1: Upload Camera-Ready */}
                    <div className="bg-white border border-beige-200 p-6 rounded-sm space-y-4">
                      <div className="border-b border-beige-200 pb-2">
                        <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-ink-900">
                          Action 1: Camera-Ready Manuscript
                        </h4>
                        <p className="text-[11px] text-ink-500">Revised PDF incorporating reviewer notes</p>
                      </div>

                      {activeAcceptedPaper.camera_ready_url ? (
                        <div className="p-3 bg-sage-50 border border-sage-100 text-xs text-sage-700 rounded-sm flex items-center justify-between">
                          <span>✓ Camera-ready file uploaded</span>
                          <a href={activeAcceptedPaper.camera_ready_url} target="_blank" rel="noreferrer" className="underline font-serif">
                            View File
                          </a>
                        </div>
                      ) : (
                        <form onSubmit={handleUploadCR} className="space-y-3">
                          <input
                            type="file"
                            accept=".pdf"
                            required
                            onChange={(e) => setCameraReadyFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-ink-600 file:mr-2 file:py-1 file:px-2.5 file:border file:border-beige-300 file:bg-beige-100 file:text-xs file:font-serif"
                          />
                          <button
                            type="submit"
                            disabled={uploadingCR || !cameraReadyFile}
                            className="w-full py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 disabled:bg-beige-200 disabled:text-ink-400"
                          >
                            {uploadingCR ? "Uploading to Storage..." : "Upload Camera-Ready PDF"}
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Action 2: Registration & Payment Form */}
                    <div className="bg-white border border-beige-200 p-6 rounded-sm space-y-4">
                      <div className="border-b border-beige-200 pb-2">
                        <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-ink-900">
                          Action 2: Registration & Fee
                        </h4>
                        <p className="text-[11px] text-ink-500">Attendee tier & payment verification</p>
                      </div>

                      {activeAcceptedPaper.registration_completed ? (
                        <div className="p-3 bg-sage-50 border border-sage-100 text-xs text-sage-700 rounded-sm space-y-1">
                          <div className="font-bold">✓ Registration Completed</div>
                          <div>Tier: {activeAcceptedPaper.registration_tier}</div>
                        </div>
                      ) : (
                        <form onSubmit={handlePayRegistration} className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-serif font-bold text-ink-700 mb-1">
                              Registration Tier
                            </label>
                            <select
                              value={tier}
                              onChange={(e) => setTier(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50"
                            >
                              <option value="Student ($150)">Student ($150)</option>
                              <option value="Academic ($300)">Academic ($300)</option>
                              <option value="Industry ($500)">Industry ($500)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-serif font-bold text-ink-700 mb-1">
                              Discount Code
                            </label>
                            <input
                              type="text"
                              value={discountCode}
                              onChange={(e) => setDiscountCode(e.target.value)}
                              placeholder="e.g. EARLYBIRD"
                              className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm uppercase font-mono"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={paying}
                            className="w-full py-2 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 disabled:bg-beige-200"
                          >
                            {paying ? "Processing Payment..." : "Complete Registration & Pay"}
                          </button>
                        </form>
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 4: MY SCHEDULE */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "schedule" && (
        <div className="space-y-6">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Author Portal • Tab 4 of 5
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              Presentation Schedule & Timetable
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Read-only session timetable showing the Room, Time, and Track for finalized papers.
            </p>
          </div>

          {/* Blank state if no finalized scheduled papers */}
          {finalizedPapers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm">
              <CalendarDays className="w-10 h-10 text-ink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Presentation Slots Assigned
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto mt-1">
                Papers appear here once both Camera-Ready and Registration are completed (status: finalized) and the Organizer has assigned a room and timetable.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {finalizedPapers.map((paper) => {
                const conf = conferences.find((c) => c.id === paper.conference_id);

                return (
                  <div key={paper.id} className="bg-white border border-beige-200 p-6 rounded-sm space-y-4">
                    <div className="border-b border-beige-200 pb-3">
                      <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-ink-500">
                        {conf?.title || "Conference Presentation"}
                      </span>
                      <h3 className="font-serif text-base font-bold text-ink-900 mt-1">
                        {paper.title}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-beige-50 border border-beige-200 rounded-sm">
                        <span className="text-[10px] font-mono uppercase text-ink-500 block">Room</span>
                        <span className="font-serif font-bold text-ink-900 text-sm">{paper.schedule.room}</span>
                      </div>

                      <div className="p-3 bg-beige-50 border border-beige-200 rounded-sm">
                        <span className="text-[10px] font-mono uppercase text-ink-500 block">Time Slot</span>
                        <span className="font-serif font-bold text-ink-900 text-sm">{paper.schedule.time}</span>
                        <div className="text-[10px] text-ink-500">{paper.schedule.date}</div>
                      </div>

                      <div className="p-3 bg-beige-50 border border-beige-200 rounded-sm">
                        <span className="text-[10px] font-mono uppercase text-ink-500 block">Session Track</span>
                        <span className="font-serif font-bold text-ink-900 text-sm">{paper.schedule.track || paper.track}</span>
                        <div className="text-[10px] text-ink-500">Chair: {paper.schedule.chair || "Session Committee"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 5: CERTIFICATES & DOCUMENTS */}
      {/* ----------------------------------------------------------------- */}
      {currentTab === "certificates" && (
        <div className="space-y-8">
          <div className="border-b border-beige-200 pb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500">
              Author Portal • Tab 5 of 5
            </span>
            <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
              Presentation Certificates & Document Library
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Downloadable presentation certificates (unlocked strictly post-conference) and unmoderated patent/supplementary uploads.
            </p>
          </div>

          {/* SUB-SECTION 1: PRESENTATION CERTIFICATES */}
          <div className="bg-white border border-beige-200 p-6 rounded-sm space-y-4">
            <div className="border-b border-beige-200 pb-2">
              <h3 className="font-serif font-bold text-sm text-ink-900">
                Official Presentation Certificate
              </h3>
              <p className="text-xs text-ink-500">
                Generates a downloadable PDF filling in Author Name, Paper Title, and Conference Name ONLY after conference <code>end_date</code> has passed.
              </p>
            </div>

            {papers.length === 0 ? (
              <p className="text-xs text-ink-500 italic py-3">No submitted papers on record.</p>
            ) : (
              <div className="space-y-3">
                {papers.map((paper) => {
                  const conf = conferences.find((c) => c.id === paper.conference_id);
                  const confEnded = conf?.end_date ? new Date().getTime() > new Date(conf.end_date).getTime() : false;

                  return (
                    <div key={paper.id} className="p-4 border border-beige-200 rounded-sm bg-beige-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-serif font-bold text-ink-900">
                          {paper.title}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          {conf?.title || "Conference"} • Status: {paper.status}
                        </div>
                      </div>

                      <div>
                        {confEnded ? (
                          <button
                            onClick={() => handleDownloadCertificate(paper)}
                            className="px-3.5 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" /> Download Certificate (PDF)
                          </button>
                        ) : (
                          <div className="text-xs font-serif text-ink-500 flex items-center gap-1 bg-beige-200 px-3 py-1.5 rounded-sm">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlocks after {conf?.end_date ? new Date(conf.end_date).toLocaleDateString() : "end date"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SUB-SECTION 2: UNMODERATED DOCUMENT LIBRARY */}
          <div className="bg-white border border-beige-200 p-6 rounded-sm space-y-5">
            <div className="border-b border-beige-200 pb-2">
              <h3 className="font-serif font-bold text-sm text-ink-900">
                Unmoderated Document Library
              </h3>
              <p className="text-xs text-ink-500">
                Self-service list and upload area for patent filings, benchmarks, or supplementary files tied to your paper. No approval needed.
              </p>
            </div>

            {/* Upload Document Form */}
            <form onSubmit={handleUploadDoc} className="p-4 bg-beige-50 border border-beige-200 rounded-sm space-y-3">
              <span className="text-xs font-serif font-bold uppercase text-ink-800 block">
                Add Document or Patent Record
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. US Provisional Patent 63/981"
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                  >
                    <option value="patent">Patent Filing</option>
                    <option value="dataset">Benchmark Dataset</option>
                    <option value="appendix">Extended Appendix</option>
                    <option value="code">Source Code / Formal Proofs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1">Attach to Paper</label>
                  <select
                    value={docPaperId}
                    onChange={(e) => setDocPaperId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                  >
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>{p.title.substring(0, 35)}...</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1">Upload File (PDF/Zip)</label>
                  <input
                    type="file"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-ink-600 file:mr-2 file:py-1 file:px-2 file:border file:border-beige-300 file:bg-white file:text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1">Or External URL Link</label>
                  <input
                    type="url"
                    value={docLink}
                    onChange={(e) => setDocLink(e.target.value)}
                    placeholder="https://patents.google.com/... or https://github.com/..."
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-serif font-bold uppercase bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm"
                >
                  Add to Library
                </button>
              </div>
            </form>

            {/* Document List */}
            <div>
              {documents.length === 0 ? (
                <p className="text-xs text-ink-500 italic py-3 text-center">
                  No supplementary files or patent links uploaded yet.
                </p>
              ) : (
                <div className="divide-y divide-beige-200 border border-beige-200 rounded-sm">
                  {documents.map((d) => (
                    <div key={d.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-serif font-bold text-ink-900">{d.title}</div>
                        <div className="text-[10px] uppercase font-mono text-ink-500">{d.doc_type}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {d.file_url && (
                          <a href={d.file_url} target="_blank" rel="noreferrer" className="underline font-serif text-ink-800">
                            Download File
                          </a>
                        )}
                        {d.external_link && (
                          <a href={d.external_link} target="_blank" rel="noreferrer" className="underline font-serif text-ink-800 flex items-center gap-0.5">
                            Link <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <button
                          onClick={() => deleteSupplementaryDoc(d.id)}
                          className="text-ink-400 hover:text-terracotta-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
