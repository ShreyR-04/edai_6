import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import random
import uuid
from statistics import mean
from dotenv import load_dotenv

from auth_utils import hash_password, verify_password, create_token, decode_token, security
from ml_engine import MLEngine, generate_recommendations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

ml_engine = MLEngine()

app = FastAPI(title="Adaptive Robotics Learning Platform")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    name: str
    role: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class QuizQuestion(BaseModel):
    text: str
    options: List[str]
    correct: int

class QuizAttemptSubmit(BaseModel):
    quiz_id: str
    answers: List[int]
    time_taken_seconds: int

class CodingSubmissionCreate(BaseModel):
    task_id: str
    code: str
    time_taken_seconds: int
    self_reported_errors: int = 0

class WatchSessionCreate(BaseModel):
    lesson_id: str
    watch_time_seconds: int
    completed: bool

class StudentCreate(BaseModel):
    name: str
    email: str
    password: str
    grade: str = "Grade 10"


# ─── Auth helpers ─────────────────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_teacher(user=Depends(get_current_user)):
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user


# ─── Auth routes ──────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: UserCreate):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": safe}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}


# ─── Quiz routes ──────────────────────────────────────────────────────────────

@api_router.get("/quizzes")
async def list_quizzes(user=Depends(get_current_user)):
    return await db.quizzes.find({}, {"_id": 0}).to_list(100)

