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
