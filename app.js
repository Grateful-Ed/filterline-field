"use strict";
/* FilterPhone — real-time RFQ broker between on-site customers and filter
   suppliers (mock). Both sides live in this one build, run as an OPEN MARKET
   (freight-market style):
   Customer side: an HVAC tech speaks an RFQ — lines, a job site, and the
   delivery window he requires — and posts it to the open market.
   Vendor side: each supplier's feed is filtered by its own constraints
   (catalog, stock, delivery coverage, windows). An RFQ appears only if the
   vendor can service it. The vendor bids — from its own price book, with a
   promised delivery window inside the customer's required range — or passes
   silently. No pass, decline, or can't-service state ever reaches the
   customer; the customer sees only bids: vendor name, total, promised window.
   Cost carries the most influence on the award, but it is not the decider:
   a tighter promised window can outweigh a price gap.
   Bid details (breakdown, extra details, optional services) live in the
   details view, never on the bid card. Other vendors' bids are simulated
   from their price books; a bid placed on the vendor side replaces the
   simulated one. Demo data only: every person, company, site, price and
   stock count is invented. */

// ---------------- Marketplace data ----------------
const TECH = { name: "Dale R.", company: "Summit Air Mechanical", crew: "Crew 7", van: "Van 214", limit: 750 };

const PRODUCTS = [
  { sku: "FL-20251-08", size: "20×25×1", merv: 8,  pack: "Case of 12 · pleated" },
  { sku: "FL-16204-13", size: "16×20×4", merv: 13, pack: "Case of 6 · deep pleat" },
  { sku: "FL-16251-11", size: "16×25×1", merv: 11, pack: "Case of 12 · pleated" },
  { sku: "FL-20204-08", size: "20×20×4", merv: 8,  pack: "Case of 6 · deep pleat" },
  { sku: "FL-24244-13", size: "24×24×4", merv: 13, pack: "Case of 5 · deep pleat" }
];

const SITES = [
  { id: "rivergate", name: "Rivergate Tower", sub: "Downtown · dock B, off 2nd Ave — call the site contact on arrival", contact: "Marcus · site lead" },
  { id: "stmarys",   name: "St. Mary's Annex", sub: "Service entrance on the north side · HEPA rules on floor 3", contact: "Facilities desk" },
  { id: "depot",     name: "Summit Air Depot", sub: "Your own shop · will-call cage — grab and go", contact: "Shop foreman" }
];

/* The customer's window is a REQUIRED RANGE. A bid answers with the vendor's
   own promised window inside that range (promises[]). */
const WINDOWS = [
  { id: "asap",     short: "ASAP", name: "ASAP — next truck out", sub: "Within the hour where offered", eta: "today by 1:30 PM",
    promises: ["Within 30 minutes", "In 45–60 minutes"] },
  { id: "today",    short: "Today", name: "Today, before 5 PM",    sub: "On the afternoon route",      eta: "today by 5:00 PM",
    promises: ["Today, 11 AM–12 PM", "Today, 1–2 PM", "Today, 3–5 PM"] },
  { id: "tomorrow", short: "Tomorrow", name: "Tomorrow morning",   sub: "First route of the day",       eta: "tomorrow by 9:00 AM",
    promises: ["Tomorrow, 7–8 AM", "Tomorrow, 8–9:30 AM"] }
];

/* Optional services a bid can offer. Chosen in the bid DETAILS view only —
   never shown on the customer's bid cards. */
const ADDONS = [
  { id: "inside", name: "Inside delivery — carried to the air handler", price: 35 },
  { id: "haul",   name: "Haul away the old filters", price: 20 },
  { id: "call",   name: "Call the site contact 30 minutes out", price: 0 }
];

