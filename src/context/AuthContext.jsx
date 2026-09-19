import React, { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { AuthContext } from "./authContextInstance";
import { INITIAL_USERS } from "../mock/initialData";

export const DEMO_CREDENTIALS = [
  {
    uid: "user-organizer-conf",
    name: "Conf",
    email: "conf@gmail.com",
    role: "organizer",
    passwords: ["111111", "ConfHub2026!", "password"],
    affiliation: "Conference Organization Committee",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-organizer-01",
    name: "Prof. Eleanor Vance",
    email: "organizer@confhub.org",
    role: "organizer",
    passwords: ["111111", "ConfHub2026!", "organizer123", "password"],
    affiliation: "MIT Department of Computer Science",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-reviewer-01",
    name: "Dr. Marcus Sterling",
    email: "reviewer@confhub.org",
    role: "reviewer",
    passwords: ["111111", "ConfHub2026!", "reviewer123", "password"],
    affiliation: "Stanford Artificial Intelligence Laboratory",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-reviewer-02",
    name: "Dr. Sophia Hartmann",
    email: "reviewer2@confhub.org",
    role: "reviewer",
    passwords: ["111111", "ConfHub2026!", "reviewer123", "password"],
    affiliation: "ETH Zürich - Distributed Computing Lab",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
  },
  {
    uid: "user-author-01",
    name: "Dr. Sarah Chen",
    email: "author@confhub.org",
    role: "author",
    passwords: ["111111", "ConfHub2026!", "author123", "password"],
    affiliation: "Carnegie Mellon University",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  }
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("confhub_demo_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.uid) return { uid: parsed.uid, email: parsed.email, displayName: parsed.name };
      }
    } catch {}
    return null;
  });

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("confhub_demo_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.uid) return parsed;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // login/register/loginWithGoogle each read-or-create the user's Firestore
  // profile themselves and are authoritative for that. Firebase Auth's own
  // state change fires onAuthStateChanged asynchronously too, and without this
  // guard its independent getDoc+setDoc would race the one already in flight -
  // e.g. reading the brand-new user's doc before register()'s own setDoc has
  // committed, concluding it doesn't exist yet, and writing a default
  // { role: "author" } profile that can then clobber the role the user
  // actually chose. Setting this synchronously before the auth call starts
  // guarantees it's true by the time onAuthStateChanged fires (which can only
  // happen after that call resolves), so the listener skips its own handling.
  const skipNextProfileSyncRef = useRef(false);

  // Real-time Firebase Auth listener
  useEffect(() => {
    if (userProfile?.uid && userProfile.uid.startsWith("user-")) {
      // Demo user already active from localStorage, no need to wait for Firebase
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        if (skipNextProfileSyncRef.current) {
          setLoading(false);
          return;
        }
        try {
          if (db) {
            const userDocRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              const resolvedRole = (data.role || "author").toLowerCase().trim();
              const profile = {
                uid: fbUser.uid,
                email: fbUser.email,
                name: data.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Academic User",
                affiliation: data.affiliation || "Academic Institution",
                ...data,
                role: resolvedRole
              };
              setUserProfile(profile);

              // If Firestore lacked a role field, persist it
              if (!data.role) {
                setDoc(userDocRef, { role: resolvedRole }, { merge: true }).catch(() => {});
              }
            } else {
              // Default fallback if doc not yet created
              const defaultProfile = {
                uid: fbUser.uid,
                email: fbUser.email,
                name: fbUser.displayName || fbUser.email?.split("@")[0] || "Academic User",
                role: "author",
                affiliation: "Academic Institution",
                created_at: new Date().toISOString()
              };
              setUserProfile(defaultProfile);
              setDoc(userDocRef, defaultProfile, { merge: true }).catch((e) => {
                console.warn("Could not save new user doc:", e);
              });
            }
          } else {
            setUserProfile({
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Academic User",
              role: "author",
              affiliation: "Academic Institution"
            });
          }
        } catch (err) {
          console.error("Error reading user profile:", err);
          // Never leave user in unassigned state
          setUserProfile({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Academic User",
            role: "author",
            affiliation: "Academic Institution"
          });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email / Password Login
  const login = async (email, password) => {
    setAuthError(null);
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    // Check if matching demo user
    const matchedDemo = DEMO_CREDENTIALS.find((u) => {
      if (u.email.toLowerCase() !== cleanEmail) return false;
      return (
        u.passwords.includes(cleanPassword) ||
        cleanPassword === "111111" ||
        cleanPassword === "ConfHub2026!" ||
        cleanPassword === "password"
      );
    });

    if (matchedDemo) {
      const profile = {
        uid: matchedDemo.uid,
        email: matchedDemo.email,
        name: matchedDemo.name,
        role: matchedDemo.role,
        affiliation: matchedDemo.affiliation,
        avatar: matchedDemo.avatar
      };
      setCurrentUser({
        uid: matchedDemo.uid,
        email: matchedDemo.email,
        displayName: matchedDemo.name,
      });
      setUserProfile(profile);
      localStorage.setItem("confhub_demo_user", JSON.stringify(profile));

      // Attempt background Firebase sign-in if possible, but never let it fail this login
      if (auth) {
        signInWithEmailAndPassword(auth, cleanEmail, cleanPassword).catch(() => {});
      }
      return true;
    }

    skipNextProfileSyncRef.current = true;
    try {
      if (!auth) throw new Error("Authentication service is not initialized.");
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Fetch profile
      if (db) {
        try {
          const userDocRef = doc(db, "users", cred.user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            const resolvedRole = (data.role || "author").toLowerCase().trim();
            const profile = {
              uid: cred.user.uid,
              email: cred.user.email,
              name: data.name || cred.user.displayName || cred.user.email?.split("@")[0] || "Academic User",
              affiliation: data.affiliation || "Academic Institution",
              ...data,
              role: resolvedRole
            };
            setUserProfile(profile);
            localStorage.setItem("confhub_demo_user", JSON.stringify(profile));
          } else {
            const defaultProfile = {
              uid: cred.user.uid,
              email: cred.user.email,
              name: cred.user.displayName || cred.user.email?.split("@")[0] || "Academic User",
              role: "author",
              affiliation: "Academic Institution",
              created_at: new Date().toISOString()
            };
            setUserProfile(defaultProfile);
            localStorage.setItem("confhub_demo_user", JSON.stringify(defaultProfile));
            setDoc(userDocRef, defaultProfile, { merge: true }).catch(() => {});
          }
        } catch (dbErr) {
          console.warn("Firestore profile read failed:", dbErr);
          const fallbackProfile = {
            uid: cred.user.uid,
            email: cred.user.email,
            name: cred.user.displayName || cred.user.email?.split("@")[0] || "Academic User",
            role: "author",
            affiliation: "Academic Institution"
          };
          setUserProfile(fallbackProfile);
          localStorage.setItem("confhub_demo_user", JSON.stringify(fallbackProfile));
        }
      }
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(err.message || "Failed to sign in. Please verify your credentials.");
      return false;
    } finally {
      skipNextProfileSyncRef.current = false;
    }
  };

  // Google sign-in. Self-service signup only ever creates an Author account -
  // there is no way to pass a different role in here, by design: this
  // function does not accept one, so there is nothing for a caller (or a
  // spoofed/direct call bypassing the UI entirely) to override. An existing
  // user's real role always comes from their own Firestore doc, never from
  // this call.
  const loginWithGoogle = async () => {
    setAuthError(null);
    skipNextProfileSyncRef.current = true;
    try {
      if (!auth) {
        // Fallback if auth SDK is offline
        const offlineProfile = {
          uid: "user-author-google",
          name: "Dr. Sarah Chen (Google Auth)",
          email: "author.google@confhub.org",
          role: "author",
          affiliation: "Carnegie Mellon University",
          created_at: new Date().toISOString()
        };
        setCurrentUser({
          uid: offlineProfile.uid,
          email: offlineProfile.email,
          displayName: offlineProfile.name
        });
        setUserProfile(offlineProfile);
        localStorage.setItem("confhub_demo_user", JSON.stringify(offlineProfile));
        return true;
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      let cred;
      try {
        cred = await signInWithPopup(auth, provider);
      } catch (popupErr) {
        console.warn("Google popup error code:", popupErr.code, popupErr.message);

        // Handle deployed host not yet added to Firebase OAuth Authorized Domains
        if (popupErr.code === "auth/unauthorized-domain") {
          const currentHostname =
            typeof window !== "undefined" && window.location.hostname
              ? window.location.hostname
              : "deployed domain";
          
          const googleFallbackProfile = {
            uid: "user-author-google",
            name: "Dr. Sarah Chen (Google Account)",
            email: "author.google@confhub.org",
            role: "author",
            affiliation: "Carnegie Mellon University",
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
            created_at: new Date().toISOString()
          };

          setCurrentUser({
            uid: googleFallbackProfile.uid,
            email: googleFallbackProfile.email,
            displayName: googleFallbackProfile.name
          });
          setUserProfile(googleFallbackProfile);
          localStorage.setItem("confhub_demo_user", JSON.stringify(googleFallbackProfile));

          setAuthError(
            `Notice: '${currentHostname}' is not yet in Firebase Console > Authentication > Settings > Authorized domains. Signed you in as Author. To enable native Google OAuth popups on this domain, add '${currentHostname}' to Authorized domains in Firebase Console.`
          );
          return true;
        }

        if (popupErr.code === "auth/popup-blocked") {
          setAuthError("Google sign-in popup was blocked by your browser. Please allow popups for this site or sign in with email.");
          return false;
        }

        if (popupErr.code === "auth/popup-closed-by-user") {
          return false;
        }

        throw popupErr;
      }

      const resolvedName = cred.user.displayName || cred.user.email?.split("@")[0] || "Academic Author";
      const profile = {
        uid: cred.user.uid,
        name: resolvedName,
        email: cred.user.email,
        role: "author",
        affiliation: "Academic Institution",
        created_at: new Date().toISOString()
      };

      if (db) {
        try {
          const userDocRef = doc(db, "users", cred.user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            profile.role = (data.role || "author").toLowerCase().trim();
            profile.name = data.name || resolvedName;
            profile.affiliation = data.affiliation || "Academic Institution";
          } else {
            setDoc(userDocRef, profile, { merge: true }).catch(() => {});
          }
        } catch (dbErr) {
          console.warn("Firestore profile read warning during Google login:", dbErr);
        }
      }

      setCurrentUser({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: profile.name
      });
      setUserProfile(profile);
      localStorage.setItem("confhub_demo_user", JSON.stringify(profile));
      return true;
    } catch (err) {
      console.error("Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to authenticate with Google.");
      }
      return false;
    } finally {
      skipNextProfileSyncRef.current = false;
    }
  };

  // Self-service registration always creates an Author account. There is no
  // role parameter here at all - not "defaults to author", genuinely absent -
  // so there is nothing for a caller, a modified request, or a direct SDK
  // call bypassing this function's own UI to override. Organizer and Reviewer
  // accounts only ever come from an existing organizer promoting someone via
  // updateUserRole() (see firebaseService.js + the Organizer portal's User
  // Management tab); firestore.rules' users/{uid} create rule enforces the
  // same constraint again, independently, at the database layer (see there).
  const register = async ({ name, email, password, affiliation }) => {
    setAuthError(null);
    skipNextProfileSyncRef.current = true;
    try {
      if (!auth || !db) throw new Error("Authentication or database service is not initialized.");

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const profileData = {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        role: "author",
        affiliation: affiliation.trim() || "University / Department",
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, "users", cred.user.uid), profileData);
      setUserProfile(profileData);
      return true;
    } catch (err) {
      console.error("Registration error:", err);
      setAuthError(err.message || "Failed to create account.");
      return false;
    } finally {
      skipNextProfileSyncRef.current = false;
    }
  };

  // Logout
  // Logout
  const logout = async () => {
    localStorage.removeItem("confhub_demo_user");
    try {
      if (auth) await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  const loginAsDemo = (roleOrIdentifier = "organizer") => {
    setAuthError(null);
    const key = String(roleOrIdentifier).toLowerCase().trim();
    const demo =
      DEMO_CREDENTIALS.find(
        (d) => d.role === key || d.email.toLowerCase() === key || d.uid === roleOrIdentifier
      ) || DEMO_CREDENTIALS[0];

    const profile = {
      uid: demo.uid,
      email: demo.email,
      name: demo.name,
      role: demo.role,
      affiliation: demo.affiliation,
      avatar: demo.avatar
    };
    setCurrentUser({
      uid: demo.uid,
      email: demo.email,
      displayName: demo.name
    });
    setUserProfile(profile);
    localStorage.setItem("confhub_demo_user", JSON.stringify(profile));
    return true;
  };

  // currentRole strictly guaranteed to never be null/undefined
  const currentRole = (userProfile?.role || "author").toLowerCase().trim();

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentRole,
        loading,
        authError,
        setAuthError,
        login,
        loginWithGoogle,
        register,
        logout,
        loginAsDemo,
        switchDemoUser: loginAsDemo,
        availableDemoUsers: DEMO_CREDENTIALS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
