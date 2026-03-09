import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import TeacherLayout from "@/components/TeacherLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from "recharts";
import {
  Users, AlertTriangle, TrendingUp, Code2, BookOpen,
  ChevronRight, Award, Target
} from "lucide-react";

const TOPIC_COLORS = ["#002FA7", "#F97316", "#10B981", "#6366F1", "#F59E0B"];

function StatCard({ label, value, sub, icon: Icon, color = "blue", testId }) {
  const styles = {
    blue: { bg: "bg-blue-50", icon: "text-[#002FA7]", border: "border-blue-100" },
    orange: { bg: "bg-orange-50", icon: "text-orange-500", border: "border-orange-100" },
    red: { bg: "bg-red-50", icon: "text-red-500", border: "border-red-100" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100" },
  };
  const s = styles[color] || styles.blue;
  return (
    <div data-testid={testId} className="bg-white rounded-xl border border-slate-200 p-5 card-hover animate-fade-in-up">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
        <div className={`w-9 h-9 ${s.bg} border ${s.border} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${s.icon}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 font-heading">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function TeacherDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/teacher`)
      .then(r => setAnalytics(r.data))
      .finally(() => setLoading(false));
  }, []);

  const topicData = analytics
    ? Object.entries(analytics.topic_performance).map(([topic, score], i) => ({
        topic: topic.length > 10 ? topic.substring(0, 10) + "…" : topic,
        fullTopic: topic,
        score,
        fill: TOPIC_COLORS[i % TOPIC_COLORS.length],
      }))
    : [];

  const riskLevel = (score) =>
    score < 35 ? "high" : score < 50 ? "medium" : "low";

  const riskStyle = {
    high: "bg-red-50 border-red-200 text-red-700",
    medium: "bg-orange-50 border-orange-200 text-orange-700",
    low: "bg-yellow-50 border-yellow-200 text-yellow-700",
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

  return (
    <TeacherLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Class Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">AI-powered overview of your class performance and learning trends.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={analytics?.total_students ?? 0}
            sub="Enrolled in your class" icon={Users} testId="total-students-card" color="blue" />
          <StatCard label="At-Risk Students" value={analytics?.at_risk_count ?? 0}
            sub="Skill score below 50" icon={AlertTriangle} testId="at-risk-card" color="red" />
          <StatCard label="Class Quiz Avg" value={`${analytics?.avg_quiz_score ?? 0}%`}
            sub="Average quiz score" icon={BookOpen} testId="class-quiz-avg-card" color="orange" />
          <StatCard label="Coding Accuracy" value={`${analytics?.avg_coding_accuracy ?? 0}%`}
            sub="Class coding average" icon={Code2} testId="class-coding-card" color="green" />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Topic performance chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-2">
            <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="topic-perf-chart-title">
              Topic Performance (Class Average)
            </h3>
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topicData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val, _, props) => [`${val}%`, props.payload.fullTopic]}
                    contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {topicData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet.</div>
            )}
          </div>

          {/* Skill distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-3">
            <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="skill-dist-title">
              Student Skill Distribution
            </h3>
            {analytics?.class_metrics?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analytics.class_metrics.map(m => ({ name: m.name.split(" ")[0], skill: m.skill_score, quiz: m.quiz_avg }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="skill" name="Skill Score" fill="#002FA7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="quiz" name="Quiz Avg" fill="#F97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No student data.</div>
            )}
          </div>
        </div>

        {/* At-risk students */}
        {analytics?.at_risk_students?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 font-heading flex items-center gap-2" data-testid="at-risk-section">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Students Needing Attention
              </h3>
              <Link to="/teacher/students" className="text-xs text-[#002FA7] hover:underline font-medium">
                View all →
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics.at_risk_students.map(s => (
                <Link
                  to={`/teacher/students/${s.id}`}
                  key={s.id}
                  data-testid={`at-risk-student-${s.id}`}
                  className={`block p-4 rounded-xl border transition-all hover:shadow-md ${riskStyle[riskLevel(s.skill_score)]}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{s.name.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-sm">{s.name}</span>
                    </div>
                    <span className="text-lg font-bold">{s.skill_score}</span>
                  </div>
                  <div className="text-xs opacity-80">
                    Quiz avg: {s.quiz_avg}%
                    {s.weak_topics?.length > 0 && (
                      <span className="block mt-0.5">Weak: {s.weak_topics.slice(0, 2).join(", ")}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All students table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 font-heading" data-testid="class-table-title">Class Performance</h3>
            <Link
              to="/teacher/students"
              data-testid="manage-students-btn"
              className="flex items-center gap-1.5 text-sm text-[#002FA7] font-medium hover:underline"
            >
              Manage Students <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Student", "Skill Score", "Quiz Avg", "Coding Acc", "Level", "Action"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {analytics?.class_metrics?.map(m => (
                  <tr key={m.student_id} className="hover:bg-slate-50 transition-colors" data-testid={`class-row-${m.student_id}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#002FA7]/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-[#002FA7]">{m.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-bar">
                          <div className="progress-fill bg-[#002FA7]" style={{ width: `${m.skill_score}%` }} />
                        </div>
                        <span className="font-semibold text-slate-900">{m.skill_score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{m.quiz_avg}%</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{m.coding_accuracy}%</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        m.predicted_difficulty === "advanced" ? "bg-emerald-100 text-emerald-700"
                          : m.predicted_difficulty === "intermediate" ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {m.predicted_difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/teacher/students/${m.student_id}`} data-testid={`view-student-${m.student_id}`}
                        className="text-xs text-[#002FA7] font-medium hover:underline flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
