import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { StudentLayout } from "@/components/TeacherLayout";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  TrendingUp, BookOpen, Code2, PlayCircle, AlertTriangle,
  Rocket, BookMarked, Zap, ClipboardCheck, Wrench, Star
} from "lucide-react";

const DIFF_COLORS = { beginner: "bg-blue-100 text-blue-700", intermediate: "bg-orange-100 text-orange-700", advanced: "bg-emerald-100 text-emerald-700" };
const TOPIC_COLORS = ["#002FA7", "#F97316", "#10B981", "#6366F1", "#F59E0B"];
const ICON_MAP = { BookOpen, Code2, AlertTriangle, Rocket, BookMarked, Zap, ClipboardCheck, Wrench, Star, TrendingUp, PlayCircle };

function StatCard({ label, value, sub, color = "blue", icon: Icon, testId }) {
  return (
    <div data-testid={testId} className="bg-white rounded-xl border border-slate-200 p-5 card-hover animate-fade-in-up">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color === "orange" ? "bg-orange-50" : color === "green" ? "bg-emerald-50" : color === "purple" ? "bg-purple-50" : "bg-blue-50"}`}>
          <Icon className={`w-4 h-4 ${color === "orange" ? "text-orange-500" : color === "green" ? "text-emerald-500" : color === "purple" ? "text-purple-500" : "text-[#002FA7]"}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 font-heading">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function RecommendationCard({ rec, idx }) {
  const IconComp = ICON_MAP[rec.icon] || BookOpen;
  const priorityStyle = { high: "border-red-200 bg-red-50", medium: "border-yellow-200 bg-yellow-50", low: "border-emerald-200 bg-emerald-50" };
  const priorityLabel = { high: "text-red-600 bg-red-100", medium: "text-yellow-700 bg-yellow-100", low: "text-emerald-700 bg-emerald-100" };
  return (
    <div data-testid={`recommendation-${idx}`}
      className={`p-4 rounded-xl border ${priorityStyle[rec.priority] || "border-slate-200 bg-slate-50"} animate-fade-in-up`}
      style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
          <IconComp className="w-4 h-4 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-relaxed">{rec.text}</p>
          {rec.topic && <p className="text-xs text-slate-500 mt-1 font-medium">Topic: {rec.topic}</p>}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${priorityLabel[rec.priority]}`}>
          {rec.priority}
        </span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/student`)
      .then(r => setAnalytics(r.data))
      .finally(() => setLoading(false));
  }, []);

  // Build chart data — aggregate scores by date
  const buildChartData = () => {
    if (!analytics?.history) return [];
    const byDate = {};
    analytics.history.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = { date: item.date };
      if (item.type === "quiz") byDate[item.date].quiz = item.score;
      else byDate[item.date].coding = item.score;
    });
    return Object.values(byDate).slice(-12);
  };

  const buildTopicData = () => {
    if (!analytics?.topic_mastery) return [];
    return Object.entries(analytics.topic_mastery).map(([topic, score], i) => ({
      topic: topic.replace(" & ", " &\n"), score, fill: TOPIC_COLORS[i % TOPIC_COLORS.length]
    }));
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  const chartData = buildChartData();
  const topicData = buildTopicData();

  return (
    <StudentLayout>
      {/* Welcome banner */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-heading">
              Welcome back, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Here's your personalised learning overview.</p>
          </div>
          {analytics && (
            <span data-testid="difficulty-badge"
              className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold capitalize ${DIFF_COLORS[analytics.predicted_difficulty] || "bg-slate-100 text-slate-600"}`}>
              {analytics.predicted_difficulty} level
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Skill Score" value={analytics ? `${analytics.skill_score}` : "—"}
          sub="AI-predicted overall level" icon={TrendingUp} testId="skill-score-card" color="blue" />
        <StatCard label="Quiz Average" value={analytics ? `${analytics.quiz_avg}%` : "—"}
          sub={`${analytics?.total_quizzes || 0} attempts total`} icon={BookOpen} testId="quiz-avg-card" color="orange" />
        <StatCard label="Coding Accuracy" value={analytics ? `${analytics.coding_accuracy}%` : "—"}
          sub={`${analytics?.total_coding || 0} submissions`} icon={Code2} testId="coding-acc-card" color="green" />
        <StatCard label="Watch Completion" value={analytics ? `${analytics.watch_completion}%` : "—"}
          sub={`${analytics?.total_watch_sessions || 0} lessons`} icon={PlayCircle} testId="watch-card" color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Progress chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-2">
          <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="progress-chart-title">Performance History</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002FA7" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#002FA7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="codeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="quiz" name="Quiz" stroke="#002FA7" fill="url(#quizGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="coding" name="Coding" stroke="#F97316" fill="url(#codeGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No activity data yet. Start a quiz or coding task!
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-0.5 bg-[#002FA7] rounded inline-block" /> Quiz scores
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-0.5 bg-orange-400 rounded inline-block" /> Coding accuracy
            </span>
          </div>
        </div>

        {/* Weak areas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-3">
          <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="weak-areas-title">Areas to Improve</h3>
          {analytics?.weak_topics?.length > 0 ? (
            <div className="space-y-3">
              {analytics.weak_topics.map(topic => (
                <div key={topic} data-testid={`weak-topic-${topic}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{topic}</span>
                  </div>
                  <span className="text-xs text-red-600 font-semibold">
                    {analytics.topic_mastery[topic]?.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm text-slate-500">No weak areas identified yet!</p>
            </div>
          )}

          {analytics?.strong_topics?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Strong Topics</p>
              {analytics.strong_topics.map(topic => (
                <div key={topic} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{topic}</span>
                  <span className="text-xs text-emerald-600 font-semibold">
                    {analytics.topic_mastery[topic]?.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topic mastery + Recommendations */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-4">
          <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="topic-mastery-title">Topic Mastery</h3>
          {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topicData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(val) => [`${val}%`, "Mastery"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {topicData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Complete some quizzes to see mastery data.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-5">
          <h3 className="font-semibold text-slate-900 font-heading mb-4" data-testid="recommendations-title">AI Recommendations</h3>
          {analytics?.recommendations?.length > 0 ? (
            <div className="space-y-2.5 overflow-y-auto max-h-56">
              {analytics.recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} idx={i} />)}
            </div>
          ) : (
            <div className="text-center py-8">
              <Rocket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Keep learning to unlock AI recommendations!</p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
