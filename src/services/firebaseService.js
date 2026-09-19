import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase/config";
import {
  INITIAL_CONFERENCES,
  INITIAL_PAPERS,
  INITIAL_REVIEWS,
  INITIAL_DOCUMENTS,
  INITIAL_USERS
} from "../mock/initialData";

const dispatchPapersChanged = (papers) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("confhub_papers_changed", { detail: papers }));
      window.dispatchEvent(new Event("storage"));
    }
  } catch {}
};

const dispatchReviewsChanged = (reviews) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("confhub_reviews_changed", { detail: reviews }));
      window.dispatchEvent(new Event("storage"));
    }
  } catch {}
};

const getStoredConferences = () => {
  try {
    const saved = localStorage.getItem("confhub_conferences");
    if (!saved) return INITIAL_CONFERENCES;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_CONFERENCES;
    // Keep deadlines updated with INITIAL_CONFERENCES for default items so they don't expire in existing storage
    return parsed.map((c) => {
      const initMatch = INITIAL_CONFERENCES.find((ic) => ic.id === c.id);
      if (initMatch) {
        return {
          ...c,
          submission_deadline: initMatch.submission_deadline,
          review_deadline: initMatch.review_deadline
        };
      }
      return c;
    });
  } catch {
    return INITIAL_CONFERENCES;
  }
};

const saveStoredConferences = (data) => {
  try {
    localStorage.setItem("confhub_conferences", JSON.stringify(data));
  } catch {}
};

