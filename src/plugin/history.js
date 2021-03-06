"use strict";

//-------------------------------------------------------------------------------------------------

var camelize = require("../util/camelize");

//-------------------------------------------------------------------------------------------------



module.exports = function(options) {
  options = options || {};

  var past = camelize(options.name || options.past || "history"),
    back = "back",
    future = camelize(options.future || "future"),
    clear = camelize.prepended("clear", past),
    forward = camelize.prepended(past, "forward"),
    canBack = camelize.prepended("can", back),
    canForward = camelize.prepended("can", forward),
    max = options.max;

  var plugin = {
    configure: function(config) {
      config.addTransitionLifecycleNames(back);
      config.addTransitionLifecycleNames(forward);
    },

    init: function(instance) {
      instance[past] = [];
      instance[future] = [];
    },

    lifecycle: function(instance, lifecycle) {
      if (lifecycle.event === "onEnterState") {
        instance[past].push(lifecycle.to);
        if (max && instance[past].length > max) instance[past].shift();
        if (lifecycle.transition !== back && lifecycle.transition !== forward)
          instance[future].length = 0;
      }
    },

    methods: {},
    properties: {}
  };

  plugin.methods[clear] = function() {
    this[past].length = 0;
    this[future].length = 0;
  };

  plugin.properties[canBack] = {
    get: function() {
      return this[past].length > 1;
    }
  };

  plugin.properties[canForward] = {
    get: function() {
      return this[future].length > 0;
    }
  };

  plugin.methods.doBack = function() {
    if (!this[canBack]) throw Error("no history");
    var from = this[past].pop(),
    to = this[past].pop();
    this[future].push(from);
    return this._fsm.transit(back, from, to, []);
  }

  plugin.methods[back] = function() {
    if (this.isPending()) {
      var _this = this;
      return this._fsm.waitForState().then(function() {
        _this._fsm.pending = false;
        return _this.doBack();
      });
    }
    return this.doBack();
  };

  plugin.methods[forward] = function() {
    if (!this[canForward]) throw Error("no history");
    var from = this.state,
      to = this[future].pop();
    return this._fsm.transit(forward, from, to, []);
  };

  return plugin;
};
