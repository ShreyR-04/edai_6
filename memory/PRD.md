# RoboCurriculum AI — Product Requirements Document

## Problem Statement
Build a SaaS app that automatically adapts robotics and coding curriculum based on each student's performance, learning speed, and understanding level using AI. The app tracks student performance in coding tasks, quizzes, watch time, and error frequency to analyze learning behaviour patterns, predict difficulty readiness and recommend next level projects, remedial lessons, and appropriate practice exercises.

## User Personas
- **Students (ages 12-22)**: Learn robotics and coding at their own pace; want personalised feedback and clear progress tracking
- **Teachers/Instructors**: Manage a class, monitor individual and group performance, identify struggling students early

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + scikit-learn ML
- **Frontend**: React + Recharts + Tailwind CSS + shadcn/ui
- **Auth**: JWT-based (email/password), two roles: student / teacher
- **ML Models**: Random Forest (performance prediction) + MLP Classifier (difficulty prediction)
- **Recommendations**: Rule-based NLP engine (no LLM required)

## Core Requirements (Static)
1. JWT authentication with role-based access (student / teacher)
2. Student performance tracking: quiz scores, coding accuracy, error frequency, watch time
3. ML-powered skill score (0-100) and difficulty level prediction (beginner / intermediate / advanced)
4. Rule-based NLP recommendations (up to 5 per student)
5. Student Dashboard: skill progress graph, weak areas, suggested lessons, KPI cards
6. Teacher Dashboard: class performance summary, at-risk students, performance trends
7. Teacher can add/remove students
8. Pre-populated demo data (5 students, 5 quizzes, 5 coding tasks, 5 lessons)

## What's Been Implemented

### Backend (server.py + ml_engine.py + auth_utils.py)
**Date: March 2026**
- JWT auth: /api/auth/login, /api/auth/register, /api/auth/me
- Quiz system: /api/quizzes, /api/quiz-attempts (list, take, submit)
- Coding tasks: /api/coding-tasks, /api/coding-submissions (list, submit with keyword-based accuracy)
- Lessons + Watch sessions: /api/lessons, /api/watch-sessions
- Analytics: /api/analytics/student, /api/analytics/teacher, /api/analytics/student/{id}
- Student management (teacher): GET/POST/DELETE /api/students
- ML Engine: RandomForestRegressor (skill score) + MLPClassifier (difficulty level)
- Rule-based NLP: 8 rule categories generating up to 5 recommendations per student
- Auto-seed on startup (seeds demo data if DB is empty)
- Topics: Python Basics, Loops & Conditionals, Functions, Motor Control, Sensors

### Frontend (React)
- LandingPage: Split-screen login with demo account buttons
- StudentDashboard: 4 KPI cards, AreaChart (history), BarChart (topic mastery), weak areas, AI recommendations
- StudentQuiz: Quiz list → take quiz → results flow
- StudentCodingTask: Task list → code editor (split layout) → accuracy results
- StudentLessons: Lesson cards with simulated watch progress modal
- TeacherDashboard: Class stats, topic performance BarChart, skill distribution chart, at-risk panel, class table
- TeacherStudents: Student list with search, add student form, delete
- StudentProfile: Full analytics for individual student (teacher view)

### Demo Accounts
- teacher@demo.com / demo123 (Dr. Sarah Chen)
- alice@demo.com / demo123 (Advanced student)
- bob@demo.com / demo123 (Average student)
- charlie@demo.com / demo123 (At-risk student)
- diana@demo.com / demo123 (Top performer)
- eve@demo.com / demo123 (Inconsistent student)

## Bugs Fixed
- POST /api/watch-sessions: motor_asyncio insert_one() mutated dict with ObjectId (_id), causing 500 serialization error. Fixed by excluding _id from return.

## Prioritized Backlog

### P0 (Critical for production)
- [ ] Password reset / forgot password flow
- [ ] Teacher can assign specific quizzes/tasks to specific students
- [ ] Real code execution (sandboxed Python runner for coding tasks)

### P1 (High value)
- [ ] Teacher can create custom quizzes and coding tasks
- [ ] Notifications: teacher gets alerted when student drops below threshold
- [ ] Student can view their full submission history with code
- [ ] Class/section management (multiple classes per teacher)

### P2 (Nice to have)
- [ ] Reinforcement Learning for dynamic curriculum sequencing
- [ ] Export performance reports (PDF/CSV)
- [ ] Student ranking / leaderboard (optional, gamification)
- [ ] LMS integration (Google Classroom, Canvas)
- [ ] Parent dashboard view

## Next Tasks
1. Add quiz/task creation interface for teachers
2. Implement real-time notifications for at-risk student alerts
3. Add pagination to class performance table (for large classes)
4. Consider upgrading MLP convergence (increase max_iter or switch to lbfgs solver)
