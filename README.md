# FilterPhone — the filter RFQ broker (mock)

A mock build of FilterPhone, a real-time broker between on-site customers and
filter suppliers, built to the FilterPhone Specification Documentation (draft,
2026-11-09). Customer side and vendor side live in this single build.

**It is a mock.** Demo data only — every person, company, site, price, and stock
count is invented. Bids from vendors you are not playing are simulated from
their price books. No RFQ or order goes anywhere.

## The model

- **Customer side** — an on-site tech (the app opens already knowing who he is)
  speaks an RFQ: filter lines, a job site, a delivery window. Voice first,
  touch always available.
- **Vendor side** — any filter supplier with a vendor account. Its inbox shows
  the RFQs it can actually service; it bids from its own price book (prices
  editable per bid) or declines with the reason attached.
- **Serviceability is the gate.** A vendor who doesn't carry a line, can't
  reach the site, or can't make the window cannot bid — and the customer sees
  the reason instead of silence. Bids rank by total price.

## The flow

1. **The customer talks.** One big mic button. He says the request out loud
   ("two cases of 20 by 25 by 1, MERV 8…"), sees the transcript, and the app
   parses it into RFQ lines. Glove-sized steppers adjust quantities.
2. **Point at the job.** A saved job-site card, a delivery window, an optional
   spoken drop-off note. Post the RFQ.
3. **Vendors bid.** Use the side switch at the top of the phone to play a
   vendor: pick an account, open the live RFQ, bid or decline. Your bid
   replaces that vendor's simulated one on the customer's screen.
4. **Pick a bid, lock it by text.** The winning vendor confirms by text with
   the ETA, the total, and a 6-digit code. The code goes in on a glove-sized
   keypad and the delivery is locked.

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
side of this build.

## Files

- `index.html` — the page: explainer column + the phone.
- `app.js` — all logic: dummy data, the matching gate, the RFQ/bid flow.
- `styles.css` — all styling.

Static site, no build step, no dependencies. Open `index.html` or serve the
folder with any static server.
