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
