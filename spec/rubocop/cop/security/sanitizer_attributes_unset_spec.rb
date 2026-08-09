RSpec.describe RuboCop::Cop::Security::SanitizerAttributesUnset, :config do
  let(:msg) { described_class::MSG }

  it "registers an offense when a scrubber sets tags without attributes" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          ^^^^^^^^^^^^^^^^^^^ #{msg}
        end
      end
    RUBY
  end

  it "registers an offense for allowed_tags without allowed_attributes in a sanitizer" do
    expect_offense(<<~RUBY)
      class CommentSanitizer
        def configure
          self.allowed_tags = %w[p]
          ^^^^^^^^^^^^^^^^^^^^^^^^^ #{msg}
        end
      end
    RUBY
  end

  it "does not register an offense when both tags and attributes are set" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          self.attributes = %w[href]
        end
      end
    RUBY
  end

  it "does not register an offense when allowed_tags pairs with allowed_attributes" do
    expect_no_offenses(<<~RUBY)
      class CommentSanitizer
        def configure
          self.allowed_tags = %w[p]
          self.allowed_attributes = %w[href]
        end
      end
    RUBY
  end

  it "does not register an offense for tags assignment outside sanitizer-like classes" do
    expect_no_offenses(<<~RUBY)
      class Post
        def categorize
          self.tags = %w[news]
        end
      end
    RUBY
  end

  it "does not register an offense for a sanitizer that sets no tags" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.attributes = %w[href]
        end
      end
    RUBY
  end
end
