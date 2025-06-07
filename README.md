# AI-Powered Issue-to-Prompt System

A complete workflow system that transforms Teamwork issues into actionable AI instructions for developers. Features template management, issue selection, and AI-powered prompt generation to streamline development workflows with tools like Cursor.

## 🔒 Security Features

- **API credentials stored server-side only** - Never exposed to frontend
- **Express proxy layer** - All API calls routed through secure backend
- **Environment variable management** - Sensitive data in `.env` files
- **CORS protection** - Restricted origins for API access
- **Request/response logging** - Comprehensive error tracking
- **Input validation** - Sanitized API parameters
- **Role-based access control** - Admin-only template management
- **OpenAI API integration** - Secure AI prompt generation

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- MySQL 8+ (for data persistence)
- Teamwork account with API access
- OpenAI API key (for AI prompt generation)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd teamwork-integration

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install
```

### 2. Environment Configuration

Create `.env` file in project root:

```env
# Teamwork API Configuration
TEAMWORK_API_KEY=twp_AHqW3amssAxEjsEAWtPQDigPeO8q
TEAMWORK_SITE=agentcocompany.teamwork.com

# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Configuration (Optional)
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=teamwork_cache

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup (Optional)

If using MySQL caching:

```sql
CREATE DATABASE teamwork_cache;
-- Tables will be created automatically on first run
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### 5. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

## 🤖 Issue-to-Prompt Workflow

The core feature that transforms Teamwork issues into actionable AI instructions for developers using tools like Cursor.

### How It Works

1. **Template Management** (Admin) - Create reusable prompt templates with variables
2. **Issue Selection** - Choose any Teamwork issue/ticket
3. **AI Configuration** - Set model parameters (GPT-4, temperature, etc.)
4. **Instruction Generation** - AI creates specific, actionable development instructions

### Key Features

- **Variable Substitution** - Templates automatically populate with issue data
- **Multiple AI Models** - Support for GPT-4, GPT-4o, GPT-3.5-turbo
- **Template Categories** - Bug fixes, features, code review, testing, documentation
- **Copy & Download** - Easy sharing with AI coding assistants
- **Preview Mode** - See populated templates before generation

### Available Template Variables

Templates can use these variables that auto-populate with issue data:

| Variable | Description | Example |
|----------|-------------|---------|
| `{issue_title}` | Issue title | "Fix login validation bug" |
| `{issue_key}` | Issue identifier | "PROJ-123" |
| `{issue_description}` | Full description | "Users cannot login with valid credentials" |
| `{issue_status}` | Current status | "new", "in-progress", "completed" |
| `{issue_priority}` | Priority level | "high", "medium", "low" |
| `{project_name}` | Project name | "E-commerce Platform" |
| `{assignee_name}` | Assigned developer | "John Smith" |
| `{reporter_name}` | Issue reporter | "Jane Doe" |
| `{created_date}` | Creation date | "2024-01-15" |
| `{updated_date}` | Last update | "2024-01-20" |
| `{issue_url}` | Direct Teamwork link | Full URL to issue |

### Example Workflow

1. **Admin creates bug fix template:**
```markdown
# Fix: {issue_title}

Analyze and fix this {issue_priority} priority bug in {project_name}.

## Issue Details
- Key: {issue_key}
- Description: {issue_description}
- Assignee: {assignee_name}

## Instructions
1. Reproduce the issue locally
2. Identify root cause
3. Implement fix with tests
4. Update documentation if needed

Issue URL: {issue_url}
```

2. **Developer selects issue** from Teamwork
3. **System generates AI instructions:**
```markdown
# Fix: Login validation failing for valid users

Analyze and fix this high priority bug in E-commerce Platform.

## Issue Details  
- Key: PROJ-123
- Description: Users cannot login with valid email/password combinations
- Assignee: John Smith

## Instructions
1. Check authentication middleware
2. Verify database connection
3. Test password hashing logic
4. Add comprehensive test coverage

