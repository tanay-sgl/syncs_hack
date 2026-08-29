"""Seed the database with mock university data for demo."""

import json
from datetime import UTC, datetime, timedelta

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models.models import (
    CommitmentLevel,
    Intent,
    IntentStatus,
    IntentType,
    Skill,
    User,
    UserSkill,
    WorkingStyle,
)
from app.services.intent_service import get_or_create_skill

SKILLS = [
    ("Python", "Programming"),
    ("JavaScript", "Programming"),
    ("React", "Frontend"),
    ("TypeScript", "Frontend"),
    ("Node.js", "Backend"),
    ("Machine Learning", "AI"),
    ("Design", "Creative"),
    ("UI/UX", "Creative"),
    ("Product Management", "Business"),
    ("Pitching", "Business"),
    ("Automata Theory", "Academic"),
    ("Algorithms", "Academic"),
    ("COMP2022", "Course"),
    ("Data Structures", "Academic"),
    ("DevOps", "Infrastructure"),
]

STUDENTS = [
    {
        "username": "alex_chen",
        "email": "alex.chen@uni.edu",
        "name": "Alex Chen",
        "university": "University of Sydney",
        "bio": "Full-stack dev, hackathon regular",
        "skills": [("Python", 5), ("React", 4), ("TypeScript", 4)],
        "working_style": WorkingStyle.COLLABORATIVE,
        "commitment_level": CommitmentLevel.HIGH,
        "availability": "Weeknights after 6pm",
        "goals": "Build a startup after graduation",
    },
    {
        "username": "sneha_patel",
        "email": "sneha.patel@uni.edu",
        "name": "Sneha Patel",
        "university": "University of Sydney",
        "bio": "UI/UX designer passionate about edtech",
        "skills": [("Design", 5), ("UI/UX", 5), ("Figma", 4)],
        "working_style": WorkingStyle.COLLABORATIVE,
        "commitment_level": CommitmentLevel.MEDIUM,
        "availability": "Flexible",
        "goals": "Design products that help students learn",
    },
    {
        "username": "tanay_sharma",
        "email": "tanay.sharma@uni.edu",
        "name": "Tanay Sharma",
        "university": "University of Sydney",
        "bio": "ML engineer and AI researcher",
        "skills": [("Python", 5), ("Machine Learning", 5), ("Algorithms", 4)],
        "working_style": WorkingStyle.INDEPENDENT,
        "commitment_level": CommitmentLevel.HIGH,
        "availability": "Evenings and weekends",
        "goals": "Work on impactful AI products",
    },
    {
        "username": "maria_garcia",
        "email": "maria.garcia@uni.edu",
        "name": "Maria Garcia",
        "university": "University of Sydney",
        "bio": "Backend engineer, loves distributed systems",
        "skills": [("Python", 4), ("Node.js", 5), ("DevOps", 4)],
        "working_style": WorkingStyle.LEADER,
        "commitment_level": CommitmentLevel.HIGH,
        "availability": "Afternoons",
        "goals": "Technical cofounder for a health-tech startup",
    },
    {
        "username": "james_wong",
        "email": "james.wong@uni.edu",
        "name": "James Wong",
        "university": "University of Sydney",
        "bio": "COMP2022 student, automata enthusiast",
        "skills": [("COMP2022", 4), ("Automata Theory", 4), ("Algorithms", 3)],
        "working_style": WorkingStyle.SUPPORTIVE,
        "commitment_level": CommitmentLevel.MEDIUM,
        "availability": "Tonight after 6pm",
        "goals": "Ace COMP2022 finals",
    },
    {
        "username": "priya_singh",
        "email": "priya.singh@uni.edu",
        "name": "Priya Singh",
        "university": "University of Sydney",
        "bio": "Product manager and startup enthusiast",
        "skills": [("Product Management", 5), ("Pitching", 4), ("Design", 3)],
        "working_style": WorkingStyle.LEADER,
        "commitment_level": CommitmentLevel.HIGH,
        "availability": "Flexible",
        "goals": "Launch a student startup",
    },
    {
        "username": "liam_oconnor",
        "email": "liam.oconnor@uni.edu",
        "name": "Liam O'Connor",
        "university": "University of Sydney",
        "bio": "Frontend specialist, React wizard",
        "skills": [("React", 5), ("JavaScript", 5), ("TypeScript", 4)],
        "working_style": WorkingStyle.COLLABORATIVE,
        "commitment_level": CommitmentLevel.MEDIUM,
        "availability": "Weekends",
        "goals": "Join a hackathon-winning team",
    },
    {
        "username": "vandanaa_krishnan",
        "email": "vandanaa.krishnan@uni.edu",
        "name": "Vandanaa Krishnan",
        "university": "University of Sydney",
        "bio": "DevOps and infrastructure, society volunteer",
        "skills": [("DevOps", 5), ("Python", 3), ("Node.js", 3)],
        "working_style": WorkingStyle.SUPPORTIVE,
        "commitment_level": CommitmentLevel.MEDIUM,
        "availability": "Saturday mornings",
        "goals": "Give back to student community",
    },
]

