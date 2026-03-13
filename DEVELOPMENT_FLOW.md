# Development Flow

## Package Manager Rules

✅ **USE YARN ONLY**
```bash
yarn dev          # Start development
yarn build        # Build for production
yarn lint         # Check code quality
yarn type-check   # TypeScript validation
```

❌ **FORBIDDEN**
- `npm install` or any npm commands
- `package-lock.json` files
- Mixed package managers

## Tailwind Safety Rules

### ✅ ALLOWED (Semantic Colors)
```css
text-text-primary     /* Primary text color */
text-text-secondary   /* Secondary text color */
text-text-muted      /* Muted text color */
bg-surface-primary   /* Primary background */
bg-surface-secondary /* Secondary background */
border-border-default /* Default border */
```

### ❌ FORBIDDEN (Direct Colors)
```css
text-gray-500        /* Use text-text-secondary instead */
text-white          /* Use text-text-primary instead */
bg-black            /* Use bg-surface-primary instead */
bg-gray-100         /* Use bg-surface-secondary instead */
```

## Dark Mode Implementation

All dark mode colors are handled via CSS variables in `globals.css`:

```css
:root {
  --text-primary: 222.2 84% 4.9%;    /* Dark text for light mode */
  --surface-primary: 0 0% 100%;       /* White background */
}

.dark {
  --text-primary: 210 40% 98%;        /* Light text for dark mode */
  --surface-primary: 222.2 84% 4.9%;  /* Dark background */
}
```

**Rule**: Never fix dark mode issues in individual components. Always fix in `globals.css`.

## Adding New Tools

1. **Create coming soon page first**:
   ```tsx
   import ComingSoon from '@/components/ComingSoon'
   
   export default function NewToolPage() {
     return (
       <ComingSoon 
         toolName="New Tool"
         description="Tool description here"
       />
     )
   }
   ```

2. **Add to tools listing** in `/tools/page.tsx`

3. **Only build actual functionality when ready**

## Component Guidelines

- Keep components simple and focused
- Use semantic CSS classes from `globals.css`
- No inline styles or hardcoded colors
- Import order: React → Libraries → Internal → Components

## Build Process

```bash
yarn build    # Must pass without errors
yarn dev      # Must start without issues
```

If build fails:
1. Check for unused imports
2. Verify all components exist
3. Ensure no hardcoded colors in components