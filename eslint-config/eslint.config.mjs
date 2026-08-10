import js from "@eslint/js"
import globals from "globals"
import stylistic from "@stylistic/eslint-plugin-js"

// DOMPurify guard.
//
// These selectors catch mistakes a careful colleague could make — copying
// Trix's config, deleting a line, hoisting a config to a constant, writing a
// forwarding wrapper, reaching for setConfig. They do not stop someone
// determined to evade them, and they aren't meant to: defeating them takes one
// alias, and whoever can commit that alias can edit the sink instead.
//
// What they do hold is a *shape*, across every call site in the tree including
// the ones not written yet: the safe option has to be written out, literally,
// where it can be read. That is a real guarantee and it is the reason to keep
// them — it caught a by-reference config in bc3 that had quietly reverted to
// DOMPurify's unsafe default.
//
// What they cannot hold is a value. An option's runtime effect, a library
// default that moves under a bump, config vendored inside a dependency's bundle
// — Trix ships its own DOMPurify options that way — are all invisible here.
// Those need a test that runs the sanitizer. Neither instrument substitutes for
// the other, so use both and don't ask either for the other's job.
//
// DOMPurify's defaults are not the ones we want: ALLOW_DATA_ATTR is read as
// `cfg.ALLOW_DATA_ATTR !== false`, so an omitted option keeps data-* smuggling
// open — and a data-* attribute is accepted *ahead of* ALLOWED_ATTR, so a tight
// allowlist reads as protection it isn't giving. setConfig installs a persistent
// config after which every per-call config is skipped entirely. Forbidding the
// unsafe literal is therefore not enough: the safe literal has to be demanded at
// each sink, written out where lint can read it.

const DOMPURIFY = ":matches([callee.object.name='DOMPurify'], [callee.object.property.name='DOMPurify'], [callee.object.property.value='DOMPurify'])"
const SANITIZE = `CallExpression${DOMPURIFY}:matches([callee.property.name='sanitize'], [callee.property.value='sanitize'])`
const SET_CONFIG = `CallExpression${DOMPURIFY}:matches([callee.property.name='setConfig'], [callee.property.value='setConfig'])`

// A guarded option, wherever it appears, carrying anything but its safe literal:
// an explicit unsafe value, a shorthand or variable value lint can't resolve, or
// a compound assignment (??=, ||=, &&=) that preserves whatever is already there.
//
// The `raw` clause is what makes this a boolean check rather than a string one.
// esquery compares attribute values as strings, so `[value.value=false]` also
// matches the *string* "false" — and DOMPurify reads ALLOW_DATA_ATTR as
// `cfg.ALLOW_DATA_ATTR !== false`, for which "false" is truthy and leaves data-*
// attributes enabled. Quoting a boolean is an ordinary slip, so without this the
// guard reports nothing on a config that is quietly unsafe.
const carryingAnythingBut = (option, safeLiteral) => ":matches(" +
  `Property:matches([key.name='${option}'], [key.value='${option}']):not([value.value=${safeLiteral}][value.raw='${safeLiteral}']), ` +
  `AssignmentExpression:matches([left.property.name='${option}'], [left.property.value='${option}']):not([operator='='][right.value=${safeLiteral}][right.raw='${safeLiteral}'])` +
")"

// Exactly two arguments, the second an inline object literal carrying
// ALLOW_DATA_ATTR: false among its own top-level keys. The arguments.0 clause
// pins which direct-child ObjectExpression the :has() is allowed to read, so a
// config in first position can't stand in for the one DOMPurify actually parses.
// The no-spread clause is there because `arguments.length` counts a
// SpreadElement as one argument: a forwarding wrapper written as
// `sanitize(...args, safeConfig)` satisfied the two-argument shape while
// DOMPurify took args[1] as the real config and ignored the safe one.
const SINK_WITHOUT_INLINE_SAFE_CONFIG = `${SANITIZE}:not(` +
  "[arguments.length=2]" +
  ":not([arguments.0.type='ObjectExpression'])" +
  ":not(:has(> SpreadElement))" +
  ":has(> ObjectExpression:has(> Property:matches([key.name='ALLOW_DATA_ATTR'], [key.value='ALLOW_DATA_ATTR'])[value.value=false][value.raw='false']))" +
")"

// A hook that force-keeps an attribute overrides the config that just rejected
// it — the setConfig failure in hook form. Trix registers one of these for
// /^data-trix-/ inside its own bundle, which is exactly how two of them come to
// disagree. Dropping an attribute with keepAttr = false is unaffected.
const FORCE_KEEP_ATTR = "AssignmentExpression" +
  ":matches([left.property.name='forceKeepAttr'], [left.property.value='forceKeepAttr'])" +
  ":not([operator='='][right.value=false][right.raw='false'])"