Issue URL: https://company.teamwork.com/issues/123
```

4. **Developer copies instructions** to Cursor or other AI IDE
5. **AI assistant provides specific implementation guidance**

### Navigation

- **Issues Page** → "Create AI Instructions" button → Issue-to-Prompt workflow
- **Template Manager** → "Use Templates" button → Issue-to-Prompt workflow  
- **Direct navigation** → `/issue-to-prompt` in the app

### Example Templates

See [Example Templates Documentation](docs/EXAMPLE_TEMPLATES.md) for ready-to-use templates for:
- Bug fixes
- Feature development  
- Code reviews
- Testing strategies
- Documentation tasks

## 📁 Project Structure

```
AI-Dockyard/
├── backend/               # Express backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation, etc.
│   │   └── types/         # TypeScript definitions
│   ├── prisma/           # Database schema & migrations
│   └── .env              # Environment variables
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main application pages
│   │   │   ├── IssueToPromptPage.tsx    # Main workflow
│   │   │   ├── TemplateManagerPage.tsx  # Template CRUD
│   │   │   ├── TeamworkIssuesPage.tsx   # Issue browser
│   │   │   └── PromptWizardPage.tsx     # Prompt generator
│   │   ├── services/     # API service layer
│   │   ├── store/        # State management
│   │   └── types/        # TypeScript definitions
│   └── public/
├── docs/                 # Documentation
│   └── EXAMPLE_TEMPLATES.md  # Template examples
└── README.md
```## 🔌 API Endpoints

### Backend Routes (Express Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teamwork/test-connection` | GET | Test Teamwork API connection |
| `/api/teamwork/projects` | GET | Fetch all projects |
| `/api/teamwork/projects/:id/tasks` | GET | Fetch tasks for specific project |
| `/api/teamwork/tasks` | GET | Fetch all tasks across projects |

### Query Parameters

**Task Filtering:**
- `completedOnly=true/false` - Filter by completion status
- `status[]=new&status[]=reopened` - Filter by task status
- `updatedAfter=YYYY-MM-DD` - Filter by update date

**Example:**
```
GET /api/teamwork/projects/123/tasks?completedOnly=false&status[]=new
```

## 🎨 Frontend Components

### Dashboard
Main application interface with project and task overview.

### ProjectList
- **Search functionality** - Filter projects by name/description
- **Status filtering** - Active, completed, archived projects
- **Responsive design** - Mobile-friendly layout
- **Loading states** - Smooth user experience

### TaskList
- **Priority sorting** - Overdue tasks highlighted
- **Due date indicators** - Visual cues for urgency
- **Status filtering** - New, completed, reopened tasks
- **Infinite scroll** - Performance optimization

## 🛡️ Security Best Practices

### Environment Variables
```bash
# ✅ Good - Server-side only
TEAMWORK_API_KEY=your_api_key

# ❌ Bad - Never in frontend
REACT_APP_TEAMWORK_API_KEY=your_api_key
```

### API Proxy Pattern
```javascript
// ✅ Good - Through Express proxy
fetch('/api/teamwork/projects')

// ❌ Bad - Direct from frontend
fetch('https://site.teamwork.com/projects/api/v3/projects.json', {
  headers: { Authorization: 'Bearer ' + API_KEY }
})
```

### CORS Configuration
```javascript
// Production CORS setup
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com'
    : 'http://localhost:3000',
  credentials: true
};
```

## 🔧 Development

### Adding New API Endpoints

1. **Add route to `server/api/teamwork.js`:**
```javascript
router.get('/new-endpoint', async (req, res) => {
  try {
    const response = await axios.get(
      `${TEAMWORK_BASE_URL}/api/v3/new-endpoint`,
      getTeamworkConfig()
    );
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

2. **Add service function to `client/src/services/api.js`:**
```javascript
export const fetchNewData = async () => {
  const response = await api.get('/new-endpoint');
  return response.data;
};
```

3. **Use in React component:**
```javascript
const [data, setData] = useState([]);

useEffect(() => {
  fetchNewData().then(setData).catch(console.error);
}, []);
```### Testing the Integration

1. **Test API Connection:**
```bash
curl http://localhost:5000/api/teamwork/test-connection
```

2. **Test Projects Endpoint:**
```bash
curl http://localhost:5000/api/teamwork/projects
```

3. **Test Tasks with Filters:**
```bash
curl "http://localhost:5000/api/teamwork/tasks?completedOnly=false&status[]=new"
```

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
TEAMWORK_API_KEY=your_production_key
TEAMWORK_SITE=your_production_site
CORS_ORIGIN=https://yourdomain.com
```

### Build Commands
```bash
# Build React app
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Performance Optimization

### MySQL Caching
- **Projects cached for 60 minutes**
- **Tasks cached for 30 minutes**
- **Automatic cache invalidation**
- **Fallback to API if cache fails**

### Frontend Optimization
- **Component lazy loading**
- **Image optimization**
- **Bundle splitting**
- **Service worker caching**

## 🐛 Troubleshooting

### Common Issues

**1. API Connection Failed**
```
Error: Failed to connect to Teamwork API
```
- Check API key in `.env`
- Verify site URL format
- Test network connectivity

**2. CORS Errors**
```
Access to fetch blocked by CORS policy
```
- Verify `CORS_ORIGIN` in `.env`
- Check frontend URL matches origin

**3. Database Connection Failed**
```
Error: MySQL cache connection failed
```
- Verify MySQL credentials
- Check database exists
- Ensure MySQL service running

### Debug Mode
```bash
# Enable detailed logging
DEBUG=teamwork:* npm run dev
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review error logs