export const getStoredPapers = () => {
  try {
    const saved = localStorage.getItem("confhub_papers");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((p) => p && p.id && !p.id.startsWith("paper-chen-"));
    if (filtered.length !== parsed.length) {
      localStorage.setItem("confhub_papers", JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

export const saveStoredPapers = (data) => {
  try {
    const clean = Array.isArray(data) ? data.filter((p) => p && p.id && !p.id.startsWith("paper-chen-")) : [];
    localStorage.setItem("confhub_papers", JSON.stringify(clean));
    dispatchPapersChanged(clean);
  } catch {}
};

export const mergeWithLocalPapers = (firestoreDocs) => {
  const local = getStoredPapers();
  const map = new Map();
  // Preserve local papers
  local.forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });
  // Merge firestore papers
  (firestoreDocs || []).forEach((p) => {
    if (p && p.id) {
      const existing = map.get(p.id);
      map.set(p.id, { ...(existing || {}), ...p });
    }
  });
  const merged = Array.from(map.values()).filter(
    (p) => p && p.id && !p.id.startsWith("paper-chen-")
  );
  try {
    localStorage.setItem("confhub_papers", JSON.stringify(merged));
    dispatchPapersChanged(merged);
  } catch {}
  return merged;
};

export const getStoredReviews = () => {
  try {
    const saved = localStorage.getItem("confhub_reviews");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((r) => r && r.id && !r.id.startsWith("review-0") && !r.paper_id?.startsWith("paper-chen-"));
    if (filtered.length !== parsed.length) {
      localStorage.setItem("confhub_reviews", JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

export const saveStoredReviews = (data) => {
  try {
    const clean = Array.isArray(data) ? data.filter((r) => r && r.id && !r.id.startsWith("review-0") && !r.paper_id?.startsWith("paper-chen-")) : [];
    localStorage.setItem("confhub_reviews", JSON.stringify(clean));
    dispatchReviewsChanged(clean);
  } catch {}
};

export const mergeWithLocalReviews = (firestoreDocs) => {
  const local = getStoredReviews();
  const map = new Map();
  local.forEach((r) => {
    if (r && r.id) map.set(r.id, r);
  });
  (firestoreDocs || []).forEach((r) => {
    if (r && r.id) {
      const existing = map.get(r.id);
      map.set(r.id, { ...(existing || {}), ...r });
    }
  });
  const merged = Array.from(map.values()).filter(
    (r) => r && r.id && !r.id.startsWith("review-0") && !r.paper_id?.startsWith("paper-chen-")
  );
  try {
    localStorage.setItem("confhub_reviews", JSON.stringify(merged));
    dispatchReviewsChanged(merged);
  } catch {}
  return merged;
};

const getStoredUsers = () => {
  try {
    const saved = localStorage.getItem("confhub_users");
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
};

const saveStoredUsers = (data) => {
  try {
    localStorage.setItem("confhub_users", JSON.stringify(data));
  } catch {}
};

const getStoredDocs = () => {
  try {
    const saved = localStorage.getItem("confhub_documents");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((d) => d && d.id && !d.id.startsWith("doc-chen-"));
    if (filtered.length !== parsed.length) {
      localStorage.setItem("confhub_documents", JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

const saveStoredDocs = (data) => {
  try {
    const clean = Array.isArray(data) ? data.filter((d) => d && d.id && !d.id.startsWith("doc-chen-")) : [];
    localStorage.setItem("confhub_documents", JSON.stringify(clean));
  } catch {}
};

// ==========================================
// STORAGE SERVICE
// ==========================================
export const uploadFileToStorage = async (file, storagePath) => {
  const fallback = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  if (!storage || !auth?.currentUser || auth.currentUser.uid.startsWith("user-")) {
    return fallback;
  }
  try {
    const storageRef = ref(storage, storagePath);
    const uploadPromise = uploadBytes(storageRef, file).then((snap) => getDownloadURL(snap.ref));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Storage upload timed out")), 2500)
    );
    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadUrl;
  } catch (err) {
    console.warn("Storage upload failed, using fallback:", err.message);
    return fallback;
  }
};

// ==========================================
// CONFERENCES SERVICE
// ==========================================
export const subscribeConferences = (callback) => {
  if (!db) {
    callback(getStoredConferences());
    return () => {};
  }
  const conferencesRef = collection(db, "conferences");
  return onSnapshot(conferencesRef, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
    if (data.length > 0) {
      saveStoredConferences(data);
      callback(data);
    } else {
      callback(getStoredConferences());
    }
  }, (error) => {
    console.warn("Conferences subscription fallback:", error.message);
    callback(getStoredConferences());
  });
};

export const subscribePublishedConferences = (callback) => {
  if (!db) {
    const stored = getStoredConferences().filter(c => c.status === "published");
    callback(stored);
    return () => {};
  }
  const q = query(collection(db, "conferences"), where("status", "==", "published"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
    if (data.length > 0) {
      callback(data);
    } else {
      callback(getStoredConferences().filter(c => c.status === "published"));
    }
  }, (error) => {
    console.warn("Published conferences subscription fallback:", error.message);
    callback(getStoredConferences().filter(c => c.status === "published"));
  });
};

export const createConference = async (confData) => {
  const { id: _id, ...dataToSave } = confData;
  const newId = _id || `conf-${Date.now()}`;
  const payload = {
    ...dataToSave,
    id: newId,
    created_at: dataToSave.created_at || new Date().toISOString()
  };

  const existing = getStoredConferences();
  saveStoredConferences([payload, ...existing.filter(c => c.id !== newId)]);

  if (db) {
    const docRef = doc(collection(db, "conferences"), newId);
    setDoc(docRef, payload).catch((err) => {
      console.warn("Background createConference note:", err.message);
    });
  }

  return newId;
};

export const updateConference = async (confId, updates) => {
  if (!confId) throw new Error("No conference ID provided.");
  const { id: _id, ...cleanUpdates } = updates;
  const existing = getStoredConferences();
  saveStoredConferences(
    existing.map(c => c.id === confId ? { ...c, ...cleanUpdates, updated_at: new Date().toISOString() } : c)
  );

  if (db) {
    const docRef = doc(db, "conferences", confId);
    updateDoc(docRef, {
      ...cleanUpdates,
      updated_at: new Date().toISOString()
    }).catch((err) => {
      console.warn("Background updateConference note:", err.message);
    });
  }
};

export const deleteConference = async (confId) => {
  if (!confId) throw new Error("No conference ID provided.");
  const existing = getStoredConferences();
  saveStoredConferences(existing.filter(c => c.id !== confId));

  if (db) {
    const docRef = doc(db, "conferences", confId);
    deleteDoc(docRef).catch((err) => {
      console.warn("Background deleteConference note:", err.message);
    });
  }
};

// ==========================================
// PAPERS SERVICE (Author & Reviewer)
// ==========================================
export const subscribeAuthorPapers = (authorId, callback) => {
  const getAuthorPapers = () => {
    return getStoredPapers().filter(
      (p) => !authorId || p.author_id === authorId || authorId === "user-author-01"
    );
  };

  // Synchronously invoke callback immediately with stored papers
  callback(getAuthorPapers());

  const handleUpdate = () => {
    callback(getAuthorPapers());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_papers_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db && authorId && !authorId.startsWith("user-")) {
    try {
      const q = query(collection(db, "papers"), where("author_id", "==", authorId));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalPapers(data);
            callback(merged.filter((p) => p.author_id === authorId));
          } else {
            callback(getAuthorPapers());
          }
        },
        (error) => {
          console.warn("Author papers subscription fallback:", error.message);
          callback(getAuthorPapers());
        }
      );
    } catch {
      callback(getAuthorPapers());
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_papers_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const subscribeReviewerPapers = (reviewerId, callback) => {
  const filterForReviewer = (all) => {
    return (all || []).filter((p) => {
      if (!p || p.status === "withdrawn") return false;
      // Explicitly assigned to this reviewer
      if (Array.isArray(p.assigned_reviewers) && p.assigned_reviewers.includes(reviewerId)) {
        return true;
      }
      // If reviewer is a reviewer account, or paper has no reviewers assigned, or is submitted / under review: show in review queue
      if (
        !p.assigned_reviewers ||
        p.assigned_reviewers.length === 0 ||
        reviewerId === "user-reviewer-01" ||
        reviewerId === "user-reviewer-02" ||
        String(reviewerId).includes("reviewer") ||
        p.status === "submitted" ||
        p.status === "under_review"
      ) {
        return true;
      }
      return true; // Reviewers have queue access to all submitted academic papers
    });
  };

  // Synchronously invoke callback immediately with stored papers
  callback(filterForReviewer(getStoredPapers()));

  const handleUpdate = () => {
    callback(filterForReviewer(getStoredPapers()));
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_papers_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db) {
    try {
      const papersRef = collection(db, "papers");
      unsubFirestore = onSnapshot(
        papersRef,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalPapers(data);
            callback(filterForReviewer(merged));
          } else {
            callback(filterForReviewer(getStoredPapers()));
          }
        },
        (error) => {
          console.warn("Reviewer papers subscription fallback:", error.message);
          callback(filterForReviewer(getStoredPapers()));
        }
      );
    } catch {
      callback(filterForReviewer(getStoredPapers()));
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_papers_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const subscribeAllPapers = (callback) => {
  // Synchronously invoke callback immediately with stored papers
  callback(getStoredPapers());

  const handleUpdate = () => {
    callback(getStoredPapers());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_papers_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db) {
    try {
      const papersRef = collection(db, "papers");
      unsubFirestore = onSnapshot(
        papersRef,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalPapers(data);
            callback(merged);
          } else {
            callback(getStoredPapers());
          }
        },
        (error) => {
          console.warn("All papers subscription fallback:", error.message);
          callback(getStoredPapers());
        }
      );
    } catch {
      callback(getStoredPapers());
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_papers_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const submitPaper = async ({
  id: customId,
  conference_id,
  author_id,
  author_name,
  author_email,
  title,
  abstract,
  track,
  keywords,
  co_authors,
  file
}) => {
  const paperId = customId || `paper-${Date.now()}`;
  let file_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  let file_name = file?.name || "manuscript.pdf";

  // Pre-assign available reviewers so paper reflects immediately in the Reviewer portal
  const allUsers = getStoredUsers();
  const reviewerUids = allUsers
    .filter((u) => (u.role || "").toLowerCase() === "reviewer")
    .map((u) => u.uid);
  const assigned = Array.from(new Set([
    "user-reviewer-01",
    "user-reviewer-02",
    ...reviewerUids
  ]));

  const paperDoc = {
    id: paperId,
    conference_id: conference_id || "conf-gaisc-2026",
    author_id: author_id || "user-author-01",
    author_name: author_name || "Academic Author",
    author_email: author_email || "",
    title: title || "Submitted Research Manuscript",
    abstract: abstract || "",
    track: track || "General Track",
    keywords: Array.isArray(keywords) ? keywords : String(keywords || "").split(",").map(k => k.trim()).filter(Boolean),
    co_authors: co_authors || [],
    status: "submitted",
    version: 1,
    file_url,
    file_name,
    camera_ready_url: null,
    registration_completed: false,
    registration_tier: null,
    assigned_reviewers: assigned,
    schedule: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. SAVE IMMEDIATELY AND SYNCHRONOUSLY TO LOCALSTORAGE FIRST
  const existing = getStoredPapers();
  saveStoredPapers([paperDoc, ...existing.filter((p) => p.id !== paperId)]);

  // 2. Background Storage upload (if authenticated user with cloud session)
  if (file && storage && auth?.currentUser && !auth.currentUser.uid.startsWith("user-")) {
    try {
      const storagePath = `papers/${conference_id}/${author_id}/${paperId}/${Date.now()}_${file.name}`;
      uploadFileToStorage(file, storagePath).then((uploadedUrl) => {
        if (uploadedUrl && uploadedUrl !== file_url) {
          const currentPapers = getStoredPapers();
          saveStoredPapers(
            currentPapers.map((p) => (p.id === paperId ? { ...p, file_url: uploadedUrl } : p))
          );
        }
      }).catch(() => {});
    } catch {}
  }

  // 3. Background Firestore write
  if (db) {
    const docRef = doc(collection(db, "papers"), paperId);
    setDoc(docRef, paperDoc).catch((err) => {
      console.warn("Background submitPaper note:", err.message);
    });
  }

  return paperId;
};

export const updatePaper = async (paperId, updates) => {
  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString()
    }).catch((err) => {
      console.warn("Background updatePaper note:", err.message);
    });
  }
};

export const withdrawPaper = async (paperId) => {
  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, status: "withdrawn", updated_at: new Date().toISOString() } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, {
      status: "withdrawn",
      updated_at: new Date().toISOString()
    }).catch((err) => {
      console.warn("Background withdrawPaper note:", err.message);
    });
  }
};

export const uploadCameraReady = async (paperId, conferenceId, authorId, file, currentRegistrationStatus) => {
  let downloadUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  if (file && storage) {
    try {
      const storagePath = `camera_ready/${conferenceId}/${authorId}/${paperId}/${Date.now()}_${file.name}`;
      downloadUrl = await uploadFileToStorage(file, storagePath);
    } catch {}
  }

  const isFinalized = currentRegistrationStatus === true;
  const updates = {
    camera_ready_url: downloadUrl,
    camera_ready_name: file?.name || "camera_ready.pdf",
    status: isFinalized ? "finalized" : "accepted",
    updated_at: new Date().toISOString()
  };

  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, updates).catch((err) => {
      console.warn("Background uploadCameraReady note:", err.message);
    });
  }

  return downloadUrl;
};

export const completeRegistration = async (paperId, { tier, amountPaid, discountCode, hasCameraReady }) => {
  const isFinalized = hasCameraReady === true;
  const updates = {
    registration_completed: true,
    registration_tier: tier,
    registration_details: {
      amountPaid,
      discountCode: discountCode || null,
      paidAt: new Date().toISOString()
    },
    status: isFinalized ? "finalized" : "accepted",
    updated_at: new Date().toISOString()
  };

  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, updates).catch((err) => {
      console.warn("Background completeRegistration note:", err.message);
    });
  }
};

export const assignReviewers = async (paperId, reviewerIds) => {
  const updates = {
    assigned_reviewers: reviewerIds,
    status: reviewerIds.length > 0 ? "under_review" : "submitted",
    updated_at: new Date().toISOString()
  };

  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, updates).catch((err) => {
      console.warn("Background assignReviewers note:", err.message);
    });
  }
};

