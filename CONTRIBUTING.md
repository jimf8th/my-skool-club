# Contributing to MySkoolClub

Thank you for considering contributing to MySkoolClub! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/my-skool-club.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Follow the local development setup in [README.md](README.md)

## Code Style

### Backend (Java/Spring Boot)
- Follow standard Java conventions
- Use meaningful variable and method names
- Add JavaDoc comments for public methods
- Keep methods focused and concise
- Write unit tests for new features

### Frontend (React/JavaScript)
- Use functional components with hooks
- Follow React best practices
- Keep components small and reusable
- Write meaningful component and variable names
- Use proper prop validation

## Branch Naming

- `feature/` - New features (e.g., `feature/club-analytics`)
- `fix/` - Bug fixes (e.g., `fix/login-redirect`)
- `docs/` - Documentation updates (e.g., `docs/api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)

## Commit Messages

Use clear, descriptive commit messages:
```
Add club analytics dashboard

- Implemented charts for member growth
- Added export functionality
- Updated API endpoints
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `mvn test` (backend) and `npm test` (frontend)
4. Update CHANGELOG.md with your changes
5. Submit PR with a clear description of changes
6. Link any related issues

## Testing

- Backend: Run `mvn test` before submitting
- Frontend: Run `npm run test:integration` with backend running
- Ensure all existing tests still pass

## Code Review

- All submissions require review
- Address reviewer feedback promptly
- Keep PRs focused on a single feature/fix
- Be respectful and constructive in discussions

## Branch Protection (For Repository Admins)

To maintain code quality and prevent accidental pushes to main branches, configure these GitHub branch protection rules:

### Main Branch Protection
Navigate to: **Settings > Branches > Branch protection rules**

**For `main` branch:**
- ✅ Require a pull request before merging
  - ✅ Require approvals (at least 1)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Status checks required: `backend-test`, `frontend-test`, `integration-test`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings (even for admins)
- ✅ Restrict who can push to matching branches (optional - limit to maintainers)

**For `develop` branch (if used):**
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Status checks: `backend-test`, `frontend-test`
- ✅ Allow force pushes (by maintainers only)

### Additional Security Settings
Navigate to: **Settings > Code security and analysis**
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates
- ✅ Enable Secret scanning

## Questions?

Reach out to Jim Edward at jimf8th@gmail.com

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community guidelines.
