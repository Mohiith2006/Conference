import React, { useState } from "react";
import { AuthorSidebar } from "../layout/AuthorSidebar";
import { Screen1_SubmitPaper } from "./Screen1_SubmitPaper";
import { Screen2_MySubmissions } from "./Screen2_MySubmissions";
import { Screen3_RegistrationCameraReady } from "./Screen3_RegistrationCameraReady";
import { Screen4_MySchedule } from "./Screen4_MySchedule";
import { Screen5_CertificatesDocs } from "./Screen5_CertificatesDocs";

export const AuthorPortal = () => {
  // Active screen state among the exact 5 Author screens
  const [activeScreen, setActiveScreen] = useState("submit");

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation for 5 Screens */}
      <AuthorSidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
      />

      {/* Main Screen Content */}
      <main className="flex-1 min-w-0">
        {activeScreen === "submit" && (
          <Screen1_SubmitPaper onSuccess={() => setActiveScreen("submissions")} />
        )}
        {activeScreen === "submissions" && (
          <Screen2_MySubmissions onNavigateToScreen={setActiveScreen} />
        )}
        {activeScreen === "registration" && (
          <Screen3_RegistrationCameraReady onNavigateToScreen={setActiveScreen} />
        )}
        {activeScreen === "schedule" && (
          <Screen4_MySchedule />
        )}
        {activeScreen === "certificates" && (
          <Screen5_CertificatesDocs />
        )}
      </main>
    </div>
  );
};
