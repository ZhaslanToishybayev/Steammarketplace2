# 🚀 CI/CD Setup Guide

## 📋 Overview

This project uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The pipeline automatically tests, builds, and deploys the application to staging and production environments.

## 🏗️ Pipeline Architecture

### Pipeline Stages

```
┌─────────────┐
│  Linting    │  → Code quality checks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Security   │  → Vulnerability scanning
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Testing    │  → Unit & Integration tests
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Building   │  → Build artifacts
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Docker     │  → Container build & scan
└──────┬──────┘
       │
       ├────────────────────────┐
       │                        │
       ▼                        ▼
┌─────────────┐          ┌─────────────┐
│ Staging     │          │ Performance │
│ Deploy      │          │ Tests       │
└──────┬──────┘          └─────────────┘
       │
       ▼
┌─────────────┐
│ Production  │
│ Deploy      │
└─────────────┘
```

## 🔧 Configuration Files

### 1. Main CI/CD Workflow
**File:** `.github/workflows/ci-cd.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- `lint`: Code quality and formatting checks
- `security`: npm audit and Snyk vulnerability scanning
- `test`: Unit and integration tests with MongoDB
- `build`: Backend application build
- `build-frontend`: Frontend build
- `docker`: Docker image build and security scan
- `deploy-staging`: Deploy to staging (develop branch)
- `deploy-production`: Deploy to production (main branch)
- `performance`: Lighthouse CI performance tests
- `notify`: Slack notifications

### 2. Dependency Updates
**File:** `.github/workflows/dependency-updates.yml`

**Triggers:**
- Weekly schedule (Mondays at 9:00 AM UTC)
- Manual trigger

**Jobs:**
- `update-dependencies`: Automated dependency updates
- `security-advisory`: Security vulnerability checks
- `license-check`: License compliance verification
- `outdated`: Outdated dependencies report

### 3. Performance Testing
**File:** `lighthouserc.js`

**Configuration:**
- Automated performance testing on staging
- Lighthouse CI integration
- Performance budgets defined

## ⚙️ Environment Setup

### Required GitHub Secrets

Add these secrets in GitHub repository settings (`Settings` → `Secrets and variables` → `Actions`):

```bash
# Docker
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password

# Snyk Security
SNYK_TOKEN=your-snyk-token

# Lighthouse CI
LHCI_GITHUB_APP_TOKEN=your-lhci-token

# Staging Server
STAGING_HOST=staging.example.com
STAGING_USER=deploy-user
STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----

# Production Server
PRODUCTION_HOST=production.example.com
PRODUCTION_USER=deploy-user
PRODUCTION_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----

# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## 🚀 Deployment Strategy

### Staging Deployment
**Trigger:** Push to `develop` branch

**Process:**
1. Build Docker image
2. Run security scans
3. Deploy to staging environment
4. Run health checks
5. Run performance tests
6. Notify via Slack

### Production Deployment
**Trigger:** Push to `main` branch

**Process:**
1. Build Docker image
2. Run security scans
3. Run all tests
4. Pre-deployment checks
5. Deploy to production
6. Post-deployment health checks
7. Notify via Slack

## 🔍 Quality Gates

### Linting
- ESLint checks
- Prettier formatting
- Console.log detection (fails build if found)

### Security
- npm audit (high/critical vulnerabilities)
- Snyk security scanning
- Trivy container scanning
- License compliance check

### Testing
- Unit tests (Jest)
- Integration tests (MongoDB required)
- Code coverage (Codecov)
- Minimum coverage threshold: 80%

### Performance
- Lighthouse CI checks
- Performance budgets:
  - First Contentful Paint: < 2s
  - Largest Contentful Paint: < 4s
  - Cumulative Layout Shift: < 0.1
  - Speed Index: < 4s
  - Total Blocking Time: < 500ms

## 📊 Monitoring & Reporting

### Test Coverage
- Upload to Codecov
- PR comments with coverage changes
- Coverage reports as artifacts

### Security Reports
- Snyk scan results
- Trivy vulnerability reports
- npm audit results
- Upload to GitHub Security tab

### Performance Reports
- Lighthouse CI reports
- Archived as artifacts
- Commented on PRs

### Notifications
- Slack integration for:
  - Deployment success/failure
  - Security issues
  - Performance regressions

## 🛠️ Local Development

### Running CI/CD Locally

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Run tests
npm test
npm run test:unit
npm run test:integration

# Generate coverage
npm run test:coverage

# Build application
npm run build

# Build frontend
cd frontend && npm install && npm run build

