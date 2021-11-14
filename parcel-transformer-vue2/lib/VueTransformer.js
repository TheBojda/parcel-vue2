"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _plugin = require("@parcel/plugin");

var _nullthrows = _interopRequireDefault(require("nullthrows"));

var _utils = require("@parcel/utils");

var _diagnostic = _interopRequireWildcard(require("@parcel/diagnostic"));

var _sourceMap = _interopRequireDefault(require("@parcel/source-map"));

var _semver = _interopRequireDefault(require("semver"));

var _path = require("path");

var compiler = _interopRequireWildcard(require("./compiler"));

var _consolidate = _interopRequireDefault(require("consolidate"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const MODULE_BY_NAME_RE = /\.module\./; // TODO: Use language-specific config files during preprocessing

var _default = new _plugin.Transformer({
  async loadConfig({
    config
  }) {
    let conf = await config.getConfig(['.vuerc', '.vuerc.json', '.vuerc.js', 'vue.config.js'], {
      packageKey: 'vue'
    });
    let contents = {};

    if (conf) {
      config.invalidateOnStartup();
      contents = conf.contents;

      if (typeof contents !== 'object') {
        // TODO: codeframe
        throw new _diagnostic.default({
          diagnostic: {
            message: 'Vue config should be an object.',
            origin: '@parcel/transformer-vue'
          }
        });
      }
    }

    return {
      customBlocks: contents.customBlocks || {},
      filePath: conf && conf.filePath
    };
  },

  canReuseAST({
    ast
  }) {
    return ast.type === 'vue' && _semver.default.satisfies(ast.version, '^2.6.14');
  },

  async parse({
    asset
  }) {
    // TODO: This parses the vue component multiple times. Fix?
    let code = await asset.getCode();
    let parsed = compiler.parse(code, {
      sourceMap: true,
      filename: asset.filePath
    });

    if (parsed.errors.length) {
      throw new _diagnostic.default({
        diagnostic: parsed.errors.map(err => {
          return createDiagnostic(err, asset.filePath);
        })
      });
    }

    return {
      type: 'vue',
      version: '2.6.14',
      program: parsed.descriptor
    };
  },

  async transform({
    asset,
    options,
    resolve,
    config
  }) {
    let id = (0, _utils.hashObject)({
      filePath: asset.filePath
    }).slice(-6);
    let scopeId = 'data-v-' + id;
    let hmrId = id + '-hmr';
    let basePath = (0, _path.basename)(asset.filePath);
    let {
      template,
      script,
      styles,
      customBlocks
    } = (0, _nullthrows.default)((await asset.getAST())).program;

    if (asset.pipeline != null) {
      return processPipeline({
        asset,
        template,
        script,
        styles,
        customBlocks,
        config,
        basePath,
        options,
        resolve,
        id,
        hmrId
      });
    }

    return [{
      type: 'js',
      uniqueKey: asset.id + '-glue',
      content: `
let script;
let initialize = () => {
  script = ${script != null ? `require('script:./${basePath}');
  if (script.__esModule) script = script.default` : '{}'};
  ${template != null ? `script.render = require('template:./${basePath}').render;
            script.staticRenderFns = require('template:./${basePath}').staticRenderFns;
            script._scopeId = "${scopeId}";
            ` : ''}
  ${styles.length !== 0 ? `script.__cssModules = require('style:./${basePath}').default;` : ''}
  ${customBlocks != null ? `require('custom:./${basePath}').default(script);` : ''}
  script.__scopeId = '${scopeId}';
  script.__file = ${JSON.stringify(options.mode === 'production' ? basePath : asset.filePath)};
};
initialize();
${options.hmrOptions ? `if (module.hot) {
  script.__hmrId = '${hmrId}';

  if(!window.__VUE_HMR_RUNTIME__) {
    const api = require('vue-hot-reload-api')
    const Vue = require('vue')
    api.install(Vue)
    window.__VUE_HMR_RUNTIME__ = api;
  }

  window.__VUE_HMR_RUNTIME__.createRecord('${hmrId}', script);

  module.hot.accept(() => {
    setTimeout(() => {
      initialize();
      // window.location.reload();
      window.__VUE_HMR_RUNTIME__.reload('${hmrId}', script);
    }, 0);
  });
}` : ''}
export default script;`
    }];
  }

});

exports.default = _default;

function createDiagnostic(err, filePath) {
  if (typeof err === 'string') {
    return {
      message: err,
      origin: '@parcel/transformer-vue',
      filePath
    };
  } // TODO: codeframe


  let diagnostic = {
    message: (0, _diagnostic.escapeMarkdown)(err.message),
    origin: '@parcel/transformer-vue',
    name: err.name,
    stack: err.stack
  };

  if (err.loc) {
    diagnostic.codeFrames = [{
      codeHighlights: [{
        start: {
          line: err.loc.start.line + err.loc.start.offset,
          column: err.loc.start.column
        },
        end: {
          line: err.loc.end.line + err.loc.end.offset,
          column: err.loc.end.column
        }
      }]
    }];
  }

  return diagnostic;
}

async function processPipeline({
  asset,
  template,
  script,
  styles,
  customBlocks,
  config,
  basePath,
  options,
  resolve,
  id,
  hmrId
}) {
  switch (asset.pipeline) {
    case 'template':
      {
        let isFunctional = template.functional;

        if (template.src) {
          template.content = (await options.inputFS.readFile((await resolve(asset.filePath, template.src)))).toString();
          template.lang = (0, _path.extname)(template.src).slice(1);
        }

        let content = template.content;

        if (template.lang && !['htm', 'html'].includes(template.lang)) {
          let preprocessor = _consolidate.default[template.lang];

          if (!preprocessor) {
            // TODO: codeframe
            throw new _diagnostic.default({
              diagnostic: {
                message: (0, _diagnostic.md)`Unknown template language: "${template.lang}"`,
                origin: '@parcel/transformer-vue'
              }
            });
          }

          content = await preprocessor.render(content, {});
        }

        let templateComp = compiler.compileTemplate({
          filename: asset.filePath,
          source: content,
          inMap: template.src ? undefined : template.map,
          scoped: styles.some(style => style.scoped),
          isFunctional,
          id
        });

        if (templateComp.errors.length) {
          throw new _diagnostic.default({
            diagnostic: templateComp.errors.map(err => {
              return createDiagnostic(err, asset.filePath);
            })
          });
        }

        let templateAsset = _objectSpread(_objectSpread({
          type: 'js',
          uniqueKey: asset.id + '-template'
        }, !template.src && asset.env.sourceMap && {
          map: createMap(templateComp.map, options.projectRoot)
        }), {}, {
          content: templateComp.code + '\nexports.render = render;\nexports.staticRenderFns = staticRenderFns;\n' + `
${options.hmrOptions ? `if (module.hot) {
  module.hot.accept(() => {
    // window.location.reload();
    
    if(!window.__VUE_HMR_RUNTIME__) {
      const api = require('vue-hot-reload-api')
      const Vue = require('vue')
      api.install(Vue)
      window.__VUE_HMR_RUNTIME__ = api;
    }

    window.__VUE_HMR_RUNTIME__.rerender('${hmrId}', exports);
  })
}` : ''}`
        });

        return [templateAsset];
      }

    case 'script':
      {
        if (script.src) {
          script.content = (await options.inputFS.readFile((await resolve(asset.filePath, script.src)))).toString();
          script.lang = (0, _path.extname)(script.src).slice(1);
        }

        let type;

        switch (script.lang || 'js') {
          case 'javascript':
          case 'js':
            type = 'js';
            break;

          case 'jsx':
            type = 'jsx';
            break;

          case 'typescript':
          case 'ts':
            type = 'ts';
            break;

          case 'tsx':
            type = 'tsx';
            break;

          case 'coffeescript':
          case 'coffee':
            type = 'coffee';
            break;

          default:
            // TODO: codeframe
            throw new _diagnostic.default({
              diagnostic: {
                message: (0, _diagnostic.md)`Unknown script language: "${script.lang}"`,
                origin: '@parcel/transformer-vue'
              }
            });
        }

        let scriptAsset = _objectSpread({
          type,
          uniqueKey: asset.id + '-script',
          content: script.content
        }, !script.src && asset.env.sourceMap && {
          map: createMap(script.map, options.projectRoot)
        });

        return [scriptAsset];
      }

    case 'style':
      {
        let cssModules = {};
        let assets = await Promise.all(styles.map(async (style, i) => {
          if (style.src) {
            style.content = (await options.inputFS.readFile((await resolve(asset.filePath, style.src)))).toString();

            if (!style.module) {
              style.module = MODULE_BY_NAME_RE.test(style.src);
            }

            style.lang = (0, _path.extname)(style.src).slice(1);
          }

          switch (style.lang) {
            case 'less':
            case 'stylus':
            case 'styl':
            case 'scss':
            case 'sass':
            case 'css':
            case undefined:
              break;

            default:
              // TODO: codeframe
              throw new _diagnostic.default({
                diagnostic: {
                  message: (0, _diagnostic.md)`Unknown style language: "${style.lang}"`,
                  origin: '@parcel/transformer-vue'
                }
              });
          }

          let styleComp = await compiler.compileStyle({
            filename: asset.filePath,
            source: style.content,
            modules: style.module,
            preprocessLang: style.lang || 'css',
            scoped: style.scoped ? true : false,
            map: style.src ? undefined : style.map,
            id: 'data-v-' + id
          });

          if (styleComp.errors.length) {
            throw new _diagnostic.default({
              diagnostic: styleComp.errors.map(err => {
                return createDiagnostic(err, asset.filePath);
              })
            });
          }

          let styleAsset = _objectSpread(_objectSpread({
            type: 'css',
            content: styleComp.code,
            sideEffects: true
          }, !style.src && asset.env.sourceMap && {
            map: createMap(style.map, options.projectRoot)
          }), {}, {
            uniqueKey: asset.id + '-style' + i
          });

          if (styleComp.modules) {
            if (typeof style.module === 'boolean') style.module = '$style';
            cssModules[style.module] = _objectSpread(_objectSpread({}, cssModules[style.module]), styleComp.modules);
          }

          return styleAsset;
        }));

        if (Object.keys(cssModules).length !== 0) {
          assets.push({
            type: 'js',
            uniqueKey: asset.id + '-cssModules',
            content: `
import {render} from 'template:./${basePath}';
let cssModules = ${JSON.stringify(cssModules)};
${options.hmrOptions ? `if (module.hot) {
  module.hot.accept(() => {
    // window.location.reload();
    
    if(!window.__VUE_HMR_RUNTIME__) {
      const api = require('vue-hot-reload-api')
      const Vue = require('vue')
      api.install(Vue)
      window.__VUE_HMR_RUNTIME__ = api;
    }

    window.__VUE_HMR_RUNTIME__.rerender('${hmrId}', render);
  });
};` : ''}
export default cssModules;`
          });
        }

        return assets;
      }

    case 'custom':
      {
        let toCall = []; // To satisfy flow

        if (!config) return [];
        let types = new Set();

        for (let block of customBlocks) {
          let {
            type,
            src,
            content,
            attrs
          } = block;

          if (!config.customBlocks[type]) {
            // TODO: codeframe
            throw new _diagnostic.default({
              diagnostic: {
                message: (0, _diagnostic.md)`No preprocessor found for block type ${type}`,
                origin: '@parcel/transformer-vue'
              }
            });
          }

          if (src) {
            content = (await options.inputFS.readFile((await resolve(asset.filePath, src)))).toString();
          }

          toCall.push([type, content, attrs]);
          types.add(type);
        }

        return [{
          type: 'js',
          uniqueKey: asset.id + '-custom',
          content: `
let NOOP = () => {};
${(await Promise.all([...types].map(async type => `import p${type} from './${(0, _path.relative)((0, _path.dirname)(asset.filePath), (await resolve((0, _nullthrows.default)(config.filePath), config.customBlocks[type])))}';
if (typeof p${type} !== 'function') {
  p${type} = NOOP;
}`))).join('\n')}
export default script => {
  ${toCall.map(([type, content, attrs]) => `  p${type}(script, ${JSON.stringify(content)}, ${JSON.stringify(attrs)});`).join('\n')}
}`
        }];
      }

    default:
      {
        return [];
      }
  }
}

function createMap(rawMap, projectRoot) {
  let newMap = new _sourceMap.default(projectRoot);
  if (rawMap) newMap.addVLQMap(rawMap);
  return newMap;
}