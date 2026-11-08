"use strict";
/* FilterLine Field — voice-first filter ordering mock.
   Demo data only: every person, company, site, price and stock count is invented. */

// ---------------- Demo data ----------------
const TECH = { name: "Dale R.", company: "Summit Air Mechanical", crew: "Crew 7", van: "Van 214", limit: 750 };

const CATALOG = [
  { sku: "FL-20251-08", size: "20×25×1", merv: 8,  pack: "Case of 12 · pleated", price: 58.20,  nash: 34, jc: 41 },
  { sku: "FL-16204-13", size: "16×20×4", merv: 13, pack: "Case of 6 · deep pleat", price: 129.00, nash: 9,  jc: 14 },
  { sku: "FL-16251-11", size: "16×25×1", merv: 11, pack: "Case of 12 · pleated", price: 71.40,  nash: 22, jc: 18 },
  { sku: "FL-20204-08", size: "20×20×4", merv: 8,  pack: "Case of 6 · deep pleat", price: 96.75,  nash: 0,  jc: 11 },
  { sku: "FL-24244-13", size: "24×24×4", merv: 13, pack: "Case of 5 · deep pleat", price: 142.30, nash: 6,  jc: 3 }
];

const SITES = [
  { id: "rivergate", name: "Rivergate Tower", sub: "Downtown · dock B, off 2nd Ave — call the site contact on arrival", contact: "Marcus · site lead" },
  { id: "stmarys",   name: "St. Mary's Annex", sub: "Service entrance on the north side · HEPA rules on floor 3", contact: "Facilities desk" },
  { id: "depot",     name: "Summit Air Depot", sub: "Your own shop · will-call cage — grab and go", contact: "Shop foreman" }
];

const WINDOWS = [
  { id: "asap",     name: "ASAP — next truck out", sub: "Leaves Nashville within the hour", fee: 24.95, eta: "today by 1:30 PM" },
  { id: "today",    name: "Today, before 5 PM",    sub: "On the afternoon route",          fee: 14.95, eta: "today by 5:00 PM" },
  { id: "tomorrow", name: "Tomorrow morning",      sub: "First route of the day",           fee: 0,     eta: "tomorrow by 9:00 AM" }
];

const TAX_RATE = 0.102; // invented blended rate for the mock

// ---------------- State ----------------
const state = {
  cart: [],            // { sku, cases }
  site: SITES[0],
  window: WINDOWS[0],
  note: "",
  order: null,         // { number, code, total, eta }
  entered: ""
};
let simStep = 0; // cycles the simulated voice lines

// ---------------- Helpers ----------------
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(2);
const findSku = (sku) => CATALOG.find((c) => c.sku === sku);

function totals() {
  const sub = state.cart.reduce((s, l) => s + findSku(l.sku).price * l.cases, 0);
  const fee = state.cart.length ? state.window.fee : 0;
  const tax = (sub + fee) * TAX_RATE;
  return { sub, fee, tax, total: sub + fee + tax };
}

function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- Speech out (read-back) ----------------
function speak(text) {
  $("heardText").dataset.lastSpoken = text; // kept for debugging the mock
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
    const item = CATALOG.find((c) => c.size === size && (merv === null || c.merv === merv))
              || CATALOG.find((c) => c.size === size);
    if (item && cases > 0) lines.push({ sku: item.sku, cases });
  }
  return lines;
}

// Simulated lines the mock "hears" when no real mic is available.
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
    const it = findSku(l.sku);
    return '<div class="line">' +
      '<div class="line-main"><div class="line-size">' + it.size + ' · MERV ' + it.merv + '</div>' +
      '<div class="line-sub">' + it.pack + ' · ' + money(it.price) + ' / case</div></div>' +
      '<div class="stepper"><button data-dec="' + it.sku + '" aria-label="one less">−</button>' +
      '<span class="qty">' + l.cases + '</span>' +
      '<button data-inc="' + it.sku + '" aria-label="one more">+</button></div>' +
      '<div class="line-price">' + money(it.price * l.cases) + '</div></div>';
  }).join("");
  const thin = state.cart.filter((l) => { const it = findSku(l.sku); return it.nash + it.jc < l.cases; });
  const split = state.cart.some((l) => findSku(l.sku).nash === 0);
  $("stockNote").textContent =
    thin.length ? "Heads up: one line is short at both warehouses — the office gets a flag before this promises a time."
    : split ? "Stock check: one line ships from Johnson City on Filterful's own truck — the ETA already accounts for it."
    : "Stock check: everything on this order is on the shelf in Nashville.";
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
  $("heardText").textContent = "Heard: “" + text + "”";
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
  const readback = state.cart.map((l) => { const it = findSku(l.sku); return l.cases + (l.cases === 1 ? " case" : " cases") + " of " + it.size.replace(/×/g, " by ") + ", MERV " + it.merv; }).join("; ");
  speak("Got it. " + readback + ". Running total " + money(totals().sub) + " before delivery and tax.");
}

