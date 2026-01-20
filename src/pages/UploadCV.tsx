import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, X, CheckCircle, Loader, AlertCircle } from 'lucide-react'
import { api, Job } from '../services/api'

interface UploadedFile {
    id: string
    name: string
    size: number
    status: 'uploading' | 'parsing' | 'scored' | 'error'
    progress: number
    score?: number
    candidateId?: number
    candidateName?: string
    error?: string
}

function getStatusTag(status: string, error?: string) {
    switch (status) {
        case 'scored': return <span className="tag tag-green"><CheckCircle size={12} /> Scored</span>
        case 'parsing': return <span className="tag tag-purple"><Loader size={12} className="spin" /> Parsing...</span>
        case 'uploading': return <span className="tag tag-purple"><Loader size={12} className="spin" /> Uploading...</span>
        case 'error': return <span className="tag tag-red" title={error}><AlertCircle size={12} /> Error</span>
        default: return <span className="tag tag-gray">Pending</span>
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getScoreColor(score: number): string {
    if (score >= 80) return 'var(--color-success)'
    if (score >= 60) return 'var(--color-warning)'
    return 'var(--color-danger)'
}

export default function UploadCV() {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)
    const [job, setJob] = useState<Job | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const init = async () => {
            const isHealthy = await api.checkHealth()
            setBackendAvailable(isHealthy)

            if (isHealthy) {
                try {
                    const jobData = await api.getJob(1)
                    setJob(jobData)
                } catch {
                    // Use default
                }
            }
        }
        init()
    }, [])

    const processFile = async (file: File) => {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (!validTypes.includes(file.type)) {
            alert(`File "${file.name}" tidak didukung. Hanya PDF dan DOCX yang diizinkan.`)
            return
        }

        const isDuplicate = files.some(f => f.name === file.name && f.size === file.size)
        if (isDuplicate) {
            alert(`File "${file.name}" sudah diupload sebelumnya.`)
            return
        }

        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9)

        const newFile: UploadedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            status: 'uploading',
            progress: 0,
        }

        setFiles(prev => [...prev, newFile])

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 25) {
            await new Promise(r => setTimeout(r, 100))
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: i } : f
            ))
        }

        // Update to parsing
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'parsing', progress: 100 } : f
        ))

        if (!backendAvailable) {
            // Fallback simulation
            await new Promise(r => setTimeout(r, 1500))
            let hash = 0
            const str = file.name + file.size.toString()
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i)
                hash = ((hash << 5) - hash) + char
                hash = hash & hash
            }
            const score = (Math.abs(hash) % 61) + 40

            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, status: 'scored', score } : f
            ))
            return
        }

        // Real backend scoring
        try {
            const result = await api.scoreCV(file, job?.id || 1, true)
            setFiles(prev => prev.map(f =>
                f.id === fileId ? {
                    ...f,
                    status: 'scored',
                    score: result.total_score,
                    candidateId: result.candidate_id,
                    candidateName: result.candidate_name || undefined
                } : f
            ))
        } catch (error) {
            setFiles(prev => prev.map(f =>
                f.id === fileId ? {
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                } : f
            ))
        }
    }

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)
        const droppedFiles = Array.from(e.dataTransfer.files)
        droppedFiles.forEach(processFile)
    }

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            selectedFiles.forEach(processFile)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleClickUpload = () => {
        fileInputRef.current?.click()
    }

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id))
    }

    const scoredCount = files.filter(f => f.status === 'scored').length
    const pendingCount = files.filter(f => f.status !== 'scored' && f.status !== 'error').length
    const errorCount = files.filter(f => f.status === 'error').length

    return (
        <div>
            <div className="breadcrumb">
                <Link to="/job-template">Jobs</Link> → {job?.title || 'Backend Developer'} → Upload CVs
            </div>
            <h1 className="page-title" style={{ marginBottom: '24px' }}>Upload CV Files</h1>

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
                    Backend tidak tersedia. Menggunakan mode simulasi.
                </div>
            )}

            {backendAvailable === true && (
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
                    Backend connected - CV akan di-parse dan disimpan ke database
                </div>
            )}

            <div className="two-column">
                <div>
                    <div
                        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleClickUpload}
                        style={{
                            borderColor: isDragOver ? 'var(--color-primary)' : undefined,
                            background: isDragOver ? 'var(--color-primary-bg)' : undefined,
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <div className="upload-icon">
                            <Upload size={48} strokeWidth={1.5} color="var(--color-primary)" />
                        </div>
                        <div className="upload-text">
                            {isDragOver ? 'Drop files here!' : 'Drag & drop CV files here'}
                        </div>
                        <div className="upload-subtext">or click to browse</div>
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <span className="tag tag-purple">PDF</span>
                            <span className="tag tag-purple">DOCX</span>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '24px' }}>
                        <div className="card-title">Job Requirements</div>
                        <h3 style={{ marginBottom: '16px' }}>{job?.title || 'Backend Developer'}</h3>

                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                            Required Skills:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            {(job?.requirements?.skills?.required || ['Python', 'SQL', 'REST API']).map((skill) => (
                                <span key={skill} className="tag tag-green">{skill}</span>
                            ))}
                        </div>

                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                            Preferred:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(job?.requirements?.skills?.preferred || ['Docker', 'AWS', 'PostgreSQL']).map((skill) => (
                                <span key={skill} className="tag tag-purple">{skill}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">Upload Progress</div>

                    <div style={{ marginTop: '16px' }}>
                        {files.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: 'var(--color-text-muted)',
                                fontSize: '14px'
                            }}>
                                No files uploaded yet.
                                <br />
                                Drag & drop or click above to add CVs.
                            </div>
                        ) : (
                            files.map((file) => (
                                <div key={file.id} className="progress-item" style={{
                                    background: file.status === 'error' ? 'var(--color-danger-bg)' : undefined
                                }}>
                                    <FileText size={20} color="var(--color-text-muted)" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            marginBottom: '4px',
                                            fontSize: '14px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{
                                                maxWidth: '150px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {file.candidateName || file.name}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                {formatFileSize(file.size)}
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${file.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getStatusTag(file.status, file.error)}
                                        {file.score !== undefined && (
                                            <Link
                                                to={file.candidateId ? `/candidate/${file.candidateId}` : '#'}
                                                style={{
                                                    fontWeight: 700,
                                                    color: getScoreColor(file.score),
                                                    fontSize: '14px',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                {file.score.toFixed(1)}
                                            </Link>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: 'var(--color-text-muted)',
                                                display: 'flex'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {files.length > 0 && (
                        <div style={{
                            marginTop: '24px',
                            paddingTop: '20px',
                            borderTop: '1px solid var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Uploaded:</span>
                                <strong>{files.length} files</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Scored:</span>
                                <strong style={{ color: 'var(--color-success)' }}>{scoredCount} files</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Pending:</span>
                                <strong style={{ color: 'var(--color-warning)' }}>{pendingCount} files</strong>
                            </div>
                            {errorCount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Errors:</span>
                                    <strong style={{ color: 'var(--color-danger)' }}>{errorCount} files</strong>
                                </div>
                            )}

                            <Link to="/" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                                View Dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .upload-zone.drag-over {
          border-color: var(--color-primary) !important;
          background: var(--color-primary-bg) !important;
        }
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
