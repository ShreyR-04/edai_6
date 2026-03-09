"""Backend tests for Adaptive Robotics Learning Platform"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Auth credentials
TEACHER_EMAIL = "teacher@demo.com"
TEACHER_PASS = "demo123"
STUDENT_EMAIL = "alice@demo.com"
STUDENT_PASS = "demo123"
CHARLIE_EMAIL = "charlie@demo.com"


@pytest.fixture(scope="module")
def teacher_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEACHER_EMAIL, "password": TEACHER_PASS})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def student_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASS})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def charlie_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": CHARLIE_EMAIL, "password": STUDENT_PASS})
    assert r.status_code == 200
    return r.json()["token"]


# ── Auth tests ─────────────────────────────────────────────────────────────────

class TestAuth:
    """Authentication endpoint tests"""

    def test_teacher_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEACHER_EMAIL, "password": TEACHER_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == "teacher"

    def test_student_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == "student"

    def test_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@demo.com", "password": "wrong"})
        assert r.status_code == 401

    def test_get_me_student(self, student_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "student"
        assert "password_hash" not in data

    def test_get_me_teacher(self, teacher_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200
        assert r.json()["role"] == "teacher"

    def test_protected_route_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in [401, 403]


# ── Quiz tests ─────────────────────────────────────────────────────────────────

class TestQuizzes:
    """Quiz endpoint tests"""

    def test_list_quizzes(self, student_token):
        r = requests.get(f"{BASE_URL}/api/quizzes", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        assert all("id" in q and "title" in q and "questions" in q for q in data)

    def test_get_quiz_by_id(self, student_token):
        quizzes = requests.get(f"{BASE_URL}/api/quizzes", headers={"Authorization": f"Bearer {student_token}"}).json()
        quiz_id = quizzes[0]["id"]
        r = requests.get(f"{BASE_URL}/api/quizzes/{quiz_id}", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        assert r.json()["id"] == quiz_id

    def test_submit_quiz(self, student_token):
        quizzes = requests.get(f"{BASE_URL}/api/quizzes", headers={"Authorization": f"Bearer {student_token}"}).json()
        quiz_id = quizzes[0]["id"]
        r = requests.post(f"{BASE_URL}/api/quiz-attempts", headers={"Authorization": f"Bearer {student_token}"},
                          json={"quiz_id": quiz_id, "answers": [1, 1, 1, 2, 2], "time_taken_seconds": 120})
        assert r.status_code == 200
        data = r.json()
        assert "score" in data and "correct" in data and "total" in data
        assert data["total"] == 5

    def test_get_my_quiz_attempts(self, student_token):
        r = requests.get(f"{BASE_URL}/api/quiz-attempts/my", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Coding task tests ──────────────────────────────────────────────────────────

class TestCodingTasks:
    """Coding task endpoint tests"""

    def test_list_coding_tasks(self, student_token):
        r = requests.get(f"{BASE_URL}/api/coding-tasks", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_submit_code(self, student_token):
        tasks = requests.get(f"{BASE_URL}/api/coding-tasks", headers={"Authorization": f"Bearer {student_token}"}).json()
        task_id = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/coding-submissions", headers={"Authorization": f"Bearer {student_token}"},
                          json={"task_id": task_id, "code": "robot_name = 'Alice'\nrobot_speed = 5\nprint(f'Robot {robot_name} moves at {robot_speed} mph')", "time_taken_seconds": 300})
        assert r.status_code == 200
        assert "accuracy" in r.json()


# ── Lesson tests ───────────────────────────────────────────────────────────────

class TestLessons:
    """Lesson endpoint tests"""

    def test_list_lessons(self, student_token):
        r = requests.get(f"{BASE_URL}/api/lessons", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_record_watch_session(self, student_token):
        lessons = requests.get(f"{BASE_URL}/api/lessons", headers={"Authorization": f"Bearer {student_token}"}).json()
        lesson_id = lessons[0]["id"]
        r = requests.post(f"{BASE_URL}/api/watch-sessions", headers={"Authorization": f"Bearer {student_token}"},
                          json={"lesson_id": lesson_id, "watch_time_seconds": 900, "completed": True})
        assert r.status_code == 200
        data = r.json()
        assert data["completion_pct"] == 100.0


# ── Analytics tests ────────────────────────────────────────────────────────────

class TestAnalytics:
    """Analytics endpoint tests"""

    def test_student_analytics(self, student_token):
        r = requests.get(f"{BASE_URL}/api/analytics/student", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 200
        data = r.json()
        assert all(k in data for k in ["skill_score", "quiz_avg", "coding_accuracy", "watch_completion", "recommendations"])
        assert isinstance(data["recommendations"], list)

    def test_teacher_analytics(self, teacher_token):
        r = requests.get(f"{BASE_URL}/api/analytics/teacher", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["total_students"] == 5
        assert "at_risk_students" in data
        assert "class_metrics" in data

    def test_charlie_is_at_risk(self, teacher_token):
        r = requests.get(f"{BASE_URL}/api/analytics/teacher", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200
        at_risk_names = [s["name"] for s in r.json()["at_risk_students"]]
        assert "Charlie Brown" in at_risk_names

    def test_teacher_student_analytics(self, teacher_token):
        students = requests.get(f"{BASE_URL}/api/students", headers={"Authorization": f"Bearer {teacher_token}"}).json()
        student_id = students[0]["id"]
        r = requests.get(f"{BASE_URL}/api/analytics/student/{student_id}", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "student" in data and "metrics" in data


# ── Student management tests ───────────────────────────────────────────────────

class TestStudentManagement:
    """Student management (teacher) tests"""

    def test_list_students(self, teacher_token):
        r = requests.get(f"{BASE_URL}/api/students", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 5
        assert all("password_hash" not in s for s in data)

    def test_add_and_delete_student(self, teacher_token):
        # Add
        r = requests.post(f"{BASE_URL}/api/students", headers={"Authorization": f"Bearer {teacher_token}"},
                          json={"name": "TEST_Student", "email": "test_student_del@demo.com", "password": "demo123", "grade": "Grade 10"})
        assert r.status_code == 200
        student_id = r.json()["id"]
        # Delete
        r = requests.delete(f"{BASE_URL}/api/students/{student_id}", headers={"Authorization": f"Bearer {teacher_token}"})
        assert r.status_code == 200

    def test_student_cannot_list_students(self, student_token):
        r = requests.get(f"{BASE_URL}/api/students", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code == 403
