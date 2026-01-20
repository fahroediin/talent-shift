// Mock data for TalentShift ATS

export interface Candidate {
    id: string
    name: string
    email: string
    phone: string
    location: string
    score: number
    status: 'shortlisted' | 'review' | 'rejected' | 'pending'
    skills: { name: string; matched: boolean }[]
    portfolio: { platform: string; url: string }[]
    bootcamp: string | null
    education: {
        level: string
        major: string
        institution: string
        year: number
    }
    experience: {
        years: number
        title: string
        company: string
    }
    scoreBreakdown: {
        education: { score: number; weight: number; details: string }
        experience: { score: number; weight: number; details: string }
        skills: { score: number; weight: number; matched: string[]; missing: string[] }
        bootcamp: { score: number; weight: number; details: string }
        portfolio: { score: number; weight: number; platforms: string[] }
        location: { score: number; weight: number; details: string }
    }
}

export const candidates: Candidate[] = [
    {
        id: '1',
        name: 'Sarah Chen',
        email: 'sarah@email.com',
        phone: '+62 812-3456-7890',
        location: 'Jakarta',
        score: 92.5,
        status: 'shortlisted',
        skills: [
            { name: 'Python', matched: true },
            { name: 'SQL', matched: true },
            { name: 'Docker', matched: true },
        ],
        portfolio: [{ platform: 'GitHub', url: 'github.com/sarahchen' }],
        bootcamp: 'Hacktiv8',
        education: {
            level: 'S1',
            major: 'Teknik Informatika',
            institution: 'UI',
            year: 2020,
        },
        experience: { years: 5, title: 'Senior Developer', company: 'Gojek' },
        scoreBreakdown: {
            education: { score: 90, weight: 15, details: 'S1 Teknik Informatika - UI (2020)' },
            experience: { score: 100, weight: 25, details: '5 years as Senior Developer' },
            skills: { score: 100, weight: 40, matched: ['Python', 'SQL', 'Docker'], missing: [] },
            bootcamp: { score: 80, weight: 10, details: 'Hacktiv8 - Full Stack Program' },
            portfolio: { score: 80, weight: 15, platforms: ['GitHub'] },
            location: { score: 100, weight: 5, details: 'Jakarta ✓ (Preferred location)' },
        },
    },
    {
        id: '2',
        name: 'John Doe',
        email: 'john@email.com',
        phone: '+62 812-3456-7891',
        location: 'Jakarta',
        score: 78.5,
        status: 'review',
        skills: [
            { name: 'Python', matched: true },
            { name: 'SQL', matched: true },
            { name: 'REST API', matched: false },
        ],
        portfolio: [
            { platform: 'GitHub', url: 'github.com/johndoe' },
            { platform: 'Website', url: 'johndoe.dev' },
        ],
        bootcamp: 'Dicoding',
        education: {
            level: 'S1',
            major: 'Teknik Informatika',
            institution: 'UI',
            year: 2020,
        },
        experience: { years: 4, title: 'Software Developer', company: 'Tokopedia' },
        scoreBreakdown: {
            education: { score: 80, weight: 15, details: 'S1 Teknik Informatika - UI (2020)' },
            experience: { score: 100, weight: 25, details: '4 years as Software Developer' },
            skills: { score: 70, weight: 40, matched: ['Python', 'SQL', 'Docker'], missing: ['REST API'] },
            bootcamp: { score: 60, weight: 10, details: 'Dicoding - Backend Developer Path' },
            portfolio: { score: 80, weight: 15, platforms: ['GitHub', 'Website'] },
            location: { score: 100, weight: 5, details: 'Jakarta ✓ (Preferred location)' },
        },
    },
    {
        id: '3',
        name: 'Andi Pratama',
        email: 'andi@email.com',
        phone: '+62 812-3456-7892',
        location: 'Bandung',
        score: 65.0,
        status: 'review',
        skills: [
            { name: 'Python', matched: true },
            { name: 'SQL', matched: false },
            { name: 'Docker', matched: false },
        ],
        portfolio: [{ platform: 'LinkedIn', url: 'linkedin.com/in/andipratama' }],
        bootcamp: null,
        education: {
            level: 'S1',
            major: 'Sistem Informasi',
            institution: 'ITB',
            year: 2021,
        },
        experience: { years: 2, title: 'Junior Developer', company: 'Startup ABC' },
        scoreBreakdown: {
            education: { score: 70, weight: 15, details: 'S1 Sistem Informasi - ITB (2021)' },
            experience: { score: 60, weight: 25, details: '2 years as Junior Developer' },
            skills: { score: 40, weight: 40, matched: ['Python'], missing: ['SQL', 'Docker'] },
            bootcamp: { score: 0, weight: 10, details: 'No bootcamp/training' },
            portfolio: { score: 40, weight: 15, platforms: ['LinkedIn'] },
            location: { score: 80, weight: 5, details: 'Bandung (Acceptable)' },
        },
    },
    {
        id: '4',
        name: 'Budi Santoso',
        email: 'budi@email.com',
        phone: '+62 812-3456-7893',
        location: 'Surabaya',
        score: 42.0,
        status: 'rejected',
        skills: [
            { name: 'Python', matched: false },
            { name: 'SQL', matched: false },
            { name: 'Docker', matched: false },
        ],
        portfolio: [],
        bootcamp: null,
        education: {
            level: 'D3',
            major: 'Teknik Komputer',
            institution: 'Politeknik',
            year: 2022,
        },
        experience: { years: 1, title: 'IT Support', company: 'PT Random' },
        scoreBreakdown: {
            education: { score: 50, weight: 15, details: 'D3 Teknik Komputer - Politeknik (2022)' },
            experience: { score: 30, weight: 25, details: '1 year as IT Support (not relevant)' },
            skills: { score: 0, weight: 40, matched: [], missing: ['Python', 'SQL', 'Docker'] },
            bootcamp: { score: 0, weight: 10, details: 'No bootcamp/training' },
            portfolio: { score: 0, weight: 15, platforms: [] },
            location: { score: 60, weight: 5, details: 'Surabaya (Remote possible)' },
        },
    },
]

