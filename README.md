# Teamwork API Integration

A secure, full-stack application for integrating with Teamwork's API. Features a React frontend with Express backend proxy to keep API credentials secure.

## 🔒 Security Features

- **API credentials stored server-side only** - Never exposed to frontend
- **Express proxy layer** - All API calls routed through secure backend
- **Environment variable management** - Sensitive data in `.env` files
- **CORS protection** - Restricted origins for API access
- **Request/response logging** - Comprehensive error tracking
- **Input validation** - Sanitized API parameters

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- MySQL 8+ (optional, for caching)
- Teamwork account with API access

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

## 📁 Project Structure

```
teamwork-integration/
├── server/                 # Express backend
│   ├── api/
│   │   └── teamwork.js    # Teamwork API routes
│   ├── database/
│   │   └── mysql.js       # MySQL caching layer
│   └── server.js          # Main server file
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── App.jsx        # Main app component
│   │   └── index.js       # Entry point
│   └── public/
└── .env                   # Environment variables
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