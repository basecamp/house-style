Gem::Specification.new do |s|
  s.name = "rubocop-37signals"
  s.summary = "37signals house style for Ruby programming"
  s.author = "37signals"
  s.email = "support@37signals.com"
  s.homepage = "https://github.com/basecamp/house-style"

  s.license = "MIT"

  s.version = "1.0.0"
  s.platform = Gem::Platform::RUBY

  s.add_dependency "rubocop"
  s.add_dependency "rubocop-rails"
  s.add_dependency "rubocop-performance"

  s.files = %w[ rubocop.yml ]
end
