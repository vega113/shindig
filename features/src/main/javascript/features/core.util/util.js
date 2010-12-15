/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @fileoverview General purpose utilities that gadgets can use.
 */

// Short-term incremental library-building mechanism.
var __getUrlParameters = gadgets.util.getUrlParameters;

/**
 * @static
 * @class Provides general-purpose utility functions.
 * @name gadgets.util
 */
gadgets['util'] = function() {
  var features = {};
  var services = {};
  var onLoadHandlers = [];

  /**
   * @enum {boolean}
   * @const
   * @private
   * Maps code points to the value to replace them with.
   * If the value is "false", the character is removed entirely, otherwise
   * it will be replaced with an html entity.
   */
  var escapeCodePoints = {
    // nul; most browsers truncate because they use c strings under the covers.
    0 : false,
    // new line
    10 : true,
    // carriage return
    13 : true,
    // double quote
    34 : true,
    // single quote
    39 : true,
    // less than
    60 : true,
    // greater than
    62 : true,
    // Backslash
    92 : true,
    // line separator
    8232 : true,
    // paragraph separator
    8233 : true
  };

  /**
   * Regular expression callback that returns strings from unicode code points.
   *
   * @param {Array} match Ignored.
   * @param {number} value The codepoint value to convert.
   * @return {string} The character corresponding to value.
   */
  function unescapeEntity(match, value) {
    return String.fromCharCode(value);
  }

  /**
   * Initializes feature parameters.
   */
  function init(config) {
    features = config['core.util'] || {};
  }
  if (gadgets.config) {
    gadgets.config.register('core.util', null, init);
  }

  return /** @scope gadgets.util */ {

    /**
     * Gets the URL parameters.
     *
     * @param {string=} opt_url Optional URL whose parameters to parse.
     *                         Defaults to window's current URL.
     * @return {Object} Parameters passed into the query string.
     * @member gadgets.util
     * @private Implementation detail.
     */
    'getUrlParameters' : __getUrlParameters,

    /**
     * Creates a closure that is suitable for passing as a callback.
     * Any number of arguments
     * may be passed to the callback;
     * they will be received in the order they are passed in.
     *
     * @param {Object} scope The execution scope; may be null if there is no
     *     need to associate a specific instance of an object with this
     *     callback.
     * @param {function(Object,Object)} callback The callback to invoke when this is run;
     *     any arguments passed in will be passed after your initial arguments.
     * @param {Object} var_args Initial arguments to be passed to the callback.
     *
     * @member gadgets.util
     * @private Implementation detail.
     */
    'makeClosure' : function(scope, callback, var_args) {
      // arguments isn't a real array, so we copy it into one.
      var baseArgs = [];
      for (var i = 2, j = arguments.length; i < j; ++i) {
        baseArgs.push(arguments[i]);
      }
      return function() {
        // append new arguments.
        var tmpArgs = baseArgs.slice();
        for (var i = 0, j = arguments.length; i < j; ++i) {
          tmpArgs.push(arguments[i]);
        }
        return callback.apply(scope, tmpArgs);
      };
    },

    /**
     * Utility function for generating an "enum" from an array.
     *
     * @param {Array.<string>} values The values to generate.
     * @return {Object.<string,string>} An object with member fields to handle
     *   the enum.
     *
     * @private Implementation detail.
     */
    'makeEnum' : function(values) {
      var i, v, obj = {};
      for (i = 0; (v = values[i]); ++i) {
        obj[v] = v;
      }
      return obj;
    },

    /**
     * Gets the feature parameters.
     *
     * @param {string} feature The feature to get parameters for.
     * @return {Object} The parameters for the given feature, or null.
     *
     * @member gadgets.util
     */
    'getFeatureParameters' : function(feature) {
      return typeof features[feature] === 'undefined' ? null : features[feature];
    },

    /**
     * Returns whether the current feature is supported.
     *
     * @param {string} feature The feature to test for.
     * @return {boolean} True if the feature is supported.
     *
     * @member gadgets.util
     */
    'hasFeature' : function(feature) {
      return typeof features[feature] !== 'undefined';
    },

    /**
     * Returns the list of services supported by the server
     * serving this gadget.
     *
     * @return {Object} List of Services that enumerate their methods.
     *
     * @member gadgets.util
     */
    'getServices' : function() {
      return services;
    },

    /**
     * Registers an onload handler.
     * @param {function()} callback The handler to run.
     *
     * @member gadgets.util
     */
    'registerOnLoadHandler' : function(callback) {
      onLoadHandlers.push(callback);
    },

    /**
     * Runs all functions registered via registerOnLoadHandler.
     * @private Only to be used by the container, not gadgets.
     */
    'runOnLoadHandlers' : function() {
      for (var i = 0, j = onLoadHandlers.length; i < j; ++i) {
        onLoadHandlers[i]();
      }
    },

    /**
     * Escapes the input using html entities to make it safer.
     *
     * If the input is a string, uses gadgets.util.escapeString.
     * If it is an array, calls escape on each of the array elements
     * if it is an object, will only escape all the mapped keys and values if
     * the opt_escapeObjects flag is set. This operation involves creating an
     * entirely new object so only set the flag when the input is a simple
     * string to string map.
     * Otherwise, does not attempt to modify the input.
     *
     * @param {Object} input The object to escape.
     * @param {boolean=} opt_escapeObjects Whether to escape objects.
     * @return {Object} The escaped object.
     * @private Only to be used by the container, not gadgets.
     */
    'escape' : function(input, opt_escapeObjects) {
      if (!input) {
        return input;
      } else if (typeof input === 'string') {
        return gadgets.util.escapeString(input);
      } else if (typeof input === 'array') {
        for (var i = 0, j = input.length; i < j; ++i) {
          input[i] = gadgets.util.escape(input[i]);
        }
      } else if (typeof input === 'object' && opt_escapeObjects) {
        var newObject = {};
        for (var field in input) {
          if (input.hasOwnProperty(field)) {
            newObject[gadgets.util.escapeString(field)] = gadgets.util.escape(input[field], true);
          }
        }
        return newObject;
      }
      return input;
    },

    /**
     * Escapes the input using html entities to make it safer.
     *
     * Currently not in the spec -- future proposals may change
     * how this is handled.
     *
     * TODO: Parsing the string would probably be more accurate and faster than
     * a bunch of regular expressions.
     *
     * @param {string} str The string to escape.
     * @return {string} The escaped string.
     */
    'escapeString' : function(str) {
      if (!str) return str;
      var out = [], ch, shouldEscape;
      for (var i = 0, j = str.length; i < j; ++i) {
        ch = str.charCodeAt(i);
        shouldEscape = escapeCodePoints[ch];
        if (shouldEscape === true) {
          out.push('&#', ch, ';');
        } else if (shouldEscape !== false) {
          // undefined or null are OK.
          out.push(str.charAt(i));
        }
      }
      return out.join('');
    },

    /**
     * Reverses escapeString
     *
     * @param {string} str The string to unescape.
     * @return {string}
     */
    'unescapeString' : function(str) {
      if (!str) return str;
      return str.replace(/&#([0-9]+);/g, unescapeEntity);
    },


    /**
     * Attach an event listener to given DOM element (Not a gadget standard)
     *
     * @param {Object} elem  DOM element on which to attach event.
     * @param {string} eventName  Event type to listen for.
     * @param {function()} callback  Invoked when specified event occurs.
     * @param {boolean} useCapture  If true, initiates capture.
     */
    'attachBrowserEvent': function(elem, eventName, callback, useCapture) {
      if (typeof elem.addEventListener != 'undefined') {
        elem.addEventListener(eventName, callback, useCapture);
      } else if (typeof elem.attachEvent != 'undefined') {
        elem.attachEvent('on' + eventName, callback);
      } else {
        gadgets.warn('cannot attachBrowserEvent: ' + eventName);
      }
    },

    /**
     * Remove event listener. (Shindig internal implementation only)
     *
     * @param {Object} elem  DOM element from which to remove event.
     * @param {string} eventName  Event type to remove.
     * @param {function()} callback  Listener to remove.
     * @param {boolean} useCapture  Specifies whether listener being removed was added with
     *                              capture enabled.
     */
    'removeBrowserEvent': function(elem, eventName, callback, useCapture) {
      if (elem.removeEventListener) {
        elem.removeEventListener(eventName, callback, useCapture);
      } else if (elem.detachEvent) {
        elem.detachEvent('on' + eventName, callback);
      } else {
        gadgets.warn('cannot removeBrowserEvent: ' + eventName);
      }
    }
  };
}();
