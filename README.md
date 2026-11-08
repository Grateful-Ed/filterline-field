# FilterLine — the filter ordering network (mock)

A curiosity mock of a third-party ordering service for HVAC air filters,
built to help work out what the features should be.

**It is a mock.** Demo data only — every person, company, site, price, and stock
count is invented, vendor responses are simulated from that data, and no order
goes anywhere.

## The model

Two kinds of accounts, one job:

- **Vendors** — any filter supplier can join the network with a vendor account:
  their catalog, their stock, their delivery coverage, their windows, their prices.
- **Order side** — HVAC companies and their field techs. The app opens already
  knowing who the tech is (company account, crew, van, per-order limit).

The platform takes an order and finds who can **actually service it** — the
right filters in stock, deliverable to that job site, in that window — and among
the suppliers who genuinely can, surfaces the **best price**. Serviceability is
the gate; price only ranks the ones who passed it. Vendors who can't service an
order are shown with the reason (doesn't carry a line, doesn't deliver there,
can't make the window), so a "no" is information, not silence.

## The flow

1. **The tech talks, because his hands are busy.** One big mic button. He says
   the order out loud ("two cases of 20 by 25 by 1, MERV 8…"), sees the
   transcript, and the app parses it into order lines. Glove-sized steppers
   adjust quantities. Typing is never required.
2. **Job-site delivery, specifically.** Saved job-site cards with dock and
   contact details, a delivery window, a spoken drop-off note.
3. **The network answers.** The matching engine checks every vendor against
   the order and ranks the serviceable ones by items + delivery. The tech
   picks. A "vendor's side" screen shows what lands on a supplier's phone when
   an order goes out — a "ding, new order request" panel with the request on
   it — as a static visual. The vendor side is deliberately not interactive:
   suppliers work at a desk or warehouse screen, so no voice input, no mic,
   just the notification and one tap to quote or decline with a reason.
4. **Hear the money before you commit.** The review screen reads the order —
   vendor, lines, full estimated cost with delivery and tax — out loud.
5. **Verification by text.** Placing the order sends a (simulated) text from
   the vendor with the order number, ETA, estimated total, and a 6-digit code.
   The code goes in on a glove-sized keypad and the delivery slot is locked,
   ending on a tracking timeline. Confirmation is staged on purpose: the code
   is the chain of custody, not a courtesy.

## Run it

Three static files — no build step, no dependencies:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or open `index.html` in a browser, or use the GitHub Pages deployment of this
repo.

## Voice behavior

- Live speech recognition on the web is effectively a Chrome feature.
  Firefox ships without the Speech Recognition API at all, and Safari's
  implementation exists but often fails silently (permissions, service errors).
- Where recognition works (Chrome), the mic uses it for real, and the
  read-back uses real speech synthesis.
- Where it doesn't — or a live attempt errors out — the app says so on screen
  and the demo voice speaks a sample order instead, so the whole flow can
  still be walked end to end. A mic failure never dead-ends the order.
- The spoken-order parser (`parseOrder` in `app.js`) and the vendor matching
  engine (`matchVendors`) run for real on whatever was "heard."

## Directions this could go — deliberately not built

These are feature decisions for the idea's owner, parked here on purpose
rather than pre-answered by the demo:

- Splitting one order across two vendors when nobody can service all of it
- Dispatcher approval flow when an order goes over the tech's limit
- Vendor ratings and preferred-vendor pinning per account
- Order history and one-tap reorder
- Billing, invoicing, and how the platform itself gets paid
- A full vendor portal (this mock shows one vendor-side screen only)
