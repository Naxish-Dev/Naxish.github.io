/**
 * Network Topology Builder - Refactored and Improved
 * Interactive web-based tool for designing and visualizing network topologies
 * 
 * @author Naxish
 * @version 2.0
 * 
 * Features:
 * - Drag-and-drop device placement
 * - Visual link creation between devices
 * - Interface configuration (L2/L3)
 * - Subnet-based color coding
 * - Import/Export topology
 * - Cisco-style config generation
 */

// ===== CONSTANTS =====
const CONFIG = {
  DEVICE_OFFSET_X: 40,
  DEVICE_OFFSET_Y: 20,
  DEVICE_WIDTH: 80,
  DEVICE_HEIGHT: 40,
  RANDOM_POSITION_RANGE: 40,
  LINK_OFFSET_SPACING: 6,
  LINK_STROKE_WIDTH: 2,
  DEFAULT_LINK_COLOR: "#64748b",
  TOOLTIP_OFFSET_X: 12,
  TOOLTIP_OFFSET_Y: 10,
  TOOLTIP_PADDING: 4,
  MIN_DRAG_X: 0,
  MIN_DRAG_Y: 0,
};

const SUBNET_COLOR_PALETTE = [
  "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#8b5cf6",
  "#f97316", "#10b981", "#0ea5e9", "#f59e0b", "#f97373"
];

const ENDPOINT_TYPES = ["Host", "Client", "Server", "IoT"];

// ===== DOM REFERENCES =====
const workspace = document.getElementById("workspace");
const linksLayer = document.getElementById("links-layer");
const contextMenu = document.getElementById("context-menu");
const configFileInput = document.getElementById("config-file-input");
const importFileInput = document.getElementById("import-file-input");
const detailsPanel = document.getElementById("details-panel");
const tooltip = document.getElementById("device-tooltip");
const linkDetailsBox = document.getElementById("link-details");

const panelDeviceId = document.getElementById("panel-device-id");
const panelName = document.getElementById("panel-name");
const panelType = document.getElementById("panel-type");
const panelIp = document.getElementById("panel-ip");
const panelConfig = document.getElementById("panel-config");
const panelCloseBtn = document.getElementById("panel-close");
const panelSaveBtn = document.getElementById("panel-save");
const ipError = document.getElementById("ip-error");

const interfacesList = document.getElementById("interfaces-list");
const addInterfaceBtn = document.getElementById("add-interface");

const linkModeBtn = document.getElementById("toggle-link-mode");
const exportBtn = document.getElementById("export-topology");
const importBtn = document.getElementById("import-topology");
const exportConfigSummaryBtn = document.getElementById("export-config-summary");

// ===== STATE =====
let devices = {};
let links = [];
let deviceCounter = 1;
let linkCounter = 1;
let selectedDeviceId = null;
let draggingDeviceEl = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let linkMode = false;
let pendingLinkSourceId = null;
let subnetColorMap = {};
let nextSubnetColorIndex = 0;

// ===== HELPER FUNCTIONS =====
function isEndpointType(type) {
  return ENDPOINT_TYPES.includes(type);
}

function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const octets = ip.split(".");
  if (octets.length !== 4) return false;
  return octets.every((oct) => {
    if (!/^\d+$/.test(oct)) return false;
    const num = Number(oct);
    return num >= 0 && num <= 255;
  });
}

function isValidIPv4Mask(mask) {
  if (!isValidIPv4(mask)) return false;
  const octets = mask.split(".").map(Number);
  let bits = "";
  for (const o of octets) {
    bits += o.toString(2).padStart(8, "0");
  }
  const firstZero = bits.indexOf("0");
  const lastOne = bits.lastIndexOf("1");
  if (firstZero === -1) return true;
  return lastOne < firstZero;
}

