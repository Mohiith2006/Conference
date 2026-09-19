import React, { useState } from "react";
import { 
  CreditCard, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  DollarSign,
  Tag
} from "lucide-react";
import confetti from "canvas-confetti";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const Screen3_RegistrationCameraReady = ({ onNavigateToScreen }) => {
  const { papers, uploadCameraReady, completeRegistration, isLoading } = useConference();
  const { currentUser } = useAuth();

  // Filter papers that are either accepted or finalized
  const eligiblePapers = papers.filter(
    (p) => p.author_id === currentUser?.uid && (p.status === "accepted" || p.status === "finalized")
  );

  const [selectedPaperIdRaw, setSelectedPaperId] = useState("");
  // Default to the first eligible paper once the list loads, derived during
  // render rather than synced via an effect.
  const selectedPaperId =
    selectedPaperIdRaw || (eligiblePapers.length > 0 ? eligiblePapers[0].id : "");

  const activePaper = eligiblePapers.find((p) => p.id === selectedPaperId);

  // Action 1 states (Camera-Ready)
  const [cameraReadyFile, setCameraReadyFile] = useState(null);

  // Action 2 states (Payment & Registration)
  const [tier, setTier] = useState("academic");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState("");
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("888");

  // Calculate pricing
  const tierPrices = {
    student: 150,
    academic: 300,
    industry: 500,
  };

  const basePrice = tierPrices[tier] || 300;
  const finalPrice = Math.max(0, basePrice - appliedDiscount);

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (code === "EARLYBIRD") {
      setAppliedDiscount(50);
      setDiscountMsg("✓ Promo code applied: $50 off!");
    } else if (code === "CONFERENCE2026") {
      setAppliedDiscount(75);
      setDiscountMsg("✓ Special Conference grant applied: $75 off!");
    } else if (code === "AUTHOR100") {
      setAppliedDiscount(100);
      setDiscountMsg("✓ Author discount applied: $100 off!");
    } else {
      setDiscountMsg("Invalid discount code. Try 'EARLYBIRD' or 'AUTHOR100'.");
      setAppliedDiscount(0);
    }
  };

  // Upload Camera Ready
  const handleUploadCameraReady = async (e) => {
    e.preventDefault();
    if (!cameraReadyFile || !activePaper) return;
    await uploadCameraReady(activePaper.id, cameraReadyFile);
    setCameraReadyFile(null);
    checkIfJustFinalized(activePaper.registration_completed, true);
  };

  // Submit Payment & Registration
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activePaper) return;
    const tierName =
      tier === "student"
        ? "Student Author ($150)"
        : tier === "industry"
        ? "Industry / Corporate ($500)"
        : "Regular Academic ($300)";

    await completeRegistration(activePaper.id, {
      tier: tierName,
      amountPaid: finalPrice,
      discountCode: discountCode || null,
      paidAt: new Date().toISOString()
    });

    checkIfJustFinalized(true, Boolean(activePaper.camera_ready_url));
  };

  const checkIfJustFinalized = (registered, cameraReady) => {
    if (registered && cameraReady) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // confetti fallback
      }
    }
  };

  // If author has NO accepted or finalized papers, render the conditional lock view
  if (eligiblePapers.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
            <Lock className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 mb-3">
            Author Portal • Screen 3 of 5 (Conditional Lock)
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Registration & Camera-Ready Submissions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            This screen is conditionally unlocked <strong>only for manuscripts with status = "accepted"</strong>. None of your current submissions are in the accepted state yet.
          </p>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-850 max-w-lg mx-auto rounded-xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              How to test this screen:
            </div>
            <p className="text-slate-500">
              1. You can sign in as an <strong>Organizer</strong> and accept one of your submitted papers on the Final Decision Dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isCameraReadyDone = Boolean(activePaper?.camera_ready_url);
  const isRegistrationDone = Boolean(activePaper?.registration_completed);
  const isFinalized = activePaper?.status === "finalized" || (isCameraReadyDone && isRegistrationDone);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 mb-2">
              Author Portal • Screen 3 of 5 (Conditional Unlock)
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Registration & Camera-Ready Upload
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Two independent actions required. Status transitions to <strong>"Finalized"</strong> only when BOTH actions are complete.
            </p>
          </div>

          {/* Paper Selector if multiple */}
          {eligiblePapers.length > 1 && (
            <div className="w-full md:w-72">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Select Accepted Paper
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {eligiblePapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.substring(0, 45)}... ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected Paper Highlight & Status Progress Bar */}
        {activePaper && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-850/70 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold">
                  Paper ID: {activePaper.id}
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activePaper.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">Current Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    isFinalized
                      ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  {isFinalized ? "Finalized" : "Accepted (Pending Completion)"}
                </span>
              </div>
            </div>

            {/* Progress steps (2 Requirements) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isCameraReadyDone
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    isCameraReadyDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isCameraReadyDone ? "✓" : "1"}
                </div>
                <div className="text-xs">
                  <div className="font-bold">Requirement 1: Camera-Ready PDF</div>
                  <div className="text-[11px] opacity-80">
                    {isCameraReadyDone ? "Uploaded & Verified" : "Pending Upload"}
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isRegistrationDone
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    isRegistrationDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isRegistrationDone ? "✓" : "2"}
                </div>
                <div className="text-xs">
                  <div className="font-bold">Requirement 2: Registration & Payment</div>
                  <div className="text-[11px] opacity-80">
                    {isRegistrationDone ? `Completed (${activePaper.registration_tier || "Paid"})` : "Pending Registration"}
                  </div>
                </div>
              </div>
            </div>

            {/* Finalized Banner */}
            {isFinalized && (
              <div className="mt-4 p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Both requirements fulfilled! Paper status is finalized and scheduled for presentation.
                </div>
                <button
                  onClick={() => onNavigateToScreen && onNavigateToScreen("schedule")}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  View My Presentation Schedule <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two Independent Action Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================================================== */}
        {/* ACTION 1: Camera-Ready File Upload */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Action 1: Camera-Ready PDF
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Upload final publisher-ready manuscript
                  </p>
                </div>
              </div>

              {isCameraReadyDone && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
              Your camera-ready manuscript must incorporate all reviewer feedback, adhere to IEEE/ACM proceedings format, and include author affiliations and grant acknowledgments.
            </p>

            {/* Current Camera-Ready File status */}
            {isCameraReadyDone ? (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Camera-Ready Uploaded
                  </span>
                  <a
                    href={activePaper.camera_ready_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    View File <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  Filename: {activePaper.camera_ready_name || `${activePaper.id}_camera_ready.pdf`}
                </p>
              </div>
            ) : null}

            {/* Upload Area */}
            <form onSubmit={handleUploadCameraReady} className="mt-4 space-y-3">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center hover:border-indigo-400 transition cursor-pointer">
                <input
                  type="file"
                  id="camera-ready-input"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setCameraReadyFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <label htmlFor="camera-ready-input" className="cursor-pointer block">
                  {cameraReadyFile ? (
                    <div>
                      <CheckCircle2 className="w-8 h-8 text-indigo-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cameraReadyFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(cameraReadyFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isCameraReadyDone ? "Click to upload revised camera-ready PDF" : "Choose camera-ready PDF"}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF format only, max 30MB</p>
                    </div>
                  )}
                </label>
              </div>

              {cameraReadyFile && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload Camera-Ready to Storage
                </button>
              )}
            </form>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            Stored securely in Cloud Storage: <code className="font-mono text-[10px]">/camera_ready/{activePaper?.conference_id}/...</code>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTION 2: Registration & Payment Form */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Action 2: Conference Registration & Fee
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Author registration & attendance tier
                  </p>
                </div>
              </div>

              {isRegistrationDone && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paid
                </span>
              )}
            </div>

            {isRegistrationDone ? (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Registration Active
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {activePaper.registration_tier || "Registered"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Presenter: {currentUser?.name} ({currentUser?.affiliation})
                </p>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3.5">
                {/* Tier Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Attendee Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "student", label: "Student", price: "$150" },
                      { id: "academic", label: "Academic", price: "$300" },
                      { id: "industry", label: "Industry", price: "$500" },
                    ].map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setTier(t.id)}
                        className={`p-2.5 text-center rounded-xl border text-xs transition ${
                          tier === t.id
                            ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="text-[10px] uppercase opacity-75">{t.label}</div>
                        <div className="text-sm font-extrabold">{t.price}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discount / Grant Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. EARLYBIRD or AUTHOR100"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs uppercase font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl"
                    >
                      Apply
                    </button>
                  </div>
                  {discountMsg && (
                    <p className={`text-[11px] mt-1 ${appliedDiscount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                      {discountMsg}
                    </p>
                  )}
                </div>

                {/* Simulated Payment details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Payment Simulation
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      Total: ${finalPrice} USD
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Complete Registration & Pay ${finalPrice}
                </button>
              </form>
            )}
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            Author registration guarantees inclusion in official conference proceedings and presentation schedule.
          </div>
        </div>

      </div>
    </div>
  );
};