/* Vendor accounts on the network. Missing price/stock entry = doesn't carry that filter. */
const VENDORS = [
  { id: "volunteer", name: "Volunteer Filter Supply", city: "Nashville", blurb: "Stocked deep on standard sizes",
    prices: { "FL-20251-08": 57.90, "FL-16204-13": 124.00, "FL-16251-11": 69.50, "FL-20204-08": 94.00, "FL-24244-13": 139.00 },
    stock:  { "FL-20251-08": 34, "FL-16204-13": 9, "FL-16251-11": 22, "FL-20204-08": 11, "FL-24244-13": 6 },
    sites: ["rivergate", "stmarys", "depot"], windows: ["asap", "today", "tomorrow"],
    fees: { asap: 19.95, today: 9.95, tomorrow: 0 } },
  { id: "musiccity", name: "Music City Air Filters", city: "Nashville", blurb: "Lowest case prices in town — thinner catalog",
    prices: { "FL-20251-08": 52.40, "FL-16251-11": 64.90, "FL-20204-08": 89.00, "FL-24244-13": 131.00 },
    stock:  { "FL-20251-08": 40, "FL-16251-11": 18, "FL-20204-08": 8, "FL-24244-13": 4 },
    sites: ["rivergate", "stmarys", "depot"], windows: ["asap", "today", "tomorrow"],
    fees: { asap: 14.95, today: 7.95, tomorrow: 0 } },
  { id: "smoky", name: "Smoky Mountain Filtration", city: "Knoxville", blurb: "Full catalog — runs east Tennessee routes",
    prices: { "FL-20251-08": 63.20, "FL-16204-13": 138.50, "FL-16251-11": 76.00, "FL-20204-08": 102.00, "FL-24244-13": 151.00 },
    stock:  { "FL-20251-08": 28, "FL-16204-13": 12, "FL-16251-11": 16, "FL-20204-08": 9, "FL-24244-13": 5 },
    sites: ["rivergate", "stmarys", "depot"], windows: ["today", "tomorrow"],
    fees: { today: 29.95, tomorrow: 19.95 } },
  { id: "cumberland", name: "Cumberland Filter Co.", city: "Franklin", blurb: "Cheapest cases — priced delivery, smaller coverage",
    prices: { "FL-20251-08": 49.95, "FL-16204-13": 119.00, "FL-16251-11": 61.00, "FL-20204-08": 86.50, "FL-24244-13": 128.00 },
    stock:  { "FL-20251-08": 25, "FL-16204-13": 7, "FL-16251-11": 15, "FL-20204-08": 5, "FL-24244-13": 2 },
    sites: ["rivergate", "depot"], windows: ["asap", "today", "tomorrow"],
    fees: { asap: 34.95, today: 34.95, tomorrow: 24.95 } }
];

/* Standing RFQs from other customers — the vendor feed is never empty.
   Set dressing for the mock; bidding on one just marks the bid as sent. */
const STANDING_RFQS = [
  { id: "s1", from: "Comfort Pros of Tennessee", who: "R. Alvarez · field tech",
    lines: [{ sku: "FL-20251-08", cases: 3 }], siteId: "rivergate", windowId: "today", note: "" },
  { id: "s2", from: "Green Hills Clinic — Facilities", who: "Facilities desk",
    lines: [{ sku: "FL-24244-13", cases: 2 }], siteId: "stmarys", windowId: "tomorrow", note: "Service entrance, north side." }
];

const TAX_RATE = 0.102; // invented blended rate for the mock

const findProduct = (sku) => PRODUCTS.find((p) => p.sku === sku);
const findVendor = (id) => VENDORS.find((v) => v.id === id);
const findSite = (id) => SITES.find((s) => s.id === id);
const findWindow = (id) => WINDOWS.find((w) => w.id === id);
const findAddon = (id) => ADDONS.find((a) => a.id === id);

/* The default promised window a vendor offers inside a required range. */
function promiseFor(v, win) {
  const ix = VENDORS.findIndex((x) => x.id === v.id);
  return win.promises[Math.abs(ix) % win.promises.length];
}

/* Serviceability for ONE vendor — used ONLY to filter that vendor's feed
   (and to decide which simulated bids exist). Reasons are internal to the
   filter; in an open market they are never shown to the customer. */
function cantReasons(v, lines, site, win) {
  const reasons = [];
  lines.forEach((l) => {
    const p = findProduct(l.sku);
    if (v.prices[l.sku] === undefined) reasons.push("doesn't carry");
    else if ((v.stock[l.sku] || 0) < l.cases) reasons.push("stock short");
  });
  if (!v.sites.includes(site.id)) reasons.push("no coverage");
  if (!v.windows.includes(win.id)) reasons.push("can't meet a window in range");
  return reasons;
}

