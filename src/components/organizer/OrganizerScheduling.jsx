import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Users,
  Building,
  Tag,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";

// Standard preset rooms for conference halls
const PRESET_ROOMS = [
  "Main Auditorium (Hall A)",
  "Turing Lecture Hall (Room 101)",
  "Von Neumann Seminar Room (Room 202)",
  "Lovelace Hall (Room 303)",
  "Shannon Workshop Room (Room 404)"
];

// Standard conference session slots
const PRESET_SLOTS = [
  { label: "09:00 AM - 10:00 AM", start: "09:00", end: "10:00" },
  { label: "10:15 AM - 11:15 AM", start: "10:15", end: "11:15" },
  { label: "11:30 AM - 12:30 PM", start: "11:30", end: "12:30" },
  { label: "01:30 PM - 02:30 PM", start: "13:30", end: "14:30" },
  { label: "02:45 PM - 03:45 PM", start: "14:45", end: "15:45" },
  { label: "04:00 PM - 05:00 PM", start: "16:00", end: "17:00" }
];

// Parse "HH:MM" or "HH:MM AM/PM" into minutes since midnight
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const clean = String(timeStr).trim().toLowerCase();

  // 24-hour format: "14:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  // 12-hour format: "02:30 pm"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3];
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Range format "09:00 AM - 10:00 AM" -> extract start or end depending on input
  return null;
};

// Mathematical interval overlap: startA < endB && startB < endA
export const checkTimeOverlap = (startA, endA, startB, endB) => {
  if (startA === null || endA === null || startB === null || endB === null) return false;
  return startA < endB && startB < endA;
};

// Conflict Detection Engine
export const detectSchedulingConflicts = ({
  paperId,
  authorId,
  authorName,
  room,
  date,
  startTime,
  endTime,
  allPapers
}) => {
  const conflicts = [];
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  if (!room || !date || !startTime || !endTime) {
    return conflicts;
  }

  for (const p of allPapers) {
    // Skip currently evaluated paper
    if (p.id === paperId) continue;
    if (!p.schedule || !p.schedule.date || !p.schedule.room) continue;

    // Must be on the exact same conference date
    if (p.schedule.date !== date) continue;

    const pStartMins = timeToMinutes(p.schedule.startTime);
    const pEndMins = timeToMinutes(p.schedule.endTime);

    const isOverlap =
      pStartMins !== null && pEndMins !== null && startMins !== null && endMins !== null
        ? checkTimeOverlap(startMins, endMins, pStartMins, pEndMins)
        : (p.schedule.time && p.schedule.time.trim() === `${startTime} - ${endTime}`.trim());

    if (!isOverlap) continue;

    // 1. ROOM CONFLICT: Same room + overlapping time on same date
    if (p.schedule.room.trim().toLowerCase() === room.trim().toLowerCase()) {
      conflicts.push({
        type: "room",
        title: "Room Double-Booking Conflict",
        message: `Room "${room}" is already booked on ${date} (${p.schedule.time || `${p.schedule.startTime} - ${p.schedule.endTime}`}) for paper "${p.title}" (Author: ${p.author_name || "Academic Author"}).`,
        conflictingPaper: p
      });
    }

    // 2. SPEAKER CONFLICT: Same author + overlapping time in any session on same date
    const sameAuthor =
      (authorId && p.author_id && authorId === p.author_id) ||
      (authorName && p.author_name && authorName.trim().toLowerCase() === p.author_name.trim().toLowerCase());

    if (sameAuthor) {
      conflicts.push({
        type: "speaker",
        title: "Speaker Overlap Conflict",
        message: `Speaker "${authorName || p.author_name}" is already scheduled to present "${p.title}" at this time in Room "${p.schedule.room}". A speaker cannot be scheduled in two sessions at once.`,
        conflictingPaper: p
      });
    }
  }

  return conflicts;
};

