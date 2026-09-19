import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { SplitPaneLogin } from "./components/auth/SplitPaneLogin";
import { AppShell } from "./components/layout/AppShell";
import { AuthorTabs } from "./components/author/AuthorTabs";
import { OrganizerTabs } from "./components/organizer/OrganizerTabs";
import { ReviewerTabs } from "./components/reviewer/ReviewerTabs";

const TABS_BY_ROLE = {
  organizer: ["conferences", "decisions", "scheduling", "users"],
  reviewer: ["assigned", "history"],
  author: ["overview", "submit", "submissions", "registration", "schedule", "certificates"],
};

const defaultTabForRole = (role) => (role === "organizer" ? "conferences" : role === "reviewer" ? "assigned" : "overview");

const PortalRouter = () => {
  const { currentUser, currentRole, loading } = useAuth();
  const role = (currentRole || "author").toLowerCase().trim();
  const [activeTab, setActiveTab] = useState(defaultTabForRole(role));

  // Reset to a role-appropriate default tab when the role changes, without an
  // effect: adjusting state directly during render avoids the extra commit +
  // re-render pass an effect+setState would cause (see react.dev "You Might
  // Not Need An Effect" - adjusting state when a prop changes).
  const [prevRole, setPrevRole] = useState(role);
  if (role !== prevRole) {
    setPrevRole(role);
    setActiveTab((prev) => (TABS_BY_ROLE[role]?.includes(prev) ? prev : defaultTabForRole(role)));
  }

  // Not logged in -> Split-pane login screen
  if (!currentUser) {
    return (
      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-beige-200 overflow-hidden z-50">
            <div className="w-full h-full bg-ink-800 animate-pulse origin-left"></div>
          </div>
        )}
        <SplitPaneLogin />
      </div>
    );
  }

  // STRICT RBAC: Render user's portal with full 5 tabs for authors
  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {role === "organizer" ? (
        <OrganizerTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : role === "reviewer" ? (
        <ReviewerTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <AuthorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PortalRouter />
    </AuthProvider>
  );
}
