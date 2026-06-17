/**
 * Packet Journey — Interactive TCP/IP Packet Traversal Simulator
 * Shows how a packet changes at each network hop: switch, firewall/NAT,
 * ISP router, internet backbone, and destination server.
 *
 * @author Naxish
 * @version 1.0
 */

// ===== JOURNEY STEPS =====
// Each step represents the packet state as observed AT that network node.
const STEPS = [
  {
    nodeId:  0,
    badge:   'HOP 0 — ORIGIN',
    title:   'Client initiates TCP connection',
    desc:    'The client app opens a TCP connection to 8.8.8.8:443 (HTTPS). The OS builds IP and TCP headers — TTL is set to 64. ARP resolves the default gateway (firewall) MAC address. The Ethernet frame is crafted with the firewall MAC as destination and queued for transmission.',
    changes: [],
    eth: { src: 'CA:FE:10:00:00:01', dst: 'CA:FE:FF:00:00:01', type: 'IPv4 (0x0800)' },
    ip:  { src: '192.168.1.10',       dst: '8.8.8.8',           ttl: 64,  proto: 'TCP (6)' },
    tcp: { sport: 54321, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
  {
    nodeId:  1,
    badge:   'HOP 1 — L2 SWITCH',
    title:   'Layer 2 forwarding — frame passes through unchanged',
    desc:    'The switch operates purely at Layer 2. It reads the destination MAC (CA:FE:FF:00:00:01), performs a CAM table lookup, and forwards the frame out the port toward the firewall. Switches do not inspect or modify IP or TCP headers, and never decrement the TTL.',
    changes: [
      { type: 'info', field: 'No IP / TCP changes', reason: 'L2 switch forwards by MAC address only — no routing, no TTL decrement, no NAT.' },
    ],
    eth: { src: 'CA:FE:10:00:00:01', dst: 'CA:FE:FF:00:00:01', type: 'IPv4 (0x0800)' },
    ip:  { src: '192.168.1.10',       dst: '8.8.8.8',           ttl: 64,  proto: 'TCP (6)' },
    tcp: { sport: 54321, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
  {
    nodeId:  2,
    badge:   'HOP 2 — FIREWALL / NAT',
    title:   'NAT translation, ACL check, MAC rewrite',
    desc:    'The firewall strips the Ethernet header and inspects the IP packet. The ACL permits traffic to port 443. PAT (Port Address Translation) rewrites the private source IP to the public WAN IP and assigns a new ephemeral port. A fresh Ethernet frame is built for the WAN interface with new MACs for both sides. TTL is decremented by 1.',
    changes: [
      { type: 'change', field: 'ETH Src MAC',  from: 'CA:FE:10:00:00:01', to: 'BE:EF:00:00:00:02', reason: 'New L2 frame built for WAN (egress) interface' },
      { type: 'change', field: 'ETH Dst MAC',  from: 'CA:FE:FF:00:00:01', to: '00:11:22:AA:BB:CC', reason: 'ISP upstream router MAC (ARP-resolved on WAN link)' },
      { type: 'change', field: 'IP Src',        from: '192.168.1.10',       to: '203.0.113.5',       reason: 'NAT/PAT — private IP translated to public WAN IP' },
      { type: 'change', field: 'TCP Src Port',  from: '54321',              to: '49152',             reason: 'PAT port mapping — unique port assigned per session' },
      { type: 'change', field: 'IP TTL',        from: '64',                 to: '63',                reason: 'TTL decremented by 1 at each L3 hop' },
    ],
    eth: { src: 'BE:EF:00:00:00:02', dst: '00:11:22:AA:BB:CC', type: 'IPv4 (0x0800)' },
    ip:  { src: '203.0.113.5',        dst: '8.8.8.8',           ttl: 63,  proto: 'TCP (6)' },
    tcp: { sport: 49152, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
  {
    nodeId:  3,
    badge:   'HOP 3 — ISP ROUTER',
    title:   'BGP route lookup — MAC rewrite + TTL decrement',
    desc:    "The ISP router performs a longest-prefix match (LPM) in its BGP routing table for 8.8.8.8, selecting Google's AS15169 as the next AS. A new Ethernet frame is constructed for the BGP peer link with fresh MACs. The IP and TCP payloads are unchanged. TTL decrements by 1.",
    changes: [
      { type: 'change', field: 'ETH Src MAC', from: 'BE:EF:00:00:00:02', to: 'DE:AD:00:00:00:03', reason: "Router's egress interface MAC address" },
      { type: 'change', field: 'ETH Dst MAC', from: '00:11:22:AA:BB:CC', to: 'C0:FF:EE:00:00:04', reason: 'Next BGP peer / upstream backbone router MAC' },
      { type: 'change', field: 'IP TTL',      from: '63',                to: '62',               reason: 'TTL decremented by 1 at this L3 hop' },
    ],
    eth: { src: 'DE:AD:00:00:00:03', dst: 'C0:FF:EE:00:00:04', type: 'IPv4 (0x0800)' },
    ip:  { src: '203.0.113.5',        dst: '8.8.8.8',           ttl: 62,  proto: 'TCP (6)' },
    tcp: { sport: 49152, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
  {
    nodeId:  4,
    badge:   'HOP 4 — INTERNET BACKBONE',
    title:   '~8 backbone hops — MACs rewritten each hop, TTL drops',
    desc:    "The packet traverses multiple Internet Exchange Points (IXPs) and backbone routers across several autonomous systems. At every router, the Ethernet frame is discarded and rebuilt for the next link — MACs change at each hop. The IP and TCP payloads are untouched. After ~8 hops, the packet approaches Google's network edge.",
    changes: [
      { type: 'change', field: 'ETH Src MAC', from: 'DE:AD:00:00:00:03', to: 'FA:CE:00:00:00:05', reason: 'Last backbone router before destination AS' },
      { type: 'change', field: 'ETH Dst MAC', from: 'C0:FF:EE:00:00:04', to: '8A:8B:8C:8D:8E:8F', reason: "Google edge router MAC address" },
      { type: 'change', field: 'IP TTL',      from: '62',                to: '54',               reason: 'Decremented 8 times across backbone hops (62 → 54)' },
    ],
    eth: { src: 'FA:CE:00:00:00:05', dst: '8A:8B:8C:8D:8E:8F', type: 'IPv4 (0x0800)' },
    ip:  { src: '203.0.113.5',        dst: '8.8.8.8',           ttl: 54,  proto: 'TCP (6)' },
    tcp: { sport: 49152, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
  {
    nodeId:  5,
    badge:   'HOP 5 — DESTINATION',
    title:   'Packet delivered — TCP SYN received by server',
    desc:    "The packet arrives at 8.8.8.8. The NIC accepts the frame (destination MAC matches). The IP stack verifies the destination address and confirms TTL > 0. The TCP stack processes the SYN flag on port 443. The server allocates a TCB, picks a random ISN (5000), and will respond with a SYN-ACK to complete the three-way handshake.",
    changes: [
      { type: 'info', field: 'TCP SYN received',      reason: 'Server will respond: SYN-ACK — Seq=5000, Ack=1001, completing the handshake' },
      { type: 'info', field: 'NAT state table entry', reason: 'Return traffic: 8.8.8.8:443 → 203.0.113.5:49152 — firewall de-NATes → 192.168.1.10:54321' },
    ],
    eth: { src: 'FA:CE:00:00:00:05', dst: '8A:8B:8C:8D:8E:8F', type: 'IPv4 (0x0800)' },
    ip:  { src: '203.0.113.5',        dst: '8.8.8.8',           ttl: 54,  proto: 'TCP (6)' },
    tcp: { sport: 49152, dport: 443,  flags: 'SYN', seq: 1000,  ack: 0,   win: 65535 },
  },
];

// ===== STATE =====
let currentStep = -1;
let autoTimer   = null;
let isAnimating = false;

// ===== DOM REFS =====
const $ = sel => document.querySelector(sel);

const sendBtn    = $('#sendBtn');
const nextBtn    = $('#nextBtn');
const autoBtn    = $('#autoBtn');
const resetBtn   = $('#resetBtn');
const wsToggle   = $('#wsToggle');
const wsSection  = $('#wireshark-section');
const wsBody     = $('#ws-body');
const stepCounter= $('#step-counter');
const stepBadge  = $('#step-badge');
const stepTitle  = $('#step-title');
const stepDesc   = $('#step-desc');
const changesList= $('#changes-list');
const topoTrack  = $('#topology-track');
const packetDot  = $('#packet-dot');

// All header field elements with their value getters
const FIELDS = [
  { id: 'f-eth-src',   get: s => s.eth.src   },
  { id: 'f-eth-dst',   get: s => s.eth.dst   },
  { id: 'f-eth-type',  get: s => s.eth.type  },
  { id: 'f-ip-src',    get: s => s.ip.src    },
  { id: 'f-ip-dst',    get: s => s.ip.dst    },
  { id: 'f-ip-ttl',    get: s => String(s.ip.ttl)    },
  { id: 'f-ip-proto',  get: s => s.ip.proto  },
  { id: 'f-tcp-sport', get: s => String(s.tcp.sport) },
  { id: 'f-tcp-dport', get: s => String(s.tcp.dport) },
  { id: 'f-tcp-flags', get: s => s.tcp.flags },
  { id: 'f-tcp-seq',   get: s => String(s.tcp.seq)   },
  { id: 'f-tcp-ack',   get: s => String(s.tcp.ack)   },
  { id: 'f-tcp-win',   get: s => String(s.tcp.win)   },
];

// ===== SECURITY HELPER =====
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== TOPOLOGY =====
function getNodeBodyCenter(index) {
  const node  = document.getElementById(`node-${index}`);
  if (!node || !topoTrack) return 0;
  const body = node.querySelector('.node-body') || node;
  const br = body.getBoundingClientRect();
  const tr = topoTrack.getBoundingClientRect();
  return br.left - tr.left + br.width / 2;
}

function updateTopology(nodeIndex) {
  for (let i = 0; i < STEPS.length; i++) {
    const el = document.getElementById(`node-${i}`);
    if (!el) continue;
    el.classList.remove('active', 'visited', 'pending');
    if      (i < nodeIndex)  el.classList.add('visited');
    else if (i === nodeIndex) el.classList.add('active');
    else                      el.classList.add('pending');
  }
  for (let i = 0; i < STEPS.length - 1; i++) {
    const el = document.getElementById(`conn-${i}`);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if      (i < nodeIndex - 1)  el.classList.add('done');
    else if (i === nodeIndex - 1) el.classList.add('active');
  }
}

// ===== PACKET DOT ANIMATION =====
function movePacketDot(toIndex, callback) {
  let fired = false;
  const done = () => {
    if (fired) return;
    fired = true;
    if (callback) callback();
  };

  const targetLeft = getNodeBodyCenter(toIndex);

  if (packetDot.hidden) {
    // First appearance — place without animation, then show
    packetDot.style.transition = 'none';
    packetDot.style.left = targetLeft + 'px';
    packetDot.hidden = false;
    packetDot.offsetHeight; // force reflow so transition: none takes effect
    packetDot.style.transition = ''; // restore CSS transition
    setTimeout(done, 50);
    return;
  }

  packetDot.style.left = targetLeft + 'px';
  packetDot.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 900); // fallback if transitionend doesn't fire
}

// ===== RENDER HEADER FIELDS =====
function renderFields(step, prevStep) {
  for (const { id, get } of FIELDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const val  = get(step);
    const prev = prevStep ? get(prevStep) : null;
    el.textContent = val;
    el.classList.remove('changed', 'settled');
    if (prevStep && val !== prev) {
      el.classList.add('changed');
      setTimeout(() => {
        el.classList.remove('changed');
        el.classList.add('settled');
      }, 800);
    }
  }
}

// ===== RENDER CHANGES PANEL =====
function renderChanges(step) {
  if (!step.changes.length) {
    changesList.innerHTML = '<p class="changes-empty mono">No header modifications at this hop.</p>';
    return;
  }
  changesList.innerHTML = step.changes.map(c => {
    if (c.type === 'info') {
      return `<div class="change-item info">
        <div class="change-field">${escapeHtml(c.field)}</div>
        <div class="change-reason">${escapeHtml(c.reason)}</div>
      </div>`;
    }
    return `<div class="change-item">
      <div class="change-field">${escapeHtml(c.field)}</div>
      <div class="change-from-to mono">
        <span class="from">${escapeHtml(c.from)}</span>
        <span class="arrow"> → </span>
        <span class="to">${escapeHtml(c.to)}</span>
      </div>
      <div class="change-reason">${escapeHtml(c.reason)}</div>
    </div>`;
  }).join('');
}

// ===== RENDER STEP BANNER =====
function renderBanner(step, index) {
  stepBadge.textContent = step.badge;
  stepBadge.className = 'step-badge mono ' + (index === STEPS.length - 1 ? 'done' : 'active');
  stepTitle.textContent = step.title;
  stepDesc.textContent  = step.desc;
  stepCounter.textContent = `STEP ${index + 1} / ${STEPS.length}`;
}

// ===== RENDER WIRESHARK VIEW =====
function renderWireshark(step) {
  if (!wsToggle.checked) return;

  const changedFields = new Set(
    (step.changes || []).filter(c => c.type === 'change').map(c => c.field)
  );

  const vc = field => changedFields.has(field) ? ' changed' : '';

  function wsField(name, val, changeKey) {
    return `<div class="ws-field">
      <span class="ws-field-name">${escapeHtml(name)}</span>
      <span class="ws-field-val${vc(changeKey)}">${escapeHtml(String(val))}</span>
    </div>`;
  }

  function wsSection(title, fields, open = true) {
    return `<div class="ws-section${open ? ' open' : ''}">
      <div class="ws-section-hdr">
        <span class="ws-chevron">▶</span>${escapeHtml(title)}
      </div>
      <div class="ws-fields">${fields}</div>
    </div>`;
  }

  const flagStr = step.tcp.flags === 'SYN'
    ? '0x002 (\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7SYN)'
    : '0x012 (\u00b7\u00b7\u00b7\u00b7SYN-ACK)';

  wsBody.innerHTML = `<div class="ws-tree">
    ${wsSection(
      `Frame: ${step.eth.src} \u2192 ${step.eth.dst}`,
      wsField('Encapsulation type', 'Ethernet (1)', '') +
      wsField('Frame length', '66 bytes', '') +
      wsField('Capture length', '66 bytes', '')
    )}
    ${wsSection(
      `Ethernet II  Src: ${step.eth.src}  Dst: ${step.eth.dst}`,
      wsField('Destination', step.eth.dst, 'ETH Dst MAC') +
      wsField('Source', step.eth.src, 'ETH Src MAC') +
      wsField('Type', step.eth.type, '')
    )}
    ${wsSection(
      `Internet Protocol Version 4  Src: ${step.ip.src}  Dst: ${step.ip.dst}`,
      wsField('Version', '4', '') +
      wsField('Header length', '20 bytes (5)', '') +
      wsField('Differentiated Services', '0x00 (DSCP: CS0)', '') +
      wsField('Total length', '52', '') +
      wsField('Identification', '0x1a2b', '') +
      wsField('Flags', '0x40 (Don\'t Fragment)', '') +
      wsField('Fragment offset', '0', '') +
      wsField('Time to Live', step.ip.ttl, 'IP TTL') +
      wsField('Protocol', step.ip.proto, '') +
      wsField('Source address', step.ip.src, 'IP Src') +
      wsField('Destination address', step.ip.dst, '')
    )}
    ${wsSection(
      `Transmission Control Protocol  Src Port: ${step.tcp.sport}  Dst Port: ${step.tcp.dport}  Seq: ${step.tcp.seq}`,
      wsField('Source port', step.tcp.sport, 'TCP Src Port') +
      wsField('Destination port', step.tcp.dport, '') +
      wsField('Sequence number (raw)', step.tcp.seq, '') +
      wsField('Acknowledgment number (raw)', step.tcp.ack, '') +
      wsField('Header length', '32 bytes (8)', '') +
      wsField('Flags', flagStr, '') +
      wsField('Window size value', step.tcp.win, '') +
      wsField('Checksum', '0xabcd [unverified]', '') +
      wsField('Urgent pointer', '0', '') +
      wsField('Options', 'MSS=1460, SACK_PERM, Timestamps, NOP, WScale=7', '')
    )}
  </div>`;

  // Attach collapsible toggle handlers
  wsBody.querySelectorAll('.ws-section-hdr').forEach(hdr => {
    hdr.addEventListener('click', () => hdr.parentElement.classList.toggle('open'));
    hdr.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hdr.parentElement.classList.toggle('open');
      }
    });
    hdr.setAttribute('tabindex', '0');
    hdr.setAttribute('role', 'button');
    const open = hdr.parentElement.classList.contains('open');
    hdr.setAttribute('aria-expanded', String(open));
  });
}

// ===== ADVANCE TO STEP =====
function goToStep(index) {
  if (isAnimating || index < 0 || index >= STEPS.length) return;
  isAnimating = true;

  const step     = STEPS[index];
  const prevStep = index > 0 ? STEPS[index - 1] : null;

  movePacketDot(step.nodeId, () => {
    currentStep = index;

    updateTopology(step.nodeId);
    renderBanner(step, index);
    renderFields(step, prevStep);
    renderChanges(step);
    renderWireshark(step);

    const isLast = index === STEPS.length - 1;
    sendBtn.disabled = true;
    nextBtn.disabled = isLast;
    autoBtn.disabled = isLast;

    if (isLast && autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      autoBtn.textContent = '⚡ AUTO-PLAY';
      autoBtn.classList.remove('active');
    }

    isAnimating = false;
  });
}

// ===== AUTO-PLAY =====
function toggleAutoPlay() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    autoBtn.textContent = '⚡ AUTO-PLAY';
    autoBtn.classList.remove('active');
    return;
  }
  autoBtn.textContent = '⏹ STOP';
  autoBtn.classList.add('active');

  autoTimer = setInterval(() => {
    const next = currentStep + 1;
    if (next >= STEPS.length) {
      clearInterval(autoTimer);
      autoTimer = null;
      autoBtn.textContent = '⚡ AUTO-PLAY';
      autoBtn.classList.remove('active');
      return;
    }
    goToStep(next);
  }, 2200);
}

// ===== RESET =====
function reset() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    autoBtn.textContent = '⚡ AUTO-PLAY';
    autoBtn.classList.remove('active');
  }
  currentStep = -1;
  isAnimating = false;

  // Reset topology
  for (let i = 0; i < STEPS.length; i++) {
    const n = document.getElementById(`node-${i}`);
    if (n) { n.classList.remove('active', 'visited'); n.classList.add('pending'); }
  }
  for (let i = 0; i < STEPS.length - 1; i++) {
    const c = document.getElementById(`conn-${i}`);
    if (c) c.classList.remove('active', 'done');
  }

  // Reset packet dot
  packetDot.style.transition = 'none';
  packetDot.style.left = '';
  packetDot.hidden = true;
  packetDot.offsetHeight;
  packetDot.style.transition = '';

  // Reset banner
  stepBadge.textContent   = 'IDLE';
  stepBadge.className     = 'step-badge mono';
  stepTitle.textContent   = 'Waiting for packet...';
  stepDesc.textContent    = 'Press SEND PACKET to begin the simulation';
  stepCounter.textContent = `STEP 0 / ${STEPS.length}`;

  // Reset fields
  FIELDS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '—'; el.classList.remove('changed', 'settled'); }
  });

  // Reset changes list
  changesList.innerHTML = '<p class="changes-empty mono">No data yet. Send a packet to begin.</p>';

  // Reset buttons
  sendBtn.disabled = false;
  nextBtn.disabled = true;
  autoBtn.disabled = true;

  // Reset Wireshark
  wsBody.innerHTML = '<p class="ws-placeholder mono">Send a packet to see the capture.</p>';
}

// ===== EVENT LISTENERS =====
sendBtn.addEventListener('click',  () => goToStep(0));
nextBtn.addEventListener('click',  () => { if (!isAnimating) goToStep(currentStep + 1); });
autoBtn.addEventListener('click',  toggleAutoPlay);
resetBtn.addEventListener('click', reset);

wsToggle.addEventListener('change', () => {
  wsSection.hidden = !wsToggle.checked;
  if (wsToggle.checked && currentStep >= 0) renderWireshark(STEPS[currentStep]);
});

// ===== BOOT =====
reset();
