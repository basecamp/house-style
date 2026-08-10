# 37signals house style

## Ruby

RuboCop has built-in support for pulling config from a gem. We provide a
`rubocop-37signals` gem for this purpose.

To introduce our house style to an app, add `rubocop-37signals` to your Gemfile:
```ruby
gem "rubocop-37signals", github: "basecamp/house-style", require: false
```

And create a boilerplate `.rubocop.yml` that inherits from `rubocop-37signals`:
```yaml
# 37signals house style
inherit_gem: { rubocop-37signals: rubocop.yml }
```

### For non-Rails apps:
```yaml
# 37signals house style
inherit_gem: { rubocop-37signals: rubocop-ruby.yml }
```

App-specific config may follow, overriding the house style.

## JavaScript

We use [ESLint](https://eslint.org) for our JavaScript. You'll need eslint 9 or higher to use our shared config.

The configurations is based on @eslint/js's [recommended](https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js) config,
with a few more stylistic rules added to reflect our preferences.

To use our ruleset as a baseline, add the `@37signals/eslint-config` package:

```bash
npm install --save-dev @37signals/eslint-config
```

Or with Yarn:

```bash
yarn add --dev @37signals/eslint-config
```

And extend it in your eslint.config.mjs file:

```js
import houseStyle from "@37signals/eslint-config"

export default [
  houseStyle,
  {
    rules: {
      "no-unused-vars": [ "off" ]
      ...
    }
  }
]

```

### DOMPurify guard

**This is a review aid, not a security boundary.** It catches a mistake on its
way past a reviewer. It does not stop anyone, and it can't: defeating it takes
one alias, and whoever can commit that alias can also just call `innerHTML`.
Read the next section before adding a rule to it.

The reason it exists at all is that DOMPurify's defaults are not the ones we
want. `ALLOW_DATA_ATTR` is read as `cfg.ALLOW_DATA_ATTR !== false`, so leaving
it out keeps `data-*` smuggling open — and a `data-*` attribute is accepted
*ahead of* `ALLOWED_ATTR`, so a tight attribute allowlist reads as protection
it isn't giving. That combination hid a real bug in Basecamp: an allowlist of
seven attributes, and a complete `data-controller` / `data-action` Stimulus
binding sailing through it into `innerHTML`. `setConfig` is the other trap — it
installs a persistent config, after which every per-call config is skipped.

Forbidding the unsafe value is therefore not enough; the safe value has to be
demanded at each sink. Sanitize like this:

```js
import DOMPurify from "dompurify"

DOMPurify.sanitize(dirty, { ALLOW_DATA_ATTR: false, SAFE_FOR_XML: true })
```

Six rules, each aimed at a mistake someone could make on a normal day:

| Rule | The mistake |
|---|---|
| `SAFE_FOR_XML`, *where written*, must carry a literal `true` | turning it off to make an mXSS false positive go away. Omitting it is fine and unguarded — this default is already the safe one |
| `ALLOW_DATA_ATTR` must carry a literal `false`, at every sink | omitting it. This default is the *unsafe* one, so a config that never mentions the option is exactly as open as one that sets `true` |
| `sanitize()` config must be written inline | hoisting the config to a `const`, which is what hid the bug above |
| no spread anywhere in a `sanitize()` config | what a spread merges in can't be read here, so the options these rules check can be set by something they can't see |
| no `setConfig` | it voids every per-call config in the app |
| no `forceKeepAttr` in a hook | it re-keeps an attribute the config just rejected, so `ALLOW_DATA_ATTR` stops deciding |

The spread rule is blanket, and briefly wasn't. It was narrowed to "no spread
*after* a guarded option" on the reasoning that `{ ...opts, ALLOW_DATA_ATTR: false }`
is safe because the literal comes last and wins. The literal does win — but it
isn't the only thing in the object. Spreading Trix's own config merges in
`SAFE_FOR_XML: false`, the exact value the first rule forbids, plus
`RETURN_DOM: true`, which stops `sanitize` returning a string at all. Checking
one option at a time only ever patches the options we happen to guard.

Run it with `--no-inline-config` and `--no-ignore`, so neither a call site nor an
ignore file can drop something from the gate while the run still exits `0`:

```bash
eslint --no-inline-config --no-ignore app/javascript
```

Both flags want a dedicated run — `--no-eslintrc` against a DOMPurify-only
config. Adding them to an existing style sweep drags every vendored and ignored
file into the full ruleset, which in bc3 is 1142 unrelated errors.

#### What it deliberately doesn't catch

Aliasing, renamed imports, `.call`/`.apply`/`.bind`, computed keys, `delete` of a
guarded option, and handing the module to another function all defeat this guard,
and all are left alone.

The reason is the shape of the edit, not who can make it. Every rule above exists
to catch a slip by someone with full commit access — that is who writes this code,
and "they could have committed it anyway" would disqualify the entire guard. These
forms are different: each needs a deliberate choice, made on the line, against a
literal you just wrote. Renaming the module, detaching the method, deleting a
security option, cancelling `ALLOW_DATA_ATTR: false` with a computed key beside it.
Nobody arrives at one by accident, and someone who has decided to evade can edit
the sink directly — which no selector reaches. Rules against them cost a reader's
attention and buy nothing.

That also marks the boundary of the instrument. A selector reads source text at
the call sites its matcher recognizes; it cannot see an option removed at runtime,
a default that moves under a dependency bump, or a config vendored inside a
bundle. Those need a test that runs the sanitizer on real markup and asserts what
comes back. Reach for the lint to hold a shape everywhere, the test to hold a
behaviour — neither is "the guarantee" on its own.

`test/fixtures/dompurify-guard.js` lists those forms in a **"Not guarded,
deliberately"** section, untagged, so a new selector that catches one of them
turns `npm test` red instead of landing unremarked. If you're about to add such
a rule, that section is the argument you're answering.

#### What actually guarantees it

A test that runs the sanitizer. Lint reads syntax, so it is blind to the three
things most likely to hurt you: an option nobody wrote down, a default that
changes under a dependency bump, and a config vendored inside a bundle — which
is where Trix keeps its own DOMPurify options, `SAFE_FOR_XML: false` among them.
No source-matching rule will ever see that file. Assert the behavior you need at
the sink you own, and treat this guard as the thing that tells you at review time
that you're about to lose it.

`npm test` in `eslint-config/` checks the guard against its fixtures in both
directions — every flagged form reported, every safe form clean.

## SCSS

We use [Stylelint](https://stylelint.io) for our SCSS.

Our config extends [stylelint-config-recommended-scss](https://github.com/stylelint-scss/stylelint-config-recommended-scss) and makes it a little more lax.

To see the rules, read the [config itself](/stylelint-config-scss/index.js).

To use our small ruleset as a baseline, add the `@37signals/stylelint-config-scss` package:
```bash
npm install --save-dev @37signals/stylelint-config-scss

# or
yarn add --dev @37signals/stylelint-config-scss
```
And extend it in your Stylelint config:
```json
{
  "extends": "@37signals/stylelint-config-scss",

  "rules": {
    …
  }
}
```
