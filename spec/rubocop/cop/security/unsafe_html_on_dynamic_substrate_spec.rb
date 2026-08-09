RSpec.describe RuboCop::Cop::Security::UnsafeHtmlOnDynamicSubstrate, :config do
  let(:msg) { described_class::MSG }

  it "registers an offense for html_safe on markdown output" do
    expect_offense(<<~RUBY)
      markdown(text).html_safe
      ^^^^^^^^^^^^^^^^^^^^^^^^ #{msg}
    RUBY
  end

  it "registers an offense for html_safe on an interpolated string" do
    expect_offense(<<~'RUBY'.sub("MSG", RuboCop::Cop::Security::UnsafeHtmlOnDynamicSubstrate::MSG))
      "#{user}".html_safe
      ^^^^^^^^^^^^^^^^^^^ MSG
    RUBY
  end

  it "registers an offense for raw on highlighter output" do
    expect_offense(<<~RUBY)
      raw highlight(code)
      ^^^^^^^^^^^^^^^^^^^ #{msg}
    RUBY
  end

  it "registers an offense for html_safe on a user-derived variable" do
    expect_offense(<<~RUBY)
      @user_input.html_safe
      ^^^^^^^^^^^^^^^^^^^^^ #{msg}
    RUBY
  end

  it "does not register an offense for html_safe on truncate output" do
    expect_no_offenses(<<~RUBY)
      truncate(text).html_safe
    RUBY
  end

  it "does not register an offense for html_safe on a static string" do
    expect_no_offenses(<<~RUBY)
      "&nbsp;".html_safe
    RUBY
  end

  it "does not register an offense for raw with an explicit receiver" do
    expect_no_offenses(<<~RUBY)
      attachment.raw
    RUBY
  end

  it "does not register an offense for html_safe on a neutral local variable" do
    expect_no_offenses(<<~RUBY)
      body = build_footer
      body.html_safe
    RUBY
  end
end
