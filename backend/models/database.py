"""
Database models and setup for TalentShift ATS
Using SQLite for simplicity
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, List
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "talentshift.db"


def get_db():
    """Get database connection"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            department TEXT,
            requirements TEXT NOT NULL,  -- JSON string
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    # Candidates table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            filename TEXT NOT NULL,
            name TEXT,
            email TEXT,
            phone TEXT,
            location TEXT,
            total_score REAL,
            status TEXT DEFAULT 'review',  -- review, shortlisted, interview, rejected
            score_breakdown TEXT,  -- JSON string
            parsed_data TEXT,  -- JSON string
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized")


def insert_default_job():
    """Insert default job if no jobs exist"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM jobs")
    if cursor.fetchone()[0] == 0:
        default_requirements = {
            "education": {"min_level": "S1", "preferred_major": ["Informatika", "Teknik Komputer", "Sistem Informasi"], "weight": 15},
            "experience": {"min_years": 3, "relevant_titles": ["Developer", "Engineer", "Programmer"], "weight": 25},
            "skills": {"required": ["Python", "SQL", "REST API"], "preferred": ["Docker", "AWS", "PostgreSQL"], "weight": 40},
            "bootcamp": {"preferred_providers": ["Hacktiv8", "Binar Academy", "Dicoding", "Purwadhika", "Sanbercode"], "weight": 10},
            "portfolio": {"required": True, "preferred_platforms": ["github", "gitlab", "personal_website"], "min_projects": 2, "weight": 15},
            "location": {"allowed": ["Jakarta", "Bandung", "Remote"], "weight": 5}
        }
        
        cursor.execute(
            "INSERT INTO jobs (title, department, requirements) VALUES (?, ?, ?)",
            ("Backend Developer", "Engineering", json.dumps(default_requirements))
        )
        conn.commit()
        print("Default job created")
    
    conn.close()


class CandidateRepository:
    """Repository for candidate CRUD operations"""
    
    @staticmethod
    def create(job_id: int, filename: str, name: str, email: str, phone: str,
               location: str, total_score: float, score_breakdown: dict,
               parsed_data: dict) -> int:
        """Create a new candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO candidates 
            (job_id, filename, name, email, phone, location, total_score, 
             score_breakdown, parsed_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job_id, filename, name, email, phone, location, total_score,
            json.dumps(score_breakdown), json.dumps(parsed_data)
        ))
        
        conn.commit()
        candidate_id = cursor.lastrowid
        conn.close()
        return candidate_id
    
    @staticmethod
    def get_all(job_id: Optional[int] = None, status: Optional[str] = None,
                min_score: Optional[float] = None, max_score: Optional[float] = None,
                search: Optional[str] = None) -> List[dict]:
        """Get all candidates with optional filters"""
        conn = get_db()
        cursor = conn.cursor()
        
        query = "SELECT * FROM candidates WHERE 1=1"
        params = []
        
        if job_id:
            query += " AND job_id = ?"
            params.append(job_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        if min_score is not None:
            query += " AND total_score >= ?"
            params.append(min_score)
        if max_score is not None:
            query += " AND total_score <= ?"
            params.append(max_score)
        if search:
            query += " AND (name LIKE ? OR email LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        
        query += " ORDER BY total_score DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    @staticmethod
    def get_by_id(candidate_id: int) -> Optional[dict]:
        """Get candidate by ID"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            data = dict(row)
            data['score_breakdown'] = json.loads(data['score_breakdown']) if data['score_breakdown'] else {}
            data['parsed_data'] = json.loads(data['parsed_data']) if data['parsed_data'] else {}
            return data
        return None
    
    @staticmethod
    def update_status(candidate_id: int, status: str) -> bool:
        """Update candidate status"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE candidates 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, candidate_id))
        
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    @staticmethod
    def delete(candidate_id: int) -> bool:
        """Delete candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM candidates WHERE id = ?", (candidate_id,))
        
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    @staticmethod
    def get_stats(job_id: Optional[int] = None) -> dict:
        """Get dashboard statistics"""
        conn = get_db()
        cursor = conn.cursor()
        
        base_query = "FROM candidates"
        params = []
        if job_id:
            base_query += " WHERE job_id = ?"
            params.append(job_id)
        
        # Total count
        cursor.execute(f"SELECT COUNT(*) {base_query}", params)
        total = cursor.fetchone()[0]
        
        # Status counts
        statuses = {'shortlisted': 0, 'review': 0, 'interview': 0, 'rejected': 0}
        for status in statuses.keys():
            if job_id:
                cursor.execute(
                    f"SELECT COUNT(*) FROM candidates WHERE job_id = ? AND status = ?",
                    (job_id, status)
                )
            else:
                cursor.execute(
                    f"SELECT COUNT(*) FROM candidates WHERE status = ?",
                    (status,)
                )
            statuses[status] = cursor.fetchone()[0]
        
        # Average score
        cursor.execute(f"SELECT AVG(total_score) {base_query}", params)
        avg_score = cursor.fetchone()[0] or 0
        
        # Score distribution
        score_ranges = [
            ('80-100', 80, 100),
            ('60-79', 60, 79),
            ('40-59', 40, 59),
            ('0-39', 0, 39)
        ]
        distribution = {}
        for label, min_s, max_s in score_ranges:
            if job_id:
                cursor.execute(
                    "SELECT COUNT(*) FROM candidates WHERE job_id = ? AND total_score >= ? AND total_score <= ?",
                    (job_id, min_s, max_s)
                )
            else:
                cursor.execute(
                    "SELECT COUNT(*) FROM candidates WHERE total_score >= ? AND total_score <= ?",
                    (min_s, max_s)
                )
            distribution[label] = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_candidates': total,
            'shortlisted': statuses['shortlisted'],
            'in_review': statuses['review'],
            'interview': statuses['interview'],
            'rejected': statuses['rejected'],
            'average_score': round(avg_score, 1),
            'score_distribution': distribution
        }


class JobRepository:
    """Repository for job CRUD operations"""
    
    @staticmethod
    def create(title: str, department: str, requirements: dict) -> int:
        """Create a new job"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO jobs (title, department, requirements) VALUES (?, ?, ?)",
            (title, department, json.dumps(requirements))
        )
        
        conn.commit()
        job_id = cursor.lastrowid
        conn.close()
        return job_id
    
    @staticmethod
    def get_all() -> List[dict]:
        """Get all jobs"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM jobs ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        jobs = []
        for row in rows:
            job = dict(row)
            job['requirements'] = json.loads(job['requirements'])
            jobs.append(job)
        return jobs
    
    @staticmethod
    def get_by_id(job_id: int) -> Optional[dict]:
        """Get job by ID"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            job = dict(row)
            job['requirements'] = json.loads(job['requirements'])
            return job
        return None
    
    @staticmethod
    def update(job_id: int, title: str, department: str, requirements: dict) -> bool:
        """Update job"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE jobs 
            SET title = ?, department = ?, requirements = ?
            WHERE id = ?
        ''', (title, department, json.dumps(requirements), job_id))
        
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    @staticmethod
    def delete(job_id: int) -> bool:
        """Delete job"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0


# Initialize database on import
init_db()
insert_default_job()
