import { clsx } from 'clsx'

type IntroTone = 'primary' | 'success' | 'warning' | 'neutral'

interface ToolIntroFeature {
  label: string
  tone?: IntroTone
}

interface ToolPageIntroProps {
  title: string
  description: string
  features?: ToolIntroFeature[]
  className?: string
}

const toneClasses: Record<IntroTone, string> = {
  primary: 'border-primary/20 bg-primary/5 text-primary',
  success: 'border-success/20 bg-success/5 text-success',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  neutral: 'border-border/60 bg-muted/35 text-muted-foreground',
}

export function ToolPageIntro({ title, description, features = [], className }: ToolPageIntroProps) {
  return (
    <div className={clsx('mb-8 text-center', className)}>
      <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      <p className="mx-auto max-w-3xl text-base text-muted-foreground sm:text-lg">{description}</p>

      {features.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs sm:gap-4 sm:text-sm">
          {features.map(feature => (
            <div
              key={feature.label}
              className={clsx(
                'flex items-center gap-2 rounded-full border px-3 py-1.5',
                toneClasses[feature.tone ?? 'neutral']
              )}
            >
              <div className="h-2 w-2 rounded-full bg-current" />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
