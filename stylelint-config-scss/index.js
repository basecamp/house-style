'use strict';

module.exports = {
  extends: "stylelint-config-recommended-scss",

  reportNeedlessDisables: true,

  rules: {
    "no-duplicate-selectors": null,

    "scss/comment-no-empty": null,
    "scss/no-global-function-names": null
  }
};
