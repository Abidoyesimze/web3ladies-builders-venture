import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  )
}
