interface ToolPageLoaderProps {
  title: string
  description?: string
}

export function ToolPageLoader({ title, description = 'Preparing the workspace...' }: ToolPageLoaderProps) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-72 animate-pulse rounded-3xl border border-border bg-muted/25" />
          <div className="h-72 animate-pulse rounded-3xl border border-border bg-muted/25" />
        </div>
      </div>
    </div>
  )
}
