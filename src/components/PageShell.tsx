import type { ReactNode } from 'react'

export function PageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}