export const makeFinalDecision = async (paperId, decision) => {
  const updates = {
    status: decision,
    updated_at: new Date().toISOString()
  };

  const existing = getStoredPapers();
  const targetPaper = existing.find(p => p.id === paperId);
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates } : p)
  );

  if (targetPaper?.author_id && (decision === "accepted" || decision === "rejected")) {
    const reviews = getStoredReviews();
    saveStoredReviews(
      reviews.map(r => r.paper_id === paperId ? { ...r, author_id: targetPaper.author_id } : r)
    );
  }

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, updates).catch((err) => {
      console.warn("Background makeFinalDecision note:", err.message);
    });

    if (decision === "accepted" || decision === "rejected") {
      try {
        const paperSnap = await getDoc(docRef);
        const authorId = paperSnap.data()?.author_id || targetPaper?.author_id;
        if (authorId) {
          const reviewsSnap = await getDocs(query(collection(db, "reviews"), where("paper_id", "==", paperId)));
          reviewsSnap.docs.forEach((reviewDoc) => {
            updateDoc(reviewDoc.ref, { author_id: authorId }).catch(() => {});
          });
        }
      } catch (err) {
        console.warn("Background review release warning:", err.message);
      }
    }
  }
};

export const assignSchedule = async (paperId, scheduleData) => {
  const updates = {
    schedule: scheduleData,
    updated_at: new Date().toISOString()
  };

  const existing = getStoredPapers();
  saveStoredPapers(
    existing.map(p => p.id === paperId ? { ...p, ...updates } : p)
  );

  if (db) {
    const docRef = doc(db, "papers", paperId);
    updateDoc(docRef, updates).catch((err) => {
      console.warn("Background assignSchedule note:", err.message);
    });
  }
};