function ipToInt(ip) {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function maskToPrefix(mask) {
  const octets = mask.split(".").map(Number);
  let bits = "";
  for (const o of octets) {
    bits += o.toString(2).padStart(8, "0");
  }
  return bits.split("1").length - 1;
}

function getNetworkKey(ip, mask) {
  if (!ip || !mask || !isValidIPv4(ip) || !isValidIPv4Mask(mask)) return null;
  try {
    const ipInt = ipToInt(ip);
    const maskInt = ipToInt(mask);
    const netInt = ipInt & maskInt;
    const prefix = maskToPrefix(mask);
    const a = (netInt >>> 24) & 0xff;
    const b = (netInt >>> 16) & 0xff;
    const c = (netInt >>> 8) & 0xff;
    const d = netInt & 0xff;
    return `${a}.${b}.${c}.${d}/${prefix}`;
  } catch (error) {
    console.error("Error calculating network key:", error);
    return null;
  }
}

function getColorForSubnet(networkKey) {
  if (!networkKey) return CONFIG.DEFAULT_LINK_COLOR;
  if (!subnetColorMap[networkKey]) {
    const color = SUBNET_COLOR_PALETTE[nextSubnetColorIndex % SUBNET_COLOR_PALETTE.length];
    subnetColorMap[networkKey] = color;
    nextSubnetColorIndex++;
  }
  return subnetColorMap[networkKey];
}

function getLinkColor(link) {
  const from = devices[link.fromId];
  const to = devices[link.toId];
  if (!from || !to) return CONFIG.DEFAULT_LINK_COLOR;

  const fromIf = (from.interfaces || []).find((i) => i.name === link.fromIfName);
  const toIf = (to.interfaces || []).find((i) => i.name === link.toIfName);

  if (fromIf && toIf && fromIf.ip && fromIf.mask && toIf.ip && toIf.mask) {
    const key1 = getNetworkKey(fromIf.ip, fromIf.mask);
    const key2 = getNetworkKey(toIf.ip, toIf.mask);
    if (key1 && key2 && key1 === key2) {
      return getColorForSubnet(key1);
    }
  }

  const fromIfs = from.interfaces || [];
  const toIfs = to.interfaces || [];
  let sharedNet = null;

  for (const fi of fromIfs) {
    if (!fi.ip || !fi.mask) continue;
    const k1 = getNetworkKey(fi.ip, fi.mask);
    if (!k1) continue;
    for (const ti of toIfs) {
      if (!ti.ip || !ti.mask) continue;
      const k2 = getNetworkKey(ti.ip, ti.mask);
      if (!k2) continue;
      if (k1 === k2) {
        sharedNet = k1;
        break;
      }
    }
    if (sharedNet) break;
  }

  return sharedNet ? getColorForSubnet(sharedNet) : CONFIG.DEFAULT_LINK_COLOR;
}

// ===== DEVICE MANAGEMENT =====
function addDevice(type) {
  try {
    const id = `D${deviceCounter++}`;
    const rect = workspace.getBoundingClientRect();
    const x = rect.width / 2 - CONFIG.DEVICE_OFFSET_X + 
             (Math.random() * CONFIG.RANDOM_POSITION_RANGE - CONFIG.DEVICE_OFFSET_Y);
    const y = rect.height / 2 - CONFIG.DEVICE_OFFSET_Y + 
             (Math.random() * CONFIG.RANDOM_POSITION_RANGE - CONFIG.DEVICE_OFFSET_Y);

    const deviceData = {
      id,
      type: sanitizeHTML(type),
      name: `${type}-${id}`,
      ip: "",
      config: "",
      x,
      y,
      interfaces: []
    };

    devices[id] = deviceData;
    const el = createDeviceElement(deviceData);
    workspace.appendChild(el);
    renderLinks();
  } catch (error) {
    console.error("Error adding device:", error);
    alert("Failed to add device. Please try again.");
  }
}

function createDeviceElement(device) {
  const el = document.createElement("div");
  el.className = "device";
  el.style.left = `${device.x}px`;
  el.style.top = `${device.y}px`;
  el.dataset.id = device.id;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `${device.type} ${device.name}`);

  const typeDiv = document.createElement("div");
  typeDiv.className = "device-type";
  typeDiv.textContent = device.type;

  const nameDiv = document.createElement("div");
  nameDiv.className = "device-name";
  nameDiv.textContent = device.name;

  const ipDiv = document.createElement("div");
  ipDiv.className = "device-ip";
  ipDiv.textContent = device.ip || "No IP set";

  el.appendChild(typeDiv);
  el.appendChild(nameDiv);
  el.appendChild(ipDiv);

  el.addEventListener("mousedown", (e) => handleDeviceMouseDown(e, device.id, el));
  el.addEventListener("contextmenu", (e) => handleDeviceContextMenu(e, device.id));
  el.addEventListener("dblclick", () => handleDeviceDoubleClick(device.id));
  el.addEventListener("mouseenter", (e) => showTooltipForDevice(device.id, e));
  el.addEventListener("mousemove", (e) => moveTooltip(e));
  el.addEventListener("mouseleave", () => hideTooltip());

  return el;
}

function handleDeviceMouseDown(e, deviceId, el) {
  if (e.button !== 0) return;
  if (linkMode) {
    e.preventDefault();
    handleLinkModeClick(deviceId, el);
    return;
  }
  e.preventDefault();
  draggingDeviceEl = el;
  const rect = el.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
}

function handleDeviceContextMenu(e, deviceId) {
  e.preventDefault();
  selectedDeviceId = deviceId;
  showContextMenu(e.pageX, e.pageY);
}

function handleDeviceDoubleClick(deviceId) {
  selectedDeviceId = deviceId;
  openDetailsPanel();
}

function deleteDevice(deviceId) {
  try {
    const el = workspace.querySelector(`.device[data-id="${deviceId}"]`);
    if (el) el.remove();
    delete devices[deviceId];
    links = links.filter((l) => l.fromId !== deviceId && l.toId !== deviceId);
    renderLinks();
  } catch (error) {
    console.error("Error deleting device:", error);
    alert("Failed to delete device. Please try again.");
  }
}

