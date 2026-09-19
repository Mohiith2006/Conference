import { getStoredConferences, getStoredPapers, getStoredReviews, getStoredUsers } from "./firebaseService.js";
import { INITIAL_CONFERENCES } from "../mock/initialData.js";

/**
 * ConfHub Academic AI Service
 * Supports dual-engine intelligence:
 * 1. Live Google Gemini LLM (1.5 Flash / 2.0 Flash) when an API key is available
 * 2. ConfHub Intelligent Academic Reasoning Engine (Built-in offline/local AI) that knows
 *    100% of the platform: live conferences, papers, reviews, rubrics, schedules, and policies.
 */

// Key management
export const getGeminiApiKey = () => {
  try {
    const userCustomKey = localStorage.getItem("confhub_gemini_api_key");
    if (userCustomKey && userCustomKey.trim().length > 0) {
      return userCustomKey.trim();
    }
  } catch {}
  return import.meta.env?.VITE_GEMINI_API_KEY || "";
};

export const setGeminiApiKey = (key) => {
  try {
    if (key && key.trim()) {
      localStorage.setItem("confhub_gemini_api_key", key.trim());
    } else {
      localStorage.removeItem("confhub_gemini_api_key");
    }
    return true;
  } catch {
    return false;
  }
};

export const isGeminiConfigured = () => {
  return Boolean(getGeminiApiKey());
};

/**
 * Gathers complete real-time platform data for the AI context.
 */
export const getPlatformContext = (currentUser = null, userProfile = null) => {
  try {
    let confs = getStoredConferences();
    if (!confs || !confs.length) confs = INITIAL_CONFERENCES;
    const publishedConfs = confs.filter((c) => c.status === "published");

    const allPapers = getStoredPapers();
    const allReviews = getStoredReviews();

    let userPapers = [];
    if (currentUser?.uid) {
      const uid = currentUser.uid;
      const email = userProfile?.email || currentUser.email || "";
      userPapers = allPapers.filter(
        (p) =>
          p.author_id === uid ||
          (email && p.author_email && p.author_email.toLowerCase() === email.toLowerCase())
      );
    }

    return {
      currentUser: currentUser
        ? {
            uid: currentUser.uid,
            name: userProfile?.name || currentUser.displayName || "Academic Author",
            email: userProfile?.email || currentUser.email || "",
            role: userProfile?.role || "author"
          }
        : null,
      publishedConferences: publishedConfs.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        tracks: c.tracks,
        location: c.location,
        submission_deadline: c.submission_deadline,
        review_deadline: c.review_deadline,
        end_date: c.end_date
      })),
      userPapers: userPapers.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        version: p.version || 1,
        conference_id: p.conference_id,
        track: p.track,
        camera_ready_url: p.camera_ready_url || null,
        registration_completed: Boolean(p.registration_completed),
        schedule: p.schedule || null
      })),
      totalPlatformPapers: allPapers.length,
      totalPlatformReviews: allReviews.length
    };
  } catch (err) {
    console.warn("Context gathering error:", err);
    return {
      publishedConferences: INITIAL_CONFERENCES.filter((c) => c.status === "published"),
      userPapers: []
    };
  }
};

/**
 * Queries the live Google Gemini API with fallback across model versions
 */
