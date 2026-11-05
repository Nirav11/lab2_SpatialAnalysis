(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { mode: "points", radius: 36, filter: "all", isDemo: true, points: [], plot: null, cells: null };
  const STORAGE_KEY = "location-science-crime-lab-v1";
  const fmt = (number) => Number(number).toLocaleString("en-US");

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(random) {
    return Math.sqrt(-2 * Math.log(Math.max(1e-10, random()))) * Math.cos(2 * Math.PI * random());
  }

  function createDemo() {
    const random = rng(2077);
    const clusters = [
      { n: 360, x: 0.27, y: 0.3, sx: 0.10, sy: 0.11 },
      { n: 270, x: 0.68, y: 0.6, sx: 0.105, sy: 0.13 },
      { n: 160, x: 0.34, y: 0.76, sx: 0.08, sy: 0.085 },
      { n: 190, x: 0.5, y: 0.5, sx: 0.31, sy: 0.29 },
    ];
    const types = ["ROBBERY", "THEFT", "ASSAULT"];
    const result = [];
    clusters.forEach((cluster, clusterIndex) => {
      for (let i = 0; i < cluster.n; i++) {
        const x = Math.max(0.015, Math.min(0.985, cluster.x + gaussian(random) * cluster.sx));
        const y = Math.max(0.015, Math.min(0.985, cluster.y + gaussian(random) * cluster.sy));
        const type = types[Math.min(2, Math.floor(random() * 3))];
        const day = Math.floor(random() * 364) + 1;
        const date = new Date(Date.UTC(2024, 0, day)).toISOString().slice(0, 10);
        result.push({ x, y, lng: -87.81 + x * 0.29, lat: 41.98 - y * 0.35, type, date, id: `S${String(result.length + 1).padStart(4, "0")}`, clusterIndex });
      }
    });
    return result;
  }

  function getVisible() {
    return state.filter === "all" ? state.points : state.points.filter((p) => p.type === state.filter);
  }

  function populateCategories() {
    const select = $("crimeFilter");
    const counts = new Map();
    state.points.forEach((p) => counts.set(p.type, (counts.get(p.type) || 0) + 1));
    const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    select.replaceChildren();
    const addOption = (value, label) => { const o = document.createElement("option"); o.value = value; o.textContent = label; select.appendChild(o); };
    addOption("all", "All categories");
    categories.forEach(([type, n]) => addOption(type, `${toTitleCase(type)} (${fmt(n)})`));
    state.filter = "all";
    select.value = "all";
  }

  function toTitleCase(s) {
    return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function setDataset(points, isDemo, message) {
    state.points = points;
    state.isDemo = isDemo;
    state.cells = null;
    populateCategories();
    $("datasetBadge").textContent = isDemo ? "SIMULATED DATA" : "YOUR CSV · LOCAL";
    $("dataLabel").textContent = isDemo ? "Simulated illustration" : "Your local CSV file";
    $("uploadStatus").textContent = message;
    if (isDemo) $("csvUpload").value = "";
    render();
  }

  function fillMapBackground(ctx, w, h, plot) {
    ctx.fillStyle = "#edf3f7";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e3ebf1";
    ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i <= 16; i++) {
      const x = plot.x + (plot.w * i / 16);
      ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
    }
    for (let j = 0; j <= 12; j++) {
      const y = plot.y + (plot.h * j / 12);
      ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(43,80,111,.15)";
    ctx.strokeRect(plot.x + .5, plot.y + .5, plot.w - 1, plot.h - 1);
  }

  function drawPoints(ctx, pts, plot) {
    const stride = Math.max(1, Math.ceil(pts.length / 16000));
    ctx.fillStyle = "rgba(20,59,88,.52)";
    for (let i = 0; i < pts.length; i += stride) {
      const p = pts[i];
      const x = plot.x + p.x * plot.w;
      const y = plot.y + p.y * plot.h;
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(244,107,85,.70)";
    for (let i = 0; i < pts.length; i += stride * 3) {
      const p = pts[i];
      ctx.beginPath(); ctx.arc(plot.x + p.x * plot.w, plot.y + p.y * plot.h, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    return { label: "Points", value: "Individual events", detail: "Overlap can hide clusters" };
  }

  function heatColor(t) {
    const stops = [
      [219, 231, 241], [113, 182, 212], [255, 213, 130], [244, 135, 93], [207, 65, 70]
    ];
    const pos = Math.min(stops.length - 1.00001, Math.max(0, t * (stops.length - 1)));
    const index = Math.floor(pos), a = pos - index;
    const u = stops[index], v = stops[index + 1];
    return `rgb(${Math.round(u[0] + (v[0] - u[0]) * a)},${Math.round(u[1] + (v[1] - u[1]) * a)},${Math.round(u[2] + (v[2] - u[2]) * a)})`;
  }

  function drawDensity(ctx, pts, plot) {
    const cols = 100, rows = 66;
    const grid = new Float32Array(cols * rows);
    const r = Math.max(2, Math.round(state.radius / 9));
    const sigma = Math.max(1, r * .58);
    const kernel = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r) kernel.push({ dx, dy, weight: Math.exp(-d2 / (2 * sigma * sigma)) });
    }
    const stride = Math.max(1, Math.ceil(pts.length / 16000));
    for (let i = 0; i < pts.length; i += stride) {
      const p = pts[i];
      const a = Math.min(cols - 1, Math.floor(p.x * cols)), b = Math.min(rows - 1, Math.floor(p.y * rows));
      for (const k of kernel) {
        const x = a + k.dx, y = b + k.dy;
        if (x >= 0 && y >= 0 && x < cols && y < rows) grid[y * cols + x] += k.weight * stride;
      }
    }
    let max = 0;
    for (const value of grid) if (value > max) max = value;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const t = max ? grid[y * cols + x] / max : 0;
      if (t < .045) continue;
      ctx.globalAlpha = Math.min(.96, .2 + Math.pow(t, .55) * .8);
      ctx.fillStyle = heatColor(Math.pow(t, .80));
      ctx.fillRect(plot.x + x * plot.w / cols, plot.y + y * plot.h / rows, Math.ceil(plot.w / cols) + .45, Math.ceil(plot.h / rows) + .45);
    }
    ctx.globalAlpha = 1;
    return { label: "Density", value: "Relative intensity", detail: "Radius changes the surface" };
  }

  function computeGiStar(pts) {
    const cols = 16, rows = 12, n = cols * rows;
    const counts = new Float64Array(n);
    for (const p of pts) {
      const x = Math.min(cols - 1, Math.floor(p.x * cols));
      const y = Math.min(rows - 1, Math.floor(p.y * rows));
      counts[y * cols + x]++;
    }
    let sum = 0, sumSq = 0;
    for (const count of counts) { sum += count; sumSq += count * count; }
    const mean = sum / n, s = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    const neighborRange = state.radius > 48 ? 2 : 1;
    const z = new Float64Array(n);
    let hot = 0, cold = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let sw = 0, sx = 0;
      for (let dy = -neighborRange; dy <= neighborRange; dy++) for (let dx = -neighborRange; dx <= neighborRange; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
        sw++;
        sx += counts[yy * cols + xx];
      }
      const denominator = s * Math.sqrt((n * sw - sw * sw) / (n - 1));
      const value = denominator > 0 ? (sx - mean * sw) / denominator : 0;
      z[y * cols + x] = value;
      if (value >= 1.96) hot++;
      if (value <= -1.96) cold++;
    }
    return { cols, rows, counts, z, hot, cold };
  }

  function drawGiStar(ctx, pts, plot) {
    const cells = computeGiStar(pts);
    state.cells = cells;
    const cw = plot.w / cells.cols, ch = plot.h / cells.rows;
    for (let y = 0; y < cells.rows; y++) for (let x = 0; x < cells.cols; x++) {
      const i = y * cells.cols + x, z = cells.z[i];
      ctx.fillStyle = z >= 2.58 ? "rgba(217,61,67,.85)" : z >= 1.96 ? "rgba(241,115,84,.69)" : z <= -2.58 ? "rgba(41,109,174,.80)" : z <= -1.96 ? "rgba(91,168,207,.63)" : "rgba(255,255,255,.40)";
      ctx.fillRect(plot.x + x * cw + 1, plot.y + y * ch + 1, cw - 2, ch - 2);
      if (z >= 1.96 || z <= -1.96) {
        ctx.fillStyle = z > 0 ? "#fff5f3" : "#edf8ff";
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(cells.counts[i].toString(), plot.x + (x + .5) * cw, plot.y + (y + .59) * ch);
      }
    }
    return { label: "Local Gi*", value: `${cells.hot} hot cells`, detail: `${cells.cold} cold cells · unadjusted` };
  }

  function addMapText(ctx, w, h, plot) {
    ctx.fillStyle = "#6f8a9e";
    ctx.font = "700 10px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("WEST", plot.x, h - 8);
    ctx.textAlign = "right";
    ctx.fillText("EAST", plot.x + plot.w, h - 8);
    ctx.save();
    ctx.translate(11, plot.y + plot.h);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.fillText("NORTH", 0, 0);
    ctx.restore();
    ctx.strokeStyle = "rgba(38,89,127,.15)";
    ctx.strokeRect(plot.x + .5, plot.y + .5, plot.w - 1, plot.h - 1);
  }

  function render() {
    const canvas = $("analysisMap"), ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const w = rect.width, h = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const plot = { x: 35, y: 20, w: w - 59, h: h - 48 };
    state.plot = plot;
    fillMapBackground(ctx, w, h, plot);
    const pts = getVisible();
    state.cells = null;
    const metric = state.mode === "points" ? drawPoints(ctx, pts, plot) : state.mode === "density" ? drawDensity(ctx, pts, plot) : drawGiStar(ctx, pts, plot);
    addMapText(ctx, w, h, plot);
    $("visibleCount").textContent = fmt(pts.length);
    $("metricLabel").textContent = state.mode === "gistar" ? "UNADJUSTED GI*" : "MAP VIEW";
    $("metricValue").textContent = metric.value;
    $("metricDetail").textContent = metric.detail;
    $("analysisNote").textContent = state.mode === "points"
      ? "Point maps preserve events, but overlapping dots can hide areas with many records."
      : state.mode === "density"
      ? "This density is a visual estimate. A different radius can change where the surface looks hottest."
      : "These are exploratory z-score categories from a local grid. Use optimized ArcGIS Pro analysis for FDR-adjusted significance.";
    $("radiusSlider").disabled = state.mode === "points";
    canvas.setAttribute("aria-label", `${state.isDemo ? "Simulated" : "Uploaded"} data: ${fmt(pts.length)} points displayed in ${state.mode} view`);
  }

  function parseCSV(raw) {
    const records = [];
    let record = [], field = "", quoted = false;
    const text = String(raw).replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { record.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        record.push(field);
        if (record.some((v) => v.trim() !== "")) records.push(record);
        record = []; field = "";
      } else field += c;
    }
    if (record.length || field) { record.push(field); records.push(record); }
    return records;
  }

  function normalizeHeader(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function importRecords(rows) {
    if (rows.length < 2) throw new Error("The file has no data records.");
    const cols = rows[0].map(normalizeHeader);
    const find = (...names) => names.map((n) => cols.indexOf(n)).find((i) => i >= 0) ?? -1;
    const xi = find("longitude", "lon", "lng", "xcoordinate", "x");
    const yi = find("latitude", "lat", "ycoordinate", "y");
    const ti = find("primarytype", "crimetype", "type", "category");
    const di = find("date", "incidentdate", "datetime");
    if (xi < 0 || yi < 0) throw new Error("CSV needs a longitude and latitude column.");
    const points = [];
    const maximum = 40000;
    for (let i = 1; i < rows.length && points.length < maximum; i++) {
      const row = rows[i];
      const lng = Number(row[xi]), lat = Number(row[yi]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || !String(row[xi]).trim() || !String(row[yi]).trim() || (lng === 0 && lat === 0) || lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;
      points.push({ lng, lat, x: 0, y: 0, type: String(row[ti] || "INCIDENT").toUpperCase().trim() || "INCIDENT", date: row[di] || "", id: String(i) });
    }
    if (points.length === 0) throw new Error("No valid coordinate pairs were found.");
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.lng); maxX = Math.max(maxX, p.lng); minY = Math.min(minY, p.lat); maxY = Math.max(maxY, p.lat); }
    const spanX = Math.max(maxX - minX, 0.00001), spanY = Math.max(maxY - minY, .00001);
    for (const p of points) {
      p.x = .025 + .95 * (p.lng - minX) / spanX;
      p.y = .025 + .95 * (maxY - p.lat) / spanY;
    }
    return { points, limited: points.length === maximum && rows.length - 1 > maximum };
  }

  function downloadFile(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadPractice() {
    const rows = ["id,date,primary_type,longitude,latitude,synthetic_data"];
    createDemo().forEach((p) => rows.push([p.id, p.date, p.type, p.lng.toFixed(7), p.lat.toFixed(7), "YES"].join(",")));
    downloadFile(rows.join("\r\n") + "\r\n", "SIMULATED_Practice_Incidents_2024.csv", "text/csv;charset=utf-8");
  }

  function loadLocalState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  const saved = loadLocalState();
  function saveLocalState() {
    try {
      const done = [...document.querySelectorAll("[data-complete]")].filter((e) => e.checked).map((e) => e.dataset.complete);
      const answers = ["studentName", "answer1", "answer2", "answer3", "answer4"].map((id) => $(id).value);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ done, answers }));
    } catch (_) { /* Browsers may disable local storage. Everything still works in memory. */ }
  }
  function updateProgress() {
    const checked = [...document.querySelectorAll("[data-complete]")].filter((e) => e.checked);
    document.querySelectorAll(".mission").forEach((m) => m.classList.toggle("completed", checked.some((e) => e.dataset.complete === m.dataset.mission)));
    $("progressFill").style.width = `${checked.length / 5 * 100}%`;
    $("progressText").textContent = `${checked.length} of 5 missions complete`;
    saveLocalState();
  }

  function setupEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((b) => { b.classList.toggle("active", b === button); b.setAttribute("aria-pressed", String(b === button)); });
      $("mapTooltip").hidden = true;
      render();
    }));
    $("crimeFilter").addEventListener("change", (event) => { state.filter = event.target.value; render(); });
    $("radiusSlider").addEventListener("input", (event) => { state.radius = Number(event.target.value); $("radiusValue").textContent = state.radius; render(); });
    $("resetDataset").addEventListener("click", () => setDataset(createDemo(), true, "Simulated practice scenario restored."));
    $("downloadDemo").addEventListener("click", downloadPractice);
    $("exportMap").addEventListener("click", () => {
      const a = document.createElement("a");
      a.download = `crime-lab-${state.mode}-${state.isDemo ? "SIMULATED" : "uploaded"}.png`;
      a.href = $("analysisMap").toDataURL("image/png");
      document.body.append(a); a.click(); a.remove();
    });
    $("csvUpload").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) { $("uploadStatus").textContent = "Please choose a CSV smaller than 25 MB."; return; }
      $("uploadStatus").textContent = "Reading your CSV locally…";
      try {
        const rows = parseCSV(await file.text());
        const parsed = importRecords(rows);
        const note = `${fmt(parsed.points.length)} geocoded records loaded from ${file.name}.${parsed.limited ? " Limited to the first 40,000 records." : ""} Nothing was sent to a server.`;
        setDataset(parsed.points, false, note);
      } catch (error) { $("uploadStatus").textContent = error.message || "Unable to read CSV."; }
    });
    $("analysisMap").addEventListener("mousemove", (event) => {
      const tooltip = $("mapTooltip"), cells = state.cells, plot = state.plot;
      if (state.mode !== "gistar" || !cells || !plot) { tooltip.hidden = true; return; }
      const r = event.currentTarget.getBoundingClientRect(), x = event.clientX - r.left, y = event.clientY - r.top;
      const ix = Math.floor((x - plot.x) / plot.w * cells.cols), iy = Math.floor((y - plot.y) / plot.h * cells.rows);
      if (ix < 0 || ix >= cells.cols || iy < 0 || iy >= cells.rows) { tooltip.hidden = true; return; }
      const i = iy * cells.cols + ix;
      tooltip.textContent = `${cells.counts[i]} incidents · z = ${cells.z[i].toFixed(2)}`;
      tooltip.style.left = `${Math.min(x + 12, r.width - 140)}px`;
      tooltip.style.top = `${Math.max(4, y - 37)}px`;
      tooltip.hidden = false;
    });
    $("analysisMap").addEventListener("mouseleave", () => { $("mapTooltip").hidden = true; });
    document.querySelectorAll("[data-quick-answer]").forEach((button) => button.addEventListener("click", () => {
      const right = button.dataset.quickAnswer === "right";
      document.querySelectorAll("[data-quick-answer]").forEach((b) => b.classList.remove("correct", "incorrect"));
      button.classList.add(right ? "correct" : "incorrect");
      $("quickFeedback").textContent = right ? "Exactly. The events stay fixed; the estimated density pattern responds to bandwidth and rendering choices." : "Try again. Changing a map's symbology does not create or remove incidents.";
    }));
    document.querySelectorAll("[data-complete]").forEach((check) => check.addEventListener("change", updateProgress));
    $("resetProgress").addEventListener("click", () => { document.querySelectorAll("[data-complete]").forEach((c) => { c.checked = false; }); updateProgress(); });
    for (const id of ["studentName", "answer1", "answer2", "answer3", "answer4"]) $(id).addEventListener("input", saveLocalState);
    $("downloadAnswers").addEventListener("click", () => {
      const name = $("studentName").value.trim() || "Student";
      const lines = ["LOCATION SCIENCE — CRIME PATTERNS LAB", "75-minute ArcGIS Pro spatial analysis workshop", `Student: ${name}`, "", "Q1. Where did you observe the strongest concentration of reported robberies?", $("answer1").value.trim(), "", "Q2. What did the Gi* result add beyond the heat map?", $("answer2").value.trim(), "", "Q3. Identify a data or methodological limitation.", $("answer3").value.trim(), "", "Q4. What additional evidence would you need before recommending an intervention?", $("answer4").value.trim(), "", "Attach your ArcGIS Pro map separately.", "Data source: City of Chicago Open Data Portal, Crimes - 2001 to Present, filtered to 2024 ROBBERY."];
      const slug = name.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 45);
      downloadFile(lines.join("\n"), `${slug}_Crime_Lab_Responses.txt`, "text/plain;charset=utf-8");
      $("formStatus").textContent = "Response sheet downloaded. Attach your ArcGIS map separately.";
    });
    $("printWorksheet").addEventListener("click", () => window.print());
    $("mobileNavToggle").addEventListener("click", () => {
      const nav = document.querySelector(".top-nav"), active = nav.classList.toggle("open");
      $("mobileNavToggle").setAttribute("aria-expanded", String(active));
    });
    document.querySelectorAll(".top-nav a").forEach((a) => a.addEventListener("click", () => { document.querySelector(".top-nav").classList.remove("open"); $("mobileNavToggle").setAttribute("aria-expanded", "false"); }));
    let resizeFrame;
    window.addEventListener("resize", () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(render); });
  }

  function init() {
    setupEvents();
    setDataset(createDemo(), true, "Nothing is uploaded to a server.");
    if (Array.isArray(saved.done)) document.querySelectorAll("[data-complete]").forEach((check) => { check.checked = saved.done.includes(check.dataset.complete); });
    if (Array.isArray(saved.answers)) ["studentName", "answer1", "answer2", "answer3", "answer4"].forEach((id, i) => { if (typeof saved.answers[i] === "string") $(id).value = saved.answers[i]; });
    updateProgress();
  }
  init();
})();
