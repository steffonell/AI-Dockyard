# Example Prompt Templates

This document contains example templates for the Issue-to-Prompt workflow. These templates show how to use variables and create effective prompts for different types of issues.

## Available Variables

When creating templates, you can use these variables that will be automatically replaced with issue data:

- `{issue_title}` - The title of the issue
- `{issue_key}` - The issue key/ID (e.g., PROJ-123)
- `{issue_description}` - The full description of the issue
- `{issue_status}` - Current status (e.g., "new", "in-progress", "completed")
- `{issue_priority}` - Priority level (e.g., "high", "medium", "low")
- `{issue_url}` - Direct link to the issue in Teamwork
- `{project_name}` - Name of the project the issue belongs to
- `{assignee_name}` - Name of the person assigned to the issue
- `{reporter_name}` - Name of the person who created the issue
- `{created_date}` - Date when the issue was created
- `{updated_date}` - Date when the issue was last updated

## Example Templates

### 1. Bug Fix Template

**Category:** bug-fix

```markdown
# Bug Fix Instructions for {issue_title}

You are a senior software engineer tasked with fixing a bug. Analyze the following issue and provide a comprehensive solution.

## Issue Summary
- **Key:** {issue_key}
- **Title:** {issue_title}
- **Priority:** {issue_priority}
- **Status:** {issue_status}
- **Project:** {project_name}

## Problem Description
{issue_description}

## Your Task
Please provide step-by-step instructions for fixing this bug, including:

1. **Root Cause Analysis**
   - Identify the likely cause of the bug
   - Explain why this issue might have occurred

2. **Investigation Steps**
   - What files to examine first
   - What logs or error messages to look for
   - How to reproduce the issue locally

3. **Fix Implementation**
   - Specific code changes needed
   - Which files to modify
   - Any database changes required

4. **Testing Strategy**
   - Unit tests to write or update
   - Integration tests to run
   - Manual testing steps

5. **Deployment Considerations**
   - Any migration scripts needed
   - Configuration changes required
   - Rollback plan if needed

## Additional Context
- Issue URL: {issue_url}
- Created by: {reporter_name} on {created_date}
- Last updated: {updated_date}

Please provide clear, actionable instructions that a developer can follow using AI coding assistants like Cursor.
```

### 2. Feature Development Template

**Category:** feature

```markdown
# Feature Implementation Guide: {issue_title}

You are a senior full-stack developer implementing a new feature. Create a comprehensive development plan for the following requirement.

## Feature Requirements
- **Issue:** {issue_key} - {issue_title}
- **Priority:** {issue_priority}
- **Project:** {project_name}
- **Description:** {issue_description}

## Development Instructions

### 1. Architecture Planning
- Design the overall structure of this feature
- Identify which layers (frontend, backend, database) need changes
- Consider impact on existing code

### 2. Database Changes
- What new tables or columns are needed?
- Any indexes required for performance?
- Migration scripts to write

### 3. Backend Implementation
- New API endpoints to create
- Business logic to implement
- Data validation rules
- Error handling strategies

### 4. Frontend Implementation
- New components or pages needed
- State management updates
- User interface design considerations
- User experience flow

### 5. Testing Plan
- Unit tests for business logic
- API endpoint tests
- Frontend component tests
- End-to-end testing scenarios

### 6. Documentation
- API documentation updates
- User documentation
- Code comments and README updates

## Success Criteria
Define what "done" looks like for this feature based on the requirements.

## Additional Information
- Assignee: {assignee_name}
- Reporter: {reporter_name}
- Issue URL: {issue_url}
- Created: {created_date}

Provide specific, implementable instructions that can be used with AI coding tools.
```

### 3. Code Review Template

**Category:** code-review

