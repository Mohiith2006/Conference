import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Branch 3: True Gemini LLM Integration Setup
 * Passes user prompt alongside structured context data (like paper statuses, role, conferences)
 * to generate dynamic, context-aware answers rather than relying solely on hardcoded keywords.
 *
 * @param {string} userMessage - The user's query or prompt
 * @param {object|string} contextData - Contextual data (e.g. stringified paper statuses, conferences, role)
 * @returns {Promise<string>} Dynamic AI generated response
 */
export const isGeminiConfigured = Boolean(import.meta.env?.VITE_GEMINI_API_KEY);

export const fetchGeminiResponse = async (userMessage, contextData = {}) => {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
  const stringifiedContext = typeof contextData === "string" ? contextData : JSON.stringify(contextData);

  const systemInstruction = `You are the ConfHub Academic Advisor, an intelligent assistant for a scholarly conference management and peer-review platform.
Context Information: ${stringifiedContext}
Provide helpful, professional, and concise academic guidance. Be direct, clear, and encouraging. Never invent false deadlines.`;

  if (apiKey) {
    try {
      // "gemini-flash-lite-latest" is Google's rolling alias for the current
      // lightweight Flash model - pinning to a dated model (e.g.
      // gemini-1.5-flash, confirmed 404/deprecated as of this writing) means
      // this silently breaks again whenever Google retires that version. The
      // lite tier is a deliberate choice, not just a fallback: this is a
      // short-answer academic FAQ assistant, not a reasoning-heavy workload,
      // and in testing it responded quickly and reliably while the full
      // "gemini-flash-latest" model was intermittently returning 503
      // "high demand" errors.
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      // A legitimate response can take 5-6s on its own during normal Gemini
      // load, which left very little headroom against the previous 6000ms
      // limit before this aborted a call that would have succeeded. 12s still
      // keeps the chatbot feeling responsive (the UI shows a loading state
      // throughout) while giving real requests room to complete before
      // falling back to the local rule-based answers.
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nUser Question: ${userMessage}` }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 300
          }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText && replyText.trim().length > 0) {
          return replyText.trim();
        }
      }
    } catch (err) {
      console.warn("Direct Gemini LLM call fallback to intelligent contextual answering:", err);
    }
  }

  // Graceful intelligent contextual answer if remote API is unreachable or times out
  const q = userMessage.toLowerCase();
  if (q.includes("review") || q.includes("reviewer") || q.includes("score")) {
    return "Peer reviews are conducted double-blind. Reviewers evaluate submissions on novelty, methodology, and relevance. You can check the feedback in Tab 2 (My Submissions) once evaluations are released.";
  }
  if (q.includes("deadline") || q.includes("due") || q.includes("extend")) {
    return "Conference deadlines are automatically validated by the system. You can view all published submission cutoffs on the Dashboard or in Tab 1 (Submit Paper).";
  }
  if (q.includes("format") || q.includes("template") || q.includes("page") || q.includes("guideline")) {
    return "Manuscripts must be submitted in standard academic 2-column PDF format (IEEE / ACM style recommended, up to 10 pages). Supplementary files or patents can be added in Tab 5.";
  }
  if (q.includes("help") || q.includes("guide") || q.includes("assist")) {
    return "I can assist you with exploring active conferences, tracking your submission status, accessing your presentation timetable, or completing registration.";
  }

  return "I am your ConfHub Advisor. I can help with active conferences, submission guidelines, review timelines, registration, or your assigned presentation schedule.";
};

/**
 * Main conversational dispatcher supporting the 3 distinct conversational branches:
 * - Branch 1: Greetings & General FAQs ("hi", "hello", "what is this", "about")
 * - Branch 2: Database Data Queries ("active conferences", "my submissions", "my schedule")
 * - Branch 3: True LLM Integration Setup (Gemini API with stringified context)
 *
 * @param {string} userMessage - The raw text entered by the user
 * @param {object|null} currentUser - The authenticated user object (has uid)
 * @param {object|null} userProfile - The user's profile doc
 * @param {Array} chatHistory - Previous message objects
 * @returns {Promise<string>} The response text to display in chat
 */
export const askGeminiAssistant = async (userMessage, currentUser = null, userProfile = null, chatHistory = []) => {
  if (!userMessage || typeof userMessage !== "string") {
    return "Please enter a valid question or inquiry.";
  }

  const trimmed = userMessage.trim();
  const q = trimmed.toLowerCase();

  // =========================================================================
  // BRANCH 1: GREETINGS & GENERAL FAQS
  // =========================================================================
  // If input includes "hi", "hello", "hey"
  if (
    /\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i.test(trimmed) ||
    q === "hi" ||
    q === "hello" ||
    q === "hey"
  ) {
    return "Hello! I am your ConfHub Advisor. How can I assist you with your submissions or conferences today?";
  }

  // If input includes "what is this", "about"
  if (
    q.includes("what is this") ||
    q.includes("about")
  ) {
    const isDataQuery = q.includes("conference") || q.includes("paper") || q.includes("submission") || q.includes("schedule");
    if (!isDataQuery) {
      return "This is a scholarly peer-review and session administration platform. You can use it to submit manuscripts, track peer reviews, and manage conference registrations.";
    }
  }

  // =========================================================================
  // BRANCH 2: LIVE DATABASE DATA QUERIES
  // =========================================================================
  // 1. Active Conferences Query
  if (
    q.includes("active conference") ||
    q.includes("active conferences") ||
    q.includes("list conference") ||
    q.includes("list conferences") ||
    q.includes("what are the conference") ||
    q.includes("what are the conferences") ||
    q.includes("available conference") ||
    q.includes("available conferences") ||
    q.includes("show conference") ||
    q.includes("show conferences") ||
    q.includes("all conference") ||
    q.includes("all conferences") ||
    q === "conferences" ||
    q.includes("published conference") ||
    q.includes("open conference")
  ) {
    try {
      if (!db) {
        return "Database is currently offline. Please try again later.";
      }

      const confsRef = collection(db, "conferences");
      const confQuery = query(confsRef, where("status", "==", "published"));
      const snapshot = await getDocs(confQuery);

      if (snapshot.empty) {
        return "There are currently no active published conferences in the system. When an Organizer creates and publishes a conference, it will appear here.";
      }

      const confs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const formattedList = confs.map((c, idx) => {
        const deadline = c.submission_deadline
          ? new Date(c.submission_deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })
          : "TBD";
        return `${idx + 1}. ${c.title} (Deadline: ${deadline})`;
      }).join("\n");

      return `Here are the active conferences:\n${formattedList}`;
    } catch (err) {
      console.error("Database error querying active conferences:", err);
      return "I encountered an error retrieving active conferences. Please try again in a moment.";
    }
  }

  // 2. User-Specific Paper Status & Submissions Query
  if (
    q.includes("what is my paper status") ||
    q.includes("my paper status") ||
    q.includes("my submission") ||
    q.includes("my submissions") ||
    q.includes("paper status") ||
    q.includes("my papers") ||
    q.includes("my paper") ||
    q === "submissions" ||
    q.includes("status of my paper") ||
    q.includes("submission status")
  ) {
    if (!currentUser?.uid) {
      return "Please sign in to view your paper status and submissions.";
    }

    try {
      if (!db) {
        return "Database is currently offline.";
      }

      const papersRef = collection(db, "papers");
      const paperQuery = query(papersRef, where("author_id", "==", currentUser.uid));
      const snapshot = await getDocs(paperQuery);

      if (snapshot.empty) {
        return "You currently have no paper submissions on record under this account. You can submit a manuscript in Tab 1 (Submit Paper).";
      }

      const papers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const formattedList = papers.map((p, idx) => {
        const statusLabel = (p.status || "submitted").replace(/_/g, " ").toUpperCase();
        return `${idx + 1}. ${p.title} - Status: ${statusLabel} (v${p.version || 1}, Track: ${p.track || "General"})`;
      }).join("\n");

      return `Here are your paper submissions:\n${formattedList}`;
    } catch (err) {
      console.error("Database error querying papers for chatbot:", err);
      return "I encountered an error retrieving your paper submissions. Please try again.";
    }
  }

  // 3. User Presentation Schedule Query
  if (
    q.includes("my schedule") ||
    q.includes("schedule") ||
    q.includes("presentation time") ||
    q.includes("when do i present") ||
    q.includes("timetable") ||
    q.includes("presentation slot") ||
    q.includes("what room") ||
    q.includes("assigned room")
  ) {
    if (!currentUser?.uid) {
      return "Please sign in to check your presentation schedule.";
    }

    try {
      if (!db) {
        return "Database is currently offline.";
      }

      const papersRef = collection(db, "papers");
      const paperQuery = query(papersRef, where("author_id", "==", currentUser.uid));
      const snapshot = await getDocs(paperQuery);

      const scheduledPapers = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.schedule);

      if (scheduledPapers.length === 0) {
        return "You don't have any scheduled presentation slots yet. Papers receive a room and time timetable once both Camera-Ready and Registration are completed (status: finalized).";
      }

      const formatted = scheduledPapers.map((p, idx) => {
        return `${idx + 1}. ${p.title}\n   • Room: ${p.schedule.room} | Time: ${p.schedule.time} (${p.schedule.date}) | Track: ${p.schedule.track || p.track}`;
      }).join("\n");

      return `Here is your scheduled presentation timetable:\n${formatted}`;
    } catch (err) {
      console.error("Error querying schedule:", err);
    }
  }

  // 4. Certificates & Registration Inquiries
  if (q.includes("certificate") || q.includes("cert") || q.includes("when can i download")) {
    return "Official presentation certificates unlock strictly after a conference's end_date has passed. If your paper was accepted in a concluded conference, you can generate and download your official PDF certificate from Tab 5 (Certificates & Documents).";
  }

  if (q.includes("camera ready") || q.includes("camera-ready") || q.includes("registration fee") || q.includes("how to finalize")) {
    return "In Tab 3 (Registration & Camera-Ready), two independent actions are required: 1) Upload your revised camera-ready PDF manuscript, and 2) Complete the registration fee payment. Your paper status updates to 'Finalized' only when both actions are complete.";
  }

  // =========================================================================
  // BRANCH 3: TRUE LLM INTEGRATION (GEMINI) WITH CONTEXT
  // Gathers real-time context and passes to fetchGeminiResponse
  // =========================================================================
  const contextData = {
    userId: currentUser?.uid || "anonymous",
    userName: userProfile?.name || "Academic User",
    userRole: userProfile?.role || "Author"
  };

  try {
    if (db && currentUser?.uid) {
      const pSnap = await getDocs(query(collection(db, "papers"), where("author_id", "==", currentUser.uid)));
      contextData.totalSubmissions = pSnap.size;
      contextData.paperStatuses = pSnap.docs.map((d) => ({
        title: d.data().title,
        status: d.data().status,
        has_camera_ready: Boolean(d.data().camera_ready_url),
        registered: Boolean(d.data().registration_completed)
      }));
    }
  } catch (e) {
    // Non-blocking
  }

  return await fetchGeminiResponse(userMessage, contextData);
};
