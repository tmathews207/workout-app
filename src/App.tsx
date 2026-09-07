import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
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
import SleepTrends from './pages/sleep/SleepTrends'
import WeightTrends from './pages/weight/WeightTrends'
import NutritionTrends from './pages/nutrition/NutritionTrends'
import ReadinessTrends from './pages/readiness/ReadinessTrends'
import Progress from './pages/progress/Progress'
import ModalityTracker from './pages/modalities/ModalityTracker'
import Dashboard from './pages/dashboard/Dashboard'
import Admin from './pages/admin/Admin'
import { RequireAuth } from './components/RequireAuth'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
    isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
  }`

const TRACKING_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sleep/trends', label: 'Sleep Trends' },
  { to: '/weight/trends', label: 'Weight Trends' },
  { to: '/nutrition/trends', label: 'Nutrition Trends' },
  { to: '/readiness/trends', label: 'Readiness Trends' },
  { to: '/progress', label: 'Progress' },
  { to: '/modalities', label: 'Modalities' },
]

function TrackingMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const isActive = TRACKING_LINKS.some((l) => location.pathname === l.to)

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen((o) => !o)
  }

  // The button lives inside the horizontally-scrolling nav, which (per CSS
  // rules) clips vertical overflow too once overflow-x is set — so the
  // dropdown panel is rendered via a portal, positioned in fixed/viewport
  // coordinates, and closed on outside click / scroll / resize instead of
  // relying on normal DOM containment.
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
          isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Tracking ▾
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[10rem] rounded-md border border-slate-800 bg-slate-900 py-1 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {TRACKING_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive: linkActive }) =>
                  `block whitespace-nowrap px-3 py-1.5 text-sm ${
                    linkActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

function Nav() {
  const { session } = useAuth()
  if (!session) return null

  return (
    <nav
      className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
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
      <TrackingMenu />
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

      <main className="flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
          <Route path="/sleep/trends" element={<RequireAuth><SleepTrends /></RequireAuth>} />
          <Route path="/weight/trends" element={<RequireAuth><WeightTrends /></RequireAuth>} />
          <Route path="/nutrition/trends" element={<RequireAuth><NutritionTrends /></RequireAuth>} />
          <Route path="/readiness/trends" element={<RequireAuth><ReadinessTrends /></RequireAuth>} />
          <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
          <Route path="/modalities" element={<RequireAuth><ModalityTracker /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  )
}
