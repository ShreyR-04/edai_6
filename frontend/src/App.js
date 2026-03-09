import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import StudentDashboard from "@/pages/StudentDashboard";
import StudentQuiz from "@/pages/StudentQuiz";
import StudentCodingTask from "@/pages/StudentCodingTask";
import StudentLessons from "@/pages/StudentLessons";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherStudents from "@/pages/TeacherStudents";
import StudentProfile from "@/pages/StudentProfile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/quizzes" element={<ProtectedRoute role="student"><StudentQuiz /></ProtectedRoute>} />
          <Route path="/student/coding" element={<ProtectedRoute role="student"><StudentCodingTask /></ProtectedRoute>} />
          <Route path="/student/lessons" element={<ProtectedRoute role="student"><StudentLessons /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute role="teacher"><TeacherStudents /></ProtectedRoute>} />
          <Route path="/teacher/students/:id" element={<ProtectedRoute role="teacher"><StudentProfile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
