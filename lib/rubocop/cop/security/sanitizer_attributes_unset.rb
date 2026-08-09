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
      # The allowlist may be assigned outright or extended in place; both the
      # `self.tags = ...` assignment and the `self.tags += ...` / `self.tags << ...`
      # extend forms configure the tag policy and equally require a matching
      # attributes policy. Extending an inherited tag allowlist without setting
      # attributes carries the same risk as assigning one.
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
      #   # bad — extending the inherited allowlist leaves attributes unset too
      #   class HtmlScrubber < Rails::HTML::PermitScrubber
      #     def initialize
      #       super
      #       self.tags += %w[ iframe audio video ]
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

        # Match the tag allowlist being configured in any of three forms:
        # `self.tags = x` (a `:tags=` send), `self.tags += x` (an op-asgn over the
        # `:tags` reader), and `self.tags << x` (a `<<` send on the reader).
        # Captures the stem symbol (`:tags` / `:allowed_tags`), `=` chomped off.
        def_node_matcher :tags_setter_stem, <<~PATTERN
          {
            (send self ${:tags= :allowed_tags=} _)
            (op_asgn (send self ${:tags :allowed_tags}) _ _)
            (send (send self ${:tags :allowed_tags}) :<< _)
          }
        PATTERN

        # The same three forms for the attributes allowlist. A literal nil RHS is
        # excluded throughout: `self.attributes = nil` merely restores the default
        # unset state — exactly what this cop exists to catch — and neither
        # `+= nil` nor `<< nil` configures a real policy either.
        def_node_matcher :attributes_setter_stem, <<~PATTERN
          {
            (send self ${:attributes= :allowed_attributes=} !nil)
            (op_asgn (send self ${:attributes :allowed_attributes}) _ !nil)
            (send (send self ${:attributes :allowed_attributes}) :<< !nil)
          }
        PATTERN

        def on_class(node)
          if sanitizer_like?(node) && node.body
            nodes = scoped_nodes(node.body)
            configured = nodes.filter_map { |candidate| setter_stem(attributes_setter_stem(candidate)) }

            nodes.each do |candidate|
              partner = ATTRIBUTE_PARTNER[setter_stem(tags_setter_stem(candidate))]
              if partner && !configured.include?(partner)
                add_offense(candidate, message: format(MSG, attribute_setter: "self.#{partner}"))
              end
            end
          end
        end

        private
          def sanitizer_like?(node)
            [ node.identifier.const_name, node.parent_class&.source ].compact
              .any? { |name| name.match?(/scrubber|saniti/i) }
          end

          # Collect the send and op-asgn nodes in the class's own scope without
          # descending into nested class/module/sclass bodies, so an assignment in
          # an inner class neither suppresses nor is misattributed to the outer
          # sanitizer. Op-asgn carries the `+=` extend form, which is not a send.
          def scoped_nodes(node, collected = [])
            collected << node if node.send_type? || node.op_asgn_type?
            unless node.class_type? || node.module_type? || node.sclass_type?
              node.each_child_node { |child| scoped_nodes(child, collected) }
            end
            collected
          end

          def setter_stem(captured)
            captured&.to_s&.chomp("=")&.to_sym
          end
      end
    end
  end
end
