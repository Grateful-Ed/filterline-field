"use strict";
/* FilterLine — third-party filter ordering marketplace (mock).
   Order side: an HVAC tech speaks an order for a job site.
   Vendor side: any filter supplier with a vendor account can answer.
   The platform's job: find who can ACTUALLY service the order
   (stock, delivery coverage, window) — then rank those by price.
   Demo data only: every person, company, site, price and stock count is invented. */

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

const WINDOWS = [
  { id: "asap",     short: "ASAP", name: "ASAP — next truck out", sub: "Within the hour where offered", eta: "today by 1:30 PM" },
  { id: "today",    short: "Today", name: "Today, before 5 PM",    sub: "On the afternoon route",      eta: "today by 5:00 PM" },
  { id: "tomorrow", short: "Tomorrow", name: "Tomorrow morning",   sub: "First route of the day",       eta: "tomorrow by 9:00 AM" }
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

const TAX_RATE = 0.102; // invented blended rate for the mock

const findProduct = (sku) => PRODUCTS.find((p) => p.sku === sku);
const findVendor = (id) => VENDORS.find((v) => v.id === id);

/* The matching engine: serviceability is the gate, price only ranks who passed it. */
function matchVendors(cart, site, win) {
  const ok = [], cant = [];
  VENDORS.forEach((v) => {
    const reasons = [];
    cart.forEach((l) => {
      const p = findProduct(l.sku);
      if (v.prices[l.sku] === undefined) reasons.push("Doesn't carry " + p.size + " MERV " + p.merv);
      else if ((v.stock[l.sku] || 0) < l.cases) reasons.push("Only " + (v.stock[l.sku] || 0) + " cases of " + p.size + " MERV " + p.merv + " on hand");
    });
    if (!v.sites.includes(site.id)) reasons.push("Doesn't deliver to " + site.name);
    if (!v.windows.includes(win.id)) reasons.push("Can't do " + win.short + " from " + v.city);
    if (reasons.length) { cant.push({ vendor: v, reasons }); return; }
    const linesTotal = cart.reduce((s, l) => s + v.prices[l.sku] * l.cases, 0);
    const fee = v.fees[win.id] || 0;
    ok.push({ vendor: v, linesTotal, fee, total: linesTotal + fee });
  });
  ok.sort((a, b) => a.total - b.total);
  return { ok, cant };
}
// ---------------- End marketplace data ----------------

// ---------------- State ----------------
const state = {
  cart: [],            // { sku, cases }
  site: SITES[0],
  window: WINDOWS[0],
  note: "",
  vendor: null,        // chosen match { vendor, linesTotal, fee, total }
  order: null,         // { number, code, total, eta }
  entered: ""
};
let simStep = 0;

// ---------------- Helpers ----------------
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(2);

function grandTotals() {
  if (!state.vendor) return null;
  const sub = state.vendor.linesTotal, fee = state.vendor.fee;
  const tax = (sub + fee) * TAX_RATE;
  return { sub, fee, tax, total: sub + fee + tax };
}

function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- Speech out (read-back) ----------------
function speak(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

// ---------------- Order parser ----------------
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

// ---------------- Cart rendering ----------------
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
  $("stockNote").textContent = "Pricing comes from the vendor network, not a house list — pick the job site and the window, and you'll see who can actually service this order and what they'll charge.";
  document.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
  document.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
}

function changeQty(sku, d) {
  const line = state.cart.find((l) => l.sku === sku);
  if (!line) return;
  line.cases += d;
  if (line.cases <= 0) state.cart = state.cart.filter((l) => l.sku !== sku);
  state.vendor = null;
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
  state.vendor = null;
  renderCart();
  const readback = state.cart.map((l) => { const it = findProduct(l.sku); return l.cases + (l.cases === 1 ? " case" : " cases") + " of " + it.size.replace(/×/g, " by ") + ", MERV " + it.merv; }).join("; ");
  speak("Got it. " + readback + ". Next, pick the job site and the window, and I will put it out to the vendor network.");
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
    state.site = SITES.find((s) => s.id === b.dataset.site); state.vendor = null; renderSites();
  }));
  $("windowCards").innerHTML = WINDOWS.map((w) =>
    '<button class="card' + (state.window.id === w.id ? " selected" : "") + '" data-win="' + w.id + '">' +
    '<div class="card-name">' + w.name + '</div><div class="card-sub">' + w.sub + '</div></button>').join("");
  document.querySelectorAll("[data-win]").forEach((b) => b.addEventListener("click", () => {
    state.window = WINDOWS.find((w) => w.id === b.dataset.win); state.vendor = null; renderSites();
  }));
}

