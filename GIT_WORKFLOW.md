# Git Workflow Guide

## 📋 Quick Reference

### Current Setup
- **Repository**: Naxish.github.io
- **Remote**: origin (GitHub)
- **Branches**: 
  - `main` (production - deployed to GitHub Pages)
  - `dev` (development - staging)
- **Current Version**: 2.0.0

---

## 🌿 Branch Strategy

```
main (production)
  ↑
  merge after testing
  ↑
dev (development)
  ↑
  merge PRs here
  ↑
feature/* (feature branches)
```

### Branch Descriptions

| Branch | Purpose | Protected | Auto-Deploy |
|--------|---------|-----------|-------------|
| `main` | Production code | ✅ Yes | ✅ GitHub Pages |
| `dev` | Development/staging | ⚠️ Recommended | ❌ No |
| `feature/*` | Feature development | ❌ No | ❌ No |

---

## 🚀 Common Workflows

### 1. Starting New Work

```bash
# Make sure you're on dev and up-to-date
git checkout dev
git pull origin dev

# Create a feature branch
git checkout -b feature/network-tool-enhancement

# Make your changes...
```

### 2. Committing Changes

```bash
# Check what changed
git status

# Stage files
git add docs/js/networkdesign.js
# Or stage all changes
git add .

# Commit with conventional commit message
git commit -m "feat: add export to PNG feature"

# Push to remote
git push origin feature/network-tool-enhancement
```

### 3. Creating a Pull Request

1. Push your feature branch
2. Go to GitHub repository
3. Click "Pull Request"
4. Set base branch to `dev`
5. Fill out the PR template
6. Request review

### 4. Merging to Production

```bash
# After thorough testing on dev
git checkout main
git pull origin main
git merge dev
git push origin main

# Tag the release
git tag -a v2.0.1 -m "Release version 2.0.1"
git push origin v2.0.1
```

---

## 📝 Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Formatting, missing semicolons, etc.
- **refactor**: Code restructuring
- **perf**: Performance improvement
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples

```bash
# Good commits
git commit -m "feat(topology): add drag-and-drop for devices"
git commit -m "fix(ui): correct dark mode button contrast"
git commit -m "docs: update README with new features"
git commit -m "refactor(networkdesign): extract validation into separate function"

# Skip changelog
git commit -m "chore: update dependencies -nolog"
```

---

## 🔧 Useful Git Commands

### Checking Status

```bash
# See what's changed
git status

# See commit history
git log --oneline -10

# See what changed in a file
git diff docs/index.html

# See branches
git branch -a
```

### Undoing Changes

```bash
# Discard changes in a file (before staging)
git checkout -- docs/index.html

# Unstage a file
git reset HEAD docs/index.html

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️ CAREFUL
git reset --hard HEAD~1
```

### Stashing Changes

```bash
# Save changes temporarily
git stash save "Work in progress on feature X"

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{0}
```

### Branch Management

```bash
# Create and switch to new branch
git checkout -b feature/my-feature

# Switch branches
git checkout dev

# Delete local branch
git branch -d feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature

# Rename current branch
git branch -m new-branch-name
```

### Syncing with Remote

```bash
# Fetch all remote changes
git fetch origin

# Pull and merge
git pull origin dev

# Pull and rebase (cleaner history)
git pull --rebase origin dev

# Push to remote
git push origin dev

# Force push (⚠️ use carefully)
git push --force-with-lease origin feature/my-branch
```

---

## 🔄 CI/CD Pipelines

### Automated Workflows

1. **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`)
   - Triggers: Push to `main`
   - Action: Deploys `docs/` folder to GitHub Pages
   - Status: ✅ Automated

2. **Code Quality Check** (`.github/workflows/code-quality.yml`)
   - Triggers: PR to `main` or `dev`, Push to `dev`
   - Checks:
     - HTML5 validation
     - Broken link detection
     - Python linting (for scripts)
   - Status: ✅ Automated

### Viewing CI/CD Status

- Check GitHub Actions tab in repository
- Status badge will show on PR
- Email notifications on failure

---

## 🏷️ Versioning & Releases

### Semantic Versioning (MAJOR.MINOR.PATCH)

- **MAJOR** (2.x.x) - Breaking changes
- **MINOR** (x.1.x) - New features, backward compatible
- **PATCH** (x.x.1) - Bug fixes

### Creating a Release

```bash
# Update VERSION file
echo "2.1.0" > VERSION

# Commit version bump
git add VERSION
git commit -m "chore: bump version to 2.1.0"

# Create tag
git tag -a v2.1.0 -m "Release version 2.1.0

New features:
- Added PNG export
- Improved accessibility

Bug fixes:
- Fixed dark mode toggle
"

# Push tag
git push origin v2.1.0

# Push changes
git push origin main
```

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog generated
- [ ] Version number updated
- [ ] Merged to `main`
- [ ] Tagged with version
- [ ] GitHub Release created

---

## 🛠️ Troubleshooting

### Merge Conflicts

```bash
# When you encounter a conflict
# 1. Open the conflicting file
# 2. Look for conflict markers:
#    <<<<<<< HEAD
#    your changes
#    =======
#    their changes
#    >>>>>>> branch-name

# 3. Edit to resolve
# 4. Remove conflict markers
# 5. Stage the resolved file
git add docs/index.html

# 6. Continue merge
git commit
```

### Accidentally Committed to Wrong Branch

```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Switch to correct branch
git checkout correct-branch

# Commit again
git commit -m "your message"
```

### Need to Update Commit Message

```bash
# Change last commit message
git commit --amend -m "new message"

# If already pushed
git push --force-with-lease origin branch-name
```

---

## 📊 Repository Statistics

```bash
# Count commits
git rev-list --count HEAD

# Contributors
git shortlog -sn

# Files changed in last commit
git diff-tree --no-commit-id --name-only -r HEAD

# Code frequency
git log --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10
```

---

## 🔐 Best Practices

### DO ✅
- Commit small, logical changes
- Write clear commit messages
- Pull before pushing
- Review your changes before committing
- Test locally before pushing
- Use feature branches
- Keep `main` stable

### DON'T ❌
- Commit directly to `main`
- Force push to shared branches
- Commit large binary files
- Commit sensitive data (API keys, passwords)
- Leave WIP commits in `main`
- Push untested code to `dev`

---

## 🆘 Getting Help

```bash
# Git help
git help <command>
git help commit

# Quick reference
git <command> --help

# Show git config
git config --list
```

---

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**Last Updated**: December 22, 2025  
**Version**: 2.0.0
