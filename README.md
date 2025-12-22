# Naxish.github.io

Portfolio website showcasing network engineering projects, skills, and professional profile.

## 🌐 Live Site

Visit: [https://naxish.github.io](https://naxish.github.io)

## ✨ Features

- **Responsive Design**: Mobile-first approach with responsive layouts
- **Dark Mode**: Toggle between light and dark themes with system preference detection
- **Network Topology Builder**: Interactive tool for designing network diagrams
  - Drag-and-drop device placement
  - Visual link creation
  - Interface configuration (L2/L3)
  - Subnet-based color coding
  - Import/Export functionality
  - Cisco-style config generation
- **SEO Optimized**: Comprehensive meta tags and Open Graph support
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Performance**: Optimized assets and smooth animations

## 🛠️ Technologies

- HTML5 / CSS3 / JavaScript (ES6+)
- SVG for network visualizations
- LocalStorage for theme persistence
- GitHub Pages for hosting

## 📁 Project Structure

```
docs/
├── index.html              # Main portfolio page
├── networkdesign.html      # Network topology builder
├── changelog.txt           # Version history
├── css/
│   ├── index.css          # Main styles
│   └── networkdesign.css  # Topology builder styles
└── js/
    ├── main.js            # Portfolio functionality
    └── networkdesign.js   # Topology builder logic
scripts/
└── generate_changelog.py  # Changelog generator
```

## 🚀 Development

### Local Setup

1. Clone the repository
2. Open `docs/index.html` in a browser or use a local server:
   ```bash
   python -m http.server 8000 -d docs
   ```
3. Navigate to `http://localhost:8000`

### Generating Changelog

```bash
python scripts/generate_changelog.py
```

## 🔧 Recent Improvements (v2.0)

### Code Quality
- ✅ Fixed broken link to network design tool (case-sensitive)
- ✅ Refactored JavaScript with proper documentation and constants
- ✅ Added comprehensive error handling and input validation
- ✅ Implemented XSS protection with HTML sanitization
- ✅ Extracted inline scripts to external files
- ✅ Added extensive code comments and JSDoc

### Accessibility
- ✅ Added ARIA labels to all interactive elements
- ✅ Implemented semantic HTML5 elements
- ✅ Added keyboard navigation support
- ✅ Enhanced focus states for better visibility
- ✅ Screen reader compatible

### SEO & Meta
- ✅ Added comprehensive meta tags
- ✅ Implemented Open Graph and Twitter Card support
- ✅ Added descriptive title and description tags
- ✅ Included theme-color meta tag

### User Experience
- ✅ Added loading states for async operations
- ✅ Improved error messages with user-friendly text
- ✅ Enhanced tooltip functionality
- ✅ Better validation feedback
- ✅ Confirmation dialogs for destructive actions

## 📝 License

© 2025 Naxish. All rights reserved.

## 🤝 Connect

- [TryHackMe](https://tryhackme.com/p/Naxish)
- [HackTheBox](https://app.hackthebox.com/profile/1349393)
- [GitHub](https://github.com/Naxish-Dev)

#
