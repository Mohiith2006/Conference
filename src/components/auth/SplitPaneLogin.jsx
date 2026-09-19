import React, { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { isFirebaseConfigured } from "../../firebase/config";
import {
  ArrowRight,
  AlertCircle,
  Info,
  Building2,
  ShieldCheck,
  FileText
} from "lucide-react";

const PORTAL_PREVIEWS = [
  { id: "organizer", label: "Organizer", icon: Building2 },
  { id: "reviewer", label: "Reviewer", icon: ShieldCheck },
  { id: "author", label: "Author", icon: FileText }
];

export const SplitPaneLogin = () => {
  const { login, register, loginWithGoogle, authError, setAuthError } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  // Sign In portal preview - purely local, purely visual. Never read by
  // handleSubmit, never passed to login(), never sent anywhere. Its only
  // effect is which of the three cards below looks highlighted.
  const [previewPortal, setPreviewPortal] = useState("author");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);

    // Basic encouragement for academic emails
    if (isRegisterMode) {
      const emailLower = email.toLowerCase().trim();
      const hasAcademicDomain = emailLower.includes(".edu") ||
                                emailLower.includes(".ac.") ||
                                emailLower.includes(".univ") ||
                                emailLower.includes(".org");
      if (!hasAcademicDomain) {
        const proceed = window.confirm(
          "Notice: Academic institutions typically issue .edu or .ac.uk addresses. Would you like to proceed with this email address?"
        );
        if (!proceed) {
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setAuthError("Please provide your full name.");
          setSubmitting(false);
          return;
        }
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          affiliation: affiliation.trim()
        });
      } else {
        await login(email.trim(), password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-beige-50">
      
      {/* ========================================================= */}
      {/* LEFT PANE: Academic Conference Hall Visual */}
      {/* ========================================================= */}
      <div className="relative w-full md:w-1/2 min-h-[320px] md:min-h-screen bg-beige-900 flex flex-col justify-between p-8 md:p-14 overflow-hidden">
        {/* Conference Hall Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        {/* Warm Monochrome Sepia Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-beige-900 via-beige-900/80 to-beige-900/40" />

        {/* Brand Stamp Top */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-beige-300/40 flex items-center justify-center text-beige-100 font-serif text-sm">
              🏛
            </div>
            <span className="font-serif tracking-wide text-beige-100 font-bold text-lg">
              CONFERENCE MANAGEMENT SYSTEM
            </span>
          </div>
        </div>

        {/* Middle Typography */}
        <div className="relative z-10 my-auto py-10 max-w-md">
          <div className="inline-block border-l-2 border-beige-400/60 pl-3 mb-4">
            <span className="text-[11px] font-mono tracking-widest uppercase text-beige-300">
              Peer Review & Scholarly Dissemination
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-beige-100 leading-snug font-bold">
            Scholarly Academic Peer Review Workspace
          </h1>
          <p className="mt-4 text-xs md:text-sm text-beige-300/90 leading-relaxed font-sans">
            A unified conference management system governing blind evaluations, camera-ready finalization, and official proceedings.
          </p>
        </div>

        {/* Academic Footer Notice */}
        <div className="relative z-10 border-t border-beige-400/20 pt-4 text-[11px] text-beige-400/80 flex items-center justify-between">
          <span>Scholarly Conference Network</span>
          <span className="font-serif italic">Est. 2026</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANE: Monochromatic Beige Login / Dynamic Form     */}
      {/* ========================================================= */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-beige-50">
        <div className="w-full max-w-md bg-white border border-beige-200 p-8 md:p-10 shadow-sm rounded-sm">
          
          {/* Header Title */}
          <div className="mb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-500">
              Academic Portal Access
            </span>
            <h2 className="font-serif text-2xl text-ink-900 font-bold mt-1">
              {isRegisterMode ? "Register Academic Profile" : "Sign In to Portal"}
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              {isRegisterMode
                ? "Create your Author account to submit papers."
                : "Enter your registered credentials to access your designated workspace."}
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="flex border-b border-beige-200 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setAuthError(null);
              }}
              className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 mr-6 ${
                !isRegisterMode
                  ? "border-ink-900 text-ink-900 font-bold"
                  : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setAuthError(null);
              }}
              className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 ${
                isRegisterMode
                  ? "border-ink-900 text-ink-900 font-bold"
                  : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN PORTAL PREVIEW — Sign In tab only, purely cosmetic.
              previewPortal is local UI state read by nothing else on this
              page: it is never passed to login(), never included in any
              request, and has no bearing on which portal the user actually
              lands on after signing in - that is decided exclusively by the
              role already stored on their account (see AuthContext.jsx). This
              exists only so a visitor can see at a glance that three
              distinct portals exist before they sign in. */}
          {!isRegisterMode && (
            <div className="mb-5">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-ink-500 mb-2">
                Designated Portals:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PORTAL_PREVIEWS.map((portal) => {
                  const Icon = portal.icon;
                  const isSelected = previewPortal === portal.id;
                  return (
                    <button
                      key={portal.id}
                      type="button"
                      onClick={() => setPreviewPortal(portal.id)}
                      className={`p-2.5 text-center border rounded-sm transition-all text-xs flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "border-ink-900 bg-beige-100 text-ink-900 font-bold shadow-xs ring-1 ring-ink-900"
                          : "border-beige-200 bg-white text-ink-600 hover:bg-beige-50"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-ink-700" />
                      <span>{portal.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GOOGLE SIGN-IN FOR AUTHOR */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting}
              className="w-full py-2.5 px-4 text-xs font-serif font-semibold border border-beige-300 bg-beige-50 hover:bg-beige-100 text-ink-800 transition flex items-center justify-center gap-2 rounded-sm shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {googleSubmitting ? "Connecting to Google..." : "Continue with Google (Author Portal)"}
              </span>
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-beige-200"></div>
              </div>
              <span className="relative px-3 bg-white text-[10px] font-mono text-ink-400 uppercase tracking-widest">
                or with email & password
              </span>
            </div>
          </div>

          {/* Firebase Not Configured Banner */}
          {!isFirebaseConfigured && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">
                Firebase isn't configured yet. Add <code className="font-mono">VITE_FIREBASE_*</code> values to a <code className="font-mono">.env</code> file (see <code className="font-mono">.env.example</code>) and restart the dev server to sign in.
              </div>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 p-3 bg-terracotta-50 border border-terracotta-100 text-terracotta-800 rounded-sm text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Self-service signup is Author-only. Organizer/Reviewer accounts
                are provisioned by an existing organizer, never chosen here. */}
            {isRegisterMode && (
              <div className="p-3 bg-beige-100 border border-beige-300 rounded-sm flex items-start gap-2.5">
                <Info className="w-4 h-4 text-ink-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-600 leading-relaxed font-sans">
                  Organizer and Reviewer accounts are provisioned by an administrator — sign up here as an <strong className="text-ink-900">Author</strong> to submit papers.
                </p>
              </div>
            )}

            {/* Registration Name Field */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-serif font-semibold text-ink-800 mb-1">
                  Full Academic Name <span className="text-terracotta-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full px-3 py-2 text-xs rounded-sm border border-beige-300 bg-white text-ink-900 focus:outline-none focus:border-ink-800 transition"
                />
              </div>
            )}

            {/* Affiliation Field (registration only) */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-serif font-semibold text-ink-800 mb-1">
                  University / Department Affiliation <span className="text-terracotta-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. Dept. of Computer Science, MIT"
                  className="w-full px-3 py-2 text-xs rounded-sm border border-beige-300 bg-white text-ink-900 focus:outline-none focus:border-ink-800 transition"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-serif font-semibold text-ink-800 mb-1">
                {isRegisterMode ? "University Email Address" : "Email Address"} <span className="text-terracotta-700">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRegisterMode ? "author@university.edu" : "academic@university.edu"}
                className="w-full px-3 py-2 text-xs rounded-sm border border-beige-300 bg-white text-ink-900 focus:outline-none focus:border-ink-800 transition"
              />
              {isRegisterMode && (
                <p className="text-[10px] text-ink-500 mt-1">
                  Please provide your academic institution email address (.edu, .ac.uk, etc.)
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-serif font-semibold text-ink-800 mb-1">
                Password <span className="text-terracotta-700">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-sm border border-beige-300 bg-white text-ink-900 focus:outline-none focus:border-ink-800 transition"
              />
            </div>

            {/* Button-Level Loading State */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-2.5 px-4 rounded-sm text-xs font-serif font-bold uppercase tracking-wider bg-ink-900 hover:bg-ink-800 text-beige-50 transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <span>{isRegisterMode ? "Creating Account..." : "Signing In..."}</span>
              ) : isRegisterMode ? (
                <>
                  <span>Create Author Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Academic Footer Note */}
          <div className="mt-8 pt-4 border-t border-beige-200 text-center text-[11px] text-ink-500 space-y-1">
            <p>
              Conference Management System • Monochromatic Academic Edition
            </p>
            <p className="text-[10px] text-ink-400">
              Direct routing to designated portal upon verification.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
