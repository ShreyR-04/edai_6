import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, BookOpen, BarChart3, Users, ChevronRight, AlertCircle } from "lucide-react";

const FEATURES = [
  { icon: BarChart3, title: "AI Performance Tracking", desc: "Random Forest & Neural Network models predict skill level and difficulty readiness in real-time." },
  { icon: BookOpen, title: "Adaptive Recommendations", desc: "Rule-based NLP generates personalised suggestions like 'Revise conditional statements' based on your data." },
  { icon: Users, title: "Dual Dashboards", desc: "Students track their own progress while teachers monitor the entire class and identify at-risk learners." },
];

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setForm(prev => ({
      ...prev,
      email: role === "teacher" ? "teacher@demo.com" : "alice@demo.com",
      password: "demo123",
    }));
    setTab("login");
  };

  return (
    <div className="min-h-screen grid-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#002FA7] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg font-heading">RoboCurriculum AI</p>
              <p className="text-blue-200 text-xs">Adaptive Learning Platform</p>
            </div>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight font-heading mb-4">
              Learn Robotics<br />
              <span className="text-orange-400">at your own pace.</span>
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              AI-powered curriculum that adapts to every student's performance, learning speed, and understanding level.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm font-heading">{title}</p>
                  <p className="text-blue-200 text-xs leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-blue-200 text-xs mb-3">Demo accounts — click to auto-fill:</p>
          <div className="flex gap-3">
            <button onClick={() => fillDemo("teacher")} data-testid="demo-teacher-btn"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Teacher Demo
            </button>
            <button onClick={() => fillDemo("student")} data-testid="demo-student-btn"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Student Demo
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#002FA7] rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 font-heading">RoboCurriculum AI</span>
            </div>
            <p className="text-slate-500 text-sm">Adaptive Robotics Learning Platform</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-2xl font-bold text-slate-900 font-heading mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-6">Sign in to continue your learning journey</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm" data-testid="login-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] transition-all"
                  placeholder="you@example.com"
                  required
                  data-testid="email-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] transition-all"
                  placeholder="••••••••"
                  required
                  data-testid="password-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-btn"
                className="w-full h-11 bg-[#002FA7] hover:bg-[#002FA7]/90 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Sign In <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
