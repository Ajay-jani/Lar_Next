import { clsx } from 'clsx'
import { Sparkles, UploadCloud } from 'lucide-react'

interface AnimatedUploadProgressCardProps {
  progress: number
  fileName: string
  title: string
  status: string
  caption?: string
  className?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function AnimatedUploadProgressCard({
  progress,
  fileName,
  title,
  status,
  caption = 'Preparing your file with a little extra sparkle.',
  className,
}: AnimatedUploadProgressCardProps) {
  const safeProgress = clamp(Math.round(progress), 0, 100)
  const progressDegrees = `${(safeProgress / 100) * 360}deg`

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[30px] border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-info/10 p-5 shadow-[0_20px_60px_-32px_rgba(99,102,241,0.55)] sm:p-6',
        className
      )}
    >
      <div className="upload-float-slow pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
      <div className="upload-float-fast pointer-events-none absolute -right-12 bottom-4 h-32 w-32 rounded-full bg-info/20 blur-3xl" />
      <div className="upload-sheen pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto sm:mx-0">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full p-[10px] shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${progressDegrees}, hsl(var(--primary) / 0.12) ${progressDegrees})`,
            }}
          >
            <div className="absolute inset-3 rounded-full border border-white/50 bg-background/90 shadow-inner" />
            <div className="relative text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-foreground">{safeProgress}%</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Live Upload Flow
            </div>
            <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h3>
            <p className="break-words text-sm font-medium text-foreground/90">{fileName}</p>
            <p className="text-sm text-muted-foreground">{caption}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{status}</span>
              <span className="font-semibold text-primary">{safeProgress}%</span>
            </div>

            <div className="overflow-hidden rounded-full border border-white/60 bg-white/60 p-1 shadow-inner">
              <div
                className="upload-progress-stripes relative h-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-info transition-all duration-300"
                style={{ width: `${Math.max(safeProgress, 8)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
