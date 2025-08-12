# Learn European Portuguese

A modern, interactive web application for learning European Portuguese vocabulary. Built with Next.js 15, React 19, TypeScript, and SQLite, this app provides an engaging learning experience with features like XP tracking, daily statistics, speech synthesis, and AI-powered explanations.

## ✨ Features

### 🎯 Core Learning
- **Interactive Quiz System**: Practice vocabulary with bidirectional translation (Portuguese ↔ English)
- **Database-Powered**: SQLite database with phrase relationships and similarity scoring
- **XP System**: Earn experience points based on response speed (1-10 XP per correct answer)
- **Smart Practice Algorithm**: Words you struggle with are added to a practice list for reinforcement
- **Speech Synthesis**: Hear Portuguese words pronounced with European Portuguese accent
- **Server-Side Validation**: Answer checking with phrase similarity matching

### 📊 Analytics & Progress
- **Database Statistics**: Real-time statistics from the vocabulary database
- **Daily Statistics**: Track your daily learning progress
- **Visual Progress Chart**: 14-day histogram showing your consistency
- **Achievement System**: Monitor improvement with XP tracking
- **Phrase Relationships**: Learn synonyms and alternative translations

### 🤖 AI-Powered Explanations
- **Detailed Phrase Analysis**: Get comprehensive explanations powered by OpenAI GPT-5-nano
- **Contextual Understanding**: Includes synonyms and alternative translations from the database
- **European Portuguese Focus**: Specifically tailored for European Portuguese learners
- **Rich Context**: Includes examples, grammar, pronunciation (IPA), etymology, and cultural context
- **Long-Term Caching**: Explanations are cached server-side for 90 days to improve performance

### 🚀 Performance & Database
- **SQLite Database**: Fast, reliable local database with phrase relationships
- **Secured Import API**: Protected vocabulary import with authentication
- **Phrase Similarity Scoring**: Intelligent phrase relationship mapping
- **Server-Side Processing**: Answer validation and explanation generation
- **Automatic Cache Management**: Smart caching for explanations and API responses

