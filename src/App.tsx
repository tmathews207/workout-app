import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import SleepSubjective from './pages/sleep/SleepSubjective'
import SleepObjective from './pages/sleep/SleepObjective'
import WeightLog from './pages/weight/WeightLog'
import ReadinessLog from './pages/readiness/ReadinessLog'
import NutritionLog from './pages/nutrition/NutritionLog'
import PlanSession from './pages/sessions/PlanSession'
import TrackSession from './pages/sessions/TrackSession'
import ActivityLibrary from './pages/library/ActivityLibrary'
import Progress from './pages/progress/Progress'
import ModalityTracker from './pages/modalities/ModalityTracker'
import Admin from './pages/admin/Admin'
import { RequireAuth } from './components/RequireAuth'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
    isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
  }`

function Nav() {
  const { session } = useAuth()
  if (!session) return null

  return (
    <nav className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur">
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
      <NavLink to="/nutrition" className={navLinkClass}>
        Nutrition
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
      <NavLink to="/progress" className={navLinkClass}>
        Progress
      </NavLink>
      <NavLink to="/modalities" className={navLinkClass}>
        Modalities
      </NavLink>
      <NavLink to="/admin" className={navLinkClass}>
        Admin
      </NavLink>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="ml-auto whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
      >
        Sign out
      </button>
    </nav>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/sleep" element={<RequireAuth><SleepSubjective /></RequireAuth>} />
          <Route path="/sleep/objective" element={<RequireAuth><SleepObjective /></RequireAuth>} />
          <Route path="/weight" element={<RequireAuth><WeightLog /></RequireAuth>} />
          <Route path="/readiness" element={<RequireAuth><ReadinessLog /></RequireAuth>} />
          <Route path="/nutrition" element={<RequireAuth><NutritionLog /></RequireAuth>} />
          <Route path="/sessions/plan" element={<RequireAuth><PlanSession /></RequireAuth>} />
          <Route path="/sessions/track" element={<RequireAuth><TrackSession /></RequireAuth>} />
          <Route path="/library" element={<RequireAuth><ActivityLibrary /></RequireAuth>} />
          <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
          <Route path="/modalities" element={<RequireAuth><ModalityTracker /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  )
}
