import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import UploadCV from './pages/UploadCV'
import CandidateDetail from './pages/CandidateDetail'
import JobTemplate from './pages/JobTemplate'

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<UploadCV />} />
                <Route path="/candidate/:id" element={<CandidateDetail />} />
                <Route path="/job-template" element={<JobTemplate />} />
                <Route path="/job-template/:id" element={<JobTemplate />} />
            </Routes>
        </Layout>
    )
}

export default App
