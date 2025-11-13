// --- DOM references ---
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

// --- Helpers for types ---
function isEndpointType(type) {
  return ["Host", "Client", "Server", "IoT"].includes(type);
}

// --- State ---
let devices = {};            // id -> { id, type, name, ip, config, x, y, interfaces: [] }
let links = [];              // { id, fromId, fromIfName, toId, toIfName }
let deviceCounter = 1;
let linkCounter = 1;
let selectedDeviceId = null;

// Dragging state
let draggingDeviceEl = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Link mode state
let linkMode = false;
let pendingLinkSourceId = null;

// Subnet color mapping
const subnetColorPalette = [
  "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#8b5cf6",
  "#f97316", "#10b981", "#0ea5e9", "#f59e0b", "#f97373"
];
let subnetColorMap = {}; // key: "network/prefix" -> color
let nextSubnetColorIndex = 0;

// --- Toolbar: add devices ---
document.querySelectorAll('.toolbar button[data-device-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.deviceType || 'Device';
    addDevice(type);
  });
});

// --- Link mode toggle ---
linkModeBtn.addEventListener("click", () => {
  linkMode = !linkMode;
  linkModeBtn.classList.toggle("active", linkMode);
  linkModeBtn.textContent = linkMode ? "Link mode: ON" : "Link mode: OFF";
  pendingLinkSourceId = null;
  clearLinkSourceHighlight();
});

// --- Export / Import buttons ---
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
      alert("Topology imported.");
    } catch (err) {
      console.error(err);
      alert("Failed to import topology (invalid JSON).");
    }
  };
  reader.readAsText(file);
});

// --- Cisco-style config summary export ---
exportConfigSummaryBtn.addEventListener("click", exportConfigSummary);

// --- Type change in panel: re-render interface UI (infra vs endpoints) ---
panelType.addEventListener("change", () => {
  if (!selectedDeviceId) return;
  const dev = devices[selectedDeviceId];
  if (!dev) return;
  dev.type = panelType.value;
  renderInterfacesForDevice(dev);
});

// --- Add device ---
function addDevice(type) {
  const id = `D${deviceCounter++}`;

  const rect = workspace.getBoundingClientRect();
  const x = rect.width / 2 - 40 + (Math.random() * 40 - 20);
  const y = rect.height / 2 - 20 + (Math.random() * 40 - 20);

  const deviceData = {
    id,
    type,
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
}

function createDeviceElement(device) {
  const el = document.createElement("div");
  el.className = "device";
  el.style.left = `${device.x}px`;
  el.style.top = `${device.y}px`;
  el.dataset.id = device.id;

  el.innerHTML = `
    <div class="device-type">${device.type}</div>
    <div class="device-name">${device.name}</div>
    <div class="device-ip">${device.ip || "No IP set"}</div>
  `;

  // Dragging with left mouse button OR link mode click
  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    if (linkMode) {
      // In link mode: clicking picks endpoints instead of dragging
      e.preventDefault();
      handleLinkModeClick(device.id, el);
      return;
    }

    // Normal dragging
    e.preventDefault();
    draggingDeviceEl = el;
    const rect = el.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });

  // Right-click menu on device
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    selectedDeviceId = device.id;
    showContextMenu(e.pageX, e.pageY);
  });

  // Double-click = open settings panel
  el.addEventListener("dblclick", () => {
    selectedDeviceId = device.id;
    openDetailsPanel();
  });

  // Hover tooltip: show interfaces and mgmt IP
  el.addEventListener("mouseenter", (e) => {
    showTooltipForDevice(device.id, e);
  });

  el.addEventListener("mousemove", (e) => {
    moveTooltip(e);
  });

  el.addEventListener("mouseleave", () => {
    hideTooltip();
  });

  return el;
}