function canService(v, lines, site, win) { return cantReasons(v, lines, site, win).length === 0; }

/* Vendors who can service a request — the only ones who can bid at all. */
function serviceableVendors(lines, site, win) {
  return VENDORS.filter((v) => canService(v, lines, site, win));
}
// ---------------- End marketplace data ----------------

// ---------------- State ----------------
const state = {
  cart: [],            // customer-side RFQ lines { sku, cases }
  site: SITES[0],
  window: WINDOWS[0],
  note: "",
  rfq: null,           // the posted RFQ { id, lines, site, window, note, from, who }
  bids: [],            // bids on the live RFQ { vendorId, prices:{sku:n}, fee, linesTotal, total, promise, mine }
  vendor: null,        // chosen bid, shaped for details { vendor, prices, linesTotal, fee, total, promise }
  addons: [],          // addon ids chosen in the details view for the chosen bid
  order: null,         // { number, code, total, eta }
  entered: "",
  myVendor: "volunteer", // the vendor account being played on the vendor side
  openRfq: null,       // RFQ open on the bid screen (object from inboxRfqs())
  sentBids: {}         // standing RFQ id -> true once a bid is sent on it
};
let simStep = 0;

// ---------------- Helpers ----------------
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(2);

function addonsTotal() {
  return state.addons.reduce((s, id) => s + findAddon(id).price, 0);
}

function grandTotals() {
  if (!state.vendor) return null;
  const sub = state.vendor.linesTotal, fee = state.vendor.fee, add = addonsTotal();
  const tax = (sub + fee + add) * TAX_RATE;
  return { sub, fee, add, tax, total: sub + fee + add + tax };
}

function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setSide(vendorSide) {
  $("tabCustomer").classList.toggle("active", !vendorSide);
  $("tabVendor").classList.toggle("active", vendorSide);
  show(vendorSide ? "screen-vhome" : "screen-home");
}

// ---------------- Speech out (read-back) ----------------
function speak(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

// ---------------- RFQ parser (spoken request -> lines) ----------------
const NUMWORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, a:1, an:1 };

function parseOrder(text) {
  const t = " " + text.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ") + " ";
  const re = /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+cases?\s+of\s+(\d+)\s*(?:by|x|×)\s*(\d+)\s*(?:by|x|×)\s*(\d+)\s*(?:,?\s*)?(?:merv\s*)?(\d{1,2})?/g;
  const lines = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    const cases = NUMWORDS[m[1]] !== undefined ? NUMWORDS[m[1]] : parseInt(m[1], 10);
    const size = m[2] + "×" + m[3] + "×" + m[4];
    const merv = m[5] ? parseInt(m[5], 10) : null;
    const item = PRODUCTS.find((c) => c.size === size && (merv === null || c.merv === merv))
              || PRODUCTS.find((c) => c.size === size);
    if (item && cases > 0) lines.push({ sku: item.sku, cases });
  }
  return lines;
}

const SIM_LINES = [
  "two cases of 20 by 25 by 1 MERV 8, and one case of 16 by 20 by 4 MERV 13",
  "add three cases of 16 by 25 by 1 MERV 11",
  "one case of 20 by 20 by 4 MERV 8"
];

// ---------------- Customer: request lines ----------------
function renderCart() {
  const area = $("cartArea");
  if (!state.cart.length) { area.classList.add("hidden"); return; }
  area.classList.remove("hidden");
  $("cartLines").innerHTML = state.cart.map((l) => {
    const it = findProduct(l.sku);
    const carriers = VENDORS.filter((v) => v.prices[l.sku] !== undefined).length;
    return '<div class="line">' +
      '<div class="line-main"><div class="line-size">' + it.size + ' · MERV ' + it.merv + '</div>' +
      '<div class="line-sub">' + it.pack + ' · carried by ' + carriers + ' of ' + VENDORS.length + ' vendors</div></div>' +
      '<div class="stepper"><button data-dec="' + it.sku + '" aria-label="one less">−</button>' +
      '<span class="qty">' + l.cases + '</span>' +
      '<button data-inc="' + it.sku + '" aria-label="one more">+</button></div></div>';
  }).join("");
  $("stockNote").textContent = "Pricing comes from the vendors' bids, not a house list — pick the job site and the window you require, post the RFQ, and the suppliers who can service it will bid.";
  document.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
  document.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
}

