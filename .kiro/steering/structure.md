# Project Structure

## Next.js Standard Structure

```
/
├── .kiro/                 # Kiro configuration and steering
├── public/                # Static assets (images, icons, etc.)
├── src/                   # Source code (recommended)
│   ├── app/              # App Router (Next.js 13+)
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── [routes]/     # Dynamic routes
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Base UI components
│   │   └── features/    # Feature-specific components
│   ├── lib/             # Utility functions and configurations
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   └── styles/          # Additional stylesheets
├── package.json         # Dependencies and scripts
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── .eslintrc.json       # ESLint configuration
```

## Naming Conventions
- **Files**: kebab-case for pages, PascalCase for components
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Pages**: lowercase with hyphens (e.g., `user-profile/page.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)

## Component Organization
- Keep components small and focused
- Use barrel exports in component directories
- Separate business logic from presentation
- Co-locate related files (component + styles + tests)

## Import Order
1. React and Next.js imports
2. Third-party libraries
3. Internal utilities and hooks
4. Components (UI first, then feature components)
5. Types and interfaces
6. Relative imports