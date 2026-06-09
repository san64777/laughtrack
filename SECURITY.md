# Security

laughtrack runs entirely in your browser. You bring your own Gemini API key; it is stored in
`localStorage` and sent directly to Google over the Live API WebSocket. There is no laughtrack
backend, and your key never reaches any server of ours.

A raw API key used client-side can be read out of the browser, which is an accepted tradeoff for a
bring-your-own-key toy (you only ever spend your own quota). For production, Google recommends minting
short-lived ephemeral tokens from a small backend; that is the documented upgrade path.

If you find a security issue, please report it privately through GitHub's "Report a vulnerability"
(Security advisories) instead of opening a public issue.
