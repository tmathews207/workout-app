import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Lets a planned/in-progress/completed session be reassigned to a different
// calendar date — e.g. a Monday plan actually completed on Tuesday. sessions
// has a unique constraint on session_date, so moving onto a date that
// already has its own session fails; that's surfaced as an error rather
// than merged, since merging two plans isn't something to guess at.
export function MoveSessionDate({
  sessionId,
  currentDate,
  defaultTarget,
  queryKeyPrefixes,
  onMoved,
}: {
  sessionId: string
  currentDate: string
  defaultTarget: string
  queryKeyPrefixes: string[]
  onMoved: (newDate: string) => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState(defaultTarget)

  const mutation = useMutation({
    mutationFn: async (newDate: string) => {
      const { error } = await supabase.from('sessions').update({ session_date: newDate }).eq('id', sessionId)
      if (error) throw error
      return newDate
    },
    onSuccess: (newDate) => {
      for (const prefix of queryKeyPrefixes) {
        queryClient.invalidateQueries({ queryKey: [prefix] })
      }
      setOpen(false)
      onMoved(newDate)
    },
  })

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-4 text-xs text-sky-400 hover:underline">
        Change session date
      </button>
    )
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
      <span className="text-sm text-slate-400">Move this session to</span>
      <input
        type="date"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="rounded-md bg-slate-800 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={() => mutation.mutate(target)}
        disabled={mutation.isPending || target === currentDate}
        className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {mutation.isPending ? 'Moving…' : 'Move'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:underline">
        Cancel
      </button>
      {mutation.isError && (
        <p className="w-full text-xs text-red-400">Could not move — that date may already have a session.</p>
      )}
    </div>
  )
}
