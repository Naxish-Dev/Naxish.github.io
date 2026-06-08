# Naxish.github.io

Personal portfolio website for a Network Engineer and Security Analyst.

**Live site**: [Naxish Portfolio](https://naxish.dev)

## What's Here

Everything runs client-side with vanilla JavaScript and is hosted on GitHub Pages.

### Projects

- **CyberFeed** - Live cybersecurity & tech news dashboard. Aggregates RSS from 9 sources via a self-hosted Cloudflare Worker, with localStorage caching and auto-refresh.
- **Cyber Dashboard** - Personal security/infrastructure monitoring dashboard.
- **Network Design Tool** - Interactive network topology builder with drag-and-drop devices, visual link creation, and Cisco-style configuration export. Supports L2/L3 interface configuration and subnet-based colour coding.

### Games

Nine browser-based games covering networking and security concepts:

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
- LocalStorage for game/feed persistence
- Cloudflare Worker for server-side RSS aggregation
- GitHub Pages hosting

## Project Structure

```
docs/
├── index.html                  # Main portfolio page
├── projects/                   # Tools and dashboards
│   ├── cyberfeed.html
│   ├── cyber-dashboard.html
│   └── networkdesign.html
├── games/                      # All game files
├── css/
│   ├── index.css
│   ├── projects/
│   └── games/
└── js/
    ├── main.js
    ├── projects/               # Per-project logic (cyberfeed, cyber-dashboard, networkdesign)
    ├── games/                  # Game implementations
    ├── utils/                  # Shared helpers (storage, UI, game loops)
    └── config/                 # Constants and settings
```

## Contact

- [TryHackMe](https://tryhackme.com/p/Naxish)
- [HackTheBox](https://app.hackthebox.com/profile/1349393)
- [GitHub](https://github.com/Naxish-Dev)