SAMPLE_INTENTS = [
    {
        "creator_email": "james.wong@uni.edu",
        "raw_text": "Need three people to cram COMP2022 tonight, automata focus, after 6 at uni",
        "intent_type": IntentType.STUDY,
        "title": "COMP2022 Automata Cram Session",
        "group_size_needed": 3,
        "location": "Campus Library",
        "time_constraint": "Tonight after 6pm",
        "required_skills": ["COMP2022", "Automata Theory"],
    },
    {
        "creator_email": "priya.singh@uni.edu",
        "raw_text": "We need a frontend developer and designer for this hackathon",
        "intent_type": IntentType.HACKATHON,
        "title": "Hackathon Team — Need Frontend + Design",
        "group_size_needed": 2,
        "location": "Engineering Building",
        "time_constraint": "This weekend",
        "required_skills": ["React", "Design", "UI/UX"],
    },
    {
        "creator_email": "maria.garcia@uni.edu",
        "raw_text": "Looking for a technical cofounder for a health-tech startup",
        "intent_type": IntentType.COFOUNDER,
        "title": "Health-tech Cofounder Search",
        "group_size_needed": 1,
        "location": "Sydney",
        "time_constraint": "Ongoing",
        "required_skills": ["Machine Learning", "Product Management"],
    },
    {
        "creator_email": "vandanaa.krishnan@uni.edu",
        "raw_text": "Our society needs five volunteers for Saturday event setup",
        "intent_type": IntentType.VOLUNTEER,
        "title": "Saturday Society Event — Volunteers Needed",
        "group_size_needed": 5,
        "location": "Campus",
        "time_constraint": "Saturday 9am-2pm",
        "required_skills": [],
    },
    {
        "creator_email": "alex.chen@uni.edu",
        "raw_text": "Coffee with someone interested in startups in the next hour",
        "intent_type": IntentType.SOCIAL,
        "title": "Startup Coffee Chat",
        "group_size_needed": 1,
        "location": "Campus Cafe",
        "time_constraint": "Next hour",
        "required_skills": [],
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        for name, category in SKILLS:
            get_or_create_skill(db, name, category)
        db.commit()

        email_to_user: dict[str, User] = {}
        for student in STUDENTS:
            user = User(
                username=student["username"],
                email=student["email"],
                password_hash=get_password_hash("Password1!"),
                name=student["name"],
                university=student["university"],
                bio=student["bio"],
                location="University of Sydney",
                working_style=student["working_style"],
                commitment_level=student["commitment_level"],
                availability=student["availability"],
                goals=student["goals"],
                reputation_score=3.0,
                reputation_signal_count=0,
                reputation_trusted=False,
            )
            db.add(user)
            db.flush()

            for skill_name, proficiency in student["skills"]:
                skill = get_or_create_skill(db, skill_name)
                db.add(UserSkill(user_id=user.id, skill_id=skill.id, proficiency=proficiency))

            email_to_user[student["email"]] = user

        for intent_data in SAMPLE_INTENTS:
            creator = email_to_user[intent_data["creator_email"]]
            db.add(
                Intent(
                    creator_id=creator.id,
                    raw_text=intent_data["raw_text"],
                    title=intent_data["title"],
                    intent_type=intent_data["intent_type"],
                    status=IntentStatus.ACTIVE,
                    group_size_needed=intent_data["group_size_needed"],
                    location=intent_data["location"],
                    time_constraint=intent_data["time_constraint"],
                    required_skills=json.dumps(intent_data["required_skills"]),
                    expires_at=datetime.now(UTC) + timedelta(days=2),
                )
            )

        db.commit()
        print(f"Seeded {len(STUDENTS)} users, {len(SKILLS)} skills, {len(SAMPLE_INTENTS)} intents")
        print("Default password for all users: Password1!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
