import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, Loader, AlertCircle, CheckCircle } from 'lucide-react'
import { api, Job, JobRequirements } from '../services/api'

interface WeightState {
    education: number
    experience: number
    skills: number
    bootcamp: number
    portfolio: number
    location: number
}

export default function JobTemplate() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEditing = !!id

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)

    const [title, setTitle] = useState('Backend Developer')
    const [department, setDepartment] = useState('Engineering')

    const [weights, setWeights] = useState<WeightState>({
        education: 15,
        experience: 25,
        skills: 40,
        bootcamp: 10,
        portfolio: 15,
        location: 5,
    })

    const [educationLevel, setEducationLevel] = useState('S1')
    const [educationMajors, setEducationMajors] = useState('Informatika, Teknik Komputer, Sistem Informasi')
    const [experienceYears, setExperienceYears] = useState(3)
    const [requiredSkills, setRequiredSkills] = useState<string[]>(['Python', 'SQL', 'REST API'])
    const [preferredSkills, setPreferredSkills] = useState<string[]>(['Docker', 'AWS', 'PostgreSQL'])
    const [bootcampProviders, setBootcampProviders] = useState<string[]>(['Hacktiv8', 'Binar Academy', 'Dicoding'])
    const [portfolioPlatforms, setPortfolioPlatforms] = useState<string[]>(['github', 'gitlab', 'personal_website'])
    const [minProjects, setMinProjects] = useState(2)
    const [allowedLocations, setAllowedLocations] = useState('Jakarta, Bandung, Remote')

    const [newRequiredSkill, setNewRequiredSkill] = useState('')
    const [newPreferredSkill, setNewPreferredSkill] = useState('')

    useEffect(() => {
        const init = async () => {
            const isHealthy = await api.checkHealth()
            setBackendAvailable(isHealthy)

            if (isHealthy && isEditing) {
                try {
                    const job = await api.getJob(parseInt(id!))
                    loadJobData(job)
                } catch { }
            } else if (isHealthy) {
                // Load default job for new template
                try {
                    const job = await api.getJob(1)
                    loadJobData(job)
                } catch { }
            }

            setLoading(false)
        }
        init()
    }, [id])

    const loadJobData = (job: Job) => {
        setTitle(job.title)
        setDepartment(job.department)
        const req = job.requirements

        setWeights({
            education: req.education?.weight || 15,
            experience: req.experience?.weight || 25,
            skills: req.skills?.weight || 40,
            bootcamp: req.bootcamp?.weight || 10,
            portfolio: req.portfolio?.weight || 15,
            location: req.location?.weight || 5,
        })

        setEducationLevel(req.education?.min_level || 'S1')
        setEducationMajors(req.education?.preferred_major?.join(', ') || '')
        setExperienceYears(req.experience?.min_years || 3)
        setRequiredSkills(req.skills?.required || [])
        setPreferredSkills(req.skills?.preferred || [])
        setBootcampProviders(req.bootcamp?.preferred_providers || [])
        setPortfolioPlatforms(req.portfolio?.preferred_platforms || [])
        setMinProjects(req.portfolio?.min_projects || 2)
        setAllowedLocations(req.location?.allowed?.join(', ') || '')
    }

    const handleWeightChange = (key: keyof WeightState, value: number) => {
        setWeights(prev => ({ ...prev, [key]: value }))
    }

    const addRequiredSkill = () => {
        if (newRequiredSkill && !requiredSkills.includes(newRequiredSkill)) {
            setRequiredSkills([...requiredSkills, newRequiredSkill])
            setNewRequiredSkill('')
        }
    }

    const addPreferredSkill = () => {
        if (newPreferredSkill && !preferredSkills.includes(newPreferredSkill)) {
            setPreferredSkills([...preferredSkills, newPreferredSkill])
            setNewPreferredSkill('')
        }
    }

    const removeSkill = (skill: string, type: 'required' | 'preferred') => {
        if (type === 'required') {
            setRequiredSkills(requiredSkills.filter(s => s !== skill))
        } else {
            setPreferredSkills(preferredSkills.filter(s => s !== skill))
        }
    }

    const toggleProvider = (provider: string) => {
        setBootcampProviders(prev =>
            prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
        )
    }

    const togglePlatform = (platform: string) => {
        setPortfolioPlatforms(prev =>
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        )
    }

    const buildRequirements = (): JobRequirements => ({
        education: {
            min_level: educationLevel,
            preferred_major: educationMajors.split(',').map(s => s.trim()).filter(Boolean),
            weight: weights.education
        },
        experience: {
            min_years: experienceYears,
            relevant_titles: ['Developer', 'Engineer', 'Programmer'],
            weight: weights.experience
        },
        skills: {
            required: requiredSkills,
            preferred: preferredSkills,
            weight: weights.skills
        },
        bootcamp: {
            preferred_providers: bootcampProviders,
            weight: weights.bootcamp
        },
        portfolio: {
            required: true,
            preferred_platforms: portfolioPlatforms,
            min_projects: minProjects,
            weight: weights.portfolio
        },
        location: {
            allowed: allowedLocations.split(',').map(s => s.trim()).filter(Boolean),
            weight: weights.location
        }
    })

    const handleSave = async () => {
        if (!backendAvailable) {
            alert('Backend tidak tersedia')
            return
        }

        setSaving(true)
        try {
            const jobData = { title, department, requirements: buildRequirements() }

            if (isEditing) {
                await api.updateJob(parseInt(id!), jobData)
            } else {
                await api.createJob(jobData)
            }

            alert('Job template saved successfully!')
            navigate('/job-template/1')
        } catch (err) {
            alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setSaving(false)
        }
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader className="spin" size={48} color="var(--color-primary)" />
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{isEditing ? 'Edit Job Requirement' : 'Create Job Requirement'}</h1>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader size={16} className="spin" /> : <Save size={16} />}
                        {isEditing ? 'Update' : 'Save'} Job
                    </button>
                </div>
            </div>

            {backendAvailable === false && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--color-warning-bg)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: 'var(--color-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertCircle size={18} />
                    Backend tidak tersedia
                </div>
            )}

            {backendAvailable && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--color-success-bg)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <CheckCircle size={18} />
                    Backend connected - Job templates saved to database
                </div>
            )}

            <div className="two-column">
                {/* Left Column - Form */}
                <div>
                    {/* Basic Information */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-title">Basic Information</div>
                        <div className="form-row" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Job Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                    <option>Engineering</option>
                                    <option>Product</option>
                                    <option>Design</option>
                                    <option>Marketing</option>
                                    <option>HR</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Education */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-title">🎓 Education Requirements</div>
                        <div className="form-row" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Minimum Level</label>
                                <select className="form-input" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                                    <option value="S1">S1 (Bachelor)</option>
                                    <option value="S2">S2 (Master)</option>
                                    <option value="D3">D3 (Diploma)</option>
                                    <option value="SMA">SMA/SMK</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Preferred Major (comma separated)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={educationMajors}
                                    onChange={(e) => setEducationMajors(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weight</label>
                            <div className="weight-slider">
                                <input
                                    type="range"
                                    className="slider"
                                    value={weights.education}
                                    min="0"
                                    max="50"
                                    onChange={(e) => handleWeightChange('education', parseInt(e.target.value))}
                                />
                                <span className="weight-value">{weights.education}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-title">🛠️ Required Skills</div>
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label className="form-label">Required (Must Have)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {requiredSkills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="tag tag-green"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => removeSkill(skill, 'required')}
                                    >
                                        {skill} ✕
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Add skill..."
                                    value={newRequiredSkill}
                                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addRequiredSkill()}
                                />
                                <button className="btn btn-outline" onClick={addRequiredSkill}>Add</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preferred (Nice to Have)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {preferredSkills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="tag tag-purple"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => removeSkill(skill, 'preferred')}
                                    >
                                        {skill} ✕
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Add skill..."
                                    value={newPreferredSkill}
                                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addPreferredSkill()}
                                />
                                <button className="btn btn-outline" onClick={addPreferredSkill}>Add</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weight</label>
                            <div className="weight-slider">
                                <input
                                    type="range"
                                    className="slider"
                                    value={weights.skills}
                                    min="0"
                                    max="100"
                                    onChange={(e) => handleWeightChange('skills', parseInt(e.target.value))}
                                />
                                <span className="weight-value">{weights.skills}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Bootcamp */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-title">📚 Bootcamp/Training</div>
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label className="form-label">Preferred Providers</label>
                            <div className="checkbox-group">
                                {['Hacktiv8', 'Binar Academy', 'Dicoding', 'Purwadhika', 'Sanbercode'].map((provider) => (
                                    <label key={provider} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={bootcampProviders.includes(provider)}
                                            onChange={() => toggleProvider(provider)}
                                        />
                                        {provider}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weight</label>
                            <div className="weight-slider">
                                <input
                                    type="range"
                                    className="slider"
                                    value={weights.bootcamp}
                                    min="0"
                                    max="50"
                                    onChange={(e) => handleWeightChange('bootcamp', parseInt(e.target.value))}
                                />
                                <span className="weight-value">{weights.bootcamp}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Weight Distribution */}
                <div>
                    <div className="card" style={{ position: 'sticky', top: '24px' }}>
                        <div className="card-title">Weight Distribution</div>
                        <div className="pie-chart-container">
                            <div
                                className="pie-chart"
                                style={{
                                    background: `conic-gradient(
                    var(--color-primary) 0deg ${weights.education * 3.6}deg,
                    var(--color-primary-light) ${weights.education * 3.6}deg ${(weights.education + weights.experience) * 3.6}deg,
                    var(--color-success) ${(weights.education + weights.experience) * 3.6}deg ${(weights.education + weights.experience + weights.skills) * 3.6}deg,
                    var(--color-warning) ${(weights.education + weights.experience + weights.skills) * 3.6}deg ${(weights.education + weights.experience + weights.skills + weights.bootcamp) * 3.6}deg,
                    #EC4899 ${(weights.education + weights.experience + weights.skills + weights.bootcamp) * 3.6}deg ${(weights.education + weights.experience + weights.skills + weights.bootcamp + weights.portfolio) * 3.6}deg,
                    var(--color-text-muted) ${(weights.education + weights.experience + weights.skills + weights.bootcamp + weights.portfolio) * 3.6}deg 360deg
                  )`
                                }}
                            >
                                <div className="pie-center">
                                    <span>Total</span>
                                    <strong style={{ color: totalWeight === 100 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                        {totalWeight}%
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '14px' }}>
                            <div className="legend-item"><span>🎓 Education</span><span>{weights.education}%</span></div>
                            <div className="legend-item"><span>💼 Experience</span><span>{weights.experience}%</span></div>
                            <div className="legend-item"><span>🛠️ Skills</span><span>{weights.skills}%</span></div>
                            <div className="legend-item"><span>📚 Bootcamp</span><span>{weights.bootcamp}%</span></div>
                            <div className="legend-item"><span>🔗 Portfolio</span><span>{weights.portfolio}%</span></div>
                            <div className="legend-item"><span>📍 Location</span><span>{weights.location}%</span></div>
                        </div>

                        {totalWeight !== 100 && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'var(--color-warning-bg)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: 'var(--color-warning)'
                            }}>
                                ⚠️ Weights should total 100% (currently {totalWeight}%)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