function changeQty(sku, d) {
  const line = state.cart.find((l) => l.sku === sku);
  if (!line) return;
  line.cases += d;
  if (line.cases <= 0) state.cart = state.cart.filter((l) => l.sku !== sku);
  renderCart();
}

function hearOrder(text) {
  $("heardText").textContent = voiceNote + "Heard: “" + text + "”";
  voiceNote = "";
  const lines = parseOrder(text);
  if (!lines.length) {
    speak("I heard you, but I could not match that to a filter. Try the size and MERV rating, like 20 by 25 by 1, MERV 8.");
    return;
  }
  lines.forEach((nl) => {
    const ex = state.cart.find((l) => l.sku === nl.sku);
    if (ex) ex.cases += nl.cases; else state.cart.push(nl);
  });
  renderCart();
  const readback = state.cart.map((l) => { const it = findProduct(l.sku); return l.cases + (l.cases === 1 ? " case" : " cases") + " of " + it.size.replace(/×/g, " by ") + ", MERV " + it.merv; }).join("; ");
  speak("Got it. " + readback + ". Next, pick the job site and the window you require, and post the RFQ to the open market.");
}

// ---------------- Voice in ----------------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recog = null;
let voiceNote = ""; // set when the demo voice stands in for a failed live mic

function simulate(onText, btn, label) {
  const line = SIM_LINES[simStep % SIM_LINES.length]; simStep++;
  label.textContent = "Listening… (demo voice)";
  btn.classList.add("listening");
  setTimeout(() => { btn.classList.remove("listening"); label.textContent = "Tap and talk"; onText(line); }, 900);
}

function listen(onText, btn, label) {
  if (!SR) { // browser has no speech recognition at all (Firefox) — demo voice stands in
    voiceNote = "This browser has no live speech recognition, so the demo voice is standing in. ";
    simulate(onText, btn, label);
    return;
  }
  if (recog) { try { recog.stop(); } catch (e) { /* already stopped */ } }
  let settled = false;
  const fallback = () => {
    if (settled) return; settled = true;
    btn.classList.remove("listening"); label.textContent = "Tap and talk";
    voiceNote = "The live mic didn't come through in this browser, so the demo voice is standing in. ";
    simulate(onText, btn, label);
  };
  try {
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.onresult = (e) => { settled = true; onText(e.results[0][0].transcript); };
    recog.onerror = fallback; // Safari permission/service failures land here
    recog.onend = () => { btn.classList.remove("listening"); label.textContent = "Tap and talk"; if (!settled) fallback(); };
    btn.classList.add("listening");
    label.textContent = "Listening… talk now";
    recog.start();
  } catch (e) { fallback(); }
}

// ---------------- Sites & windows ----------------
function renderSites() {
  $("siteCards").innerHTML = SITES.map((s) =>
    '<button class="card' + (state.site.id === s.id ? " selected" : "") + '" data-site="' + s.id + '">' +
    '<div class="card-name">' + s.name + '</div><div class="card-sub">' + s.sub + '</div>' +
    '<div class="card-sub">Site contact: ' + s.contact + '</div></button>').join("");
  document.querySelectorAll("[data-site]").forEach((b) => b.addEventListener("click", () => {
    state.site = SITES.find((s) => s.id === b.dataset.site); renderSites();
  }));
  $("windowCards").innerHTML = WINDOWS.map((w) =>
    '<button class="card' + (state.window.id === w.id ? " selected" : "") + '" data-win="' + w.id + '">' +
    '<div class="card-name">' + w.name + '</div><div class="card-sub">' + w.sub + '</div></button>').join("");
  document.querySelectorAll("[data-win]").forEach((b) => b.addEventListener("click", () => {
    state.window = WINDOWS.find((w) => w.id === b.dataset.win); renderSites();
  }));
}

