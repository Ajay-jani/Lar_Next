import { clsx } from 'clsx'

type StatTone = 'default' | 'primary' | 'success' | 'info' | 'warning'

interface ToolStatItem {
  label: string
  value: string
  tone?: StatTone
}

interface ToolStatGridProps {
  items: ToolStatItem[]
  className?: string
}

const valueToneClasses: Record<StatTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
}

export function ToolStatGrid({ items, className }: ToolStatGridProps) {
  return (
    <div className={clsx('mb-6 grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-4', className)}>
      {items.map(item => (
        <div key={item.label} className="rounded-lg bg-muted/30 p-4">
          <div className={clsx('text-xl font-bold sm:text-2xl', valueToneClasses[item.tone ?? 'default'])}>
            {item.value}
          </div>
          <div className="text-sm text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
