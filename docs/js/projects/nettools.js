/**
 * NetTools — Interactive Network Designer & Learning Suite
 * Subnet Calculator | VLSM Planner | Binary Visualizer | Packet Flow | Challenge
 *
 * @author Naxish
 * @version 1.0
 */

// ===== CORE IP / SUBNET FUNCTIONS =====

function ipToNum(str) {
  if (!str) return null;
  const parts = str.trim().split('.');
  if (parts.length !== 4) return null;
  const bytes = parts.map(Number);
  if (bytes.some(b => isNaN(b) || !Number.isInteger(b) || b < 0 || b > 255)) return null;
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function numToIp(n) {
  n = n >>> 0;
  return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join('.');
}

function cidrToMask(cidr) {
  if (cidr === 0)  return 0;
  if (cidr === 32) return 0xFFFFFFFF >>> 0;
  return (0xFFFFFFFF << (32 - cidr)) >>> 0;
}

function maskToCidr(mask) {
  let m = mask >>> 0;
  let cidr = 0;
  while (m & 0x80000000) { cidr++; m = (m << 1) >>> 0; }
  return m !== 0 ? null : cidr; // null = invalid (non-contiguous)
}

function calcSubnet(ipStr, cidr) {
  const ip = ipToNum(ipStr);
  if (ip === null || cidr < 0 || cidr > 32) return null;
  const mask      = cidrToMask(cidr);
  const network   = (ip & mask) >>> 0;
  const wildcard  = (~mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalIPs  = Math.pow(2, 32 - cidr);
  const usableHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : totalIPs - 2;
  const firstHost   = cidr >= 31 ? network   : network + 1;
  const lastHost    = cidr >= 31 ? broadcast : broadcast - 1;
  const firstOctet  = (ip >>> 24) & 0xFF;
  const ipClass     = firstOctet < 128 ? 'A' : firstOctet < 192 ? 'B' : firstOctet < 224 ? 'C' : firstOctet < 240 ? 'D (Multicast)' : 'E (Reserved)';
  return { ip, mask, network, broadcast, wildcard, cidr, totalIPs, usableHosts, firstHost, lastHost, ipClass };
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ===== TAB MANAGEMENT =====

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    const panel = document.getElementById('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

// ===== TAB 1: SUBNET CALCULATOR =====

const scIp        = document.getElementById('sc-ip');
const scCidrRange = document.getElementById('sc-cidr-range');
const scCidrNum   = document.getElementById('sc-cidr-num');
const scCidrDisp  = document.getElementById('sc-cidr-disp');
const scMask      = document.getElementById('sc-mask');
const scResults   = document.getElementById('sc-results');
const scClassBadge= document.getElementById('sc-class-badge');

function renderSubnetResults(data) {
  if (!data) {
    scResults.innerHTML = `<div class="error-msg mono">⚠ Invalid input. Check IP address and CIDR.</div>`;
    scClassBadge.textContent = '';
    return;
  }
  scClassBadge.textContent = `CLASS ${escHtml(data.ipClass)}`;

  const rows = [
    ['Network Address',   numToIp(data.network)],
    ['Broadcast Address', numToIp(data.broadcast)],
    ['First Usable Host', numToIp(data.firstHost)],
    ['Last Usable Host',  numToIp(data.lastHost)],
    ['Usable Hosts',      data.usableHosts.toLocaleString()],
    ['Total Addresses',   data.totalIPs.toLocaleString()],
    ['Subnet Mask',       numToIp(data.mask)],
    ['Wildcard Mask',     numToIp(data.wildcard)],
    ['CIDR Notation',     `/${data.cidr}`],
  ];
  scResults.innerHTML = `<dl class="result-grid">
    ${rows.map(([k,v]) => `<dt class="mono">${escHtml(k)}</dt><dd class="mono">${escHtml(v)}</dd>`).join('')}
  </dl>`;
}

function runSubnetCalc(source) {
  let cidr;
  if (source === 'mask') {
    const maskNum = ipToNum(scMask.value);
    if (maskNum === null) { renderSubnetResults(null); return; }
    const c = maskToCidr(maskNum);
    if (c === null) { renderSubnetResults(null); return; }
    cidr = c;
    scCidrRange.value = cidr; scCidrNum.value = cidr; scCidrDisp.textContent = cidr;
  } else {
    cidr = parseInt(scCidrRange.value, 10);
    scMask.value = numToIp(cidrToMask(cidr));
    scCidrDisp.textContent = cidr;
  }
  renderSubnetResults(calcSubnet(scIp.value, cidr));
}

scIp.addEventListener('input', () => runSubnetCalc('ip'));
scCidrRange.addEventListener('input', () => { scCidrNum.value = scCidrRange.value; runSubnetCalc('cidr'); });
scCidrNum.addEventListener('input', () => {
  const v = Math.min(32, Math.max(0, parseInt(scCidrNum.value, 10) || 0));
  scCidrNum.value = v; scCidrRange.value = v;
  runSubnetCalc('cidr');
});
scMask.addEventListener('input', () => runSubnetCalc('mask'));

// ===== TAB 2: VLSM PLANNER =====

const vlsmIp       = document.getElementById('vlsm-ip');
const vlsmCidr     = document.getElementById('vlsm-cidr');
const vlsmMode     = document.getElementById('vlsm-mode');
const vlsmAddBtn   = document.getElementById('vlsm-add-btn');
const vlsmCalcBtn  = document.getElementById('vlsm-calc-btn');
const vlsmResetBtn = document.getElementById('vlsm-reset-btn');
const vlsmDeptList = document.getElementById('vlsm-dept-list');
const vlsmResults  = document.getElementById('vlsm-results');
const vlsmCidrHdr  = document.querySelector('.vlsm-cidr-hdr');

let vlsmIdCounter = 0;

function addVLSMRow(name = '', hosts = '', cidr = '') {
  vlsmIdCounter++;
  const row = document.createElement('div');
  row.className = 'vlsm-dept-row';
  const isManual = vlsmMode.value === 'manual';
  row.innerHTML = `
    <input class="field-input mono" type="text"   placeholder="Department ${vlsmIdCounter}" value="${escHtml(name)}"          data-role="name" />
    <input class="field-input mono" type="number" placeholder="e.g. 50"                     value="${escHtml(String(hosts))}" data-role="hosts" min="1" max="65534" />
    <input class="field-input mono cidr-num"      type="number" placeholder="CIDR"          value="${escHtml(String(cidr))}"  data-role="cidr"  min="1" max="30"    style="visibility:${isManual ? 'visible' : 'hidden'}" />
    <button class="remove-btn mono" title="Remove row">✕</button>
  `;
  row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
  vlsmDeptList.appendChild(row);
}

vlsmAddBtn.addEventListener('click', () => addVLSMRow());

vlsmMode.addEventListener('change', () => {
  const isManual = vlsmMode.value === 'manual';
  vlsmCidrHdr.style.visibility = isManual ? 'visible' : 'hidden';
  vlsmDeptList.querySelectorAll('[data-role="cidr"]').forEach(el => {
    el.style.visibility = isManual ? 'visible' : 'hidden';
  });
});

vlsmResetBtn.addEventListener('click', () => {
  vlsmDeptList.innerHTML = '';
  vlsmResults.hidden = true;
  vlsmResults.innerHTML = '';
  vlsmIdCounter = 0;
  addVLSMRow('HQ Office', 100);
  addVLSMRow('Branch A', 50);
  addVLSMRow('Branch B', 25);
  addVLSMRow('Management', 10);
});

vlsmCalcBtn.addEventListener('click', runVLSM);

function runVLSM() {
  const baseIpNum = ipToNum(vlsmIp.value);
  const baseCidr  = parseInt(vlsmCidr.value, 10);
  if (baseIpNum === null || isNaN(baseCidr) || baseCidr < 1 || baseCidr > 30) {
    vlsmResults.hidden = false;
    vlsmResults.innerHTML = `<div class="error-msg mono">⚠ Invalid base network.</div>`;
    return;
  }
  const rows = [...vlsmDeptList.querySelectorAll('.vlsm-dept-row')];
  if (rows.length === 0) {
    vlsmResults.hidden = false;
    vlsmResults.innerHTML = `<div class="error-msg mono">⚠ Add at least one department.</div>`;
    return;
  }
  const depts = rows.map(row => ({
    name:       row.querySelector('[data-role="name"]').value.trim() || 'Unnamed',
    hosts:      parseInt(row.querySelector('[data-role="hosts"]').value, 10) || 0,
    manualCidr: parseInt(row.querySelector('[data-role="cidr"]').value, 10) || null,
  }));
  if (depts.some(d => d.hosts < 1)) {
    vlsmResults.hidden = false;
    vlsmResults.innerHTML = `<div class="error-msg mono">⚠ All departments must need at least 1 host.</div>`;
    return;
  }

  const isManual = vlsmMode.value === 'manual';
  const sorted   = isManual ? [...depts] : [...depts].sort((a, b) => b.hosts - a.hosts);

  const baseMask = cidrToMask(baseCidr);
  const baseNet  = (baseIpNum & baseMask) >>> 0;
  const baseEnd  = (baseNet | (~baseMask >>> 0)) >>> 0;

  let currentAddr = baseNet;
  const results = [];
  let error = null;

  for (const dept of sorted) {
    // Determine CIDR to use
    let cidr;
    if (isManual && dept.manualCidr) {
      cidr = dept.manualCidr;
    } else {
      cidr = 32;
      while (cidr > 0) {
        const h = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr) - 2;
        if (h >= dept.hosts) break;
        cidr--;
      }
      if (cidr === 0) { error = `No CIDR large enough for "${dept.name}" (${dept.hosts} hosts).`; break; }
    }

    // Align currentAddr to subnet boundary
    const subnetSize = Math.pow(2, 32 - cidr);
    const rem        = currentAddr % subnetSize;
    const aligned    = rem === 0 ? currentAddr : currentAddr + subnetSize - rem;

    if (aligned + subnetSize - 1 > baseEnd) {
      error = `Address space exhausted allocating subnet for "${dept.name}".`;
      break;
    }

    const mask      = cidrToMask(cidr);
    const network   = aligned >>> 0;
    const broadcast = (network + subnetSize - 1) >>> 0;
    const usable    = cidr >= 31 ? (cidr === 31 ? 2 : 1) : subnetSize - 2;

    results.push({
      name: dept.name, required: dept.hosts,
      network: numToIp(network), cidr, mask: numToIp(mask),
      broadcast: numToIp(broadcast), usable,
      waste: usable - dept.hosts,
      efficiency: ((dept.hosts / usable) * 100).toFixed(1),
    });
    currentAddr = broadcast + 1;
  }

  if (error) {
    vlsmResults.hidden = false;
    vlsmResults.innerHTML = `<div class="error-msg mono">⚠ ${escHtml(error)}</div>`;
    return;
  }

  const totalAvail = Math.pow(2, 32 - baseCidr);
  const totalUsed  = currentAddr - baseNet;
  const utilPct    = ((totalUsed / totalAvail) * 100).toFixed(1);

  vlsmResults.hidden = false;
  vlsmResults.innerHTML = `
    <div class="vlsm-util-bar">
      <div class="util-label mono">ADDRESS SPACE: ${escHtml(numToIp(baseNet))}/${baseCidr} — UTILIZATION: ${utilPct}%</div>
      <div class="util-track"><div class="util-fill" style="width:${Math.min(100, utilPct)}%"></div></div>
    </div>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          <th class="mono">Department</th><th class="mono">Required</th><th class="mono">Network</th>
          <th class="mono">CIDR</th><th class="mono">Mask</th><th class="mono">Broadcast</th>
          <th class="mono">Usable</th><th class="mono">Waste</th><th class="mono">Efficiency</th>
        </tr></thead>
        <tbody>
          ${results.map(r => `<tr>
            <td class="mono">${escHtml(r.name)}</td>
            <td class="mono">${r.required}</td>
            <td class="mono accent">${escHtml(r.network)}</td>
            <td class="mono">/${r.cidr}</td>
            <td class="mono">${escHtml(r.mask)}</td>
            <td class="mono">${escHtml(r.broadcast)}</td>
            <td class="mono">${r.usable}</td>
            <td class="mono ${r.waste > r.required ? 'warn' : ''}">${r.waste}</td>
            <td class="mono ${r.efficiency >= 75 ? 'good' : r.efficiency >= 40 ? 'ok' : 'warn'}">${r.efficiency}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ===== TAB 3: BINARY VISUALIZER =====

const bvIp      = document.getElementById('bv-ip');
const bvCidr    = document.getElementById('bv-cidr');
const bvBtn     = document.getElementById('bv-btn');
const bvDisplay = document.getElementById('bv-display');

function buildBinaryRow(num, label, netBits, colorize) {
  const bits = [];
  for (let i = 31; i >= 0; i--) {
    const bit    = (num >>> i) & 1;
    const bitPos = 32 - i; // 1-indexed from MSB
    const isNet  = bitPos <= netBits;
    let cls      = 'bit';
    if (colorize) cls += isNet ? ' bit-net' : ' bit-host';
    else           cls += ' bit-plain';
    bits.push(`<span class="${cls}" title="bit ${bitPos}">${bit}</span>`);
    if (i > 0 && i % 8 === 0) bits.push(`<span class="bit-sep">·</span>`);
  }
  return `<div class="bv-row">
    <span class="bv-row-label mono">${escHtml(label)}</span>
    <div class="bv-bits mono">${bits.join('')}</div>
    <span class="bv-row-decimal mono">${escHtml(numToIp(num))}</span>
  </div>`;
}

function runBinaryViz() {
  const cidr = Math.min(32, Math.max(0, parseInt(bvCidr.value, 10) || 0));
  const ip   = ipToNum(bvIp.value);
  if (ip === null) {
    bvDisplay.innerHTML = `<div class="error-msg mono" style="padding:1rem">⚠ Invalid IP address.</div>`;
    return;
  }
  const data = calcSubnet(numToIp(ip), cidr);

  // Build column header numbers
  const hdrBits = [];
  for (let i = 1; i <= 32; i++) {
    hdrBits.push(`<span class="bit-pos-hdr">${i <= 9 ? i : i % 10 === 0 ? i : ''}</span>`);
    if (i % 8 === 0 && i < 32) hdrBits.push(`<span class="bit-sep-hdr"> </span>`);
  }

  bvDisplay.innerHTML = `
    <div class="bv-table">
      <div class="bv-hdr mono">
        <span class="bv-hdr-label">BIT POS</span>
        <div class="bv-hdr-bits">${hdrBits.join('')}</div>
        <span class="bv-hdr-decimal">DECIMAL</span>
      </div>
      ${buildBinaryRow(ip,              'IP',    cidr, true)}
      ${buildBinaryRow(data.mask,       'MASK',  cidr, false)}
      <div class="bv-op-divider mono">─── AND ─────────────────────────────────────────────────────────</div>
      ${buildBinaryRow(data.network,    'NET',   cidr, true)}
      <div class="bv-op-divider mono">─── OR NOT(MASK) ────────────────────────────────────────────────</div>
      ${buildBinaryRow(data.broadcast,  'BCAST', cidr, true)}
    </div>
    <div class="bv-summary">
      <div class="bv-summary-item">Network bits: <span>${cidr}</span></div>
      <div class="bv-summary-item">Host bits: <span>${32 - cidr}</span></div>
      <div class="bv-summary-item">Usable hosts: <span>${data.usableHosts.toLocaleString()}</span></div>
      <div class="bv-summary-item">IP class: <span>${escHtml(data.ipClass)}</span></div>
    </div>`;
}

bvBtn.addEventListener('click', runBinaryViz);
bvIp.addEventListener('keydown',   e => { if (e.key === 'Enter') runBinaryViz(); });
bvCidr.addEventListener('keydown', e => { if (e.key === 'Enter') runBinaryViz(); });

// ===== TAB 4: PACKET FLOW SIMULATOR =====

const PF_SCENARIOS = {
  arp: {
    steps: [
      {
        active: ['pc-a'],
        badge: 'STEP 1 — ARP CACHE MISS',
        title: 'PC-A checks ARP cache for 192.168.1.20',
        desc: 'PC-A wants to send data to 192.168.1.20. It checks its local ARP cache — no entry found. An ARP broadcast must be sent to resolve the MAC address before any data frame can be built.',
        frame: { TYPE: 'ARP REQUEST (Broadcast)', ETH_SRC: 'AA:11:22:33:44:55', ETH_DST: 'FF:FF:FF:FF:FF:FF', ARP: 'Who has 192.168.1.20? Tell 192.168.1.10' },
      },
      {
        active: ['pc-a', 'sw1'],
        badge: 'STEP 2 — BROADCAST FLOODED',
        title: 'Switch floods ARP broadcast to all ports',
        desc: 'The L2 switch receives the broadcast frame (FF:FF:FF:FF:FF:FF). It learns PC-A\'s MAC on its port, then floods the frame out every other port — all devices on the segment receive the ARP request.',
        frame: { TYPE: 'ARP REQUEST (Flooded)', ETH_SRC: 'AA:11:22:33:44:55', ETH_DST: 'FF:FF:FF:FF:FF:FF', ARP: 'Who has 192.168.1.20? Tell 192.168.1.10' },
      },
      {
        active: ['sw1', 'pc-b'],
        badge: 'STEP 3 — ARP REPLY',
        title: 'PC-B replies with its MAC address',
        desc: 'PC-B sees the request matches its own IP. It sends a unicast ARP reply directly to PC-A. PC-B also adds PC-A\'s IP→MAC mapping to its own cache as a side-effect.',
        frame: { TYPE: 'ARP REPLY (Unicast)', ETH_SRC: 'BB:22:33:44:55:66', ETH_DST: 'AA:11:22:33:44:55', ARP: '192.168.1.20 is at BB:22:33:44:55:66' },
      },
      {
        active: ['pc-a'],
        badge: 'STEP 4 — CACHE UPDATED',
        title: 'PC-A stores the mapping in ARP cache',
        desc: 'PC-A receives the ARP reply and stores: 192.168.1.20 → BB:22:33:44:55:66. The entry has a TTL (~20 min Linux / ~2 min Windows). Future packets skip ARP entirely until the entry expires.',
        frame: { TYPE: 'ARP CACHE ENTRY', IP: '192.168.1.20', MAC: 'BB:22:33:44:55:66', TTL: '20 min (Linux) / 2 min (Windows)' },
      },
      {
        active: ['pc-a', 'sw1', 'pc-b'],
        badge: 'STEP 5 — UNICAST DELIVERY',
        title: 'Data frame delivered directly to PC-B',
        desc: 'With the MAC resolved, PC-A builds a standard unicast Ethernet frame. The switch does a CAM lookup for BB:22:33:44:55:66 and forwards it only to the correct port — no flooding needed.',
        frame: { TYPE: 'DATA FRAME (Unicast)', ETH_SRC: 'AA:11:22:33:44:55', ETH_DST: 'BB:22:33:44:55:66', IP_SRC: '192.168.1.10', IP_DST: '192.168.1.20' },
      },
    ],
    topology: [
      { id: 'pc-a', label: 'PC-A',    sub: '192.168.1.10' },
      { id: 'sw1',  label: 'SWITCH',  sub: 'L2'           },
      { id: 'pc-b', label: 'PC-B',    sub: '192.168.1.20' },
    ],
  },

  routing: {
    steps: [
      {
        active: ['pc-a'],
        badge: 'STEP 1 — ROUTING DECISION',
        title: 'PC-A determines destination is on a different subnet',
        desc: 'PC-A (10.0.1.10/24) wants to reach 10.0.2.10. It ANDs both IPs with its /24 mask: 10.0.1.10 → net 10.0.1.0; 10.0.2.10 → net 10.0.2.0. Networks differ → destination is remote. Packet must go to the default gateway (10.0.1.1).',
        frame: { TYPE: 'ROUTING CHECK', SRC_NET: '10.0.1.0/24', DST_NET: '10.0.2.0/24', RESULT: 'DIFFERENT SUBNET → send to GW 10.0.1.1' },
      },
      {
        active: ['pc-a'],
        badge: 'STEP 2 — ARP FOR GATEWAY',
        title: 'PC-A resolves the gateway MAC via ARP',
        desc: 'Before the first packet can be sent, PC-A needs the MAC of its default gateway (10.0.1.1). It broadcasts an ARP request. The router\'s LAN interface responds with its MAC.',
        frame: { TYPE: 'ARP REQUEST', ETH_SRC: 'AA:11:22:33:44:55', ETH_DST: 'FF:FF:FF:FF:FF:FF', ARP: 'Who has 10.0.1.1? Tell 10.0.1.10' },
      },
      {
        active: ['pc-a', 'sw-a', 'rtr'],
        badge: 'STEP 3 — IP PACKET TO ROUTER',
        title: 'PC-A sends IP packet — dst MAC = router',
        desc: 'The IP header carries the original src/dst IPs (10.0.1.10 → 10.0.2.10). The Ethernet frame wraps it with the router\'s MAC as destination. IP addresses are unchanged — only the L2 frame targets the router.',
        frame: { TYPE: 'ETHERNET FRAME', ETH_SRC: 'AA:11:22:33:44:55', ETH_DST: 'CC:33:44:55:66:77 (Router eth0)', IP_SRC: '10.0.1.10', IP_DST: '10.0.2.10', TTL: '64' },
      },
      {
        active: ['rtr'],
        badge: 'STEP 4 — ROUTER LOOKUP',
        title: 'Router does LPM lookup, decrements TTL',
        desc: 'Router strips the frame, inspects the IP header. Longest-prefix match for 10.0.2.10 → 10.0.2.0/24 on interface eth1 (directly connected). TTL decremented 64 → 63. Router ARP-resolves 10.0.2.10 if not cached.',
        frame: { TYPE: 'ROUTING LOOKUP', DST_IP: '10.0.2.10', ROUTE: '10.0.2.0/24 → eth1 (directly connected)', TTL_IN: '64', TTL_OUT: '63' },
      },
      {
        active: ['rtr', 'sw-b', 'pc-b'],
        badge: 'STEP 5 — DELIVERED TO PC-B',
        title: 'New Ethernet frame built for destination subnet',
        desc: 'The router builds a fresh Ethernet frame for the 10.0.2.x network: src MAC = router\'s eth1, dst MAC = PC-B. IP src/dst are preserved (end-to-end). PC-B receives the datagram with original IPs intact.',
        frame: { TYPE: 'ETHERNET FRAME', ETH_SRC: 'DD:44:55:66:77:88 (Router eth1)', ETH_DST: 'BB:22:33:44:55:66 (PC-B)', IP_SRC: '10.0.1.10', IP_DST: '10.0.2.10', TTL: '63' },
      },
    ],
    topology: [
      { id: 'pc-a', label: 'PC-A',     sub: '10.0.1.10/24' },
      { id: 'sw-a', label: 'SWITCH A',  sub: 'L2'            },
      { id: 'rtr',  label: 'ROUTER',    sub: '.1 / .1'        },
      { id: 'sw-b', label: 'SWITCH B',  sub: 'L2'            },
      { id: 'pc-b', label: 'PC-B',      sub: '10.0.2.10/24'  },
    ],
  },

  journey: {
    steps: [
      {
        active: ['client'],
        badge: 'HOP 0 — ORIGIN',
        title: 'Client initiates TCP connection',
        desc: 'The client app opens a TCP connection to 8.8.8.8:443 (HTTPS). The OS builds IP and TCP headers — TTL is set to 64. ARP resolves the default gateway (firewall) MAC. The Ethernet frame is crafted with the firewall MAC as destination.',
        frame: { TYPE: 'TCP SYN (Origin)', ETH_SRC: 'CA:FE:10:00:00:01', ETH_DST: 'CA:FE:FF:00:00:01', IP_SRC: '192.168.1.10', IP_DST: '8.8.8.8', TTL: '64', TCP_SPORT: '54321', TCP_DPORT: '443', FLAGS: 'SYN', SEQ: '1000' },
      },
      {
        active: ['client', 'switch'],
        badge: 'HOP 1 — L2 SWITCH',
        title: 'Layer 2 forwarding — frame passes through unchanged',
        desc: 'The switch operates purely at Layer 2. It reads the destination MAC, performs a CAM table lookup, and forwards the frame to the firewall port. Switches never inspect IP/TCP headers and never decrement TTL.',
        frame: { TYPE: 'L2 FORWARD (Unchanged)', ETH_SRC: 'CA:FE:10:00:00:01', ETH_DST: 'CA:FE:FF:00:00:01', IP_SRC: '192.168.1.10', IP_DST: '8.8.8.8', TTL: '64', NOTE: 'No IP/TCP changes — L2 only' },
      },
      {
        active: ['switch', 'firewall'],
        badge: 'HOP 2 — FIREWALL / NAT',
        title: 'NAT translation, ACL check, MAC rewrite',
        desc: 'The firewall strips the Ethernet header and inspects the IP packet. ACL permits port 443. PAT rewrites the private src IP to the public WAN IP with a new ephemeral port. A fresh Ethernet frame is built for the WAN interface. TTL decremented by 1.',
        frame: { TYPE: 'NAT/PAT REWRITE', ETH_SRC: 'BE:EF:00:00:00:02', ETH_DST: '00:11:22:AA:BB:CC', IP_SRC: '203.0.113.5 (was 192.168.1.10)', IP_DST: '8.8.8.8', TTL: '63 (was 64)', TCP_SPORT: '49152 (was 54321)', NOTE: 'PAT: private IP+port → public IP+port' },
      },
      {
        active: ['firewall', 'isp'],
        badge: 'HOP 3 — ISP ROUTER',
        title: 'BGP route lookup — MAC rewrite + TTL decrement',
        desc: "The ISP router performs a longest-prefix match in its BGP table for 8.8.8.8, selecting Google's AS15169. A new Ethernet frame is built for the BGP peer link. IP and TCP payloads are unchanged. TTL decrements by 1.",
        frame: { TYPE: 'BGP FORWARD', ETH_SRC: 'DE:AD:00:00:00:03', ETH_DST: 'C0:FF:EE:00:00:04', IP_SRC: '203.0.113.5', IP_DST: '8.8.8.8', TTL: '62 (was 63)', NOTE: 'New L2 frame for BGP peer link' },
      },
      {
        active: ['isp', 'backbone'],
        badge: 'HOP 4 — INTERNET BACKBONE',
        title: '~8 backbone hops — MACs rewritten each hop, TTL drops',
        desc: "The packet traverses multiple IXPs and backbone routers across several autonomous systems. At every router the Ethernet frame is discarded and rebuilt. After ~8 hops the packet approaches Google's network edge.",
        frame: { TYPE: 'BACKBONE TRANSIT (~8 hops)', ETH_SRC: 'FA:CE:00:00:00:05', ETH_DST: '8A:8B:8C:8D:8E:8F', IP_SRC: '203.0.113.5', IP_DST: '8.8.8.8', TTL: '54 (was 62, -8 hops)', NOTE: 'MACs rewritten at every backbone router' },
      },
      {
        active: ['backbone', 'server'],
        badge: 'HOP 5 — DESTINATION',
        title: 'Packet delivered — TCP SYN received by server',
        desc: "The packet arrives at 8.8.8.8. The NIC accepts the frame (dst MAC matches). IP stack verifies dst address and TTL > 0. TCP stack processes SYN on port 443. Server allocates a TCB and responds with SYN-ACK. Return traffic de-NATed at the firewall.",
        frame: { TYPE: 'TCP SYN RECEIVED', IP_SRC: '203.0.113.5', IP_DST: '8.8.8.8', TTL: '54', TCP_SPORT: '49152', TCP_DPORT: '443', FLAGS: 'SYN', RESPONSE: 'SYN-ACK → de-NAT → 192.168.1.10:54321' },
      },
    ],
    topology: [
      { id: 'client',   label: 'CLIENT',       sub: '192.168.1.10' },
      { id: 'switch',   label: 'L2 SWITCH',    sub: 'L2'            },
      { id: 'firewall', label: 'FIREWALL/NAT', sub: '203.0.113.5'   },
      { id: 'isp',      label: 'ISP ROUTER',   sub: 'BGP AS1234'    },
      { id: 'backbone', label: 'INTERNET',     sub: '~8 hops'       },
      { id: 'server',   label: 'SERVER',       sub: '8.8.8.8'       },
    ],
  },

  nat: {
    steps: [
      {
        active: ['pc'],
        badge: 'STEP 1 — PRIVATE PACKET',
        title: 'PC builds TCP SYN to public server',
        desc: 'The PC (192.168.1.10) opens a TCP connection to 8.8.8.8:80 (HTTP). The source address is a private RFC 1918 address — non-routable on the public internet. The packet is sent to the default gateway (NAT router).',
        frame: { TYPE: 'TCP SYN (Private)', IP_SRC: '192.168.1.10', IP_DST: '8.8.8.8', TCP_SPORT: '54321', TCP_DPORT: '80', FLAGS: 'SYN' },
      },
      {
        active: ['pc', 'nat'],
        badge: 'STEP 2 — NAT INTERCEPT',
        title: 'NAT router creates translation table entry',
        desc: 'The router intercepts the packet on its LAN interface. PAT (Port Address Translation) maps the private address+port to the public WAN IP with a unique port. The mapping is stored in the NAT table for return traffic.',
        frame: { TYPE: 'NAT TABLE ENTRY', ORIGINAL: '192.168.1.10:54321', TRANSLATED: '203.0.113.1:49152', DESTINATION: '8.8.8.8:80', ACTION: 'SNAT (Source NAT)' },
      },
      {
        active: ['nat', 'inet', 'srv'],
        badge: 'STEP 3 — TRANSLATED PACKET',
        title: 'Router forwards packet with public source IP',
        desc: 'Source IP rewritten: 192.168.1.10 → 203.0.113.1; source port: 54321 → 49152. The server sees only the public IP — the private network is completely hidden. The internet routing infrastructure can now forward the packet normally.',
        frame: { TYPE: 'TCP SYN (Public)', IP_SRC: '203.0.113.1', IP_DST: '8.8.8.8', TCP_SPORT: '49152', TCP_DPORT: '80', FLAGS: 'SYN' },
      },
      {
        active: ['srv'],
        badge: 'STEP 4 — SERVER REPLIES',
        title: 'Server sends SYN-ACK to public IP',
        desc: 'The server processes the SYN and replies with SYN-ACK targeted at 203.0.113.1:49152. It has zero knowledge of the private host. The response will be routed back through the internet to the NAT router.',
        frame: { TYPE: 'TCP SYN-ACK', IP_SRC: '8.8.8.8', IP_DST: '203.0.113.1', TCP_SPORT: '80', TCP_DPORT: '49152', FLAGS: 'SYN-ACK' },
      },
      {
        active: ['nat'],
        badge: 'STEP 5 — REVERSE NAT LOOKUP',
        title: 'NAT router translates return traffic',
        desc: 'The router receives the response for 203.0.113.1:49152. It looks up the NAT table entry and rewrites the destination: 203.0.113.1:49152 → 192.168.1.10:54321. The private client will receive the response transparently.',
        frame: { TYPE: 'NAT REVERSE LOOKUP', INCOMING: '8.8.8.8:80 → 203.0.113.1:49152', TRANSLATED: '8.8.8.8:80 → 192.168.1.10:54321', ACTION: 'DNAT (Dest NAT)' },
      },
      {
        active: ['pc'],
        badge: 'STEP 6 — DELIVERED',
        title: 'PC receives response — handshake complete',
        desc: 'PC receives the de-NATed SYN-ACK at 192.168.1.10:54321. From the PC\'s perspective it connected directly to 8.8.8.8 — NAT is completely transparent. The TCP three-way handshake is now complete; data transfer can begin.',
        frame: { TYPE: 'TCP SYN-ACK (De-NATed)', IP_SRC: '8.8.8.8', IP_DST: '192.168.1.10', TCP_SPORT: '80', TCP_DPORT: '54321', FLAGS: 'SYN-ACK' },
      },
    ],
    topology: [
      { id: 'pc',   label: 'PC',          sub: '192.168.1.10' },
      { id: 'nat',  label: 'NAT ROUTER',  sub: '203.0.113.1'  },
      { id: 'inet', label: 'INTERNET',    sub: '~'             },
      { id: 'srv',  label: 'SERVER',      sub: '8.8.8.8'       },
    ],
  },
};

let pfScenario  = 'arp';
let pfStep      = -1;
let pfAutoTimer = null;
let pfBusy      = false;

const pfTopologyEl = document.getElementById('pf-topology');
const pfBadgeEl    = document.getElementById('pf-badge');
const pfTitleEl    = document.getElementById('pf-title');
const pfDescEl     = document.getElementById('pf-desc');
const pfFieldsEl   = document.getElementById('pf-packet-fields');
const pfCounterEl  = document.getElementById('pf-counter');
const pfStartBtn   = document.getElementById('pf-start');
const pfNextBtn    = document.getElementById('pf-next');
const pfAutoBtn    = document.getElementById('pf-auto');
const pfResetBtn   = document.getElementById('pf-reset');

function renderPFTopology(scenarioKey, activeIds = []) {
  const nodes = PF_SCENARIOS[scenarioKey].topology;
  let html = `<div class="pf-nodes">`;
  nodes.forEach((node, i) => {
    const active = activeIds.includes(node.id);
    html += `<div class="pf-node ${active ? 'active' : ''}">
      <div class="pf-node-label mono">${escHtml(node.label)}</div>
      <div class="pf-node-sub mono">${escHtml(node.sub)}</div>
    </div>`;
    if (i < nodes.length - 1) {
      const nextActive = activeIds.includes(nodes[i+1].id);
      html += `<div class="pf-connector ${active && nextActive ? 'active' : ''}"></div>`;
    }
  });
  html += `</div>`;
  pfTopologyEl.innerHTML = html;
}

function renderPFFrame(frame) {
  if (!frame) { pfFieldsEl.innerHTML = '<span class="mono muted-text">No packet</span>'; return; }
  pfFieldsEl.innerHTML = Object.entries(frame).map(([k,v]) =>
    `<div class="pf-field">
      <span class="pf-field-key mono">${escHtml(k.replace(/_/g,' '))}</span>
      <span class="pf-field-val mono">${escHtml(String(v))}</span>
    </div>`
  ).join('');
}

function pfGoToStep(i) {
  if (pfBusy) return;
  const s = PF_SCENARIOS[pfScenario];
  if (i < 0 || i >= s.steps.length) return;
  pfBusy = true;
  pfStep = i;
  const step  = s.steps[i];
  const isLast = i === s.steps.length - 1;

  renderPFTopology(pfScenario, step.active || []);
  pfBadgeEl.textContent   = step.badge;
  pfBadgeEl.className     = 'step-badge mono active';
  pfTitleEl.textContent   = step.title;
  pfDescEl.textContent    = step.desc;
  renderPFFrame(step.frame);
  pfCounterEl.textContent = `STEP ${i+1} / ${s.steps.length}`;
  pfNextBtn.disabled      = isLast;
  pfAutoBtn.disabled      = isLast;

  if (isLast && pfAutoTimer) {
    clearInterval(pfAutoTimer); pfAutoTimer = null;
    pfAutoBtn.textContent = '⚡ AUTO'; pfAutoBtn.classList.remove('active');
  }
  setTimeout(() => { pfBusy = false; }, 80);
}

function pfReset() {
  if (pfAutoTimer) { clearInterval(pfAutoTimer); pfAutoTimer = null; pfAutoBtn.textContent = '⚡ AUTO'; pfAutoBtn.classList.remove('active'); }
  pfStep = -1; pfBusy = false;
  renderPFTopology(pfScenario);
  pfBadgeEl.textContent   = 'IDLE'; pfBadgeEl.className = 'step-badge mono';
  pfTitleEl.textContent   = 'Select a scenario and press START';
  pfDescEl.textContent    = '';
  pfFieldsEl.innerHTML    = '<span class="mono muted-text">No packet yet</span>';
  pfCounterEl.textContent = `STEP 0 / ${PF_SCENARIOS[pfScenario].steps.length}`;
  pfStartBtn.disabled     = false;
  pfNextBtn.disabled      = true;
  pfAutoBtn.disabled      = true;
}

document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pfScenario = btn.dataset.scenario;
    pfReset();
  });
});
pfStartBtn.addEventListener('click', () => pfGoToStep(0));
pfNextBtn.addEventListener('click',  () => { if (!pfBusy) pfGoToStep(pfStep + 1); });
pfResetBtn.addEventListener('click', pfReset);
pfAutoBtn.addEventListener('click', () => {
  if (pfAutoTimer) {
    clearInterval(pfAutoTimer); pfAutoTimer = null;
    pfAutoBtn.textContent = '⚡ AUTO'; pfAutoBtn.classList.remove('active');
    return;
  }
  pfAutoBtn.textContent = '⏹ STOP'; pfAutoBtn.classList.add('active');
  pfAutoTimer = setInterval(() => {
    const next = pfStep + 1;
    if (next >= PF_SCENARIOS[pfScenario].steps.length) {
      clearInterval(pfAutoTimer); pfAutoTimer = null;
      pfAutoBtn.textContent = '⚡ AUTO'; pfAutoBtn.classList.remove('active');
      return;
    }
    pfGoToStep(next);
  }, 2600);
});

