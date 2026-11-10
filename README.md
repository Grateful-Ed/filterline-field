# FilterPhone — the filter RFQ broker (mock)

A mock build of FilterPhone, a real-time broker between on-site customers and
filter suppliers, built to the FilterPhone Specification Documentation (draft,
2026-11-09). Customer side and vendor side live in this single build.

**It is a mock.** Demo data only — every person, company, site, price, and stock
count is invented. Bids from vendors you are not playing are simulated from
their price books. No RFQ or order goes anywhere.

## The model — an open market

FilterPhone runs like the freight market: an open auction, not directed sends.

- **Customer side** — an on-site tech (the app opens already knowing who he is)
  speaks an RFQ: filter lines, a job site, and the delivery window he
  *requires*. Voice first, touch always available. He posts it to the open
  market.
- **Vendor side** — any filter supplier with a vendor account. Its feed is
  filtered by its own constraints (catalog, stock, delivery coverage,
  windows): an RFQ appears only if the vendor can service it. The vendor then
  bids — from its own price book, promising a delivery window inside the
  customer's required range — or passes.
- **Passing is silent.** A vendor who doesn't bid is invisible to the
  customer: no decline, no reason, no "can't service" list. Customers don't
  know or care why someone didn't bid; they care who did. (Decline-with-reason
  belongs to *directed* RFQs — sent to a specific vendor — a real-build
  feature, deliberately not in this mock.)
- **The bid card is three things:** vendor name, total, promised delivery
  window. Cost carries the most influence on the award, but it is not the
  decider — a tighter promised window can outweigh a price gap.
- **Details live in the details view.** The charge breakdown, extra details,
  and optional add-on services appear only when a bid is opened — never on
  the card. In this mock, one page stands in for both the details view and
  the order review; in a full build they are separate.

## The flow

1. **The customer talks.** One big mic button. He says the request out loud
   ("two cases of 20 by 25 by 1, MERV 8…"), sees the transcript, and the app
   parses it into RFQ lines. Glove-sized steppers adjust quantities.
2. **Point at the job.** A saved job-site card, the required delivery window,
   an optional spoken drop-off note. Post the RFQ.
3. **Vendors bid.** Use the side switch at the top of the phone to play a
   vendor: pick an account, open the live RFQ in its feed, set prices and a
   promised window, bid. Your bid replaces that vendor's simulated one on the
   customer's screen.
4. **Pick a bid, read its details, lock it by text.** Optional services can
   be added in the details view. The winning vendor confirms by text with
   the promise, the total, and a 6-digit code. The code goes in on a
   glove-sized keypad and the delivery is locked.

## Voice

Where the browser supports it, the mic uses real speech recognition and the
read-back uses real speech synthesis. Chrome does live speech well; where live
speech is unavailable (Firefox has none; Safari's often fails silently), the
mock's demo voice stands in so the flow can still be walked end to end.

## Lineage

FilterPhone supersedes the FilterLine ordering mock. The serviceability
matching engine, the spoken-order parser, the dummy marketplace data, and the
text-code lock carry over; the order-then-rank flow became an RFQ with live
bids, and the vendor side — a static picture in FilterLine — is a working
side of this build. A later pass rebuilt the marketplace to the open-auction
model above: silent non-bidders, a self-filtered vendor feed, promised
windows on the bid cards, and details behind the bid.

## Files

- `index.html` — the page: explainer column + the phone.
- `app.js` — all logic: dummy data, the feed filter, the RFQ/bid flow.
- `styles.css` — all styling.

Static site, no build step, no dependencies. Open `index.html` or serve the
folder with any static server.
