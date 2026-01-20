/**
 * API service for TalentShift backend
 */

const API_BASE_URL = 'http://localhost:8000'

export interface Candidate {
    id: number
    job_id: number
    filename: string
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    total_score: number
    status: 'review' | 'shortlisted' | 'interview' | 'rejected'
    score_breakdown: Record<string, ScoreBreakdown>
    parsed_data: ParsedData
    created_at: string
    updated_at: string
}

export interface ScoreBreakdown {
    score: number
    weight: number
    weighted_score: number
    details: string
    matched: string[]
    missing: string[]
}

export interface ParsedData {
    filename: string
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    education_level: string | null
    education_major: string | null
    experience_years: number | null
    experience_titles: string[]
    skills: string[]
    bootcamps: string[]
    portfolio_urls: string[]
    github_url: string | null
    linkedin_url: string | null
}

export interface Job {
    id: number
    title: string
    department: string
    requirements: JobRequirements
    created_at: string
    is_active: boolean
}

export interface JobRequirements {
    education: { min_level: string; preferred_major: string[]; weight: number }
    experience: { min_years: number; relevant_titles: string[]; weight: number }
    skills: { required: string[]; preferred: string[]; weight: number }
    bootcamp: { preferred_providers: string[]; weight: number }
    portfolio: { required: boolean; preferred_platforms: string[]; min_projects: number; weight: number }
    location: { allowed: string[]; weight: number }
}

export interface Stats {
    total_candidates: number
    shortlisted: number
    in_review: number
    interview: number
    rejected: number
    average_score: number
    score_distribution: Record<string, number>
}

export interface Analytics extends Stats {
    top_skills: { skill: string; count: number }[]
    education_distribution: Record<string, number>
    location_distribution: Record<string, number>
}

class ApiService {
    private baseUrl: string

    constructor() {
        this.baseUrl = API_BASE_URL
    }

    // Health check
    async checkHealth(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/api/health`)
            return res.ok
        } catch {
            return false
        }
    }

    // ============== Stats ==============
    async getStats(jobId?: number): Promise<Stats> {
        const params = jobId ? `?job_id=${jobId}` : ''
        const res = await fetch(`${this.baseUrl}/api/stats${params}`)
        if (!res.ok) throw new Error('Failed to fetch stats')
        return res.json()
    }

    async getAnalytics(jobId?: number): Promise<Analytics> {
        const params = jobId ? `?job_id=${jobId}` : ''
        const res = await fetch(`${this.baseUrl}/api/analytics${params}`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        return res.json()
    }

    // ============== Candidates ==============
    async getCandidates(filters?: {
        job_id?: number
        status?: string
        min_score?: number
        max_score?: number
        search?: string
    }): Promise<{ candidates: Candidate[]; total: number }> {
        const params = new URLSearchParams()
        if (filters?.job_id) params.append('job_id', filters.job_id.toString())
        if (filters?.status) params.append('status', filters.status)
        if (filters?.min_score) params.append('min_score', filters.min_score.toString())
        if (filters?.max_score) params.append('max_score', filters.max_score.toString())
        if (filters?.search) params.append('search', filters.search)

        const res = await fetch(`${this.baseUrl}/api/candidates?${params}`)
        if (!res.ok) throw new Error('Failed to fetch candidates')
        return res.json()
    }

    async getCandidate(id: number): Promise<Candidate> {
        const res = await fetch(`${this.baseUrl}/api/candidates/${id}`)
        if (!res.ok) throw new Error('Candidate not found')
        return res.json()
    }

    async updateCandidateStatus(id: number, status: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/candidates/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        })
        if (!res.ok) throw new Error('Failed to update status')
    }

    async deleteCandidate(id: number): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/candidates/${id}`, {
            method: 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to delete candidate')
    }

    // ============== Jobs ==============
    async getJobs(): Promise<{ jobs: Job[] }> {
        const res = await fetch(`${this.baseUrl}/api/jobs`)
        if (!res.ok) throw new Error('Failed to fetch jobs')
        return res.json()
    }

    async getJob(id: number): Promise<Job> {
        const res = await fetch(`${this.baseUrl}/api/jobs/${id}`)
        if (!res.ok) throw new Error('Job not found')
        return res.json()
    }

    async createJob(job: { title: string; department: string; requirements: JobRequirements }): Promise<{ id: number }> {
        const res = await fetch(`${this.baseUrl}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job)
        })
        if (!res.ok) throw new Error('Failed to create job')
        return res.json()
    }

    async updateJob(id: number, job: { title: string; department: string; requirements: JobRequirements }): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/jobs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job)
        })
        if (!res.ok) throw new Error('Failed to update job')
    }

    async deleteJob(id: number): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/jobs/${id}`, {
            method: 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to delete job')
    }

    // ============== CV Upload & Score ==============
    async scoreCV(file: File, jobId: number = 1, save: boolean = true): Promise<{
        candidate_id: number
        filename: string
        candidate_name: string | null
        email: string | null
        total_score: number
        status: string
        breakdown: Record<string, ScoreBreakdown>
        parsed_data: ParsedData
    }> {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${this.baseUrl}/api/cv/score?job_id=${jobId}&save=${save}`, {
            method: 'POST',
            body: formData
        })
        if (!res.ok) {
            const error = await res.json()
            throw new Error(error.detail || 'Failed to score CV')
        }
        return res.json()
    }

    // ============== Export ==============
    async exportCandidates(jobId?: number): Promise<Blob> {
        const params = jobId ? `?job_id=${jobId}&format=csv` : '?format=csv'
        const res = await fetch(`${this.baseUrl}/api/export/candidates${params}`)
        if (!res.ok) throw new Error('Failed to export')
        return res.blob()
    }
}

export const api = new ApiService()