// ===== TAB 5: CHALLENGE MODE =====

const CH_TOTAL = 10;
const CH_TIME  = { easy: 30, medium: 25, hard: 20 };

let chState = null;
let chTimerInterval = null;

const chScoreEl    = document.getElementById('ch-score');
const chStreakEl   = document.getElementById('ch-streak');
const chTimerEl   = document.getElementById('ch-timer');
const chProgressEl = document.getElementById('ch-progress');
const chArea       = document.getElementById('ch-area');
const chStartBtn   = document.getElementById('ch-start');

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randIp(cls) {
  if (cls === 'a') return `10.${randInt(1,254)}.${randInt(0,254)}.${randInt(1,254)}`;
  if (cls === 'b') return `172.${randInt(16,31)}.${randInt(0,254)}.${randInt(1,254)}`;
  return `192.168.${randInt(0,254)}.${randInt(1,254)}`;
}

function generateQuestion(difficulty) {
  const typesByDiff = {
    easy:   ['networkAddr', 'subnetMask', 'hostCount'],
    medium: ['networkAddr', 'broadcastAddr', 'hostCount', 'sameSubnet', 'cidrForHosts'],
    hard:   ['networkAddr', 'broadcastAddr', 'wildcardMask', 'sameSubnet', 'cidrForHosts', 'numSubnets'],
  };
  const type = typesByDiff[difficulty][randInt(0, typesByDiff[difficulty].length - 1)];

  const cidr = difficulty === 'easy' ? [8,16,24][randInt(0,2)] : difficulty === 'medium' ? randInt(8,28) : randInt(8,30);
  const ip   = randIp(cidr <= 10 ? 'a' : cidr <= 20 ? 'b' : 'c');
  const data = calcSubnet(ip, cidr);

  if (type === 'networkAddr') {
    const correct = numToIp(data.network);
    const opts = shuffle([correct, ip, numToIp(data.broadcast), numToIp(data.firstHost)].filter((v,i,a) => a.indexOf(v) === i));
    while (opts.length < 4) opts.push(numToIp((data.network + randInt(1,10)) >>> 0));
    return {
      q: `What is the <strong>network address</strong> of <strong>${ip}/${cidr}</strong>?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `${ip} AND ${numToIp(data.mask)} = <strong>${correct}</strong>`,
    };
  }
  if (type === 'broadcastAddr') {
    const correct = numToIp(data.broadcast);
    const opts = shuffle([correct, numToIp(data.network), numToIp(data.lastHost), ip].filter((v,i,a) => a.indexOf(v) === i));
    while (opts.length < 4) opts.push(numToIp((data.broadcast - randInt(1,5)) >>> 0));
    return {
      q: `What is the <strong>broadcast address</strong> of <strong>${ip}/${cidr}</strong>?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `Network ${numToIp(data.network)} + ${data.totalIPs - 1} addresses = <strong>${correct}</strong>`,
    };
  }
  if (type === 'subnetMask') {
    const correct = numToIp(data.mask);
    const adj = (d) => cidr + d <= 32 && cidr + d >= 0 ? numToIp(cidrToMask(cidr + d)) : null;
    const opts = shuffle([correct, adj(-1), adj(1), adj(-2)].filter(Boolean).filter((v,i,a) => a.indexOf(v) === i)).slice(0,4);
    while (opts.length < 4) opts.push(numToIp(cidrToMask(randInt(8,30))));
    return {
      q: `What is the <strong>subnet mask</strong> for <strong>/${cidr}</strong>?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `/${cidr} = ${cidr} ones + ${32-cidr} zeros = <strong>${correct}</strong>`,
    };
  }
  if (type === 'hostCount') {
    const correct = data.usableHosts.toLocaleString();
    const opts = shuffle([
      correct,
      data.totalIPs.toLocaleString(),
      Math.max(0, data.usableHosts - 2).toLocaleString(),
      (cidr < 31 ? Math.pow(2, 32-(cidr+1))-2 : 1).toLocaleString(),
    ].filter((v,i,a) => a.indexOf(v) === i)).slice(0,4);
    while (opts.length < 4) opts.push((data.usableHosts + randInt(1,4)).toLocaleString());
    return {
      q: `How many <strong>usable hosts</strong> are in a <strong>/${cidr}</strong> subnet?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `2^(32−${cidr}) − 2 = ${data.totalIPs} − 2 = <strong>${correct}</strong>`,
    };
  }
  if (type === 'wildcardMask') {
    const correct = numToIp(data.wildcard);
    const opts = shuffle([correct, numToIp(data.mask), numToIp(cidrToMask(cidr+1<=32?cidr+1:cidr)), numToIp((~cidrToMask(cidr+1<=32?cidr+1:cidr))>>>0)].filter((v,i,a) => a.indexOf(v) === i)).slice(0,4);
    return {
      q: `What is the <strong>wildcard mask</strong> for a <strong>/${cidr}</strong> subnet?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `Wildcard = NOT(mask) = NOT(${numToIp(data.mask)}) = <strong>${correct}</strong>`,
    };
  }
  if (type === 'sameSubnet') {
    const same = randInt(0,1) === 1;
    const subSize = Math.pow(2, 32 - cidr);
    let ip2;
    if (same) {
      ip2 = numToIp((data.firstHost + randInt(0, Math.min(data.usableHosts - 1, 30))) >>> 0);
    } else {
      ip2 = numToIp((data.network + randInt(1,3) * subSize) >>> 0);
    }
    const ip2data = calcSubnet(ip2, cidr);
    const isSame = ip2data && ip2data.network === data.network;
    const correct = isSame ? 'Yes, same subnet' : 'No, different subnets';
    return {
      q: `Are <strong>${ip}</strong> and <strong>${ip2}</strong> in the same <strong>/${cidr}</strong> subnet?`,
      answer: correct,
      options: shuffle(['Yes, same subnet', 'No, different subnets', 'Cannot be determined', 'Yes, but different broadcasts']),
      explanation: `${ip} → ${numToIp(data.network)}/${cidr}; ${ip2} → ${ip2data ? numToIp(ip2data.network) : '?'}/${cidr}. They are <strong>${isSame ? 'in the same subnet' : 'in different subnets'}</strong>.`,
    };
  }
  if (type === 'cidrForHosts') {
    const targets = [10,14,25,30,50,62,100,126,200,254,500,1000];
    const target  = targets[randInt(0, targets.length - 1)];
    let cCidr = 32;
    while (cCidr > 0) {
      const h = cCidr >= 31 ? (cCidr === 31 ? 2 : 1) : Math.pow(2, 32 - cCidr) - 2;
      if (h >= target) break;
      cCidr--;
    }
    const correct = `/${cCidr}`;
    const gives = cCidr >= 31 ? (cCidr === 31 ? 2 : 1) : Math.pow(2, 32 - cCidr) - 2;
    const tooSmall = cCidr < 32 ? Math.pow(2, 32 - (cCidr+1)) - 2 : 0;
    const opts = shuffle([correct, `/${cCidr+1}`, `/${Math.max(1,cCidr-1)}`, `/${Math.max(1,cCidr-2)}`].filter((v,i,a) => a.indexOf(v) === i)).slice(0,4);
    return {
      q: `What is the <strong>smallest prefix</strong> that provides at least <strong>${target} usable hosts</strong>?`,
      answer: correct, options: opts.slice(0,4),
      explanation: `<strong>/${cCidr}</strong> gives 2^${32-cCidr}−2 = <strong>${gives.toLocaleString()}</strong> hosts ≥ ${target}. /${cCidr+1} only gives ${tooSmall}.`,
    };
  }
  if (type === 'numSubnets') {
    const pCidr = randInt(8, 22);
    const sCidr = pCidr + randInt(2, 4);
    const count = Math.pow(2, sCidr - pCidr);
    const opts  = shuffle([String(count), String(count/2), String(count*2), String(sCidr - pCidr)].filter((v,i,a) => a.indexOf(v) === i)).slice(0,4);
    return {
      q: `How many <strong>/${sCidr} subnets</strong> can you create from a single <strong>/${pCidr}</strong> block?`,
      answer: String(count), options: opts.slice(0,4),
      explanation: `2^(${sCidr}−${pCidr}) = 2^${sCidr-pCidr} = <strong>${count}</strong>`,
    };
  }
  // fallback
  return generateQuestion(difficulty);
}

function chUpdateStats() {
  if (!chState) return;
  chScoreEl.textContent    = chState.score;
  chStreakEl.textContent   = chState.streak;
  chProgressEl.textContent = `${chState.current}/${CH_TOTAL}`;
}

function chClearTimer() {
  if (chTimerInterval) { clearInterval(chTimerInterval); chTimerInterval = null; }
}

function chStartTimer(seconds, onExpire) {
  chClearTimer();
  let rem = seconds;
  chTimerEl.textContent = rem;
  chTimerEl.classList.remove('urgent');
  chTimerInterval = setInterval(() => {
    rem--;
    chTimerEl.textContent = rem;
    if (rem <= 5) chTimerEl.classList.add('urgent');
    if (rem <= 0) { chClearTimer(); onExpire(); }
  }, 1000);
}

function chShowQuestion(idx) {
  if (!chState || idx >= chState.questions.length) { chShowResults(); return; }
  chState.current = idx;
  chUpdateStats();
  const q = chState.questions[idx];

  chArea.innerHTML = `
    <div class="ch-question-box">
      <div class="ch-q-num mono">QUESTION ${idx+1} / ${CH_TOTAL}</div>
      <div class="ch-q-text">${q.q}</div>
      <div class="ch-options" id="ch-opts">
        ${q.options.map(opt => `<button class="ch-opt mono" data-answer="${escHtml(opt)}">${escHtml(opt)}</button>`).join('')}
      </div>
      <div class="ch-explanation" id="ch-expl" hidden></div>
    </div>`;

  chArea.querySelectorAll('.ch-opt').forEach(btn => {
    btn.addEventListener('click', () => chAnswer(btn.dataset.answer, q));
  });

  chStartTimer(CH_TIME[chState.difficulty], () => chAnswer(null, q));
}

function chAnswer(selected, q) {
  chClearTimer();
  chTimerEl.textContent = '—';
  chTimerEl.classList.remove('urgent');
  const correct = selected === q.answer;
  if (correct) { chState.score++; chState.streak++; }
  else { chState.streak = 0; }
  chUpdateStats();

  chArea.querySelectorAll('.ch-opt').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === q.answer)  btn.classList.add('correct');
    else if (btn.dataset.answer === selected) btn.classList.add('wrong');
  });

  const expl = document.getElementById('ch-expl');
  expl.hidden = false;
  expl.innerHTML = `
    <div class="exp-status ${correct ? 'correct' : selected ? 'wrong' : 'timeout'}">
      ${correct ? 'CORRECT' : selected ? 'WRONG' : 'TIME UP'}
    </div>
    <div class="exp-text mono">${q.explanation}</div>
    <button class="tool-btn primary mono" id="ch-next-q">
      ${chState.current < CH_TOTAL - 1 ? 'NEXT QUESTION' : 'SEE RESULTS'}
    </button>`;
  document.getElementById('ch-next-q').addEventListener('click', () => chShowQuestion(chState.current + 1));
}

function chShowResults() {
  chClearTimer();
  chTimerEl.textContent = '—';
  const { score } = chState;
  const pct   = Math.round((score / CH_TOTAL) * 100);
  const grade = pct >= 90 ? 'S' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
  const tier  = (grade === 'S' || grade === 'A') ? 'grade-good' : (grade === 'B' || grade === 'C') ? 'grade-ok' : 'grade-bad';

  chArea.innerHTML = `
    <div class="ch-results">
      <div class="ch-grade mono ${tier}">${grade}</div>
      <div class="ch-result-score mono">${score} / ${CH_TOTAL} — ${pct}%</div>
      <div class="ch-result-msg mono">${pct >= 80 ? '🏆 Excellent subnetting!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep practicing!'}</div>
      <button class="tool-btn primary mono" id="ch-retry">↺ TRY AGAIN</button>
    </div>`;

  document.getElementById('ch-retry').addEventListener('click', () => {
    chArea.innerHTML = `<div class="ch-idle mono">Select a difficulty level and press START to begin</div>`;
    chScoreEl.textContent = '—'; chStreakEl.textContent = '—';
    chTimerEl.textContent = '—'; chProgressEl.textContent = '0/10';
    chState = null;
  });
}

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

chStartBtn.addEventListener('click', () => {
  const diff = document.querySelector('.diff-btn.active')?.dataset.diff || 'easy';
  chState = { questions: Array.from({length: CH_TOTAL}, () => generateQuestion(diff)), current: 0, score: 0, streak: 0, difficulty: diff };
  chScoreEl.textContent = '0'; chStreakEl.textContent = '0'; chProgressEl.textContent = `0/${CH_TOTAL}`;
  chShowQuestion(0);
});

// ===== BOOT =====
(function boot() {
  runSubnetCalc('ip');

  // VLSM default rows
  addVLSMRow('HQ Office',  100);
  addVLSMRow('Branch A',   50);
  addVLSMRow('Branch B',   25);
  addVLSMRow('Management', 10);

  // Packet flow initial topology
  renderPFTopology('arp');
})();
