import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, BookOpen, Code2, PlayCircle, LogOut, Users, BarChart3, GraduationCap } from "lucide-react";

const studentLinks = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/quizzes", label: "Quizzes", icon: BookOpen },
  { to: "/student/coding", label: "Coding Tasks", icon: Code2 },
  { to: "/student/lessons", label: "Lessons", icon: PlayCircle },
];

const teacherLinks = [
  { to: "/teacher", label: "Dashboard", icon: BarChart3 },
  { to: "/teacher/students", label: "Students", icon: Users },
];

export default function TeacherLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#002FA7] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 font-heading">RoboCurriculum</p>
              <p className="text-xs text-slate-400">AI Learning Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {teacherLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
              className={`sidebar-link ${location.pathname === to ? "active" : ""}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 mb-2">
            <div className="w-8 h-8 bg-[#002FA7]/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-[#002FA7]">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export function StudentLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#002FA7] rounded-md flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-900 font-heading">RoboCurriculum</span>
              </div>
              <nav className="hidden sm:flex items-center gap-1">
                {studentLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === to
                        ? "bg-[#002FA7]/8 text-[#002FA7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 bg-[#002FA7]/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-[#002FA7]">{user?.name?.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.name?.split(" ")[0]}</span>
              </div>
              <button
                onClick={logout}
                data-testid="logout-btn"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