// ===== TOOLTIP =====
function showTooltipForDevice(deviceId, event) {
  const dev = devices[deviceId];
  if (!dev) return;

  try {
    let html = `<h4>${sanitizeHTML(dev.name)} <span style="opacity:0.7;">(${sanitizeHTML(dev.type)})</span></h4>`;
    html += `<div class="tooltip-line">Mgmt IP: ${sanitizeHTML(dev.ip) || "N/A"}</div>`;

    const ifs = dev.interfaces || [];
    if (ifs.length > 0) {
      html += `<div class="tooltip-section"><div class="tooltip-line"><strong>Interfaces:</strong></div>`;

      if (isEndpointType(dev.type)) {
        ifs.forEach((iface, idx) => {
          const base = sanitizeHTML(iface.name) || `IF${idx + 1}`;
          const kind = iface.kind ? ` [${sanitizeHTML(iface.kind)}]` : "";
          const gw = iface.gateway ? ` gw:${sanitizeHTML(iface.gateway)}` : "";
          const dns = iface.dns ? ` dns:${sanitizeHTML(iface.dns)}` : "";
          html += `<div class="tooltip-line">${base}${kind}: ${sanitizeHTML(iface.ip) || "?"} / ${sanitizeHTML(iface.mask) || "?"}${gw}${dns}</div>`;
        });
      } else {
        ifs.forEach((iface) => {
          const base = sanitizeHTML(iface.name) || "?";
          const mode = sanitizeHTML(iface.mode) || "L3";
          let info = "";
          if (["L3", "Access", "Port-channel(L3)"].includes(iface.mode)) {
            info = `${sanitizeHTML(iface.ip) || "?"} / ${sanitizeHTML(iface.mask) || "?"}`;
          } else if (iface.mode === "Trunk") {
            info = `allowed: ${sanitizeHTML(iface.allowedVlans) || "?"}, native: ${sanitizeHTML(iface.nativeVlan) || "?"}`;
          } else if (iface.mode === "Port-channel(L2)") {
            info = `access: ${sanitizeHTML(iface.pcAccessVlan) || "-"}, trunk: ${sanitizeHTML(iface.pcTrunkVlans) || "-"}`;
          }
          html += `<div class="tooltip-line">${base} [${mode}]: ${info}</div>`;
        });
      }
      html += `</div>`;
    }

    tooltip.innerHTML = html;
    tooltip.classList.remove("hidden");
    tooltip.setAttribute('aria-hidden', 'false');
    moveTooltip(event);
  } catch (error) {
    console.error("Error showing tooltip:", error);
  }
}

function moveTooltip(event) {
  if (tooltip.classList.contains("hidden")) return;
  const wsRect = workspace.getBoundingClientRect();
  let x = event.clientX - wsRect.left + CONFIG.TOOLTIP_OFFSET_X;
  let y = event.clientY - wsRect.top + CONFIG.TOOLTIP_OFFSET_Y;
  const maxX = wsRect.width - tooltip.offsetWidth - CONFIG.TOOLTIP_PADDING;
  const maxY = wsRect.height - tooltip.offsetHeight - CONFIG.TOOLTIP_PADDING;
  x = Math.max(CONFIG.TOOLTIP_PADDING, Math.min(maxX, x));
  y = Math.max(CONFIG.TOOLTIP_PADDING, Math.min(maxY, y));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.add("hidden");
  tooltip.setAttribute('aria-hidden', 'true');
}

// ===== LINK MODE =====
function handleLinkModeClick(deviceId, deviceEl) {
  try {
    if (!pendingLinkSourceId) {
      pendingLinkSourceId = deviceId;
      clearLinkSourceHighlight();
      deviceEl.classList.add("link-source");
      return;
    }

    if (pendingLinkSourceId && pendingLinkSourceId !== deviceId) {
      const fromId = pendingLinkSourceId;
      const toId = deviceId;
      const fromDev = devices[fromId];
      const toDev = devices[toId];

      const fromIfName = chooseInterfaceForLink(fromDev);
      if (!fromIfName) {
        pendingLinkSourceId = null;
        clearLinkSourceHighlight();
        return;
      }
      const toIfName = chooseInterfaceForLink(toDev);
      if (!toIfName) {
        pendingLinkSourceId = null;
        clearLinkSourceHighlight();
        return;
      }

      const id = `L${linkCounter++}`;
      links.push({ id, fromId, fromIfName, toId, toIfName });
    }

    pendingLinkSourceId = null;
    clearLinkSourceHighlight();
    renderLinks();
  } catch (error) {
    console.error("Error in link mode click:", error);
    alert("Failed to create link. Please try again.");
  }
}

function chooseInterfaceForLink(dev) {
  const ifs = dev.interfaces || [];
  if (ifs.length === 0) {
    alert(`Device ${dev.name} has no interfaces configured.`);
    return null;
  }
  if (ifs.length === 1) return ifs[0].name;

  const menuLines = ifs.map((iface, idx) => {
    const label = sanitizeHTML(iface.name) || `IF-${idx + 1}`;
    const ipTxt = sanitizeHTML(iface.ip || iface.pcAccessVlan || iface.allowedVlans) || "?";
    const maskTxt = sanitizeHTML(iface.mask || iface.nativeVlan || iface.pcTrunkVlans) || "";
    return `${idx + 1}) ${label} : ${ipTxt} ${maskTxt ? "/ " + maskTxt : ""}`;
  });
  
  const answer = prompt(
    `Select interface on ${dev.name} (${dev.type}) for this link:\n` +
    menuLines.join("\n")
  );
  
  if (answer === null) return null;
  const idx = parseInt(answer, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= ifs.length) {
    alert("Invalid selection.");
    return null;
  }
  return ifs[idx].name;
}

function clearLinkSourceHighlight() {
  document.querySelectorAll(".device.link-source").forEach((el) => el.classList.remove("link-source"));
}

