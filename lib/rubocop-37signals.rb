# The cop classes inherit from RuboCop::Cop::Base, so RuboCop must be loaded
# first: Bundler auto-requires this entrypoint during app boot when the gem is
# declared without `require: false`, long before RuboCop would otherwise load.
require "rubocop"

require_relative "rubocop/thirty_seven_signals/version"
require_relative "rubocop/thirty_seven_signals/plugin"
require_relative "rubocop/cop/security/sanitizer_attributes_unset"
