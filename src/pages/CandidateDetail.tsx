import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
    GraduationCap,
    Briefcase,
    Wrench,
    BookOpen,
    Link2,
    MapPin,
    UserCheck,
    Calendar,
    XCircle,
    Download,
    FileText,
    ArrowLeft,
    Loader
} from 'lucide-react'
import { api, Candidate } from '../services/api'

function getScoreClass(score: number) {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
}

const breakdownIcons: Record<string, typeof GraduationCap> = {
    education: GraduationCap,
    experience: Briefcase,
    skills: Wrench,
    bootcamp: BookOpen,
    portfolio: Link2,
    location: MapPin,
}

const breakdownLabels: Record<string, string> = {
    education: 'Education',
    experience: 'Experience',
    skills: 'Skills',
    bootcamp: 'Bootcamp/Training',
    portfolio: 'Portfolio',
    location: 'Location',
}

export default function CandidateDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [candidate, setCandidate] = useState<Candidate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        const fetchCandidate = async () => {
            if (!id) return

            try {
                const data = await api.getCandidate(parseInt(id))
                setCandidate(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load candidate')
            } finally {
                setLoading(false)
            }
        }

        fetchCandidate()
    }, [id])

    const handleStatusUpdate = async (status: string) => {
        if (!candidate) return

        setUpdating(true)
        try {
            await api.updateCandidateStatus(candidate.id, status)
            setCandidate({ ...candidate, status: status as Candidate['status'] })
        } catch (err) {
            alert('Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!candidate || !confirm('Are you sure you want to delete this candidate?')) return

        try {
            await api.deleteCandidate(candidate.id)
            navigate('/')
        } catch (err) {
            alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'))
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader className="spin" size={48} color="var(--color-primary)" />
            </div>
        )
    }

    if (error || !candidate) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>{error || 'Candidate not found'}</p>
                <Link to="/" className="btn btn-outline" style={{ marginTop: '16px' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div>
            {/* Back Button */}
            <Link to="/" className="btn btn-outline" style={{ marginBottom: '16px' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            {/* Profile Header */}
            <div className="profile-header">
                <div className="avatar">
                    {(candidate.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="profile-info">
                    <div className="profile-name">{candidate.name || 'Unknown Candidate'}</div>
                    <div className="profile-meta">
                        {candidate.email || '-'} • {candidate.phone || '-'} • {candidate.location || '-'}
                    </div>
                </div>
                <div className="score-badge">{candidate.total_score?.toFixed(1) || '-'}</div>
            </div>

            <div className="two-column">
                {/* Left Column - Score Breakdown */}
                <div>
                    <h3 style={{ marginBottom: '16px' }}>Score Breakdown</h3>
                    <div className="breakdown-grid">
                        {Object.keys(breakdownLabels).map((key) => {
                            const breakdown = candidate.score_breakdown?.[key]
                            if (!breakdown) return null

                            const Icon = breakdownIcons[key]
                            const label = breakdownLabels[key]

                            return (
                                <div key={key} className="breakdown-card">
                                    <div className="breakdown-header">
                                        <span className="breakdown-title">
                                            <Icon size={18} />
                                            {label}
                                        </span>
                                        <span className={`breakdown-score ${getScoreClass(breakdown.score)}`}>
                                            {breakdown.score?.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="breakdown-bar">
                                        <div
                                            className={`score-bar-fill ${getScoreClass(breakdown.score)}`}
                                            style={{ width: `${Math.min(breakdown.score, 100)}%` }}
                                        />
                                    </div>

                                    {breakdown.matched && breakdown.matched.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                            {breakdown.matched.map((item: string) => (
                                                <span key={item} className="tag tag-green">{item} ✓</span>
                                            ))}
                                        </div>
                                    )}

                                    {breakdown.missing && breakdown.missing.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                            {breakdown.missing.map((item: string) => (
                                                <span key={item} className="tag tag-red">{item} ✗</span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="breakdown-details">{breakdown.details}</div>
                                    <div className="breakdown-weight">Weight: {breakdown.weight}%</div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Parsed Data */}
                    {candidate.parsed_data && (
                        <div className="card" style={{ marginTop: '24px' }}>
                            <div className="card-title">Extracted Data</div>

                            {candidate.parsed_data.skills && candidate.parsed_data.skills.length > 0 && (
                                <div style={{ marginTop: '16px' }}>
                                    <strong>Skills:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {candidate.parsed_data.skills.map((skill) => (
                                            <span key={skill} className="tag tag-purple">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {candidate.parsed_data.bootcamps && candidate.parsed_data.bootcamps.length > 0 && (
                                <div style={{ marginTop: '16px' }}>
                                    <strong>Bootcamp/Training:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {candidate.parsed_data.bootcamps.map((bc) => (
                                            <span key={bc} className="tag tag-green">{bc}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {candidate.parsed_data.github_url && (
                                <div style={{ marginTop: '16px' }}>
                                    <strong>GitHub:</strong>{' '}
                                    <a href={candidate.parsed_data.github_url} target="_blank" rel="noopener noreferrer">
                                        {candidate.parsed_data.github_url}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Actions & CV Preview */}
                <div>
                    {/* Actions */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-title">Actions</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                            <button
                                className="btn btn-success"
                                style={{ width: '100%' }}
                                onClick={() => handleStatusUpdate('shortlisted')}
                                disabled={updating || candidate.status === 'shortlisted'}
                            >
                                <UserCheck size={18} />
                                {candidate.status === 'shortlisted' ? 'Already Shortlisted' : 'Shortlist Candidate'}
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                onClick={() => handleStatusUpdate('interview')}
                                disabled={updating || candidate.status === 'interview'}
                            >
                                <Calendar size={18} />
                                {candidate.status === 'interview' ? 'Interview Scheduled' : 'Schedule Interview'}
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ width: '100%' }}
                                onClick={() => handleStatusUpdate('rejected')}
                                disabled={updating || candidate.status === 'rejected'}
                            >
                                <XCircle size={18} />
                                {candidate.status === 'rejected' ? 'Already Rejected' : 'Reject'}
                            </button>
                        </div>
                    </div>

                    {/* CV Preview */}
                    <div className="card">
                        <div className="card-title">CV File</div>
                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: '8px',
                            height: '150px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '16px',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <FileText size={48} color="var(--color-text-muted)" strokeWidth={1} />
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                                {candidate.filename}
                            </span>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="card" style={{ marginTop: '24px', borderColor: 'var(--color-danger)' }}>
                        <div className="card-title" style={{ color: 'var(--color-danger)' }}>Danger Zone</div>
                        <button
                            className="btn btn-outline"
                            style={{ width: '100%', marginTop: '16px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            onClick={handleDelete}
                        >
                            Delete Candidate
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
