// --- DOM references ---
const workspace = document.getElementById("workspace");
const linksLayer = document.getElementById("links-layer");
const contextMenu = document.getElementById("context-menu");
const configFileInput = document.getElementById("config-file-input");
const importFileInput = document.getElementById("import-file-input");
const detailsPanel = document.getElementById("details-panel");

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

// --- State ---
let devices = {};            // id -> { id, type, name, ip, config, x, y, interfaces: [] }
let links = [];              // { id, fromId, toId }
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

  return el;
}

// --- Link mode click handler ---
function handleLinkModeClick(deviceId, deviceEl) {
  if (!pendingLinkSourceId) {
    // First endpoint
    pendingLinkSourceId = deviceId;
    clearLinkSourceHighlight();
    deviceEl.classList.add("link-source");
    return;
  }

  // Second endpoint (avoid self-link)
  if (pendingLinkSourceId && pendingLinkSourceId !== deviceId) {
    const fromId = pendingLinkSourceId;
    const toId = deviceId;

    // Avoid duplicate links
    const exists = links.some(
      (l) =>
        (l.fromId === fromId && l.toId === toId) ||
        (l.fromId === toId && l.toId === fromId)
    );

    if (!exists) {
      const id = `L${linkCounter++}`;
      links.push({ id, fromId, toId });
    }
  }

  // Reset selection
  pendingLinkSourceId = null;
  clearLinkSourceHighlight();
  renderLinks();
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

// Context menu actions
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

  // Validate management IP
  const ipValue = panelIp.value.trim();
  if (ipValue && !isValidIPv4(ipValue)) {
    setIpValidationError(true);
    alert("Invalid management IP. Use a valid IPv4 address.");
    return;
  }
  setIpValidationError(false);

  // Collect and validate interfaces from UI
  const { interfaces, hasError } = collectInterfacesFromUI();
  if (hasError) {
    alert("One or more interfaces have invalid IP or subnet mask.");
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
});

// --- Interfaces UI helpers ---
function renderInterfacesForDevice(dev) {
  interfacesList.innerHTML = "";
  (dev.interfaces || []).forEach((iface) => {
    addInterfaceRow(iface.name, iface.ip, iface.mask);
  });
}

function addInterfaceRow(name = "", ip = "", mask = "") {
  const row = document.createElement("div");
  row.className = "interface-row";

  row.innerHTML = `
    <input class="if-name" placeholder="Gig0/0" value="${name || ""}">
    <input class="if-ip" placeholder="192.168.1.1" value="${ip || ""}">
    <input class="if-mask" placeholder="255.255.255.0" value="${mask || ""}">
    <button type="button" class="if-delete">✕</button>
  `;

  const delBtn = row.querySelector(".if-delete");
  delBtn.addEventListener("click", () => {
    row.remove();
  });

  interfacesList.appendChild(row);
}

addInterfaceBtn.addEventListener("click", () => {
  addInterfaceRow();
});

function collectInterfacesFromUI() {
  const rows = interfacesList.querySelectorAll(".interface-row");
  const interfaces = [];
  let hasError = false;

  rows.forEach((row) => {
    const nameInput = row.querySelector(".if-name");
    const ipInput = row.querySelector(".if-ip");
    const maskInput = row.querySelector(".if-mask");

    const name = nameInput.value.trim();
    const ip = ipInput.value.trim();
    const mask = maskInput.value.trim();

    // Reset error state
    ipInput.classList.remove("error");
    maskInput.classList.remove("error");

    // Skip completely empty rows
    if (!name && !ip && !mask) return;

    let rowHasError = false;

    if (!ip || !isValidIPv4(ip)) {
      ipInput.classList.add("error");
      rowHasError = true;
    }
    if (!mask || !isValidIPv4Mask(mask)) {
      maskInput.classList.add("error");
      rowHasError = true;
    }

    if (rowHasError) {
      hasError = true;
      return;
    }

    interfaces.push({ name, ip, mask });
  });

  return { interfaces, hasError };
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
  // Must be some number of 1s followed by only 0s
  const firstZero = bits.indexOf("0");
  const lastOne = bits.lastIndexOf("1");
  if (firstZero === -1) return true; // /32 mask (all ones)
  return lastOne < firstZero;        // no "01" pattern after first zero
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

  // Remove any links that touched this device
  links = links.filter((l) => l.fromId !== deviceId && l.toId !== deviceId);
  renderLinks();
}

// --- Render links (SVG lines) ---
function renderLinks() {
  const wsRect = workspace.getBoundingClientRect();
  const width = workspace.clientWidth;
  const height = workspace.clientHeight;

  linksLayer.setAttribute("width", width);
  linksLayer.setAttribute("height", height);
  linksLayer.innerHTML = "";

  links.forEach((link) => {
    const fromEl = workspace.querySelector(`.device[data-id="${link.fromId}"]`);
    const toEl = workspace.querySelector(`.device[data-id="${link.toId}"]`);

    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const x1 = fromRect.left - wsRect.left + fromRect.width / 2;
    const y1 = fromRect.top - wsRect.top + fromRect.height / 2;
    const x2 = toRect.left - wsRect.left + toRect.width / 2;
    const y2 = toRect.top - wsRect.top + toRect.height / 2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#64748b");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    linksLayer.appendChild(line);
  });
}

// Re-render links on window resize (so lines still line up)
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

  // Remove existing device elements
  document
    .querySelectorAll(".device")
    .forEach((el) => el.remove());

  if (Array.isArray(data.devices)) {
    data.devices.forEach((dev) => {
      // Ensure interfaces array exists
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

// --- Optional: start with an example device ---
addDevice("Router");
