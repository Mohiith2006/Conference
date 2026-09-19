import React, { createContext, useContext, useState, useEffect } from "react";
import {
  INITIAL_CONFERENCES,
  INITIAL_PAPERS,
  INITIAL_REVIEWS,
  INITIAL_DOCUMENTS
} from "../mock/initialData";
import { isFirebaseConfigured, db, storage } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./useAuth";

const ConferenceContext = createContext(null);

export const ConferenceProvider = ({ children }) => {
  const { currentUser } = useAuth();

  // Local state with localStorage backup
  const [conferences, setConferences] = useState(() => {
    const saved = localStorage.getItem("confhub_conferences");
    return saved ? JSON.parse(saved) : INITIAL_CONFERENCES;
  });

  const [papers, setPapers] = useState(() => {
    try {
      const saved = localStorage.getItem("confhub_papers");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && !p.id.startsWith("paper-chen-")) : [];
    } catch {
      return [];
    }
  });

  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem("confhub_reviews");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((r) => r && r.id && !r.id.startsWith("review-0") && !r.paper_id?.startsWith("paper-chen-")) : [];
    } catch {
      return [];
    }
  });

  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem("confhub_documents");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((d) => d && d.id && !d.id.startsWith("doc-chen-")) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    if (conferences && conferences.length > 0) {
      localStorage.setItem("confhub_conferences", JSON.stringify(conferences));
    }
  }, [conferences]);

  useEffect(() => {
    if (papers && papers.length > 0) {
      localStorage.setItem("confhub_papers", JSON.stringify(papers));
    }
  }, [papers]);

  useEffect(() => {
    if (reviews && reviews.length > 0) {
      localStorage.setItem("confhub_reviews", JSON.stringify(reviews));
    }
  }, [reviews]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      localStorage.setItem("confhub_documents", JSON.stringify(documents));
    }
  }, [documents]);

  const notify = (message, type = "success") => {
    setActionMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  // Helper: File Upload abstraction (Firebase Storage with object URL fallback)
  const uploadFileToStorage = async (file, path) => {
    if (isFirebaseConfigured && storage) {
      try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      } catch (err) {
        console.warn("Storage upload failed, falling back to local Blob URL:", err);
      }
    }
    // Fallback: create persistent local URL
    return URL.createObjectURL(file);
  };

  // ==========================================
  // CONFERENCES LOGIC
  // ==========================================
  const createConference = async (confData) => {
    setIsLoading(true);
    try {
      const newConf = {
        id: `conf-${Date.now()}`,
        ...confData,
        organizer_id: currentUser?.uid || "user-organizer-01",
        created_at: new Date().toISOString()
      };

      if (isFirebaseConfigured && db) {
        try {
          const docRef = await addDoc(collection(db, "conferences"), newConf);
          newConf.id = docRef.id;
        } catch (e) {
          console.warn("Firestore error adding conference:", e);
        }
      }

      setConferences(prev => [newConf, ...prev]);
      notify(`Conference "${newConf.title}" created successfully!`);
      return newConf;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleConferenceStatus = async (confId) => {
    setConferences(prev =>
      prev.map(c => {
        if (c.id === confId) {
          const updated = {
            ...c,
            status: c.status === "published" ? "draft" : "published"
          };
          notify(`Conference is now ${updated.status.toUpperCase()}`);
          return updated;
        }
        return c;
      })
    );
  };

  // Deadline Checks
  const isSubmissionOpen = (conferenceId) => {
    const conf = conferences.find(c => c.id === conferenceId);
    if (!conf) return false;
    return new Date().getTime() < new Date(conf.submission_deadline).getTime();
  };

  const isConferenceEnded = (conferenceId) => {
    const conf = conferences.find(c => c.id === conferenceId);
    if (!conf) return false;
    return new Date().getTime() > new Date(conf.end_date).getTime();
  };

  // Visibility Logic: Only published conferences appear in the Author portal
  const getPublishedConferences = () => {
    return conferences.filter(c => c.status === "published");
  };

  // ==========================================
  // PAPERS LOGIC (State Machine)
  // ==========================================
  // Screen 1: Submit Paper
  const submitPaper = async ({ conference_id, title, abstract, track, keywords, co_authors, file }) => {
    setIsLoading(true);
    try {
      // Validate deadline
      if (!isSubmissionOpen(conference_id)) {
        throw new Error("Submission deadline has passed for this conference. Submissions are closed.");
      }

      const paperId = `paper-${Date.now()}`;
      let file_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      let file_name = file?.name || "paper_manuscript.pdf";

      if (file) {
        file_url = await uploadFileToStorage(
          file, 
          `papers/${conference_id}/${currentUser?.uid}/${paperId}_v1_${file.name}`
        );
      }

      const newPaper = {
        id: paperId,
        conference_id,
        author_id: currentUser?.uid,
        author_name: currentUser?.name || "Anonymous Author",
        author_email: currentUser?.email,
        title,
        abstract,
        track,
        keywords: Array.isArray(keywords) ? keywords : keywords.split(",").map(k => k.trim()).filter(Boolean),
        co_authors: co_authors || [],
        status: "submitted", // Initial state
        version: 1,
        file_url,
        file_name,
        assigned_reviewers: ["user-reviewer-01", "user-reviewer-02"],
        camera_ready_url: null,
        registration_completed: false,
        registration_tier: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isFirebaseConfigured && db) {
        try {
          const docRef = await addDoc(collection(db, "papers"), newPaper);
          newPaper.id = docRef.id;
        } catch (e) {
          console.warn("Firestore error adding paper:", e);
        }
      }

      setPapers(prev => [newPaper, ...prev]);
      notify(`Paper "${title}" successfully submitted! Status: Submitted (v1)`);
      return newPaper;
    } finally {
      setIsLoading(false);
    }
  };

  // Update Paper (allowed only if status === 'submitted')
  const updatePaper = async (paperId, updates) => {
    setIsLoading(true);
    try {
      const paper = papers.find(p => p.id === paperId);
      if (!paper) throw new Error("Paper not found");

      if (paper.status !== "submitted") {
        throw new Error("Cannot edit paper: manuscript is locked because it is under review or decided.");
      }

      let updatedFields = {
        ...updates,
        version: paper.version + 1,
        updated_at: new Date().toISOString()
      };

      setPapers(prev =>
        prev.map(p => (p.id === paperId ? { ...p, ...updatedFields } : p))
      );
      notify(`Paper updated to version ${paper.version + 1}!`);
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw Paper (allowed if submitted or under_review)
  const withdrawPaper = async (paperId) => {
    setIsLoading(true);
    try {
      const paper = papers.find(p => p.id === paperId);
      if (!paper) throw new Error("Paper not found");

      if (!["submitted", "under_review"].includes(paper.status)) {
        throw new Error("Cannot withdraw a paper that has already been accepted, rejected, or finalized.");
      }

      setPapers(prev =>
        prev.map(p => (p.id === paperId ? { ...p, status: "withdrawn", updated_at: new Date().toISOString() } : p))
      );
      notify("Paper has been withdrawn.", "info");
    } finally {
      setIsLoading(false);
    }
  };

  // Organizer assigns reviewers -> moves paper to 'under_review'
  const assignReviewers = async (paperId, reviewerIds) => {
    setPapers(prev =>
      prev.map(p => {
        if (p.id === paperId) {
          return {
            ...p,
            assigned_reviewers: reviewerIds,
            status: reviewerIds.length > 0 ? "under_review" : "submitted",
            updated_at: new Date().toISOString()
          };
        }
        return p;
      })
    );
    notify("Reviewers assigned successfully. Paper status is now: Under Review.");
  };

  // Organizer Final Decision
  const makeFinalDecision = async (paperId, decision) => {
    setPapers(prev =>
      prev.map(p => {
        if (p.id === paperId) {
          return {
            ...p,
            status: decision, // 'accepted' | 'rejected'
            updated_at: new Date().toISOString()
          };
        }
        return p;
      })
    );
    notify(`Paper decision recorded: ${decision.toUpperCase()}`);
  };

  // Screen 3: Action 1 - Camera Ready Upload
  const uploadCameraReady = async (paperId, file) => {
    setIsLoading(true);
    try {
      const paper = papers.find(p => p.id === paperId);
      if (!paper) throw new Error("Paper not found");

      const fileUrl = await uploadFileToStorage(
        file,
        `camera_ready/${paper.conference_id}/${paper.author_id}/${paperId}_camera_ready.pdf`
      );

      setPapers(prev =>
        prev.map(p => {
          if (p.id === paperId) {
            const isBothComplete = p.registration_completed && fileUrl;
            return {
              ...p,
              camera_ready_url: fileUrl,
              camera_ready_name: file.name,
              version: p.version + 1,
              status: isBothComplete ? "finalized" : p.status,
              updated_at: new Date().toISOString()
            };
          }
          return p;
        })
      );
      notify("Camera-ready manuscript uploaded!");
    } finally {
      setIsLoading(false);
    }
  };

  // Screen 3: Action 2 - Registration & Payment
  const completeRegistration = async (paperId, registrationData) => {
    setIsLoading(true);
    try {
      setPapers(prev =>
        prev.map(p => {
          if (p.id === paperId) {
            const isBothComplete = p.camera_ready_url && true;
            return {
              ...p,
              registration_completed: true,
              registration_tier: registrationData.tier,
              registration_details: registrationData,
              status: isBothComplete ? "finalized" : p.status,
              updated_at: new Date().toISOString()
            };
          }
          return p;
        })
      );
      notify("Registration and payment completed successfully!");
    } finally {
      setIsLoading(false);
    }
  };

  // Organizer assigns presentation schedule (Room, Time, Track)
  const assignSchedule = async (paperId, scheduleData) => {
    setPapers(prev =>
      prev.map(p => {
        if (p.id === paperId) {
          return {
            ...p,
            schedule: scheduleData,
            updated_at: new Date().toISOString()
          };
        }
        return p;
      })
    );
    notify("Presentation schedule assigned.");
  };

  // ==========================================
  // REVIEWS LOGIC
  // ==========================================
  const submitReview = async ({ paper_id, scores, anonymized_comments, confidential_organizer_comments, is_recommended_best_paper }) => {
    setIsLoading(true);
    try {
      const existingReviewsForPaper = reviews.filter(r => r.paper_id === paper_id);
      const reviewerCode = `Reviewer #${existingReviewsForPaper.length + 1}`;

      const newReview = {
        id: `review-${Date.now()}`,
        paper_id,
        reviewer_id: currentUser?.uid || "user-reviewer-01",
        reviewer_code: reviewerCode,
        scores,
        anonymized_comments,
        confidential_organizer_comments,
        is_recommended_best_paper: Boolean(is_recommended_best_paper),
        submitted_at: new Date().toISOString()
      };

      setReviews(prev => [...prev.filter(r => !(r.paper_id === paper_id && r.reviewer_id === newReview.reviewer_id)), newReview]);
      notify("Review submitted successfully! Thank you for your evaluation.");
      return newReview;
    } finally {
      setIsLoading(false);
    }
  };

  // Get reviews for a paper - author safe view (anonymized)
  const getPaperReviewsForAuthor = (paperId) => {
    return reviews
      .filter(r => r.paper_id === paperId)
      .map(r => ({
        id: r.id,
        reviewer_code: r.reviewer_code,
        scores: r.scores,
        anonymized_comments: r.anonymized_comments,
        submitted_at: r.submitted_at
      }));
  };

  // ==========================================
  // SUPPLEMENTARY DOCUMENTS LOGIC
  // ==========================================
  const uploadDocument = async ({ paper_id, title, doc_type, file, external_link }) => {
    setIsLoading(true);
    try {
      let file_url = null;
      let file_name = null;

      if (file) {
        file_name = file.name;
        file_url = await uploadFileToStorage(
          file,
          `supplementary/${currentUser?.uid}/${paper_id}_${file.name}`
        );
      }

      const newDoc = {
        id: `doc-${Date.now()}`,
        paper_id,
        author_id: currentUser?.uid,
        title,
        doc_type,
        file_url,
        file_name,
        external_link,
        uploaded_at: new Date().toISOString()
      };

      setDocuments(prev => [newDoc, ...prev]);
      notify(`Document "${title}" saved to library.`);
      return newDoc;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (docId) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    notify("Document deleted from library.", "info");
  };

  // Reset to original seed data anytime for testing
  const resetDemoData = () => {
    setConferences(INITIAL_CONFERENCES);
    setPapers(INITIAL_PAPERS);
    setReviews(INITIAL_REVIEWS);
    setDocuments(INITIAL_DOCUMENTS);
    localStorage.removeItem("confhub_conferences");
    localStorage.removeItem("confhub_papers");
    localStorage.removeItem("confhub_reviews");
    localStorage.removeItem("confhub_documents");
    notify("Demo data reset to factory initial state.");
  };

  return (
    <ConferenceContext.Provider
      value={{
        conferences,
        papers,
        reviews,
        documents,
        isLoading,
        actionMessage,
        notify,
        // Conferences
        createConference,
        toggleConferenceStatus,
        getPublishedConferences,
        isSubmissionOpen,
        isConferenceEnded,
        // Papers
        submitPaper,
        updatePaper,
        withdrawPaper,
        assignReviewers,
        makeFinalDecision,
        uploadCameraReady,
        completeRegistration,
        assignSchedule,
        // Reviews
        submitReview,
        getPaperReviewsForAuthor,
        // Documents
        uploadDocument,
        deleteDocument,
        // Utilities
        resetDemoData
      }}
    >
      {children}
    </ConferenceContext.Provider>
  );
};

export const useConference = () => {
  const context = useContext(ConferenceContext);
  if (!context) throw new Error("useConference must be used within a ConferenceProvider");
  return context;
};
