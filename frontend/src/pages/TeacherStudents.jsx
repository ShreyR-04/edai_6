import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import TeacherLayout from "@/components/TeacherLayout";
import { UserPlus, Trash2, ChevronRight, Search, X, AlertCircle, CheckCircle } from "lucide-react";

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", grade: "Grade 10" });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    axios.get(`${API}/students`).then(r => setStudents(r.data)).finally(() => setLoading(false));
  }, []);

  const addStudent = async (e) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      const { data } = await axios.post(`${API}/students`, form);
      setStudents(prev => [...prev, data]);
      setForm({ name: "", email: "", password: "", grade: "Grade 10" });
      setShowAddForm(false);
      showToast(`${data.name} has been added successfully.`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add student.");
    } finally {
      setAdding(false);
    }
  };

  const removeStudent = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your class? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await axios.delete(`${API}/students/${id}`);
      setStudents(prev => prev.filter(s => s.id !== id));
      showToast(`${name} has been removed.`, "info");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <TeacherLayout>
      <div className="p-6 space-y-5">
        {/* Toast */}
        {toast && (
          <div data-testid="toast-message"
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right ${
              toast.type === "success" ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"
            }`}>
            <CheckCircle className="w-4 h-4" />
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-heading">Students</h1>
            <p className="text-slate-500 text-sm mt-0.5">{students.length} student{students.length !== 1 ? "s" : ""} enrolled</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            data-testid="add-student-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#002FA7] hover:bg-[#002FA7]/90 text-white text-sm font-medium rounded-lg transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>

        {/* Add student form */}
        {showAddForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up" data-testid="add-student-form">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 font-heading">New Student</h3>
              <button onClick={() => { setShowAddForm(false); setError(""); }}
                className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <form onSubmit={addStudent} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                  placeholder="Jane Smith" required data-testid="new-student-name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                  placeholder="jane@school.edu" required data-testid="new-student-email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                  placeholder="Temporary password" required minLength={6} data-testid="new-student-password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade</label>
                <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] bg-white"
                  data-testid="new-student-grade">
                  {["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowAddForm(false); setError(""); }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={adding} data-testid="confirm-add-student-btn"
                  className="px-5 py-2 bg-[#002FA7] hover:bg-[#002FA7]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all active:scale-95">
                  {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add Student</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students by name or email…"
            className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] bg-white"
            data-testid="student-search"
          />
        </div>

        {/* Students list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#002FA7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-400 text-sm">
              {search ? "No students match your search." : "No students yet. Add your first student above."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Student", "Grade", "Email", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors" data-testid={`student-row-${s.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#002FA7]/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-[#002FA7]">{s.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{s.grade || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.email}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link to={`/teacher/students/${s.id}`} data-testid={`view-student-${s.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-[#002FA7] hover:underline">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => removeStudent(s.id, s.name)}
                          disabled={deleting === s.id}
                          data-testid={`delete-student-${s.id}`}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded disabled:opacity-40"
                        >
                          {deleting === s.id
                            ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
