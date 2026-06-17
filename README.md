# Naxish.github.io

Personal portfolio website for a Network Engineer and Security Analyst.

**Live site**: [naxish.dev](https://naxish.dev)

## What's Here

Everything runs client-side with vanilla JavaScript and is hosted on GitHub Pages.

### Projects

- **[Interactive Network Designer](https://naxish.dev/nettools)** — Five-tab networking toolkit: live Subnet Calculator, VLSM Planner (auto & manual), Binary Visualizer, Packet Flow Simulator (ARP / routing / NAT / Packet Journey), and a gamified Subnet Challenge mode with difficulty levels and a timer.
- **[CyberFeed](https://naxish.dev/cyberfeed)** — Live cybersecurity & tech news dashboard. Aggregates RSS from 9 sources via a self-hosted Cloudflare Worker, with localStorage caching, auto-refresh, and a read-later list.
- **[SOC Dashboard Simulator](https://naxish.dev/cyber-dashboard)** — Interactive threat monitoring platform with 5 multi-stage attack scenarios, realistic alert streams, terminal logs, and live threat counters.
- **[Network Design Tool](https://naxish.dev/networkdesign)** *(WIP)* — Interactive network topology builder with drag-and-drop devices, visual link creation, and Cisco-style configuration export.
- **[Packet Journey](https://naxish.dev/packetjourney)** *(WIP)* — Step-through TCP/IP packet traversal simulator with a Wireshark-style header view. Now also available as a scenario inside Interactive Network Designer.

### Games

Nine browser-based games covering networking and security concepts:

| Game | URL | Description |
|---|---|---|
| Packet Collector | [/packetgame](https://naxish.dev/packetgame) | Idle clicker with upgrades and achievements |
| Packet Runner | [/jumper](https://naxish.dev/jumper) | Side-scrolling endless platformer |
| Packet Inspector | [/packetinspector](https://naxish.dev/packetinspector) | Click reaction — block malicious packets |
| Phishing Hunter | [/phishing](https://naxish.dev/phishing) | Spot phishing emails and fake sites |
| Password Cracker | [/passwordcracker](https://naxish.dev/passwordcracker) | Logic puzzles across difficulty levels |
| Port Scanner | [/portscanner](https://naxish.dev/portscanner) | Minesweeper variant on network grids |
| Crypto Exchange | [/cryptoexchange](https://naxish.dev/cryptoexchange) | Trade crypto and build a mining empire |
| Firewall Defense | [/firewall](https://naxish.dev/firewall) | Tower defense against cyber attack waves |
| SQL Injection Hunter | [/sqlhunter](https://naxish.dev/sqlhunter) | Identify and block SQL injection attacks |

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
├── nettools/                   # Interactive Network Designer (naxish.dev/nettools)
├── cyberfeed/                  # CyberFeed dashboard (naxish.dev/cyberfeed)
├── cyber-dashboard/            # SOC Dashboard Simulator
├── networkdesign/              # Network topology builder
├── packetjourney/              # Packet Journey simulator
├── packetgame/                 # + one folder per game
├── ...
├── css/
│   ├── index.css
│   ├── projects/               # Per-project stylesheets
│   └── games/                  # Per-game stylesheets
└── js/
    ├── main.js
    ├── projects/               # Per-project logic
    ├── games/                  # Game implementations
    ├── utils/                  # Shared helpers (storage, UI, game loops)
    └── config/                 # Constants and settings
```

Each page lives at `docs/<name>/index.html`, served as `naxish.dev/<name>` — no `.html` extensions in URLs.

## Contact

- [TryHackMe](https://tryhackme.com/p/Naxish)
- [HackTheBox](https://app.hackthebox.com/profile/1349393)
- [GitHub](https://github.com/Naxish-Dev)
