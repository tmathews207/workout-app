import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import SleepSubjective from './pages/sleep/SleepSubjective'
import SleepObjective from './pages/sleep/SleepObjective'
import WeightLog from './pages/weight/WeightLog'
import ReadinessLog from './pages/readiness/ReadinessLog'
import PlanSession from './pages/sessions/PlanSession'
import TrackSession from './pages/sessions/TrackSession'
import ActivityLibrary from './pages/library/ActivityLibrary'
import Admin from './pages/admin/Admin'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
    isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
  }`

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur">
        <NavLink to="/" end className={navLinkClass}>
          Today
        </NavLink>
        <NavLink to="/sleep" className={navLinkClass}>
          Sleep
        </NavLink>
        <NavLink to="/weight" className={navLinkClass}>
          Weight
        </NavLink>
        <NavLink to="/readiness" className={navLinkClass}>
          Readiness
        </NavLink>
        <NavLink to="/sessions/plan" className={navLinkClass}>
          Plan
        </NavLink>
        <NavLink to="/sessions/track" className={navLinkClass}>
          Track
        </NavLink>
        <NavLink to="/library" className={navLinkClass}>
          Library
        </NavLink>
        <NavLink to="/admin" className={navLinkClass}>
          Admin
        </NavLink>
      </nav>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sleep" element={<SleepSubjective />} />
          <Route path="/sleep/objective" element={<SleepObjective />} />
          <Route path="/weight" element={<WeightLog />} />
          <Route path="/readiness" element={<ReadinessLog />} />
          <Route path="/sessions/plan" element={<PlanSession />} />
          <Route path="/sessions/track" element={<TrackSession />} />
          <Route path="/library" element={<ActivityLibrary />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}
