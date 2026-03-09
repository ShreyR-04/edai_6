import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger(__name__)

DIFFICULTY_LABELS = ["beginner", "intermediate", "advanced"]

TOPIC_RECOMMENDATIONS = {
    "Python Basics": {
        "weak": "Revise Python syntax and variable assignment — these are the building blocks of all coding tasks.",
        "strong": "Explore advanced Python features like list comprehensions and lambda functions.",
    },
    "Loops & Conditionals": {
        "weak": "Practice for-loops and if-else blocks with simple exercises to build fluency.",
        "strong": "Challenge yourself with nested loops and loop optimization problems.",
    },
    "Functions": {
        "weak": "Review function definitions, parameters, and return values with hands-on exercises.",
        "strong": "Build reusable function libraries for robotics control programs.",
    },
    "Motor Control": {
        "weak": "Start with basic motor speed control using PWM before tackling advanced movements.",
        "strong": "Try an intermediate-level motor control project using PID controllers.",
    },
    "Sensors": {
        "weak": "Review ultrasonic and IR sensor fundamentals and practice reading sensor output in code.",
        "strong": "Build a sensor-fusion project combining multiple sensor inputs for obstacle avoidance.",
    },
}


class MLEngine:
    def __init__(self):
        self.rf_model = None
        self.mlp_model = None
        self.scaler = StandardScaler()
        self._train()
        logger.info("ML Engine initialised: RandomForest (performance) + MLP (difficulty)")

    def _generate_training_data(self, n: int = 600):
        np.random.seed(42)
        X, y_skill, y_diff = [], [], []

        for _ in range(n):
            quiz_avg = np.random.uniform(10, 100)
            coding_acc = np.random.uniform(10, 100)
            error_rate = np.random.uniform(0, 15)
            watch_pct = np.random.uniform(0, 100)
            topics = np.random.randint(1, 6)
            activity = np.random.randint(1, 40)

            skill = (
                0.40 * quiz_avg
                + 0.35 * coding_acc
                + 0.15 * watch_pct
                + 0.10 * topics * 20
            )
            skill = float(np.clip(skill + np.random.normal(0, 4), 0, 100))
            diff = 0 if skill < 40 else (1 if skill < 74 else 2)

            X.append([quiz_avg, coding_acc, error_rate, watch_pct, topics, activity])
            y_skill.append(skill)
            y_diff.append(diff)

        return np.array(X), np.array(y_skill), np.array(y_diff)

    def _train(self):
        X, y_skill, y_diff = self._generate_training_data()
        X_scaled = self.scaler.fit_transform(X)

        self.rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.rf_model.fit(X_scaled, y_skill)

        self.mlp_model = MLPClassifier(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            random_state=42,
            max_iter=500,
        )
        self.mlp_model.fit(X_scaled, y_diff)

    def predict(self, features: list) -> dict:
        """
        features = [quiz_avg, coding_acc, error_rate, watch_pct, topics_count, activity_count]
        Returns: { skill_score: float, difficulty: str }
        """
        X = np.array([features])
        X_scaled = self.scaler.transform(X)
        skill_score = float(np.clip(self.rf_model.predict(X_scaled)[0], 0, 100))
        diff_idx = int(self.mlp_model.predict(X_scaled)[0])
        return {
            "skill_score": round(skill_score, 1),
            "difficulty": DIFFICULTY_LABELS[diff_idx],
        }


def generate_recommendations(data: dict) -> list:
    """Rule-based NLP recommendation engine"""
    suggestions = []
    quiz_avg = data.get("quiz_avg_score", 0)
    coding_acc = data.get("coding_accuracy", 0)
    error_rate = data.get("error_rate", 0)
    watch_pct = data.get("watch_completion", 0) * 100
    weak_topics = data.get("weak_topics", [])
    strong_topics = data.get("strong_topics", [])
    difficulty = data.get("predicted_difficulty", "beginner")
    skill_score = data.get("skill_score", 0)

    # Quiz performance
    if quiz_avg < 50:
        suggestions.append({
            "type": "remedial", "priority": "high", "icon": "BookOpen",
            "text": f"Your quiz average is {quiz_avg:.0f}%. Review core concepts and retake quizzes to improve your foundation.",
        })
    elif quiz_avg < 70:
        suggestions.append({
            "type": "practice", "priority": "medium", "icon": "ClipboardCheck",
            "text": f"Quiz average at {quiz_avg:.0f}%. Consistent practice will push you past the 80% milestone.",
        })

    # Coding accuracy
    if coding_acc < 60:
        suggestions.append({
            "type": "remedial", "priority": "high", "icon": "Code2",
            "text": f"Coding accuracy at {coding_acc:.0f}%. Review syntax rules and test your code incrementally.",
        })
    elif coding_acc < 80:
        suggestions.append({
            "type": "practice", "priority": "medium", "icon": "Code2",
            "text": f"Coding accuracy {coding_acc:.0f}%. Break problems into smaller functions for more reliable results.",
        })

    # Error frequency
    if error_rate > 7:
        suggestions.append({
            "type": "remedial", "priority": "high", "icon": "AlertTriangle",
            "text": "High error frequency detected. Practise debugging skills — read error messages carefully before fixing.",
        })
    elif error_rate > 3:
        suggestions.append({
            "type": "practice", "priority": "medium", "icon": "Wrench",
            "text": "Moderate error rate. Use print statements to trace logic errors step by step.",
        })

    # Watch time
    if watch_pct < 50:
        suggestions.append({
            "type": "engagement", "priority": "medium", "icon": "PlayCircle",
            "text": f"You've completed {watch_pct:.0f}% of lesson content. Watch more lessons to strengthen your foundations.",
        })

    # Weak topic remedial (top 2)
    for topic in weak_topics[:2]:
        recs = TOPIC_RECOMMENDATIONS.get(topic, {})
        if recs.get("weak"):
            suggestions.append({
                "type": "topic_remedial", "priority": "high", "icon": "BookMarked",
                "text": recs["weak"], "topic": topic,
            })

    # Advancement suggestions
    if difficulty in ("intermediate", "advanced"):
        for topic in strong_topics[:1]:
            recs = TOPIC_RECOMMENDATIONS.get(topic, {})
            if recs.get("strong"):
                suggestions.append({
                    "type": "advancement", "priority": "low", "icon": "Rocket",
                    "text": recs["strong"], "topic": topic,
                })
        if not strong_topics:
            suggestions.append({
                "type": "advancement", "priority": "low", "icon": "Rocket",
                "text": "You're progressing well! Try an intermediate-level motor control project to challenge yourself.",
            })
    elif difficulty == "advanced":
        suggestions.append({
            "type": "advancement", "priority": "low", "icon": "Zap",
            "text": "Outstanding! You're ready for advanced robotics — consider building an autonomous navigation system.",
        })
    elif skill_score > 25 and difficulty == "beginner":
        suggestions.append({
            "type": "advancement", "priority": "low", "icon": "TrendingUp",
            "text": "Good start! Complete all beginner modules to unlock intermediate-level challenges.",
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))
    return suggestions[:5]