// ---------------- Offers (the network answers) ----------------
function renderOffers() {
  const { ok, cant } = matchVendors(state.cart, state.site, state.window);
  $("offersSummary").textContent = ok.length + " of " + VENDORS.length + " vendors on the network can service this order — " +
    state.site.name + ", " + state.window.name.toLowerCase() + ". Ranked by items + delivery, before tax.";
  $("offersList").innerHTML = ok.map((o, i) =>
    '<button class="card offer' + (state.vendor && state.vendor.vendor.id === o.vendor.id ? " selected" : "") + '" data-offer="' + o.vendor.id + '">' +
    (i === 0 ? '<div class="bestbadge">Best price</div>' : "") +
    '<div class="card-name">' + o.vendor.name + '</div>' +
    '<div class="card-sub">' + o.vendor.city + ' · ' + o.vendor.blurb + '</div>' +
    '<div class="card-sub">Items ' + money(o.linesTotal) + ' · Delivery ' + (o.fee ? money(o.fee) : "free") + ' · Arrives ' + state.window.eta + '</div>' +
    '<div class="offer-total">' + money(o.total) + '</div></button>').join("");
  document.querySelectorAll("[data-offer]").forEach((b) => b.addEventListener("click", () => {
    state.vendor = ok.find((o) => o.vendor.id === b.dataset.offer);
    renderReview();
    show("screen-review");
  }));
  $("cantList").innerHTML = cant.length
    ? '<h3 class="section-title">Can\'t service this order</h3>' + cant.map((c) =>
      '<div class="card cant"><div class="card-name">' + c.vendor.name + '</div>' +
      '<div class="card-sub">' + c.vendor.city + '</div>' +
      c.reasons.map((r) => '<div class="reason">✕ ' + r + '</div>').join("") + '</div>').join("")
    : "";
}

// ---------------- Vendor's side (visual explainer — deliberately not interactive) ----------------
function renderVendorView() {
  const v1 = findVendor("volunteer"), v2 = findVendor("musiccity");
  const linesHtml = state.cart.map((l) => { const p = findProduct(l.sku);
    return '<div class="review-row"><span>' + l.cases + ' × ' + p.size + ' MERV ' + p.merv + '</span><span>' + p.pack + '</span></div>'; }).join("");
  const q = matchVendors(state.cart, state.site, state.window).ok.find((o) => o.vendor.id === "volunteer");
  $("vendorPanels").innerHTML =
    '<div class="ding">🔔 Ding — new order request</div>' +
    '<div class="vpanel"><div class="card-name">' + v1.name + '’s screen</div>' +
    '<div class="card-sub">' + TECH.company + ' · ' + state.site.name + ' · ' + state.window.name + '</div>' + linesHtml +
    (q ? '<div class="card-sub">Their stock covers this order. On their side, the quote is already priced from their own list: items ' + money(q.linesTotal) + ' + delivery ' + (q.fee ? money(q.fee) : "free") + '.</div>'
      : '<div class="reason">✕ This time even their stock doesn\'t cover it.</div>') +
    '<div class="fakecta">' + (q ? 'Quote ' + money(q.total) : 'Quote') + '</div><div class="fakecta alt">Can\'t service</div></div>' +
    '<div class="ding">🔔 Ding — same request, same second</div>' +
    '<div class="vpanel"><div class="card-name">' + v2.name + '’s screen</div>' +
    '<div class="card-sub">The request arrives identically — but one line isn\'t in their catalog:</div>' + linesHtml +
    '<div class="reason">✕ 16×20×4 MERV 13 — not carried</div>' +
    '<div class="card-sub">So their one tap is the decline, with the reason attached. No dead air for the tech, no wasted quote for them.</div>' +
    '<div class="fakecta alt">Decline — doesn\'t carry 16×20×4 MERV 13</div></div>' +
    '<p class="heard">Shown as a picture, not wired up — on purpose. The vendor is at a desk or a warehouse screen, not on a roof: no voice input, no mic, just the ding and the request.</p>';
}

// ---------------- Review ----------------
function reviewText() {
  const t = grandTotals(), v = state.vendor.vendor;
  const lines = state.cart.map((l) => { const it = findProduct(l.sku); return l.cases + " × " + it.size + " MERV " + it.merv + " — " + money(v.prices[l.sku] * l.cases); }).join("; ");
  return { lines, t,
    spoken: "Your order with " + v.name + ": " + lines.replace(/×/g, "cases of") +
      ". Delivered to " + state.site.name + ", " + state.window.eta +
      ". Items " + money(t.sub) + ", delivery " + money(t.fee) + ", tax " + money(t.tax) +
      ". Estimated total " + money(t.total) + "." };
}