// ---------------- Voice in ----------------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recog = null;

function listen(onText, btn, label) {
  if (!SR) { // simulated voice: walk the sample lines
    const line = SIM_LINES[simStep % SIM_LINES.length]; simStep++;
    label.textContent = "Listening… (simulated)";
    btn.classList.add("listening");
    setTimeout(() => { btn.classList.remove("listening"); label.textContent = "Tap and talk"; onText(line); }, 900);
    return;
  }
  if (recog) { recog.stop(); }
  recog = new SR();
  recog.lang = "en-US";
  recog.interimResults = false;
  recog.onresult = (e) => onText(e.results[0][0].transcript);
  recog.onend = () => { btn.classList.remove("listening"); label.textContent = "Tap and talk"; };
  recog.onerror = recog.onend;
  btn.classList.add("listening");
  label.textContent = "Listening… talk now";
  recog.start();
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
    '<div class="card-name">' + w.name + '</div><div class="card-sub">' + w.sub + '</div>' +
    '<div class="card-price">' + (w.fee ? money(w.fee) + " delivery" : "Free delivery") + '</div></button>').join("");
  document.querySelectorAll("[data-win]").forEach((b) => b.addEventListener("click", () => {
    state.window = WINDOWS.find((w) => w.id === b.dataset.win); renderSites();
  }));
}

// ---------------- Review ----------------
function reviewText() {
  const t = totals();
  const lines = state.cart.map((l) => { const it = findSku(l.sku); return l.cases + " × " + it.size + " MERV " + it.merv + " — " + money(it.price * l.cases); }).join("; ");
  return { lines, t,
    spoken: "Your order: " + lines.replace(/×/g, "cases of") +
      ". Delivered to " + state.site.name + ", " + state.window.eta +
      ". Items " + money(t.sub) + ", delivery " + money(t.fee) + ", tax " + money(t.tax) +
      ". Estimated total " + money(t.total) + "." };
}

function renderReview() {
  const { lines, t } = reviewText();
  $("reviewBody").innerHTML =
    state.cart.map((l) => { const it = findSku(l.sku);
      return '<div class="review-row"><span>' + l.cases + ' × ' + it.size + ' MERV ' + it.merv + '</span><span>' + money(it.price * l.cases) + '</span></div>'; }).join("") +
    '<div class="review-row"><span>Deliver to</span><span>' + state.site.name + '</span></div>' +
    '<div class="review-row"><span>Arrives</span><span>' + state.window.eta + '</span></div>' +
    (state.note ? '<div class="review-row"><span>Drop-off note</span><span>' + state.note + '</span></div>' : "") +
    '<div class="review-row"><span>Delivery</span><span>' + money(t.fee) + '</span></div>' +
    '<div class="review-row"><span>Tax (est.)</span><span>' + money(t.tax) + '</span></div>' +
    '<div class="review-row review-total"><span>Estimated total</span><span>' + money(t.total) + '</span></div>';
  return lines;
}

// ---------------- Place order + text verification ----------------
function placeOrder() {
  const t = totals();
  if (t.total > TECH.limit) { speak("That is over your " + money(TECH.limit) + " order limit. Your dispatcher gets a request to approve it."); return; }
  const num = "FL-" + Math.floor(100000 + Math.random() * 900000);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.order = { number: num, code, total: t.total, eta: state.window.eta };
  state.entered = "";
  $("smsBody").textContent = "FilterLine: Order " + num + " confirmed for " + state.site.name +
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
      $("doneLine").textContent = "Order " + state.order.number + " · " + money(state.order.total) +
        " · arriving " + state.order.eta + " at " + state.site.name + ".";
      $("timeline").innerHTML =
        '<div class="tl-row"><span>✓</span> Order placed and code verified</div>' +
        '<div class="tl-row"><span>✓</span> Picked and job-tagged at Nashville</div>' +
        '<div class="tl-row pending"><span>○</span> Out for delivery — live text updates on the way</div>' +
        '<div class="tl-row pending"><span>○</span> Delivered — photo confirmation to ' + state.site.contact + '</div>';
      speak("Delivery locked in. Order " + state.order.number + ", arriving " + state.order.eta + ".");
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
$("toReviewBtn").addEventListener("click", () => { renderReview(); show("screen-review"); speak(reviewText().spoken); });
$("readBackBtn").addEventListener("click", () => speak(reviewText().spoken));
$("placeBtn").addEventListener("click", placeOrder);
$("againBtn").addEventListener("click", () => { state.cart = []; state.order = null; renderCart(); show("screen-home"); });
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));
$("keypad").innerHTML = ["1","2","3","4","5","6","7","8","9","clr","0","del"]
  .map((k) => '<button data-key="' + k + '">' + (k === "clr" ? "C" : k === "del" ? "⌫" : k) + "</button>").join("");
document.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => keyPress(b.dataset.key)));
renderCart();
