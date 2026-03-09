import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import { StudentLayout } from "@/components/TeacherLayout";
import { BookOpen, Clock, CheckCircle, XCircle, ChevronRight, Trophy, RefreshCw } from "lucide-react";

const DIFF_STYLES = {
  beginner: "bg-blue-100 text-blue-700",
  intermediate: "bg-orange-100 text-orange-700",
  advanced: "bg-purple-100 text-purple-700",
};

function QuizCard({ quiz, onStart, attempted }) {
  return (
    <div data-testid={`quiz-card-${quiz.id}`}
      className="bg-white rounded-xl border border-slate-200 p-5 card-hover animate-fade-in-up">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${DIFF_STYLES[quiz.difficulty] || "bg-slate-100 text-slate-600"}`}>
              {quiz.difficulty}
            </span>
            {attempted && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Attempted</span>}
          </div>
          <h3 className="font-semibold text-slate-900 font-heading">{quiz.title}</h3>
          <p className="text-xs text-slate-500 mt-1">{quiz.topic}</p>
        </div>
        <div className="w-10 h-10 bg-[#002FA7]/8 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-[#002FA7]" />
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{quiz.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> {quiz.questions?.length || 5} questions
        </span>
        <button
          onClick={() => onStart(quiz)}
          data-testid={`start-quiz-${quiz.id}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#002FA7] hover:bg-[#002FA7]/90 text-white text-sm font-medium rounded-lg transition-all active:scale-95"
        >
          {attempted ? <><RefreshCw className="w-3.5 h-3.5" /> Retake</> : <>Start <ChevronRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  );
}

export default function StudentQuiz() {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [fullQuiz, setFullQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/quizzes`),
      axios.get(`${API}/quiz-attempts/my`),
    ]).then(([q, a]) => {
      setQuizzes(q.data);
      setAttempts(a.data);
    }).finally(() => setLoading(false));
  }, []);

  const startQuiz = async (quiz) => {
    const { data } = await axios.get(`${API}/quizzes/${quiz.id}`);
    setFullQuiz(data);
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
    startTime.current = Date.now();
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const answerArr = fullQuiz.questions.map((_, i) => answers[i] ?? -1);
    try {
      const { data } = await axios.post(`${API}/quiz-attempts`, {
        quiz_id: activeQuiz.id,
        answers: answerArr,
        time_taken_seconds: timeTaken,
      });
      setResult(data);
      // Refresh attempts
      const a = await axios.get(`${API}/quiz-attempts/my`);
      setAttempts(a.data);
    } finally {
      setSubmitting(false);
    }
  };

  const attemptedIds = new Set(attempts.map(a => a.quiz_id));

  if (loading) return <StudentLayout><div className="flex justify-center items-center min-h-64"><div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" /></div></StudentLayout>;

  // Quiz taking view
  if (activeQuiz && fullQuiz && !result) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button onClick={() => setActiveQuiz(null)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-3">
              ← Back to quizzes
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900 font-heading">{fullQuiz.title}</h1>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span id="timer">In progress</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3">
              <div className="h-full bg-[#002FA7] rounded-full transition-all"
                style={{ width: `${(Object.keys(answers).length / fullQuiz.questions.length) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{Object.keys(answers).length} of {fullQuiz.questions.length} answered</p>
          </div>

          <div className="space-y-5" data-testid="quiz-questions">
            {fullQuiz.questions.map((q, qi) => (
              <div key={qi} data-testid={`question-${qi}`}
                className={`bg-white rounded-xl border p-5 transition-colors ${answers[qi] !== undefined ? "border-[#002FA7]/30" : "border-slate-200"}`}>
                <p className="font-medium text-slate-900 mb-3 text-sm">
                  <span className="text-[#002FA7] font-bold mr-2">Q{qi + 1}.</span>{q.text}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answers[qi] === oi ? "border-[#002FA7] bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                        className="accent-[#002FA7]"
                        data-testid={`q${qi}-opt${oi}`}
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={submitQuiz}
              disabled={submitting || Object.keys(answers).length < fullQuiz.questions.length}
              data-testid="submit-quiz-btn"
              className="px-6 py-2.5 bg-[#002FA7] hover:bg-[#002FA7]/90 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all active:scale-95 flex items-center gap-2"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Submit Quiz</>}
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Results view
  if (result) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto text-center py-10 animate-fade-in-up" data-testid="quiz-result">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.score >= 60 ? "bg-emerald-50" : "bg-red-50"}`}>
            {result.score >= 60 ? <Trophy className="w-10 h-10 text-emerald-500" /> : <XCircle className="w-10 h-10 text-red-400" />}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-1">{result.score}%</h2>
          <p className="text-slate-500 text-sm mb-2">{result.correct} out of {result.total} correct</p>
          <p className="text-base font-medium text-slate-700 mb-6">{result.feedback}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setResult(null); setActiveQuiz(null); }}
              className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Back to Quizzes
            </button>
            <button onClick={() => startQuiz(activeQuiz)}
              data-testid="retry-quiz-btn"
              className="px-5 py-2 bg-[#002FA7] text-white rounded-lg text-sm font-medium hover:bg-[#002FA7]/90 transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Quizzes</h1>
        <p className="text-slate-500 text-sm mt-1">Test your knowledge across all topics. AI tracks your scores to adapt recommendations.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map(quiz => (
          <QuizCard key={quiz.id} quiz={quiz} onStart={startQuiz} attempted={attemptedIds.has(quiz.id)} />
        ))}
      </div>
    </StudentLayout>
  );
}
