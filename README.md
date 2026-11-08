# FilterLine Field — voice-first filter ordering (mock)

A curiosity mock of the app a large HVAC company's field techs would use to order
air filters for delivery to a job site.

**It is a mock.** Demo data only — every person, company, site, price, and stock
count is invented, and no order goes anywhere.

## The flow

1. **It knows who you are.** The app opens already signed in on the company
   account — tech, crew, van, per-order limit. No login friction in the field.
2. **The tech talks, because his hands are busy.** One big mic button. He says
   the order out loud ("two cases of 20 by 25 by 1, MERV 8…"), sees the
   transcript, and the app parses it into order lines with a stock check
   against both distribution centers. Big steppers fix quantities with gloves on.
3. **Job-site delivery, specifically.** Saved job-site cards with dock and
   contact details, a delivery window, and a spoken drop-off note.
4. **Hear the money before you commit.** The review screen reads the order and
   the full estimated cost — items, delivery, tax — out loud.
5. **Verification by text.** Placing the order sends a (simulated) text with the
   order number, ETA, estimated total, and a 6-digit code. The code goes in on a
   glove-sized keypad and the delivery slot is locked, ending on a tracking
   timeline.

Typing is never required anywhere in the flow.

## Run it

It's three static files — no build step, no dependencies:

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` in a browser.

## Voice behavior

- Where the browser supports the Web Speech API (Chrome does), the mic button
  uses real speech recognition and the read-back uses real speech synthesis.
- Where it doesn't, the mic speaks sample order lines so the whole flow can
  still be walked end to end, and the spoken-order parser (`parseOrder` in
  `app.js`) runs for real on whatever was "heard."

## Design notes

- **Voice-first, not voice-only.** Every voice action has a big-tap equivalent;
  voice is the fast path, not a trap.
- **The promise is backed by stock.** Lines check on-hand counts at both DCs
  before an ETA is offered; a short line flags the office instead of silently
  promising a time.
- **Confirmation is staged.** Speaking stages the order; the review read-back
  and the text code are what commit it. Nothing ships on a mis-hear.