// A spread *after* a guarded option overrides the safe literal the rules above
// just read, and its contents are invisible to lint. The sibling combinator is
// what makes this precise: `{ ...defaults, ALLOW_DATA_ATTR: false }` is safe —
// the literal comes last and wins — so only a spread that follows the literal
// is flagged.
const GUARDED_OPTION = ":matches(" +
  "[key.name='SAFE_FOR_XML'], [key.value='SAFE_FOR_XML'], " +
  "[key.name='ALLOW_DATA_ATTR'], [key.value='ALLOW_DATA_ATTR']" +
")"
const SPREAD_AFTER_GUARDED_OPTION = `Property${GUARDED_OPTION} ~ SpreadElement`

const dompurifyGuard = [
  {
    "selector": carryingAnythingBut("SAFE_FOR_XML", true),
    "message": "DOMPurify SAFE_FOR_XML must carry a literal true, assigned with plain `=` (mXSS risk). A shorthand or variable value is one lint can't resolve, and a compound assignment (??=, ||=, &&=) preserves whatever is already there."
  },
  {
    "selector": carryingAnythingBut("ALLOW_DATA_ATTR", false),
    "message": "DOMPurify ALLOW_DATA_ATTR must carry a literal false, assigned with plain `=` (attribute-smuggling risk). A shorthand or variable value is one lint can't resolve, and a compound assignment (??=, ||=, &&=) preserves whatever is already there."
  },
  {
    "selector": SINK_WITHOUT_INLINE_SAFE_CONFIG,
    "message": "DOMPurify.sanitize must be called as sanitize(dirty, { ALLOW_DATA_ATTR: false, ... }): two arguments written out, neither of them a spread, with the config an inline object literal carrying ALLOW_DATA_ATTR: false among its own top-level keys. DOMPurify defaults ALLOW_DATA_ATTR to true, and an omitted, by-reference, nested, or extra-argument config leaves that default in place. A forwarding wrapper — `sanitize(...args, safeConfig)` — is the easy accident: args[1] arrives as the real config and the safe one is ignored."
  },
  {
    "selector": SPREAD_AFTER_GUARDED_OPTION,
    "message": "A spread after SAFE_FOR_XML or ALLOW_DATA_ATTR overrides the safe literal, and lint can't read what's in it. Put the spread first — `{ ...defaults, ALLOW_DATA_ATTR: false }` — so the literal wins."
  },
  {
    "selector": SET_CONFIG,
    "message": "DOMPurify.setConfig installs a persistent config, after which sanitize ignores every per-call config — an inline ALLOW_DATA_ATTR: false would silently stop applying. Pass the config to each sanitize call instead."
  },
  {
    "selector": FORCE_KEEP_ATTR,
    "message": "An uponSanitizeAttribute hook that sets forceKeepAttr keeps an attribute the config just rejected, so ALLOW_DATA_ATTR stops deciding anything downstream of it. Trix already registers one of these for /^data-trix-/ inside its own bundle; a second one in app code is how the two quietly disagree. Setting keepAttr = false to drop an attribute is fine and unaffected."
  }
]

export default {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      "global": "readonly",
      ...globals.browser
    }
  },
  plugins: {
    "@stylistic/js": stylistic
  },
  ignores: [
    "dist/*",
    "vendor/*"
  ],
  rules: Object.assign({}, js.configs.recommended.rules, {
    "@stylistic/js/array-bracket-spacing": [ "error", "always" ],
    "@stylistic/js/arrow-spacing": [ "error", { "before": true, "after": true } ],
    "@stylistic/js/block-spacing": [ "error", "always" ],
    "@stylistic/js/comma-dangle": [ "error", "never" ],
    "@stylistic/js/comma-spacing": [ "error", { "before": false, "after": true } ],
    "@stylistic/js/comma-style": [ "error", "last" ],
    "@stylistic/js/computed-property-spacing": [ "error", "never" ],
    "@stylistic/js/eol-last": "error",
    "@stylistic/js/function-call-spacing": [ "error", "never" ],
    "@stylistic/js/indent": [ "error", 2, { "SwitchCase": 1 } ],
    "@stylistic/js/no-trailing-spaces": "error",
    "@stylistic/js/quotes": [ "error", "double", { "avoidEscape": true } ],
    "@stylistic/js/semi": [ "error", "never" ],
    "@stylistic/js/space-infix-ops": [ "error" ],
    "@stylistic/js/keyword-spacing": [ "error" ],
    "curly": [ "error", "multi-line" ],
    "no-restricted-syntax": [ "error", ...dompurifyGuard ],
    "no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none" } ],
    "no-var": "error",
    "prefer-const": [ "error", { "destructuring": "all" } ]
  })
}
