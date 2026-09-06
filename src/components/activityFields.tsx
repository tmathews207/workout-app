import { formatMMSS, parseMMSS } from '../lib/format'
import type { ActivityType } from '../types/database'

export type Details = Record<string, string | number | boolean | undefined>

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md bg-slate-800 px-3 py-2" />
    </label>
  )
}

export function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: string
  step?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
      <input
        type="number"
        step={step ?? '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-slate-800 px-3 py-2"
      />
    </label>
  )
}

export function MMSSField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-200">{label} (mm:ss)</span>
      <input
        placeholder="1:30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-slate-800 px-3 py-2"
      />
    </label>
  )
}

export function RadioField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}

// Fields that describe the exercise itself and don't change set-to-set or
// session-to-session — shown on the library entry only.
export function LibraryDetailsFields({
  type,
  details,
  setDetail,
}: {
  type: ActivityType
  details: Details
  setDetail: (k: string, v: string | boolean) => void
}) {
  const str = (k: string) => (details[k] as string) ?? ''

  const laterality = (
    <RadioField
      label="Unilateral / bilateral"
      options={['unilateral', 'bilateral', 'n/a']}
      value={str('laterality')}
      onChange={(v) => setDetail('laterality', v)}
    />
  )
  const rangeOfMotion = <TextField label="Range of motion" value={str('range_of_motion')} onChange={(v) => setDetail('range_of_motion', v)} />
  const accommodatingResistance = (
    <TextField
      label="Accommodating resistance"
      value={str('accommodating_resistance')}
      onChange={(v) => setDetail('accommodating_resistance', v)}
    />
  )
  // Most exercises don't have one (e.g. a rowing machine's resistance level);
  // when checked, a "Machine setting" number field shows up on each set.
  const machineSetting = (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(details.has_machine_setting)}
        onChange={(e) => setDetail('has_machine_setting', e.target.checked)}
      />
      <span className="text-sm text-slate-200">Has a machine setting (e.g. resistance level)</span>
    </label>
  )

  switch (type) {
    case 'stretch':
      return (
        <>
          {laterality}
          {machineSetting}
        </>
      )
    case 'mobility':
      return (
        <>
          {laterality}
          {rangeOfMotion}
          {machineSetting}
        </>
      )
    case 'strength':
    case 'power':
      return (
        <>
          {laterality}
          {rangeOfMotion}
          {accommodatingResistance}
          {machineSetting}
        </>
      )
    case 'anaerobic':
    case 'aerobic':
      return machineSetting
  }
}

