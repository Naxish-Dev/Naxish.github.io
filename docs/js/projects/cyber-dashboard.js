// ===== State Management =====
const state = {
    bruteForce: 0,
    portScan: 0,
    malware: 0,
    ddos: 0,
    phishing: 0,
    blocked: 0,
    activeScenario: null,
    isRunning: false
};

// Alert message templates - Multi-stage realistic attacks
const attackMessages = {
    'port-scan': [
        { stage: 1, type: 'info', msg: 'High-volume network traffic detected from 203.0.113.45' },
        { stage: 1, type: 'warning', msg: 'Possible reconnaissance: Scanning pattern detected - Slow SYN scan observed' },
        { stage: 2, type: 'warning', msg: 'Multiple ports under probing: 22/SSH, 3306/MySQL, 5432/PostgreSQL, 27017/MongoDB' },
        { stage: 2, type: 'critical', msg: 'IDS Alert ET POLICY_Nmap_Fingerprint matched - Attack Confidence: 94%' },
        { stage: 3, type: 'warning', msg: 'Service enumeration: SSH-2.0-OpenSSH_7.4 identified on 10.0.1.15:22' },
        { stage: 3, type: 'critical', msg: 'Firewall policy violated: 1,247 SYN packets blocked from 203.0.113.45 in 60 seconds' },
        { stage: 4, type: 'critical', msg: 'Attack source blocked: 203.0.113.45 added to dynamic blacklist' },
        { stage: 4, type: 'critical', msg: 'Firewall ACL updated: DROP all traffic from 203.0.113.45 for 24 hours' }
    ],
    'brute-force': [
        { stage: 1, type: 'warning', msg: 'Authentication failure for user: admin from 198.51.100.12 - SSH' },
        { stage: 1, type: 'info', msg: 'Failed login attempt - password database checked and failure logged' },
        { stage: 2, type: 'warning', msg: 'Repeated failed auth: 15 attempts in 3 minutes for user root' },
        { stage: 2, type: 'warning', msg: 'Multiple user accounts targeted: admin, root, support, nagios, shared_svc detected' },
        { stage: 3, type: 'critical', msg: 'Brute force pattern confirmed: 127 failed attempts from 198.51.100.12 (MITRE T1110.001)' },
        { stage: 3, type: 'critical', msg: 'Account lockout policy enforced: admin@corp.local - 30 minute lockout activated' },
        { stage: 4, type: 'warning', msg: 'Secondary attack detected: Attempt to reset admin password via OWA from 198.51.100.12' },
        { stage: 4, type: 'critical', msg: 'MFA required: Admin password reset request denied - MFA challenge not completed' }
    ],
    'malware': [
        { stage: 1, type: 'info', msg: 'File created: C:\\Users\\jsmith\\Downloads\\Invoice_2024.exe - Size: 2.3 MB' },
        { stage: 1, type: 'warning', msg: 'Suspicious behavior: Process execution chain detected - explorer.exe -> msiexec.exe -> cmd.exe' },
        { stage: 2, type: 'critical', msg: 'EDR Alert: File hash d4c8f1e2a3b5... matched VirusTotal signature (Trojan.Win32.Generic)' },
        { stage: 2, type: 'warning', msg: 'Process hollowing detected: legitimate svchost.exe spawned abnormal child process' },
        { stage: 3, type: 'critical', msg: 'C2 Beacon: Outbound connection to 185.220.101.45:443 (Known Emotet C2 Server)' },
        { stage: 3, type: 'critical', msg: 'Registry persistence mechanism: HKLM\\Software\\Microsoft\\Windows\\Run - Malware detected' },
        { stage: 4, type: 'critical', msg: 'Lateral movement attempt: Attacker enumerated network shares and AD users' },
        { stage: 4, type: 'critical', msg: 'EDR Response: Malicious process terminated, host isolated, memory dump captured' }
    ],
    'ddos': [
        { stage: 1, type: 'warning', msg: 'Elevated traffic: Inbound 15 Mbps (baseline: 2 Mbps) - Multiple source IPs detected' },
        { stage: 1, type: 'info', msg: 'Possible UDP flood: 8,234 packets/sec from ASN12389 (Bulletproof hoster)' },
        { stage: 2, type: 'critical', msg: 'DDoS confirmed: 247 unique source IPs flooding web server - TCP SYN flood pattern' },
        { stage: 2, type: 'critical', msg: 'Attack escalation: Inbound traffic spike to 2.1 Gbps, 89% packet loss detected' },
        { stage: 3, type: 'critical', msg: 'WAF engaged: 18,941 malicious requests blocked in 60 seconds - Rate limiting enforced' },
        { stage: 3, type: 'warning', msg: 'Mitigation: DDoS traffic scrubbed via Akamai, origin IPs protected, connection pooling enabled' },
        { stage: 4, type: 'critical', msg: 'Attack persistence: Residual traffic patterns indicate multi-vector attack (SYN + HTTP floods)' },
        { stage: 4, type: 'critical', msg: 'Threat mitigated: DDoS source IPs null-routed, web application responding normally' }
    ],
    'phishing': [
        { stage: 1, type: 'warning', msg: 'Email security alert: 847 phishing emails detected - Campaign: "PayPal Account Verification"' },
        { stage: 1, type: 'info', msg: 'Spoofed sender: paypal-security@paypa1-verify.ru (OSINT: Domain created 2 days ago)' },
        { stage: 2, type: 'critical', msg: 'User engagement: 67 employees opened email, 23 clicked malicious link' },
        { stage: 2, type: 'critical', msg: 'Credential theft: Phishing landing page detected at paypa1-verify.ru/login (HTTPS cert: Self-signed)' },
        { stage: 3, type: 'critical', msg: 'Account compromise: 8 users entered credentials on phishing site - Email & password harvested' },
        { stage: 3, type: 'critical', msg: 'Post-exploitation: Compromised account ceo@company.com used to send invoice scam emails' },
        { stage: 4, type: 'warning', msg: 'Security response: All phishing emails quarantined, malicious domain blocked, affected users contacted' },
        { stage: 4, type: 'critical', msg: 'Incident containment: Compromised accounts password-reset, MFA enforced, threat hunting initiated' }
    ]
};

