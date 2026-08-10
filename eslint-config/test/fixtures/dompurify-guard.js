// Fixtures for the DOMPurify guard in eslint.config.mjs.
//
// Every line tagged UNSAFE must be reported by no-restricted-syntax and every
// other line must stay clean. test/dompurify-guard.mjs asserts both directions,
// so a selector that silently stops matching fails the test rather than quietly
// reopening the hole it was written to close.
//
// The "Not guarded, deliberately" section at the bottom is the other half of
// that contract: those lines are untagged, so adding a rule that catches them
// turns this test red. That's on purpose — see the section's own note.

// Safe: an inline object literal in second position whose own top-level keys
// carry the literal safe values.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false })
DOMPurify.sanitize(dirty, { "ALLOW_DATA_ATTR": false, SAFE_FOR_XML: true, ADD_ATTR: [ "data-trix-attachment" ] })
DOMPurify["sanitize"](dirty, { ["ALLOW_DATA_ATTR"]: false })
window.DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false })

// Safe: a spread *before* the literal, which is the ordering that makes the
// literal win. Only a spread that follows a guarded option is flagged.
DOMPurify.sanitize(dirty, { ...defaults, ALLOW_DATA_ATTR: false })

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

// Unsafe: the config never reaches DOMPurify as an inspectable literal. The
// by-reference form on the fourth line is the shape that hid a live bug in bc3 —
// a hoisted config left ALLOW_DATA_ATTR at its default true behind a tight
// ALLOWED_ATTR allowlist. This is the rule that earned the guard its keep.
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

// Unsafe: a spread after a guarded option overrides the literal just read.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, ...config }) // UNSAFE
DOMPurify.sanitize(dirty, { SAFE_FOR_XML: true, ...config, ALLOW_DATA_ATTR: false }) // UNSAFE

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

// ---------------------------------------------------------------------------
// Not guarded, deliberately.
//
// Every line below defeats this guard, and every line below is left alone. They
// are untagged, so a future selector that catches one of them turns this test
// red — which is the point. If you're here because you just wrote that selector,
// read this first.
//
// What these have in common is the actor. Each requires writing deliberately
// evasive JS into the repo, which means already holding commit access — and an
// actor who can commit arbitrary JS doesn't need to defeat sanitizer config,
// they can call innerHTML directly. Hardening against them buys nothing and
// costs a selector that the next reader has to understand, so we stopped.
//
// The guard's job is to catch a colleague's mistake at review time, not to be
// airtight. The guarantee lives in tests that run the sanitizer.

// Aliasing and destructuring — lint can't follow a binding, so the call sites
// move out of range. Requires renaming DOMPurify on purpose.
const purifier = DOMPurify
const { sanitize } = DOMPurify
const legacy = require("dompurify")

// Renamed and namespace imports — same reason, at the import instead.
import purify from "dompurify"
import * as scrubber from "dompurify"
import { sanitize as sanitizeNamed } from "dompurify"

// Handing the module to code the guard can't see.
use(DOMPurify)
export default DOMPurify
const wrapper = { purify: DOMPurify }

// Detaching sanitize from its argument list, so the sink rule has nothing to
// inspect. Nobody reaches for .call/.apply/.bind here by accident.
DOMPurify.sanitize.call(null, dirty, { ALLOW_DATA_ATTR: false })
DOMPurify.sanitize.apply(null, [ dirty ])
const bound = DOMPurify.sanitize.bind(DOMPurify)

// A computed key overriding the literal at runtime while lint reads only the
// literal. Writing `[option]` next to a literal you're cancelling is a choice.
DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, [option]: true })
