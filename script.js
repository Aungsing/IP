const $ = (id) => document.getElementById(id);

const els = {
  ip: $("ipValue"),
  time: $("timeValue"),
  timeIso: $("timeIso"),
  ua: $("uaValue"),
  refresh: $("refreshBtn"),
  refreshIcon: $("refreshIcon"),
  copy: $("copyBtn"),
  copyLabel: $("copyLabel"),
  rows: $("visitorRows"),
  count: $("visitorCount"),
  dot: $("statusDot"),
  status: $("statusText"),
  toast: $("toast"),
};

let currentIp = "";
let toastTimer;

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function setStatus(state, text) {
  els.dot.className = "dot " + state;
  els.status.textContent = text;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

// Fetch helper that throws on HTTP errors
async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function loadIp() {
  const data = await getJson("/api/ip");
  currentIp = data.ip;

  // textContent (never innerHTML): the User-Agent comes from the visitor.
  els.ip.textContent = data.ip;
  els.ip.classList.remove("reveal");
  void els.ip.offsetWidth; // restart the animation
  els.ip.classList.add("reveal");

  els.time.textContent = formatTime(data.timestamp);
  els.timeIso.textContent = data.timestamp;
  els.ua.textContent = data.userAgent;
  els.copy.disabled = false;
}

function cell(className, text) {
  const td = document.createElement("td");
  td.className = className;
  td.textContent = text;
  if (className === "ua-cell") td.title = text;
  return td;
}

async function loadVisitors() {
  const list = await getJson("/api/visitors");
  els.count.textContent = list.length;
  els.rows.replaceChildren();

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = cell("empty", "No visits recorded yet.");
    td.colSpan = 3;
    tr.appendChild(td);
    els.rows.appendChild(tr);
    return;
  }

  list.forEach((v, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "fresh";
    tr.append(
      cell("ip-cell", v.ip),
      cell("time-cell", formatTime(v.timestamp)),
      cell("ua-cell", v.userAgent)
    );
    els.rows.appendChild(tr);
  });
}

async function refresh() {
  els.refresh.disabled = true;
  els.refreshIcon.classList.add("spin");
  setStatus("", "Loading…");

  try {
    await loadIp(); // records this visit first...
    await loadVisitors(); // ...so it shows up in the table
    setStatus("live", "Live · updated " + new Date().toLocaleTimeString());
  } catch (err) {
    console.error(err);
    setStatus("error", "Could not reach the server. Try Refresh.");
    showToast("Something went wrong");
  } finally {
    els.refresh.disabled = false;
    els.refreshIcon.classList.remove("spin");
  }
}

async function copyIp() {
  if (!currentIp) return;
  try {
    await navigator.clipboard.writeText(currentIp);
  } catch {
    // Fallback for older browsers / non-HTTPS pages
    const ta = document.createElement("textarea");
    ta.value = currentIp;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  els.copy.classList.add("done");
  els.copyLabel.textContent = "Copied";
  showToast("IP copied to clipboard");
  setTimeout(() => {
    els.copy.classList.remove("done");
    els.copyLabel.textContent = "Copy IP";
  }, 1600);
}

els.refresh.addEventListener("click", refresh);
els.copy.addEventListener("click", copyIp);
refresh();
