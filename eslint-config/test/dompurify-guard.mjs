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

  for (const line of missed) {
    console.error(`${fixture}:${line}: tagged UNSAFE but the guard let it through — ${lines[line - 1].trim()}`)
  }
  for (const line of spurious) {
    console.error(`${fixture}:${line}: reported but not tagged UNSAFE — ${lines[line - 1].trim()}`)
  }

  // A fixture whose syntax the parser rejects reports nothing and would
  // otherwise read as "every safe line stayed clean".
  const fatal = result.messages.filter((message) => message.fatal)
  for (const message of fatal) {
    console.error(`${fixture}:${message.line}: parse error — ${message.message}`)
  }

  failures += missed.length + spurious.length + fatal.length
  caught += expected.length - missed.length
  clean += lines.length - expected.length
}

if (failures > 0) {
  process.exit(1)
} else {
  console.log(`dompurify-guard: ${caught} bypasses caught, ${clean} safe lines clean`)
}