// Fields that vary set-to-set and session-to-session — shown when planning
// or tracking a set, not on the library entry. "+ Add set" copies these
// forward from the previous set rather than from the activity's defaults,
// since there's no one "right" target for a library exercise.
export function SetDetailsFields({
  type,
  details,
  setDetail,
  hasMachineSetting,
}: {
  type: ActivityType
  details: Details
  setDetail: (k: string, v: string | boolean) => void
  hasMachineSetting?: boolean
}) {
  const str = (k: string) => (details[k] as string) ?? ''

  const setKind = (
    <RadioField label="Warm-up or work set" options={['warm-up', 'work']} value={str('set_kind')} onChange={(v) => setDetail('set_kind', v)} />
  )
  const restField = <MMSSField label="Rest period" value={str('rest_display')} onChange={(v) => setDetail('rest_display', v)} />
  const machineSettingField = hasMachineSetting ? (
    <NumberField label="Machine setting" value={str('machine_setting')} onChange={(v) => setDetail('machine_setting', v)} />
  ) : null
  const rpeOrRir = (
    <div className="grid grid-cols-2 gap-3">
      <NumberField label="Target RPE" step="0.1" value={str('target_rpe')} onChange={(v) => setDetail('target_rpe', v)} />
      <NumberField label="Target RIR" value={str('target_rir')} onChange={(v) => setDetail('target_rir', v)} />
    </div>
  )
  const weightWithBodyweight = (
    <div className="grid grid-cols-2 gap-3">
      <NumberField label="Target weight (lbs)" step="0.5" value={str('target_weight_lbs')} onChange={(v) => setDetail('target_weight_lbs', v)} />
      <label className="flex items-center gap-2 self-end pb-2">
        <input
          type="checkbox"
          checked={Boolean(details.is_bodyweight_default)}
          onChange={(e) => setDetail('is_bodyweight_default', e.target.checked)}
        />
        <span className="text-sm text-slate-200">Bodyweight by default</span>
      </label>
    </div>
  )

  switch (type) {
    case 'stretch':
    case 'mobility':
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MMSSField label="Duration" value={str('duration_display')} onChange={(v) => setDetail('duration_display', v)} />
            {restField}
          </div>
          <NumberField label="Repeat count" value={str('repeat_count')} onChange={(v) => setDetail('repeat_count', v)} />
          {machineSettingField}
        </>
      )
    case 'strength':
      return (
        <>
          {setKind}
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Target bar speed (m/s)"
              step="0.1"
              value={str('target_bar_speed_mps')}
              onChange={(v) => setDetail('target_bar_speed_mps', v)}
            />
            <TextField label="Tempo (#-#-#-#)" value={str('tempo')} onChange={(v) => setDetail('tempo', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Target reps (min)" value={str('target_reps_min')} onChange={(v) => setDetail('target_reps_min', v)} />
            <NumberField label="Target reps (max)" value={str('target_reps_max')} onChange={(v) => setDetail('target_reps_max', v)} />
          </div>
          {weightWithBodyweight}
          {rpeOrRir}
          {restField}
          {machineSettingField}
        </>
      )
    case 'power':
      return (
        <>
          {setKind}
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Target height (in)" value={str('target_height_in')} onChange={(v) => setDetail('target_height_in', v)} />
            <NumberField label="Target speed (m/s)" step="0.1" value={str('target_speed_mps')} onChange={(v) => setDetail('target_speed_mps', v)} />
            <NumberField label="Target distance (m)" value={str('target_distance_m')} onChange={(v) => setDetail('target_distance_m', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Target reps (min)" value={str('target_reps_min')} onChange={(v) => setDetail('target_reps_min', v)} />
            <NumberField label="Target reps (max)" value={str('target_reps_max')} onChange={(v) => setDetail('target_reps_max', v)} />
          </div>
          {weightWithBodyweight}
          {rpeOrRir}
          {restField}
          {machineSettingField}
        </>
      )
    case 'anaerobic':
      return (
        <>
          {setKind}
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Target reps (min)" value={str('target_reps_min')} onChange={(v) => setDetail('target_reps_min', v)} />
            <NumberField label="Target reps (max)" value={str('target_reps_max')} onChange={(v) => setDetail('target_reps_max', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Target distance (m)" value={str('target_distance_m')} onChange={(v) => setDetail('target_distance_m', v)} />
            <MMSSField
              label="Target duration"
              value={str('target_duration_display')}
              onChange={(v) => setDetail('target_duration_display', v)}
            />
          </div>
          <NumberField label="Target weight (lbs)" step="0.5" value={str('target_weight_lbs')} onChange={(v) => setDetail('target_weight_lbs', v)} />
          {rpeOrRir}
          <div className="grid grid-cols-2 gap-3">
            <MMSSField label="Target pace" value={str('target_pace_display')} onChange={(v) => setDetail('target_pace_display', v)} />
            {restField}
          </div>
          {machineSettingField}
        </>
      )
    case 'aerobic':
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Distance" step="0.01" value={str('distance_value')} onChange={(v) => setDetail('distance_value', v)} />
            <RadioField
              label="Unit"
              options={['miles', 'meters']}
              value={str('distance_unit') || 'miles'}
              onChange={(v) => setDetail('distance_unit', v)}
            />
          </div>
          <MMSSField label="Target pace" value={str('target_pace_display')} onChange={(v) => setDetail('target_pace_display', v)} />
          <NumberField label="Weight (lbs)" step="0.5" value={str('weight_lbs')} onChange={(v) => setDetail('weight_lbs', v)} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Target heart rate" value={str('target_heart_rate')} onChange={(v) => setDetail('target_heart_rate', v)} />
            <NumberField label="Target cadence" value={str('target_cadence')} onChange={(v) => setDetail('target_cadence', v)} />
          </div>
          {restField}
          {machineSettingField}
        </>
      )
  }
}

// Converts the *_display mm:ss text fields into seconds, and numeric-looking
// strings into numbers, before saving to jsonb.
export function detailsToPayload(details: Details): Details {
  const payload: Details = { ...details }
  for (const [displayKey, targetKey] of [
    ['duration_display', 'duration_sec'],
    ['rest_display', 'rest_sec'],
    ['target_duration_display', 'target_duration_sec'],
    ['target_pace_display', 'target_pace_sec'],
  ]) {
    if (displayKey in payload) {
      const seconds = parseMMSS(String(payload[displayKey] ?? ''))
      delete payload[displayKey]
      if (seconds !== undefined) payload[targetKey] = seconds
    }
  }
  const nonNumericKeys = ['tempo', 'range_of_motion', 'accommodating_resistance', 'laterality', 'set_kind', 'distance_unit']
  for (const key of Object.keys(payload)) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim() === '') delete payload[key]
    else if (typeof v === 'string' && !Number.isNaN(Number(v)) && !nonNumericKeys.includes(key)) {
      payload[key] = Number(v)
    }
  }
  return payload
}

export function payloadToDisplay(details: Record<string, unknown>): Details {
  const display: Details = { ...(details as Details) }
  if ('duration_sec' in details) display.duration_display = formatMMSS(details.duration_sec as number)
  if ('rest_sec' in details) display.rest_display = formatMMSS(details.rest_sec as number)
  if ('target_duration_sec' in details) display.target_duration_display = formatMMSS(details.target_duration_sec as number)
  if ('target_pace_sec' in details) display.target_pace_display = formatMMSS(details.target_pace_sec as number)
  return display
}
