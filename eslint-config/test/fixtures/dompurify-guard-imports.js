// Import forms for the DOMPurify guard, split out of dompurify-guard.js because
// a module can only bind the name DOMPurify once. Same contract: every line
// tagged UNSAFE must be reported, every other line must stay clean.

// Safe: the default export under its own name, which is what the rest of the
// guard matches on.
import DOMPurify from "dompurify"

// Unsafe: a renamed default, a namespace, or a destructured sanitize — each
// leaves call sites that no selector here can recognize.
import purify from "dompurify" // UNSAFE
import * as scrubber from "dompurify" // UNSAFE
import { sanitize } from "dompurify" // UNSAFE
import cleaner from "isomorphic-dompurify" // UNSAFE

DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false })
