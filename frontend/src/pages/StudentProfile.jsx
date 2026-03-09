import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import TeacherLayout from "@/components/TeacherLayout";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  ArrowLeft, AlertTriangle, TrendingUp, BookOpen, Code2,
  PlayCircle, BookMarked, Rocket, Wrench, Zap, ClipboardCheck, Star
} from "lucide-react";

const TOPIC_COLORS = ["#002FA7", "#F97316", "#10B981", "#6366F1", "#F59E0B"];
const DIFF_STYLES = {
  beginner: "bg-blue-100 text-blue-700",
  intermediate: "bg-orange-100 text-orange-700",
  advanced: "bg-emerald-100 text-emerald-700",
};
const ICON_MAP = { BookOpen, Code2, AlertTriangle, Rocket, BookMarked, Zap, ClipboardCheck, Wrench, Star, TrendingUp, PlayCircle };

export default function StudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/student/${id}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  const buildTopicData = () => {
    if (!data?.metrics?.topic_mastery) return [];
    return Object.entries(data.metrics.topic_mastery).map(([topic, score], i) => ({
      topic: topic.length > 10 ? topic.substring(0, 10) + "…" : topic,
      fullTopic: topic,
      score,
      fill: TOPIC_COLORS[i % TOPIC_COLORS.length],
    }));
  };

  const buildChartData = () => {
    if (!data?.metrics?.history) return [];
    const byDate = {};
    data.metrics.history.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { date: item.date };
      if (item.type === "quiz") byDate[item.date].quiz = item.score;
      else byDate[item.date].coding = item.score;
    });
    return Object.values(byDate).slice(-12);
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  if (!data) {
    return (
      <TeacherLayout>
        <div className="p-6">
          <p className="text-slate-500">Student not found.</p>
        </div>
      </TeacherLayout>
    );
  }

  const { student, metrics } = data;
  const topicData = buildTopicData();
  const chartData = buildChartData();

  return (
    <TeacherLayout>
      <div className="p-6 space-y-5">
        {/* Back + header */}
        <div className="animate-fade-in-up">
          <Link to="/teacher/students" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#002FA7] rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">{student.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 font-heading" data-testid="student-name">{student.name}</h1>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${DIFF_STYLES[metrics.predicted_difficulty] || "bg-slate-100 text-slate-600"}`} data-testid="student-difficulty">
                  {metrics.predicted_difficulty} level
                </span>
                {metrics.skill_score < 50 && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-full" data-testid="at-risk-badge">
                    <AlertTriangle className="w-3 h-3" /> At Risk
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-0.5">{student.email} · {student.grade || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Skill Score", value: metrics.skill_score, icon: TrendingUp, color: "bg-blue-50 text-[#002FA7]", testId: "profile-skill-score" },
            { label: "Quiz Average", value: `${metrics.quiz_avg}%`, icon: BookOpen, color: "bg-orange-50 text-orange-500", testId: "profile-quiz-avg" },
            { label: "Coding Accuracy", value: `${metrics.coding_accuracy}%`, icon: Code2, color: "bg-emerald-50 text-emerald-500", testId: "profile-coding-acc" },
            { label: "Watch Completion", value: `${metrics.watch_completion}%`, icon: PlayCircle, color: "bg-purple-50 text-purple-500", testId: "profile-watch" },
          ].map(({ label, value, icon: Icon, color, testId }) => (
            <div key={label} data-testid={testId} className="bg-white rounded-xl border border-slate-200 p-4 card-hover animate-fade-in-up">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-heading">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-2">
            <h3 className="font-semibold text-slate-900 font-heading mb-4">Performance History</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#002FA7" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#002FA7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="quiz" name="Quiz" stroke="#002FA7" fill="url(#qGrad2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="coding" name="Coding" stroke="#F97316" fill="url(#cGrad2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No activity data yet.</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-3">
            <h3 className="font-semibold text-slate-900 font-heading mb-4">Topic Mastery</h3>
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topicData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v, _, p) => [`${v}%`, p.payload.fullTopic]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {topicData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No topic data.</div>
            )}
          </div>
        </div>

        {/* Weak / Strong topics + Recommendations */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-4">
            <h3 className="font-semibold text-slate-900 font-heading mb-3" data-testid="weak-areas-title">Areas Needing Attention</h3>
            {metrics.weak_topics?.length > 0 ? (
              <div className="space-y-2">
                {metrics.weak_topics.map(topic => (
                  <div key={topic} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg" data-testid={`weak-${topic}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{topic}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600">{metrics.topic_mastery[topic]?.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-3">No weak areas — performing well!</p>
            )}

            {metrics.strong_topics?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Strong Areas</p>
                {metrics.strong_topics.map(topic => (
                  <div key={topic} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{topic}</span>
                    <span className="text-xs font-bold text-emerald-600">{metrics.topic_mastery[topic]?.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-5">
            <h3 className="font-semibold text-slate-900 font-heading mb-3" data-testid="ai-recommendations-title">AI Recommendations</h3>
            {metrics.recommendations?.length > 0 ? (
              <div className="space-y-2.5 overflow-y-auto max-h-64">
                {metrics.recommendations.map((rec, i) => {
                  const IconComp = ICON_MAP[rec.icon] || BookOpen;
                  const ps = { high: "border-red-200 bg-red-50", medium: "border-yellow-200 bg-yellow-50", low: "border-emerald-200 bg-emerald-50" };
                  const pl = { high: "text-red-600 bg-red-100", medium: "text-yellow-700 bg-yellow-100", low: "text-emerald-700 bg-emerald-100" };
                  return (
                    <div key={i} className={`p-3 rounded-xl border ${ps[rec.priority] || "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                          <IconComp className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-relaxed">{rec.text}</p>
                        </div>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${pl[rec.priority]}`}>{rec.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-3">No recommendations yet.</p>
            )}
          </div>
        </div>

        {/* Activity summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up">
          <h3 className="font-semibold text-slate-900 font-heading mb-4">Activity Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Quiz Attempts", value: metrics.total_quizzes, icon: BookOpen, color: "text-[#002FA7]" },
              { label: "Code Submissions", value: metrics.total_coding, icon: Code2, color: "text-orange-500" },
              { label: "Lessons Watched", value: metrics.total_watch_sessions, icon: PlayCircle, color: "text-emerald-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center p-4 bg-slate-50 rounded-xl">
                <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-slate-900 font-heading">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