export const fetchGeminiResponse = async (userMessage, contextData = {}, chatHistory = []) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const stringifiedContext =
    typeof contextData === "string" ? contextData : JSON.stringify(contextData, null, 2);

  const systemInstruction = `You are the ConfHub Academic Advisor, the official scholarly assistant for the ConfHub academic conference management and peer-review platform.
ConfHub has three portals: Author Portal (Submit Paper, My Submissions, Registration & Camera-Ready, My Schedule, Certificates & Documents), Reviewer Portal (Assigned Manuscripts, Review History), and Organizer Portal (Conference Management, Decision Dashboard, Program Scheduling with Conflict Detection, User Management).

Platform Live Data Context:
${stringifiedContext}

Instructions:
1. Provide accurate, professional, authoritative, and helpful answers.
2. If the user asks about active conferences, deadlines, paper statuses, presentation schedules, or registration, use the real platform context data provided above.
3. If they ask about paper formatting: IEEE / ACM 2-column format, up to 10 pages, PDF only, double-blind anonymized.
4. If they ask about peer review: 4 dimensions (Novelty 1-5, Methodology 1-5, Technical Quality 1-5, Relevance 1-5), double-blind evaluation.
5. If they ask about camera-ready / finalizing: both Camera-Ready PDF upload and registration fee payment ($150 Student, $300 Academic, $500 Industry) are required before status becomes "Finalized".
6. If they ask about scheduling: automated conflict detection ensures no room double-booking and no presenter concurrency.
7. If they ask about certificates: available strictly after the conference end_date has passed in Tab 5.
8. Use clean markdown (bold, bullet points, numbered lists) for clarity. Keep answers concise and direct.`;

  // Model cascade: try gemini-1.5-flash first, then gemini-2.0-flash, then gemini-flash-lite-latest
  const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"];

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      // Build recent turns from chatHistory (last 4 messages)
      const recentHistory = (chatHistory || [])
        .slice(-4)
        .filter((m) => m && m.text && m.sender)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }]
        }));

      const contents = [
        ...recentHistory,
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\nCurrent User Question: ${userMessage}`
            }
          ]
        }
      ];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
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
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Gemini model ${model} returned error status ${response.status}:`, errorData);
      }
    } catch (err) {
      console.warn(`Gemini API call to ${model} failed or timed out:`, err.message);
    }
  }

  return null; // Signals fallback to Built-in Academic Reasoning Engine
};

/**
 * Built-in ConfHub Academic Knowledge & Reasoning Engine
 * Handles 100% of academic conference workflow queries with precise, structured,
 * and reliable answers reading live platform storage data.
 */