export const dashboardStats = {
    totalCandidates: 248,
    shortlisted: 32,
    inReview: 56,
    rejected: 160,
}

export const jobRequirements = {
    title: 'Backend Developer',
    department: 'Engineering',
    education: {
        minLevel: 'S1',
        preferredMajor: ['Informatika', 'Teknik Komputer', 'Sistem Informasi'],
        weight: 15,
    },
    experience: {
        minYears: 3,
        relevantTitles: ['Developer', 'Engineer', 'Programmer'],
        weight: 25,
    },
    skills: {
        required: ['Python', 'SQL', 'REST API'],
        preferred: ['Docker', 'AWS', 'PostgreSQL'],
        weight: 40,
    },
    bootcamp: {
        preferredProviders: ['Hacktiv8', 'Binar Academy', 'Dicoding', 'Purwadhika', 'Sanbercode', 'Coursera'],
        weight: 10,
    },
    portfolio: {
        required: true,
        preferredPlatforms: ['GitHub', 'GitLab', 'Personal Website', 'Behance', 'Dribbble'],
        minProjects: 2,
        weight: 15,
    },
    location: {
        allowed: ['Jakarta', 'Bandung', 'Remote'],
        weight: 5,
    },
}

export const uploadedFiles = [
    { name: 'john_doe_cv.pdf', status: 'scored', progress: 100 },
    { name: 'sarah_chen_resume.pdf', status: 'scored', progress: 100 },
    { name: 'andi_cv.docx', status: 'parsing', progress: 60 },
    { name: 'budi_resume.pdf', status: 'pending', progress: 0 },
]