const terminalMessages = {
    'port-scan': [
        '2024-04-05T14:23:18.451Z [IDS] Incoming TCP SYN segment count: 1247 across multiple ports',
        '2024-04-05T14:23:19.823Z [NETFLOW] Source: 203.0.113.45 | Destinations: 10.0.1.0/24 | Ports: 22,80,443,3306,5432,27017',
        '2024-04-05T14:23:21.105Z [SURICATA] ET POLICY Protocol Command Decode matched - Likely Nmap -sV scan',
        '2024-04-05T14:23:23.456Z [FIREWALL] [DROP] src=203.0.113.45 dst=10.0.1.15 dpt=22 TOS=0x0 PREC=0x0 TTL=51 DFLEN=0',
        '2024-04-05T14:23:24.789Z [FAIL2BAN] Ban IP: 203.0.113.45 after 15 attempts within 60 seconds',
        '2024-04-05T14:23:25.234Z [FIREWALL] Rule "Reconnaissance Prevention" activated - 2048 packets dropped'
    ],
    'brute-force': [
        '2024-04-05T14:24:01.234Z [SSHD] Invalid user admin from 198.51.100.12 port 54321',
        '2024-04-05T14:24:02.567Z [PAM] User (root) from 198.51.100.12 - 5 authentication failures',
        '2024-04-05T14:24:04.891Z [AUTH] Authentication failure; user=support uid=1003 ruid=1003 (127 attempts detected)',
        '2024-04-05T14:24:07.012Z [ACCOUNTLOCK] admin account locked after 30 failed login attempts - TTL: 30 minutes',
        '2024-04-05T14:24:08.234Z [OWA] Attempted password reset from 198.51.100.12 blocked - MFA not satisfied',
        '2024-04-05T14:24:10.456Z [SECURITY] Brute force attack detected and blocked - Source IP added to fail2ban'
    ],
    'malware': [
        '2024-04-05T14:25:12.123Z [WINDOWS] File Created: C:\\Users\\jsmith\\Downloads\\Invoice_2024.exe MD5:d4c8f1e2a3b5c6d7',
        '2024-04-05T14:25:13.234Z [EDR] Suspicious execution chain: explorer.exe (PID:4521) -> msiexec.exe -> cmd.exe /c powershell',
        '2024-04-05T14:25:14.567Z [YARA] Malware signature matched - Trojan.Win32.Generic.A (VirusTotal: 47/71 engines detect)',
        '2024-04-05T14:25:16.891Z [MEMORY] Process hollowing detected: svchost.exe (PID:892) contains injected shellcode',
        '2024-04-05T14:25:18.012Z [NETWORK] C2 Beacon: cmd.exe (PID:3421) -> 185.220.101.45:443 (TLS/1.2) - Known Emotet server',
        '2024-04-05T14:25:20.234Z [REGISTRY] Persistence: HKLM\\System\\CurrentControlSet\\Services\\WpnService\\ImagePath modified'
    ],
    'ddos': [
        '2024-04-05T14:26:11.111Z [TRAFFIC] Inbound bandwidth spike: 15 Mbps -> 247 Mbps (12x increase) | Baseline: 2 Mbps',
        '2024-04-05T14:26:12.222Z [NETDATA] UDP Flood detected: 8,234 packets/sec from ASN12389 (Bulletproof hoster)',
        '2024-04-05T14:26:13.333Z [WAF] DDoS Attack detected: 89% packet loss, 247 unique source IPs, TCP SYN flood',
        '2024-04-05T14:26:15.444Z [CHECKPOINT] Attack escalation: Traffic increased to 2.1 Gbps - Multi-vector confirmed (SYN + DNS)',
        '2024-04-05T14:26:17.555Z [AKAMAI] DDoS scrubbing engaged: 18,941 malicious requests/sec blocked',
        '2024-04-05T14:26:20.666Z [MITIGATION] Origin servers moved to scrubbing center, connection pooling enabled'
    ],
    'phishing': [
        '2024-04-05T14:27:05.111Z [EMAIL-GATEWAY] Campaign detected: 847 messages from paypal-security@paypa1-verify.ru blocked',
        '2024-04-05T14:27:06.222Z [WHOIS] Domain paypa1-verify.ru registered 2 days ago - Registrant: Privacy Protected',
        '2024-04-05T14:27:08.333Z [SIEM] User engagement detected: 67 opens, 23 clicks on malicious link',
        '2024-04-05T14:27:10.444Z [URLHAUS] Phishing URL detected: paypa1-verify.ru/login (Certificate: Self-signed, expires 2025-04-05)',
        '2024-04-05T14:27:12.555Z [OSINT] 8 users submitted credentials to phishing site - Password change recommended',
        '2024-04-05T14:27:15.666Z [THREAT] Compromised account ceo@company.com used to send 34 invoice fraud emails'
    ]
};

