import React from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Compass, 
  Download, 
  User, 
  CheckCircle2, 
  Info,
  Building,
  Presentation,
  CalendarDays
} from "lucide-react";
import { useConference } from "../../context/ConferenceContext";
import { useAuth } from "../../context/useAuth";

export const Screen4_MySchedule = () => {
  const { papers, conferences } = useConference();
  const { currentUser } = useAuth();

  // Papers by author that have been finalized or have a schedule populated
  const scheduledPapers = papers.filter(
    (p) => p.author_id === currentUser?.uid && (p.status === "finalized" || p.schedule)
  );

  const getConference = (confId) => {
    return conferences.find((c) => c.id === confId);
  };

  // Generate .ics calendar download
  const handleExportICS = (paper) => {
    const conf = getConference(paper.conference_id);
    const confName = conf?.title || "Conference";
    const room = paper.schedule?.room || "Conference Hall";
    const time = paper.schedule?.time || "TBD";
    const date = paper.schedule?.date || "TBD";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ConfHub//Academic Presentation Schedule//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Oral Presentation: ${paper.title.replace(/,/g, "")}`,
      `DESCRIPTION:Author Presentation for paper "${paper.title}" in track ${paper.track} at ${confName}.`,
      `LOCATION:${room}`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Presentation_${paper.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 mb-2">
          Author Portal • Screen 4 of 5
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Presentation Schedule & Timetable
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Official read-only session timetable detailing the <strong>Room, Time Slot, and Track</strong> for your finalized papers.
        </p>
      </div>

      {scheduledPapers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Scheduled Presentations Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Papers must complete the acceptance, camera-ready upload, and registration steps to appear on the official conference program schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {scheduledPapers.map((paper) => {
            const conf = getConference(paper.conference_id);
            const schedule = paper.schedule || {
              room: "Main Auditorium Hall A",
              date: "Conference Day 1",
              time: "10:30 AM - 11:00 AM",
              track: paper.track,
              session_chair: "Organizing Committee"
            };

            return (
              <div
                key={paper.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Conference Title Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">
                        {conf?.title || "Academic Conference"}
                      </span>
                      <h2 className="text-lg font-bold leading-snug">
                        {paper.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => handleExportICS(paper)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Add to Calendar (.ics)
                    </button>
                  </div>
                </div>

                {/* Timetable Specs Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* ROOM */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Assigned Room
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {schedule.room}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Podium with A/V projection & mic
                        </p>
                      </div>
                    </div>

                    {/* TIME */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Date & Presentation Slot
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {schedule.time}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {schedule.date || "Scheduled Date"} (20 min talk + 10 min Q&A)
                        </p>
                      </div>
                    </div>

                    {/* TRACK */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Session Track
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {schedule.track || paper.track}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Chair: {schedule.session_chair || "Dr. Committee Lead"}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Presenter Guidelines */}
                  <div className="mt-5 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Speaker Instructions:</strong> Please arrive at least 15 minutes before your session start to connect your laptop or transfer slides to the session technician. You can upload presentation slides in Screen 5 (Document Library).
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