// ===== DRAGGING =====
document.addEventListener("mousemove", (e) => {
  if (!draggingDeviceEl) return;
  const rect = workspace.getBoundingClientRect();
  let x = e.clientX - rect.left - dragOffsetX;
  let y = e.clientY - rect.top - dragOffsetY;
  x = Math.max(CONFIG.MIN_DRAG_X, Math.min(rect.width - CONFIG.DEVICE_WIDTH, x));
  y = Math.max(CONFIG.MIN_DRAG_Y, Math.min(rect.height - CONFIG.DEVICE_HEIGHT, y));
  draggingDeviceEl.style.left = `${x}px`;
  draggingDeviceEl.style.top = `${y}px`;
  const id = draggingDeviceEl.dataset.id;
  if (devices[id]) {
    devices[id].x = x;
    devices[id].y = y;
  }
  renderLinks();
});

document.addEventListener("mouseup", () => {
  draggingDeviceEl = null;
});

// ===== CONTEXT MENU =====
function showContextMenu(x, y) {
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove("hidden");
  contextMenu.setAttribute('aria-hidden', 'false');
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
  contextMenu.setAttribute('aria-hidden', 'true');
}

document.addEventListener("click", (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});

contextMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  if (!selectedDeviceId || !devices[selectedDeviceId]) {
    hideContextMenu();
    return;
  }

  try {
    switch (action) {
      case "edit":
        openDetailsPanel();
        break;
      case "upload-config":
        triggerConfigUpload();
        break;
      case "delete":
        if (confirm(`Delete device ${devices[selectedDeviceId].name}?`)) {
          deleteDevice(selectedDeviceId);
        }
        break;
    }
  } catch (error) {
    console.error("Context menu action error:", error);
    alert("Failed to perform action. Please try again.");
  }
  hideContextMenu();
});

// ===== DETAILS PANEL =====
function openDetailsPanel() {
  const dev = devices[selectedDeviceId];
  if (!dev) return;

  try {
    detailsPanel.classList.remove("hidden");
    panelDeviceId.textContent = dev.id;
    panelName.value = dev.name;
    panelType.value = dev.type;
    panelIp.value = dev.ip;
    panelConfig.value = dev.config || "";
    document.getElementById("no-selection")?.classList.add("hidden");
    clearIpValidation();
    renderInterfacesForDevice(dev);
  } catch (error) {
    console.error("Error opening details panel:", error);
    alert("Failed to open device settings. Please try again.");
  }
}

panelCloseBtn.addEventListener("click", () => {
  detailsPanel.classList.add("hidden");
  selectedDeviceId = null;
  const noSel = document.getElementById("no-selection");
  if (noSel) noSel.classList.remove("hidden");
});

panelSaveBtn.addEventListener("click", () => {
  if (!selectedDeviceId) return;
  const dev = devices[selectedDeviceId];
  if (!dev) return;

  try {
    const ipValue = panelIp.value.trim();
    if (ipValue && !isValidIPv4(ipValue)) {
      setIpValidationError(true);
      alert("Invalid management IP. Use a valid IPv4 address.");
      return;
    }
    setIpValidationError(false);

    const { interfaces, hasError } = collectInterfacesFromUI(panelType.value);
    if (hasError) {
      alert("One or more interfaces have invalid values.");
      return;
    }

    dev.name = panelName.value || dev.name;
    dev.type = panelType.value || dev.type;
    dev.ip = ipValue;
    dev.config = panelConfig.value || "";
    dev.interfaces = interfaces;

    const el = workspace.querySelector(`.device[data-id="${dev.id}"]`);
    if (el) {
      el.querySelector(".device-type").textContent = dev.type;
      el.querySelector(".device-name").textContent = dev.name;
      el.querySelector(".device-ip").textContent = dev.ip || "No IP set";
      el.setAttribute('aria-label', `${dev.type} ${dev.name}`);
    }
    renderLinks();
  } catch (error) {
    console.error("Error saving device settings:", error);
    alert("Failed to save device settings. Please try again.");
  }
});

function setIpValidationError(hasError) {
  if (hasError) {
    panelIp.classList.add("error");
    ipError.style.display = "block";
    ipError.setAttribute('role', 'alert');
  } else {
    clearIpValidation();
  }
}

function clearIpValidation() {
  panelIp.classList.remove("error");
  ipError.style.display = "none";
  ipError.removeAttribute('role');
}

// ===== INTERFACES =====
function renderInterfacesForDevice(dev) {
  interfacesList.innerHTML = "";
  const ifs = dev.interfaces || [];
  if (isEndpointType(dev.type)) {
    ifs.forEach((iface) => addEndpointInterfaceRow(iface));
  } else {
    ifs.forEach((iface) => addInfraInterfaceRow(iface));
  }
}

