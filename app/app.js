// Bargain Beacon — render, search, filter, sort and the deal detail view.
// All data lives in deals.js; nothing is fetched from the network at run time.

import { deals, CHECKED_AT } from "./deals.js";

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("result-count");
const detail = document.getElementById("detail");
const searchInput = document.getElementById("search");
const storeSelect = document.getElementById("store");
const minDiscountSelect = document.getElementById("min-discount");
const sortSelect = document.getElementById("sort");
const newLowsBox = document.getElementById("new-lows");
const categoriesRow = document.getElementById("categories");
const statsEl = document.getElementById("stats");

const VERDICT_LABEL = {
  "new-low": "New low",
  strong: "Strong deal",
  routine: "Routine deal",
};

const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pctOff = (d) => Math.round((1 - d.price / d.was) * 100);

const checkedLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
};

// ---------- stats ----------
function renderStats() {
  const totalSaving = deals.reduce((s, d) => s + (d.was - d.price), 0);
  const avgPct = Math.round(deals.reduce((s, d) => s + pctOff(d), 0) / deals.length);
  const newLows = deals.filter((d) => d.verdict === "new-low").length;
  statsEl.innerHTML = [
    [deals.length, "deals checked"],
    [newLows, "new lows"],
    [avgPct + "%", "average discount"],
    ["$" + Math.round(totalSaving).toLocaleString("en-US"), "total savings if you bought one of each"],
  ]
    .map(([b, label]) => `<div class="stat"><b>${b}</b><span>${label}</span></div>`)
    .join("");
}

// ---------- filters ----------
const categories = ["All", ...new Set(deals.map((d) => d.category))].sort((a, b) =>
  a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b),
);
let activeCategory = "All";

for (const c of categories) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = c;
  chip.setAttribute("aria-pressed", c === "All" ? "true" : "false");
  chip.addEventListener("click", () => {
    activeCategory = c;
    for (const el of categoriesRow.children) {
      el.setAttribute("aria-pressed", el.textContent === c ? "true" : "false");
    }
    render();
  });
  categoriesRow.appendChild(chip);
}

for (const s of [...new Set(deals.map((d) => d.store))].sort()) {
  const opt = document.createElement("option");
  opt.value = s;
  opt.textContent = s;
  storeSelect.appendChild(opt);
}

function filtered() {
  const q = searchInput.value.trim().toLowerCase();
  const store = storeSelect.value;
  const minPct = Number(minDiscountSelect.value);
  const lowsOnly = newLowsBox.checked;
  let list = deals.filter((d) => {
    if (activeCategory !== "All" && d.category !== activeCategory) return false;
    if (store && d.store !== store) return false;
    if (pctOff(d) < minPct) return false;
    if (lowsOnly && d.verdict !== "new-low") return false;
    if (q && !(d.title + " " + d.store + " " + d.category).toLowerCase().includes(q)) return false;
    return true;
  });
  const sort = sortSelect.value;
  const by = {
    discount: (a, b) => pctOff(b) - pctOff(a),
    saving: (a, b) => b.was - b.price - (a.was - a.price),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    name: (a, b) => a.title.localeCompare(b.title),
  };
  return list.sort(by[sort] || by.discount);
}

// ---------- list rendering ----------
function cardHTML(d) {
  return `<article class="card verdict-${d.verdict}">
    <div class="card-top">
      <span class="store-badge">${d.store}</span>
      <span class="cat">${d.category}</span>
    </div>
    <h3><a href="#/deal/${d.id}">${d.title}</a></h3>
    <div class="prices">
      <span class="price-now">${money(d.price)}</span>
      <span class="price-was">${money(d.was)}</span>
      <span class="off-badge">${pctOff(d)}% off</span>
    </div>
    <span class="verdict verdict-${d.verdict}">${VERDICT_LABEL[d.verdict]}</span>
    <p class="evidence">${d.evidence}</p>
    <p class="meta">Checked ${checkedLabel(d.checked)} · ${d.source}</p>
    <div class="spacer"></div>
    <a class="view-link" href="#/deal/${d.id}">See the deal</a>
  </article>`;
}

function render() {
  if (!location.hash.startsWith("#/deal/")) {
    detail.hidden = true;
    detail.innerHTML = "";
  }
  const list = filtered();
  grid.innerHTML = list.map(cardHTML).join("");
  empty.hidden = list.length !== 0;
  count.textContent =
    list.length === deals.length
      ? `${deals.length} deals, sorted by ${sortSelect.selectedOptions[0].textContent.toLowerCase()}.`
      : `${list.length} of ${deals.length} deals match.`;
}

// ---------- detail view ----------
function renderDetail(id) {
  const d = deals.find((x) => x.id === id);
  if (!d) {
    detail.hidden = true;
    detail.innerHTML = "";
    return;
  }
  const similar = deals
    .filter((x) => x.id !== d.id && (x.category === d.category || x.store === d.store))
    .sort((a, b) => pctOff(b) - pctOff(a))
    .slice(0, 4);
  detail.hidden = false;
  detail.innerHTML = `
    <button class="back" type="button" id="back-btn">&larr; Back to all deals</button>
    <h2>${d.title}</h2>
    <div class="prices">
      <span class="price-now">${money(d.price)}</span>
      <span class="price-was">${money(d.was)}</span>
      <span class="off-badge">${pctOff(d)}% off · save ${money(d.was - d.price)}</span>
    </div>
    <dl class="facts">
      <div><dt>Store</dt><dd>${d.store}</dd></div>
      <div><dt>Category</dt><dd>${d.category}</dd></div>
      <div><dt>Checked</dt><dd>${checkedLabel(d.checked)}</dd></div>
      <div><dt>Source</dt><dd>${d.source}</dd></div>
    </dl>
    <div class="verdict-box ${d.verdict}">
      <strong>${VERDICT_LABEL[d.verdict]}.</strong> ${d.evidence}
    </div>
    <p><a class="view-link" href="${d.url}" target="_blank" rel="noopener">View at ${d.store} &rarr;</a></p>
    <div class="similar">
      <h3>More in ${d.category} and from ${d.store}</h3>
      <ul>
        ${similar
          .map(
            (s) =>
              `<li><a href="#/deal/${s.id}">${s.title}</a> — ${money(s.price)} at ${s.store} (${pctOff(s)}% off)</li>`,
          )
          .join("")}
      </ul>
    </div>`;
  document.getElementById("back-btn").addEventListener("click", () => {
    location.hash = "#/";
  });
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function route() {
  const m = location.hash.match(/^#\/deal\/([\w-]+)$/);
  if (m) {
    renderDetail(m[1]);
    grid.style.display = "none";
    empty.hidden = true;
    count.textContent = "";
  } else {
    grid.style.display = "";
    render();
  }
}

for (const el of [searchInput, storeSelect, minDiscountSelect, sortSelect, newLowsBox]) {
  el.addEventListener(el === searchInput ? "input" : "change", render);
}

window.addEventListener("hashchange", route);

renderStats();
route();
