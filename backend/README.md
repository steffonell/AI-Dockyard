# Issue-to-Prompt Generation Platform (MVP v0.1) - Backend

A backend platform that converts issue tracker items (Jira, Teamwork) into AI-optimized prompts using customizable templates.

## 🚀 Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 5 (TypeScript)
- **Database:** MySQL 8 with Prisma ORM
- **Queue System:** BullMQ (Redis backend)
- **Authentication:** JWT (HS256) + BCrypt
- **Architecture:** Clean Architecture pattern

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MySQL 8 (via Docker)
- Redis (via Docker)

## 🛠️ Development Setup

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

```bash
cp env.example .env
# Edit .env with your specific configuration
```

### 3. Start Development Services

```bash
# Start MySQL and Redis
docker-compose up -d mysql redis

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### 4. Development with Docker (Alternative)

```bash
# Start all services including the app
docker-compose up

# Or start just the databases
docker-compose up -d mysql redis
```

## 🗄️ Database Setup

The application uses Prisma ORM with MySQL. The schema includes:

- **Users** - Authentication and authorization
- **Companies** - Multi-tenant organization
- **Trackers** - External system integrations (Jira, Teamwork)
- **Issues** - Normalized issue data from trackers
- **PromptTemplates** - Customizable prompt templates
- **Prompts & PromptVersions** - Generated prompt history
- **Outputs** - Generated content and files
- **GenerationEvents** - Analytics and usage tracking

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migration
npm run db:migrate

# Deploy migrations to production
npm run db:deploy

# Open Prisma Studio
npm run db:studio
```

## 🏗️ Architecture

The project follows Clean Architecture with these layers:

```
backend/src/
├── controllers/    # API endpoints and request handling
├── services/       # Business logic layer
├── repositories/   # Data access layer
├── middleware/     # Express middleware
├── types/          # TypeScript type definitions
├── utils/          # Helper utilities
└── test/           # Test utilities and mocks
```

## 🔒 Authentication

The system uses JWT-based authentication with:

- **Access Tokens:** 15-minute lifetime, HS256 signed
- **Refresh Tokens:** 7-day lifetime, HTTP-only cookies
- **Role-Based Access Control (RBAC):**
  - `admin`: Full system access
  - `lead`: Template management + metrics
  - `developer`: Issue & prompt operations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

Coverage requirements:
- Component logic: ≥80%
- Custom hooks: ≥90%
- Store logic: ≥95%

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

### Issues
- `GET /api/issues` - List filtered issues
- `GET /api/issues/:id` - Get specific issue

### Templates (admin/lead only)
- `GET /api/prompt-templates` - List templates
- `POST /api/prompt-templates` - Create template
- `PATCH /api/prompt-templates/:id` - Update template

### Prompt Generation
- `POST /api/prompts/generate` - Generate prompt from issue + template
- `POST /api/outputs` - Upload generated content

### Analytics (admin/lead only)
- `GET /api/stats/summary` - Key metrics summary

## 🔄 Background Jobs

BullMQ handles background processing:

- **Tracker Sync:** Every 5 minutes (delta updates)
- **Error Handling:** Exponential backoff, dead letter queue
- **Monitoring:** Job status tracking

## 🚢 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Production

```bash
# Build production image
docker build --target production -t issue-prompt-platform .

# Run production container
docker run -p 3001:3001 issue-prompt-platform
```

## 🔧 Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment mode | development |

## 📈 Monitoring

The application includes:

- **Health Checks:** `/health` endpoint
- **Prometheus Metrics:** Request duration, error rates
- **Structured Logging:** JSON format with Winston
- **Request Tracking:** All HTTP requests logged

## 🔐 Security Features

- **HTTPS-only** (redirect HTTP)
- **HSTS headers** enabled
- **Rate limiting** per IP
- **Input validation** with Zod schemas
- **Parameterized queries** (Prisma ORM)
- **File upload** size limits and type validation

## 📝 What's Implemented

### ✅ Core Infrastructure
- [x] Project structure with TypeScript
- [x] Express.js application setup
- [x] Prisma database schema
- [x] Docker development environment
- [x] Logging with Winston
- [x] Security middleware (Helmet, CORS, Rate limiting)
- [x] Health check endpoint
- [x] Error handling middleware
- [x] Test configuration with Jest

### 🚧 In Progress / Missing
- [ ] Authentication system (JWT + BCrypt)
- [ ] Authorization middleware (RBAC)
- [ ] API route controllers
- [ ] Business logic services
- [ ] External tracker clients (Jira, Teamwork)
- [ ] Template rendering engine (Handlebars)
- [ ] File upload handling (Multer)
- [ ] Background job system (BullMQ)
- [ ] Prometheus metrics
- [ ] Unit tests implementation
- [ ] Database migrations
- [ ] API documentation (OpenAPI)

## 🎯 Next Steps

1. **Install Dependencies**: Run `npm install` to resolve TypeScript errors
2. **Implement Authentication**: JWT service and auth middleware
3. **Create API Controllers**: Issue, template, and prompt endpoints
4. **Add External Integrations**: Jira and Teamwork clients
5. **Implement Template Engine**: Handlebars processing
6. **Add Background Jobs**: BullMQ queue setup
7. **Write Tests**: Unit and integration tests
8. **Add Metrics**: Prometheus monitoring

## 🤝 Contributing

1. Follow TypeScript strict mode guidelines
2. Maintain ≥80% test coverage
3. Use conventional commit messages
4. Run linting before commits: `npm run lint:fix`

## 📄 License

MIT License - see LICENSE file for details 