function addInfraInterfaceRow(iface = {}) {
  const row = document.createElement("div");
  row.className = "interface-row";
  row.setAttribute('role', 'listitem');
  row.style.gridTemplateColumns = "0.9fr 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr auto";

  const nameVal = sanitizeHTML(iface.name) || "";
  const mode = iface.mode || "L3";
  const ipVal = sanitizeHTML(iface.ip) || "";
  const maskVal = sanitizeHTML(iface.mask) || "";
  const extra1Val = sanitizeHTML(iface.allowedVlans || iface.pcAccessVlan || iface.l2info || "");
  const extra2Val = sanitizeHTML(iface.nativeVlan || iface.pcTrunkVlans || "");

  const modeSelect = document.createElement('select');
  modeSelect.className = 'if-mode';
  modeSelect.setAttribute('aria-label', 'Interface mode');
  const modes = ['L3', 'Access', 'Trunk', 'Port-channel(L2)', 'Port-channel(L3)'];
  modes.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (m === mode) opt.selected = true;
    modeSelect.appendChild(opt);
  });

  const nameInput = document.createElement('input');
  nameInput.className = 'if-name';
  nameInput.placeholder = 'Gig0/0';
  nameInput.value = nameVal;
  nameInput.setAttribute('aria-label', 'Interface name');

  const ipInput = document.createElement('input');
  ipInput.className = 'if-ip';
  ipInput.value = ipVal;
  ipInput.setAttribute('aria-label', 'IP address');

  const maskInput = document.createElement('input');
  maskInput.className = 'if-mask';
  maskInput.value = maskVal;
  maskInput.setAttribute('aria-label', 'Subnet mask');

  const extra1Input = document.createElement('input');
  extra1Input.className = 'if-extra1';
  extra1Input.value = extra1Val;

  const extra2Input = document.createElement('input');
  extra2Input.className = 'if-extra2';
  extra2Input.value = extra2Val;

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'if-delete';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', 'Delete interface');

  row.appendChild(modeSelect);
  row.appendChild(nameInput);
  row.appendChild(ipInput);
  row.appendChild(maskInput);
  row.appendChild(extra1Input);
  row.appendChild(extra2Input);
  row.appendChild(delBtn);

  modeSelect.addEventListener("change", () => updateInfraRowVisibility(row));
  delBtn.addEventListener("click", () => row.remove());

  updateInfraRowVisibility(row);
  interfacesList.appendChild(row);
}

function updateInfraRowVisibility(row) {
  const mode = row.querySelector(".if-mode").value;
  const ipInput = row.querySelector(".if-ip");
  const maskInput = row.querySelector(".if-mask");
  const extra1Input = row.querySelector(".if-extra1");
  const extra2Input = row.querySelector(".if-extra2");

  ipInput.style.display = "";
  maskInput.style.display = "";
  extra1Input.style.display = "";
  extra2Input.style.display = "";

  if (mode === "L3" || mode === "Access" || mode === "Port-channel(L3)") {
    ipInput.placeholder = "192.168.1.1";
    maskInput.placeholder = "255.255.255.0";
    extra1Input.style.display = "none";
    extra2Input.style.display = "none";
  } else if (mode === "Trunk") {
    ipInput.style.display = "none";
    maskInput.style.display = "none";
    extra1Input.placeholder = "Allowed VLANs (e.g. 10,20)";
    extra2Input.placeholder = "Native VLAN (e.g. 10)";
    extra1Input.setAttribute('aria-label', 'Allowed VLANs');
    extra2Input.setAttribute('aria-label', 'Native VLAN');
  } else if (mode === "Port-channel(L2)") {
    ipInput.style.display = "none";
    maskInput.style.display = "none";
    extra1Input.placeholder = "Access VLAN (optional)";
    extra2Input.placeholder = "Trunk VLANs (e.g. 10,20)";
    extra1Input.setAttribute('aria-label', 'Access VLAN');
    extra2Input.setAttribute('aria-label', 'Trunk VLANs');
  }
}

function addEndpointInterfaceRow(iface = {}) {
  const row = document.createElement("div");
  row.className = "interface-row";
  row.setAttribute('role', 'listitem');
  row.style.gridTemplateColumns = "0.9fr 1.2fr 1.2fr 1.2fr 1.2fr auto";

  const kind = iface.kind || "NIC";

  const kindSelect = document.createElement('select');
  kindSelect.className = 'if-kind';
  kindSelect.setAttribute('aria-label', 'Interface kind');
  ['NIC', 'WIFI'].forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === kind) opt.selected = true;
    kindSelect.appendChild(opt);
  });

  const ipInput = document.createElement('input');
  ipInput.className = 'if-ip';
  ipInput.placeholder = '192.168.1.10';
  ipInput.value = sanitizeHTML(iface.ip) || '';
  ipInput.setAttribute('aria-label', 'IP address');

  const maskInput = document.createElement('input');
  maskInput.className = 'if-mask';
  maskInput.placeholder = '255.255.255.0';
  maskInput.value = sanitizeHTML(iface.mask) || '';
  maskInput.setAttribute('aria-label', 'Subnet mask');

  const gwInput = document.createElement('input');
  gwInput.className = 'if-gw';
  gwInput.placeholder = '192.168.1.1';
  gwInput.value = sanitizeHTML(iface.gateway) || '';
  gwInput.setAttribute('aria-label', 'Gateway');

  const dnsInput = document.createElement('input');
  dnsInput.className = 'if-dns';
  dnsInput.placeholder = '8.8.8.8';
  dnsInput.value = sanitizeHTML(iface.dns) || '';
  dnsInput.setAttribute('aria-label', 'DNS server');

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'if-delete';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', 'Delete interface');

  row.appendChild(kindSelect);
  row.appendChild(ipInput);
  row.appendChild(maskInput);
  row.appendChild(gwInput);
  row.appendChild(dnsInput);
  row.appendChild(delBtn);

  delBtn.addEventListener("click", () => row.remove());
  interfacesList.appendChild(row);
}

addInterfaceBtn.addEventListener("click", () => {
  if (!selectedDeviceId) return;
  const dev = devices[selectedDeviceId];
  if (!dev) return;
  if (isEndpointType(dev.type)) {
    addEndpointInterfaceRow();
  } else {
    addInfraInterfaceRow();
  }
});

