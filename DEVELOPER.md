# Developer Guide - Portuguese Learning App v2.0

## 🎯 Quick Start for Developers

This guide helps developers understand the refactored codebase and get up to speed quickly.

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── globals.css         # Global styles with Tailwind theme
│   ├── layout.tsx          # Root layout with metadata
│   └── page.tsx            # Main application page (refactored)
├── components/             # Reusable UI components
│   ├── ErrorBoundary.tsx   # React error boundary
│   ├── ExplanationPanel.tsx # Word explanation display
│   ├── LoadingSpinner.tsx  # Loading states
│   ├── QuizInterface.tsx   # Main quiz UI
│   └── index.ts            # Component exports
├── hooks/                  # Custom React hooks
│   └── index.ts            # State management hooks
├── lib/                    # Core utilities
│   ├── apiClient.ts        # API communication with caching
│   └── utils.ts            # UI utilities and re-exports
├── pages/api/              # API routes
│   ├── explain.ts          # OpenAI explanation endpoint
│   └── health.ts           # Health check endpoint
├── types/                  # TypeScript definitions
│   └── index.ts            # Core types and constants
└── utils/                  # Pure utility functions
    └── vocabulary.ts       # Vocabulary-specific logic
```

## 🏗️ Architecture Principles

### 1. Separation of Concerns
- **UI Components**: Pure presentation components
- **Hooks**: Business logic and state management
- **Utils**: Pure functions without side effects
- **API**: Server-side logic and data fetching

### 2. Type Safety First
- Full TypeScript coverage
- Runtime validation with Zod
- Proper error handling
- No `any` types

### 3. Performance Optimized
- React.memo for expensive components
- Custom hooks prevent unnecessary re-renders
- Efficient caching strategies
- Proper cleanup of resources

## 🪝 Custom Hooks

### `useLocalStorage<T>`
Manages localStorage with automatic JSON serialization and error handling.

```typescript
const [value, setValue] = useLocalStorage('key', defaultValue);
```

### `useDailyStats`
Handles daily learning statistics and progress tracking.

```typescript
const {
  incrementTodayCount,
  getTodayCount,
  getLast14DaysHistogram
} = useDailyStats();
```

### `useVocabularyProgress`
Manages XP and practice word state.

```typescript
const {
  vocabularyXP,
  practiceWords,
  addXP,
  addToPractice,
  incrementCorrectCount
} = useVocabularyProgress();
```

### `useAuth`
Handles authentication state and URL-based auth key extraction.

```typescript
const { authKey, isAuthenticated } = useAuth();
```

### `useSpeechSynthesis`
Provides speech synthesis functionality with language detection.

```typescript
const { speak, speakPortuguese } = useSpeechSynthesis();
```

### `useTimer`
Manages requestAnimationFrame-based timers with proper cleanup.

```typescript
const { timer, startTimer, clearTimer } = useTimer(onComplete);
```

## 🧩 Component Architecture

### Component Hierarchy
```
Home (Error Boundary Wrapper)
└── LearnPortugueseApp (Main Logic)
    ├── QuizInterface (Input/Display)
    ├── ExplanationPanel (AI Explanations)
    └── Error Display (Toast Notifications)
```

### Props Pattern
All components use explicit prop interfaces with TypeScript:

```typescript
interface ComponentProps {
  // Required props first
  data: DataType;
  onAction: () => void;
  
  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  className?: string;
}
```

## 🔄 State Management

### Local State Hierarchy
1. **Component State**: UI-only state (loading, input values)
2. **Hook State**: Business logic state (XP, progress, auth)
3. **Local Storage**: Persistent state (settings, cache)

### State Updates
- Use functional updates for state dependencies
- Batch related state updates
- Handle async state with loading states

```typescript
// Good: Functional update
setCount(prev => prev + 1);

