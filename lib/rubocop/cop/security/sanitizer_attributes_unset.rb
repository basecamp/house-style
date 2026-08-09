module RuboCop
  module Cop
    module Security
      # Flags sanitizer/scrubber classes that configure an allowed-tags list
      # without also configuring an allowed-attributes list.
      #
      # With `Rails::HTML::PermitScrubber` (and friends), setting `self.tags`
      # while leaving `self.attributes` unset does not narrow attributes to an
      # explicit policy: attribute filtering falls back to Loofah's default
      # HTML5 allowlist (`Loofah::HTML5::Scrub.scrub_attributes`). That default
      # keeps every attribute Loofah allows on the retained tags — including
      # `data-*` — rather than the curated set the author likely intends. When
      # the tag list has been customized (e.g. to add `iframe`, `audio`,
      # `video`), leaning on that implicit default instead of declaring the
      # attributes is an easy XSS foothold to overlook, so require an explicit
      # allowed-attributes policy alongside the allowed-tags one.
      #
      # @example
      #   # bad
      #   class HtmlScrubber < Rails::HTML::PermitScrubber
      #     def initialize
      #       super
      #       self.tags = %w[ p a img ]
      #     end
      #   end
      #
      #   # good
      #   class HtmlScrubber < Rails::HTML::PermitScrubber
      #     def initialize
      #       super
      #       self.tags = %w[ p a img ]
      #       self.attributes = %w[ href src alt ]
      #     end
      #   end
      class SanitizerAttributesUnset < Base
        MSG = "Allowed tags are set but allowed attributes are not, so attribute " \
          "filtering falls back to Loofah's default HTML5 allowlist rather than an " \
          "explicit policy. Also set `%<attribute_setter>s`."

        # Each tag setter is only satisfied by its matching attribute setter.
        ATTRIBUTE_PARTNER = { tags: :attributes, allowed_tags: :allowed_attributes }.freeze

        def_node_matcher :tags_assignment?, <<~PATTERN
          (send self {:tags= :allowed_tags=} _)
        PATTERN

        # A wildcard RHS would let `self.attributes = nil` count as a configured
        # allowlist, but assigning nil merely restores the default unset state —
        # exactly what this cop exists to catch — so exclude a literal nil.
        def_node_matcher :attributes_assignment?, <<~PATTERN
          (send self {:attributes= :allowed_attributes=} !nil)
        PATTERN

        def on_class(node)
          if sanitizer_like?(node) && node.body
            sends = scoped_sends(node.body)
            configured = sends.filter_map { |send| setter_stem(send.method_name) if attributes_assignment?(send) }

            sends.each do |send|
              partner = ATTRIBUTE_PARTNER[setter_stem(send.method_name)]
              if tags_assignment?(send) && !configured.include?(partner)
                add_offense(send, message: format(MSG, attribute_setter: "self.#{partner}"))
              end
            end
          end
        end

        private
          def sanitizer_like?(node)
            [ node.identifier.const_name, node.parent_class&.source ].compact
              .any? { |name| name.match?(/scrubber|saniti/i) }
          end

          # Collect send nodes in the class's own scope without descending into
          # nested class/module/sclass bodies, so an assignment in an inner class
          # neither suppresses nor is misattributed to the outer sanitizer.
          def scoped_sends(node, collected = [])
            collected << node if node.send_type?
            unless node.class_type? || node.module_type? || node.sclass_type?
              node.each_child_node { |child| scoped_sends(child, collected) }
            end
            collected
          end

          def setter_stem(method_name)
            method_name.to_s.chomp("=").to_sym
          end
      end
    end
  end
end