# Build Docker image
docker build -t steam-marketplace .
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Run tests in container
docker-compose exec app npm test

# Stop containers
docker-compose down
```

## 🔄 Workflow Customization

### Adding New Jobs

1. **Edit:** `.github/workflows/ci-cd.yml`
2. **Add:** New job definition
3. **Set:** Dependencies with `needs:`
4. **Test:** Create PR and verify

### Example: Adding E2E Tests

```yaml
e2e-tests:
  name: 🧪 E2E Tests
  runs-on: ubuntu-latest
  needs: [build-frontend]
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install Playwright
      run: npx playwright install

    - name: Run E2E tests
      run: npx playwright test
```

### Custom Environment Variables

Add to job definitions:

```yaml
env:
  CUSTOM_VAR: value
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}
```

## 📝 Pull Request Guidelines

### Required Checks
All checks must pass before merging:
- [ ] Linting passed
- [ ] Security scan passed
- [ ] All tests passed
- [ ] Build successful
- [ ] Docker image built
- [ ] Code coverage ≥ 80%

### Review Requirements
- Minimum 1 reviewer for:
  - Code changes
  - Configuration changes
  - Security-sensitive changes
- Minimum 2 reviewers for:
  - Production deployment changes
  - Authentication/Authorization changes
  - Payment-related changes

### PR Template
Use `.github/PULL_REQUEST_TEMPLATE.md` for all PRs

## 🚨 Troubleshooting

### Common Issues

#### 1. Tests Failing
```bash
# Check test logs in GitHub Actions
# Run locally with same environment
MONGODB_URI=mongodb://localhost:27017/test npm test
```

#### 2. Docker Build Failing
```bash
# Check Dockerfile syntax
# Verify all dependencies in package.json
# Check for missing build tools
```

#### 3. Deployment Failing
```bash
# Verify SSH keys are valid
# Check server capacity
# Verify environment variables
# Check disk space
```

#### 4. Security Scan Failing
```bash
# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix

# Update Snyk token
# Re-run scan
```

### Debug Mode

Enable debug logging:

```yaml
- name: Run with debug
  run: npm test
  env:
    DEBUG: '*'
    NODE_ENV: test
```

## 📚 Best Practices

### 1. Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `hotfix/*`: Hotfix branches

### 2. Commit Messages
Follow conventional commits:
```
feat: add new trade offer validation
fix: resolve MongoDB connection issue
docs: update API documentation
test: add unit tests for auth middleware
chore: update dependencies
```

### 3. Code Coverage
- Maintain ≥ 80% coverage
- Add tests for new features
- Update tests when changing code

### 4. Security
- Regular dependency updates
- Security scans on every PR
- No secrets in code
- Use GitHub Secrets for sensitive data

### 5. Performance
- Monitor performance metrics
- Set performance budgets
- Test on staging before production
- Use Lighthouse CI

## 🔐 Security Considerations

### 1. Secrets Management
- All secrets in GitHub Secrets
- No secrets in code or logs
- Rotate secrets regularly
- Use different secrets per environment

### 2. Access Control
- Limit GitHub Actions permissions
- Use environment protections
- Require approvals for production
- Audit access regularly

### 3. Container Security
- Scan images with Trivy
- Use minimal base images
- Don't run as root
- Regular image updates

## 📈 Performance Optimization

### 1. Build Optimization
- Use caching for dependencies
- Parallelize jobs where possible
- Use matrix builds for multiple Node versions
- Cache Docker layers

### 2. Test Optimization
- Run unit tests in parallel
- Split integration tests by module
- Use test databases
- Parallel CI runners

### 3. Deployment Optimization
- Use blue-green deployment
- Implement rolling updates
- Cache Docker images
- Use CDN for static assets

## 🎯 Next Steps

1. **Set up GitHub repository**
2. **Configure GitHub Secrets**
3. **Set up staging server**
4. **Set up production server**
5. **Configure Slack notifications**
6. **Set up Codecov**
7. **Set up Snyk**
8. **Test pipeline on feature branch**
9. **Deploy to staging**
10. **Deploy to production**

## 📞 Support

For issues with the CI/CD pipeline:
1. Check GitHub Actions logs
2. Review troubleshooting section
3. Create an issue with:
   - Workflow run link
   - Error messages
   - Steps to reproduce
   - Environment details

## 📖 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [npm Security](https://docs.npmjs.com/cli/v8/using-npm/security)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Codecov Documentation](https://docs.codecov.com/)
- [Snyk Documentation](https://docs.snyk.io/)