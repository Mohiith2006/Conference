# ConfHub - Conference Management System

A full-stack, enterprise-grade Conference Management System built with **React**, **Tailwind CSS**, and **Firebase** (Authentication, Firestore, and Storage). Features **Role-Based Access Control (RBAC)** across three portals: **Organizer**, **Reviewer**, and **Author**.

---

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

3. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🎭 Role-Based Portals & Demo Accounts

The application has pre-configured 1-click persona switching in the navigation bar to test all RBAC roles immediately:

| Role | Demo User | Email | Affiliation |
|---|---|---|---|
| **Author** | Dr. Sarah Chen | `author@confhub.org` | Carnegie Mellon University |
| **Reviewer** | Dr. Marcus Sterling | `reviewer@confhub.org` | Stanford AI Lab |
| **Reviewer #2** | Dr. Sophia Hartmann | `reviewer2@confhub.org` | ETH Zürich |
| **Organizer** | Prof. Eleanor Vance | `organizer@confhub.org` | MIT Computer Science |

---

## 📋 Features Overview

### 1. Database Architecture & Security Rules
- Production [`firestore.rules`](./firestore.rules) enforcing strict author data isolation:
  ```javascript
  resource.data.author_id == request.auth.uid
  ```
- Storage rules in [`storage.rules`](./storage.rules) for PDF manuscripts, camera-ready submissions, and supplementary documents.
- Supports both **live Firebase credentials** (via `.env` or in-app modal) and an instant **zero-setup local simulation mode**.

### 2. Organizer Portal
- **Create Conference Event**: Form with fields for Title, Description, Submission Deadline, Review Deadline, Conference End Date, and Tracks.
- **Visibility Logic**: Publish or save as Draft. Authors only see published conferences.
- **Final Decision Dashboard**: Review aggregated scores, identify **"Best Paper"** nominations flagged by reviewers, issue final Accept/Reject decisions, and assign presentation rooms/times.

### 3. Reviewer Portal
- **Assigned Papers**: Review queue with status badges.
- **Evaluation Matrix**: Score manuscripts on Originality, Technical Rigor, Clarity, Relevance, and Overall (1-5 scale).
- **Anonymized Feedback**: Constructive comments delivered to authors under `Reviewer #{N}` masking.
- **Best Paper Flag**: Nominate standout papers directly to the Organizer.

### 4. Author Portal (5 Dedicated Screens)
- **Screen 1: Submit Paper**: Form with real-time deadline validation (`current_date < submission_deadline`). Button is disabled if deadline has passed.
- **Screen 2: My Submissions**: State machine enforcement (`submitted` is editable/withdrawable; `under_review` is locked; `accepted`/`rejected` unlock anonymized review feedback).
- **Screen 3: Registration & Camera-Ready (Conditional)**: Unlocks for accepted papers. Requires both Camera-Ready PDF upload and Registration & Payment completion before transitioning to `"Finalized"`.
- **Screen 4: My Schedule**: Read-only presentation timetable displaying assigned Room, Date/Time Slot, Track, and `.ics` calendar export.
- **Screen 5: Certificates & Documents**: Presentation Certificate generator that unlocks only after the conference `end_date` has elapsed (downloadable as PDF via jsPDF), plus an unmoderated Document & Patent Library.

---

## 🔧 Connecting to your Live Firebase Project

Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```
Or click the **"Demo Backend / Firebase Live"** button in the top navigation bar inside the running app to paste your credentials.
