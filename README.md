# Naxish.github.io

Portfolio website showcasing network engineering projects, skills, and professional profile.

## 🌐 Live Site

Visit: [https://naxish.github.io](https://naxish.github.io)  
*(Note: Enable GitHub Pages in repository settings under Settings → Pages → Deploy from branch → main → /docs)*

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
- **Interactive Games Portfolio**: 9 network security-themed games
  - **Packet Collector**: Idle/clicker game with upgrades and automation
  - **Packet Runner**: Endless side-scrolling jump game with physics
  - **Packet Inspector**: Fast-paced malicious packet identification
  - **Phishing Hunter**: Educational email security awareness game
  - **Password Cracker**: Logic puzzle with difficulty levels
  - **Port Scanner**: Minesweeper-style network security game
  - **Crypto Exchange**: Trading and mining simulation
  - **Firewall Defense**: Tower defense against cyber attacks
  - **SQL Injection Hunter**: Pattern recognition for SQL security
- **SEO Optimized**: Comprehensive meta tags and Open Graph support
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Performance**: Optimized assets and smooth animations

## 🛠️ Technologies

- HTML5 / CSS3 / JavaScript (ES6+)
- Canvas API for game rendering
- SVG for network visualizations
- LocalStorage for game state persistence
- Modular architecture with shared utilities
- GitHub Pages for hosting

## 📁 Project Structure

```
docs/
├── index.html                  # Main portfolio page
├── projects/                   # Project tools & utilities
│   ├── networkdesign.html      # Network topology builder
│   └── NetworkDesign-Test.html # Test version
├── games/                      # Interactive games
│   ├── firewall.html           # Firewall Defense game
│   ├── sqlhunter.html          # SQL Injection Hunter game
│   ├── cryptoexchange.html     # Crypto Exchange game
│   ├── packetgame.html         # Packet Collector game
│   ├── jumper.html             # Packet Runner game
│   ├── packetinspector.html    # Packet Inspector game
│   ├── phishing.html           # Phishing Hunter game
│   ├── passwordcracker.html    # Password Cracker game
│   └── portscanner.html        # Port Scanner game
├── changelog.txt               # Version history
├── css/
│   ├── index.css              # Main portfolio styles
│   ├── projects/              # Project-specific styles
│   │   └── networkdesign.css
│   └── games/                 # Game-specific styles
│       ├── firewall.css
│       ├── sqlhunter.css
│       ├── cryptoexchange.css
│       ├── packetgame.css
│       ├── jumper.css
│       ├── packetinspector.css
│       ├── phishing.css
│       ├── passwordcracker.css
│       └── portscanner.css
└── js/
    ├── main.js                # Portfolio functionality
    ├── networkdesign.js       # Topology builder logic
    ├── games/                 # Game implementations
    │   ├── firewall.js
    │   ├── sqlhunter.js
    │   ├── cryptoexchange.js
    │   ├── packetgame.js
    │   ├── jumper.js
    │   ├── packetinspector.js
    │   ├── phishing.js
    │   ├── passwordcracker.js
    │   └── portscanner.js
    ├── utils/                 # Shared utilities
    │   ├── storage.js         # localStorage helpers
    │   ├── ui.js              # UI utilities & formatting
    │   └── gameloop.js        # Game loop management
    └── config/                # Configuration
        └── constants.js       # Game constants
scripts/
└── generate_changelog.py      # Changelog generator
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
- ✅ Modular architecture with shared utilities (DRY principle)
- ✅ Organized file structure (games/, utils/, config/)
- ✅ Comprehensive JSDoc documentation across all files
- ✅ Shared localStorage and UI utilities
- ✅ Centralized game configuration constants
- ✅ Proper resource cleanup with managed intervals/listeners

### Games Added
- 🎮 Firewall Defense (Tower Defense)
- 🎮 SQL Injection Hunter (Pattern Recognition)
- 🎮 7 Additional network security-themed games
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