// --- Hover tooltip helpers ---
function showTooltipForDevice(deviceId, event) {
  const dev = devices[deviceId];
  if (!dev) return;

  let html = `<h4>${dev.name} <span style="opacity:0.7;">(${dev.type})</span></h4>`;
  html += `<div class="tooltip-line">Mgmt IP: ${dev.ip || "N/A"}</div>`;

  const ifs = dev.interfaces || [];
  if (ifs.length > 0) {
    html += `<div class="tooltip-section"><div class="tooltip-line"><strong>Interfaces:</strong></div>`;
    ifs.forEach((iface) => {
      const base = iface.name || "?";
      const kind = iface.kind ? ` [${iface.kind}]` : "";
      const gw = iface.gateway ? ` gw:${iface.gateway}` : "";
      const dns = iface.dns ? ` dns:${iface.dns}` : "";
      html += `<div class="tooltip-line">${base}${kind}: ${iface.ip || "?"} / ${iface.mask || "?"}${gw}${dns}</div>`;
    });
    html += `</div>`;
  }

  tooltip.innerHTML = html;
  tooltip.classList.remove("hidden");
  moveTooltip(event);
}

function moveTooltip(event) {
  if (tooltip.classList.contains("hidden")) return;
  const wsRect = workspace.getBoundingClientRect();
  const offsetX = 12;
  const offsetY = 10;
  let x = event.clientX - wsRect.left + offsetX;
  let y = event.clientY - wsRect.top + offsetY;

  const maxX = wsRect.width - tooltip.offsetWidth - 4;
  const maxY = wsRect.height - tooltip.offsetHeight - 4;
  x = Math.max(4, Math.min(maxX, x));
  y = Math.max(4, Math.min(maxY, y));

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.add("hidden");
}

// --- Link mode click handler (attach to interfaces) ---
function handleLinkModeClick(deviceId, deviceEl) {
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

    // Allow multiple links between same devices/interfaces
    const id = `L${linkCounter++}`;
    links.push({ id, fromId, fromIfName, toId, toIfName });
  }

  pendingLinkSourceId = null;
  clearLinkSourceHighlight();
  renderLinks();
}

