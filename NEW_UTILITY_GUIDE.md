# New Utility Guide

## Perfect Tool Pattern: Image Compressor

The Image Compressor demonstrates the ideal pattern for implementing tools:

### 1. Simple Client-Side Processing
```tsx
const compressImage = async () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  
  img.onload = () => {
    // Process image
    canvas.toBlob((blob) => {
      // Handle result
    }, 'image/jpeg', quality / 100)
  }
}
```

### 2. Clear User Interface
- File upload with drag & drop
- Settings panel with intuitive controls
- Progress indication during processing
- Clear results with download option

### 3. Proper Error Handling
```tsx
try {
  // Processing logic
} catch (error) {
  console.error('Processing failed:', error)
  // Show user-friendly error message
}
```

### 4. Semantic Styling
```tsx
<Card className="tool-card">
  <CardHeader>
    <CardTitle className="text-text-primary">Tool Name</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-text-secondary">Description</p>
  </CardContent>
</Card>
```

## Implementation Checklist

### ✅ Required Features
- [ ] File input validation (type, size)
- [ ] Processing feedback (loading states)
- [ ] Error handling with user messages
- [ ] Download functionality for results
- [ ] Responsive design for mobile
- [ ] Semantic CSS classes only

### ✅ User Experience
- [ ] Clear instructions
- [ ] Intuitive controls
- [ ] Immediate feedback
- [ ] Privacy assurance (client-side processing)
- [ ] No registration required

### ✅ Technical Requirements
- [ ] TypeScript types defined
- [ ] No console.log statements
- [ ] No unused imports/variables
- [ ] Semantic color classes only
- [ ] Works in both light/dark mode

## File Structure for New Tool

```
src/app/tools/new-tool/
└── page.tsx                 # Tool page

src/components/tools/NewTool/
├── NewTool.tsx             # Main component
└── index.ts                # Export
```

## Coming Soon Pattern

For incomplete tools, always use the ComingSoon component:

```tsx
import ComingSoon from '@/components/ComingSoon'

export default function NewToolPage() {
  return (
    <ComingSoon 
      toolName="New Tool"
      description="Brief description of what this tool will do"
    />
  )
}
```

## Testing Your Tool

1. **Build Test**: `yarn build` must pass
2. **Dark Mode**: Test in both light and dark themes
3. **Mobile**: Test on mobile devices
4. **Error Cases**: Test with invalid files
5. **Large Files**: Test performance with large inputs

## Common Mistakes to Avoid

❌ **Don't**:
- Use hardcoded colors (`text-gray-500`)
- Add server-side API routes unnecessarily
- Leave console.log statements
- Create complex file structures
- Add premature optimizations

✅ **Do**:
- Use semantic CSS variables
- Process files client-side when possible
- Keep components simple and focused
- Follow the established patterns
- Test thoroughly before deployment