export const generateAcademicEngineResponse = (userMessage, currentUser, userProfile) => {
  const trimmed = userMessage ? userMessage.trim() : "";
  const q = trimmed.toLowerCase();

  const platformContext = getPlatformContext(currentUser, userProfile);
  const { publishedConferences, userPapers } = platformContext;

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // =========================================================================
  // 1. GREETINGS, CAPABILITIES & IDENTITY
  // =========================================================================
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo)\b/i.test(trimmed)) {
    const userName = userProfile?.name || (currentUser ? "Scholar" : "");
    const greeting = userName ? `Hello ${userName}!` : "Hello!";
    return `${greeting} I am your **ConfHub Academic Advisor**.

I can answer any questions about:
• **Active Conferences**: Browse events, locations, deadlines, and tracks
• **Submissions & Guidelines**: Formatting rules (IEEE/ACM), page limits, anonymization
• **Paper Statuses**: Track your submissions through peer review and decisions
• **Review Rubric**: 4-dimension scoring, double-blind rules, recommendations
• **Registration & Camera-Ready**: Finalizing accepted papers, fee tiers ($150-$500)
• **Program Scheduling**: Timetables, room allocations, and conflict detection
• **Certificates**: Post-conference PDF certificate downloads

How can I assist your academic work today?`;
  }

  if (
    q.includes("who are you") ||
    q.includes("what are you") ||
    q.includes("what can you do") ||
    q.includes("help me") ||
    q === "help"
  ) {
    return `I am the **ConfHub Academic Advisor**, an AI assistant designed to guide authors, reviewers, and conference organizers through every phase of scholarly publishing.

**What I Can Do:**
1. 🏛 **Conferences**: Provide details on active conferences, tracks, and submission deadlines.
2. 📄 **Submissions**: Guide you through submitting manuscripts (Tab 1) or editing revisions (Tab 2).
3. 🔍 **Status Tracking**: Check real-time statuses of your submitted papers.
4. ⭐ **Peer Review**: Explain the 4-dimension evaluation rubric and double-blind rules.
5. 💳 **Registration**: Detail camera-ready requirements and registration tiers ($150 / $300 / $500).
6. 📅 **Scheduling**: Lookup your presentation timetable or explain conflict-free session planning.
7. 📜 **Certificates**: Explain presentation certificate generation (Tab 5).

Feel free to ask any specific question or click one of the quick topic chips below!`;
  }

  if (
    q.includes("what is confhub") ||
    q.includes("about confhub") ||
    q.includes("what is this platform") ||
    q.includes("what is this website")
  ) {
    return `**ConfHub** is an academic conference management and peer-review platform.

It streamlines the complete lifecycle of scholarly gatherings:
• **Authors**: Submit research papers, track double-blind reviews, upload camera-ready manuscripts, and access presentation timetables.
• **Reviewers**: Evaluate assigned submissions across a structured 4-dimension rubric with confidential feedback.
• **Organizers**: Create and publish conferences, assign reviewers, make final acceptance decisions, and build conflict-free program schedules.`;
  }

  // =========================================================================
  // 2. SPECIFIC CONFERENCE INQUIRIES
  // =========================================================================
  // Look for conference acronyms or keywords
  const matchedConf = publishedConferences.find((c) => {
    const titleLower = c.title.toLowerCase();
    const idLower = c.id.toLowerCase();
    if (q.includes("gaisc") && (titleLower.includes("gaisc") || idLower.includes("gaisc"))) return true;
    if (q.includes("icss") && (titleLower.includes("icss") || idLower.includes("icss"))) return true;
    if ((q.includes("future computing") || q.includes("acm fc") || q.includes("acmfc")) && (titleLower.includes("future computing") || titleLower.includes("fc"))) return true;
    if (q.includes("ai") && q.includes("systems") && titleLower.includes("ai")) return true;
    if (q.includes("cyber security") && titleLower.includes("cyber")) return true;
    return false;
  });

  if (matchedConf) {
    const isPast = new Date(matchedConf.end_date) < new Date();
    return `### 🏛 ${matchedConf.title}

• **Description**: ${matchedConf.description}
• **Location**: ${matchedConf.location || "Hybrid / Virtual"}
• **Submission Deadline**: **${formatDate(matchedConf.submission_deadline)}**
• **Review Notification**: ${formatDate(matchedConf.review_deadline)}
• **Conference Dates**: Concludes ${formatDate(matchedConf.end_date)} ${isPast ? "*(Concluded)*" : "*(Upcoming)*"}
• **Available Tracks**:
${matchedConf.tracks.map((t) => `  - ${t}`).join("\n")}

**Actionable Next Step**: To submit a manuscript to this conference, navigate to **Tab 1 (Submit Paper)** in the Author Portal.`;
  }

  // =========================================================================
  // 3. ACTIVE CONFERENCES CATALOG
  // =========================================================================
  if (
    q.includes("active conference") ||
    q.includes("active conferences") ||
    q.includes("list conference") ||
    q.includes("list conferences") ||
    q.includes("available conference") ||
    q.includes("available conferences") ||
    q.includes("what conferences") ||
    q.includes("show conferences") ||
    q.includes("all conferences") ||
    q.includes("upcoming conference") ||
    q.includes("upcoming conferences") ||
    q === "conferences" ||
    q.includes("open conferences") ||
    q.includes("conference list")
  ) {
    if (!publishedConferences || publishedConferences.length === 0) {
      return "There are currently no active published conferences in the system. Organizers can create and publish new events via the Organizer Portal.";
    }

    const confList = publishedConferences
      .map((c, idx) => {
        const isPast = new Date(c.end_date) < new Date();
        const deadline = formatDate(c.submission_deadline);
        const location = c.location ? ` | 📍 ${c.location}` : "";
        const tracks = c.tracks?.length ? `\n   *Tracks: ${c.tracks.slice(0, 3).join(", ")}${c.tracks.length > 3 ? "..." : ""}*` : "";
        return `**${idx + 1}. ${c.title}**${location}
   • Submission Deadline: **${deadline}**
   • Conference Dates: Ends ${formatDate(c.end_date)} ${isPast ? "*(Concluded)*" : "*(Open)*"}${tracks}`;
      })
      .join("\n\n");

    return `Here are the currently published active conferences on ConfHub:\n\n${confList}\n\n💡 *Tip: To submit a paper to any of these conferences, navigate to **Tab 1 (Submit Paper)**.*`;
  }

  // =========================================================================
  // 4. DEADLINES & IMPORTANT DATES
  // =========================================================================
  if (
    q.includes("deadline") ||
    q.includes("due date") ||
    q.includes("cutoff") ||
    q.includes("when to submit") ||
    q.includes("is there an extension") ||
    q.includes("important dates") ||
    q.includes("when is the deadline")
  ) {
    if (!publishedConferences.length) {
      return "No conference deadlines are currently scheduled.";
    }

    const deadlineList = publishedConferences
      .map((c) => {
        const subDate = new Date(c.submission_deadline);
        const isOpen = subDate > new Date();
        const statusStr = isOpen ? "🟢 **Open for Submissions**" : "🔴 **Submissions Closed**";
        return `• **${c.title}**
  - Submission Cutoff: **${formatDate(c.submission_deadline)}** (${statusStr})
  - Review Results: **${formatDate(c.review_deadline)}**
  - Event Conclusion: **${formatDate(c.end_date)}**`;
      })
      .join("\n\n");

    return `### 📅 Conference Deadlines & Key Milestones\n\n${deadlineList}\n\n*Note: ConfHub automatically validates submission deadlines. Submissions received before the cutoff are routed directly to double-blind peer review.*`;
  }

  // =========================================================================
  // 5. USER'S PAPER STATUSES & SUBMISSIONS
  // =========================================================================
  if (
    q.includes("my paper status") ||
    q.includes("my paper") ||
    q.includes("my papers") ||
    q.includes("my submission") ||
    q.includes("my submissions") ||
    q.includes("check my paper") ||
    q.includes("did i submit") ||
    q.includes("submission status") ||
    q.includes("status of my paper") ||
    q === "submissions"
  ) {
    if (!currentUser?.uid) {
      return `Please **sign in** to your account to view your personal paper submissions.

Once signed in, you can monitor your manuscript's real-time review progress in **Tab 2 (My Submissions)**.`;
    }

    if (!userPapers || userPapers.length === 0) {
      return `You currently have **0 active submissions** under account **${userProfile?.email || currentUser.email || "current user"}**.

To submit your first manuscript:
1. Go to **Tab 1 (Submit Paper)**
2. Choose your target conference and track
3. Upload your IEEE/ACM formatted PDF manuscript (up to 10 pages)
4. Click **Submit Manuscript**`;
    }

    const papersSummary = userPapers
      .map((p, idx) => {
        const statusLabel = (p.status || "submitted").toUpperCase().replace(/_/g, " ");
        let statusBadge = `🏷 **Status**: \`${statusLabel}\``;
        if (p.status === "accepted") statusBadge += " 🎉 *(Accepted! Proceed to Tab 3 for Camera-Ready & Registration)*";
        if (p.status === "finalized") statusBadge += " ✅ *(Finalized - Ready for Presentation)*";
        if (p.status === "under_review") statusBadge += " ⏳ *(Under Double-Blind Peer Review)*";

        const versionStr = `v${p.version || 1}`;
        const cameraStr = p.camera_ready_url ? "✅ Uploaded" : "⏳ Pending";
        const regStr = p.registration_completed ? "✅ Paid" : "⏳ Pending";

        let scheduleInfo = "";
        if (p.schedule) {
          scheduleInfo = `\n   • 📅 **Schedule**: Room ${p.schedule.room} | ${p.schedule.time} (${p.schedule.date})`;
        }

        return `**${idx + 1}. ${p.title}** (${versionStr})
   • ${statusBadge}
   • Track: ${p.track || "General"}
   • Camera-Ready: ${cameraStr} | Registration: ${regStr}${scheduleInfo}`;
      })
      .join("\n\n");

    return `### 📄 Your Paper Submissions (${userPapers.length})\n\n${papersSummary}\n\n💡 *Manage your revisions or view detailed reviewer feedback in **Tab 2 (My Submissions)**.*`;
  }

  // =========================================================================
  // 6. PAPER LIFECYCLE & STATUS DEFINITIONS
  // =========================================================================
  if (
    q.includes("under review") ||
    q.includes("what does finalized mean") ||
    q.includes("what does accepted mean") ||
    q.includes("lifecycle") ||
    q.includes("state machine") ||
    q.includes("paper statuses")
  ) {
    return `### 🔄 Manuscript Lifecycle States in ConfHub

1. **Submitted**: The initial manuscript draft has been safely received and stored. It is queued for reviewer allocation.
2. **Under Review**: Assigned to peer reviewers who evaluate the work double-blind across 4 dimensions.
3. **Accepted / Rejected**: Reviewers have completed scoring; the Program Chair has released the official decision.
4. **Camera-Ready & Registered**: For accepted papers, the author uploads the unblinded camera-ready PDF and pays the registration fee.
5. **Finalized**: Both camera-ready manuscript and registration payment are verified. The paper is automatically eligible for room/session scheduling!`;
  }

  // =========================================================================
  // 7. SUBMISSION GUIDELINES & FORMATTING RULES
  // =========================================================================
  if (
    q.includes("how to submit") ||
    q.includes("submission guideline") ||
    q.includes("submission guidelines") ||
    q.includes("submission process") ||
    q.includes("how do i submit") ||
    q.includes("steps to submit")
  ) {
    return `### 📝 How to Submit a Paper on ConfHub

Follow these 4 simple steps:
1. **Navigate to Tab 1 (Submit Paper)** in your Author Portal.
2. **Select Target Conference & Track**: Choose the relevant event and topic.
3. **Enter Paper Details**:
   - Manuscript Title
   - Structured Abstract (150–250 words)
   - Author & Co-Author affiliations
4. **Upload PDF**: Standard 2-column format (IEEE/ACM, max 10 pages). Double-blind anonymization is required for initial submission.
5. **Submit**: Click **Submit Manuscript**. You will receive an instant confirmation and version tag (v1).`;
  }

  if (
    q.includes("format") ||
    q.includes("template") ||
    q.includes("page limit") ||
    q.includes("pages") ||
    q.includes("latex") ||
    q.includes("ieee") ||
    q.includes("acm") ||
    q.includes("font") ||
    q.includes("word limit") ||
    q.includes("pdf")
  ) {
    return `### 📐 Manuscript Formatting & Style Requirements

• **Format**: Standard IEEE or ACM two-column conference format.
• **Page Limit**: Maximum **10 pages** (including all figures, tables, proofs, and references).
• **File Type**: Strictly **PDF** format (embedded fonts required).
• **Double-Blind Anonymization**:
  - Initial review manuscripts must **NOT** contain author names, affiliations, email addresses, or acknowledgments.
  - Refer to your prior work in the third person (e.g. *"Smith et al. previously demonstrated..."* rather than *"In our prior work..."*).
• **Camera-Ready Exceptions**: Only upon final acceptance (Tab 3) should author names and affiliations be restored.`;
  }

  // =========================================================================
  // 8. EDITING, REVISIONS & WITHDRAWALS
  // =========================================================================
  if (
    q.includes("edit paper") ||
    q.includes("update paper") ||
    q.includes("revision") ||
    q.includes("new version") ||
    q.includes("v2") ||
    q.includes("can i edit") ||
    q.includes("modify submission")
  ) {
    return `### ✏️ Editing Submissions & Versioning

**Yes, you can edit your submission before the deadline!**
1. Open **Tab 2 (My Submissions)**.
2. Click on your manuscript to view its details.
3. Use the **Upload Revision** tool to submit an updated PDF or modify metadata.
4. The system automatically preserves history and increments the version counter (**v1 → v2**).

*Note: Once the conference submission deadline passes, editing is locked to ensure reviewers evaluate a stable version.*`;
  }

  if (q.includes("withdraw") || q.includes("cancel submission") || q.includes("delete paper")) {
    return `### 🚫 Withdrawing a Manuscript

• Authors can withdraw their submission prior to final acceptance by selecting **Withdraw** in **Tab 2 (My Submissions)**.
• Withdrawing removes the paper from the active peer-review pool.
• If you need to retract a paper after acceptance, please reach out to the conference Program Chair directly.`;
  }

  // =========================================================================
  // 9. PEER REVIEW PROCESS & SCORING RUBRIC
  // =========================================================================
  if (
    q.includes("rubric") ||
    q.includes("scoring") ||
    q.includes("how are papers evaluated") ||
    q.includes("criteria") ||
    q.includes("score") ||
    q.includes("review criteria")
  ) {
    return `### ⭐ ConfHub 4-Dimension Peer-Review Rubric

Reviewers evaluate manuscripts on a standardized **1 to 5 numeric scale** (1: Poor, 2: Below Average, 3: Acceptable, 4: Good, 5: Outstanding):

1. **Novelty & Originality (1–5)**:
   Does the paper present unique concepts, algorithms, architectures, or empirical findings that push the boundary of the field?
2. **Methodological Rigor (1–5)**:
   Are the experimental designs, statistical tests, mathematical proofs, and baseline comparisons sound and reproducible?
3. **Technical Quality (1–5)**:
   Is the implementation solid? Are benchmarks realistic, and are limitations honestly acknowledged?
4. **Relevance & Impact (1–5)**:
   Does the submission align with the conference track and deliver meaningful value to the research community?

**Recommendations**:
Reviewers submit an overall recommendation (*Strong Accept, Accept, Weak Accept, Borderline, Weak Reject, Strong Reject*), accompanied by detailed constructive feedback for authors and confidential remarks for the Program Committee.`;
  }

  if (
    q.includes("double blind") ||
    q.includes("peer review") ||
    q.includes("who reviews") ||
    q.includes("can reviewers see") ||
    q.includes("reviewer names")
  ) {
    return `### 🛡️ Double-Blind Peer Review Protocol

ConfHub strictly enforces double-blind evaluation:
• **Authors** do not see the names or affiliations of the reviewers evaluating their work.
• **Reviewers** do not see author names, university affiliations, or email addresses.

This guarantees unbiased evaluations based solely on scientific merit and technical quality. Review feedback is released to authors in **Tab 2 (My Submissions)** once the Program Committee finalizes decisions.`;
  }

  // =========================================================================
  // 10. CAMERA-READY FINALIZATION & REGISTRATION FEES
  // =========================================================================
  if (
    q.includes("camera ready") ||
    q.includes("camera-ready") ||
    q.includes("how to finalize") ||
    q.includes("finalizing paper")
  ) {
    return `### 🚀 Finalizing Accepted Manuscripts (Tab 3)

For an accepted paper to transition to **Finalized**, authors must complete two independent requirements in **Tab 3 (Registration & Camera-Ready)**:

1. **Upload Camera-Ready PDF**:
   - Re-insert author names, affiliations, and final acknowledgments.
   - Address reviewer feedback and formatting suggestions.
   - Adhere strictly to the 10-page IEEE/ACM limit.
2. **Complete Conference Registration**:
   - Select your attendee tier (Student $150, Academic $300, Industry $500).
   - Complete fee payment.

Once **both** the camera-ready manuscript is uploaded and registration is paid, your paper status updates to **Finalized** and becomes eligible for program session scheduling!`;
  }

  if (
    q.includes("fee") ||
    q.includes("fees") ||
    q.includes("registration cost") ||
    q.includes("how much is registration") ||
    q.includes("pricing") ||
    q.includes("student discount") ||
    q.includes("registration tier") ||
    q.includes("cost")
  ) {
    return `### 💳 ConfHub Conference Registration Tiers

Conference registration covers full session access, proceedings publication, and presentation certificates:

• **Student Registration**: **$150**
  *(Requires valid university student enrollment verification)*
• **Academic / Author Registration**: **$300**
  *(For university faculty, postdocs, and institutional researchers)*
• **Industry / Professional Registration**: **$500**
  *(For corporate practitioners, industrial labs, and commercial delegates)*

Registration payments are processed directly in **Tab 3 (Registration & Camera-Ready)**.`;
  }

  // =========================================================================
  // 11. PROGRAM SCHEDULING & CONFLICT DETECTION
  // =========================================================================
  if (
    q.includes("my schedule") ||
    q.includes("presentation time") ||
    q.includes("when do i present") ||
    q.includes("presentation slot") ||
    q.includes("assigned room") ||
    q.includes("timetable")
  ) {
    if (!currentUser?.uid) {
      return "Please sign in to check your presentation schedule.";
    }

    const scheduled = userPapers.filter((p) => p.schedule);

    if (scheduled.length > 0) {
      const scheduleLines = scheduled
        .map(
          (p, idx) =>
            `**${idx + 1}. ${p.title}**
   • 🏛 **Room**: ${p.schedule.room}
   • ⏰ **Time**: ${p.schedule.time}
   • 📅 **Date**: ${p.schedule.date}
   • 🏷 **Track**: ${p.schedule.track || p.track || "General Track"}`
        )
        .join("\n\n");

      return `### 📅 Your Confirmed Presentation Timetable\n\n${scheduleLines}\n\n💡 *View full session details and presentation slides in **Tab 4 (My Schedule)**.*`;
    }

    return `You do not have any scheduled presentation slots yet.

**How to get scheduled:**
1. Your paper must be **Accepted** by reviewers.
2. Complete both **Camera-Ready PDF upload** and **Registration payment** in Tab 3 (status becomes **Finalized**).
3. The conference organizer will then assign your paper to a room and time slot via the Program Scheduling dashboard.`;
  }

  if (
    q.includes("conflict detection") ||
    q.includes("conflict") ||
    q.includes("double booking") ||
    q.includes("speaker conflict") ||
    q.includes("room conflict") ||
    q.includes("scheduling logic") ||
    q.includes("program scheduling") ||
    q.includes("how does scheduling work")
  ) {
    return `### 🛡️ Program Scheduling & Conflict Detection

ConfHub includes an intelligent **Program Scheduling** engine in the Organizer Portal with real-time automated conflict validation:

• **Session Time Slots**:
  - Morning Keynote (09:00 – 10:30)
  - Technical Session A (11:00 – 12:30)
  - Afternoon Session (14:00 – 15:30)
  - Late Technical Session (16:00 – 17:30)

• **Conflict Detection Rules**:
  1. **Room Concurrency Validation**: Prevents any room from being double-booked by two sessions or papers at the same date and time slot.
  2. **Speaker Concurrency Validation**: Prevents any author or speaker from being scheduled to present in two separate rooms simultaneously.

When an Organizer saves a session, ConfHub validates the timetable against all existing bookings to prevent overlaps.`;
  }

  // =========================================================================
  // 12. CERTIFICATES & PROCEEDINGS
  // =========================================================================
  if (
    q.includes("certificate") ||
    q.includes("cert") ||
    q.includes("download cert") ||
    q.includes("when can i download") ||
    q.includes("attendance certificate") ||
    q.includes("presentation certificate")
  ) {
    return `### 📜 Presentation & Attendance Certificates (Tab 5)

• **Unlock Condition**: Official certificates unlock **strictly after the conference end date has passed**.
• **Verification**: Generated PDF certificates feature the official conference seal, paper title, author name, track, and date.
• **How to Download**:
  1. Navigate to **Tab 5 (Certificates & Documents)**.
  2. If the conference has ended and your paper was accepted/presented, click **Generate & Download PDF Certificate**.
  3. The PDF downloads directly to your device.

*(Example: For ACM Future Computing Conference FC 2025 whose end date has elapsed, certificate generation is immediately unlocked in Tab 5!)*`;
  }

  if (q.includes("proceedings") || q.includes("publication") || q.includes("document library") || q.includes("patent")) {
    return `### 📚 Conference Proceedings & Document Library

• **Official Proceedings**: All finalized camera-ready papers are collated into the conference proceedings catalog.
• **Document Library (Tab 5)**: Authors and attendees can view conference proceedings, download supplementary materials, and upload patent filings or research artifacts.`;
  }

  // =========================================================================
  // 13. ROLES & PERMISSIONS
  // =========================================================================
  if (
    q.includes("role") ||
    q.includes("roles") ||
    q.includes("switch role") ||
    q.includes("become a reviewer") ||
    q.includes("become an organizer") ||
    q.includes("user management")
  ) {
    return `### 👥 ConfHub Roles & Permissions

ConfHub features three distinct user roles:

1. **Author**:
   - Submit research manuscripts (Tab 1)
   - Track double-blind review feedback and versions (Tab 2)
   - Upload camera-ready papers and pay registration (Tab 3)
   - View assigned presentation timetable (Tab 4)
   - Download post-conference certificates and proceedings (Tab 5)

2. **Reviewer**:
   - Access assigned double-blind manuscripts
   - Score papers across 4 dimensions (Novelty, Methodology, Quality, Relevance)
   - Provide author feedback and confidential notes to chairs

3. **Organizer**:
   - Create, edit, and publish conferences
   - Monitor review progress and issue acceptance decisions
   - Build program schedules with automated conflict detection
   - Promote users to Reviewer or Organizer roles

*You can test and navigate between roles using the role selector in the top navigation header!*`;
  }

  // =========================================================================
  // 14. SCHOLARLY WRITING & REBUTTALS
  // =========================================================================
  if (q.includes("abstract") || q.includes("writing an abstract") || q.includes("abstract structure")) {
    return `### ✍️ Academic Writing: Structured Abstract Guide

A compelling conference abstract should be **150–250 words** structured into 5 key sentences:
1. **Background**: Contextualize the problem and current limitations.
2. **Objective**: Clearly state what your work solves.
3. **Proposed Method**: Summarize your algorithmic, theoretical, or empirical approach.
4. **Key Results**: Provide concrete quantitative benchmarks (e.g. *"achieves 14% higher throughput with 22% lower latency"*).
5. **Impact**: Highlight why this matters to the community.`;
  }

  if (q.includes("rebuttal") || q.includes("respond to reviewer") || q.includes("reviewer comments")) {
    return `### 💡 Academic Writing: Author Rebuttal Best Practices

When responding to peer-review feedback:
1. **Express Gratitude**: Thank reviewers for their constructive time and critique.
2. **Stay Objective**: Address factual concerns with data, benchmarks, or citations. Avoid defensive language.
3. **Use Structured Numbering**:
   - *[Reviewer 1 - Point 1]*: Quote the reviewer's concern.
   - *[Author Response]*: Explain your clarification.
   - *[Manuscript Update]*: Reference the exact page/section changed in your revision.`;
  }

  // =========================================================================
  // 15. TRACKS & TOPICS EXPLORATION
  // =========================================================================
  if (q.includes("track") || q.includes("tracks") || q.includes("topic") || q.includes("topics")) {
    const allTracks = publishedConferences.flatMap((c) => c.tracks || []);
    const uniqueTracks = Array.from(new Set(allTracks));

    return `### 🏷️ Active Conference Tracks & Topics

ConfHub hosts research across diverse computer science and engineering disciplines:
${uniqueTracks.map((t) => `• ${t}`).join("\n")}

*Select any track when submitting your manuscript in **Tab 1 (Submit Paper)**.*`;
  }

  // =========================================================================
  // 16. INTELLIGENT CATCH-ALL / SCHOLARLY ASSISTANT
  // =========================================================================
  // Search for any matching topic in conference titles, tracks, or descriptions
  const topicMatches = publishedConferences.filter((c) => {
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    return words.some(
      (w) =>
        c.title.toLowerCase().includes(w) ||
        c.description.toLowerCase().includes(w) ||
        (c.tracks && c.tracks.some((t) => t.toLowerCase().includes(w)))
    );
  });

  if (topicMatches.length > 0) {
    const confList = topicMatches.map((c) => `• **${c.title}** (Deadline: ${formatDate(c.submission_deadline)})`).join("\n");
    return `I found conferences related to your inquiry:

${confList}

Would you like to know more about the tracks, submission deadlines, or formatting guidelines for any of these events?`;
  }

  return `I am your **ConfHub Academic Advisor**. I can assist you with:

• 🏛 **Conferences & Deadlines**: Explore published events, tracks, and submission cutoffs.
• 📄 **Submissions & Guidelines**: IEEE/ACM 2-column format, 10-page limit, double-blind review.
• 🔍 **My Submissions**: Check real-time statuses and reviewer scores for your papers.
• ⭐ **Review Rubric**: 4-dimension scoring (Novelty, Rigor, Quality, Relevance).
• 💳 **Camera-Ready & Fees**: Finalizing papers, student/academic/industry tiers ($150 / $300 / $500).
• 📅 **Program Timetable**: Presentation room assignments and conflict-free scheduling.
• 📜 **Certificates**: Generating and downloading verified PDF certificates.

Please feel free to ask a specific question or use one of the quick topic chips!`;
};

/**
 * Main conversational dispatcher
 * Tries the remote Gemini LLM first (if configured), then smoothly falls back
 * to the Built-in ConfHub Academic Knowledge & Reasoning Engine.
 * Guaranteed to never fail or leave the user without an answer.
 */
export const askGeminiAssistant = async (
  userMessage,
  currentUser = null,
  userProfile = null,
  chatHistory = []
) => {
  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return "Please enter a valid question or inquiry.";
  }

  const trimmed = userMessage.trim();

  // Try Remote Gemini LLM first if an API key is available
  if (isGeminiConfigured()) {
    try {
      const platformContext = getPlatformContext(currentUser, userProfile);
      const llmReply = await fetchGeminiResponse(trimmed, platformContext, chatHistory);
      if (llmReply && llmReply.length > 10) {
        return llmReply;
      }
    } catch (err) {
      console.warn("Gemini remote call fell back to local engine:", err);
    }
  }

  // High-performance, rich, built-in Academic Reasoning Engine
  return generateAcademicEngineResponse(trimmed, currentUser, userProfile);
};