export const OrganizerScheduling = ({ conferences = [], papers = [], onAssignSchedule }) => {
  const [selectedConfFilter, setSelectedConfFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("unscheduled"); // 'unscheduled' | 'timetable'

  // Scheduling Modal State
  const [schedulingPaper, setSchedulingPaper] = useState(null);
  const [sessionName, setSessionName] = useState("Oral Session 1A");
  const [sessionTrack, setSessionTrack] = useState("");
  const [room, setRoom] = useState(PRESET_ROOMS[0]);
  const [customRoom, setCustomRoom] = useState("");
  const [schedDate, setSchedDate] = useState("2026-12-26");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [sessionChair, setSessionChair] = useState("Organizing Committee Chair");
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Eligible papers: Accepted or Finalized manuscripts
  const eligiblePapers = useMemo(() => {
    return papers.filter((p) => {
      const isAcceptedOrFinalized = p.status === "accepted" || p.status === "finalized";
      if (!isAcceptedOrFinalized) return false;
      if (selectedConfFilter !== "all" && p.conference_id !== selectedConfFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchAuthor = p.author_name?.toLowerCase().includes(q);
        const matchTrack = p.track?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchTrack) return false;
      }
      return true;
    });
  }, [papers, selectedConfFilter, searchQuery]);

  const scheduledPapers = useMemo(() => {
    return eligiblePapers.filter((p) => Boolean(p.schedule && p.schedule.room && p.schedule.date));
  }, [eligiblePapers]);

  const unscheduledPapers = useMemo(() => {
    return eligiblePapers.filter((p) => !p.schedule || !p.schedule.room || !p.schedule.date);
  }, [eligiblePapers]);

  // Global Conflict Scanner: Scan all currently scheduled papers for existing conflicts
  const globalConflicts = useMemo(() => {
    const list = [];
    for (let i = 0; i < scheduledPapers.length; i++) {
      for (let j = i + 1; j < scheduledPapers.length; j++) {
        const a = scheduledPapers[i];
        const b = scheduledPapers[j];
        if (a.schedule.date !== b.schedule.date) continue;

        const startA = timeToMinutes(a.schedule.startTime);
        const endA = timeToMinutes(a.schedule.endTime);
        const startB = timeToMinutes(b.schedule.startTime);
        const endB = timeToMinutes(b.schedule.endTime);

        if (checkTimeOverlap(startA, endA, startB, endB)) {
          if (a.schedule.room?.toLowerCase() === b.schedule.room?.toLowerCase()) {
            list.push({
              id: `room-${a.id}-${b.id}`,
              type: "room",
              message: `Room Overlap: "${a.schedule.room}" double-booked on ${a.schedule.date} between "${a.title}" and "${b.title}".`
            });
          }
          const sameAuthor =
            (a.author_id && b.author_id && a.author_id === b.author_id) ||
            (a.author_name && b.author_name && a.author_name.toLowerCase() === b.author_name.toLowerCase());
          if (sameAuthor) {
            list.push({
              id: `speaker-${a.id}-${b.id}`,
              type: "speaker",
              message: `Speaker Overlap: Author "${a.author_name}" scheduled concurrently in two sessions on ${a.schedule.date}.`
            });
          }
        }
      }
    }
    return list;
  }, [scheduledPapers]);

  // Live modal conflict detection
  const currentModalConflicts = useMemo(() => {
    if (!schedulingPaper) return [];
    const activeRoom = isCustomRoom ? customRoom.trim() : room;
    return detectSchedulingConflicts({
      paperId: schedulingPaper.id,
      authorId: schedulingPaper.author_id,
      authorName: schedulingPaper.author_name,
      room: activeRoom,
      date: schedDate,
      startTime,
      endTime,
      allPapers: papers
    });
  }, [schedulingPaper, isCustomRoom, customRoom, room, schedDate, startTime, endTime, papers]);

  const handleOpenScheduleModal = (paper) => {
    setSchedulingPaper(paper);
    const existing = paper.schedule || {};
    setSessionName(existing.session_name || `${paper.track || "Track"} Session`);
    setSessionTrack(existing.track || paper.track || "General Track");
    if (existing.room && !PRESET_ROOMS.includes(existing.room)) {
      setIsCustomRoom(true);
      setCustomRoom(existing.room);
      setRoom(PRESET_ROOMS[0]);
    } else {
      setIsCustomRoom(false);
      setRoom(existing.room || PRESET_ROOMS[0]);
      setCustomRoom("");
    }
    setSchedDate(existing.date || "2026-12-26");
    setStartTime(existing.startTime || "09:00");
    setEndTime(existing.endTime || "10:00");
    setSessionChair(existing.session_chair || existing.chair || "Session Chair");
  };

  const handlePresetSlotChange = (slotIndex) => {
    const slot = PRESET_SLOTS[slotIndex];
    if (slot) {
      setStartTime(slot.start);
      setEndTime(slot.end);
    }
  };

  const handleSaveScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schedulingPaper) return;

    if (currentModalConflicts.length > 0) {
      alert("Please resolve the scheduling conflict before assigning this slot.");
      return;
    }

    const effectiveRoom = isCustomRoom ? customRoom.trim() : room;
    if (!effectiveRoom) {
      alert("Please designate a conference room or hall.");
      return;
    }

    const formattedTime = `${startTime} - ${endTime}`;

    const schedulePayload = {
      session_name: sessionName.trim(),
      track: sessionTrack.trim(),
      room: effectiveRoom,
      date: schedDate,
      time: formattedTime,
      startTime,
      endTime,
      session_chair: sessionChair.trim(),
      chair: sessionChair.trim()
    };

    setSavingSchedule(true);
    try {
      if (onAssignSchedule) {
        await onAssignSchedule(schedulingPaper.id, schedulePayload);
      }
      setStatusMessage(`Schedule confirmed for "${schedulingPaper.title}". Published to Author timetable.`);
      setTimeout(() => setStatusMessage(null), 4000);
      setSchedulingPaper(null);
    } catch (err) {
      console.error("Failed to assign schedule:", err);
      alert("Failed to save schedule. Please check console for details.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleClearSchedule = async (paper) => {
    if (window.confirm(`Remove schedule for "${paper.title}"? Paper will return to unscheduled queue.`)) {
      try {
        if (onAssignSchedule) {
          await onAssignSchedule(paper.id, null);
        }
        setStatusMessage(`Slot unassigned for "${paper.title}".`);
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err) {
        console.error("Failed to clear schedule:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER BANNER                                             */}
      {/* ========================================================= */}
      <div className="border-b border-beige-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest uppercase text-ink-500 font-bold">
              Organizer Executive Portal • Program Scheduling
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-beige-100 text-ink-700 border border-beige-300">
              Program Committee
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink-900 mt-1">
            Conference Program Scheduling & Timetable Builder
          </h2>
          <p className="text-xs text-ink-600 mt-1 max-w-2xl leading-relaxed">
            Build formal conference sessions by assigning <strong>accepted and finalized manuscripts</strong> to dedicated rooms, dates, and time slots. Automated conflict detection prevents room double-booking and speaker concurrency issues.
          </p>
        </div>

        {/* Global Conflict Status Badge */}
        <div className="shrink-0">
          {globalConflicts.length === 0 ? (
            <div className="p-3 bg-sage-50 border border-sage-600 text-sage-800 rounded-sm flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
              <div>
                <span className="font-serif font-bold block">Timetable Integrity Clean</span>
                <span className="text-[10px] text-sage-700 font-mono">0 Room or Speaker Overlaps</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-terracotta-50 border border-terracotta-600 text-terracotta-800 rounded-sm flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-terracotta-700 shrink-0" />
              <div>
                <span className="font-serif font-bold block">{globalConflicts.length} Conflict(s) Detected</span>
                <span className="text-[10px] text-terracotta-700 font-mono">Double-booking detected below</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Notification */}
      {statusMessage && (
        <div className="p-3 bg-sage-50 border border-sage-600 text-sage-800 text-xs rounded-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Global Conflicts Alert Box */}
      {globalConflicts.length > 0 && (
        <div className="p-4 bg-terracotta-50 border border-terracotta-300 rounded-sm space-y-2 text-xs">
          <div className="font-serif font-bold text-terracotta-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-terracotta-700" />
            Active Schedule Conflicts Detected Across Program:
          </div>
          <ul className="space-y-1 pl-5 list-disc text-terracotta-800 text-[11px]">
            {globalConflicts.map((c) => (
              <li key={c.id}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================= */}
      {/* METRIC CARDS                                              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-beige-200 rounded-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500 block">
            Eligible Manuscripts
          </span>
          <span className="font-serif font-bold text-xl text-ink-900 mt-1 block">
            {eligiblePapers.length}
          </span>
          <span className="text-[10px] text-ink-400">Accepted or Finalized</span>
        </div>

        <div className="p-4 bg-white border border-beige-200 rounded-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500 block">
            Scheduled on Program
          </span>
          <span className="font-serif font-bold text-xl text-sage-700 mt-1 block">
            {scheduledPapers.length}
          </span>
          <span className="text-[10px] text-sage-600">Visible to Authors</span>
        </div>

        <div className="p-4 bg-white border border-beige-200 rounded-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500 block">
            Awaiting Scheduling
          </span>
          <span className="font-serif font-bold text-xl text-amber-700 mt-1 block">
            {unscheduledPapers.length}
          </span>
          <span className="text-[10px] text-amber-600">Pending room/time</span>
        </div>

        <div className="p-4 bg-white border border-beige-200 rounded-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500 block">
            Conference Rooms Active
          </span>
          <span className="font-serif font-bold text-xl text-ink-800 mt-1 block">
            {new Set(scheduledPapers.map((p) => p.schedule?.room).filter(Boolean)).size}
          </span>
          <span className="text-[10px] text-ink-400">Distinct lecture venues</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTROLS: CONFERENCE FILTER, SEARCH, & SUB-TABS          */}
      {/* ========================================================= */}
      <div className="bg-white border border-beige-200 p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-Tab Switcher */}
        <div className="flex border-b border-beige-200 md:border-b-0 gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab("unscheduled")}
            className={`pb-2 md:pb-0 text-xs font-serif font-bold uppercase tracking-wider border-b-2 md:border-b-0 ${
              activeSubTab === "unscheduled"
                ? "border-ink-900 text-ink-900 underline"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            Unscheduled Queue ({unscheduledPapers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("timetable")}
            className={`pb-2 md:pb-0 text-xs font-serif font-bold uppercase tracking-wider border-b-2 md:border-b-0 ${
              activeSubTab === "timetable"
                ? "border-ink-900 text-ink-900 underline"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            Master Timetable & Program ({scheduledPapers.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Conference Filter */}
          <select
            value={selectedConfFilter}
            onChange={(e) => setSelectedConfFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-serif border border-beige-300 rounded-sm bg-beige-50"
          >
            <option value="all">All Conferences</option>
            {conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.substring(0, 35)}...
              </option>
            ))}
          </select>

          {/* Search Field */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paper or author..."
              className="pl-8 pr-3 py-1.5 text-xs border border-beige-300 rounded-sm w-44 focus:w-56 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: UNSCHEDULED QUEUE                             */}
      {/* ========================================================= */}
      {activeSubTab === "unscheduled" && (
        <div className="space-y-4">
          {unscheduledPapers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm space-y-2">
              <CheckCircle2 className="w-10 h-10 text-sage-600 mx-auto" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                All Accepted Papers Are Scheduled!
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto">
                There are no unscheduled accepted manuscripts awaiting room or time assignments. Check the Master Timetable tab to review the complete conference schedule.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab("timetable")}
                className="mt-2 px-3 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50 rounded-sm"
              >
                View Program Timetable
              </button>
            </div>
          ) : (
            <div className="bg-white border border-beige-200 rounded-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-beige-100 border-b border-beige-200 font-serif font-bold text-ink-800">
                  <tr>
                    <th className="p-3">Manuscript Details</th>
                    <th className="p-3">Conference & Track</th>
                    <th className="p-3">Author & Speaker</th>
                    <th className="p-3">Workflow State</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-200">
                  {unscheduledPapers.map((paper) => {
                    const conf = conferences.find((c) => c.id === paper.conference_id);

                    return (
                      <tr key={paper.id} className="hover:bg-beige-50/50 transition-colors">
                        <td className="p-3 max-w-md">
                          <div className="font-serif font-bold text-ink-900 leading-snug">
                            {paper.title}
                          </div>
                          <div className="text-[10px] text-ink-500 font-mono mt-0.5">
                            ID: {paper.id}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-serif font-semibold text-ink-800">
                            {conf?.title || "Conference"}
                          </div>
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            Track: <span className="font-mono">{paper.track}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-serif font-bold text-ink-900">
                            {paper.author_name}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            {paper.author_email || "Registered Author"}
                          </div>
                        </td>

                        <td className="p-3">
                          <span className={`text-[10px] font-serif font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            paper.status === "finalized"
                              ? "bg-sage-50 border-sage-600 text-sage-700"
                              : "bg-beige-100 border-beige-300 text-ink-800"
                          }`}>
                            {paper.status}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenScheduleModal(paper)}
                            className="px-3 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50 hover:bg-ink-800 rounded-sm inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Build Session Slot
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: MASTER PROGRAM TIMETABLE                       */}
      {/* ========================================================= */}
      {activeSubTab === "timetable" && (
        <div className="space-y-4">
          {scheduledPapers.length === 0 ? (
            <div className="bg-white border border-beige-200 p-12 text-center rounded-sm space-y-2">
              <CalendarDays className="w-10 h-10 text-ink-400 mx-auto" />
              <h3 className="font-serif font-bold text-sm text-ink-800">
                No Presentations Scheduled Yet
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto">
                Use the "Unscheduled Queue" tab to assign accepted manuscripts to rooms, dates, and times. Once scheduled, they will populate this master program and appear in the Author's schedule.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab("unscheduled")}
                className="mt-2 px-3 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50 rounded-sm"
              >
                Go to Unscheduled Queue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledPapers.map((paper) => {
                const conf = conferences.find((c) => c.id === paper.conference_id);
                const sched = paper.schedule;

                return (
                  <div
                    key={paper.id}
                    className="bg-white border border-beige-200 p-5 rounded-sm space-y-3.5 shadow-2xs hover:border-ink-800 transition-colors"
                  >
                    {/* Conference & Track Tag */}
                    <div className="flex items-start justify-between gap-2 border-b border-beige-200 pb-2.5">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-500">
                          {conf?.title || "Academic Conference"}
                        </span>
                        <h4 className="font-serif font-bold text-sm text-ink-900 mt-0.5">
                          {sched.session_name || "Presentation Session"}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(paper)}
                          className="p-1.5 text-ink-600 hover:text-ink-900 rounded hover:bg-beige-100 transition"
                          title="Edit / Reschedule Slot"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearSchedule(paper)}
                          className="p-1.5 text-terracotta-600 hover:text-terracotta-900 rounded hover:bg-terracotta-50 transition"
                          title="Unassign / Remove from Timetable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Paper Title */}
                    <div>
                      <h3 className="font-serif text-sm font-bold text-ink-900 leading-snug">
                        {paper.title}
                      </h3>
                      <div className="text-[11px] text-ink-600 mt-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                        <span>Speaker: <strong>{paper.author_name}</strong> ({paper.author_email || "Author"})</span>
                      </div>
                    </div>

                    {/* Schedule Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-beige-50 border border-beige-200 rounded-sm text-xs">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-ink-400 block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-ink-500" /> Room
                        </span>
                        <strong className="font-serif text-ink-900 block mt-0.5 truncate" title={sched.room}>
                          {sched.room}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-ink-400 block flex items-center gap-1">
                          <Clock className="w-3 h-3 text-ink-500" /> Time Slot
                        </span>
                        <strong className="font-serif text-ink-900 block mt-0.5">
                          {sched.time}
                        </strong>
                        <span className="text-[10px] text-ink-500 font-mono block">{sched.date}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-ink-400 block flex items-center gap-1">
                          <Tag className="w-3 h-3 text-ink-500" /> Track & Chair
                        </span>
                        <strong className="font-serif text-ink-900 block mt-0.5 truncate" title={sched.track || paper.track}>
                          {sched.track || paper.track}
                        </strong>
                        <span className="text-[10px] text-ink-500 truncate block" title={sched.session_chair || sched.chair}>
                          {sched.session_chair || sched.chair || "Session Committee"}
                        </span>
                      </div>
                    </div>

                    {/* Author Live Status Indicator */}
                    <div className="pt-2 border-t border-beige-200 flex items-center justify-between text-[11px] text-ink-500">
                      <span className="flex items-center gap-1 text-sage-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Published to Author "My Schedule"
                      </span>
                      <span className="font-mono text-[10px]">Slot ID: {paper.id.substring(0, 8)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BUILD / EDIT SESSION SLOT                         */}
      {/* ========================================================= */}
      {schedulingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs">
          <div className="bg-white border border-beige-300 w-full max-w-xl p-6 rounded-sm space-y-4 max-h-[92vh] overflow-y-auto shadow-lg">
            
            {/* Modal Header */}
            <div className="border-b border-beige-200 pb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-500">
                  Assign Program Session Slot
                </span>
                <h3 className="font-serif font-bold text-base text-ink-900 mt-0.5">
                  Build Session for "{schedulingPaper.title}"
                </h3>
                <p className="text-xs text-ink-600 mt-0.5">
                  Author / Presenter: <strong>{schedulingPaper.author_name}</strong> • Track: {schedulingPaper.track}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSchedulingPaper(null)}
                className="text-ink-400 hover:text-ink-900 text-lg leading-none font-bold"
              >
                &times;
              </button>
            </div>

            {/* Conflict Detection Banner in Modal */}
            {currentModalConflicts.length > 0 ? (
              <div className="p-3 bg-terracotta-50 border border-terracotta-400 text-terracotta-900 text-xs rounded-sm space-y-1">
                <div className="font-serif font-bold flex items-center gap-1.5 text-terracotta-800">
                  <AlertTriangle className="w-4 h-4 text-terracotta-700 shrink-0" />
                  Scheduling Conflict Detected:
                </div>
                {currentModalConflicts.map((c, i) => (
                  <p key={i} className="text-[11px] text-terracotta-800 leading-snug pl-5">
                    • {c.message}
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-sage-50 border border-sage-500 text-sage-800 text-xs rounded-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                <span className="text-[11px]">
                  ✓ <strong>No Conflicts:</strong> Room and speaker are completely available during this time slot.
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveScheduleSubmit} className="space-y-3.5">
              
              {/* Session Name & Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                    Session Title <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g. Session 1A: Neural Systems"
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                    Session Track <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionTrack}
                    onChange={(e) => setSessionTrack(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                  />
                </div>
              </div>

              {/* Room Selection (With Custom Option) */}
              <div>
                <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                  Assigned Conference Room <span className="text-terracotta-700">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    disabled={isCustomRoom}
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50 disabled:opacity-50"
                  >
                    {PRESET_ROOMS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-ink-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCustomRoom}
                        onChange={(e) => setIsCustomRoom(e.target.checked)}
                      />
                      <span>Custom Room</span>
                    </label>
                    {isCustomRoom && (
                      <input
                        type="text"
                        required
                        value={customRoom}
                        onChange={(e) => setCustomRoom(e.target.value)}
                        placeholder="e.g. Seminar Hall C-3"
                        className="flex-1 px-2.5 py-1 text-xs border border-beige-300 rounded-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Preset Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                    Session Date <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                    Preset Slot Template
                  </label>
                  <select
                    onChange={(e) => handlePresetSlotChange(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm bg-beige-50"
                  >
                    <option value="">Select standard slot...</option>
                    {PRESET_SLOTS.map((s, idx) => (
                      <option key={s.label} value={idx}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Precise Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-beige-50 border border-beige-200 rounded-sm">
                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1 text-ink-800">
                    Start Time (24h) <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-beige-300 rounded-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-bold mb-1 text-ink-800">
                    End Time (24h) <span className="text-terracotta-700">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-beige-300 rounded-sm bg-white"
                  />
                </div>
              </div>

              {/* Session Chair */}
              <div>
                <label className="block text-xs font-serif font-bold mb-1 text-ink-800">
                  Session Chair / Moderator
                </label>
                <input
                  type="text"
                  value={sessionChair}
                  onChange={(e) => setSessionChair(e.target.value)}
                  placeholder="e.g. Prof. Eleanor Vance (MIT)"
                  className="w-full px-2.5 py-1.5 text-xs border border-beige-300 rounded-sm"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-beige-200">
                <button
                  type="button"
                  onClick={() => setSchedulingPaper(null)}
                  className="px-3 py-1.5 text-xs font-serif border border-beige-300 hover:bg-beige-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule || currentModalConflicts.length > 0}
                  className="px-4 py-1.5 text-xs font-serif font-bold bg-ink-900 text-beige-50 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-800 shadow-xs"
                >
                  {savingSchedule ? "Publishing Schedule..." : "Confirm & Publish Slot"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