panelType.addEventListener("change", () => {
  if (!selectedDeviceId) return;
  const dev = devices[selectedDeviceId];
  if (!dev) return;
  dev.type = panelType.value;
  renderInterfacesForDevice(dev);
});

function collectInterfacesFromUI(devType) {
  const rows = interfacesList.querySelectorAll(".interface-row");
  const interfaces = [];
  let hasError = false;

  if (isEndpointType(devType)) {
    rows.forEach((row, idx) => {
      const kindSel = row.querySelector(".if-kind");
      const ipInput = row.querySelector(".if-ip");
      const maskInput = row.querySelector(".if-mask");
      const gwInput = row.querySelector(".if-gw");
      const dnsInput = row.querySelector(".if-dns");

      const kind = kindSel.value;
      const ip = ipInput.value.trim();
      const mask = maskInput.value.trim();
      const gw = gwInput.value.trim();
      const dns = dnsInput.value.trim();

      ipInput.classList.remove("error");
      maskInput.classList.remove("error");
      gwInput.classList.remove("error");
      dnsInput.classList.remove("error");

      if (!ip && !mask && !gw && !dns) return;

      let rowErr = false;
      if (!ip || !isValidIPv4(ip)) {
        ipInput.classList.add("error");
        rowErr = true;
      }
      if (!mask || !isValidIPv4Mask(mask)) {
        maskInput.classList.add("error");
        rowErr = true;
      }
      if (gw && !isValidIPv4(gw)) {
        gwInput.classList.add("error");
        rowErr = true;
      }
      if (dns && !isValidIPv4(dns)) {
        dnsInput.classList.add("error");
        rowErr = true;
      }

      if (rowErr) {
        hasError = true;
        return;
      }

      const name = ifaceNameFromEndpoint(kind, idx);
      interfaces.push({ name, kind, ip, mask, gateway: gw, dns });
    });
  } else {
    rows.forEach((row) => {
      const modeSel = row.querySelector(".if-mode");
      const nameInput = row.querySelector(".if-name");
      const ipInput = row.querySelector(".if-ip");
      const maskInput = row.querySelector(".if-mask");
      const extra1Input = row.querySelector(".if-extra1");
      const extra2Input = row.querySelector(".if-extra2");

      const mode = modeSel.value;
      const name = nameInput.value.trim();
      const ip = ipInput.value.trim();
      const mask = maskInput.value.trim();
      const extra1 = extra1Input.value.trim();
      const extra2 = extra2Input.value.trim();

      nameInput.classList.remove("error");
      ipInput.classList.remove("error");
      maskInput.classList.remove("error");

      if (!name && !ip && !mask && !extra1 && !extra2) return;

      let rowErr = false;
      if (!name) {
        nameInput.classList.add("error");
        rowErr = true;
      }

      if (["L3", "Access", "Port-channel(L3)"].includes(mode)) {
        if (ip || mask) {
          if (!ip || !isValidIPv4(ip)) {
            ipInput.classList.add("error");
            rowErr = true;
          }
          if (!mask || !isValidIPv4Mask(mask)) {
            maskInput.classList.add("error");
            rowErr = true;
          }
        }
      } else {
        if (ip || mask) {
          ipInput.classList.add("error");
          maskInput.classList.add("error");
          rowErr = true;
        }
      }

      if (rowErr) {
        hasError = true;
        return;
      }

      const iface = { name, mode };

      if (["L3", "Access", "Port-channel(L3)"].includes(mode)) {
        iface.ip = ip || "";
        iface.mask = mask || "";
      } else if (mode === "Trunk") {
        iface.allowedVlans = extra1;
        iface.nativeVlan = extra2;
      } else if (mode === "Port-channel(L2)") {
        iface.pcAccessVlan = extra1;
        iface.pcTrunkVlans = extra2;
      }

      interfaces.push(iface);
    });
  }

  return { interfaces, hasError };
}

function ifaceNameFromEndpoint(kind, index) {
  const base = kind === "WIFI" ? "WIFI" : "NIC";
  return `${base}${index + 1}`;
}

// ===== CONFIG UPLOAD =====
function triggerConfigUpload() {
  if (!selectedDeviceId) return;
  configFileInput.value = "";
  configFileInput.click();
}

configFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file || !selectedDeviceId) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const dev = devices[selectedDeviceId];
      if (!dev) return;
      dev.config = text;

      if (!detailsPanel.classList.contains("hidden") && panelDeviceId.textContent === dev.id) {
        panelConfig.value = text;
      }
      alert(`Config imported for ${dev.name} (${dev.id})`);
    } catch (error) {
      console.error("Error loading config file:", error);
      alert("Failed to load configuration file. Please try again.");
    }
  };
  reader.onerror = () => {
    console.error("File reading error:", reader.error);
    alert("Failed to read file. Please try again.");
  };
  reader.readAsText(file);
});

