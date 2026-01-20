"""
TalentShift ATS Backend - Complete API
CV Parsing, Scoring, and Management
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import json
import io
import csv

from services.cv_parser import CVParser
from services.scoring_engine import ScoringEngine
from models.schemas import JobRequirements, CandidateScore, ParsedCV
from models.database import CandidateRepository, JobRepository, get_db

app = FastAPI(
    title="TalentShift ATS API",
    description="Complete CV Parsing, Scoring, and Management for ATS",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
cv_parser = CVParser()
scoring_engine = ScoringEngine()


# ============== Pydantic Models ==============

class JobCreate(BaseModel):
    title: str
    department: str
    requirements: Dict[str, Any]


class JobUpdate(BaseModel):
    title: str
    department: str
    requirements: Dict[str, Any]


class CandidateStatusUpdate(BaseModel):
    status: str  # review, shortlisted, interview, rejected


# ============== Root & Health ==============

@app.get("/")
async def root():
    return {"message": "TalentShift ATS API", "version": "2.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# ============== Job Endpoints ==============

@app.get("/api/jobs")
async def get_jobs():
    """Get all jobs"""
    jobs = JobRepository.get_all()
    return {"jobs": jobs}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int):
    """Get job by ID"""
    job = JobRepository.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/api/jobs")
async def create_job(job: JobCreate):
    """Create a new job"""
    job_id = JobRepository.create(job.title, job.department, job.requirements)
    return {"id": job_id, "message": "Job created successfully"}


@app.put("/api/jobs/{job_id}")
async def update_job(job_id: int, job: JobUpdate):
    """Update job"""
    success = JobRepository.update(job_id, job.title, job.department, job.requirements)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job updated successfully"}


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: int):
    """Delete job"""
    success = JobRepository.delete(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted successfully"}


# ============== Candidate Endpoints ==============

@app.get("/api/candidates")
async def get_candidates(
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    search: Optional[str] = None
):
    """Get all candidates with optional filters"""
    candidates = CandidateRepository.get_all(
        job_id=job_id,
        status=status,
        min_score=min_score,
        max_score=max_score,
        search=search
    )
    
    # Parse JSON fields
    for c in candidates:
        c['score_breakdown'] = json.loads(c['score_breakdown']) if c['score_breakdown'] else {}
        c['parsed_data'] = json.loads(c['parsed_data']) if c['parsed_data'] else {}
    
    return {"candidates": candidates, "total": len(candidates)}


@app.get("/api/candidates/{candidate_id}")
async def get_candidate(candidate_id: int):
    """Get candidate by ID"""
    candidate = CandidateRepository.get_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@app.put("/api/candidates/{candidate_id}/status")
async def update_candidate_status(candidate_id: int, update: CandidateStatusUpdate):
    """Update candidate status"""
    valid_statuses = ['review', 'shortlisted', 'interview', 'rejected']
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    success = CandidateRepository.update_status(candidate_id, update.status)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Status updated successfully"}


@app.delete("/api/candidates/{candidate_id}")
async def delete_candidate(candidate_id: int):
    """Delete candidate"""
    success = CandidateRepository.delete(candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate deleted successfully"}


# ============== CV Upload & Scoring ==============

@app.post("/api/cv/parse", response_model=ParsedCV)
async def parse_cv(file: UploadFile = File(...)):
    """Parse CV file (PDF or DOCX) and extract structured data"""
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    
    content = await file.read()
    
    try:
        parsed_data = cv_parser.parse(content, file.filename, file.content_type)
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CV: {str(e)}")


@app.post("/api/cv/score")
async def score_cv(
    file: UploadFile = File(...),
    job_id: Optional[int] = Query(default=1),
    save: bool = Query(default=True)
):
    """Parse CV and calculate score against job requirements"""
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    
    content = await file.read()
    
    try:
        # Get job requirements
        job = JobRepository.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Create JobRequirements from stored data
        req = job['requirements']
        job_requirements = JobRequirements(
            title=job['title'],
            education=req.get('education', {}),
            experience=req.get('experience', {}),
            skills=req.get('skills', {}),
            bootcamp=req.get('bootcamp', {}),
            portfolio=req.get('portfolio', {}),
            location=req.get('location', {})
        )
        
        # Parse CV
        parsed_data = cv_parser.parse(content, file.filename, file.content_type)
        
        # Calculate score
        score_result = scoring_engine.calculate_score(parsed_data, job_requirements)
        
        # Save to database if requested
        if save:
            candidate_id = CandidateRepository.create(
                job_id=job_id,
                filename=parsed_data.filename,
                name=parsed_data.name,
                email=parsed_data.email,
                phone=parsed_data.phone,
                location=parsed_data.location,
                total_score=score_result.total_score,
                score_breakdown={k: v.model_dump() for k, v in score_result.breakdown.items()},
                parsed_data=parsed_data.model_dump()
            )
            return {
                "candidate_id": candidate_id,
                "filename": score_result.filename,
                "candidate_name": score_result.candidate_name,
                "email": score_result.email,
                "total_score": score_result.total_score,
                "status": score_result.status,
                "breakdown": {k: v.model_dump() for k, v in score_result.breakdown.items()},
                "parsed_data": score_result.parsed_data.model_dump()
            }
        
        return score_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scoring CV: {str(e)}")


# ============== Dashboard & Stats ==============

@app.get("/api/stats")
async def get_stats(job_id: Optional[int] = None):
    """Get dashboard statistics"""
    stats = CandidateRepository.get_stats(job_id)
    return stats


@app.get("/api/analytics")
async def get_analytics(job_id: Optional[int] = None):
    """Get detailed analytics"""
    stats = CandidateRepository.get_stats(job_id)
    candidates = CandidateRepository.get_all(job_id=job_id)
    
    # Parse skills distribution
    skills_count = {}
    for c in candidates:
        parsed = json.loads(c['parsed_data']) if c['parsed_data'] else {}
        for skill in parsed.get('skills', []):
            skills_count[skill] = skills_count.get(skill, 0) + 1
    
    # Top skills
    top_skills = sorted(skills_count.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Education distribution
    edu_count = {}
    for c in candidates:
        parsed = json.loads(c['parsed_data']) if c['parsed_data'] else {}
        edu = parsed.get('education_level', 'Unknown')
        edu_count[edu] = edu_count.get(edu, 0) + 1
    
    # Location distribution
    loc_count = {}
    for c in candidates:
        loc = c.get('location', 'Unknown') or 'Unknown'
        loc_count[loc] = loc_count.get(loc, 0) + 1
    
    return {
        **stats,
        "top_skills": [{"skill": s, "count": c} for s, c in top_skills],
        "education_distribution": edu_count,
        "location_distribution": loc_count
    }


# ============== Export ==============

@app.get("/api/export/candidates")
async def export_candidates(
    job_id: Optional[int] = None,
    format: str = Query(default="csv")
):
    """Export candidates to CSV or Excel"""
    candidates = CandidateRepository.get_all(job_id=job_id)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Rank', 'Name', 'Email', 'Phone', 'Location', 
            'Total Score', 'Status', 'Education', 'Experience', 
            'Skills', 'Bootcamp', 'Portfolio'
        ])
        
        # Data
        for i, c in enumerate(candidates, 1):
            breakdown = json.loads(c['score_breakdown']) if c['score_breakdown'] else {}
            parsed = json.loads(c['parsed_data']) if c['parsed_data'] else {}
            
            writer.writerow([
                i,
                c['name'] or '',
                c['email'] or '',
                c['phone'] or '',
                c['location'] or '',
                c['total_score'],
                c['status'],
                breakdown.get('education', {}).get('score', ''),
                breakdown.get('experience', {}).get('score', ''),
                breakdown.get('skills', {}).get('score', ''),
                breakdown.get('bootcamp', {}).get('score', ''),
                breakdown.get('portfolio', {}).get('score', '')
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=candidates.csv"}
        )
    
    raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv'")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
