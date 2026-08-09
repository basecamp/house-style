RSpec.describe RuboCop::Cop::Security::SanitizerAttributesUnset, :config do
  def msg(attribute_setter)
    format(described_class::MSG, attribute_setter: attribute_setter)
  end

  it "registers an offense when a scrubber sets tags without attributes" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          ^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
        end
      end
    RUBY
  end

  it "registers an offense for allowed_tags without allowed_attributes in a sanitizer" do
    expect_offense(<<~RUBY)
      class CommentSanitizer
        def configure
          self.allowed_tags = %w[p]
          ^^^^^^^^^^^^^^^^^^^^^^^^^ #{msg("self.allowed_attributes")}
        end
      end
    RUBY
  end

  it "registers an offense when tags is extended with += and attributes is unset" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags += %w[iframe audio video]
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
        end
      end
    RUBY
  end

  it "registers an offense when tags is extended with << and attributes is unset" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags << "iframe"
          ^^^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
        end
      end
    RUBY
  end

  it "does not register an offense when tags += pairs with an attributes setter" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags += %w[iframe]
          self.attributes = %w[src]
        end
      end
    RUBY
  end

  it "does not register an offense when tags += pairs with an attributes += extend" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags += %w[iframe]
          self.attributes += %w[src]
        end
      end
    RUBY
  end

  it "does not register an offense when tags << pairs with an attributes << extend" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags << "iframe"
          self.attributes << "src"
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

  it "registers an offense when tags is paired with a mismatched attribute setter" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          ^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
          self.allowed_attributes = %w[href]
        end
      end
    RUBY
  end

  it "registers an offense when attributes is explicitly assigned nil" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          ^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
          self.attributes = nil
        end
      end
    RUBY
  end

  it "registers an offense when a later nil assignment clears the attributes policy" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          ^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}
          self.attributes = %w[href]
          self.attributes = nil
        end
      end
    RUBY
  end

  it "does not register an offense when a real policy follows a nil assignment" do
    expect_no_offenses(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        def initialize
          super
          self.tags = %w[p a]
          self.attributes = nil
          self.attributes = %w[href]
        end
      end
    RUBY
  end

  it "does not let an inner class's attribute assignment suppress the outer offense" do
    expect_offense(<<~RUBY)
      class HtmlScrubber < Rails::HTML::PermitScrubber
        self.tags = %w[p a]
        ^^^^^^^^^^^^^^^^^^^ #{msg("self.attributes")}

        class Inner
          self.attributes = %w[href]
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
