import js from "@eslint/js"
import globals from "globals"
import stylistic from "@stylistic/eslint-plugin-js"

// DOMPurify guard.
//
// DOMPurify's defaults are not the ones we want: ALLOW_DATA_ATTR is read as
// `cfg.ALLOW_DATA_ATTR !== false`, so an omitted option keeps data-* smuggling
// open, and setConfig installs a persistent config after which every per-call
// config is skipped entirely. Forbidding the unsafe literal is therefore not
// enough — the safe literal has to be demanded at each sink.
//
// esquery can't follow a binding or evaluate an expression, so everything below
// refuses what it cannot read rather than trusting it: a guarded option must
// carry its safe literal by plain assignment, a sanitize config must be written
// out inline, and DOMPurify must not be reached under another name.

const DOMPURIFY = ":matches([callee.object.name='DOMPurify'], [callee.object.property.name='DOMPurify'], [callee.object.property.value='DOMPurify'])"
const SANITIZE = `CallExpression${DOMPURIFY}:matches([callee.property.name='sanitize'], [callee.property.value='sanitize'])`
const SET_CONFIG = `CallExpression${DOMPURIFY}:matches([callee.property.name='setConfig'], [callee.property.value='setConfig'])`

// A guarded option, wherever it appears, carrying anything but its safe literal:
// an explicit unsafe value, a shorthand or variable value lint can't resolve, or
// a compound assignment (??=, ||=, &&=) that preserves whatever is already there.
const carryingAnythingBut = (option, safeLiteral) => ":matches(" +
  `Property:matches([key.name='${option}'], [key.value='${option}']):not([value.value=${safeLiteral}]), ` +
  `AssignmentExpression:matches([left.property.name='${option}'], [left.property.value='${option}']):not([operator='='][right.value=${safeLiteral}])` +
")"

// Exactly two arguments, the second an inline object literal carrying
// ALLOW_DATA_ATTR: false among its own top-level keys. The arguments.0 clause
// pins which direct-child ObjectExpression the :has() is allowed to read, so a
// config in first position can't stand in for the one DOMPurify actually parses.
const SINK_WITHOUT_INLINE_SAFE_CONFIG = `${SANITIZE}:not(` +
  "[arguments.length=2]" +
  ":not([arguments.0.type='ObjectExpression'])" +
  ":has(> ObjectExpression:has(> Property:matches([key.name='ALLOW_DATA_ATTR'], [key.value='ALLOW_DATA_ATTR'])[value.value=false]))" +
")"

// Reaching DOMPurify under another name puts every selector above out of range,
// since none of them can resolve the binding back to the module. The reference
// rule is the closed form of that: DOMPurify may appear only as the object or
// property of a member expression — i.e. at a call site the selectors above can
// read — or as the local name of its import. Anything else hands the module to
// code this guard can't see: `use(DOMPurify)`, `export default DOMPurify`,
// `{ purify: DOMPurify }`, `DOMPurify(window).sanitize(dirty)`.
const REFERENCED = "Identifier[name='DOMPurify']" +
  ":not(.object):not(.property):not(.local):not(.id)" +
  ":not(UnaryExpression[operator='typeof'] > Identifier)"

// sanitize taken as a value rather than called: .call/.apply/.bind detach it
// from the argument list the sink rule inspects.
const SANITIZE_AS_VALUE = "MemberExpression" +
  ":matches([object.name='DOMPurify'], [object.property.name='DOMPurify'], [object.property.value='DOMPurify'])" +
  ":matches([property.name='sanitize'], [property.value='sanitize'])" +
  ":not(.callee)"

const ALIASED = ":matches(" +
  "VariableDeclarator:not([id.name='DOMPurify']):matches(" +
    "[init.name='DOMPurify'], [init.property.name='DOMPurify'], [init.property.value='DOMPurify'], " +
    "[init.callee.name='require'][init.arguments.0.value=/dompurify/i]" +
  "), " +
  "AssignmentExpression:matches([right.name='DOMPurify'], [right.property.name='DOMPurify'], [right.property.value='DOMPurify'])" +
")"

const ALIASED_IMPORT = "ImportDeclaration[source.value=/dompurify/i] > :matches(" +
  "ImportDefaultSpecifier[local.name!='DOMPurify'], " +
  "ImportNamespaceSpecifier[local.name!='DOMPurify'], " +
  "ImportSpecifier" +
")"

const dompurifyGuard = [
  {
    "selector": carryingAnythingBut("SAFE_FOR_XML", true),
    "message": "DOMPurify SAFE_FOR_XML must be assigned a literal true with plain `=` (mXSS risk): shorthand, spread, or variable values can smuggle in false, and compound assignment (??=, ||=, &&=) can preserve it."
  },
  {
    "selector": carryingAnythingBut("ALLOW_DATA_ATTR", false),
    "message": "DOMPurify ALLOW_DATA_ATTR must be assigned a literal false with plain `=` (attribute-smuggling risk): shorthand, spread, or variable values can smuggle in true, and compound assignment (??=, ||=, &&=) can preserve it."
  },
  {
    "selector": SINK_WITHOUT_INLINE_SAFE_CONFIG,
    "message": "DOMPurify.sanitize must be called as sanitize(dirty, { ALLOW_DATA_ATTR: false, ... }): exactly two arguments, with the config an inline object literal carrying ALLOW_DATA_ATTR: false among its own top-level keys. DOMPurify defaults ALLOW_DATA_ATTR to true, and an omitted, by-reference, nested, or extra-argument config leaves that default in place."
  },
  {
    "selector": `${SANITIZE} > ObjectExpression > SpreadElement`,
    "message": "DOMPurify.sanitize config must not spread another object: a later spread overrides the literal ALLOW_DATA_ATTR: false / SAFE_FOR_XML: true this guard reads, and its contents are invisible to lint. Write the options out literally."
  },
  {
    "selector": `${SANITIZE} > ObjectExpression > Property[computed=true]:not([key.type='Literal'])`,
    "message": "DOMPurify.sanitize config must not carry a computed key: `{ ALLOW_DATA_ATTR: false, [option]: true }` overrides the safe literal at runtime while lint reads only the literal. Write the options out literally."
  },
  {
    "selector": SET_CONFIG,
    "message": "DOMPurify.setConfig installs a persistent config, after which sanitize ignores every per-call config — an inline ALLOW_DATA_ATTR: false would silently stop applying. Pass the config to each sanitize call instead."
  },
  {
    "selector": ALIASED,
    "message": "DOMPurify must be used under its own name: an alias or a destructured sanitize puts the call sites out of reach of this guard, which matches DOMPurify syntactically and cannot follow a binding."
  },
  {
    "selector": REFERENCED,
    "message": "DOMPurify may only be used by direct member access at the call site, as DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false }). Passing, exporting, storing, or calling the module itself hands it to code this guard cannot follow, and the sink requirement stops applying there."
  },
  {
    "selector": SANITIZE_AS_VALUE,
    "message": "DOMPurify.sanitize must be called directly, not taken as a value: .call/.apply/.bind and a stored reference detach the call from the argument list this guard inspects for ALLOW_DATA_ATTR: false."
  },
  {
    "selector": ALIASED_IMPORT,
    "message": "Import DOMPurify as `import DOMPurify from \"dompurify\"`: a renamed default import or a destructured sanitize puts the call sites out of reach of this guard, which matches DOMPurify syntactically and cannot follow a binding."
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