// ===== LINK RENDERING =====
function renderLinks() {
  try {
    const wsRect = workspace.getBoundingClientRect();
    const width = workspace.clientWidth;
    const height = workspace.clientHeight;

    linksLayer.setAttribute("width", width);
    linksLayer.setAttribute("height", height);
    linksLayer.innerHTML = "";

    const groups = {};
    links.forEach((link) => {
      const key = [link.fromId, link.toId].sort().join("|");
      if (!groups[key]) groups[key] = [];
      groups[key].push(link);
    });

    Object.values(groups).forEach((group) => {
      const n = group.length;
      group.forEach((link, indexInGroup) => {
        const fromEl = workspace.querySelector(`.device[data-id="${link.fromId}"]`);
        const toEl = workspace.querySelector(`.device[data-id="${link.toId}"]`);
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = fromRect.left - wsRect.left + fromRect.width / 2;
        const y1 = fromRect.top - wsRect.top + fromRect.height / 2;
        const x2 = toRect.left - wsRect.left + toRect.width / 2;
        const y2 = toRect.top - wsRect.top + toRect.height / 2;

        let x1o = x1;
        let y1o = y1;
        let x2o = x2;
        let y2o = y2;

        if (n > 1) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const px = -dy / len;
          const py = dx / len;
          const offsetIndex = indexInGroup - (n - 1) / 2;
          const offset = CONFIG.LINK_OFFSET_SPACING * offsetIndex;

          x1o += px * offset;
          y1o += py * offset;
          x2o += px * offset;
          y2o += py * offset;
        }

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1o);
        line.setAttribute("y1", y1o);
        line.setAttribute("x2", x2o);
        line.setAttribute("y2", y2o);
        line.setAttribute("stroke-width", CONFIG.LINK_STROKE_WIDTH);
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("pointer-events", "stroke");
        line.setAttribute("aria-label", `Link ${link.id}`);

        const color = getLinkColor(link);
        line.setAttribute("stroke", color);

        line.addEventListener("click", (e) => {
          e.stopPropagation();
          showLinkDetails(link);
        });

        linksLayer.appendChild(line);
      });
    });
  } catch (error) {
    console.error("Error rendering links:", error);
  }
}

window.addEventListener("resize", () => {
  renderLinks();
});

// ===== LINK DETAILS =====
function showLinkDetails(link) {
  try {
    const from = devices[link.fromId];
    const to = devices[link.toId];
    if (!from || !to) return;

    const fromIf = (from.interfaces || []).find((i) => i.name === link.fromIfName);
    const toIf = (to.interfaces || []).find((i) => i.name === link.toIfName);

    const fromLabel = fromIf
      ? `${sanitizeHTML(from.name)} (${sanitizeHTML(fromIf.name) || "IF"})`
      : sanitizeHTML(from.name);
    const toLabel = toIf
      ? `${sanitizeHTML(to.name)} (${sanitizeHTML(toIf.name) || "IF"})`
      : sanitizeHTML(to.name);

    let netKey = null;
    if (fromIf && toIf && fromIf.ip && fromIf.mask && toIf.ip && toIf.mask) {
      const k1 = getNetworkKey(fromIf.ip, fromIf.mask);
      const k2 = getNetworkKey(toIf.ip, toIf.mask);
      if (k1 && k2 && k1 === k2) netKey = k1;
    }

    const color = getLinkColor(link);

    let html = `<h4>Link ${sanitizeHTML(link.id)}</h4>`;
    html += `<div class="detail-line"><strong>Endpoints:</strong> ${fromLabel}  ⇄  ${toLabel}</div>`;

    if (fromIf) {
      html += `<div class="detail-line">${sanitizeHTML(from.name)} ${sanitizeHTML(fromIf.name) || ""}: ${sanitizeHTML(fromIf.ip) || "?"} ${fromIf.mask ? "/ " + sanitizeHTML(fromIf.mask) : ""}</div>`;
    }
    if (toIf) {
      html += `<div class="detail-line">${sanitizeHTML(to.name)} ${sanitizeHTML(toIf.name) || ""}: ${sanitizeHTML(toIf.ip) || "?"} ${toIf.mask ? "/ " + sanitizeHTML(toIf.mask) : ""}</div>`;
    }

    if (netKey) {
      html += `<div class="detail-line"><strong>Subnet:</strong> ${sanitizeHTML(netKey)}</div>`;
    } else {
      html += `<div class="detail-line"><strong>Subnet:</strong> none / not matching</div>`;
    }

    html += `<div class="detail-line"><strong>Color:</strong> <span style="color:${sanitizeHTML(color)};">■■■</span> ${sanitizeHTML(color)}</div>`;
    html += `<button class="link-delete-btn delete-link-btn" aria-label="Delete this link">Delete link</button>`;
    html += `<div class="detail-line" style="margin-top:4px;opacity:0.7;">Click in empty workspace or press Esc to hide.</div>`;

    linkDetailsBox.innerHTML = html;
    linkDetailsBox.classList.remove("hidden");
    linkDetailsBox.setAttribute('aria-hidden', 'false');

    const delBtn = linkDetailsBox.querySelector(".delete-link-btn");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        if (confirm("Delete this link?")) {
          links = links.filter((l) => l.id !== link.id);
          hideLinkDetails();
          renderLinks();
        }
      });
    }
  } catch (error) {
    console.error("Error showing link details:", error);
    alert("Failed to show link details. Please try again.");
  }
}

function hideLinkDetails() {
  linkDetailsBox.classList.add("hidden");
  linkDetailsBox.setAttribute('aria-hidden', 'true');
}

workspace.addEventListener("click", (e) => {
  if (e.target.closest(".device")) return;
  hideLinkDetails();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideLinkDetails();
});

// ===== EXPORT/IMPORT =====
function exportTopology() {
  try {
    const data = {
      devices: Object.values(devices),
      links,
      version: "2.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export error:", error);
    alert("Failed to export topology. Please try again.");
  }
}

