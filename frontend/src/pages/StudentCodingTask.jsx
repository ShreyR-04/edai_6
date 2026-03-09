import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import { StudentLayout } from "@/components/TeacherLayout";
import { Code2, ChevronRight, CheckCircle, Clock, Lightbulb, Target, RefreshCw, AlertCircle } from "lucide-react";

const DIFF_STYLES = {
  beginner: "bg-blue-100 text-blue-700",
  intermediate: "bg-orange-100 text-orange-700",
  advanced: "bg-purple-100 text-purple-700",
};

export default function StudentCodingTask() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selfErrors, setSelfErrors] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [loading, setLoading] = useState(true);
  const startTime = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/coding-tasks`),
      axios.get(`${API}/coding-submissions/my`),
    ]).then(([t, s]) => {
      setTasks(t.data);
      setSubmissions(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const openTask = async (task) => {
    const { data } = await axios.get(`${API}/coding-tasks/${task.id}`);
    setActiveTask(data);
    setCode(`# ${data.title}\n# Topic: ${data.topic}\n\n`);
    setResult(null);
    setSelfErrors(0);
    setShowHints(false);
    startTime.current = Date.now();
  };

  const submitCode = async () => {
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const { data } = await axios.post(`${API}/coding-submissions`, {
        task_id: activeTask.id,
        code,
        time_taken_seconds: timeTaken,
        self_reported_errors: selfErrors,
      });
      setResult(data);
      const s = await axios.get(`${API}/coding-submissions/my`);
      setSubmissions(s.data);
    } finally {
      setSubmitting(false);
    }
  };

  const submittedIds = new Set(submissions.map(s => s.task_id));

  if (loading) return <StudentLayout><div className="flex justify-center items-center min-h-64"><div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" /></div></StudentLayout>;

  // Task detail view
  if (activeTask && !result) {
    return (
      <StudentLayout>
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setActiveTask(null)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
            ← Back to tasks
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>Timer running</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Problem description */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DIFF_STYLES[activeTask.difficulty]}`}>
                  {activeTask.difficulty}
                </span>
                <span className="text-xs text-slate-500">{activeTask.topic}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-heading mb-3">{activeTask.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{activeTask.description}</p>
            </div>

            <div className="bg-slate-900 rounded-xl p-4" data-testid="expected-output">
              <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Expected Output</p>
              <code className="text-emerald-400 text-sm font-mono">{activeTask.expected_output}</code>
            </div>

            <button
              onClick={() => setShowHints(!showHints)}
              data-testid="toggle-hints-btn"
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              {showHints ? "Hide hints" : "Show hints"}
            </button>

            {showHints && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2" data-testid="hints-panel">
                {activeTask.hints?.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 text-xs font-bold mt-0.5">#{i + 1}</span>
                    <code className="text-sm text-orange-800 font-mono">{hint}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code editor */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-400 font-mono">solution.py</span>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full p-4 text-sm code-editor bg-slate-950 text-emerald-300 focus:outline-none"
                rows={14}
                spellCheck={false}
                placeholder="# Write your Python code here..."
                data-testid="code-editor"
                onKeyDown={e => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const s = e.target.selectionStart;
                    const v = code.substring(0, s) + "  " + code.substring(e.target.selectionEnd);
                    setCode(v);
                    setTimeout(() => e.target.setSelectionRange(s + 2, s + 2), 0);
                  }
                }}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                How many errors did you encounter while writing this code?
              </label>
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setSelfErrors(n)} data-testid={`error-count-${n}`}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all active:scale-95 ${selfErrors === n ? "bg-[#002FA7] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {n}
                  </button>
                ))}
                <span className="text-xs text-slate-400">errors</span>
              </div>
            </div>

            <button
              onClick={submitCode}
              disabled={submitting || code.trim().length < 10}
              data-testid="submit-code-btn"
              className="w-full py-2.5 bg-[#002FA7] hover:bg-[#002FA7]/90 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Submit Solution</>}
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Result view
  if (result) {
    const scoreColor = result.accuracy >= 80 ? "emerald" : result.accuracy >= 60 ? "yellow" : "red";
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto py-10 animate-fade-in-up" data-testid="coding-result">
          <div className={`bg-white rounded-2xl border p-8 text-center ${scoreColor === "emerald" ? "border-emerald-200" : scoreColor === "yellow" ? "border-yellow-200" : "border-red-200"}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${scoreColor === "emerald" ? "bg-emerald-50" : scoreColor === "yellow" ? "bg-yellow-50" : "bg-red-50"}`}>
              {result.accuracy >= 60 ? <CheckCircle className={`w-10 h-10 text-${scoreColor}-500`} /> : <AlertCircle className="w-10 h-10 text-red-400" />}
            </div>
            <h2 className="text-4xl font-bold text-slate-900 font-heading mb-1">{result.accuracy}%</h2>
            <p className="text-slate-500 text-sm mb-1">Code Accuracy</p>
            <p className="text-slate-500 text-xs mb-4">{result.error_count} error{result.error_count !== 1 ? "s" : ""} detected</p>
            <p className="font-medium text-slate-700 mb-6">{result.feedback}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setResult(null); setActiveTask(null); }}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                Back to Tasks
              </button>
              <button onClick={() => { setResult(null); startTime.current = Date.now(); }}
                data-testid="retry-code-btn"
                className="px-5 py-2 bg-[#002FA7] text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Coding Tasks</h1>
        <p className="text-slate-500 text-sm mt-1">Complete coding challenges. Your accuracy and error rate are tracked to personalise your learning path.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => {
          const sub = submissions.find(s => s.task_id === task.id);
          return (
            <div key={task.id} data-testid={`task-card-${task.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 card-hover animate-fade-in-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DIFF_STYLES[task.difficulty]}`}>{task.difficulty}</span>
                    {sub && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {sub.accuracy?.toFixed(0)}% acc</span>}
                  </div>
                  <h3 className="font-semibold text-slate-900 font-heading">{task.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{task.topic}</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{task.description}</p>
              <button onClick={() => openTask(task)} data-testid={`open-task-${task.id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#002FA7] hover:bg-[#002FA7]/90 text-white text-sm font-medium rounded-lg transition-all active:scale-95">
                {sub ? <><RefreshCw className="w-3.5 h-3.5" /> Reattempt</> : <><Target className="w-3.5 h-3.5" /> Open Task<ChevronRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          );
        })}
      </div>
    </StudentLayout>
  );
}
