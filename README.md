# Naxish.github.io

Personal portfolio website for network engineering projects and interactive security games.

**Live site**: [Nanxish.com](https://Nanxish.com)

## What's Here

This portfolio includes a network topology builder and several browser-based games focused on networking and security concepts. Everything runs client-side with vanilla JavaScript.

### Network Topology Builder
Interactive tool for designing network diagrams with drag-and-drop devices, visual link creation, and Cisco-style configuration export. Supports L2/L3 interface configuration and subnet-based color coding.

### Games
Nine playable games covering different security and networking concepts:

- **Packet Collector** - Idle clicker with upgrades
- **Packet Runner** - Side-scrolling platformer
- **Packet Inspector** - Click reaction game
- **Phishing Hunter** - Email security trainer
- **Password Cracker** - Logic puzzle
- **Port Scanner** - Minesweeper variant
- **Crypto Exchange** - Trading simulator
- **Firewall Defense** - Tower defense
- **SQL Injection Hunter** - Pattern matching

## Tech Stack

- HTML5, CSS3, vanilla JavaScript
- Canvas API for game rendering
- SVG for network diagrams
- LocalStorage for persistence
- GitHub Pages hosting

## Project Structure

```
docs/
├── index.html                  # Main portfolio page
├── projects/                   # Utilities and tools
│   └── networkdesign.html
├── games/                      # All game files
├── css/
│   ├── projects/
│   └── games/
└── js/
    ├── games/                  # Game implementations
    ├── utils/                  # Shared helpers (storage, UI, game loops)
    └── config/                 # Constants and settings
```

## Recent Changes

**v2.1** - Major refactor and game additions
- Added 7 new games (Firewall Defense, SQL Hunter, etc.)
- Reorganized files into logical folders (projects/, games/)
- Created shared utility modules for localStorage, UI, and game loops
- Added JSDoc documentation across all JavaScript
- Centralized game configuration

**v2.0** - Code quality improvements
- Fixed network design tool compatibility
- Improved error handling and input validation
- Better accessibility with ARIA labels
- SEO optimization with meta tags

## Contact

- [TryHackMe](https://tryhackme.com/p/Naxish)
- [HackTheBox](https://app.hackthebox.com/profile/1349393)
- [GitHub](https://github.com/Naxish-Dev)
