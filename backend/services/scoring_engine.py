"""
Scoring Engine Service
Rule-based CV scoring against job requirements
"""

from typing import Dict, Any, List
from rapidfuzz import fuzz
from models.schemas import ParsedCV, JobRequirements, CandidateScore, ScoreBreakdown


class ScoringEngine:
    """
    Rule-based scoring engine that calculates candidate scores
    based on job requirements matching
    
    Formula: Total Score = Σ (Category Score × Category Weight)
    """
    
    # Skill synonyms dictionary
    SKILL_SYNONYMS = {
        'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
        'typescript': ['ts'],
        'python': ['py', 'python3'],
        'postgresql': ['postgres', 'pgsql'],
        'kubernetes': ['k8s'],
        'machine learning': ['ml'],
        'artificial intelligence': ['ai'],
        'rest api': ['restful', 'restful api'],
        'react': ['reactjs', 'react.js'],
        'vue': ['vuejs', 'vue.js'],
        'angular': ['angularjs'],
        'node': ['nodejs', 'node.js'],
        'next': ['nextjs', 'next.js'],
    }
    
    def calculate_score(self, parsed_cv: ParsedCV, requirements: JobRequirements) -> CandidateScore:
        """
        Calculate total score and breakdown for a candidate
        """
        breakdown = {}
        
        # Calculate each category
        breakdown['education'] = self._score_education(parsed_cv, requirements.education)
        breakdown['experience'] = self._score_experience(parsed_cv, requirements.experience)
        breakdown['skills'] = self._score_skills(parsed_cv, requirements.skills)
        breakdown['bootcamp'] = self._score_bootcamp(parsed_cv, requirements.bootcamp)
        breakdown['portfolio'] = self._score_portfolio(parsed_cv, requirements.portfolio)
        breakdown['location'] = self._score_location(parsed_cv, requirements.location)
        
        # Calculate total weighted score
        total_score = sum(cat.weighted_score for cat in breakdown.values())
        
        # Determine status
        if total_score >= 80:
            status = "highly_qualified"
        elif total_score >= 60:
            status = "qualified"
        elif total_score >= 40:
            status = "partially_qualified"
        else:
            status = "not_qualified"
        
        return CandidateScore(
            filename=parsed_cv.filename,
            candidate_name=parsed_cv.name,
            email=parsed_cv.email,
            total_score=round(total_score, 1),
            status=status,
            breakdown=breakdown,
            parsed_data=parsed_cv
        )
    
    def _score_education(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score education requirements"""
        weight = req.get('weight', 15)
        score = 0
        details = []
        matched = []
        missing = []
        
        # Education level scoring
        level_scores = {'S3': 100, 'S2': 90, 'S1': 80, 'D4': 75, 'D3': 60, 'SMA': 40}
        min_level = req.get('min_level', 'S1')
        min_score = level_scores.get(min_level, 80)
        
        if cv.education_level:
            cv_score = level_scores.get(cv.education_level, 50)
            if cv_score >= min_score:
                score += 60
                matched.append(cv.education_level)
                details.append(f"{cv.education_level} ✓")
            else:
                score += 30
                missing.append(f"Min: {min_level}")
                details.append(f"{cv.education_level} (below {min_level})")
        else:
            missing.append("Education level not found")
            details.append("Education not detected")
        
        # Major matching
        preferred_majors = req.get('preferred_major', [])
        if cv.education_major and preferred_majors:
            if self._fuzzy_match_any(cv.education_major, preferred_majors):
                score += 40
                matched.append(cv.education_major)
                details.append(f"{cv.education_major} ✓")
            else:
                score += 20
                details.append(f"{cv.education_major}")
        elif cv.education_major:
            score += 25
            details.append(cv.education_major)
        
        return ScoreBreakdown(
            score=min(score, 100),
            weight=weight,
            weighted_score=round(min(score, 100) * weight / 100, 2),
            details=" | ".join(details) if details else "No education data",
            matched=matched,
            missing=missing
        )
    
    def _score_experience(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score experience requirements"""
        weight = req.get('weight', 25)
        score = 0
        details = []
        matched = []
        missing = []
        
        min_years = req.get('min_years', 3)
        relevant_titles = req.get('relevant_titles', [])
        
        # Years of experience
        if cv.experience_years:
            if cv.experience_years >= min_years:
                score += 60
                matched.append(f"{cv.experience_years} years")
                details.append(f"{cv.experience_years} years experience ✓")
            elif cv.experience_years >= min_years - 1:
                score += 40
                details.append(f"{cv.experience_years} years (close to {min_years} required)")
            else:
                score += 20
                missing.append(f"Need {min_years}+ years")
                details.append(f"{cv.experience_years} years (need {min_years}+)")
        else:
            missing.append("Experience years not found")
            details.append("Experience not detected")
        
        # Relevant job titles
        if cv.experience_titles and relevant_titles:
            title_matches = 0
            for cv_title in cv.experience_titles:
                if self._fuzzy_match_any(cv_title, relevant_titles):
                    title_matches += 1
                    matched.append(cv_title)
            
            if title_matches > 0:
                score += min(40, title_matches * 20)
                details.append(f"Relevant titles: {title_matches}")
        
        return ScoreBreakdown(
            score=min(score, 100),
            weight=weight,
            weighted_score=round(min(score, 100) * weight / 100, 2),
            details=" | ".join(details) if details else "No experience data",
            matched=matched,
            missing=missing
        )
    
    def _score_skills(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score skills requirements"""
        weight = req.get('weight', 40)
        required_skills = req.get('required', [])
        preferred_skills = req.get('preferred', [])
        
        matched = []
        missing = []
        
        # Check required skills
        required_matched = 0
        for skill in required_skills:
            if self._skill_matches(skill, cv.skills):
                required_matched += 1
                matched.append(skill)
            else:
                missing.append(skill)
        
        # Check preferred skills
        preferred_matched = 0
        for skill in preferred_skills:
            if self._skill_matches(skill, cv.skills):
                preferred_matched += 1
                matched.append(f"{skill} (bonus)")
        
        # Calculate score
        required_score = (required_matched / len(required_skills) * 70) if required_skills else 35
        preferred_score = (preferred_matched / len(preferred_skills) * 30) if preferred_skills else 15
        score = required_score + preferred_score
        
        details = f"Required: {required_matched}/{len(required_skills)}"
        if preferred_skills:
            details += f" | Preferred: {preferred_matched}/{len(preferred_skills)}"
        
        return ScoreBreakdown(
            score=round(min(score, 100), 1),
            weight=weight,
            weighted_score=round(min(score, 100) * weight / 100, 2),
            details=details,
            matched=matched,
            missing=missing
        )
    
    def _score_bootcamp(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score bootcamp/training requirements"""
        weight = req.get('weight', 10)
        preferred_providers = req.get('preferred_providers', [])
        
        matched = []
        score = 0
        
        if cv.bootcamps:
            for bootcamp in cv.bootcamps:
                if self._fuzzy_match_any(bootcamp, preferred_providers):
                    matched.append(bootcamp)
                    score += 50
            
            # Cap at 100
            score = min(score, 100)
            details = f"Found: {', '.join(cv.bootcamps)}"
        else:
            details = "No bootcamp/training detected"
        
        return ScoreBreakdown(
            score=score,
            weight=weight,
            weighted_score=round(score * weight / 100, 2),
            details=details,
            matched=matched,
            missing=[]
        )
    
    def _score_portfolio(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score portfolio requirements"""
        weight = req.get('weight', 15)
        is_required = req.get('required', False)
        preferred_platforms = req.get('preferred_platforms', [])
        
        matched = []
        missing = []
        score = 0
        
        has_portfolio = bool(cv.github_url or cv.linkedin_url or cv.website_url or cv.portfolio_urls)
        
        if has_portfolio:
            score += 40  # Base score for having portfolio
            
            if cv.github_url:
                matched.append("GitHub")
                score += 25
            if cv.linkedin_url:
                matched.append("LinkedIn")
                score += 15
            if cv.website_url:
                matched.append("Website")
                score += 20
            
            details = f"Platforms: {', '.join(matched)}"
        else:
            if is_required:
                missing.append("Portfolio required")
            details = "No portfolio found"
        
        return ScoreBreakdown(
            score=min(score, 100),
            weight=weight,
            weighted_score=round(min(score, 100) * weight / 100, 2),
            details=details,
            matched=matched,
            missing=missing
        )
    
    def _score_location(self, cv: ParsedCV, req: Dict[str, Any]) -> ScoreBreakdown:
        """Score location requirements"""
        weight = req.get('weight', 5)
        allowed_locations = req.get('allowed', [])
        
        matched = []
        score = 0
        
        if cv.location and allowed_locations:
            if self._fuzzy_match_any(cv.location, allowed_locations):
                score = 100
                matched.append(cv.location)
                details = f"{cv.location} ✓"
            else:
                score = 50
                details = f"{cv.location} (not preferred)"
        elif 'remote' in [loc.lower() for loc in allowed_locations]:
            score = 80
            details = "Remote available"
        else:
            score = 50
            details = "Location not detected"
        
        return ScoreBreakdown(
            score=score,
            weight=weight,
            weighted_score=round(score * weight / 100, 2),
            details=details,
            matched=matched,
            missing=[]
        )
    
    def _skill_matches(self, required_skill: str, cv_skills: List[str]) -> bool:
        """Check if a required skill matches any CV skill (with synonyms)"""
        required_lower = required_skill.lower()
        cv_skills_lower = [s.lower() for s in cv_skills]
        
        # Direct match
        if required_lower in cv_skills_lower:
            return True
        
        # Synonym match
        synonyms = self.SKILL_SYNONYMS.get(required_lower, [])
        for synonym in synonyms:
            if synonym in cv_skills_lower:
                return True
        
        # Check reverse (cv skill might be main, required might be synonym)
        for main_skill, syns in self.SKILL_SYNONYMS.items():
            if required_lower in syns and main_skill in cv_skills_lower:
                return True
        
        # Fuzzy match as fallback
        for cv_skill in cv_skills_lower:
            if fuzz.ratio(required_lower, cv_skill) >= 85:
                return True
        
        return False
    
    def _fuzzy_match_any(self, value: str, options: List[str], threshold: int = 80) -> bool:
        """Check if value fuzzy matches any option"""
        value_lower = value.lower()
        for option in options:
            if fuzz.ratio(value_lower, option.lower()) >= threshold:
                return True
            if fuzz.partial_ratio(value_lower, option.lower()) >= 90:
                return True
        return False
