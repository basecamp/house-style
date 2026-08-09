require "rubocop"
require "rubocop/rspec/support"
require "rubocop-37signals"

RSpec.configure do |config|
  config.include RuboCop::RSpec::ExpectOffense

  config.disable_monkey_patching!
  config.order = :random
end
