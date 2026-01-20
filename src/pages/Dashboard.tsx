import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { api, Candidate, Stats } from '../services/api'

function getScoreClass(score: number) {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
}

function getStatusClass(status: string) {
    switch (status) {
        case 'shortlisted': return 'tag-green'
        case 'interview': return 'tag-purple'
        case 'rejected': return 'tag-red'
        default: return 'tag-gray'
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'shortlisted': return 'Shortlisted'
        case 'interview': return 'Interview'
        case 'rejected': return 'Rejected'
        default: return 'In Review'
    }
}

export default function Dashboard() {
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [scoreFilter, setScoreFilter] = useState('')

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            const isHealthy = await api.checkHealth()
            setBackendAvailable(isHealthy)

            if (!isHealthy) {
                setError('Backend tidak tersedia')
                setLoading(false)
                return
            }

            // Build filters
            const filters: { status?: string; min_score?: number; max_score?: number; search?: string } = {}
            if (statusFilter) filters.status = statusFilter
            if (searchQuery) filters.search = searchQuery
            if (scoreFilter) {
                const [min, max] = scoreFilter.split('-').map(Number)
                filters.min_score = min
                filters.max_score = max
            }

            const [statsData, candidatesData] = await Promise.all([
                api.getStats(),
                api.getCandidates(filters)
            ])

            setStats(statsData)
            setCandidates(candidatesData.candidates)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [statusFilter, scoreFilter])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchData()
    }

    const handleExport = async () => {
        try {
            const blob = await api.exportCandidates()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'candidates.csv'
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            alert('Failed to export: ' + (err instanceof Error ? err.message : 'Unknown error'))
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title">Dashboard</h1>
                <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Backend Status Banner */}
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
                    Backend tidak tersedia. Jalankan: <code>cd backend && python main.py</code>
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
                    Backend connected - Data real-time dari database
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats?.total_candidates ?? '-'}</div>
                    <div className="stat-label">Total Candidates</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {stats?.shortlisted ?? '-'}
                    </div>
                    <div className="stat-label">Shortlisted</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                        {stats?.in_review ?? '-'}
                    </div>
                    <div className="stat-label">In Review</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                        {stats?.rejected ?? '-'}
                    </div>
                    <div className="stat-label">Rejected</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <form onSubmit={handleSearch} style={{ position: 'relative', flex: 1, minWidth: '250px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-muted)'
                            }}
                        />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-outline">Search</button>
                </form>
                <select
                    className="select-input"
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                >
                    <option value="">All Scores</option>
                    <option value="80-100">80-100 (High)</option>
                    <option value="60-79">60-79 (Medium)</option>
                    <option value="0-59">0-59 (Low)</option>
                </select>
                <select
                    className="select-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="review">In Review</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                </select>
                <button className="btn btn-primary" onClick={handleExport}>
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Candidates Table */}
            {error ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    <AlertCircle size={48} style={{ marginBottom: '16px' }} />
                    <p>{error}</p>
                </div>
            ) : candidates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    <p>No candidates found.</p>
                    <Link to="/upload" className="btn btn-primary" style={{ marginTop: '16px' }}>
                        Upload CVs
                    </Link>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate</th>
                                <th>Score</th>
                                <th>Skills</th>
                                <th>Education</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map((candidate, index) => (
                                <tr key={candidate.id}>
                                    <td><strong>{index + 1}</strong></td>
                                    <td>
                                        <strong>{candidate.name || 'Unknown'}</strong>
                                        <br />
                                        <small style={{ color: 'var(--color-text-muted)' }}>
                                            {candidate.email || candidate.filename}
                                        </small>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <strong>{candidate.total_score?.toFixed(1) || '-'}</strong>
                                            <div className="score-bar">
                                                <div
                                                    className={`score-bar-fill ${getScoreClass(candidate.total_score || 0)}`}
                                                    style={{ width: `${Math.min(candidate.total_score || 0, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {(candidate.parsed_data?.skills || []).slice(0, 4).map((skill) => (
                                                <span key={skill} className="tag tag-green">{skill}</span>
                                            ))}
                                            {(candidate.parsed_data?.skills?.length || 0) > 4 && (
                                                <span className="tag tag-gray">+{candidate.parsed_data.skills.length - 4}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {candidate.parsed_data?.education_level ? (
                                            <span className="tag tag-purple">{candidate.parsed_data.education_level}</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        {candidate.location || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                                    </td>
                                    <td>
                                        <span className={`tag ${getStatusClass(candidate.status)}`}>
                                            {getStatusLabel(candidate.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/candidate/${candidate.id}`} className="btn btn-outline btn-sm">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