function chooseInterfaceForLink(dev) {
  const ifs = dev.interfaces || [];
  if (ifs.length === 0) {
    alert(`Device ${dev.name} has no interfaces configured.`);
    return null;
  }
  if (ifs.length === 1) return ifs[0].name;

  const menuLines = ifs.map((iface, idx) => {
    const label = iface.name || `IF-${idx + 1}`;
    return `${idx + 1}) ${label} : ${iface.ip || "?"} / ${iface.mask || "?"}`;
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
  document
    .querySelectorAll(".device.link-source")
    .forEach((el) => el.classList.remove("link-source"));
}

// --- Dragging logic ---
document.addEventListener("mousemove", (e) => {
  if (!draggingDeviceEl) return;
  const rect = workspace.getBoundingClientRect();
  let x = e.clientX - rect.left - dragOffsetX;
  let y = e.clientY - rect.top - dragOffsetY;

  x = Math.max(0, Math.min(rect.width - 80, x));
  y = Math.max(0, Math.min(rect.height - 40, y));

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

// --- Context menu logic ---
function showContextMenu(x, y) {
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove("hidden");
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
}

document.addEventListener("click", (e) => {
  if (!contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

contextMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  if (!selectedDeviceId || !devices[selectedDeviceId]) {
    hideContextMenu();
    return;
  }

  switch (action) {
    case "edit":
      openDetailsPanel();
      break;
    case "upload-config":
      triggerConfigUpload();
      break;
    case "delete":
      deleteDevice(selectedDeviceId);
      break;
  }

  hideContextMenu();
});

// --- Details panel ---
function openDetailsPanel() {
  const dev = devices[selectedDeviceId];
  if (!dev) return;

  detailsPanel.classList.remove("hidden");
  panelDeviceId.textContent = dev.id;
  panelName.value = dev.name;
  panelType.value = dev.type;
  panelIp.value = dev.ip;
  panelConfig.value = dev.config || "";

  document.getElementById("no-selection")?.classList.add("hidden");
  clearIpValidation();
  renderInterfacesForDevice(dev);
}

panelCloseBtn.addEventListener("click", () => {
  detailsPanel.classList.add("hidden");
});

panelSaveBtn.addEventListener("click", () => {
  if (!selectedDeviceId) return;
  const dev = devices[selectedDeviceId];
  if (!dev) return;

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
  }

  renderLinks();
});

// --- Interfaces UI ---
function renderInterfacesForDevice(dev) {
  interfacesList.innerHTML = "";
  const ifs = dev.interfaces || [];

  if (isEndpointType(dev.type)) {
    ifs.forEach((iface) => {
      addEndpointInterfaceRow(iface);
    });
  } else {
    ifs.forEach((iface) => {
      addInfraInterfaceRow(iface);
    });
  }
}

// Infra: name + ip + mask  (NO MORE RANDOM RENAMING)
function addInfraInterfaceRow(iface = {}) {
  const row = document.createElement("div");
  row.className = "interface-row";
  row.style.gridTemplateColumns = "1.2fr 1.2fr 1.2fr auto";

  const nameVal = iface.name || "";

  row.innerHTML = `
    <input class="if-name" placeholder="Gig0/0" value="${nameVal}">
    <input class="if-ip" placeholder="192.168.1.1" value="${iface.ip || ""}">
    <input class="if-mask" placeholder="255.255.255.0" value="${iface.mask || ""}">
    <button type="button" class="if-delete">✕</button>
  `;

  row.querySelector(".if-delete").addEventListener("click", () => row.remove());
  interfacesList.appendChild(row);
}

// Endpoint: kind (NIC/WIFI) + ip + mask + gw + dns
function addEndpointInterfaceRow(iface = {}) {
  const row = document.createElement("div");
  row.className = "interface-row";
  row.style.gridTemplateColumns = "0.9fr 1.2fr 1.2fr 1.2fr 1.2fr auto";

  const kind = iface.kind || "NIC";

  row.innerHTML = `
    <select class="if-kind">
      <option value="NIC"${kind === "NIC" ? " selected" : ""}>NIC</option>
      <option value="WIFI"${kind === "WIFI" ? " selected" : ""}>WIFI</option>
    </select>
    <input class="if-ip" placeholder="192.168.1.10" value="${iface.ip || ""}">
    <input class="if-mask" placeholder="255.255.255.0" value="${iface.mask || ""}">
    <input class="if-gw" placeholder="192.168.1.1" value="${iface.gateway || ""}">
    <input class="if-dns" placeholder="8.8.8.8" value="${iface.dns || ""}">
    <button type="button" class="if-delete">✕</button>
  `;

  row.querySelector(".if-delete").addEventListener("click", () => row.remove());
  interfacesList.appendChild(row);
}

// Add-interface button respects device type
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

// Collect interfaces from UI
function collectInterfacesFromUI(devType) {
  const rows = interfacesList.querySelectorAll(".interface-row");
  const interfaces = [];
  let hasError = false;

  if (isEndpointType(devType)) {
    rows.forEach((row) => {
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

      // Endpoint interfaces don't expose a name field – we can synthesize one if needed
      const name = ifaceNameFromEndpoint(kind, interfaces.length);
      interfaces.push({ name, kind, ip, mask, gateway: gw, dns });
    });
  } else {
    rows.forEach((row) => {
      const nameInput = row.querySelector(".if-name");
      const ipInput = row.querySelector(".if-ip");
      const maskInput = row.querySelector(".if-mask");

      const name = nameInput.value.trim();
      const ip = ipInput.value.trim();
      const mask = maskInput.value.trim();

      nameInput.classList.remove("error");
      ipInput.classList.remove("error");
      maskInput.classList.remove("error");

      if (!name && !ip && !mask) return;

      let rowErr = false;
      if (!name) {
        nameInput.classList.add("error");
        rowErr = true;
      }
      if (!ip || !isValidIPv4(ip)) {
        ipInput.classList.add("error");
        rowErr = true;
      }
      if (!mask || !isValidIPv4Mask(mask)) {
        maskInput.classList.add("error");
        rowErr = true;
      }

      if (rowErr) {
        hasError = true;
        return;
      }

      // IMPORTANT: use the name exactly as the user typed it (g0/0 stays g0/0)
      interfaces.push({ name, ip, mask });
    });
  }

  return { interfaces, hasError };
}

function ifaceNameFromEndpoint(kind, index) {
  // For endpoints (client/server/host/IoT) we can name internal interfaces NIC1/WIFI1 etc.
  const base = kind === "WIFI" ? "WIFI" : "NIC";
  return `${base}${index + 1}`;
}

// --- IP validation helpers ---
function isValidIPv4(ip) {
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

function setIpValidationError(hasError) {
  if (hasError) {
    panelIp.classList.add("error");
    ipError.style.display = "block";
  } else {
    clearIpValidation();
  }
}

function clearIpValidation() {
  panelIp.classList.remove("error");
  ipError.style.display = "none";
}

// --- Upload config file ---
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
    const text = reader.result;
    const dev = devices[selectedDeviceId];
    if (!dev) return;
    dev.config = text;

    if (
      !detailsPanel.classList.contains("hidden") &&
      panelDeviceId.textContent === dev.id
    ) {
      panelConfig.value = text;
    }

    alert(`Config imported for ${dev.name} (${dev.id})`);
  };
  reader.readAsText(file);
});

// --- Delete device ---
function deleteDevice(deviceId) {
  const el = workspace.querySelector(`.device[data-id="${deviceId}"]`);
  if (el) el.remove();
  delete devices[deviceId];

  links = links.filter((l) => l.fromId !== deviceId && l.toId !== deviceId);
  renderLinks();
}

// --- Subnet helpers & colors ---
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
  const ipInt = ipToInt(ip);
  const maskInt = ipToInt(mask);
  const netInt = ipInt & maskInt;
  const prefix = maskToPrefix(mask);
  const a = (netInt >>> 24) & 0xff;
  const b = (netInt >>> 16) & 0xff;
  const c = (netInt >>> 8) & 0xff;
  const d = netInt & 0xff;
  return `${a}.${b}.${c}.${d}/${prefix}`;
}

function getColorForSubnet(networkKey) {
  if (!networkKey) return "#64748b";
  if (!subnetColorMap[networkKey]) {
    const color = subnetColorPalette[nextSubnetColorIndex % subnetColorPalette.length];
    subnetColorMap[networkKey] = color;
    nextSubnetColorIndex++;
  }
  return subnetColorMap[networkKey];
}

function getLinkColor(link) {
  const from = devices[link.fromId];
  const to = devices[link.toId];
  if (!from || !to) return "#64748b";

  const fromIf = (from.interfaces || []).find((i) => i.name === link.fromIfName);
  const toIf = (to.interfaces || []).find((i) => i.name === link.toIfName);

  if (fromIf && toIf) {
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
    const k1 = getNetworkKey(fi.ip, fi.mask);
    if (!k1) continue;
    for (const ti of toIfs) {
      const k2 = getNetworkKey(ti.ip, ti.mask);
      if (!k2) continue;
      if (k1 === k2) {
        sharedNet = k1;
        break;
      }
    }
    if (sharedNet) break;
  }

  if (!sharedNet) return "#64748b";
  return getColorForSubnet(sharedNet);
}

// --- Link details panel ---
function showLinkDetails(link) {
  const from = devices[link.fromId];
  const to = devices[link.toId];
  if (!from || !to) return;

  const fromIf = (from.interfaces || []).find((i) => i.name === link.fromIfName);
  const toIf = (to.interfaces || []).find((i) => i.name === link.toIfName);

  const fromLabel = fromIf
    ? `${from.name} (${fromIf.name || "IF"})`
    : `${from.name}`;
  const toLabel = toIf
    ? `${to.name} (${toIf.name || "IF"})`
    : `${to.name}`;

  let netKey = null;
  if (fromIf && toIf) {
    const k1 = getNetworkKey(fromIf.ip, fromIf.mask);
    const k2 = getNetworkKey(toIf.ip, toIf.mask);
    if (k1 && k2 && k1 === k2) netKey = k1;
  }

  const color = getLinkColor(link);

  let html = `<h4>Link ${link.id}</h4>`;
  html += `<div class="detail-line"><strong>Endpoints:</strong> ${fromLabel}  ⇄  ${toLabel}</div>`;

  if (fromIf) {
    html += `<div class="detail-line">${from.name} ${fromIf.name || ""}: ${fromIf.ip || "?"} / ${fromIf.mask || "?"}</div>`;
  }
  if (toIf) {
    html += `<div class="detail-line">${to.name} ${toIf.name || ""}: ${toIf.ip || "?"} / ${toIf.mask || "?"}</div>`;
  }

  if (netKey) {
    html += `<div class="detail-line"><strong>Subnet:</strong> ${netKey}</div>`;
  } else {
    html += `<div class="detail-line"><strong>Subnet:</strong> none / not matching</div>`;
  }

  html += `<div class="detail-line"><strong>Color:</strong> <span style="color:${color};">■■■</span> ${color}</div>`;
  html += `<div class="detail-line" style="margin-top:4px;opacity:0.7;">Click in empty workspace or press Esc to hide.</div>`;

  linkDetailsBox.innerHTML = html;
  linkDetailsBox.classList.remove("hidden");
}

function hideLinkDetails() {
  linkDetailsBox.classList.add("hidden");
}

workspace.addEventListener("click", (e) => {
  if (e.target.closest(".device")) return;
  hideLinkDetails();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideLinkDetails();
});

// --- Render links (SVG lines) with PARALLEL OFFSET for multiple links ---
function renderLinks() {
  const wsRect = workspace.getBoundingClientRect();
  const width = workspace.clientWidth;
  const height = workspace.clientHeight;

  linksLayer.setAttribute("width", width);
  linksLayer.setAttribute("height", height);
  linksLayer.innerHTML = "";

  // Group links by device pair only (so all links between same two boxes become parallel)
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
        const spacing = 6; // pixels between parallel lines
        const offsetIndex = indexInGroup - (n - 1) / 2;
        const offset = spacing * offsetIndex;

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
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("pointer-events", "stroke");

      const color = getLinkColor(link);
      line.setAttribute("stroke", color);

      line.addEventListener("click", (e) => {
        e.stopPropagation();
        showLinkDetails(link);
      });

      linksLayer.appendChild(line);
    });
  });
}

// Re-render links on window resize
window.addEventListener("resize", () => {
  renderLinks();
});

// --- Export / Import (frontend only) ---
function exportTopology() {
  const data = {
    devices: Object.values(devices),
    links
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "topology.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadTopologyFromObject(data) {
  devices = {};
  links = [];
  deviceCounter = 1;
  linkCounter = 1;

  subnetColorMap = {};
  nextSubnetColorIndex = 0;

  document
    .querySelectorAll(".device")
    .forEach((el) => el.remove());

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
}

// --- Cisco-style config summary ---
function exportConfigSummary() {
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
      lines.push(`interface ${ifName}`);
      if (iface.ip && iface.mask) {
        lines.push(` ip address ${iface.ip} ${iface.mask}`);
      } else {
        lines.push(` ip address X.X.X.X 255.255.255.0`);
      }
      if (iface.gateway || iface.dns) {
        if (iface.gateway) {
          lines.push(` ! default-gateway ${iface.gateway}`);
        }
        if (iface.dns) {
          lines.push(` ! dns-server ${iface.dns}`);
        }
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
  a.download = "topology-config-summary.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Optional: start with an example device ---
addDevice("Router");
