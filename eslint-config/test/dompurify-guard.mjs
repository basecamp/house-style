// Verifies the DOMPurify guard in eslint.config.mjs against test/fixtures.
//
// The guard is a handful of esquery selectors, and a selector that looks right
// while matching nothing is the normal failure mode — quoted keys, member
// assignment, shorthand values and compound assignment each took a rewrite to
// actually match. This asserts both directions: every line tagged UNSAFE is
// reported, every other line stays clean.
//
// The clean direction carries as much weight as the caught one. The fixture's
// "Not guarded, deliberately" section is untagged, so a new selector that
// catches those forms fails here rather than landing unremarked.
//
// Run with `npm test` from eslint-config/.

import { ESLint } from "eslint"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import houseStyle from "../eslint.config.mjs"

const FIXTURES = [ "fixtures/dompurify-guard.js" ]

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [ houseStyle ]
})

let failures = 0
let caught = 0
let clean = 0

for (const fixture of FIXTURES) {
  const path = fileURLToPath(new URL(fixture, import.meta.url))
  const [ result ] = await eslint.lintFiles([ path ])

  const reported = [ ...new Set(result.messages
    .filter((message) => message.ruleId === "no-restricted-syntax")
    .map((message) => message.line)) ]

  const lines = readFileSync(path, "utf8").split("\n")
  const expected = lines.flatMap((line, index) => line.includes("// UNSAFE") ? [ index + 1 ] : [])

  const missed = expected.filter((line) => !reported.includes(line))
  const spurious = reported.filter((line) => !expected.includes(line))

  // The separator's contract is positional, and neither check above can see it:
  // appending a tagged case to the end of the file puts it under a banner that
  // promises the opposite, and everything still passes. That happened, so it's
  // checked.
  const separator = lines.findIndex((line) => line.startsWith("// Not guarded, deliberately")) + 1
  if (separator === 0) {
    console.error(`${fixture}: has lost its "Not guarded, deliberately" section`)
  }
  const stragglers = separator > 0 ? expected.filter((line) => line > separator) : []

  for (const line of missed) {
    console.error(`${fixture}:${line}: tagged UNSAFE but the guard let it through — ${lines[line - 1].trim()}`)
  }
  for (const line of spurious) {
    console.error(`${fixture}:${line}: reported but not tagged UNSAFE — ${lines[line - 1].trim()}`)
  }
  for (const line of stragglers) {
    console.error(`${fixture}:${line}: tagged UNSAFE below the "Not guarded, deliberately" separator, ` +
      `where the section promises the opposite — move it up into a tagged section`)
  }

  // A fixture whose syntax the parser rejects reports nothing and would
  // otherwise read as "every safe line stayed clean".
  const fatal = result.messages.filter((message) => message.fatal)
  for (const message of fatal) {
    console.error(`${fixture}:${message.line}: parse error — ${message.message}`)
  }

  failures += missed.length + spurious.length + stragglers.length + fatal.length + (separator === 0 ? 1 : 0)
  caught += expected.length - missed.length
  clean += lines.length - expected.length
}

// Every rule has to catch something no other rule catches.
//
// This is the check the guard didn't have while it grew to ten selectors. Both
// assertions above pass just as happily with a redundant rule in the set: adding
// one changes nothing about which lines are reported, so nothing objects, and
// the cost only shows up later as a config no one wants to touch.
//
// Failing here means one of two things, and they want opposite fixes. Either the
// rule is genuinely covered by another and should go — or it catches something
// real that the fixture doesn't demonstrate yet, in which case add the case that
// tells them apart. "It felt safer to keep" isn't one of the options.
const [ , ...guard ] = houseStyle.rules["no-restricted-syntax"]
const fixture = fileURLToPath(new URL(FIXTURES[0], import.meta.url))
const tagged = readFileSync(fixture, "utf8").split("\n")
  .flatMap((line, index) => line.includes("// UNSAFE") ? [ index + 1 ] : [])

const reportedBy = async (rules) => {
  const [ result ] = await new ESLint({
    overrideConfigFile: true,
    overrideConfig: [ { ...houseStyle, rules: { "no-restricted-syntax": [ "error", ...rules ] } } ]
  }).lintFiles([ fixture ])

  return new Set(result.messages
    .filter((message) => message.ruleId === "no-restricted-syntax")
    .map((message) => message.line))
}

const withEveryRule = await reportedBy(guard)

for (const [ index, rule ] of guard.entries()) {
  const withoutIt = await reportedBy(guard.filter((_, other) => other !== index))
  const uniquely = tagged.filter((line) => withEveryRule.has(line) && !withoutIt.has(line))

  if (uniquely.length === 0) {
    console.error(`rule ${index + 1} catches nothing the other rules don't — drop it, or add the fixture case that distinguishes it:`)
    console.error(`  ${rule.selector}`)
    failures += 1
  }
}

if (failures > 0) {
  process.exit(1)
} else {
  console.log(`dompurify-guard: ${caught} bypasses caught, ${clean} safe lines clean, ${guard.length} rules each load-bearing`)
}
