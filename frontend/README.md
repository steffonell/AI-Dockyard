# Issue-to-Prompt Frontend

A modern React application for the Issue-to-Prompt Generation Platform.

## 🚀 Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI) v5
- **Routing:** React Router v6
- **State Management:** Zustand
- **HTTP Client:** Axios + React Query
- **Testing:** Playwright (E2E), Jest + React Testing Library (unit)

## 📋 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Configure environment variables in `.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
VITE_SENTRY_DSN=your_sentry_dsn
```

4. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── auth/      # Authentication components
│   ├── common/    # Common/shared components
│   └── layout/    # Layout components
├── pages/         # Route-level page components
├── store/         # Zustand stores
├── services/      # API client & business logic
├── types/         # TypeScript type definitions
├── theme/         # MUI theme configuration
└── utils/         # Helper functions
```

## 🧪 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## 🎨 Features

### Authentication
- JWT-based authentication
- Role-based access control (admin, lead, developer)
- Automatic token refresh
- Protected routes

### Issue Management
- Browse and filter issues
- Issue details and comments
- Integration with Jira (planned)

### Prompt Generation
- Multi-step wizard interface
- Template selection and configuration
- Variable substitution
- Real-time preview
- Copy to clipboard functionality

### Template Management (Admin only)
- CRUD operations for templates
- Markdown editor with live preview
- Template variables management
- Usage analytics

### Dashboard (Admin only)
- Usage statistics
- Performance metrics
- User activity monitoring

## 🔧 Development

### Code Quality

The project uses ESLint and Prettier for code formatting and quality:

```bash
# Check code quality
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check TypeScript types
npm run type-check
```

### Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `dist/` directory

3. Deploy to your preferred hosting service (Vercel, Netlify, etc.)

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3001/api` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | - |

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Follow the component structure guidelines

## 📄 License

This project is private and proprietary. 