```markdown
# Code Review Guidelines for {issue_title}

Perform a thorough code review for the changes related to this issue.

## Issue Context
- **Key:** {issue_key}
- **Title:** {issue_title}
- **Description:** {issue_description}
- **Project:** {project_name}

## Review Checklist

### Code Quality
- [ ] Code follows project conventions and style guide
- [ ] Functions and variables have clear, descriptive names
- [ ] Code is well-documented with comments where needed
- [ ] No code duplication or unnecessary complexity

### Functionality
- [ ] Code correctly implements the requirements
- [ ] Edge cases are handled appropriately
- [ ] Error handling is comprehensive
- [ ] Performance considerations are addressed

### Security
- [ ] Input validation is present
- [ ] No sensitive data is exposed
- [ ] Authentication/authorization is proper
- [ ] SQL injection and XSS prevention

### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and test actual business logic
- [ ] No tests are commented out or skipped
- [ ] Test names clearly describe what is being tested

### Documentation
- [ ] README updated if needed
- [ ] API documentation reflects changes
- [ ] Breaking changes are documented
- [ ] Migration guides provided if necessary

## Specific Areas to Focus On
Based on the issue description: {issue_description}

## Review Context
- Issue URL: {issue_url}
- Assignee: {assignee_name}
- Created: {created_date}

Provide specific feedback and actionable suggestions for improvement.
```

### 4. Documentation Template

**Category:** documentation

```markdown
# Documentation Task: {issue_title}

Create comprehensive documentation for the specified topic.

## Documentation Request
- **Issue:** {issue_key}
- **Title:** {issue_title}
- **Description:** {issue_description}
- **Priority:** {issue_priority}

## Documentation Structure

### 1. Overview
- Purpose and scope of the documentation
- Target audience
- Prerequisites

### 2. Content Outline
Based on the requirements, create a detailed outline covering:
- Main topics to address
- Subtopics and sections
- Examples and use cases to include

### 3. Writing Guidelines
- Use clear, concise language
- Include code examples where relevant
- Add screenshots or diagrams if helpful
- Provide links to related resources

### 4. Review Process
- Technical accuracy verification
- Grammar and style check
- User testing of instructions
- Stakeholder approval

## Deliverables
- What documents need to be created or updated
- Where the documentation should be published
- Format requirements (Markdown, Wiki, etc.)

## Context
- Project: {project_name}
- Requested by: {reporter_name}
- Due consideration: {issue_priority} priority
- Issue URL: {issue_url}

Create documentation that is clear, accurate, and useful for the intended audience.
```

### 5. Testing Template

**Category:** testing

```markdown
# Testing Strategy for {issue_title}

Develop a comprehensive testing approach for the specified functionality.

## Testing Scope
- **Issue:** {issue_key} - {issue_title}
- **Description:** {issue_description}
- **Project:** {project_name}
- **Priority:** {issue_priority}

## Test Planning

### 1. Test Types Needed
- Unit tests for individual components
- Integration tests for component interactions
- End-to-end tests for user workflows
- Performance tests if applicable
- Security tests if relevant

### 2. Test Cases
Create detailed test cases covering:
- Happy path scenarios
- Edge cases and boundary conditions
- Error conditions and exception handling
- User input validation
- Cross-browser/platform compatibility

### 3. Test Data
- What test data is needed
- How to set up test environments
- Mock data requirements
- Database seeding strategies

### 4. Automation Strategy
- Which tests can be automated
- Test frameworks to use
- CI/CD integration requirements
- Test reporting and monitoring

### 5. Manual Testing
- Scenarios that require manual testing
- User acceptance testing criteria
- Exploratory testing guidelines
- Accessibility testing considerations

## Success Criteria
Define what constitutes adequate test coverage and quality.

## Additional Information
- Assignee: {assignee_name}
- Reporter: {reporter_name}
- Created: {created_date}
- Issue URL: {issue_url}

Provide specific, actionable testing instructions that ensure quality and reliability.
```

## Usage Tips

1. **Customize Variables**: Modify templates to include additional project-specific variables
2. **Combine Templates**: Use elements from multiple templates for complex issues
3. **Keep Updated**: Regularly review and update templates based on team feedback
4. **Test Templates**: Try templates with different types of issues to ensure they work well
5. **Team Collaboration**: Share templates with your team and gather input for improvements

## Creating Your Own Templates

When creating new templates:

1. Start with a clear purpose and target issue type
2. Use descriptive variable names that make sense
3. Structure content logically with clear headings
4. Include specific, actionable instructions
5. Consider the end user (developer using AI tools)
6. Test with real issues to validate effectiveness 