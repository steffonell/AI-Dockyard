# Teamwork API Integration Setup Guide

This guide explains how to set up the Teamwork API integration to replace mock data with real Teamwork issues.

## Overview

The application now supports syncing issues from Teamwork via:
1. **Backend Tracker System**: Integrated Teamwork client for syncing to database
2. **Frontend Sync Interface**: Button to trigger sync and view results

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in your project root with Teamwork credentials:

```bash
# Backend API Configuration
TEAMWORK_API_KEY=your-teamwork-api-key
TEAMWORK_SITE=yourcompany.teamwork.com

# Database Configuration (if using separate DB)
DATABASE_URL=your-database-url

# Optional: CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 2. Get Your Teamwork API Key

1. Log into your Teamwork account
2. Go to **Settings** → **API & Webhooks**
3. Generate a new API key
4. Copy the API key to your `.env` file

### 3. Create a Teamwork Tracker (via API or Admin UI)

**Option A: Via API (Postman/curl)**
```bash
POST http://localhost:3001/api/trackers
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "companyId": "your-company-id",
  "type": "teamwork",
  "authJson": {
    "apiKey": "your-teamwork-api-key",
    "site": "yourcompany.teamwork.com"
  }
}
```

**Option B: Via Admin UI** (if available)
- Navigate to Trackers section
- Click "Add Tracker"
- Select "Teamwork" type
- Enter your API credentials

### 4. Sync Issues

Once your tracker is configured:

1. **Via Frontend**:
   - Go to Issues page
   - Click the sync button (🔄)
   - Select your Teamwork tracker
   - Click "Sync Issues"

2. **Via API**:
   ```bash
   POST http://localhost:3001/api/trackers/{tracker-id}/sync
   Authorization: Bearer <your-jwt-token>
   ```

## Features

### Real-time Sync
- Fetches tasks from all Teamwork projects
- Maps Teamwork status to standard issue status
- Preserves assignee information
- Stores full Teamwork data in `payloadJson` field

### Status Mapping
| Teamwork Status | App Status    |
|----------------|---------------|
| new            | open          |
| notstarted     | open          |
| inprogress     | in_progress   |
| completed      | done          |
| cancelled      | cancelled     |

### Data Transformation
- **Title**: Uses Teamwork task name
- **Description**: Uses Teamwork task description
- **External Key**: Uses Teamwork task ID
- **Assignee**: Maps responsible party information
- **Tags/Labels**: Preserves Teamwork tags
- **Priority**: Maps priority levels

## API Endpoints

### Tracker Management
- `GET /api/trackers` - List all trackers
- `POST /api/trackers` - Create new tracker
- `POST /api/trackers/:id/sync` - Sync tracker issues
- `POST /api/trackers/:id/test` - Test connection

### Issue Sync
- `POST /api/issues/sync/:trackerId` - Alternative sync endpoint

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify API key is correct
   - Check that site URL is correct (without https://)
   - Ensure you have proper permissions in Teamwork

2. **No Issues Synced**
   - Check that you have tasks in your Teamwork projects
   - Verify the API key has access to the projects
   - Check the backend logs for specific errors

3. **Sync Errors**
   - Some tasks may fail due to data validation
   - Check the sync results for error count
   - Review backend logs for specific issues

### Debugging

1. **Backend Logs**
   ```bash
   # Check backend logs
   cd backend
   npm run dev
   ```

2. **Test Connection**
   ```bash
   POST /api/trackers/{tracker-id}/test
   ```

3. **Manual API Test**
   ```bash
   # Test Teamwork API directly
   curl -u "your-api-key:x" \
        "https://yourcompany.teamwork.com/projects/api/v3/projects.json"
   ```

## Development Notes

- **No Docker/Redis Required**: Per project requirements
- **Database Storage**: Issues are stored in local database after sync
- **Incremental Sync**: Future enhancement could support delta syncing
- **Real-time Updates**: Consider webhooks for live updates

## File Structure

```
backend/src/clients/teamwork.client.ts    # Teamwork API integration
backend/src/controllers/tracker.controller.ts    # Tracker management
backend/src/controllers/issue.controller.ts      # Issue sync logic
frontend/src/services/trackerService.ts          # Frontend tracker API
frontend/src/pages/IssueListPage.tsx            # Sync UI
```

## Next Steps

1. **Test Connection**: Use the test endpoint to verify API connectivity
2. **Initial Sync**: Perform first sync to populate issues
3. **Verify Data**: Check that issues display correctly in the frontend
4. **Set up Regular Sync**: Consider implementing scheduled syncing 