// ---------------- Customer: post the RFQ, collect bids ----------------
function bidFromBook(v, lines, win) {
  const prices = {};
  lines.forEach((l) => { prices[l.sku] = v.prices[l.sku]; });
  const linesTotal = lines.reduce((s, l) => s + prices[l.sku] * l.cases, 0);
  const fee = v.fees[win.id] || 0;
  return { vendorId: v.id, prices, fee, linesTotal, total: linesTotal + fee, promise: promiseFor(v, win), mine: false };
}

function postRfq() {
  if (!state.cart.length) return;
  state.rfq = { id: "live", lines: state.cart.map((l) => ({ sku: l.sku, cases: l.cases })),
    site: state.site, window: state.window, note: state.note, from: TECH.company, who: TECH.name + " · field tech" };
  state.vendor = null;
  state.addons = [];
  // Simulated bids: every vendor who can service it bids from its price book.
  // Vendors who can't service it — or who would pass — simply never appear.
  state.bids = serviceableVendors(state.rfq.lines, state.site, state.window)
    .map((v) => bidFromBook(v, state.rfq.lines, state.window));
  renderBids();
  show("screen-bids");
  speak("Your RFQ is out on the open market. " + state.bids.length + " bids so far.");
}

/* The bid card is the whole ballgame for the customer: name, total, promise.
   No breakdown, no blurb, no word from anyone who didn't bid. */
function renderBids() {
  if (!state.rfq) return;
  const ranked = state.bids.slice().sort((a, b) => a.total - b.total);
  $("bidsSummary").textContent = state.bids.length + " bid" + (state.bids.length === 1 ? "" : "s") + " · " +
    state.rfq.site.name + " · you required: " + state.rfq.window.name.toLowerCase() +
    ". Sorted by total — cost carries the most weight, but a tighter promised window can be worth paying for. Tap a bid for its details." +
    (state.bids.some((b) => b.mine) ? "" : " Switch to the vendor side to place one yourself.");
  $("bidsList").innerHTML = ranked.map((b, i) => {
    const v = findVendor(b.vendorId);
    return '<button class="card offer" data-bid="' + b.vendorId + '">' +
    (i === 0 ? '<div class="bestbadge">Lowest total</div>' : "") + (b.mine ? '<div class="bestbadge minebadge">Your bid</div>' : "") +
    '<div class="card-name">' + v.name + '</div>' +
    '<div class="card-sub">Promised window: ' + b.promise + '</div>' +
    '<div class="offer-total">' + money(b.total) + '</div></button>';
  }).join("");
  document.querySelectorAll("[data-bid]").forEach((btn) => btn.addEventListener("click", () => {
    const b = state.bids.find((x) => x.vendorId === btn.dataset.bid);
    state.vendor = { vendor: findVendor(b.vendorId), prices: b.prices, linesTotal: b.linesTotal, fee: b.fee, total: b.total, promise: b.promise };
    state.addons = [];
    renderReview();
    show("screen-review");
  }));
}

// ---------------- Vendor side: pick account, feed, bid ----------------
function renderVendorPick() {
  $("vendorPick").innerHTML = VENDORS.map((v) =>
    '<button class="card' + (state.myVendor === v.id ? " selected" : "") + '" data-vendor="' + v.id + '">' +
    '<div class="card-name">' + v.name + '</div>' +
    '<div class="card-sub">' + v.city + ' · ' + v.blurb + '</div>' +
    '<div class="card-sub">Carries ' + Object.keys(v.prices).length + ' of ' + PRODUCTS.length + ' filters · delivers to ' +
    v.sites.length + ' of ' + SITES.length + ' sites</div></button>').join("");
  document.querySelectorAll("[data-vendor]").forEach((b) => b.addEventListener("click", () => {
    state.myVendor = b.dataset.vendor;
    renderInbox();
    show("screen-vinbox");
  }));
}

/* All open RFQs (the live customer one, when posted, plus standing ones). */
function inboxRfqs() {
  const list = [];
  if (state.rfq) list.push({ id: "live", from: state.rfq.from, who: state.rfq.who, lines: state.rfq.lines,
    site: state.rfq.site, window: state.rfq.window, note: state.rfq.note, live: true });
  STANDING_RFQS.forEach((r) => list.push({ id: r.id, from: r.from, who: r.who, lines: r.lines,
    site: findSite(r.siteId), window: findWindow(r.windowId), note: r.note, live: false }));
  return list;
}

