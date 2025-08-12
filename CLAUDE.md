# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - Run TypeScript type checking

### Database Management
- `npm run migrate-vocab` - Import vocabulary data (server must be running)
- `npm run migrate-vocab:dry-run` - Preview vocabulary import
- `npm run migrate-vocab:overwrite` - Import with overwrite existing data

### Utilities
- `npm run clean` - Clean build artifacts
- `npm run analyze` - Analyze bundle size

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS 4 (custom components, no Radix/Shadcn)
- **Database**: SQLite with custom ORM layer
- **AI Integration**: OpenAI GPT-5-nano for explanations
- **State Management**: React Context + hooks with localStorage persistence

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                # Custom Tailwind components
│   │   ├── button.tsx, card.tsx, input.tsx  # Basic UI primitives
│   │   ├── history.tsx    # Progress visualization with styled divs
│   │   ├── shortcuts.tsx  # Keyboard shortcut buttons with underlined letters
│   │   ├── phraseInput.tsx # Language input fields with practice icons
│   │   ├── practiceIcon.tsx # Shows remaining attempts for practice words
│   │   └── practiceCompleteIcon.tsx # Green checkmark when practice word cleared
│   └── *.tsx              # Feature components (QuizInterface, etc.)
├── contexts/              # React Context providers
├── lib/
│   ├── database/          # SQLite database layer
│   └── database-api-client.ts  # API client for database operations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── pages/api/            # Next.js API routes
```

### Key Components

#### Database System (`src/lib/database/`)
- **SQLite Schema**: phrases, categories, similarity tables (see `docs/database-schema.md`)
- **Connection Management**: Singleton pattern with connection pooling
- **Operations**: CRUD operations with proper error handling and transactions
- **API Layer**: `database-api-client.ts` provides high-level methods

#### State Management (`src/contexts/`)
- **LearningContext**: Main quiz state, practice tracking, XP system
- **AuthContext**: Authentication token management
- **ThemeContext**: Dark theme support

#### Core Learning Logic
- **Practice System**: Adaptive algorithm increases practice chance based on mistakes
- **XP Calculation**: Time-based scoring (1-10 XP based on response speed)
- **Answer Validation**: Fuzzy matching with phrase similarity scoring
- **Multi-language Support**: Portuguese ↔ English, German ↔ English courses
- **Practice Word Completion**: Words require 3 correct answers to be removed from practice list
- **Visual Feedback**: Green checkmark appears when practice words are cleared

### Important Patterns

#### Custom Hooks Pattern
Business logic is separated into reusable hooks:
- `useDailyStats` - Local storage based daily progress tracking with histogram data
- `useLocalStorage` - Typed localStorage with error handling

#### Database-First Architecture  
All vocabulary data flows through SQLite:
1. Import scripts populate database from external sources
2. API routes query database for random/practice words
3. Frontend uses database-api-client for all operations
4. No external API dependencies during quiz operation

#### Authentication Flow
- Uses preshared key authentication via URL hash (`#auth_KEY`)
- Token stored in localStorage and passed to API routes
- Required for AI explanation features
- **Conditional UI**: Authenticated users see "Explain" instead of "Show" button
- **Enhanced Features**: Authenticated users get detailed AI explanations with context

## Development Guidelines

### Code Style
- No comments unless explicitly requested
- Follow existing TypeScript strict mode patterns
- Use functional components with hooks
- Prefer composition over inheritance
- Always run `npm run lint` before considering any task done

### Database Work
- Always use transactions for multi-statement operations
- Handle SQLite errors with `formatSqlError` utility
- Check foreign key constraints are maintained
- Use parameterized queries to prevent SQL injection

### Component Development
- Build with custom Tailwind components under `src/components/ui/`
- Avoid external UI libraries (Radix/Shadcn removed)
- Use TypeScript interfaces for all props
- Implement proper error boundaries
- **Absolute Positioning**: Use for overlays that shouldn't affect layout (practiceIcon, practiceCompleteIcon)
- **Conditional Rendering**: Based on authentication state and quiz result states
- **Request Cancellation**: Use AbortController for async operations that can be interrupted

### API Development
- Validate requests with Zod schemas
- Return consistent error responses
- Use database connection singleton
- Implement proper caching headers

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=sk-proj-...          # For AI explanations
PRESHARED_KEY=your-secure-key       # Authentication
```

Database is automatically created at `cache/vocabulary.db` on first run.

## Testing Strategy

No formal test framework is configured. Testing approach:
- Manual testing through the quiz interface
- Database integrity checks via API endpoints
- TypeScript compilation serves as static analysis
- ESLint for code quality

## Common Workflows

### Adding New Features
1. Define TypeScript interfaces in `src/types/`
2. Add database schema changes in `src/lib/database/config.ts`
3. Implement API routes in `src/pages/api/`
4. Create React components with Context integration
5. Run `npm run type-check` and `npm run lint`

### Database Schema Changes
1. Update `src/lib/database/config.ts` 
2. Add migration logic in `src/lib/database/operations.ts`
3. Update `docs/database-schema.md`
4. Test with `npm run migrate-vocab:dry-run`

### Debugging Issues
- Check browser console for client-side errors
- Review Next.js server logs for API issues  
- Query SQLite directly at `cache/vocabulary.db`
- Use `/api/vocabulary/stats` for database health checks

## UI Patterns & Keyboard Shortcuts

### Keyboard Shortcuts System
- **Shortcut Letters**: Underlined within button text (e.g., `<u>N</u>ext`, `<u>S</u>how`) 
- **Key Mappings**: N (Next), S (Show - non-auth only), P (Speak), E (Explain - auth only)
- **Conditional Shortcuts**: Show/Explain buttons change based on authentication state
- **Browser Compatibility**: Preserves Ctrl+key combinations for browser functions

### Visual Feedback Systems
- **Progress Histogram**: Styled div bars instead of Unicode box characters for better rendering
- **Practice Icons**: Left-aligned icon showing remaining attempts for practice words  
- **Completion Icons**: Right-aligned green checkmark when practice words are cleared
- **Timing-Based**: Visual feedback appears/disappears based on quiz result states

### Interaction States
- **Quiz Results**: `incorrect`, `correct`, `revealed`, `explaining`, `explained`
- **State Transitions**: Proper cleanup when advancing to next word or canceling operations
- **Request Handling**: AbortController pattern for canceling API requests during state changes

### Component Communication Patterns
- **Context-Driven**: All quiz state managed through LearningContext
- **Event Handling**: Keyboard shortcuts handled at top level, passed down via context
- **Conditional Logic**: UI elements render based on authentication, word state, and quiz progress