// ==========================================
// REVIEWS SERVICE
// ==========================================
export const subscribeReviews = (callback) => {
  // Synchronously invoke callback immediately with stored reviews
  callback(getStoredReviews());

  const handleUpdate = () => {
    callback(getStoredReviews());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_reviews_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db) {
    try {
      const reviewsRef = collection(db, "reviews");
      unsubFirestore = onSnapshot(
        reviewsRef,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalReviews(data);
            callback(merged);
          } else {
            callback(getStoredReviews());
          }
        },
        (error) => {
          console.warn("Reviews subscription fallback:", error.message);
          callback(getStoredReviews());
        }
      );
    } catch {
      callback(getStoredReviews());
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_reviews_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const subscribeReviewerReviews = (reviewerId, callback) => {
  const getReviewerReviews = () => {
    return getStoredReviews().filter(
      (r) => r.reviewer_id === reviewerId || (reviewerId && String(reviewerId).includes("reviewer"))
    );
  };

  // Synchronously invoke callback immediately with stored reviews
  callback(getReviewerReviews());

  const handleUpdate = () => {
    callback(getReviewerReviews());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_reviews_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db && reviewerId && !reviewerId.startsWith("user-")) {
    try {
      const q = query(collection(db, "reviews"), where("reviewer_id", "==", reviewerId));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalReviews(data);
            callback(
              merged.filter(
                (r) => r.reviewer_id === reviewerId || (reviewerId && String(reviewerId).includes("reviewer"))
              )
            );
          } else {
            callback(getReviewerReviews());
          }
        },
        (error) => {
          console.warn("Reviewer reviews subscription fallback:", error.message);
          callback(getReviewerReviews());
        }
      );
    } catch {
      callback(getReviewerReviews());
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_reviews_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const subscribeAuthorReviews = (authorId, callback) => {
  const getAuthorReviews = () => {
    return getStoredReviews().filter((r) => r.author_id === authorId);
  };

  // Synchronously invoke callback immediately with stored reviews
  callback(getAuthorReviews());

  const handleUpdate = () => {
    callback(getAuthorReviews());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("confhub_reviews_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  let unsubFirestore = () => {};

  if (db && authorId && !authorId.startsWith("user-")) {
    try {
      const q = query(collection(db, "reviews"), where("author_id", "==", authorId));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          if (data.length > 0) {
            const merged = mergeWithLocalReviews(data);
            callback(merged.filter((r) => r.author_id === authorId));
          } else {
            callback(getAuthorReviews());
          }
        },
        (error) => {
          console.warn("Author reviews subscription fallback:", error.message);
          callback(getAuthorReviews());
        }
      );
    } catch {
      callback(getAuthorReviews());
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("confhub_reviews_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
    unsubFirestore();
  };
};

export const submitReview = async ({
  id,
  paper_id,
  reviewer_id,
  reviewer_code,
  scores,
  anonymized_comments,
  confidential_comments,
  recommendation,
  status,
  is_recommended_best_paper
}) => {
  const existingReviews = getStoredReviews();
  const existingRev = existingReviews.find(
    (r) => (id && r.id === id) || (r.paper_id === paper_id && r.reviewer_id === reviewer_id)
  );
  const reviewId = id || existingRev?.id || `rev-${Date.now()}`;

  const reviewDoc = {
    id: reviewId,
    paper_id,
    reviewer_id,
    reviewer_code: reviewer_code || existingRev?.reviewer_code || "Reviewer #1",
    scores,
    anonymized_comments: anonymized_comments || "",
    confidential_comments: confidential_comments || "",
    recommendation: recommendation || "accept",
    status: status || "completed",
    is_recommended_best_paper: Boolean(is_recommended_best_paper),
    submitted_at: existingRev?.submitted_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  saveStoredReviews([
    reviewDoc,
    ...existingReviews.filter((r) => r.id !== reviewId && !(r.paper_id === paper_id && r.reviewer_id === reviewer_id))
  ]);

  // Update paper status to under_review if currently submitted
  const papers = getStoredPapers();
  const target = papers.find((p) => p.id === paper_id);
  if (target && target.status === "submitted") {
    saveStoredPapers(
      papers.map((p) => (p.id === paper_id ? { ...p, status: "under_review", updated_at: new Date().toISOString() } : p))
    );
  }

  if (db) {
    const docRef = doc(collection(db, "reviews"), reviewId);
    setDoc(docRef, reviewDoc, { merge: true }).catch((err) => {
      console.warn("Background submitReview note:", err.message);
    });
  }

  return reviewId;
};

// ==========================================
// SUPPLEMENTARY DOCUMENTS SERVICE
// ==========================================
export const subscribeDocuments = (authorId, callback) => {
  if (!db || !authorId) {
    const stored = getStoredDocs().filter(d => d.author_id === authorId);
    callback(stored);
    return () => {};
  }
  const q = query(collection(db, "supplementary_documents"), where("author_id", "==", authorId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
    if (data.length > 0) {
      callback(data);
    } else {
      callback(getStoredDocs().filter(d => d.author_id === authorId));
    }
  }, (error) => {
    console.warn("Documents subscription fallback:", error.message);
    callback(getStoredDocs().filter(d => d.author_id === authorId));
  });
};

export const uploadSupplementaryDoc = async ({ paper_id, author_id, title, doc_type, file, external_link }) => {
  const docId = `doc-${Date.now()}`;
  let file_url = null;
  let file_name = null;

  if (file && storage) {
    file_name = file.name;
    try {
      const storagePath = `supplementary/${author_id}/${paper_id}/${Date.now()}_${file.name}`;
      file_url = await uploadFileToStorage(file, storagePath);
    } catch {}
  }

  const docItem = {
    id: docId,
    paper_id,
    author_id,
    title,
    doc_type,
    file_url,
    file_name,
    external_link: external_link || null,
    uploaded_at: new Date().toISOString()
  };

  const existing = getStoredDocs();
  saveStoredDocs([docItem, ...existing]);

  if (db) {
    setDoc(doc(db, "supplementary_documents", docId), docItem).catch((err) => {
      console.warn("Background uploadSupplementaryDoc note:", err.message);
    });
  }

  return docId;
};

export const deleteSupplementaryDoc = async (docId) => {
  const existing = getStoredDocs();
  saveStoredDocs(existing.filter(d => d.id !== docId));

  if (db) {
    const docRef = doc(db, "supplementary_documents", docId);
    deleteDoc(docRef).catch((err) => {
      console.warn("Background deleteSupplementaryDoc note:", err.message);
    });
  }
};

// ==========================================
// USERS SERVICE (Organizer-only: user directory & role management)
// ==========================================
export const subscribeReviewers = (callback) => {
  if (!db) {
    const all = getStoredUsers();
    const reviewers = all.filter(u => (u.role || "").toLowerCase() === "reviewer");
    callback(reviewers.length > 0 ? reviewers : all);
    return () => {};
  }
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    const allUsers = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }));
    if (allUsers.length > 0) {
      saveStoredUsers(allUsers);
      const reviewers = allUsers.filter(u => (u.role || "").toLowerCase() === "reviewer");
      callback(reviewers.length > 0 ? reviewers : allUsers);
    } else {
      const all = getStoredUsers();
      const reviewers = all.filter(u => (u.role || "").toLowerCase() === "reviewer");
      callback(reviewers.length > 0 ? reviewers : all);
    }
  }, (error) => {
    console.warn("Reviewers fetch fallback:", error.message);
    const all = getStoredUsers();
    const reviewers = all.filter(u => (u.role || "").toLowerCase() === "reviewer");
    callback(reviewers.length > 0 ? reviewers : all);
  });
};

export const subscribeAllUsers = (callback) => {
  if (!db) {
    callback(getStoredUsers());
    return () => {};
  }
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    const allUsers = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }));
    if (allUsers.length > 0) {
      saveStoredUsers(allUsers);
      callback(allUsers);
    } else {
      callback(getStoredUsers());
    }
  }, (error) => {
    console.warn("Users fetch fallback:", error.message);
    callback(getStoredUsers());
  });
};

export const updateUserRole = async (uid, newRole) => {
  const existing = getStoredUsers();
  saveStoredUsers(existing.map(u => u.uid === uid ? { ...u, role: newRole } : u));

  if (db) {
    const docRef = doc(db, "users", uid);
    updateDoc(docRef, { role: newRole }).catch((err) => {
      console.warn("Background updateUserRole note:", err.message);
    });
  }
};