@api_router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user=Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@api_router.post("/quiz-attempts")
async def submit_quiz(data: QuizAttemptSubmit, user=Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": data.quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    correct = sum(
        1 for i, ans in enumerate(data.answers)
        if i < len(quiz["questions"]) and ans == quiz["questions"][i]["correct"]
    )
    total = len(quiz["questions"])
    score = round((correct / total) * 100, 1) if total else 0
    await db.quiz_attempts.insert_one({
        "id": str(uuid.uuid4()),
        "student_id": user["id"],
        "quiz_id": data.quiz_id,
        "topic": quiz["topic"],
        "score": score,
        "correct": correct,
        "total": total,
        "answers": data.answers,
        "time_taken_seconds": data.time_taken_seconds,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "score": score, "correct": correct, "total": total,
        "feedback": "Excellent!" if score >= 80 else ("Good work!" if score >= 60 else "Keep practising!"),
    }

@api_router.get("/quiz-attempts/my")
async def my_quiz_attempts(user=Depends(get_current_user)):
    return await db.quiz_attempts.find({"student_id": user["id"]}, {"_id": 0}).to_list(200)


# ─── Coding task routes ───────────────────────────────────────────────────────

@api_router.get("/coding-tasks")
async def list_coding_tasks(user=Depends(get_current_user)):
    return await db.coding_tasks.find({}, {"_id": 0, "required_keywords": 0}).to_list(100)

@api_router.get("/coding-tasks/{task_id}")
async def get_coding_task(task_id: str, user=Depends(get_current_user)):
    task = await db.coding_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {k: v for k, v in task.items() if k != "required_keywords"}

@api_router.post("/coding-submissions")
async def submit_code(data: CodingSubmissionCreate, user=Depends(get_current_user)):
    task = await db.coding_tasks.find_one({"id": data.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    code_lower = data.code.lower()
    kws = task.get("required_keywords", [])
    accuracy = round((sum(1 for kw in kws if kw.lower() in code_lower) / len(kws)) * 100, 1) if kws else 70.0
    error_patterns = ["error", "exception", "traceback", "syntaxerror", "nameerror", "typeerror"]
    auto_errors = sum(1 for p in error_patterns if p in code_lower)
    total_errors = max(data.self_reported_errors, auto_errors)
    accuracy = max(0, accuracy - total_errors * 5)
    await db.coding_submissions.insert_one({
        "id": str(uuid.uuid4()),
        "student_id": user["id"],
        "task_id": data.task_id,
        "topic": task["topic"],
        "code": data.code,
        "accuracy": accuracy,
        "error_count": total_errors,
        "time_taken_seconds": data.time_taken_seconds,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "accuracy": accuracy, "error_count": total_errors,
        "feedback": "Excellent implementation!" if accuracy >= 80 else ("Good approach, keep refining!" if accuracy >= 60 else "Review the requirements and try again."),
    }

@api_router.get("/coding-submissions/my")
async def my_coding_submissions(user=Depends(get_current_user)):
    return await db.coding_submissions.find({"student_id": user["id"]}, {"_id": 0, "code": 0}).to_list(200)


# ─── Lesson / watch session routes ────────────────────────────────────────────

@api_router.get("/lessons")
async def list_lessons(user=Depends(get_current_user)):
    return await db.lessons.find({}, {"_id": 0}).to_list(100)

@api_router.post("/watch-sessions")
async def record_watch(data: WatchSessionCreate, user=Depends(get_current_user)):
    lesson = await db.lessons.find_one({"id": data.lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    duration = lesson.get("duration_seconds", 900)
    completion_pct = 100.0 if data.completed else min(100, round((data.watch_time_seconds / duration) * 100, 1))
    session = {
        "id": str(uuid.uuid4()),
        "student_id": user["id"],
        "lesson_id": data.lesson_id,
        "lesson_title": lesson["title"],
        "topic": lesson["topic"],
        "watch_time_seconds": data.watch_time_seconds if not data.completed else duration,
        "duration_seconds": duration,
        "completion_pct": completion_pct,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.watch_sessions.insert_one(session)
    return {k: v for k, v in session.items() if k != "_id"}

@api_router.get("/watch-sessions/my")
async def my_watch_sessions(user=Depends(get_current_user)):
    return await db.watch_sessions.find({"student_id": user["id"]}, {"_id": 0}).to_list(200)


# ─── Analytics ────────────────────────────────────────────────────────────────

async def compute_student_metrics(student_id: str) -> dict:
    attempts = await db.quiz_attempts.find({"student_id": student_id}, {"_id": 0}).to_list(None)
    submissions = await db.coding_submissions.find({"student_id": student_id}, {"_id": 0}).to_list(None)
    sessions = await db.watch_sessions.find({"student_id": student_id}, {"_id": 0}).to_list(None)

    quiz_avg = mean([a["score"] for a in attempts]) if attempts else 0
    coding_acc = mean([s["accuracy"] for s in submissions]) if submissions else 0
    error_rate = mean([s["error_count"] for s in submissions]) if submissions else 0
    watch_pct = mean([s["completion_pct"] for s in sessions]) if sessions else 0

    topic_scores: dict = {}
    for a in attempts:
        t = a.get("topic", "General")
        topic_scores.setdefault(t, []).append(a["score"])
    for s in submissions:
        t = s.get("topic", "General")
        topic_scores.setdefault(t, []).append(s["accuracy"])

    topic_mastery = {t: round(mean(v), 1) for t, v in topic_scores.items()}
    weak_topics = sorted([t for t, s in topic_mastery.items() if s < 60], key=lambda t: topic_mastery[t])[:3]
    strong_topics = sorted([t for t, s in topic_mastery.items() if s >= 75], key=lambda t: topic_mastery[t], reverse=True)[:3]

    features = [quiz_avg, coding_acc, error_rate, watch_pct, len(topic_scores), len(attempts) + len(submissions)]
    ml_result = ml_engine.predict(features)

    recommendations = generate_recommendations({
        "quiz_avg_score": quiz_avg,
        "coding_accuracy": coding_acc,
        "error_rate": error_rate,
        "watch_completion": watch_pct / 100,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "predicted_difficulty": ml_result["difficulty"],
        "skill_score": ml_result["skill_score"],
    })

    # Build activity history for charts
    history = []
    for a in sorted(attempts, key=lambda x: x["completed_at"]):
        history.append({"date": a["completed_at"][:10], "score": a["score"], "type": "quiz", "topic": a.get("topic", "Quiz")})
    for s in sorted(submissions, key=lambda x: x["submitted_at"]):
        history.append({"date": s["submitted_at"][:10], "score": s["accuracy"], "type": "coding", "topic": s.get("topic", "Coding")})
    history.sort(key=lambda x: x["date"])

    return {
        "quiz_avg": round(quiz_avg, 1),
        "coding_accuracy": round(coding_acc, 1),
        "error_rate": round(error_rate, 1),
        "watch_completion": round(watch_pct, 1),
        "skill_score": ml_result["skill_score"],
        "predicted_difficulty": ml_result["difficulty"],
        "topic_mastery": topic_mastery,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "recommendations": recommendations,
        "history": history[-20:],
        "total_quizzes": len(attempts),
        "total_coding": len(submissions),
        "total_watch_sessions": len(sessions),
    }

@api_router.get("/analytics/student")
async def student_analytics(user=Depends(get_current_user)):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access only")
    return await compute_student_metrics(user["id"])

@api_router.get("/analytics/student/{student_id}")
async def teacher_student_analytics(student_id: str, teacher=Depends(require_teacher)):
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    metrics = await compute_student_metrics(student_id)
    return {"student": {k: v for k, v in student.items() if k != "password_hash"}, "metrics": metrics}

@api_router.get("/analytics/teacher")
async def teacher_analytics(teacher=Depends(require_teacher)):
    students = await db.users.find({"role": "student"}, {"_id": 0}).to_list(None)
    class_metrics, at_risk = [], []
    for s in students:
        try:
            m = await compute_student_metrics(s["id"])
            m["student_id"] = s["id"]
            m["name"] = s["name"]
            m["email"] = s["email"]
            class_metrics.append(m)
            if m["skill_score"] < 50:
                at_risk.append({"id": s["id"], "name": s["name"], "email": s["email"],
                                "skill_score": m["skill_score"], "quiz_avg": m["quiz_avg"],
                                "weak_topics": m["weak_topics"]})
        except Exception as e:
            logger.warning(f"Metrics error for {s['id']}: {e}")

    avg_skill = round(mean([m["skill_score"] for m in class_metrics]), 1) if class_metrics else 0
    avg_quiz = round(mean([m["quiz_avg"] for m in class_metrics]), 1) if class_metrics else 0
    avg_coding = round(mean([m["coding_accuracy"] for m in class_metrics]), 1) if class_metrics else 0

    topic_totals: dict = {}
    for m in class_metrics:
        for topic, score in m["topic_mastery"].items():
            topic_totals.setdefault(topic, []).append(score)
    topic_avg = {t: round(mean(s), 1) for t, s in topic_totals.items()}

    return {
        "total_students": len(students),
        "avg_skill_score": avg_skill,
        "avg_quiz_score": avg_quiz,
        "avg_coding_accuracy": avg_coding,
        "at_risk_count": len(at_risk),
        "at_risk_students": sorted(at_risk, key=lambda x: x["skill_score"]),
        "topic_performance": topic_avg,
        "class_metrics": class_metrics,
    }


# ─── Student management (teacher) ─────────────────────────────────────────────

@api_router.get("/students")
async def list_students(teacher=Depends(require_teacher)):
    return await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(None)

@api_router.post("/students")
async def add_student(data: StudentCreate, teacher=Depends(require_teacher)):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    student = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "name": data.name,
        "role": "student",
        "grade": data.grade,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(student)
    return {k: v for k, v in student.items() if k not in ("password_hash", "_id")}

@api_router.delete("/students/{student_id}")
async def remove_student(student_id: str, teacher=Depends(require_teacher)):
    result = await db.users.delete_one({"id": student_id, "role": "student"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student removed"}


# ─── Seed data ────────────────────────────────────────────────────────────────

QUIZ_SEED = [
    {
        "title": "Python Basics Quiz", "topic": "Python Basics", "difficulty": "beginner",
        "description": "Test your understanding of Python fundamentals.",
        "questions": [
            {"text": "Correct syntax to assign a value to a variable?", "options": ["var x = 5", "x = 5", "int x = 5", "set x = 5"], "correct": 1},
            {"text": "Which is NOT a built-in Python data type?", "options": ["int", "float", "char", "str"], "correct": 2},
            {"text": "What does len() return?", "options": ["Last element", "Number of elements", "Sum", "First element"], "correct": 1},
            {"text": "Output of: print(2 ** 4)?", "options": ["6", "8", "16", "12"], "correct": 2},
            {"text": "How to write a single-line comment in Python?", "options": ["// comment", "/* comment */", "# comment", "-- comment"], "correct": 2},
        ],
    },
    {
        "title": "Loops & Conditionals Quiz", "topic": "Loops & Conditionals", "difficulty": "beginner",
        "description": "Assess your knowledge of control flow in Python.",
        "questions": [
            {"text": "What keyword starts a conditional block?", "options": ["when", "check", "if", "case"], "correct": 2},
            {"text": "How many times does 'for i in range(5)' loop?", "options": ["4", "5", "6", "Infinite"], "correct": 1},
            {"text": "What does 'break' do in a loop?", "options": ["Skips iteration", "Restarts loop", "Exits the loop", "Pauses loop"], "correct": 2},
            {"text": "Which loop checks condition BEFORE each iteration?", "options": ["for loop", "while loop", "do-while loop", "repeat loop"], "correct": 1},
            {"text": "What keyword skips the rest of loop body?", "options": ["skip", "next", "continue", "pass"], "correct": 2},
        ],
    },
    {
        "title": "Functions Quiz", "topic": "Functions", "difficulty": "intermediate",
        "description": "Test your knowledge of Python functions.",
        "questions": [
            {"text": "What keyword defines a function in Python?", "options": ["func", "function", "def", "define"], "correct": 2},
            {"text": "What does 'return' do?", "options": ["Prints a value", "Sends value back to caller", "Exits program", "Loops back"], "correct": 1},
            {"text": "What are function inputs called?", "options": ["Variables", "Parameters/Arguments", "Returns", "Attributes"], "correct": 1},
            {"text": "A function with no return statement returns?", "options": ["0", "False", "None", "Empty string"], "correct": 2},
            {"text": "Which is a valid function definition?", "options": ["def greet name:", "function greet(name):", "def greet(name):", "greet = function(name)"], "correct": 2},
        ],
    },
    {
        "title": "Motor Control Quiz", "topic": "Motor Control", "difficulty": "intermediate",
        "description": "Test your robotics motor control knowledge.",
        "questions": [
            {"text": "What signal type controls DC motor speed?", "options": ["Analog", "PWM", "I2C", "UART"], "correct": 1},
            {"text": "What does PID stand for?", "options": ["Power Input Digital", "Proportional-Integral-Derivative", "Program Input Data", "Pulse In Direction"], "correct": 1},
            {"text": "What controls motor direction in an H-Bridge?", "options": ["Voltage level", "IN1/IN2 pin states", "Capacitor charge", "Resistor value"], "correct": 1},
            {"text": "What is encoder feedback used for?", "options": ["Power supply", "Precise position tracking", "Temperature sensing", "Current limiting"], "correct": 1},
            {"text": "PWM duty cycle = 0 means?", "options": ["Full speed", "Motor stops", "Motor reverses", "Motor brakes"], "correct": 1},
        ],
    },
    {
        "title": "Sensors Quiz", "topic": "Sensors", "difficulty": "intermediate",
        "description": "Evaluate your sensor knowledge for robotics.",
        "questions": [
            {"text": "What does an IR sensor primarily detect?", "options": ["Sound waves", "Temperature", "Infrared light / objects", "Magnetic fields"], "correct": 2},
            {"text": "How does an ultrasonic sensor measure distance?", "options": ["Light reflection", "Sound echo timing", "Magnetic induction", "Laser triangulation"], "correct": 1},
            {"text": "Typical range of HC-SR04 ultrasonic sensor?", "options": ["0.1-10cm", "2-400cm", "10-1000cm", "50-500cm"], "correct": 1},
            {"text": "Output of a digital sensor?", "options": ["Continuous voltage", "HIGH or LOW (0/1)", "PWM signal", "Frequency modulated"], "correct": 1},
            {"text": "What is 'sensor fusion'?", "options": ["Combining power", "Fusing hardware", "Combining data from multiple sensors", "Averaging readings"], "correct": 2},
        ],
    },
]

CODING_TASKS_SEED = [
    {
        "title": "Hello Robot", "topic": "Python Basics", "difficulty": "beginner",
        "description": "Define two variables: `robot_name` (string) and `robot_speed` (integer). Print both using an f-string in the format: 'Robot [name] moves at [speed] mph'.",
        "expected_output": "Robot Alice moves at 5 mph",
        "required_keywords": ["robot_name", "robot_speed", "print", "f\"", "f'"],
        "hints": ["Use f-strings: f\"Robot {robot_name}...\"", "robot_speed should be an integer like 5"],
    },
    {
        "title": "Sensor Array Scanner", "topic": "Loops & Conditionals", "difficulty": "beginner",
        "description": "Create a list `sensor_readings = [10, 25, 8, 32, 15]`. Using a for loop and if statement, print only readings that are above 20.",
        "expected_output": "25\n32",
        "required_keywords": ["for", "if", "sensor", ">", "print"],
        "hints": ["for reading in sensor_readings:", "if reading > 20: print(reading)"],
    },
    {
        "title": "Motor Speed Calculator", "topic": "Functions", "difficulty": "intermediate",
        "description": "Write a function `calculate_speed(distance, time)` that returns speed = distance / time. Call it with distance=100, time=5 and print the result.",
        "expected_output": "Speed: 20.0",
        "required_keywords": ["def", "calculate_speed", "return", "print", "distance"],
        "hints": ["def calculate_speed(distance, time):", "return distance / time"],
    },
    {
        "title": "PWM Motor Setup", "topic": "Motor Control", "difficulty": "intermediate",
        "description": "Write Python code using RPi.GPIO to set up a DC motor with 75% duty cycle. Include GPIO setup, PWM initialization on pin 18, frequency 1000Hz, and start the motor.",
        "expected_output": "Motor running at 75% duty cycle",
        "required_keywords": ["gpio", "pwm", "start", "setup", "dutycycle"],
        "hints": ["import RPi.GPIO as GPIO", "GPIO.setup(18, GPIO.OUT)", "pwm = GPIO.PWM(18, 1000)", "pwm.start(75)"],
    },
    {
        "title": "Distance Sensor Reader", "topic": "Sensors", "difficulty": "intermediate",
        "description": "Write a function `read_distance()` returning a random integer between 5 and 200 (simulating an ultrasonic sensor in cm). Print 'Obstacle ahead!' if distance < 30, else print the distance.",
        "expected_output": "Obstacle ahead! (when distance < 30cm)",
        "required_keywords": ["def", "read_distance", "random", "if", "print"],
        "hints": ["import random", "return random.randint(5, 200)", "if distance < 30: print('Obstacle ahead!')"],
    },
]

LESSONS_SEED = [
    {"title": "Introduction to Python Variables", "topic": "Python Basics", "difficulty": "beginner",
     "description": "Learn how Python stores data using variables, different data types (int, str, float, bool), and how to use f-strings for formatted output.", "duration_seconds": 900},
    {"title": "Control Flow: Loops and Conditionals", "topic": "Loops & Conditionals", "difficulty": "beginner",
     "description": "Master for loops, while loops, if-elif-else statements, break and continue keywords, and how they control program execution.", "duration_seconds": 1200},
    {"title": "Writing Reusable Functions", "topic": "Functions", "difficulty": "intermediate",
     "description": "Understand function definition, parameters, default values, return values, and how to build modular, reusable code for robotics projects.", "duration_seconds": 1080},
    {"title": "DC Motors and PWM Control", "topic": "Motor Control", "difficulty": "intermediate",
     "description": "Learn how DC motors work, how PWM signals control speed and direction, H-Bridge circuits, and implement motor control with Raspberry Pi GPIO in Python.", "duration_seconds": 1500},
    {"title": "Reading Sensors in Python", "topic": "Sensors", "difficulty": "intermediate",
     "description": "Explore ultrasonic, IR, and touch sensors. Learn to read sensor data, calibrate sensors, and use sensor readings in robot decision-making logic.", "duration_seconds": 1320},
]


async def seed_demo_data():
    if await db.users.count_documents({}) > 0:
        logger.info("Database already populated — skipping seed")
        return
    logger.info("Seeding demo data …")

    teachers = [
        {"id": str(uuid.uuid4()), "email": "teacher@demo.com", "name": "Dr. Sarah Chen",
         "role": "teacher", "password_hash": hash_password("demo123"),
         "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "teacher2@demo.com", "name": "Prof. James Kumar",
         "role": "teacher", "password_hash": hash_password("demo123"),
         "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(teachers)

    student_profiles = [
        ("Alice Johnson", "alice@demo.com", "Grade 11", 0.88),
        ("Bob Martinez", "bob@demo.com", "Grade 10", 0.65),
        ("Charlie Brown", "charlie@demo.com", "Grade 10", 0.43),
        ("Diana Prince", "diana@demo.com", "Grade 12", 0.92),
        ("Eve Wilson", "eve@demo.com", "Grade 11", 0.56),
    ]
    students = []
    for name, email, grade, _ in student_profiles:
        students.append({
            "id": str(uuid.uuid4()), "email": email, "name": name, "role": "student",
            "grade": grade, "password_hash": hash_password("demo123"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.users.insert_many(students)

    quizzes = [{**q, "id": str(uuid.uuid4())} for q in QUIZ_SEED]
    await db.quizzes.insert_many(quizzes)

    tasks = [{**t, "id": str(uuid.uuid4())} for t in CODING_TASKS_SEED]
    await db.coding_tasks.insert_many(tasks)

    lessons = [{**l, "id": str(uuid.uuid4())} for l in LESSONS_SEED]
    await db.lessons.insert_many(lessons)

    perf_levels = [0.88, 0.65, 0.43, 0.92, 0.56]
    random.seed(42)
    for i, student in enumerate(students):
        base = perf_levels[i]
        for j, quiz in enumerate(quizzes):
            for attempt_num in range(2):
                days_back = random.randint(1, 14)
                score = max(10, min(100, base * 100 - j * 4 + random.uniform(-8, 8) + attempt_num * 4))
                await db.quiz_attempts.insert_one({
                    "id": str(uuid.uuid4()), "student_id": student["id"],
                    "quiz_id": quiz["id"], "topic": quiz["topic"], "score": round(score, 1),
                    "correct": int(round(score / 100 * 5)), "total": 5,
                    "answers": [random.randint(0, 3) for _ in range(5)],
                    "time_taken_seconds": random.randint(120, 600),
                    "completed_at": (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat(),
                })

        for j, task in enumerate(tasks):
            for sub_num in range(2):
                days_back = random.randint(1, 14)
                acc = max(10, min(100, base * 100 - j * 3 + random.uniform(-10, 10) + sub_num * 5))
                errors = max(0, int((1 - acc / 100) * 8 + random.uniform(-1, 2)))
                await db.coding_submissions.insert_one({
                    "id": str(uuid.uuid4()), "student_id": student["id"],
                    "task_id": task["id"], "topic": task["topic"],
                    "code": f"# Demo submission\nprint('hello')",
                    "accuracy": round(acc, 1), "error_count": errors,
                    "time_taken_seconds": random.randint(300, 1800),
                    "submitted_at": (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat(),
                })

        for lesson in lessons:
            days_back = random.randint(1, 14)
            completion = min(100, base * 100 + random.uniform(-15, 15))
            watch_time = int((completion / 100) * lesson["duration_seconds"])
            await db.watch_sessions.insert_one({
                "id": str(uuid.uuid4()), "student_id": student["id"],
                "lesson_id": lesson["id"], "lesson_title": lesson["title"],
                "topic": lesson["topic"], "watch_time_seconds": watch_time,
                "duration_seconds": lesson["duration_seconds"],
                "completion_pct": round(completion, 1),
                "completed_at": (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat(),
            })

    logger.info("Demo data seeded successfully!")


# ─── App lifecycle ────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await seed_demo_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)