/* The feed is self-filtered: an RFQ the vendor can't service never appears.
   There is nothing to decline and nobody to explain a pass to. */
function renderInbox() {
  const v = findVendor(state.myVendor);
  $("vinboxTitle").textContent = v.name;
  const feed = inboxRfqs().filter((r) => canService(v, r.lines, r.site, r.window));
  $("vinboxSub").textContent = "Your feed — RFQs that fit your catalog, stock, coverage, and windows. Bid, or pass silently; the customer only ever sees bids.";
  $("vinboxList").innerHTML = feed.length ? feed.map((r) => {
    const linesHtml = r.lines.map((l) => { const p = findProduct(l.sku); return l.cases + " × " + p.size + " MERV " + p.merv; }).join(" · ");
    const myBid = r.live ? state.bids.find((b) => b.vendorId === v.id) : null;
    const status = myBid && myBid.mine ? '<div class="card-price">Your bid is in at ' + money(myBid.total) + ' — tap to adjust it</div>'
      : myBid ? '<div class="card-price">A bid from your book is in at ' + money(myBid.total) + ' — tap to adjust it</div>'
      : state.sentBids[r.id] ? '<div class="card-price">Bid sent ✓</div>' : "";
    return '<button class="card" data-rfq="' + r.id + '">' +
      (r.live ? '<div class="bestbadge">Live — from the customer side</div>' : "") +
      '<div class="card-name">' + r.from + '</div>' +
      '<div class="card-sub">' + r.who + ' · ' + r.site.name + ' · requires: ' + r.window.name + '</div>' +
      '<div class="card-sub">' + linesHtml + '</div>' + status + '</button>';
  }).join("") : '<div class="card cant"><div class="card-name">Nothing in your feed</div>' +
    '<div class="card-sub">No open RFQ fits your catalog, stock, coverage, and windows right now.</div></div>';
  document.querySelectorAll("[data-rfq]").forEach((b) => b.addEventListener("click", () => {
    state.openRfq = inboxRfqs().find((r) => r.id === b.dataset.rfq);
    renderBidForm();
    show("screen-vbid");
  }));
}

function renderBidForm() {
  const v = findVendor(state.myVendor), r = state.openRfq;
  $("vbidHead").textContent = v.name + " bidding on " + r.from + " — " + r.site.name + ", requires " + r.window.name.toLowerCase() +
    ". Prices start from your book; change any of them.";
  const existing = r.live ? state.bids.find((b) => b.vendorId === v.id) : null;
  $("vbidLines").innerHTML = r.lines.map((l) => {
    const p = findProduct(l.sku);
    const start = existing && existing.prices[l.sku] !== undefined ? existing.prices[l.sku] : v.prices[l.sku];
    return '<div class="review-row"><span>' + l.cases + ' × ' + p.size + ' MERV ' + p.merv + ' — per case</span>' +
      '<span>$ <input class="priceinput" data-price="' + l.sku + '" type="number" min="0" step="0.01" value="' + start.toFixed(2) + '"></span></div>';
  }).join("");
  $("feeInput").value = (existing ? existing.fee : (v.fees[r.window.id] || 0)).toFixed(2);
  $("promisePick").innerHTML = r.window.promises.map((p) => '<option' + ((existing && existing.promise === p) || (!existing && promiseFor(v, r.window) === p) ? " selected" : "") + '>' + p + '</option>').join("");
  document.querySelectorAll("[data-price]").forEach((inp) => inp.addEventListener("input", updateBidTotal));
  $("feeInput").addEventListener("input", updateBidTotal);
  updateBidTotal();
}

function readBidForm() {
  const r = state.openRfq, prices = {};
  let linesTotal = 0;
  document.querySelectorAll("[data-price]").forEach((inp) => {
    const val = Math.max(0, parseFloat(inp.value) || 0);
    prices[inp.dataset.price] = val;
    const line = r.lines.find((l) => l.sku === inp.dataset.price);
    linesTotal += val * line.cases;
  });
  const fee = Math.max(0, parseFloat($("feeInput").value) || 0);
  return { prices, fee, linesTotal, total: linesTotal + fee, promise: $("promisePick").value };
}

