# Directory Structure

## Clean, Simplified Structure

```
/
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── globals.css   # Global styles with semantic CSS variables
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Homepage
│   │   └── tools/        # Tool pages
│   │       ├── page.tsx  # Tools listing
│   │       ├── image-compressor/  # Working tool
│   │       └── [other-tools]/     # Coming soon pages
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components (Button, Card, Input)
│   │   ├── layout/      # Layout components (ThemeToggle)
│   │   ├── tools/       # Tool-specific components
│   │   └── ComingSoon.tsx  # Reusable coming soon component
│   ├── lib/             # Utilities and providers
│   │   └── providers/   # React providers (ThemeProvider)
│   └── types/           # TypeScript type definitions
├── package.json         # Dependencies (Yarn only)
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind with semantic color mapping
├── tsconfig.json        # TypeScript configuration
└── .eslintrc.json       # ESLint configuration
```

## Key Principles

- **One obvious place for everything**
- **No deep nesting or over-abstraction**
- **Semantic naming over technical naming**
- **Coming soon pages instead of 404s**

## Removed Complexity

- ❌ Testing infrastructure (premature)
- ❌ CI/CD pipelines (premature)
- ❌ Complex API routes (unnecessary)
- ❌ Multiple package managers (npm removed)
- ❌ Excessive documentation (consolidated)