function renderReview() {
  const { t } = reviewText(), v = state.vendor.vendor;
  $("reviewBody").innerHTML =
    '<div class="review-row"><span>Vendor</span><span>' + v.name + ' · ' + v.city + '</span></div>' +
    state.cart.map((l) => { const it = findProduct(l.sku);
      return '<div class="review-row"><span>' + l.cases + ' × ' + it.size + ' MERV ' + it.merv + '</span><span>' + money(v.prices[l.sku] * l.cases) + '</span></div>'; }).join("") +
    '<div class="review-row"><span>Deliver to</span><span>' + state.site.name + '</span></div>' +
    '<div class="review-row"><span>Arrives</span><span>' + state.window.eta + '</span></div>' +
    (state.note ? '<div class="review-row"><span>Drop-off note</span><span>' + state.note + '</span></div>' : "") +
    '<div class="review-row"><span>Delivery</span><span>' + money(t.fee) + '</span></div>' +
    '<div class="review-row"><span>Tax (est.)</span><span>' + money(t.tax) + '</span></div>' +
    '<div class="review-row review-total"><span>Estimated total</span><span>' + money(t.total) + '</span></div>';
}

// ---------------- Place order + text verification ----------------
function placeOrder() {
  const t = grandTotals(), v = state.vendor.vendor;
  if (t.total > TECH.limit) { speak("That is over your " + money(TECH.limit) + " order limit. Your dispatcher gets a request to approve it."); return; }
  const num = "FL-" + Math.floor(100000 + Math.random() * 900000);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.order = { number: num, code, total: t.total, eta: state.window.eta };
  state.entered = "";
  $("smsBody").textContent = "FilterLine · " + v.name + ": Order " + num + " confirmed for " + state.site.name +
    ". Arriving " + state.window.eta + ". Estimated total " + money(t.total) +
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
        " · arriving " + state.order.eta + " at " + state.site.name + ".";
      $("timeline").innerHTML =
        '<div class="tl-row"><span>✓</span> Order placed with ' + v.name + ' and code verified</div>' +
        '<div class="tl-row"><span>✓</span> Picked and job-tagged at ' + v.name + '</div>' +
        '<div class="tl-row pending"><span>○</span> Out for delivery — live text updates on the way</div>' +
        '<div class="tl-row pending"><span>○</span> Delivered — photo confirmation to ' + state.site.contact + '</div>';
      speak("Delivery locked in. Order " + state.order.number + " with " + v.name + ", arriving " + state.order.eta + ".");
      show("screen-done");
    } else {
      $("codeError").textContent = "That code doesn't match — check the text and try again.";
      state.entered = "";
      renderDots();
    }
  }
}

// ---------------- Wiring ----------------
$("micBtn").addEventListener("click", () => listen(hearOrder, $("micBtn"), $("micLabel")));
$("noteBtn").addEventListener("click", () => {
  const samples = ["Leave them at dock B and text Marcus when you're close.", "Gate code is on file — ring the service bell twice."];
  const sample = samples[Math.floor(Math.random() * samples.length)];
  if (!SR) { state.note = sample; $("noteHeard").textContent = "Note: “" + sample + "”"; $("noteLabel").textContent = "Note saved — tap to redo"; return; }
  listen((txt) => { state.note = txt; $("noteHeard").textContent = "Note: “" + txt + "”"; $("noteLabel").textContent = "Note saved — tap to redo"; }, $("noteBtn"), $("noteLabel"));
});
$("toSiteBtn").addEventListener("click", () => { renderSites(); show("screen-site"); });
$("toOffersBtn").addEventListener("click", () => { renderOffers(); show("screen-offers"); });
$("vendorViewBtn").addEventListener("click", () => { renderVendorView(); show("screen-vendor"); });
$("toReviewSpeakBtn").addEventListener("click", () => speak(reviewText().spoken));
$("placeBtn").addEventListener("click", placeOrder);
$("againBtn").addEventListener("click", () => { state.cart = []; state.vendor = null; state.order = null; renderCart(); show("screen-home"); });
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));
$("keypad").innerHTML = ["1","2","3","4","5","6","7","8","9","clr","0","del"]
  .map((k) => '<button data-key="' + k + '">' + (k === "clr" ? "C" : k === "del" ? "⌫" : k) + "</button>").join("");
document.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => keyPress(b.dataset.key)));
if ($("voiceMode")) $("voiceMode").textContent = SR
  ? "Live mic is available in this browser — tap and talk for real."
  : "This browser can't do live speech (Firefox has none; Safari's often fails silently) — the demo voice stands in so the flow still runs. Chrome does live speech.";
renderCart();