function updateBidTotal() { $("vbidTotal").textContent = money(readBidForm().total); }

function submitBid() {
  const v = findVendor(state.myVendor), r = state.openRfq, f = readBidForm();
  if (r.live) {
    const bid = { vendorId: v.id, prices: f.prices, fee: f.fee, linesTotal: f.linesTotal, total: f.total, promise: f.promise, mine: true };
    const ix = state.bids.findIndex((b) => b.vendorId === v.id);
    if (ix >= 0) state.bids[ix] = bid; else state.bids.push(bid);
    renderBids();
    speak("Bid in. " + v.name + " at " + money(f.total) + ", promising " + f.promise + ".");
    setSide(false); show("screen-bids");
  } else {
    state.sentBids[r.id] = true;
    renderInbox();
    show("screen-vinbox");
  }
}

// ---------------- Bid details (breakdown + optional services live here) ----------------
function reviewText() {
  const t = grandTotals(), v = state.vendor.vendor, prices = state.vendor.prices;
  const lines = state.cart.map((l) => { const it = findProduct(l.sku); return l.cases + " × " + it.size + " MERV " + it.merv + " — " + money(prices[l.sku] * l.cases); }).join("; ");
  return { lines, t,
    spoken: "Bid from " + v.name + ": " + lines.replace(/×/g, "cases of") +
      ". Delivered to " + state.site.name + ", promised " + state.vendor.promise +
      ". Items " + money(t.sub) + ", delivery " + money(t.fee) +
      (t.add ? ", optional services " + money(t.add) : "") + ", tax " + money(t.tax) +
      ". Estimated total " + money(t.total) + "." };
}

function renderReview() {
  const { t } = reviewText(), v = state.vendor.vendor, prices = state.vendor.prices;
  $("reviewBody").innerHTML =
    '<div class="review-row"><span>Vendor</span><span>' + v.name + ' · ' + v.city + '</span></div>' +
    state.cart.map((l) => { const it = findProduct(l.sku);
      return '<div class="review-row"><span>' + l.cases + ' × ' + it.size + ' MERV ' + it.merv + '</span><span>' + money(prices[l.sku] * l.cases) + '</span></div>'; }).join("") +
    '<div class="review-row"><span>Deliver to</span><span>' + state.site.name + '</span></div>' +
    '<div class="review-row"><span>You required</span><span>' + state.window.name + '</span></div>' +
    '<div class="review-row"><span>They promise</span><span>' + state.vendor.promise + '</span></div>' +
    (state.note ? '<div class="review-row"><span>Drop-off note</span><span>' + state.note + '</span></div>' : "") +
    '<div class="review-row"><span>Delivery</span><span>' + money(t.fee) + '</span></div>' +
    (t.add ? '<div class="review-row"><span>Optional services</span><span>' + money(t.add) + '</span></div>' : "") +
    '<div class="review-row"><span>Tax (est.)</span><span>' + money(t.tax) + '</span></div>' +
    '<div class="review-row review-total"><span>Estimated total</span><span>' + money(t.total) + '</span></div>';
  $("addonsArea").innerHTML = ADDONS.map((a) =>
    '<label class="addon"><input type="checkbox" data-addon="' + a.id + '"' + (state.addons.includes(a.id) ? " checked" : "") + '>' +
    '<span class="addon-name">' + a.name + '</span><span class="addon-price">' + (a.price ? "+" + money(a.price) : "Free") + '</span></label>').join("");
  document.querySelectorAll("[data-addon]").forEach((cb) => cb.addEventListener("change", () => {
    state.addons = Array.from(document.querySelectorAll("[data-addon]:checked")).map((x) => x.dataset.addon);
    renderReview();
  }));
  $("detailsTotal").innerHTML = "";
}

