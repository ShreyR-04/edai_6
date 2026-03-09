import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import { StudentLayout } from "@/components/TeacherLayout";
import { PlayCircle, CheckCircle, Clock, BookOpen, X } from "lucide-react";

const DIFF_STYLES = {
  beginner: "bg-blue-100 text-blue-700",
  intermediate: "bg-orange-100 text-orange-700",
  advanced: "bg-purple-100 text-purple-700",
};

function formatDuration(secs) {
  return `${Math.floor(secs / 60)} min`;
}

export default function StudentLessons() {
  const [lessons, setLessons] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [watching, setWatching] = useState(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/lessons`),
      axios.get(`${API}/watch-sessions/my`),
    ]).then(([l, s]) => {
      setLessons(l.data);
      setSessions(s.data);
    }).finally(() => setLoading(false));
    return () => clearInterval(intervalRef.current);
  }, []);

  const startWatching = (lesson) => {
    clearInterval(intervalRef.current);
    setWatching(lesson);
    setWatchProgress(0);
    let progress = 0;
    intervalRef.current = setInterval(() => {
      progress += 1.5;
      setWatchProgress(Math.min(100, Math.round(progress)));
      if (progress >= 100) clearInterval(intervalRef.current);
    }, 300);
  };

  const markComplete = async () => {
    setSubmitting(true);
    clearInterval(intervalRef.current);
    try {
      await axios.post(`${API}/watch-sessions`, {
        lesson_id: watching.id,
        watch_time_seconds: watching.duration_seconds,
        completed: true,
      });
      const { data } = await axios.get(`${API}/watch-sessions/my`);
      setSessions(data);
      setWatching(null);
      setWatchProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const closeLesson = async () => {
    clearInterval(intervalRef.current);
    if (watchProgress > 5 && watching) {
      await axios.post(`${API}/watch-sessions`, {
        lesson_id: watching.id,
        watch_time_seconds: Math.round((watchProgress / 100) * watching.duration_seconds),
        completed: false,
      }).catch(() => {});
      const { data } = await axios.get(`${API}/watch-sessions/my`);
      setSessions(data);
    }
    setWatching(null);
    setWatchProgress(0);
  };

  const sessionByLesson = {};
  sessions.forEach(s => { sessionByLesson[s.lesson_id] = s; });

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Lessons</h1>
        <p className="text-slate-500 text-sm mt-1">
          Watch lessons to strengthen your knowledge. Watch time is tracked to personalise your AI recommendations.
        </p>
      </div>

      {/* Watch modal */}
      {watching && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" data-testid="lesson-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DIFF_STYLES[watching.difficulty] || "bg-slate-100 text-slate-600"}`}>
                  {watching.difficulty}
                </span>
                <h2 className="text-lg font-bold text-slate-900 font-heading mt-2">{watching.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{watching.topic} · {formatDuration(watching.duration_seconds)}</p>
              </div>
              <button onClick={closeLesson} data-testid="close-lesson-btn" className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center mb-4 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1766596796538-75b67ff9109c?w=500&q=60"
                alt="lesson thumbnail"
                className="w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <PlayCircle className="w-14 h-14 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold">{watching.title}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {watchProgress < 100 ? "Lesson in progress…" : "Lesson complete!"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Watch progress</span>
                <span>{watchProgress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill bg-[#002FA7]"
                  style={{ width: `${watchProgress}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-5 leading-relaxed">{watching.description}</p>

            <button
              onClick={markComplete}
              disabled={submitting}
              data-testid="mark-complete-btn"
              className="w-full py-2.5 bg-[#002FA7] hover:bg-[#002FA7]/90 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><CheckCircle className="w-4 h-4" /> Mark as Complete</>
              }
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson, i) => {
          const session = sessionByLesson[lesson.id];
          return (
            <div
              key={lesson.id}
              data-testid={`lesson-card-${lesson.id}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="bg-gradient-to-br from-[#002FA7] to-blue-700 p-6 relative h-28 flex items-end">
                <BookOpen className="w-8 h-8 text-white/70" />
                {session && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur rounded-full px-2.5 py-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                    <span className="text-white text-xs font-semibold">{session.completion_pct?.toFixed(0)}%</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DIFF_STYLES[lesson.difficulty] || "bg-slate-100 text-slate-600"}`}>
                    {lesson.difficulty}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(lesson.duration_seconds)}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 font-heading mb-1 leading-snug">{lesson.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{lesson.topic}</p>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{lesson.description}</p>
                {session && (
                  <div className="mb-3">
                    <div className="progress-bar">
                      <div className="progress-fill bg-[#002FA7]" style={{ width: `${session.completion_pct}%` }} />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => startWatching(lesson)}
                  data-testid={`watch-lesson-${lesson.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-[#002FA7] hover:bg-[#002FA7]/90 text-white text-sm font-medium rounded-lg transition-all active:scale-95"
                >
                  <PlayCircle className="w-4 h-4" />
                  {session ? "Rewatch Lesson" : "Watch Lesson"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </StudentLayout>
  );
}
