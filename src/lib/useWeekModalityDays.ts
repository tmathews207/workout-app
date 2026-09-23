import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// A modality counts for a day either because a standard session actually
// performed a set (actual_sets present, not merely planned) linked to it,
// or because an Army PRT session for that day checked it off directly.
// Shared by ModalityTracker and Dashboard so the two never drift apart.
export function useWeekModalityDays(weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['modality_days', weekStart, weekEnd],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from('sessions')
        .select(
          `session_date,
           session_phases(session_activities(activities(activity_modalities(modality_id)), actual_sets(id)))`,
        )
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
      if (error) throw error
      // The untyped client can't know activities/activity_modalities are to-one
      // from this side, so it infers arrays throughout — they're single objects
      // at runtime (a session_activity has exactly one activity).
      const data = rawData as unknown as {
        session_date: string
        session_phases: {
          session_activities: {
            actual_sets: { id: string }[]
            activities: { activity_modalities: { modality_id: string }[] }
          }[]
        }[]
      }[]

      const daysByModality = new Map<string, Set<string>>()
      for (const session of data ?? []) {
        const date = session.session_date
        for (const phase of session.session_phases ?? []) {
          for (const sa of phase.session_activities ?? []) {
            if (!sa.actual_sets || sa.actual_sets.length === 0) continue
            for (const am of sa.activities?.activity_modalities ?? []) {
              const days = daysByModality.get(am.modality_id) ?? new Set<string>()
              days.add(date)
              daysByModality.set(am.modality_id, days)
            }
          }
        }
      }

      const { data: prtSessions, error: prtError } = await supabase
        .from('sessions')
        .select('session_date, prt_modality_ids')
        .eq('session_type', 'army_prt')
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
      if (prtError) throw prtError
      for (const s of prtSessions ?? []) {
        for (const modalityId of s.prt_modality_ids ?? []) {
          const days = daysByModality.get(modalityId) ?? new Set<string>()
          days.add(s.session_date)
          daysByModality.set(modalityId, days)
        }
      }

      return daysByModality
    },
  })
}
