# LiRo Go barcode lookup

Standalone Cloudflare Worker. No Supabase, database, privileged keys or customer prices are used. It queries the public E-number search for one GTIN and verifies the exact GTIN and E-number on the official product page. Coverage depends on published GTIN data; unknown and ambiguous codes are never guessed.

Deploy from this directory with an authenticated Cloudflare account using `npx wrangler deploy`. Set the verified HTTPS deployment URL in `barcode-lookup-v127.js` before publishing the app. The endpoint allows the existing GitHub Pages origin only. Request limits and server cache are per worker instance; browser matches persist for offline use.

Run `node tests/barcode-lookup.mjs` and `node tests/barcode-server.mjs` from the repository root. Set `LIRO_LIVE_LOOKUP=1` for one public-register integration check. `tests/barcode-material.cjs` exercises the quantity confirmation, existing-row merge, correct assignment, contract price and cached offline lookup in an isolated browser. Its server response is mocked; deployment still requires a live endpoint test.

Run `node tests/run-barcode-live.cjs` to exercise the browser flow against the real public register through the actual request handler. Set `LIRO_TEST_EDGE=1` on Windows for Edge, or leave unset for WebKit. Optionally set `LIRO_PRIVATE_PRICE_FILE` to a local prepared contract price file. The file is imported only into the isolated test browser; its prices are not printed or sent to the register. Without it, the test uses a synthetic price. This test verifies one product mapping, quantity, job assignment, price selection and cached offline reuse. It does not exercise camera capture or a published endpoint.

Verified locally on 2026-10-07: EAN 4012195931669 resolves through the public register to E-number 0681600, and the Edge browser flow selects the price from the local private contract file. The app endpoint is still unset; public activation and physical iPhone camera verification remain outstanding.