### 🎨 User Experience
- **Dark Theme**: Easy on the eyes with a modern dark interface
- **Keyboard Shortcuts**: Navigate efficiently with keyboard controls
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **JSON-Style Interface**: Unique developer-friendly aesthetic
- **Error Boundaries**: Graceful error handling prevents crashes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- OpenAI API key (for explanation features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pt
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   PRESHARED_KEY=your_secure_preshared_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### 🗄️ Database Setup

The application uses SQLite for vocabulary management. To populate the database:

1. **Set the import authentication key**
   ```bash
   # Add to your .env.local file
   # Note: PRESHARED_KEY is used for both app auth and import operations
   PRESHARED_KEY=your_secure_import_key_here
   ```

2. **Run the migration script**
   ```bash
   # Dry run to see what will be imported
   node scripts/migrate-vocabulary.js --dry-run
   
   # Import vocabulary data (server must be running)
   node scripts/migrate-vocabulary.js
   
   # Or overwrite existing data
   node scripts/migrate-vocabulary.js --overwrite
   ```

   **Note**: The Next.js development server must be running (`npm run dev`) before running the migration script.

3. **Verify the import**
   
   Check the database statistics at: [http://localhost:3000/api/vocabulary/stats](http://localhost:3000/api/vocabulary/stats)

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Authentication Setup

To use the AI explanation features:

1. Set your `PRESHARED_KEY` in the environment variables
2. Access the app with the authentication key in the URL:
   ```
   http://localhost:3000/#auth_YOUR_PRESHARED_KEY
   ```
3. The key will be automatically saved and the URL cleaned up

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router
- **UI Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom design system (no Radix/Shadcn)
- **State Management**: React hooks with custom state management
- **API**: Next.js API routes
- **AI Integration**: OpenAI GPT-5-nano with structured output
- **Data Validation**: Zod for runtime type checking
- **Code Quality**: ESLint + TypeScript for type safety
- **Testing**: Jest with React Testing Library for comprehensive unit testing

### Key Design Patterns

#### 🪝 Custom Hooks
- **Separation of Concerns**: Business logic is separated from UI components
- **Reusability**: Common patterns are abstracted into reusable hooks
- **Type Safety**: Full TypeScript support with proper typing

#### 🎯 Component Architecture
- **Single Responsibility**: Each component has a clear, focused purpose
- **Composition**: Complex UI is built from simple, composable components
- **Props Interface**: Consistent prop interfaces with TypeScript validation

### UI Components
- **Custom + Tailwind**: All UI elements are built with Tailwind and small custom components under `src/components/ui`.
- **No Radix/Shadcn**: Radix UI and shadcn/ui have been removed to reduce bundle size and complexity.
- **Examples**:
  - `Button`, `Card`, `Input` are minimal Tailwind components.
  - Notifications use `sonner` via a lightweight wrapper.

### Dependency Cleanup
- Removed: `@shadcn/ui`, `@radix-ui/*`, `class-variance-authority`, `cmdk`, and unused icon packs.
- Replaced Radix Select with a native `<select>` styled with Tailwind in `src/app/add/page.tsx`.

#### 📦 State Management
- **Local Storage Integration**: Automatic persistence with error handling
- **Optimistic Updates**: UI updates immediately with background persistence
- **Error Recovery**: Graceful handling of storage and parsing errors

## 🎮 Usage Guide

### Basic Controls
- **Type to Answer**: Simply start typing in the active input field
- **Keyboard Shortcuts**:
  - `N` - Next word
  - `S` - Show answer
  - `Space` - Speak current word
  - `E` - Explain word (requires authentication)

### Learning Flow
1. **Start Learning**: A Portuguese word is shown, you translate to English (or vice versa)
2. **Input Answer**: Type your translation in the active input field
3. **Instant Feedback**: Correct answers are highlighted immediately
4. **XP Rewards**: Faster responses earn more XP (1-10 points)
5. **Progress Tracking**: Incorrect answers add words to your practice list
6. **Explanations**: Click "Explain" for detailed AI-powered analysis

### Practice System
- Words you struggle with are automatically added to a practice list
- Practice words have a higher chance of appearing in future sessions
- After 3 correct answers, words are removed from the practice list
- The practice probability increases as your practice list grows

## 🔧 Configuration

### Environment Variables
```bash
# Required: OpenAI API key for explanations
OPENAI_API_KEY=sk-proj-...

# Required: Authentication key for API access
PRESHARED_KEY=your-secure-random-key

# Optional: Override Next.js configuration
NODE_ENV=development
```

### Customization Options

#### Learning Parameters
Modify constants in `src/types/index.ts`:
```typescript
export const CONFIG = {
  MIN_XP: 1,                    // Minimum XP per correct answer
  MAX_XP: 10,                   // Maximum XP per correct answer
  FAST_RESPONSE_TIME: 2000,     // Fast response threshold (ms)
  SLOW_RESPONSE_TIME: 30000,    // Slow response threshold (ms)
  CORRECT_DELAY: 500,           // Delay after correct answer (ms)
  REVEAL_DELAY: 2000,           // Delay after showing answer (ms)
  MAX_CORRECT_COUNT: 3,         // Attempts needed to master a word
  // ... more configuration options
} as const;
```

#### UI Theming
The application uses a custom Tailwind configuration with a dark theme. Modify `src/app/globals.css` to customize colors and styling.

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment

The application includes server-side caching for both vocabulary data (30 days) and AI explanations (90 days). For production deployments, you should mount the cache directory as a volume to persist cache across container restarts.

#### Basic Docker Deployment
```bash
# Build the Docker image
docker build -t pt-learn .

# Run the container with cache volume mounting
docker run -d \
  --name pt-learn \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/cache:/app/cache \
  --restart unless-stopped \
  pt-learn
```

#### Docker Compose Deployment
Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  pt-learn:
    image: ghcr.io/mtib/pt:latest
    # Or build from source:
    # build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PRESHARED_KEY=${PRESHARED_KEY}
    volumes:
      - ./cache:/app/cache
      - ./logs:/app/logs  # Optional: for application logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Then run:
```bash
docker-compose up -d
```

#### Using GitHub Container Registry
```bash
# Run with persistent cache
docker run -d \
  --name pt-learn \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your-key \
  -e PRESHARED_KEY=your-auth-key \
  -v /host/path/to/cache:/app/cache \
  --restart unless-stopped \
  ghcr.io/mtib/pt:latest
```

#### Cache Directory Structure
When properly mounted, your cache directory will contain:
```
cache/
├── vocabulary.json          # Cached vocabulary data (30-day TTL)
└── explanations/           # AI explanation cache (90-day TTL)
    ├── [hash1].json
    ├── [hash2].json
    └── ...
```

#### Production Considerations
- **Cache Persistence**: Always mount `/app/cache` as a volume in production
- **Cache Size**: The explanation cache can grow over time. Monitor disk usage
- **Backup**: Consider backing up the cache directory for faster cold starts
- **Permissions**: Ensure the cache directory is writable by the container user

### Vercel Deployment
The application is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in the Vercel dashboard
3. Deploy with zero configuration

## 🧪 Development

### Code Quality
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Enforces consistent code style and catches common errors
- **Error Boundaries**: Prevents crashes with graceful error handling
- **Comprehensive Error Handling**: Network errors, API failures, and edge cases are handled

### Testing Strategy

#### Unit Testing with Jest
```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage reports
npm run test:coverage
```

The application uses Jest with React Testing Library for comprehensive testing:
- **Test Coverage**: Utility functions, text normalization, XP calculations
- **Advanced Text Processing**: Tests for 16+ different apostrophe and quote types
- **CI Integration**: Automated testing in GitHub Actions pipeline
- **Coverage Reports**: Integrated with Codecov for coverage tracking

#### Additional Quality Assurance
- Input validation with Zod schemas
- API error handling with custom error types
- Client-side error boundaries
- Graceful fallbacks for missing data

### Performance Optimizations
- **Code Splitting**: Automatic code splitting with Next.js
- **Caching**: Smart caching for API responses and explanations
- **Optimistic Updates**: Immediate UI feedback with background persistence
- **Request Deduplication**: Prevents duplicate API calls
- **Bundle Optimization**: Optimized production builds

## 📚 API Reference

### `/api/vocabulary`
Serves filtered and cached Portuguese vocabulary data.

#### Request
```bash
GET /api/vocabulary
```

#### Response
```typescript
{
  "words": [
    {
      "rank": 1,
      "targetWord": "casa",
      "englishWord": "house"
    },
    // ... more words
  ]
}
```

#### Features
- **Server-side filtering**: Removes identical Portuguese-English pairs
- **30-day cache**: Reduces external API calls
- **Automatic validation**: Ensures data quality
- **CDN optimization**: Proper cache headers for edge caching

### `/api/explain`
Generates detailed explanations for Portuguese words.

#### Request
```typescript
POST /api/explain
Content-Type: application/json
Authorization: Bearer <your-auth-key>

{
  "word": "casa",
  "englishReference": "house"
}
```

#### Response
```typescript
{
  "word": "casa",
  "englishReference": "house",
  "example": "A minha casa é muito bonita. (My house is very beautiful.)",
  "explanation": "This is a fundamental word in Portuguese...",
  "definition": "A building for human habitation...",
  "grammar": "Feminine noun (a casa, as casas)...",
  "facts": "The word 'casa' comes from Latin 'casa'...",
  "pronunciationIPA": "/ˈka.zɐ/",
  "pronunciationEnglish": "KAH-za"
}
```

#### Error Responses
- `400` - Bad Request (missing or invalid parameters)
- `403` - Forbidden (invalid or missing authentication)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript best practices** and maintain type safety
3. **Add documentation** for new features or API changes
4. **Test your changes** thoroughly before submitting
5. **Follow the existing code style** and conventions

### Development Setup
1. Clone your fork and install dependencies
2. Create a `.env.local` file with required environment variables
3. Run `npm run dev` to start the development server
4. Make your changes and test thoroughly
5. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Vocabulary Data**: [Thousand Most Common Words](https://github.com/SMenigat/thousand-most-common-words) by SMenigat
- **AI Technology**: Powered by OpenAI's GPT-5-nano model
- **UI Components**: Built with Tailwind CSS and custom components
- **Icons & Fonts**: Geist Sans and Geist Mono fonts by Vercel

## 🐛 Troubleshooting

### Common Issues

#### "Failed to load vocabulary"
- Check your internet connection
- Ensure the external vocabulary API is accessible
- Try refreshing the page

#### "Authentication failed"
- Verify your `PRESHARED_KEY` environment variable
- Make sure you've added the auth key to the URL: `#auth_YOUR_KEY`
- Check that the key matches between client and server

#### "OpenAI API errors"
- Verify your `OPENAI_API_KEY` is valid and has sufficient quota
- Check OpenAI service status
- Review API usage limits

#### Local storage issues
- Clear your browser's local storage for the site
- Disable browser extensions that might interfere
- Try using an incognito/private browsing window

### Getting Help
- Check the console for detailed error messages
- Review the application logs for server-side issues
- Open an issue on GitHub with detailed reproduction steps

---

**Happy Learning! 🇵🇹** Enjoy your Portuguese learning journey with this modern, feature-rich application!