function loadTopologyFromObject(data) {
  try {
    devices = {};
    links = [];
    deviceCounter = 1;
    linkCounter = 1;
    subnetColorMap = {};
    nextSubnetColorIndex = 0;

    document.querySelectorAll(".device").forEach((el) => el.remove());

    if (Array.isArray(data.devices)) {
      data.devices.forEach((dev) => {
        dev.interfaces = Array.isArray(dev.interfaces) ? dev.interfaces : [];
        devices[dev.id] = dev;
        const el = createDeviceElement(dev);
        workspace.appendChild(el);

        const match = /^D(\d+)$/.exec(dev.id);
        if (match) {
          const num = Number(match[1]);
          if (num >= deviceCounter) deviceCounter = num + 1;
        }
      });
    }

    if (Array.isArray(data.links)) {
      links = data.links.map((l) => {
        const match = /^L(\d+)$/.exec(l.id);
        if (match) {
          const num = Number(match[1]);
          if (num >= linkCounter) linkCounter = num + 1;
        }
        return l;
      });
    }

    renderLinks();
  } catch (error) {
    console.error("Import error:", error);
    alert("Failed to load topology. The file may be corrupted or invalid.");
  }
}

function exportConfigSummary() {
  try {
    const devs = Object.values(devices).sort((a, b) => a.id.localeCompare(b.id));
    let lines = [];
    
    devs.forEach((dev, idx) => {
      lines.push(`! ===============================`);
      lines.push(`! Device: ${dev.name} (${dev.id})`);
      lines.push(`! Type  : ${dev.type}`);
      lines.push(`! ===============================`);
      lines.push(`hostname ${dev.name}`);
      lines.push(`!`);

      if (dev.ip) {
        lines.push(`! Management IP`);
        lines.push(`! ip address ${dev.ip}`);
        lines.push(`!`);
      }

      (dev.interfaces || []).forEach((iface) => {
        const ifName = iface.name || "Gig0/0";
        const mode = iface.mode || (iface.kind ? "Endpoint" : "L3");

        lines.push(`interface ${ifName}`);

        if (["L3", "Access", "Port-channel(L3)"].includes(mode) && iface.ip && iface.mask) {
          lines.push(` ip address ${iface.ip} ${iface.mask}`);
          if (mode === "Access") lines.push(` ! L3 access port`);
          if (mode === "Port-channel(L3)") lines.push(` ! L3 port-channel`);
        } else if (mode === "Trunk") {
          lines.push(` switchport trunk encapsulation dot1q`);
          lines.push(` switchport mode trunk`);
          if (iface.allowedVlans) {
            lines.push(` switchport trunk allowed vlan ${iface.allowedVlans}`);
          }
          if (iface.nativeVlan) {
            lines.push(` switchport trunk native vlan ${iface.nativeVlan}`);
          }
        } else if (mode === "Port-channel(L2)") {
          if (iface.pcAccessVlan) {
            lines.push(` switchport mode access`);
            lines.push(` switchport access vlan ${iface.pcAccessVlan}`);
          }
          if (iface.pcTrunkVlans) {
            lines.push(` switchport trunk encapsulation dot1q`);
            lines.push(` switchport mode trunk`);
            lines.push(` switchport trunk allowed vlan ${iface.pcTrunkVlans}`);
          }
        }

        if (iface.gateway || iface.dns) {
          if (iface.gateway) lines.push(` ! default-gateway ${iface.gateway}`);
          if (iface.dns) lines.push(` ! dns-server ${iface.dns}`);
        }

        lines.push(` no shutdown`);
        lines.push(`!`);
      });

      if (dev.config && dev.config.trim()) {
        lines.push(`! Original pasted config`);
        lines.push(...dev.config.split(/\r?\n/).map((l) => `! ${l}`));
      }

      if (idx < devs.length - 1) {
        lines.push(`!`);
        lines.push(`! ------------------------------------`);
        lines.push(`!`);
      }
    });

    if (lines.length === 0) {
      lines.push("! No devices in topology.");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-config-summary-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Config export error:", error);
    alert("Failed to export configuration. Please try again.");
  }
}

// ===== TOOLBAR =====
document.querySelectorAll('.toolbar button[data-device-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.deviceType || 'Device';
    addDevice(type);
  });
});

linkModeBtn.addEventListener("click", () => {
  linkMode = !linkMode;
  linkModeBtn.classList.toggle("active", linkMode);
  linkModeBtn.textContent = linkMode ? "Link mode: ON" : "Link mode: OFF";
  linkModeBtn.setAttribute('aria-pressed', linkMode ? 'true' : 'false');
  pendingLinkSourceId = null;
  clearLinkSourceHighlight();
});

exportBtn.addEventListener("click", exportTopology);
importBtn.addEventListener("click", () => {
  importFileInput.value = "";
  importFileInput.click();
});

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadTopologyFromObject(data);
      alert("Topology imported successfully.");
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import topology. Invalid JSON file.");
    }
  };
  reader.onerror = () => {
    console.error("File reading error:", reader.error);
    alert("Failed to read file. Please try again.");
  };
  reader.readAsText(file);
});

exportConfigSummaryBtn.addEventListener("click", exportConfigSummary);

// ===== INITIALIZATION =====
function init() {
  try {
    addDevice("Router");
    console.log("Network Topology Builder v2.0 initialized");
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Failed to initialize the application. Please reload the page.");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===== GLOBAL ERROR HANDLING =====
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
