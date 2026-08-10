// Fixtures for the DOMPurify guard in eslint.config.mjs.
//
// Every line tagged UNSAFE must be reported by no-restricted-syntax and every
// other line must stay clean. test/dompurify-guard.mjs asserts both directions,
// so a selector that silently stops matching one of these bypasses fails the
// test rather than quietly reopening the hole it was written to close.
//
// Each bypass here was a selector that looked right and matched nothing:
// quoted keys, member assignment, shorthand values, compound assignment, nested
// objects, spreads, computed overrides, persistent setConfig, aliasing.
//
// Import forms live in dompurify-guard-imports.js, since a fixture can only
// bind the name DOMPurify once.

// Safe: an inline object literal in second position whose own top-level keys
// carry the literal safe values.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false })
DOMPurify.sanitize(dirty, { "ALLOW_DATA_ATTR": false, SAFE_FOR_XML: true, ADD_ATTR: [ "data-trix-attachment" ] })
DOMPurify["sanitize"](dirty, { ["ALLOW_DATA_ATTR"]: false })
window.DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false })

// Safe: sanitizers that aren't DOMPurify.
Trix.config.dompurify.sanitize(dirty)
sanitizer.sanitize(dirty)

// Safe: plain `=` writes of the safe literal onto a persistent config object.
Trix.config.dompurify.SAFE_FOR_XML = true
Trix.config.dompurify["ALLOW_DATA_ATTR"] = false
Trix.config.dompurify.FORBID_TAGS = [ "script" ]

// Safe: taking DOMPurify off the global under its own name, and feature-testing
// for it without taking a reference.
const DOMPurify = window.DOMPurify
if (typeof DOMPurify === "undefined") throw new Error("no DOMPurify")
DOMPurify?.sanitize(dirty, { ALLOW_DATA_ATTR: false })

// Unsafe: the config never reaches DOMPurify as an inspectable literal.
DOMPurify.sanitize(dirty) // UNSAFE
DOMPurify["sanitize"](dirty) // UNSAFE
DOMPurify.sanitize(dirty, {}) // UNSAFE
DOMPurify.sanitize(dirty, config) // UNSAFE
DOMPurify.sanitize(dirty, { nested: { ALLOW_DATA_ATTR: false } }) // UNSAFE
DOMPurify.sanitize(dirty, config, { ALLOW_DATA_ATTR: false }) // UNSAFE
DOMPurify.sanitize({ ALLOW_DATA_ATTR: false }, config) // UNSAFE
DOMPurify.sanitize(dirty, Object.assign({ ALLOW_DATA_ATTR: false }, config)) // UNSAFE
DOMPurify.sanitize(dirty, { [option]: false }) // UNSAFE

// Unsafe: DOMPurify reached through the global object rather than by bare name.
window.DOMPurify.sanitize(dirty) // UNSAFE
window["DOMPurify"]["sanitize"](dirty) // UNSAFE
globalThis.DOMPurify.setConfig({}) // UNSAFE

// Unsafe: a spread or a computed key can override the safe literal just read.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, ...config }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, [option]: true }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, [SAFE_FOR_XML]: false }) // UNSAFE

// Unsafe: a persistent config makes every per-call config inert.
DOMPurify.setConfig({ ALLOW_DATA_ATTR: false }) // UNSAFE
DOMPurify["setConfig"]({}) // UNSAFE

// Unsafe: a guarded option carrying anything but its safe literal.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: true }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: allowed }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: !true }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, "ALLOW_DATA_ATTR": true }) // UNSAFE
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, SAFE_FOR_XML: false }) // UNSAFE
Trix.config.dompurify.SAFE_FOR_XML = false // UNSAFE
Trix.config.dompurify["SAFE_FOR_XML"] = permissive // UNSAFE
Trix.config.dompurify.ALLOW_DATA_ATTR = true // UNSAFE

// Unsafe: a compound assignment preserves whatever value is already there.
Trix.config.dompurify.SAFE_FOR_XML &&= true // UNSAFE
Trix.config.dompurify.ALLOW_DATA_ATTR ??= false // UNSAFE

// Unsafe: reaching DOMPurify under a name this guard can't follow.
const purifier = DOMPurify // UNSAFE
const { sanitize } = DOMPurify // UNSAFE
const scrub = window.DOMPurify // UNSAFE
const legacy = require("dompurify") // UNSAFE
purifier = DOMPurify // UNSAFE

// Unsafe: handing the module or its sanitize to code the guard can't see.
use(DOMPurify) // UNSAFE
export default DOMPurify // UNSAFE
const wrapper = { purify: DOMPurify } // UNSAFE
DOMPurify(window).sanitize(dirty, { ALLOW_DATA_ATTR: false }) // UNSAFE
DOMPurify.sanitize.call(null, dirty, { ALLOW_DATA_ATTR: false }) // UNSAFE
DOMPurify.sanitize.apply(null, [ dirty ]) // UNSAFE
const bound = DOMPurify.sanitize.bind(DOMPurify) // UNSAFE
window.DOMPurify.sanitize.call(null, dirty) // UNSAFE
