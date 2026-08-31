"""
LifeLens AI - Backend (Rule-Based, No API Key Needed)
-------------------------------------------------------
FastAPI backend with:
- /analyze          -> single decision analysis (goal, priority, risks, roadmap, confidence)
- /compare          -> compare two options side-by-side
- /history          -> in-memory history of past analyses (session-based, resets on restart)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime

# ----------------------------
# App setup
# ----------------------------
app = FastAPI(title="LifeLens AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str


class CompareRequest(BaseModel):
    option_a: str
    option_b: str


@app.get("/")
def root():
    return {"message": "LifeLens AI Backend is running!"}


# ----------------------------
# Keyword -> Topic rules
# ----------------------------
TOPICS = [
    {
        "name": "AI / Internship / Career",
        "keywords": ["ai", "internship", "machine learning", "data science", "job", "career", "placement"],
        "goal": "Build AI/tech skills and land an internship or job",
        "priority": "High",
        "current_direction": "You're motivated but need a structured, step-by-step plan to turn interest into results.",
        "risks": [
            "Spreading effort across too many topics without depth",
            "No portfolio/projects to show recruiters",
            "Time conflict with college exams or coursework",
            "Applying too late in the internship hiring cycle",
        ],
        "roadmap": [
            "Learn Python fundamentals thoroughly",
            "Learn NumPy, Pandas, and basic statistics",
            "Study core Machine Learning concepts",
            "Build 2-3 small real projects (not tutorials only)",
            "Create a GitHub portfolio with clean READMEs",
            "Update resume/LinkedIn with projects",
            "Start applying to internships in parallel, not after finishing everything",
        ],
        "recommendations": [
            "Spend 30-45 min daily on consistent learning rather than long irregular sessions",
            "Pick one project and finish it completely before starting the next",
            "Follow official docs or one structured course, not 10 scattered resources",
            "Apply to internships early — don't wait to feel 'fully ready'",
        ],
        "next_step": "Pick one small AI/ML project idea and start building it this week.",
        "score_weight": {"skill_growth": 9, "time_cost": 6, "financial_risk": 2, "long_term_value": 9},
    },
    {
        "name": "Business Decision",
        "keywords": ["business", "startup", "shop", "quit job", "full-time", "invest", "loan", "expand"],
        "goal": "Make a major business decision (starting, quitting, or expanding)",
        "priority": "High",
        "current_direction": "You're weighing stability against growth potential — this needs numbers, not just gut feeling.",
        "risks": [
            "Cash flow gap if income drops during the transition",
            "Underestimating time needed to become profitable",
            "No backup plan if the business is slower than expected",
            "Mixing personal and business finances",
        ],
        "roadmap": [
            "Write down current monthly income vs expenses",
            "Estimate realistic business income for first 6 months",
            "Build a 3-6 month financial cushion before committing fully",
            "Test the idea part-time or small-scale first if possible",
            "Set a clear checkpoint date to review progress",
            "Then decide on full commitment",
        ],
        "recommendations": [
            "Don't quit a stable income source until the new one is proven, even partially",
            "Track numbers weekly, not just impressions",
            "Talk to 2-3 people already running a similar business",
            "Keep a minimum emergency fund untouched",
        ],
        "next_step": "Write out your actual monthly numbers (income, expenses, savings) before deciding anything.",
        "score_weight": {"skill_growth": 6, "time_cost": 8, "financial_risk": 8, "long_term_value": 8},
    },
    {
        "name": "Study / Exams",
        "keywords": ["exam", "study", "college", "semester", "assignment", "project submission", "degree", "b.tech", "btech"],
        "goal": "Balance academic responsibilities with other goals",
        "priority": "Medium",
        "current_direction": "You have competing priorities that need clear time allocation, not just willpower.",
        "risks": [
            "Burnout from trying to do everything at full intensity",
            "Last-minute cramming hurting exam performance",
            "Neglecting side goals entirely once exams get close",
        ],
        "roadmap": [
            "List all deadlines (exams, assignments, other goals) on one timeline",
            "Block fixed daily study hours close to college syllabus",
            "Protect a small daily slot for other goals, even if short",
            "Reduce (not eliminate) side activities during exam weeks",
            "Resume full effort on other goals right after exams",
        ],
        "recommendations": [
            "Prioritize exams in the 2 weeks directly before them",
            "Use short daily sessions for side goals instead of skipping entirely",
            "Avoid decision fatigue — plan the week in advance, not day by day",
        ],
        "next_step": "Map out your exam dates and block study time for this week right now.",
        "score_weight": {"skill_growth": 7, "time_cost": 7, "financial_risk": 1, "long_term_value": 7},
    },
    {
        "name": "Relationship / Personal",
        "keywords": ["relationship", "friend", "family", "marriage", "breakup", "move city", "relocate"],
        "goal": "Navigate a significant personal life decision",
        "priority": "Medium",
        "current_direction": "This involves emotional and practical factors — worth slowing down before deciding.",
        "risks": [
            "Deciding impulsively during a high-emotion moment",
            "Not considering long-term practical impact (finances, location, family)",
            "One-sided decision without discussing with those affected",
        ],
        "roadmap": [
            "Write down what specifically is driving this decision",
            "List practical impacts (money, location, daily life)",
            "Talk directly with the people involved",
            "Give yourself a short cooling-off period before finalizing",
            "Decide, then commit — avoid repeatedly re-opening the decision",
        ],
        "recommendations": [
            "Separate the emotional reaction from the practical facts",
            "Avoid deciding in the middle of an argument or stressful moment",
            "Ask someone you trust for an outside perspective",
        ],
        "next_step": "Write down the top 3 reasons driving this decision, honestly.",
        "score_weight": {"skill_growth": 3, "time_cost": 5, "financial_risk": 3, "long_term_value": 8},
    },
]

DEFAULT_TOPIC = {
    "goal": "Clarify and act on your stated goal",
    "priority": "Medium",
    "current_direction": "You have a general direction, but it needs to be broken into concrete steps.",
    "risks": [
        "Staying vague about what success actually looks like",
        "No timeline, so the goal keeps getting postponed",
        "Trying to do everything at once instead of prioritizing",
    ],
    "roadmap": [
        "Define exactly what achieving this goal looks like",
        "Break it into 3-5 smaller milestones",
        "Set a realistic timeline for each milestone",
        "Identify the very first concrete action",
        "Review progress weekly and adjust",
    ],
    "recommendations": [
        "Turn the goal into a specific, measurable target",
        "Start with the smallest possible first step, today",
        "Track progress weekly so you notice drift early",
    ],
    "next_step": "Write down one concrete action you can take in the next 24 hours.",
    "score_weight": {"skill_growth": 5, "time_cost": 5, "financial_risk": 4, "long_term_value": 5},
}

# ----------------------------
# In-memory history (resets when server restarts)
# ----------------------------
history_log: List[dict] = []


def detect_priority_boost(text_lower: str):
    urgent_words = ["urgent", "immediately", "asap", "deadline", "this week", "tomorrow", "today"]
    if any(w in text_lower for w in urgent_words):
        return "High"
    return None


def match_topic(text_lower: str):
    """Return (topic, confidence_percent, matched_keywords)."""
    best_topic = None
    best_matches = []
    for topic in TOPICS:
        matches = [kw for kw in topic["keywords"] if kw in text_lower]
        if matches and len(matches) > len(best_matches):
            best_topic = topic
            best_matches = matches

    if not best_topic:
        return None, 0, []

    # confidence: proportion of that topic's keywords found, scaled up, capped at 97
    confidence = min(97, 40 + len(best_matches) * 20)
    return best_topic, confidence, best_matches


def analyze_text(text: str) -> dict:
    text_lower = text.lower()
    matched_topic, confidence, matched_keywords = match_topic(text_lower)

    if matched_topic:
        result = {
            "goal": matched_topic["goal"],
            "priority": matched_topic["priority"],
            "current_direction": matched_topic["current_direction"],
            "risks": matched_topic["risks"],
            "roadmap": matched_topic["roadmap"],
            "recommendations": matched_topic["recommendations"],
            "next_step": matched_topic["next_step"],
            "confidence": confidence,
            "matched_keywords": matched_keywords,
            "category": matched_topic["name"],
        }
    else:
        result = dict(DEFAULT_TOPIC)
        result["goal"] = text.strip().capitalize()
        result["confidence"] = 35
        result["matched_keywords"] = []
        result["category"] = "General"

    boosted = detect_priority_boost(text_lower)
    if boosted:
        result["priority"] = boosted

    result.pop("score_weight", None)
    return result


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="text field cannot be empty")

    try:
        result = analyze_text(payload.text)

        # log to history
        history_log.insert(0, {
            "text": payload.text.strip(),
            "category": result["category"],
            "priority": result["priority"],
            "confidence": result["confidence"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        if len(history_log) > 20:
            history_log.pop()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
def compare(payload: CompareRequest):
    if not payload.option_a.strip() or not payload.option_b.strip():
        raise HTTPException(status_code=400, detail="both options are required")

    a_lower = payload.option_a.lower()
    b_lower = payload.option_b.lower()

    topic_a, conf_a, _ = match_topic(a_lower)
    topic_b, conf_b, _ = match_topic(b_lower)

    weights_a = (topic_a or DEFAULT_TOPIC)["score_weight"]
    weights_b = (topic_b or DEFAULT_TOPIC)["score_weight"]

    def total_score(w):
        # simple weighted score: growth + long_term_value - time_cost*0.5 - financial_risk*0.5
        return round(w["skill_growth"] + w["long_term_value"] - w["time_cost"] * 0.5 - w["financial_risk"] * 0.5, 1)

    score_a = total_score(weights_a)
    score_b = total_score(weights_b)

    winner = payload.option_a if score_a >= score_b else payload.option_b

    return {
        "option_a": {
            "label": payload.option_a,
            "category": (topic_a or DEFAULT_TOPIC).get("name", "General") if topic_a else "General",
            "skill_growth": weights_a["skill_growth"],
            "time_cost": weights_a["time_cost"],
            "financial_risk": weights_a["financial_risk"],
            "long_term_value": weights_a["long_term_value"],
            "score": score_a,
        },
        "option_b": {
            "label": payload.option_b,
            "category": (topic_b or DEFAULT_TOPIC).get("name", "General") if topic_b else "General",
            "skill_growth": weights_b["skill_growth"],
            "time_cost": weights_b["time_cost"],
            "financial_risk": weights_b["financial_risk"],
            "long_term_value": weights_b["long_term_value"],
            "score": score_b,
        },
        "recommended": winner,
    }


@app.get("/history")
def get_history():
    return {"history": history_log}


@app.delete("/history")
def clear_history():
    history_log.clear()
    return {"message": "History cleared"}