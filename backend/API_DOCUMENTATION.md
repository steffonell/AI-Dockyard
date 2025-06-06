# Issue-to-Prompt Platform API Documentation

## Overview

This API provides a comprehensive backend for managing issues from external trackers (Jira, Teamwork) and generating AI prompts based on templates.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication (`/api/auth`)

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "developer"
}
```

#### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST `/auth/refresh`
Refresh JWT token using refresh token.

#### POST `/auth/logout`
Logout and invalidate tokens.

### Users (`/api/users`)

#### GET `/users/me`
Get current user profile.

#### GET `/users` (Admin only)
Get all users with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `role` (string): Filter by role (admin, lead, developer)
- `search` (string): Search in name and email

#### GET `/users/:id`
Get user by ID (own profile or admin access).

#### PUT `/users/:id`
Update user profile (own profile or admin access).

#### DELETE `/users/:id` (Admin only)
Delete user account.

#### POST `/users/:id/change-password`
Change user password (own account only).

#### GET `/users/:id/stats`
Get user statistics (own stats or admin access).

### Companies (`/api/companies`)

#### GET `/companies`
Get all companies with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search in company name

#### GET `/companies/:id`
Get company by ID with trackers and templates.

#### POST `/companies` (Admin only)
Create new company.

**Request Body:**
```json
{
  "name": "Company Name"
}
```

#### PUT `/companies/:id` (Admin only)
Update company.

#### DELETE `/companies/:id` (Admin only)
Delete company (only if no associated data).

#### GET `/companies/:id/stats`
Get company statistics.

### Trackers (`/api/trackers`)

#### GET `/trackers`
Get all trackers with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `companyId` (string): Filter by company
- `type` (string): Filter by type (jira, teamwork)

#### GET `/trackers/:id`
Get tracker by ID.

#### POST `/trackers` (Lead/Admin only)
Create new tracker.

**Request Body:**
```json
{
  "companyId": "company-id",
  "type": "jira",
  "baseUrl": "https://company.atlassian.net",
  "authJson": {
    "type": "api_key",
    "credentials": {
      "email": "user@company.com",
      "apiToken": "your-api-token"
    }
  }
}
```

#### PUT `/trackers/:id` (Lead/Admin only)
Update tracker.

#### DELETE `/trackers/:id` (Admin only)
Delete tracker (only if no associated issues).

#### POST `/trackers/:id/test`
Test tracker connection.

#### POST `/trackers/:id/sync`
Sync issues from external tracker.

### Issues (`/api/issues`)

#### GET `/issues`
Get all issues with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status
- `assigneeId` (string): Filter by assignee
- `trackerId` (string): Filter by tracker
- `search` (string): Search in title and description

#### GET `/issues/:id`
Get issue by ID.

#### POST `/issues`
Create new issue.

**Request Body:**
```json
{
  "title": "Issue Title",
  "description": "Issue description",
  "status": "open",
  "trackerId": "tracker-id",
  "assigneeId": "user-id"
}
```

#### PUT `/issues/:id`
Update issue.

#### DELETE `/issues/:id`
Delete issue.

#### POST `/issues/sync/:trackerId`
Sync issues from specific tracker.

### Templates (`/api/templates`)

#### GET `/templates`
Get all templates with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `companyId` (string): Filter by company
- `isActive` (boolean): Filter by active status
- `search` (string): Search in name and body

#### GET `/templates/:id`
Get template by ID.

#### POST `/templates`
Create new template.

**Request Body:**
```json
{
  "companyId": "company-id",
  "name": "Template Name",
  "bodyMd": "# Template\n\nIssue: {{issue.title}}\nAssignee: {{issue.assignee.name}}",
  "lintJson": {}
}
```

#### PUT `/templates/:id`
Update template (creator or admin only).

#### DELETE `/templates/:id`
Delete template (soft delete - creator or admin only).

#### POST `/templates/:id/render`
Render template with variables.

**Request Body:**
```json
{
  "variables": {
    "customVar": "value"
  }
}
```

#### POST `/templates/:id/clone`
Clone template to another company.

**Request Body:**
```json
{
  "name": "Cloned Template Name",
  "companyId": "target-company-id"
}
```

### Prompts (`/api/prompts`)

#### GET `/prompts`
Get all prompts with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `issueId` (string): Filter by issue
- `templateId` (string): Filter by template
- `creatorId` (string): Filter by creator

#### GET `/prompts/:id`
Get prompt by ID with versions and generation events.

#### POST `/prompts`
Create new prompt.

**Request Body:**
```json
{
  "issueId": "issue-id",
  "templateId": "template-id",
  "variables": {
    "customVar": "value"
  }
}
```

#### PUT `/prompts/:id`
Update prompt (regenerate with new variables).

**Request Body:**
```json
{
  "variables": {
    "updatedVar": "new value"
  }
}
```

#### DELETE `/prompts/:id`
Delete prompt (creator or admin only).

#### GET `/prompts/:id/versions`
Get all versions of a prompt.

#### POST `/prompts/:id/versions`
Create new version of prompt.

**Request Body:**
```json
{
  "bodyText": "Generated prompt text",
  "tokensEstimate": 150
}
```

#### POST `/prompts/:id/generation`
Record generation event for analytics.

**Request Body:**
```json
{
  "tokensIn": 100,
  "tokensOut": 200,
  "ide": "vscode"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Pagination Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Role-Based Access Control

- **Developer**: Can view and manage own data, create prompts
- **Lead**: Developer permissions + manage trackers
- **Admin**: Full access to all resources

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Authenticated users may have higher limits

## Health Check

#### GET `/health`
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development"
}
``` 