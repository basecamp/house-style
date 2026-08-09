module RuboCop
  module Cop
    module Security
      # Flags `.html_safe` / `raw(...)` applied to a dynamic substrate:
      # markdown rendering, syntax-highlighter output, string interpolation,
      # or a user-derived variable. These bypass Rails auto-escaping for
      # content that can carry attacker-controlled markup.
      #
      # Deliberately conservative: only known-dynamic receivers are flagged,
      # so safe-helper chains like `truncate(text).html_safe` and static
      # strings like `"&nbsp;".html_safe` do not trip.
      #
      # SCOPE — this is a DIRECT-SINK tripwire, not a taint tracker. It fires
      # only when the dynamic substrate is the *immediate* receiver of
      # `html_safe`/`raw` (a renderer call or an interpolation applied directly).
      # It intentionally does NOT catch value-laundered forms, where the dynamic
      # value has passed through an intervening binding or call before being
      # marked safe:
      #
      #   html = markdown(x); html.html_safe          # renderer output via a local
      #   content_tag(:div, markdown(x)).html_safe    # renderer wrapped in another call
      #   ("<b>" + user + "</b>").html_safe           # operator/format-built string
      #
      # A value-flow-free AST cop cannot distinguish these from their safe
      # equivalents (a sanitized local, a `content_tag` of escaped content, a
      # concatenation of literals) without disabling-grade false positives. Those
      # laundered paths are covered by the sanitizer-chokepoint and code-review
      # layers, not here — do not read a clean run from this cop as assurance
      # that html_safe usage is safe.
      #
      # KNOWN FALSE POSITIVES — the receiver test is a name/shape heuristic, so a
      # few safe forms trip and should be silenced with `# rubocop:disable`:
      # interpolation of constant or numeric values (`"© #{Time.current.year}".html_safe`),
      # and substring matches on receiver names (e.g. the Rails `highlight` helper,
      # matched by the `highlight` renderer pattern).
      #
      # @example
      #   # bad
      #   markdown(post.body).html_safe
      #   "#{user_name} joined".html_safe
      #   raw highlight(code)
      #
      #   # good
      #   sanitize markdown(post.body)
      #   "#{ERB::Util.html_escape(user_name)} joined".html_safe
      #   truncate(text).html_safe
      class UnsafeHtmlOnDynamicSubstrate < Base
        MSG = "Dynamically generated HTML marked as safe without sanitization. " \
          "Use `sanitize` (or escape the interpolated values) instead of " \
          "`html_safe`/`raw` on rendered, interpolated, or user-derived content."

        RESTRICT_ON_SEND = %i[ html_safe raw ].freeze

        DYNAMIC_RENDERERS = /markdown|kramdown|redcarpet|commonmark|highlight|rouge|pygment|render/i
        USER_DERIVED_NAMES = /user|param|input|untrusted|unsanitized/i
        ESCAPE_HELPERS = /\A(?:html_escape|html_escape_once|h|sanitize|escape_html|escapeHTML|json_escape)\z/

        def on_send(node)
          substrate =
            if node.method?(:html_safe)
              node.receiver
            elsif node.receiver.nil? && node.arguments.one?
              node.first_argument
            end

          add_offense(node) if substrate && dynamic_substrate?(substrate)
        end
        alias on_csend on_send

        private
          def dynamic_substrate?(node)
            case node.type
            when :dstr
              unescaped_interpolation?(node)
            when :send, :csend
              node.method_name.match?(DYNAMIC_RENDERERS)
            when :lvar, :ivar
              node.children.first.to_s.match?(USER_DERIVED_NAMES)
            else
              false
            end
          end

          # An interpolated string is only dynamic if at least one interpolation
          # is not wrapped in a recognized escaping helper. `"#{h(x)} joined"` is
          # the class's own documented safe form and must not trip; `"#{x}"` and
          # `"#{h(a)}#{b}"` still do.
          def unescaped_interpolation?(node)
            interpolations = node.children.select(&:begin_type?)
            interpolations.any? { |interpolation| !escaped_interpolation?(interpolation) }
          end

          def escaped_interpolation?(node)
            node.children.all? do |expression|
              (expression.send_type? || expression.csend_type?) \
                && ESCAPE_HELPERS.match?(expression.method_name.to_s)
            end
          end
      end
    end
  end
end
