# Contributing to Naxish Portfolio

Thank you for considering contributing to this project!

## Branch Strategy

- **`main`** - Production branch (deployed to GitHub Pages)
- **`dev`** - Development branch (for testing and staging)
- **Feature branches** - For specific features or fixes

## Development Workflow

### 1. Clone and Setup

```bash
git clone https://github.com/Naxish-Dev/Naxish.github.io.git
cd Naxish.github.io
```

### 2. Create a Feature Branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Edit files in the `docs/` directory
- Test locally by opening `docs/index.html` or running a local server:
  ```bash
  python -m http.server 8000 -d docs
  ```
- Run the changelog generator if needed:
  ```bash
  python scripts/generate_changelog.py
  ```

### 4. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git add .
git commit -m "feat: add new feature description"
```

#### Commit Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

#### Skip Changelog
Add `-nolog` to commits you don't want in the changelog:
```bash
git commit -m "chore: update dependencies -nolog"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request to the `dev` branch on GitHub.

## Code Quality Standards

### HTML
- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Validate with HTML5 validator

### CSS
- Follow BEM naming convention where applicable
- Maintain consistent indentation (2 spaces)
- Include dark mode support

### JavaScript
- Use ES6+ features
- Add JSDoc comments for functions
- Include error handling (try-catch)
- Sanitize all user inputs
- Follow the existing code structure

### Python (Scripts)
- Follow PEP 8 style guide
- Add docstrings to functions
- Use type hints where applicable

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Code runs without errors
- [ ] All links work correctly
- [ ] Dark mode works properly
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility tested (keyboard navigation, screen reader)
- [ ] No console errors
- [ ] Changelog updated (if applicable)

## Pull Request Process

1. Update README.md if needed
2. Update IMPROVEMENTS.md for significant changes
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address any feedback
6. Squash commits if requested
7. Merge to `dev` first, then to `main` after testing

## Versioning

This project uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes

Current version: **2.0.0**

## Release Process

1. All changes merge to `dev` first
2. Test thoroughly on `dev` branch
3. Update version numbers
4. Create PR from `dev` to `main`
5. After merge, tag the release:
   ```bash
   git tag -a v2.0.0 -m "Release version 2.0.0"
   git push origin v2.0.0
   ```

## Questions?

Open an issue for any questions or concerns.

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Help others learn and grow
- Follow professional standards

---

Thank you for contributing! 🎉