// ===== Utility Functions =====
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString();
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animateCounter(elementId, targetValue, duration = 800) {
    const element = document.getElementById(elementId);
    const start = parseInt(element.textContent) || 0;
    const increment = (targetValue - start) / (duration / 50);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 50);
}

function updateThreatBar(barId, value, maxValue = 100) {
    const bar = document.getElementById(barId);
    const percentage = Math.min((value / maxValue) * 100, 100);
    bar.style.width = percentage + '%';
}

// ===== Alert System =====
function addAlert(message, type = 'info') {
    const alertFeed = document.getElementById('alertFeed');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <span class="alert-time">[${getCurrentTime()}]</span>
        <div class="alert-message">${message}</div>
    `;
    alertFeed.insertBefore(alertDiv, alertFeed.firstChild);

    // Keep only last 20 alerts
    while (alertFeed.children.length > 20) {
        alertFeed.removeChild(alertFeed.lastChild);
    }
}

function addTerminalLine(message, type = 'normal') {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    if (type === 'normal') {
        line.className += ' terminal-prompt';
    }
    line.textContent = message;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;

    // Keep only last 30 lines
    while (terminal.children.length > 30) {
        terminal.removeChild(terminal.firstChild);
    }
}

// ===== Scenario Logic - Multi-Stage Realistic Attacks =====
function getMessagesByStage(scenario, stage) {
    return attackMessages[scenario].filter(m => m.stage === stage);
}

function getTerminalByStage(scenario, stage) {
    const allMsgs = terminalMessages[scenario];
    const stageSize = Math.ceil(allMsgs.length / 4);
    return allMsgs.slice((stage - 1) * stageSize, stage * stageSize);
}

function runPortScanScenario() {
    if (state.isRunning) return;
    state.isRunning = true;

    let stage = 1;
    let stageCounter = 0;
    const stageInterval = setInterval(() => {
        stageCounter++;

        // Stage progression: 4 stages, each ~3-4 seconds
        if (stage <= 4) {
            // Increment threat counter gradually
            state.portScan += getRandomInt(80, 200);
            animateCounter('portScanCount', state.portScan);
            updateThreatBar('portScanFill', state.portScan, 500);

            // Add alerts for this stage
            const stageAlerts = getMessagesByStage('port-scan', stage);
            if (stageAlerts.length > 0) {
                const msg = stageAlerts[getRandomInt(0, stageAlerts.length - 1)];
                addAlert(msg.msg, msg.type);
            }

            // Add terminal logs
            const termLogs = getTerminalByStage('port-scan', stage);
            if (termLogs.length > 0) {
                const log = termLogs[getRandomInt(0, termLogs.length - 1)];
                addTerminalLine(log);
            }

            // Move to next stage
            if (stageCounter >= 2) {
                stage++;
                stageCounter = 0;
            }
        } else {
            // Attack complete - mitigation
            clearInterval(stageInterval);
            state.blocked += state.portScan;
            animateCounter('blockedCount', state.blocked);
            updateThreatBar('blockedFill', state.blocked, 500);
            addAlert('Threat mitigated: Firewall blocked attacker IP 203.0.113.45', 'critical');
            addTerminalLine('2024-04-05T14:23:26.012Z [MITIGATION] Threat neutralized - Source IP blacklisted for 24 hours');
            state.isRunning = false;
        }
    }, 2000);
}

function runBruteForceScenario() {
    if (state.isRunning) return;
    state.isRunning = true;

    let stage = 1;
    let stageCounter = 0;
    const stageInterval = setInterval(() => {
        stageCounter++;

        if (stage <= 4) {
            state.bruteForce += getRandomInt(20, 40);
            animateCounter('bruteForceCount', state.bruteForce);
            updateThreatBar('bruteForceFill', state.bruteForce, 500);

            const stageAlerts = getMessagesByStage('brute-force', stage);
            if (stageAlerts.length > 0) {
                const msg = stageAlerts[getRandomInt(0, stageAlerts.length - 1)];
                addAlert(msg.msg, msg.type);
            }

            const termLogs = getTerminalByStage('brute-force', stage);
            if (termLogs.length > 0) {
                const log = termLogs[getRandomInt(0, termLogs.length - 1)];
                addTerminalLine(log);
            }

            if (stageCounter >= 2) {
                stage++;
                stageCounter = 0;
            }
        } else {
            clearInterval(stageInterval);
            state.blocked += Math.floor(state.bruteForce / 2);
            animateCounter('blockedCount', state.blocked);
            updateThreatBar('blockedFill', state.blocked, 500);
            addAlert('Threat mitigated: Account lockout activated + MFA enforcement deployed', 'critical');
            addTerminalLine('2024-04-05T14:24:11.234Z [SECURITY] Incident response completed - Admin credentials reset');
            state.isRunning = false;
        }
    }, 2000);
}

function runMalwareScenario() {
    if (state.isRunning) return;
    state.isRunning = true;

    let stage = 1;
    let stageCounter = 0;
    const stageInterval = setInterval(() => {
        stageCounter++;

        if (stage <= 4) {
            state.malware += getRandomInt(2, 6);
            animateCounter('malwareCount', state.malware);
            updateThreatBar('malwareFill', state.malware, 100);

            const stageAlerts = getMessagesByStage('malware', stage);
            if (stageAlerts.length > 0) {
                const msg = stageAlerts[getRandomInt(0, stageAlerts.length - 1)];
                addAlert(msg.msg, msg.type);
            }

            const termLogs = getTerminalByStage('malware', stage);
            if (termLogs.length > 0) {
                const log = termLogs[getRandomInt(0, termLogs.length - 1)];
                addTerminalLine(log);
            }

            if (stageCounter >= 2) {
                stage++;
                stageCounter = 0;
            }
        } else {
            clearInterval(stageInterval);
            state.blocked += state.malware * 5;
            animateCounter('blockedCount', state.blocked);
            updateThreatBar('blockedFill', state.blocked, 500);
            addAlert('Threat mitigated: Malicious process terminated - Host isolated from network', 'critical');
            addTerminalLine('2024-04-05T14:25:21.234Z [INCIDENT] Host remediation: Full malware cleanup completed, memory forensics preserved');
            state.isRunning = false;
        }
    }, 2000);
}

function runDDoSScenario() {
    if (state.isRunning) return;
    state.isRunning = true;

    let stage = 1;
    let stageCounter = 0;
    const stageInterval = setInterval(() => {
        stageCounter++;

        if (stage <= 4) {
            state.ddos += getRandomInt(3000, 8000);
            animateCounter('ddosCount', state.ddos);
            updateThreatBar('ddosFill', state.ddos, 50000);

            const stageAlerts = getMessagesByStage('ddos', stage);
            if (stageAlerts.length > 0) {
                const msg = stageAlerts[getRandomInt(0, stageAlerts.length - 1)];
                addAlert(msg.msg, msg.type);
            }

            const termLogs = getTerminalByStage('ddos', stage);
            if (termLogs.length > 0) {
                const log = termLogs[getRandomInt(0, termLogs.length - 1)];
                addTerminalLine(log);
            }

            if (stageCounter >= 2) {
                stage++;
                stageCounter = 0;
            }
        } else {
            clearInterval(stageInterval);
            state.blocked += 25000;
            animateCounter('blockedCount', state.blocked);
            updateThreatBar('blockedFill', state.blocked, 50000);
            addAlert('Threat mitigated: DDoS attack neutralized - Web services restored to normal operation', 'critical');
            addTerminalLine('2024-04-05T14:26:21.234Z [TRAFFIC] Network baseline restored - 99.9% availability confirmed');
            state.isRunning = false;
        }
    }, 2000);
}

function runPhishingScenario() {
    if (state.isRunning) return;
    state.isRunning = true;

    let stage = 1;
    let stageCounter = 0;
    const stageInterval = setInterval(() => {
        stageCounter++;

        if (stage <= 4) {
            state.phishing += getRandomInt(10, 25);
            animateCounter('phishingCount', state.phishing);
            updateThreatBar('phishingFill', state.phishing, 100);

            const stageAlerts = getMessagesByStage('phishing', stage);
            if (stageAlerts.length > 0) {
                const msg = stageAlerts[getRandomInt(0, stageAlerts.length - 1)];
                addAlert(msg.msg, msg.type);
            }

            const termLogs = getTerminalByStage('phishing', stage);
            if (termLogs.length > 0) {
                const log = termLogs[getRandomInt(0, termLogs.length - 1)];
                addTerminalLine(log);
            }

            if (stageCounter >= 2) {
                stage++;
                stageCounter = 0;
            }
        } else {
            clearInterval(stageInterval);
            state.blocked += state.phishing * 3;
            animateCounter('blockedCount', state.blocked);
            updateThreatBar('blockedFill', state.blocked, 500);
            addAlert('Threat mitigated: Phishing campaign blocked - Affected users notified and remediated', 'critical');
            addTerminalLine('2024-04-05T14:27:16.234Z [INCIDENT] Post-incident: Password changes mandatory, security training scheduled, C-suite briefed');
            state.isRunning = false;
        }
    }, 2000);
}

// ===== Event Listeners =====
document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const scenario = this.dataset.scenario;

        // Update button states
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Run scenario
        switch(scenario) {
            case 'port-scan':
                runPortScanScenario();
                break;
            case 'brute-force':
                runBruteForceScenario();
                break;
            case 'malware':
                runMalwareScenario();
                break;
            case 'ddos':
                runDDoSScenario();
                break;
            case 'phishing':
                runPhishingScenario();
                break;
        }
    });
});

// ===== Background Ambient Events =====
function generateRandomAlert() {
    const types = ['warning', 'info', 'critical'];
    const randomMessages = [
        'Network traffic anomaly detected from subnet 192.168.1.0/24',
        'Suspicious DNS query: pastebin-exfil.ru blocked',
        'SSL certificate validation failed for internal.corp',
        'Routine system audit completed - No issues found',
        'Security patch deployed to 127 endpoints',
        'VPN connection from 101.50.30.20 - New location detected',
        'Backup verification completed - 15.4TB validated'
    ];
    const msg = randomMessages[getRandomInt(0, randomMessages.length - 1)];
    const type = types[getRandomInt(0, types.length - 1)];
    addAlert(msg, type);
}

// Generate random alerts every 8-15 seconds
setInterval(() => {
    if (!state.isRunning) {
        generateRandomAlert();
    }
}, getRandomInt(8000, 15000));

// Initial alerts
setTimeout(() => {
    addAlert('System initialized - Monitoring active', 'info');
    addTerminalLine('Sentinel Engine v4.2.1 loaded');
    addTerminalLine('Threat database updated: 2,847,391 signatures');
}, 500);
