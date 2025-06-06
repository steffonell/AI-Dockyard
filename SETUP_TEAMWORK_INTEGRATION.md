# Teamwork Integration Setup Guide

This guide will help you connect your React frontend to the Teamwork API server to display real Teamwork data instead of mock data.

## Problem Identified

The frontend was configured to connect to the backend API (port 3001) which requires authentication and database setup, but the actual Teamwork API integration is in the `/server` directory running on port 5000.

## Solution Implemented

1. **Updated Frontend API Client**: Changed the base URL from `http://localhost:3001/api` to `http://localhost:5000/api`
2. **Created TeamworkService**: New service to connect directly to Teamwork API endpoints
3. **Created TeamworkIssuesPage**: New page component that displays real Teamwork tasks
4. **Updated App Routes**: Replaced the old IssueListPage with TeamworkIssuesPage

## Setup Steps

### 1. Configure Teamwork Server Environment

Create a `.env` file in the `/server` directory with your Teamwork credentials:

```bash
# Teamwork API Configuration
TEAMWORK_API_KEY=your_teamwork_api_key_here
TEAMWORK_SITE=your_company.teamwork.com

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2. Configure Frontend Environment (Optional)

Create a `.env` file in the `/frontend` directory to override the default API URL:

```bash
# Frontend Configuration
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Start the Servers

**Terminal 1 - Start Teamwork Server:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Verify Connection

1. Open your browser to `http://localhost:3000`
2. Navigate to the Issues page
3. Click the "Test Connection" button to verify Teamwork API connectivity
4. If successful, you should see real Teamwork tasks instead of mock data

## Troubleshooting

### Common Issues:

1. **"Failed to connect to Teamwork API"**
   - Check that the Teamwork server is running on port 5000
   - Verify your `TEAMWORK_API_KEY` and `TEAMWORK_SITE` in the server `.env` file
   - Test your API key directly in Teamwork's API documentation

2. **"CORS Error"**
   - Ensure the server's `CORS_ORIGIN` is set to `http://localhost:3000`
   - Check that both servers are running on the correct ports

3. **"No tasks found"**
   - Verify you have tasks in your Teamwork projects
   - Check the browser console for API errors
   - Use the "Test Connection" feature to diagnose issues

### API Endpoints Available:

- `GET /api/teamwork/test-connection` - Test API connectivity
- `GET /api/teamwork/projects` - Get all projects
- `GET /api/teamwork/tasks` - Get all tasks
- `GET /api/teamwork/projects/:id/tasks` - Get tasks for specific project

## Features

The new TeamworkIssuesPage includes:

- **Real-time Teamwork data** - Direct connection to your Teamwork instance
- **Project filtering** - Filter tasks by specific projects
- **Status filtering** - Filter by task status (New, In Progress, Completed)
- **Search functionality** - Search tasks by name, description, or project
- **Connection testing** - Built-in tool to test API connectivity
- **Responsive design** - Works on desktop and mobile devices

## Next Steps

Once the integration is working, you can:

1. Customize the task display format
2. Add more filtering options
3. Implement task creation/editing
4. Add real-time updates
5. Integrate with the prompt generation features

## Architecture Notes

This solution uses a **direct integration approach** where:
- Frontend connects directly to Teamwork API server (port 5000)
- No database layer or authentication required
- Real-time data from Teamwork API
- Simpler setup and maintenance

If you prefer a **database-backed approach**, you would need to:
1. Set up the backend server (port 3001) with Prisma database
2. Configure authentication
3. Sync Teamwork data to the database
4. Use the existing IssueListPage with backend API calls 