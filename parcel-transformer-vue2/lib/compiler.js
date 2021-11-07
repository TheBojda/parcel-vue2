"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// vue2 SFC compiler based on https://github.com/Morgul/snowpack-plugin-vue2/blob/main/compiler/index.js
// ---------------------------------------------------------------------------------------------------------------------
// Adapter for `vue-template-compiler`
// ---------------------------------------------------------------------------------------------------------------------
const {
  parse,
  compileTemplate,
  compileStyle
} = require('@vue/component-compiler-utils');

const compiler = require('vue-template-compiler'); // ---------------------------------------------------------------------------------------------------------------------


function $parse(source, parseOptions) {
  // Pull out options so they can be more easily mapped.
  const {
    sourceMap,
    filename,
    sourceRoot,
    pad
  } = parseOptions; // Parse SFC into a descriptor

  const descriptor = parse({
    source,
    filename,
    compiler,
    compilerParseOptions: {
      pad: pad === 'space' ? 'space' : 'line'
    },
    sourceRoot,
    needMap: sourceMap
  });

  if (descriptor.script) {
    // Remove the obnoxious comment newlines in the generated code
    descriptor.script.content = descriptor.script.content.replace(/\/\/\n/g, ''); // Support using `Vue.extends()`. Code adapted from:
    // https://github.com/vuejs/vue-loader/blob/master/lib/runtime/componentNormalizer.js#L17-L20

    if (descriptor.script.content.indexOf("// parcel transformer vue2 compiler hack") == -1) {
      // descriptor.script.content = descriptor.script.content.replace('export default ', 'var scriptExports = ');
      descriptor.script.content += '\nvar scriptExports = exports.default;'; 
      descriptor.script.content += '\nvar options = typeof scriptExports === \'function\' ? scriptExports.options : scriptExports;';
      descriptor.script.content += '\nexport default options; // parcel transformer vue2 compiler hack';
    }
  }

  return {
    descriptor,
    errors: [] // TODO: How do we handle errors?

  };
}

function $compileTemplate(options) {
  // There's a lot more work we'd have to do to be 100% compatible, but the snowpack plugin only passes in 5 options,
  // and they all line up except for `compilerOptions`. So, meh, let's only worry about what we have to.
  // This is done manually in @vue/compiler-sfc, but controlled by a boolean in `@vue/component-compiler-utils`. So,
  // we ignore all the hard work the plugin did, and just toggle a boolean so the compiler will redo the work. Eh, as
  // far as hacks go, this isn't the worst.
  //const scopeId = options && options.compilerOptions && options.compilerOptions.scopeId;

  //if (scopeId) {
  //  options.scoped = true;
  //} // end if
  // We don't need compiler options


  // delete options.compilerOptions; //------------------------------------------------------------------------------------------------------------------

  const results = compileTemplate(_objectSpread(_objectSpread({}, options), {}, {
    compiler
  }));

  //if (options.id) {
  //  results.code += `\ndefaultExport._scopeId = "${options.id}";`;
  //} // TODO: Make sure the results are actually compatible. They look really close, but it's hard to say

  return _objectSpread({}, results);
}

function $compileStyle(options) {
  // There's a lot more work we'd have to do to be 100% compatible, but the snowpack plugin only passes in 6 options,
  // and they all line up. So, meh, let's only worry about what we have to.
  const results = compileStyle(options); // Modify the output to include the only non-optional thing missing. While this doesn't appear to be used, I'm a
  // bit worried it could be in the future.

  console.log(options.scoped);

  return _objectSpread(_objectSpread({}, results), {}, {
    dependencies: new Set()
  });
} // ---------------------------------------------------------------------------------------------------------------------


module.exports = {
  parse: $parse,
  compileTemplate: $compileTemplate,
  compileStyle: $compileStyle
}; // ---------------------------------------------------------------------------------------------------------------------