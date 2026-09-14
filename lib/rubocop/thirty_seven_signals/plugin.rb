require "lint_roller"

module RuboCop
  module ThirtySevenSignals
    # RuboCop plugin that ships the Security department cops and their
    # default configuration alongside the shared house-style config.
    class Plugin < LintRoller::Plugin
      def about
        LintRoller::About.new \
          name: "rubocop-37signals",
          version: VERSION,
          homepage: "https://github.com/basecamp/house-style",
          description: "37signals house style and security cops for Ruby"
      end

      def supported?(context)
        context.engine == :rubocop
      end

      def rules(_context)
        LintRoller::Rules.new \
          type: :path,
          config_format: :rubocop,
          value: Pathname.new(__dir__).join("../../../config/default.yml")
      end
    end
  end
end
