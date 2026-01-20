import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Briefcase,
    Users,
    BarChart3,
    Settings,
    Target
} from 'lucide-react'

const mainNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/job-template', icon: Briefcase, label: 'Jobs' },
    { to: '/upload', icon: Users, label: 'Candidates' },
]

const settingsNavItems = [
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
    return (
        <aside className="app-sidebar">
            <div className="logo">
                <div className="logo-icon">
                    <Target size={24} />
                </div>
                <span className="logo-text">TalentShift</span>
            </div>

            <nav className="nav-section">
                <div className="nav-menu">
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            end={item.to === '/'}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            <nav className="nav-section" style={{ marginTop: 'auto' }}>
                <div className="nav-label">Settings</div>
                <div className="nav-menu">
                    {settingsNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </aside>
    )
}
