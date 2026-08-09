module RuboCop
  module Cop
    module Security
      # Flags sanitizer/scrubber classes that configure an allowed-tags list
      # without also configuring an allowed-attributes list.
      #
      # With `Rails::HTML::PermitScrubber` (and friends), setting `self.tags`
      # while leaving `self.attributes` unset means *every* attribute is
      # permitted on the allowed tags — including `srcdoc`, `style`, event
      # handlers stripped only by tag, and `data-*` — which is an XSS foothold.
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
        MSG = "Allowed tags are set but allowed attributes are not, so every " \
          "attribute (including `srcdoc` and `data-*`) is permitted on the " \
          "allowed tags. Also set `self.attributes`."

        def_node_matcher :tags_assignment?, <<~PATTERN
          (send self {:tags= :allowed_tags=} _)
        PATTERN

        def_node_matcher :attributes_assignment?, <<~PATTERN
          (send self {:attributes= :allowed_attributes=} _)
        PATTERN

        def on_class(node)
          if sanitizer_like?(node) && node.body
            tag_assignments = node.body.each_node(:send).select { |send| tags_assignment?(send) }

            unless tag_assignments.empty? || node.body.each_node(:send).any? { |send| attributes_assignment?(send) }
              tag_assignments.each { |assignment| add_offense(assignment) }
            end
          end
        end

        private
          def sanitizer_like?(node)
            [ node.identifier.const_name, node.parent_class&.source ].compact
              .any? { |name| name.match?(/scrubber|saniti/i) }
          end
      end
    end
  end
end
