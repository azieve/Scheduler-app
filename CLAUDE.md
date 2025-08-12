# Claude Code Instructions

## Git Commit Guidelines

**CRITICAL RULE: Do not commit anything to GitHub without explicit instructions from the user.**

This rule applies to:
- All code changes
- Bug fixes
- New features
- Documentation updates
- Any modifications to the codebase

Always wait for explicit user permission before running `git commit` or `git push` commands.

## Development Guidelines

- Follow existing code patterns and conventions
- Test changes locally before requesting commit permission
- Use meaningful commit messages when permission is granted
- Stage changes but don't commit without approval

## Project Structure

This is a scheduling application with:
- Backend: Node.js/Express API with PostgreSQL
- Frontend: React TypeScript application
- Authentication: Google OAuth
- Calendar integration: Google Calendar API
- Multiple calendar account support
- Advanced meeting types and booking system