// ---------------- Place order + text verification ----------------
function placeOrder() {
  const t = grandTotals(), v = state.vendor.vendor;
  if (t.total > TECH.limit) { speak("That is over your " + money(TECH.limit) + " order limit. Your dispatcher gets a request to approve it."); return; }
  const num = "FP-" + Math.floor(100000 + Math.random() * 900000);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.order = { number: num, code, total: t.total, eta: state.vendor.promise };
  state.entered = "";
  $("smsBody").textContent = "FilterPhone · " + v.name + ": Order " + num + " confirmed for " + state.site.name +
    ". Promised window: " + state.vendor.promise + ". Estimated total " + money(t.total) +
    ". Your verification code is " + code + " — enter it in the app to lock your delivery slot.";
  renderDots();
  show("screen-verify");
}

function renderDots() {
  $("codeDots").innerHTML = [0,1,2,3,4,5].map((i) =>
    '<div class="dot' + (i < state.entered.length ? " filled" : "") + '"></div>').join("");
}

function keyPress(k) {
  if (!state.order) return;
  if (k === "clr") state.entered = "";
  else if (k === "del") state.entered = state.entered.slice(0, -1);
  else if (state.entered.length < 6) state.entered += k;
  $("codeError").textContent = "";
  renderDots();
  if (state.entered.length === 6) {
    if (state.entered === state.order.code) {
      const v = state.vendor.vendor;
      $("doneLine").textContent = "Order " + state.order.number + " · " + v.name + " · " + money(state.order.total) +
        " · promised " + state.order.eta + " at " + state.site.name + ".";
      $("timeline").innerHTML =
        '<div class="tl-row"><span>✓</span> Order placed with ' + v.name + ' and code verified</div>' +
        '<div class="tl-row"><span>✓</span> Picked and job-tagged at ' + v.name + '</div>' +
        '<div class="tl-row pending"><span>○</span> Out for delivery — live text updates on the way</div>' +
        '<div class="tl-row pending"><span>○</span> Delivered — photo confirmation to ' + state.site.contact + '</div>';
      speak("Delivery locked in. Order " + state.order.number + " with " + v.name + ", promised " + state.order.eta + ".");
      show("screen-done");
    } else {
      $("codeError").textContent = "That code doesn't match — check the text and try again.";
      state.entered = "";
      renderDots();
    }
  }
}

// ---------------- Wiring ----------------
$("tabCustomer").addEventListener("click", () => setSide(false));
$("tabVendor").addEventListener("click", () => { renderVendorPick(); setSide(true); });
$("micBtn").addEventListener("click", () => listen(hearOrder, $("micBtn"), $("micLabel")));
$("noteBtn").addEventListener("click", () => {
  const samples = ["Leave them at dock B and text Marcus when you're close.", "Gate code is on file — ring the service bell twice."];
  const sample = samples[Math.floor(Math.random() * samples.length)];
  if (!SR) { state.note = sample; $("noteHeard").textContent = "Note: “" + sample + "”"; $("noteLabel").textContent = "Note saved — tap to redo"; return; }
  listen((txt) => { state.note = txt; $("noteHeard").textContent = "Note: “" + txt + "”"; $("noteLabel").textContent = "Note saved — tap to redo"; }, $("noteBtn"), $("noteLabel"));
});
$("toSiteBtn").addEventListener("click", () => { renderSites(); show("screen-site"); });
$("postRfqBtn").addEventListener("click", postRfq);
$("toVendorBtn").addEventListener("click", () => { renderVendorPick(); setSide(true); });
$("submitBidBtn").addEventListener("click", submitBid);
$("toReviewSpeakBtn").addEventListener("click", () => speak(reviewText().spoken));
$("placeBtn").addEventListener("click", placeOrder);
$("againBtn").addEventListener("click", () => {
  state.cart = []; state.vendor = null; state.addons = []; state.order = null; state.rfq = null; state.bids = [];
  renderCart(); show("screen-home");
});
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));
$("keypad").innerHTML = ["1","2","3","4","5","6","7","8","9","clr","0","del"]
  .map((k) => '<button data-key="' + k + '">' + (k === "clr" ? "C" : k === "del" ? "⌫" : k) + "</button>").join("");
document.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => keyPress(b.dataset.key)));
if ($("voiceMode")) $("voiceMode").textContent = SR
  ? "Live mic is available in this browser — tap and talk for real."
  : "This browser can't do live speech (Firefox has none; Safari's often fails silently) — the demo voice stands in so the flow still runs. Chrome does live speech.";
renderCart();
