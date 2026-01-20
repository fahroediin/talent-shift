"""
Pydantic schemas for TalentShift ATS
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class JobRequirements(BaseModel):
    """Job requirement template for scoring"""
    title: str
    education: Dict[str, Any]  # min_level, preferred_major, weight
    experience: Dict[str, Any]  # min_years, relevant_titles, weight
    skills: Dict[str, Any]  # required, preferred, weight
    bootcamp: Dict[str, Any]  # preferred_providers, weight
    portfolio: Dict[str, Any]  # required, preferred_platforms, min_projects, weight
    location: Dict[str, Any]  # allowed, weight


class ParsedCV(BaseModel):
    """Parsed CV data structure"""
    filename: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    
    # Education
    education_level: Optional[str] = None  # SMA, D3, S1, S2, S3
    education_major: Optional[str] = None
    education_institution: Optional[str] = None
    education_year: Optional[int] = None
    
    # Experience
    experience_years: Optional[int] = None
    experience_titles: List[str] = []
    experience_companies: List[str] = []
    
    # Skills
    skills: List[str] = []
    
    # Bootcamp/Training
    bootcamps: List[str] = []
    certifications: List[str] = []
    
    # Portfolio
    portfolio_urls: List[str] = []
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    
    # Raw text for debugging
    raw_text: Optional[str] = None


class ScoreBreakdown(BaseModel):
    """Individual category score"""
    score: float  # 0-100
    weight: int   # percentage weight
    weighted_score: float  # score * weight / 100
    details: str
    matched: List[str] = []
    missing: List[str] = []


class CandidateScore(BaseModel):
    """Complete scoring result for a candidate"""
    filename: str
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    total_score: float
    status: str  # highly_qualified, qualified, partially_qualified, not_qualified
    
    breakdown: Dict[str, ScoreBreakdown]
    
    # Parsed data reference
    parsed_data: ParsedCV