// Good: Batched updates
React.startTransition(() => {
  setState1(value1);
  setState2(value2);
});
```

## 🌐 API Integration

### API Client Pattern
```typescript
// Error handling with custom error types
try {
  const result = await fetchExplanation(word, reference, auth);
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
  } else {
    // Handle unexpected errors
  }
}
```

### Caching Strategy
- **Explanations**: 7-day expiry, 1000 item limit
- **Vocabulary**: Session-based caching
- **User Progress**: Immediate persistence

## 🎨 Styling Guidelines

### Tailwind CSS Conventions
```typescript
// Use utility classes with consistent spacing scale
className="p-4 mb-6 bg-neutral-800 rounded-lg border border-neutral-700"

// Use the cn() utility for conditional classes
className={cn(
  'base-classes',
  isActive && 'active-classes',
  className
)}
```

### Theme Variables
- **Dark Theme**: Primary design system
- **Neutral Colors**: Gray scale from neutral-100 to neutral-900
- **Accent Colors**: Blue for interactive elements

## 🧪 Testing Strategy

### Built-in Validation
- TypeScript compilation catches type errors
- Zod schemas validate runtime data
- Error boundaries catch React errors
- ESLint catches code quality issues

### Manual Testing Checklist
- [ ] XP calculation works correctly
- [ ] Practice words are added/removed properly
- [ ] Speech synthesis works in different browsers
- [ ] API errors are handled gracefully
- [ ] Local storage works with edge cases
- [ ] Keyboard shortcuts function correctly

## 🚀 Performance Optimization

### React Optimizations
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(dependency);
}, [dependency]);

// Memoize callback functions
const handleClick = useCallback(() => {
  doSomething(dependency);
}, [dependency]);

// Memoize components when needed
const MemoizedComponent = React.memo(Component);
```

### Bundle Optimization
- Use dynamic imports for code splitting
- Tree-shake unused utilities
- Optimize images and static assets
- Enable compression in production

## 🔧 Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build for production
npm run build
```

### Docker Development
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Stop container
npm run docker:stop
```

## 🐛 Debugging Tips

### Common Issues

#### 1. Type Errors
```typescript
// Use type assertions carefully
const element = document.querySelector('.selector') as HTMLInputElement;

// Prefer type guards
function isInputElement(el: Element): el is HTMLInputElement {
  return el.tagName === 'INPUT';
}
```

#### 2. State Updates
```typescript
// Always use functional updates with dependencies
const updateState = useCallback((newValue) => {
  setState(prev => ({
    ...prev,
    field: newValue
  }));
}, []);
```

#### 3. API Errors
- Check browser network tab for failed requests
- Verify environment variables are loaded
- Test with curl or Postman independently

### Debug Tools
- React DevTools for component inspection
- Redux DevTools for state management (if added)
- Network tab for API debugging
- Console logging with structured data

## 📦 Adding New Features

### 1. Define Types
```typescript
// src/types/index.ts
export interface NewFeature {
  id: string;
  name: string;
  // ... other properties
}
```

### 2. Create Hook (if needed)
```typescript
// src/hooks/index.ts
export function useNewFeature() {
  // Hook implementation
}
```

### 3. Add Component
```typescript
// src/components/NewFeatureComponent.tsx
interface Props {
  // Define props
}

export const NewFeatureComponent: React.FC<Props> = (props) => {
  // Component implementation
};
```

### 4. Update Main App
```typescript
// src/app/page.tsx
// Import and use new feature
```

### 5. Add Tests/Documentation
- Update this developer guide
- Add JSDoc comments
- Test edge cases

## 🔍 Code Review Checklist

### Before Submitting
- [ ] TypeScript compiles without errors
- [ ] All functions have JSDoc comments
- [ ] Error handling is comprehensive
- [ ] Performance implications considered
- [ ] Accessibility requirements met
- [ ] Mobile responsiveness verified

### Code Quality
- [ ] No console.log statements in production
- [ ] Proper error messages for users
- [ ] Consistent naming conventions
- [ ] DRY principle followed
- [ ] Single responsibility per function/component

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hooks Guide](https://reactjs.org/docs/hooks-intro.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

**Happy Coding! 🚀** This refactored codebase provides a solid foundation for building and maintaining a modern language learning application.
