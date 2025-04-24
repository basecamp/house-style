Gem::Specification.new do |s|
  s.name = "rubocop-37signals"
  s.summary = "37signals house style for Ruby programming"
  s.author = "37signals"
  s.email = "support@37signals.com"
  s.homepage = "https://github.com/basecamp/house-style"

  s.license = "MIT"

  s.version = "1.2.1"
  s.platform = Gem::Platform::RUBY

  s.add_dependency "rubocop", ">= 1.72"
  s.add_dependency "rubocop-rails", ">= 2.30"
  s.add_dependency "rubocop-performance", ">= 1.24"
  s.add_dependency "rubocop-minitest", ">= 0.37.0"

  s.files = %w[ rubocop.yml rubocop-ruby.yml lib/rubocop-37signals.rb ]
end
