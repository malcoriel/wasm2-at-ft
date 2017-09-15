(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jpegasm = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Module = {
    wasmBinaryFile: 'jpeg-asm/build/libjpegasm.wasm'
};
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' ;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function shell_read() { throw 'no read() available' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status, toThrow) {
      quit(status);
    }
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function shell_read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
      } else {
        onerror();
      }
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function shell_print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function shell_printErr(x) {
      console.warn(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}
if (!Module['quit']) {
  Module['quit'] = function(status, toThrow) {
    throw toThrow;
  }
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
    return value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      // optimize away arguments usage in common cases
      if (sig.length === 1) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func);
        };
      } else if (sig.length === 2) {
        sigCache[func] = function dynCall_wrapper(arg) {
          return Runtime.dynCall(sig, func, [arg]);
        };
      } else {
        // general case
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
        };
      }
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { assert(DYNAMICTOP_PTR);var ret = HEAP32[DYNAMICTOP_PTR>>2];var end = (((ret + size + 15)|0) & -16);HEAP32[DYNAMICTOP_PTR>>2] = end;if (end >= TOTAL_MEMORY) {var success = enlargeMemory();if (!success) {HEAP32[DYNAMICTOP_PTR>>2] = ret;return 0;}}return ret;},
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 1024,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try { func = eval('_' + ident); } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = Runtime.stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface.
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }

  // sources of useful functions. we create this lazily as it can trigger a source decompression on this entire file
  var JSsource = null;
  function ensureJSsource() {
    if (!JSsource) {
      JSsource = {};
      for (var fun in JSfuncs) {
        if (JSfuncs.hasOwnProperty(fun)) {
          // Elements of toCsource are arrays of three items:
          // the code, and the return value
          JSsource[fun] = parseJSFunc(JSfuncs[fun]);
        }
      }
    }
  }

  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      ensureJSsource();
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=(' + convertCode.returnValue + ');';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      ensureJSsource();
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}


function demangle(func) {
  var __cxa_demangle_func = Module['___cxa_demangle'] || Module['__cxa_demangle'];
  if (__cxa_demangle_func) {
    try {
      var s =
        func.substr(1);
      var len = lengthBytesUTF8(s)+1;
      var buf = _malloc(len);
      stringToUTF8(s, buf, len);
      var status = _malloc(4);
      var ret = __cxa_demangle_func(buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed
    } catch(e) {
      // ignore problems here
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
    // failure when using libcxxabi, don't demangle
    return func;
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  if (HEAPU32[(STACK_MAX >> 2)-1] != 0x02135467 || HEAPU32[(STACK_MAX >> 2)-2] != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + HEAPU32[(STACK_MAX >> 2)-2].toString(16) + ' ' + HEAPU32[(STACK_MAX >> 2)-1].toString(16));
  }
  // Also test the global address 0 for integrity. This check is not compatible with SAFE_SPLIT_MEMORY though, since that mode already tests all address 0 accesses on its own.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) throw 'Runtime error: The application has corrupted its heap memory area (address zero)!';
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - Module['asm'].stackSave() + allocSize) + ' bytes available!');
}

function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

if (!Module['reallocBuffer']) Module['reallocBuffer'] = function(size) {
  var ret;
  try {
    if (ArrayBuffer.transfer) {
      ret = ArrayBuffer.transfer(buffer, size);
    } else {
      var oldHEAP8 = HEAP8;
      ret = new ArrayBuffer(size);
      var temp = new Int8Array(ret);
      temp.set(oldHEAP8);
    }
  } catch(e) {
    return false;
  }
  var success = _emscripten_replace_memory(ret);
  if (!success) return false;
  return ret;
};

function enlargeMemory() {
  // TOTAL_MEMORY is the current size of the actual array, and DYNAMICTOP is the new top.
  assert(HEAP32[DYNAMICTOP_PTR>>2] > TOTAL_MEMORY); // This function should only ever be called after the ceiling of the dynamic heap has already been bumped to exceed the current total size of the asm.js heap.


  var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
  var LIMIT = 2147483648 - PAGE_MULTIPLE; // We can do one page short of 2GB as theoretical maximum.

  if (HEAP32[DYNAMICTOP_PTR>>2] > LIMIT) {
    Module.printErr('Cannot enlarge memory, asked to go up to ' + HEAP32[DYNAMICTOP_PTR>>2] + ' bytes, but the limit is ' + LIMIT + ' bytes!');
    return false;
  }

  var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
  TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY); // So the loop below will not be infinite, and minimum asm.js memory size is 16MB.

  while (TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR>>2]) { // Keep incrementing the heap size as long as it's less than what is requested.
    if (TOTAL_MEMORY <= 536870912) {
      TOTAL_MEMORY = alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE); // Simple heuristic: double until 1GB...
    } else {
      TOTAL_MEMORY = Math.min(alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE), LIMIT); // ..., but after that, add smaller increments towards 2GB, which we cannot reach
    }
  }

  var start = Date.now();

  var replacement = Module['reallocBuffer'](TOTAL_MEMORY);
  if (!replacement || replacement.byteLength != TOTAL_MEMORY) {
    Module.printErr('Failed to grow the heap from ' + OLD_TOTAL_MEMORY + ' bytes to ' + TOTAL_MEMORY + ' bytes, not enough memory!');
    if (replacement) {
      Module.printErr('Expected to get back a buffer of size ' + TOTAL_MEMORY + ' bytes, but instead got back a buffer of size ' + replacement.byteLength);
    }
    // restore the state to before this call, we failed
    TOTAL_MEMORY = OLD_TOTAL_MEMORY;
    return false;
  }

  // everything worked

  updateGlobalBuffer(replacement);
  updateGlobalBufferViews();

  Module.printErr('enlarged memory arrays from ' + OLD_TOTAL_MEMORY + ' to ' + TOTAL_MEMORY + ', took ' + (Date.now() - start) + ' ms (has ArrayBuffer.transfer? ' + (!!ArrayBuffer.transfer) + ')');

  if (!Module["usingWasm"]) {
    Module.printErr('Warning: Enlarging memory arrays, this is not fast! ' + [OLD_TOTAL_MEMORY, TOTAL_MEMORY]);
  }


  return true;
}

var byteLength;
try {
  byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get);
  byteLength(new ArrayBuffer(4)); // can fail on older ie
} catch(e) { // can fail on older node/v8
  byteLength = function(buffer) { return buffer.byteLength; };
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  // Use a WebAssembly memory where available
  if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
    assert(TOTAL_MEMORY % WASM_PAGE_SIZE === 0);
    Module['wasmMemory'] = new WebAssembly.Memory({ 'initial': TOTAL_MEMORY / WASM_PAGE_SIZE });
    buffer = Module['wasmMemory'].buffer;
  } else
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  assert(buffer.byteLength === TOTAL_MEMORY);
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  checkStackCookie();
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];

if (!Math['fround']) {
  var froundBuffer = new Float32Array(1);
  Math['fround'] = function(x) { froundBuffer[0] = x; return froundBuffer[0] };
}
Math.fround = Math['fround'];

if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

if (!Math['trunc']) Math['trunc'] = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
};
Math.trunc = Math['trunc'];

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



var /* show errors on likely calls to FS when it was not included */ FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;


function integrateWasmJS(Module) {
  // wasm.js has several methods for creating the compiled code module here:
  //  * 'native-wasm' : use native WebAssembly support in the browser
  //  * 'interpret-s-expr': load s-expression code from a .wast and interpret
  //  * 'interpret-binary': load binary wasm and interpret
  //  * 'interpret-asm2wasm': load asm.js code, translate to wasm, and interpret
  //  * 'asmjs': no wasm, just load the asm.js code and use that (good for testing)
  // The method can be set at compile time (BINARYEN_METHOD), or runtime by setting Module['wasmJSMethod'].
  // The method can be a comma-separated list, in which case, we will try the
  // options one by one. Some of them can fail gracefully, and then we can try
  // the next.

  // inputs

  var method = Module['wasmJSMethod'] || 'native-wasm';
  Module['wasmJSMethod'] = method;

  var wasmTextFile = Module['wasmTextFile'] || 'libjpegasm.wast';
  var wasmBinaryFile = Module['wasmBinaryFile'] || 'libjpegasm.wasm';
  var asmjsCodeFile = Module['asmjsCodeFile'] || 'libjpegasm.temp.asm.js';

  if (typeof Module['locateFile'] === 'function') {
    wasmTextFile = Module['locateFile'](wasmTextFile);
    wasmBinaryFile = Module['locateFile'](wasmBinaryFile);
    asmjsCodeFile = Module['locateFile'](asmjsCodeFile);
  }

  // utilities

  var wasmPageSize = 64*1024;

  var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
      return x % y;
    },
    "f64-to-int": function(x) {
      return x | 0;
    },
    "i32s-div": function(x, y) {
      return ((x | 0) / (y | 0)) | 0;
    },
    "i32u-div": function(x, y) {
      return ((x >>> 0) / (y >>> 0)) >>> 0;
    },
    "i32s-rem": function(x, y) {
      return ((x | 0) % (y | 0)) | 0;
    },
    "i32u-rem": function(x, y) {
      return ((x >>> 0) % (y >>> 0)) >>> 0;
    },
    "debugger": function() {
      debugger;
    },
  };

  var info = {
    'global': null,
    'env': null,
    'asm2wasm': asm2wasmImports,
    'parent': Module // Module inside wasm-js.cpp refers to wasm-js.cpp; this allows access to the outside program.
  };

  var exports = null;

  function lookupImport(mod, base) {
    var lookup = info;
    if (mod.indexOf('.') < 0) {
      lookup = (lookup || {})[mod];
    } else {
      var parts = mod.split('.');
      lookup = (lookup || {})[parts[0]];
      lookup = (lookup || {})[parts[1]];
    }
    if (base) {
      lookup = (lookup || {})[base];
    }
    if (lookup === undefined) {
      abort('bad lookupImport to (' + mod + ').' + base);
    }
    return lookup;
  }

  function mergeMemory(newBuffer) {
    // The wasm instance creates its memory. But static init code might have written to
    // buffer already, including the mem init file, and we must copy it over in a proper merge.
    // TODO: avoid this copy, by avoiding such static init writes
    // TODO: in shorter term, just copy up to the last static init write
    var oldBuffer = Module['buffer'];
    if (newBuffer.byteLength < oldBuffer.byteLength) {
      Module['printErr']('the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here');
    }
    var oldView = new Int8Array(oldBuffer);
    var newView = new Int8Array(newBuffer);

    // If we have a mem init file, do not trample it
    if (!memoryInitializer) {
      oldView.set(newView.subarray(Module['STATIC_BASE'], Module['STATIC_BASE'] + Module['STATIC_BUMP']), Module['STATIC_BASE']);
    }

    newView.set(oldView);
    updateGlobalBuffer(newBuffer);
    updateGlobalBufferViews();
  }

  var WasmTypes = {
    none: 0,
    i32: 1,
    i64: 2,
    f32: 3,
    f64: 4
  };

  function fixImports(imports) {
    if (!0) return imports;
    var ret = {};
    for (var i in imports) {
      var fixed = i;
      if (fixed[0] == '_') fixed = fixed.substr(1);
      ret[fixed] = imports[i];
    }
    return ret;
  }

  function getBinary() {
    try {
      var binary;
      if (Module['wasmBinary']) {
        binary = Module['wasmBinary'];
        binary = new Uint8Array(binary);
      } else if (Module['readBinary']) {
        binary = Module['readBinary'](wasmBinaryFile);
      } else {
        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
      }
      return binary;
    }
    catch (err) {
      abort(err);
    }
  }

  function getBinaryPromise() {
    // if we don't have the binary yet, and have the Fetch api, use that
    if (!Module['wasmBinary'] && typeof fetch === 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      });
    }
    // Otherwise, getBinary should be able to get it synchronously
    return new Promise(function(resolve, reject) {
      resolve(getBinary());
    });
  }

  // do-method functions

  function doJustAsm(global, env, providedBuffer) {
    // if no Module.asm, or it's the method handler helper (see below), then apply
    // the asmjs
    if (typeof Module['asm'] !== 'function' || Module['asm'] === methodHandler) {
      if (!Module['asmPreload']) {
        // you can load the .asm.js file before this, to avoid this sync xhr and eval
        eval(Module['read'](asmjsCodeFile)); // set Module.asm
      } else {
        Module['asm'] = Module['asmPreload'];
      }
    }
    if (typeof Module['asm'] !== 'function') {
      Module['printErr']('asm evalling did not set the module properly');
      return false;
    }
    return Module['asm'](global, env, providedBuffer);
  }

  function doNativeWasm(global, env, providedBuffer) {
    if (typeof WebAssembly !== 'object') {
      Module['printErr']('no native wasm support detected');
      return false;
    }
    // prepare memory import
    if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
      Module['printErr']('no native wasm Memory in use');
      return false;
    }
    env['memory'] = Module['wasmMemory'];
    // Load the wasm module and create an instance of using native support in the JS engine.
    info['global'] = {
      'NaN': NaN,
      'Infinity': Infinity
    };
    info['global.Math'] = global.Math;
    info['env'] = env;
    // handle a generated wasm instance, receiving its exports and
    // performing other necessary setup
    function receiveInstance(instance) {
      exports = instance.exports;
      if (exports.memory) mergeMemory(exports.memory);
      Module['asm'] = exports;
      Module["usingWasm"] = true;
      removeRunDependency('wasm-instantiate');
    }

    addRunDependency('wasm-instantiate'); // we can't run yet

    // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
    // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
    // to any other async startup actions they are performing.
    if (Module['instantiateWasm']) {
      try {
        return Module['instantiateWasm'](info, receiveInstance);
      } catch(e) {
        Module['printErr']('Module.instantiateWasm callback failed with error: ' + e);
        return false;
      }
    }

    getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info)
    }).then(function(output) {
      // receiveInstance() will swap in the exports (to Module.asm) so they can be called
      receiveInstance(output['instance']);
    }).catch(function(reason) {
      Module['printErr']('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
    return {}; // no exports yet; we'll fill them in later
  }

  function doWasmPolyfill(global, env, providedBuffer, method) {
    if (typeof WasmJS !== 'function') {
      Module['printErr']('WasmJS not detected - polyfill not bundled?');
      return false;
    }

    // Use wasm.js to polyfill and execute code in a wasm interpreter.
    var wasmJS = WasmJS({});

    // XXX don't be confused. Module here is in the outside program. wasmJS is the inner wasm-js.cpp.
    wasmJS['outside'] = Module; // Inside wasm-js.cpp, Module['outside'] reaches the outside module.

    // Information for the instance of the module.
    wasmJS['info'] = info;

    wasmJS['lookupImport'] = lookupImport;

    assert(providedBuffer === Module['buffer']); // we should not even need to pass it as a 3rd arg for wasm, but that's the asm.js way.

    info.global = global;
    info.env = env;

    // polyfill interpreter expects an ArrayBuffer
    assert(providedBuffer === Module['buffer']);
    env['memory'] = providedBuffer;
    assert(env['memory'] instanceof ArrayBuffer);

    wasmJS['providedTotalMemory'] = Module['buffer'].byteLength;

    // Prepare to generate wasm, using either asm2wasm or s-exprs
    var code;
    if (method === 'interpret-binary') {
      code = getBinary();
    } else {
      code = Module['read'](method == 'interpret-asm2wasm' ? asmjsCodeFile : wasmTextFile);
    }
    var temp;
    if (method == 'interpret-asm2wasm') {
      temp = wasmJS['_malloc'](code.length + 1);
      wasmJS['writeAsciiToMemory'](code, temp);
      wasmJS['_load_asm2wasm'](temp);
    } else if (method === 'interpret-s-expr') {
      temp = wasmJS['_malloc'](code.length + 1);
      wasmJS['writeAsciiToMemory'](code, temp);
      wasmJS['_load_s_expr2wasm'](temp);
    } else if (method === 'interpret-binary') {
      temp = wasmJS['_malloc'](code.length);
      wasmJS['HEAPU8'].set(code, temp);
      wasmJS['_load_binary2wasm'](temp, code.length);
    } else {
      throw 'what? ' + method;
    }
    wasmJS['_free'](temp);

    wasmJS['_instantiate'](temp);

    if (Module['newBuffer']) {
      mergeMemory(Module['newBuffer']);
      Module['newBuffer'] = null;
    }

    exports = wasmJS['asmExports'];

    return exports;
  }

  // We may have a preloaded value in Module.asm, save it
  Module['asmPreload'] = Module['asm'];

  // Memory growth integration code

  var asmjsReallocBuffer = Module['reallocBuffer'];

  var wasmReallocBuffer = function(size) {
    var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
    size = alignUp(size, PAGE_MULTIPLE); // round up to wasm page size
    var old = Module['buffer'];
    var oldSize = old.byteLength;
    if (Module["usingWasm"]) {
      // native wasm support
      try {
        var result = Module['wasmMemory'].grow((size - oldSize) / wasmPageSize); // .grow() takes a delta compared to the previous size
        if (result !== (-1 | 0)) {
          // success in native wasm memory growth, get the buffer from the memory
          return Module['buffer'] = Module['wasmMemory'].buffer;
        } else {
          return null;
        }
      } catch(e) {
        console.error('Module.reallocBuffer: Attempted to grow from ' + oldSize  + ' bytes to ' + size + ' bytes, but got error: ' + e);
        return null;
      }
    } else {
      // wasm interpreter support
      exports['__growWasmMemory']((size - oldSize) / wasmPageSize); // tiny wasm method that just does grow_memory
      // in interpreter, we replace Module.buffer if we allocate
      return Module['buffer'] !== old ? Module['buffer'] : null; // if it was reallocated, it changed
    }
  };

  Module['reallocBuffer'] = function(size) {
    if (finalMethod === 'asmjs') {
      return asmjsReallocBuffer(size);
    } else {
      return wasmReallocBuffer(size);
    }
  };

  // we may try more than one; this is the final one, that worked and we are using
  var finalMethod = '';

  // Provide an "asm.js function" for the application, called to "link" the asm.js module. We instantiate
  // the wasm module at that time, and it receives imports and provides exports and so forth, the app
  // doesn't need to care that it is wasm or olyfilled wasm or asm.js.

  Module['asm'] = function(global, env, providedBuffer) {
    global = fixImports(global);
    env = fixImports(env);

    // import table
    if (!env['table']) {
      var TABLE_SIZE = Module['wasmTableSize'];
      if (TABLE_SIZE === undefined) TABLE_SIZE = 1024; // works in binaryen interpreter at least
      var MAX_TABLE_SIZE = Module['wasmMaxTableSize'];
      if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
        if (MAX_TABLE_SIZE !== undefined) {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, 'maximum': MAX_TABLE_SIZE, 'element': 'anyfunc' });
        } else {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, element: 'anyfunc' });
        }
      } else {
        env['table'] = new Array(TABLE_SIZE); // works in binaryen interpreter at least
      }
      Module['wasmTable'] = env['table'];
    }

    if (!env['memoryBase']) {
      env['memoryBase'] = Module['STATIC_BASE']; // tell the memory segments where to place themselves
    }
    if (!env['tableBase']) {
      env['tableBase'] = 0; // table starts at 0 by default, in dynamic linking this will change
    }

    // try the methods. each should return the exports if it succeeded

    var exports;
    var methods = method.split(',');

    for (var i = 0; i < methods.length; i++) {
      var curr = methods[i];


      finalMethod = curr;

      if (curr === 'native-wasm') {
        if (exports = doNativeWasm(global, env, providedBuffer)) break;
      } else if (curr === 'asmjs') {
        if (exports = doJustAsm(global, env, providedBuffer)) break;
      } else if (curr === 'interpret-asm2wasm' || curr === 'interpret-s-expr' || curr === 'interpret-binary') {
        if (exports = doWasmPolyfill(global, env, providedBuffer, curr)) break;
      } else {
        abort('bad method: ' + curr);
      }
    }

    if (!exports) throw 'no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods';


    return exports;
  };

  var methodHandler = Module['asm']; // note our method handler, as we may modify Module['asm'] later
}

integrateWasmJS(Module);

// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = Runtime.GLOBAL_BASE;

STATICTOP = STATIC_BASE + 22352;
/* global initializers */  __ATINIT__.push({ func: function() { __GLOBAL__sub_I_api_cpp() } }, { func: function() { __GLOBAL__sub_I_bind_cpp() } });


memoryInitializer = Module["wasmJSMethod"].indexOf("asmjs") >= 0 || Module["wasmJSMethod"].indexOf("interpret-asm2wasm") >= 0 ? "libjpegasm.js.mem" : null;




var STATIC_BUMP = 22352;
Module["STATIC_BASE"] = STATIC_BASE;
Module["STATIC_BUMP"] = STATIC_BUMP;

/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  
  
  
  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }var embind_charCodes=undefined;function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
  
  
  var awaitingDependencies={};
  
  var registeredTypes={};
  
  var typeDependencies={};
  
  
  
  
  
  
  var char_0=48;
  
  var char_9=57;function makeLegalFunctionName(name) {
      if (undefined === name) {
          return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
          return '_' + name;
      } else {
          return name;
      }
    }function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;
  
          var stack = (new Error(message)).stack;
          if (stack !== undefined) {
              this.stack = this.toString() + '\n' +
                  stack.replace(/^Error(:[^\n]*)?\n/, '');
          }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
          if (this.message === undefined) {
              return this.name;
          } else {
              return this.name + ': ' + this.message;
          }
      };
  
      return errorClass;
    }var BindingError=undefined;function throwBindingError(message) {
      throw new BindingError(message);
    }
  
  
  
  var InternalError=undefined;function throwInternalError(message) {
      throw new InternalError(message);
    }function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach(function(dt, i) {
          if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
          } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                  awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                  typeConverters[i] = registeredTypes[dt];
                  ++registered;
                  if (registered === unregisteredTypes.length) {
                      onComplete(typeConverters);
                  }
              });
          }
      });
      if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
      }
    }function registerType(rawType, registeredInstance, options) {
      options = options || {};
  
      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
  
      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(function(cb) {
              cb();
          });
      }
    }function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        // A rethrown exception can reach refcount 0; it must not be discarded
        // Its next handler will clear the rethrown flag and addRef it, prior to
        // final decRef and destruction here
        if (info.refcount === 0 && !info.rethrown) {
          if (info.destructor) {
            Module['dynCall_vi'](info.destructor, ptr);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};
  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      throw ptr;
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((Runtime.setTempRet0(0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((Runtime.setTempRet0(0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((Runtime.setTempRet0(typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((Runtime.setTempRet0(throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0,
        caught: false,
        rethrown: false
      };
      EXCEPTIONS.last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr;
    }

   
  Module["_memset"] = _memset;

  
  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAPU32[pointer >> 2]);
    }function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              if (value instanceof ArrayBuffer) {
                  value = new Uint8Array(value);
              }
  
              function getTAElement(ta, index) {
                  return ta[index];
              }
              function getStringElement(string, index) {
                  return string.charCodeAt(index);
              }
              var getElement;
              if (value instanceof Uint8Array) {
                  getElement = getTAElement;
              } else if (value instanceof Uint8ClampedArray) {
                  getElement = getTAElement;
              } else if (value instanceof Int8Array) {
                  getElement = getTAElement;
              } else if (typeof value === 'string') {
                  getElement = getStringElement;
              } else {
                  throwBindingError('Cannot pass non-string to std::string');
              }
  
              // assumes 4-byte alignment
              var length = value.length;
              var ptr = _malloc(4 + length);
              HEAPU32[ptr >> 2] = length;
              for (var i = 0; i < length; ++i) {
                  var charCode = getElement(value, i);
                  if (charCode > 255) {
                      _free(ptr);
                      throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                  }
                  HEAPU8[ptr + 4 + i] = charCode;
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function ___cxa_free_exception(ptr) {
      try {
        return _free(ptr);
      } catch(e) { // XXX FIXME
        Module.printErr('exception during cxa_free_exception: ' + e);
      }
    }

  function ___lock() {}

  function ___unlock() {}

   
  Module["_saveSetjmp"] = _saveSetjmp;

  
  function _embind_repr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }
  
  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) { // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come out as 'i32 -1'. Always treat those as max u32.
          maxRange = 4294967295;
      }
  
      var shift = getShiftFromSize(size);
      
      var fromWireType = function(value) {
          return value;
      };
      
      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = function(value) {
              return (value << bitshift) >>> bitshift;
          };
      }
  
      var isUnsignedType = (name.indexOf('unsigned') != -1);
  
      registerType(primitiveType, {
          name: name,
          'fromWireType': fromWireType,
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following two if()s and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              if (value < minRange || value > maxRange) {
                  throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
              }
              return isUnsignedType ? (value >>> 0) : (value | 0);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  
  
  var emval_free_list=[];
  
  var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
          emval_handle_array[handle] = undefined;
          emval_free_list.push(handle);
      }
    }
  
  
  
  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              ++count;
          }
      }
      return count;
    }
  
  function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              return emval_handle_array[i];
          }
      }
      return null;
    }function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }function __emval_register(value) {
  
      switch(value){
        case undefined :{ return 1; }
        case null :{ return 2; }
        case true :{ return 3; }
        case false :{ return 4; }
        default:{
          var handle = emval_free_list.length ?
              emval_free_list.pop() :
              emval_handle_array.length;
  
          emval_handle_array[handle] = {refcount: 1, value: value};
          return handle;
          }
        }
    }function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(handle) {
              var rv = emval_handle_array[handle].value;
              __emval_decref(handle);
              return rv;
          },
          'toWireType': function(destructors, value) {
              return __emval_register(value);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: null, // This type does not need a destructor
  
          // TODO: do we need a deleteObject here?  write a test where
          // emval is passed into JS via an interface
      });
    }

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
   
  Module["_testSetjmp"] = _testSetjmp;function _longjmp(env, value) {
      Module['setThrew'](env, value || 1);
      throw 'longjmp';
    }

  
  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              return value;
          },
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following if() and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              return value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': floatReadValueFromPointer(name, shift),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  
  
  
  var _environ=STATICTOP; STATICTOP += 16;;var ___environ=_environ;function ___buildEnvironment(env) {
      // WARNING: Arbitrary limit!
      var MAX_ENV_VALUES = 64;
      var TOTAL_ENV_SIZE = 1024;
  
      // Statically allocate memory for the environment.
      var poolPtr;
      var envPtr;
      if (!___buildEnvironment.called) {
        ___buildEnvironment.called = true;
        // Set default values. Use string keys for Closure Compiler compatibility.
        ENV['USER'] = ENV['LOGNAME'] = 'web_user';
        ENV['PATH'] = '/';
        ENV['PWD'] = '/';
        ENV['HOME'] = '/home/web_user';
        ENV['LANG'] = 'C';
        ENV['_'] = Module['thisProgram'];
        // Allocate memory.
        poolPtr = allocate(TOTAL_ENV_SIZE, 'i8', ALLOC_STATIC);
        envPtr = allocate(MAX_ENV_VALUES * 4,
                          'i8*', ALLOC_STATIC);
        HEAP32[((envPtr)>>2)]=poolPtr;
        HEAP32[((_environ)>>2)]=envPtr;
      } else {
        envPtr = HEAP32[((_environ)>>2)];
        poolPtr = HEAP32[((envPtr)>>2)];
      }
  
      // Collect key=value lines.
      var strings = [];
      var totalSize = 0;
      for (var key in env) {
        if (typeof env[key] === 'string') {
          var line = key + '=' + env[key];
          strings.push(line);
          totalSize += line.length;
        }
      }
      if (totalSize > TOTAL_ENV_SIZE) {
        throw new Error('Environment size exceeded TOTAL_ENV_SIZE!');
      }
  
      // Make new.
      var ptrSize = 4;
      for (var i = 0; i < strings.length; i++) {
        var line = strings[i];
        writeAsciiToMemory(line, poolPtr);
        HEAP32[(((envPtr)+(i * ptrSize))>>2)]=poolPtr;
        poolPtr += line.length + 1;
      }
      HEAP32[(((envPtr)+(strings.length * ptrSize))>>2)]=0;
    }var ENV={};function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = Pointer_stringify(name);
      if (!ENV.hasOwnProperty(name)) return 0;
  
      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocate(intArrayFromString(ENV[name]), 'i8', ALLOC_NORMAL);
      return _getenv.ret;
    }

  
  
  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
          throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }
  
      /*
       * Previously, the following line was just:
  
       function dummy() {};
  
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even though at creation, the 'dummy' has the
       * correct constructor name.  Thus, objects created with IMVU.new would show up in the debugger as 'dummy', which
       * isn't very helpful.  Using IMVU.createNamedFunction addresses the issue.  Doublely-unfortunately, there's no way
       * to write a test for this behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }
  
  function runDestructors(destructors) {
      while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
      }
    }function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
      var argsList = "";
      var argsListWired = "";
      for(var i = 0; i < argCount - 2; ++i) {
          argsList += (i!==0?", ":"")+"arg"+i;
          argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";
  
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;
  
      for(var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
          if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
              needsDestructorStack = true;
              break;
          }
      }
  
      if (needsDestructorStack) {
          invokerFnBody +=
              "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
  
  
      if (isClassMethodFunc) {
          invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }
  
      for(var i = 0; i < argCount - 2; ++i) {
          invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
          args1.push("argType"+i);
          args2.push(argTypes[i+2]);
      }
  
      if (isClassMethodFunc) {
          argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      var returns = (argTypes[0].name !== "void");
  
      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      if (needsDestructorStack) {
          invokerFnBody += "runDestructors(destructors);\n";
      } else {
          for(var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
              var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
              if (argTypes[i].destructorFunction !== null) {
                  invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
                  args1.push(paramName+"_dtor");
                  args2.push(argTypes[i].destructorFunction);
              }
          }
      }
  
      if (returns) {
          invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                           "return ret;\n";
      } else {
      }
      invokerFnBody += "}\n";
  
      args1.push(invokerFnBody);
  
      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }
  
  
  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
          proto[methodName] = function() {
              // TODO This check can be removed in -O3 level "unsafe" optimizations.
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                  throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
          };
          // Move the previous function into the overload table.
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
          if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
              throwBindingError("Cannot register public name '" + name + "' twice");
          }
  
          // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
          // that routes between the two.
          ensureOverloadTable(Module, name, name);
          if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
          }
          // Add the new function into the overload table.
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          if (undefined !== numArguments) {
              Module[name].numArguments = numArguments;
          }
      }
    }
  
  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          array.push(HEAP32[(firstElement >> 2) + i]);
      }
      return array;
    }
  
  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
          throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          Module[name].argCount = numArguments;
      }
    }
  
  function requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
  
      function makeDynCaller(dynCall) {
          var args = [];
          for (var i = 1; i < signature.length; ++i) {
              args.push('a' + i);
          }
  
          var name = 'dynCall_' + signature + '_' + rawFunction;
          var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
          body    += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
          body    += '};\n';
  
          return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
      }
  
      var fp;
      if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
          fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
      } else if (typeof FUNCTION_TABLE !== "undefined") {
          fp = FUNCTION_TABLE[rawFunction];
      } else {
          // asm.js does not give direct access to the function tables,
          // and thus we must go through the dynCall interface which allows
          // calling into a signature's function table by pointer value.
          //
          // https://github.com/dherman/asm.js/issues/83
          //
          // This has three main penalties:
          // - dynCall is another function call in the path from JavaScript to C++.
          // - JITs may not predict through the function table indirection at runtime.
          var dc = Module["asm"]['dynCall_' + signature];
          if (dc === undefined) {
              // We will always enter this branch if the signature
              // contains 'f' and PRECISE_F32 is not enabled.
              //
              // Try again, replacing 'f' with 'd'.
              dc = Module["asm"]['dynCall_' + signature.replace(/f/g, 'd')];
              if (dc === undefined) {
                  throwBindingError("No dynCall invoker for signature: " + signature);
              }
          }
          fp = makeDynCaller(dc);
      }
  
      if (typeof fp !== "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
  
  
  var UnboundTypeError=undefined;
  
  function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
          if (seen[type]) {
              return;
          }
          if (registeredTypes[type]) {
              return;
          }
          if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
          }
          unboundTypes.push(type);
          seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name = readLatin1String(name);
      
      rawInvoker = requireFunction(signature, rawInvoker);
  
      exposePublicSymbol(name, function() {
          throwUnboundTypeError('Cannot call ' + name + ' due to unbound types', argTypes);
      }, argCount - 1);
  
      whenDependentTypesAreResolved([], argTypes, function(argTypes) {
          var invokerArgsArray = [argTypes[0] /* return value */, null /* no class 'this'*/].concat(argTypes.slice(1) /* actual params */);
          replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null /* no class 'this'*/, rawInvoker, fn), argCount - 1);
          return [];
      });
    }

  function ___cxa_find_matching_catch_2() {
          return ___cxa_find_matching_catch.apply(null, arguments);
        }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    } 
  Module["_sbrk"] = _sbrk;

  var _llvm_pow_f32=Math_pow;

  function __embind_register_std_wstring(rawType, charSize, name) {
      // nb. do not cache HEAPU16 and HEAPU32, they may be destroyed by enlargeMemory().
      name = readLatin1String(name);
      var getHeap, shift;
      if (charSize === 2) {
          getHeap = function() { return HEAPU16; };
          shift = 1;
      } else if (charSize === 4) {
          getHeap = function() { return HEAPU32; };
          shift = 2;
      }
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var HEAP = getHeap();
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              var start = (value + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAP[start + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              // assumes 4-byte alignment
              var HEAP = getHeap();
              var length = value.length;
              var ptr = _malloc(4 + length * charSize);
              HEAPU32[ptr >> 2] = length;
              var start = (ptr + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  HEAP[start + i] = value.charCodeAt(i);
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }


  function ___gxx_personality_v0() {
    }

   
  Module["_llvm_bswap_i32"] = _llvm_bswap_i32;

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
          handle = handle >> 2;
          var heap = HEAPU32;
          var size = heap[handle]; // in elements
          var data = heap[handle + 1]; // byte offset into emscripten heap
          return new TA(heap['buffer'], data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': decodeMemoryView,
          'argPackAdvance': 8,
          'readValueFromPointer': decodeMemoryView,
      }, {
          ignoreDuplicateRegistrations: true,
      });
    }


  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
embind_init_charCodes();
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');;
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');;
init_emval();;
___buildEnvironment(ENV);;
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
/* flush anything remaining in the buffer during shutdown */ __ATEXIT__.push(function() { var fflush = Module["_fflush"]; if (fflush) fflush(0); var printChar = ___syscall146.printChar; if (!printChar) return; var buffers = ___syscall146.buffers; if (buffers[1].length) printChar(1, 10); if (buffers[2].length) printChar(2, 10); });;
DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);

STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");


function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vii(x) { Module["printErr"]("Invalid function pointer called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiiiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiiiiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiiiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_v(x) { Module["printErr"]("Invalid function pointer called with signature 'v'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_ff(x) { Module["printErr"]("Invalid function pointer called with signature 'ff'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiiiiiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiiiiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_fff(x) { Module["printErr"]("Invalid function pointer called with signature 'fff'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

Module['wasmTableSize'] = 7009;

Module['wasmMaxTableSize'] = 7009;

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  try {
    return Module["dynCall_iiiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10) {
  try {
    return Module["dynCall_iiiiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_ff(index,a1) {
  try {
    return Module["dynCall_ff"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11) {
  try {
    return Module["dynCall_iiiiiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_fff(index,a1,a2) {
  try {
    return Module["dynCall_fff"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity, "byteLength": byteLength };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "abortStackOverflow": abortStackOverflow, "nullFunc_vi": nullFunc_vi, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vii": nullFunc_vii, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_viiiiiii": nullFunc_viiiiiii, "nullFunc_viiiii": nullFunc_viiiii, "nullFunc_iiiiiiiiii": nullFunc_iiiiiiiiii, "nullFunc_iiiiiiiiiii": nullFunc_iiiiiiiiiii, "nullFunc_v": nullFunc_v, "nullFunc_iiiiiii": nullFunc_iiiiiii, "nullFunc_ii": nullFunc_ii, "nullFunc_viii": nullFunc_viii, "nullFunc_ff": nullFunc_ff, "nullFunc_iiiiiiiiiiii": nullFunc_iiiiiiiiiiii, "nullFunc_fff": nullFunc_fff, "nullFunc_viiiiii": nullFunc_viiiiii, "nullFunc_iii": nullFunc_iii, "nullFunc_iiiiii": nullFunc_iiiiii, "nullFunc_viiii": nullFunc_viiii, "invoke_vi": invoke_vi, "invoke_iiii": invoke_iiii, "invoke_vii": invoke_vii, "invoke_iiiii": invoke_iiiii, "invoke_viiiiiii": invoke_viiiiiii, "invoke_viiiii": invoke_viiiii, "invoke_iiiiiiiiii": invoke_iiiiiiiiii, "invoke_iiiiiiiiiii": invoke_iiiiiiiiiii, "invoke_v": invoke_v, "invoke_iiiiiii": invoke_iiiiiii, "invoke_ii": invoke_ii, "invoke_viii": invoke_viii, "invoke_ff": invoke_ff, "invoke_iiiiiiiiiiii": invoke_iiiiiiiiiiii, "invoke_fff": invoke_fff, "invoke_viiiiii": invoke_viiiiii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_viiii": invoke_viiii, "floatReadValueFromPointer": floatReadValueFromPointer, "simpleReadValueFromPointer": simpleReadValueFromPointer, "___syscall54": ___syscall54, "__embind_register_memory_view": __embind_register_memory_view, "throwInternalError": throwInternalError, "get_first_emval": get_first_emval, "___gxx_personality_v0": ___gxx_personality_v0, "extendError": extendError, "___assert_fail": ___assert_fail, "___cxa_free_exception": ___cxa_free_exception, "___cxa_find_matching_catch_2": ___cxa_find_matching_catch_2, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "___buildEnvironment": ___buildEnvironment, "_longjmp": _longjmp, "getShiftFromSize": getShiftFromSize, "__embind_register_function": __embind_register_function, "embind_init_charCodes": embind_init_charCodes, "requireFunction": requireFunction, "___setErrNo": ___setErrNo, "__emval_register": __emval_register, "_llvm_pow_f32": _llvm_pow_f32, "__embind_register_void": __embind_register_void, "_emscripten_memcpy_big": _emscripten_memcpy_big, "__embind_register_bool": __embind_register_bool, "___resumeException": ___resumeException, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "__exit": __exit, "getTypeName": getTypeName, "__embind_register_std_wstring": __embind_register_std_wstring, "createNamedFunction": createNamedFunction, "__embind_register_emval": __embind_register_emval, "readLatin1String": readLatin1String, "throwUnboundTypeError": throwUnboundTypeError, "craftInvokerFunction": craftInvokerFunction, "__embind_register_integer": __embind_register_integer, "__emval_decref": __emval_decref, "_getenv": _getenv, "__embind_register_float": __embind_register_float, "makeLegalFunctionName": makeLegalFunctionName, "integerReadValueFromPointer": integerReadValueFromPointer, "___unlock": ___unlock, "heap32VectorToArray": heap32VectorToArray, "init_emval": init_emval, "whenDependentTypesAreResolved": whenDependentTypesAreResolved, "new_": new_, "registerType": registerType, "___cxa_throw": ___cxa_throw, "___lock": ___lock, "___syscall6": ___syscall6, "throwBindingError": throwBindingError, "ensureOverloadTable": ensureOverloadTable, "count_emval_handles": count_emval_handles, "___cxa_allocate_exception": ___cxa_allocate_exception, "runDestructors": runDestructors, "_embind_repr": _embind_repr, "___syscall140": ___syscall140, "exposePublicSymbol": exposePublicSymbol, "_exit": _exit, "__embind_register_std_string": __embind_register_std_string, "replacePublicSymbol": replacePublicSymbol, "___syscall146": ___syscall146, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX };
// EMSCRIPTEN_START_ASM
var asm =Module["asm"]// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var real_stackSave = asm["stackSave"]; asm["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackSave.apply(null, arguments);
};

var real_setThrew = asm["setThrew"]; asm["setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setThrew.apply(null, arguments);
};

var real__fflush = asm["_fflush"]; asm["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fflush.apply(null, arguments);
};

var real__encode_jpeg = asm["_encode_jpeg"]; asm["_encode_jpeg"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__encode_jpeg.apply(null, arguments);
};

var real____cxa_is_pointer_type = asm["___cxa_is_pointer_type"]; asm["___cxa_is_pointer_type"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____cxa_is_pointer_type.apply(null, arguments);
};

var real__sbrk = asm["_sbrk"]; asm["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sbrk.apply(null, arguments);
};

var real__llvm_bswap_i32 = asm["_llvm_bswap_i32"]; asm["_llvm_bswap_i32"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__llvm_bswap_i32.apply(null, arguments);
};

var real__decode_jpeg = asm["_decode_jpeg"]; asm["_decode_jpeg"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__decode_jpeg.apply(null, arguments);
};

var real_stackAlloc = asm["stackAlloc"]; asm["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackAlloc.apply(null, arguments);
};

var real___GLOBAL__sub_I_api_cpp = asm["__GLOBAL__sub_I_api_cpp"]; asm["__GLOBAL__sub_I_api_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___GLOBAL__sub_I_api_cpp.apply(null, arguments);
};

var real_getTempRet0 = asm["getTempRet0"]; asm["getTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_getTempRet0.apply(null, arguments);
};

var real___GLOBAL__sub_I_bind_cpp = asm["__GLOBAL__sub_I_bind_cpp"]; asm["__GLOBAL__sub_I_bind_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___GLOBAL__sub_I_bind_cpp.apply(null, arguments);
};

var real_setTempRet0 = asm["setTempRet0"]; asm["setTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setTempRet0.apply(null, arguments);
};

var real__realloc = asm["_realloc"]; asm["_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__realloc.apply(null, arguments);
};

var real__saveSetjmp = asm["_saveSetjmp"]; asm["_saveSetjmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__saveSetjmp.apply(null, arguments);
};

var real__emscripten_get_global_libc = asm["_emscripten_get_global_libc"]; asm["_emscripten_get_global_libc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__emscripten_get_global_libc.apply(null, arguments);
};

var real____getTypeName = asm["___getTypeName"]; asm["___getTypeName"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____getTypeName.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____errno_location.apply(null, arguments);
};

var real__testSetjmp = asm["_testSetjmp"]; asm["_testSetjmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__testSetjmp.apply(null, arguments);
};

var real____cxa_can_catch = asm["___cxa_can_catch"]; asm["___cxa_can_catch"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____cxa_can_catch.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__free.apply(null, arguments);
};

var real_establishStackSpace = asm["establishStackSpace"]; asm["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_establishStackSpace.apply(null, arguments);
};

var real_stackRestore = asm["stackRestore"]; asm["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackRestore.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__malloc.apply(null, arguments);
};
Module["asm"] = asm;
var stackSave = Module["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackSave"].apply(null, arguments) };
var setThrew = Module["setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["setThrew"].apply(null, arguments) };
var _fflush = Module["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_fflush"].apply(null, arguments) };
var _encode_jpeg = Module["_encode_jpeg"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_encode_jpeg"].apply(null, arguments) };
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___cxa_is_pointer_type"].apply(null, arguments) };
var _memset = Module["_memset"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memset"].apply(null, arguments) };
var _sbrk = Module["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_sbrk"].apply(null, arguments) };
var _memcpy = Module["_memcpy"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_memcpy"].apply(null, arguments) };
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_llvm_bswap_i32"].apply(null, arguments) };
var _decode_jpeg = Module["_decode_jpeg"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_decode_jpeg"].apply(null, arguments) };
var stackAlloc = Module["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackAlloc"].apply(null, arguments) };
var __GLOBAL__sub_I_api_cpp = Module["__GLOBAL__sub_I_api_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__GLOBAL__sub_I_api_cpp"].apply(null, arguments) };
var getTempRet0 = Module["getTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["getTempRet0"].apply(null, arguments) };
var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["__GLOBAL__sub_I_bind_cpp"].apply(null, arguments) };
var setTempRet0 = Module["setTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["setTempRet0"].apply(null, arguments) };
var _realloc = Module["_realloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_realloc"].apply(null, arguments) };
var _saveSetjmp = Module["_saveSetjmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_saveSetjmp"].apply(null, arguments) };
var _emscripten_get_global_libc = Module["_emscripten_get_global_libc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_emscripten_get_global_libc"].apply(null, arguments) };
var ___getTypeName = Module["___getTypeName"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___getTypeName"].apply(null, arguments) };
var ___errno_location = Module["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___errno_location"].apply(null, arguments) };
var _testSetjmp = Module["_testSetjmp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_testSetjmp"].apply(null, arguments) };
var ___cxa_can_catch = Module["___cxa_can_catch"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["___cxa_can_catch"].apply(null, arguments) };
var _free = Module["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_free"].apply(null, arguments) };
var runPostSets = Module["runPostSets"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["runPostSets"].apply(null, arguments) };
var establishStackSpace = Module["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["establishStackSpace"].apply(null, arguments) };
var stackRestore = Module["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["stackRestore"].apply(null, arguments) };
var _malloc = Module["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_malloc"].apply(null, arguments) };
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["_emscripten_replace_memory"].apply(null, arguments) };
var dynCall_vi = Module["dynCall_vi"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_vi"].apply(null, arguments) };
var dynCall_iiii = Module["dynCall_iiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiii"].apply(null, arguments) };
var dynCall_vii = Module["dynCall_vii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_vii"].apply(null, arguments) };
var dynCall_iiiii = Module["dynCall_iiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiii"].apply(null, arguments) };
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiiiiii"].apply(null, arguments) };
var dynCall_viiiii = Module["dynCall_viiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiiii"].apply(null, arguments) };
var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiiiiiiii"].apply(null, arguments) };
var dynCall_iiiiiiiiiii = Module["dynCall_iiiiiiiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiiiiiiiii"].apply(null, arguments) };
var dynCall_v = Module["dynCall_v"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_v"].apply(null, arguments) };
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiiiii"].apply(null, arguments) };
var dynCall_ii = Module["dynCall_ii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_ii"].apply(null, arguments) };
var dynCall_viii = Module["dynCall_viii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viii"].apply(null, arguments) };
var dynCall_ff = Module["dynCall_ff"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_ff"].apply(null, arguments) };
var dynCall_iiiiiiiiiiii = Module["dynCall_iiiiiiiiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiiiiiiiiii"].apply(null, arguments) };
var dynCall_fff = Module["dynCall_fff"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_fff"].apply(null, arguments) };
var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiiiii"].apply(null, arguments) };
var dynCall_iii = Module["dynCall_iii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iii"].apply(null, arguments) };
var dynCall_iiiiii = Module["dynCall_iiiiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_iiiiii"].apply(null, arguments) };
var dynCall_viiii = Module["dynCall_viiii"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return Module["asm"]["dynCall_viiii"].apply(null, arguments) };
;
Runtime.stackAlloc = Module['stackAlloc'];
Runtime.stackSave = Module['stackSave'];
Runtime.stackRestore = Module['stackRestore'];
Runtime.establishStackSpace = Module['establishStackSpace'];
Runtime.setTempRet0 = Module['setTempRet0'];
Runtime.getTempRet0 = Module['getTempRet0'];


// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;



if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, Runtime.GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[Runtime.GLOBAL_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
      // Delete the typed array that contains the large blob of the memory initializer request response so that
      // we won't keep unnecessary memory lying around. However, keep the XHR object itself alive so that e.g.
      // its .status field can still be accessed later.
      if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    if (Module['memoryInitializerRequest']) {
      // a network request has already been created, just use that
      function useRequest() {
        var request = Module['memoryInitializerRequest'];
        if (request.status !== 200 && request.status !== 0) {
          // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
          // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
          // Look in your browser's devtools network console to see what's going on.
          console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
          doBrowserLoad();
          return;
        }
        applyMemoryInitializer(request.response);
      }
      if (Module['memoryInitializerRequest'].response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        Module['memoryInitializerRequest'].addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}



/**
 * @constructor
 * @extends {Error}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack];
      }
      Module.printErr('exception thrown: ' + toLog);
      Module['quit'](1, e);
    }
  } finally {
    calledMain = true;
  }
}




/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  }
  Module['quit'](status, new ExitStatus(status));
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}




}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/build/libjpegasm.js","/build")

},{"_process":9,"buffer":5,"fs":4,"path":8}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Module = require('../build/libjpegasm');
var Runtime = Module['Runtime'];

module.exports.encode = encodeJpeg;
module.exports.decode = decodeJpeg;
module.exports.resize = resize;

/* see 'api.h' for declarations */
var encode_jpeg = Module.cwrap('encode_jpeg', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
var decode_jpeg = Module.cwrap('decode_jpeg', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);

var SIZE_OF_POINTER = 4;


/**
 * Encodes RGB data as JPEG.
 *
 * @param rgbArray ArrayBuffer - An array or RGB triplets.
 * @param rgbWidth Width of RGB image, pixels.
 * @param rgbHeight Height of RGB image, pixels.
 * @param quality A quality, [0 - 100]
 * @return An ArrayBuffer with the encoded data
 * Throws an 'Error' in case of any error condition.
 */
function encodeJpeg(rgbArray, rgbWidth, rgbHeight, quality) {
  var stack = Runtime.stackSave();

  var rgbBufferPtr = Module._malloc(rgbArray.byteLength);
  Module.HEAPU8.set(new Uint8Array(rgbArray), rgbBufferPtr);

  var outBufferPtrPtr = Runtime.stackAlloc(SIZE_OF_POINTER);
  var outBufferSizePtr = Runtime.stackAlloc(SIZE_OF_POINTER);
  var outMsgPtrPtr = Runtime.stackAlloc(SIZE_OF_POINTER);

  Module.setValue(outBufferPtrPtr, 0, 'i32');
  Module.setValue(outBufferSizePtr, 0, 'i32');
  Module.setValue(outMsgPtrPtr, 0, 'i32');

  // invoke
  var result = encode_jpeg(rgbBufferPtr, rgbWidth, rgbHeight, quality, outBufferPtrPtr, outBufferSizePtr, outMsgPtrPtr);

  var outBufferPtr = Module.getValue(outBufferPtrPtr, 'i32');
  var outBufferSize = Module.getValue(outBufferSizePtr, 'i32');
  var outMsgPtr = Module.getValue(outMsgPtrPtr, 'i32');

  var err;
  var encoded;

  if(!result) {
    var jpegBuffer = new Uint8Array(Module.HEAPU8.buffer, outBufferPtr, outBufferSize);
    encoded = new ArrayBuffer(outBufferSize);
    new Uint8Array(encoded).set(jpegBuffer);
  } else {
    err = new Error(Module.Pointer_stringify(outMsgPtr));
  }

  Module._free(rgbBufferPtr);
  Module._free(outBufferPtr);
  Module._free(outMsgPtr);

  Runtime.stackRestore(stack);

  if(err) {
    throw err;
  }

  return encoded;
}

/**
 * Decodes JPEG
 * @param jpegArray An ArrayBuffer with JPEG data.
 * @return An object: { buffer: ArrayBuffer, width: number, height: number }.
 * Throws an Error in case of any error condition.
 */
function decodeJpeg(jpegArray) {
  var stack = Runtime.stackSave();

  var jpegBufferPtr = Module._malloc(jpegArray.byteLength);
  Module.HEAPU8.set(new Uint8Array(jpegArray), jpegBufferPtr);  

  var outBufferPtrPtr = Runtime.stackAlloc(SIZE_OF_POINTER);
  var outBufferWidthPtr = Runtime.stackAlloc(SIZE_OF_POINTER);
  var outBufferHeightPtr = Runtime.stackAlloc(SIZE_OF_POINTER);
  var outMsgPtrPtr = Runtime.stackAlloc(SIZE_OF_POINTER);

  Module.setValue(outBufferPtrPtr, 0, 'i32');
  Module.setValue(outBufferWidthPtr, 0, 'i32');
  Module.setValue(outBufferHeightPtr, 0, 'i32');
  Module.setValue(outMsgPtrPtr, 0, 'i32');

  var result = decode_jpeg(jpegBufferPtr, jpegArray.byteLength, outBufferPtrPtr, outBufferWidthPtr, outBufferHeightPtr, outMsgPtrPtr);

  var outBufferPtr = Module.getValue(outBufferPtrPtr, 'i32');
  var outBufferWidth = Module.getValue(outBufferWidthPtr, 'i32');
  var outBufferHeight = Module.getValue(outBufferHeightPtr, 'i32');
  var outMsgPtr = Module.getValue(outMsgPtrPtr, 'i32');

  var err;
  var decoded;

  if(!result) {
    var outBufferSize = outBufferWidth * outBufferHeight * 3;
    var rgbBuffer = new Uint8Array(Module.HEAPU8.buffer, outBufferPtr, outBufferSize);
    decoded = new ArrayBuffer(outBufferSize);
    new Uint8Array(decoded).set(rgbBuffer);
  } else {
    err = new Error(Module.Pointer_stringify(outMsgPtr));
  }

  Module._free(jpegBufferPtr);
  Module._free(outBufferPtr);
  Module._free(outMsgPtr);

  Runtime.stackRestore(stack);

  if(err) {
    throw err;
  }

  return {
    buffer: decoded,
    width: outBufferWidth,
    height: outBufferHeight
  };
}

/**
 * Resamples RGP array of image
 *
 * @param{ArrayBuffer} rgbArray - An array or RGB (3 channels)
 * triplets, pixel are represented by [R1, G1, B1, R2, G2, B2, ...]
 * @param{Number} fromWidth Width of RGB image, pixels.
 * @param{Number} fromHeight Height of RGB image, pixels.
 * @param{Number} toWidth Desired width of RGB image, pixels.
 * @param{Number} toHeight Desired height of RGB image, pixels.
 * @param{String} algorithm to use. Supported values: "box", "mitchell". Default: mitchell
 * @return An ArrayBuffer with recoded data in dimensions toWidth x toHeight
 * Throws an 'Error' in case of any error condition.
 */

const Filter = {
    box: 1,
    triangle: 2,
    cubicspline: 3,
    catmullrom: 4,
    mitchell: 5,
    lanczos3: 6,
};

function resize(rgbArray, fromWidth, fromHeight, toWidth, toHeight, algorithm = "mitchell") {
    var stack = Runtime.stackSave();

    var numChannels = 3;
    var outBufferSize = toWidth * toHeight  * numChannels; // each pixel = num channels bytes
    var outBufferPtr = Module._malloc(outBufferSize);

    var strideInBytes = 0;
    var result;
    if (!Filter[algorithm])
        throw new Error("Algorithm " + algorithm + " is not implemented");
    result = Module.stbir_resize_uint8_generic(rgbArray, fromWidth, fromHeight, strideInBytes,
        outBufferPtr, toWidth, toHeight, strideInBytes, numChannels, Filter[algorithm]);
    var err;
    var encoded;

    if(result === 1) {
        var jpegBuffer = new Uint8Array(Module.HEAPU8.buffer, outBufferPtr, outBufferSize);
        encoded = new ArrayBuffer(outBufferSize);
        new Uint8Array(encoded).set(jpegBuffer);
    } else if (result === 0){
        err = new Error('resize failed. Details are unknown');
    } else {
        err = new Error('resize returned unknown return code=' + result);
    }

    Module._free(outBufferPtr);

    Runtime.stackRestore(stack);

    if(err) {
        throw err;
    }

    return encoded;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/lib/api.js","/lib")

},{"../build/libjpegasm":1,"_process":9,"buffer":5}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/base64-js/lib/b64.js","/node_modules/base64-js/lib")

},{"_process":9,"buffer":5}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/browserify/lib/_empty.js","/node_modules/browserify/lib")

},{"_process":9,"buffer":5}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/buffer/index.js","/node_modules/buffer")

},{"_process":9,"base64-js":3,"buffer":5,"ieee754":6,"isarray":7}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/ieee754/index.js","/node_modules/ieee754")

},{"_process":9,"buffer":5}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/isarray/index.js","/node_modules/isarray")

},{"_process":9,"buffer":5}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/path-browserify/index.js","/node_modules/path-browserify")

},{"_process":9,"buffer":5}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/process/browser.js","/node_modules/process")

},{"_process":9,"buffer":5}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9saWJqcGVnYXNtLmpzIiwibGliL2FwaS5qcyIsIm5vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCJub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeGtJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBOzs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1Z0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBNb2R1bGUgPSB7XHJcbiAgICB3YXNtQmluYXJ5RmlsZTogJ2J1aWxkL2xpYmpwZWdhc20ud2FzbSdcclxufTtcbi8vIFRoZSBNb2R1bGUgb2JqZWN0OiBPdXIgaW50ZXJmYWNlIHRvIHRoZSBvdXRzaWRlIHdvcmxkLiBXZSBpbXBvcnRcbi8vIGFuZCBleHBvcnQgdmFsdWVzIG9uIGl0LCBhbmQgZG8gdGhlIHdvcmsgdG8gZ2V0IHRoYXQgdGhyb3VnaFxuLy8gY2xvc3VyZSBjb21waWxlciBpZiBuZWNlc3NhcnkuIFRoZXJlIGFyZSB2YXJpb3VzIHdheXMgTW9kdWxlIGNhbiBiZSB1c2VkOlxuLy8gMS4gTm90IGRlZmluZWQuIFdlIGNyZWF0ZSBpdCBoZXJlXG4vLyAyLiBBIGZ1bmN0aW9uIHBhcmFtZXRlciwgZnVuY3Rpb24oTW9kdWxlKSB7IC4uZ2VuZXJhdGVkIGNvZGUuLiB9XG4vLyAzLiBwcmUtcnVuIGFwcGVuZGVkIGl0LCB2YXIgTW9kdWxlID0ge307IC4uZ2VuZXJhdGVkIGNvZGUuLlxuLy8gNC4gRXh0ZXJuYWwgc2NyaXB0IHRhZyBkZWZpbmVzIHZhciBNb2R1bGUuXG4vLyBXZSBuZWVkIHRvIGRvIGFuIGV2YWwgaW4gb3JkZXIgdG8gaGFuZGxlIHRoZSBjbG9zdXJlIGNvbXBpbGVyXG4vLyBjYXNlLCB3aGVyZSB0aGlzIGNvZGUgaGVyZSBpcyBtaW5pZmllZCBidXQgTW9kdWxlIHdhcyBkZWZpbmVkXG4vLyBlbHNld2hlcmUgKGUuZy4gY2FzZSA0IGFib3ZlKS4gV2UgYWxzbyBuZWVkIHRvIGNoZWNrIGlmIE1vZHVsZVxuLy8gYWxyZWFkeSBleGlzdHMgKGUuZy4gY2FzZSAzIGFib3ZlKS5cbi8vIE5vdGUgdGhhdCBpZiB5b3Ugd2FudCB0byBydW4gY2xvc3VyZSwgYW5kIGFsc28gdG8gdXNlIE1vZHVsZVxuLy8gYWZ0ZXIgdGhlIGdlbmVyYXRlZCBjb2RlLCB5b3Ugd2lsbCBuZWVkIHRvIGRlZmluZSAgIHZhciBNb2R1bGUgPSB7fTtcbi8vIGJlZm9yZSB0aGUgY29kZS4gVGhlbiB0aGF0IG9iamVjdCB3aWxsIGJlIHVzZWQgaW4gdGhlIGNvZGUsIGFuZCB5b3Vcbi8vIGNhbiBjb250aW51ZSB0byB1c2UgTW9kdWxlIGFmdGVyd2FyZHMgYXMgd2VsbC5cbnZhciBNb2R1bGU7XG5pZiAoIU1vZHVsZSkgTW9kdWxlID0gKHR5cGVvZiBNb2R1bGUgIT09ICd1bmRlZmluZWQnID8gTW9kdWxlIDogbnVsbCkgfHwge307XG5cbi8vIFNvbWV0aW1lcyBhbiBleGlzdGluZyBNb2R1bGUgb2JqZWN0IGV4aXN0cyB3aXRoIHByb3BlcnRpZXNcbi8vIG1lYW50IHRvIG92ZXJ3cml0ZSB0aGUgZGVmYXVsdCBtb2R1bGUgZnVuY3Rpb25hbGl0eS4gSGVyZVxuLy8gd2UgY29sbGVjdCB0aG9zZSBwcm9wZXJ0aWVzIGFuZCByZWFwcGx5IF9hZnRlcl8gd2UgY29uZmlndXJlXG4vLyB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGRlZmF1bHRzIHRvIGF2b2lkIGhhdmluZyB0byBiZSBzb1xuLy8gZGVmZW5zaXZlIGR1cmluZyBpbml0aWFsaXphdGlvbi5cbnZhciBtb2R1bGVPdmVycmlkZXMgPSB7fTtcbmZvciAodmFyIGtleSBpbiBNb2R1bGUpIHtcbiAgaWYgKE1vZHVsZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgbW9kdWxlT3ZlcnJpZGVzW2tleV0gPSBNb2R1bGVba2V5XTtcbiAgfVxufVxuXG4vLyBUaGUgZW52aXJvbm1lbnQgc2V0dXAgY29kZSBiZWxvdyBpcyBjdXN0b21pemVkIHRvIHVzZSBNb2R1bGUuXG4vLyAqKiogRW52aXJvbm1lbnQgc2V0dXAgY29kZSAqKipcbnZhciBFTlZJUk9OTUVOVF9JU19XRUIgPSBmYWxzZTtcbnZhciBFTlZJUk9OTUVOVF9JU19XT1JLRVIgPSBmYWxzZTtcbnZhciBFTlZJUk9OTUVOVF9JU19OT0RFID0gZmFsc2U7XG52YXIgRU5WSVJPTk1FTlRfSVNfU0hFTEwgPSBmYWxzZTtcblxuLy8gVGhyZWUgY29uZmlndXJhdGlvbnMgd2UgY2FuIGJlIHJ1bm5pbmcgaW46XG4vLyAxKSBXZSBjb3VsZCBiZSB0aGUgYXBwbGljYXRpb24gbWFpbigpIHRocmVhZCBydW5uaW5nIGluIHRoZSBtYWluIEpTIFVJIHRocmVhZC4gKEVOVklST05NRU5UX0lTX1dPUktFUiA9PSBmYWxzZSBhbmQgRU5WSVJPTk1FTlRfSVNfUFRIUkVBRCA9PSBmYWxzZSlcbi8vIDIpIFdlIGNvdWxkIGJlIHRoZSBhcHBsaWNhdGlvbiBtYWluKCkgdGhyZWFkIHByb3hpZWQgdG8gd29ya2VyLiAod2l0aCBFbXNjcmlwdGVuIC1zIFBST1hZX1RPX1dPUktFUj0xKSAoRU5WSVJPTk1FTlRfSVNfV09SS0VSID09IHRydWUsIEVOVklST05NRU5UX0lTX1BUSFJFQUQgPT0gZmFsc2UpXG4vLyAzKSBXZSBjb3VsZCBiZSBhbiBhcHBsaWNhdGlvbiBwdGhyZWFkIHJ1bm5pbmcgaW4gYSB3b3JrZXIuIChFTlZJUk9OTUVOVF9JU19XT1JLRVIgPT0gdHJ1ZSBhbmQgRU5WSVJPTk1FTlRfSVNfUFRIUkVBRCA9PSB0cnVlKVxuXG5pZiAoTW9kdWxlWydFTlZJUk9OTUVOVCddKSB7XG4gIGlmIChNb2R1bGVbJ0VOVklST05NRU5UJ10gPT09ICdXRUInKSB7XG4gICAgRU5WSVJPTk1FTlRfSVNfV0VCID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChNb2R1bGVbJ0VOVklST05NRU5UJ10gPT09ICdXT1JLRVInKSB7XG4gICAgRU5WSVJPTk1FTlRfSVNfV09SS0VSID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChNb2R1bGVbJ0VOVklST05NRU5UJ10gPT09ICdOT0RFJykge1xuICAgIEVOVklST05NRU5UX0lTX05PREUgPSB0cnVlO1xuICB9IGVsc2UgaWYgKE1vZHVsZVsnRU5WSVJPTk1FTlQnXSA9PT0gJ1NIRUxMJykge1xuICAgIEVOVklST05NRU5UX0lTX1NIRUxMID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBwcm92aWRlZCBNb2R1bGVbXFwnRU5WSVJPTk1FTlRcXCddIHZhbHVlIGlzIG5vdCB2YWxpZC4gSXQgbXVzdCBiZSBvbmUgb2Y6IFdFQnxXT1JLRVJ8Tk9ERXxTSEVMTC4nKTtcbiAgfVxufSBlbHNlIHtcbiAgRU5WSVJPTk1FTlRfSVNfV0VCID0gdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCc7XG4gIEVOVklST05NRU5UX0lTX1dPUktFUiA9IHR5cGVvZiBpbXBvcnRTY3JpcHRzID09PSAnZnVuY3Rpb24nO1xuICBFTlZJUk9OTUVOVF9JU19OT0RFID0gdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nICYmICFFTlZJUk9OTUVOVF9JU19XRUIgJiYgIUVOVklST05NRU5UX0lTX1dPUktFUjtcbiAgRU5WSVJPTk1FTlRfSVNfU0hFTEwgPSAhRU5WSVJPTk1FTlRfSVNfV0VCICYmICFFTlZJUk9OTUVOVF9JU19OT0RFICYmICFFTlZJUk9OTUVOVF9JU19XT1JLRVI7XG59XG5cblxuaWYgKEVOVklST05NRU5UX0lTX05PREUpIHtcbiAgLy8gRXhwb3NlIGZ1bmN0aW9uYWxpdHkgaW4gdGhlIHNhbWUgc2ltcGxlIHdheSB0aGF0IHRoZSBzaGVsbHMgd29ya1xuICAvLyBOb3RlIHRoYXQgd2UgcG9sbHV0ZSB0aGUgZ2xvYmFsIG5hbWVzcGFjZSBoZXJlLCBvdGhlcndpc2Ugd2UgYnJlYWsgaW4gbm9kZVxuICBpZiAoIU1vZHVsZVsncHJpbnQnXSkgTW9kdWxlWydwcmludCddID0gY29uc29sZS5sb2c7XG4gIGlmICghTW9kdWxlWydwcmludEVyciddKSBNb2R1bGVbJ3ByaW50RXJyJ10gPSBjb25zb2xlLndhcm47XG5cbiAgdmFyIG5vZGVGUztcbiAgdmFyIG5vZGVQYXRoO1xuXG4gIE1vZHVsZVsncmVhZCddID0gZnVuY3Rpb24gc2hlbGxfcmVhZChmaWxlbmFtZSwgYmluYXJ5KSB7XG4gICAgaWYgKCFub2RlRlMpIG5vZGVGUyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgaWYgKCFub2RlUGF0aCkgbm9kZVBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4gICAgZmlsZW5hbWUgPSBub2RlUGF0aFsnbm9ybWFsaXplJ10oZmlsZW5hbWUpO1xuICAgIHZhciByZXQgPSBub2RlRlNbJ3JlYWRGaWxlU3luYyddKGZpbGVuYW1lKTtcbiAgICByZXR1cm4gYmluYXJ5ID8gcmV0IDogcmV0LnRvU3RyaW5nKCk7XG4gIH07XG5cbiAgTW9kdWxlWydyZWFkQmluYXJ5J10gPSBmdW5jdGlvbiByZWFkQmluYXJ5KGZpbGVuYW1lKSB7XG4gICAgdmFyIHJldCA9IE1vZHVsZVsncmVhZCddKGZpbGVuYW1lLCB0cnVlKTtcbiAgICBpZiAoIXJldC5idWZmZXIpIHtcbiAgICAgIHJldCA9IG5ldyBVaW50OEFycmF5KHJldCk7XG4gICAgfVxuICAgIGFzc2VydChyZXQuYnVmZmVyKTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIE1vZHVsZVsnbG9hZCddID0gZnVuY3Rpb24gbG9hZChmKSB7XG4gICAgZ2xvYmFsRXZhbChyZWFkKGYpKTtcbiAgfTtcblxuICBpZiAoIU1vZHVsZVsndGhpc1Byb2dyYW0nXSkge1xuICAgIGlmIChwcm9jZXNzWydhcmd2J10ubGVuZ3RoID4gMSkge1xuICAgICAgTW9kdWxlWyd0aGlzUHJvZ3JhbSddID0gcHJvY2Vzc1snYXJndiddWzFdLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgTW9kdWxlWyd0aGlzUHJvZ3JhbSddID0gJ3Vua25vd24tcHJvZ3JhbSc7XG4gICAgfVxuICB9XG5cbiAgTW9kdWxlWydhcmd1bWVudHMnXSA9IHByb2Nlc3NbJ2FyZ3YnXS5zbGljZSgyKTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IE1vZHVsZTtcbiAgfVxuXG4gIHByb2Nlc3NbJ29uJ10oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXgpIHtcbiAgICAvLyBzdXBwcmVzcyBFeGl0U3RhdHVzIGV4Y2VwdGlvbnMgZnJvbSBzaG93aW5nIGFuIGVycm9yXG4gICAgaWYgKCEoZXggaW5zdGFuY2VvZiBFeGl0U3RhdHVzKSkge1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9KTtcblxuICBNb2R1bGVbJ2luc3BlY3QnXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdbRW1zY3JpcHRlbiBNb2R1bGUgb2JqZWN0XSc7IH07XG59XG5lbHNlIGlmIChFTlZJUk9OTUVOVF9JU19TSEVMTCkge1xuICBpZiAoIU1vZHVsZVsncHJpbnQnXSkgTW9kdWxlWydwcmludCddID0gcHJpbnQ7XG4gIGlmICh0eXBlb2YgcHJpbnRFcnIgIT0gJ3VuZGVmaW5lZCcpIE1vZHVsZVsncHJpbnRFcnInXSA9IHByaW50RXJyOyAvLyBub3QgcHJlc2VudCBpbiB2OCBvciBvbGRlciBzbVxuXG4gIGlmICh0eXBlb2YgcmVhZCAhPSAndW5kZWZpbmVkJykge1xuICAgIE1vZHVsZVsncmVhZCddID0gcmVhZDtcbiAgfSBlbHNlIHtcbiAgICBNb2R1bGVbJ3JlYWQnXSA9IGZ1bmN0aW9uIHNoZWxsX3JlYWQoKSB7IHRocm93ICdubyByZWFkKCkgYXZhaWxhYmxlJyB9O1xuICB9XG5cbiAgTW9kdWxlWydyZWFkQmluYXJ5J10gPSBmdW5jdGlvbiByZWFkQmluYXJ5KGYpIHtcbiAgICBpZiAodHlwZW9mIHJlYWRidWZmZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShyZWFkYnVmZmVyKGYpKTtcbiAgICB9XG4gICAgdmFyIGRhdGEgPSByZWFkKGYsICdiaW5hcnknKTtcbiAgICBhc3NlcnQodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfTtcblxuICBpZiAodHlwZW9mIHNjcmlwdEFyZ3MgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBNb2R1bGVbJ2FyZ3VtZW50cyddID0gc2NyaXB0QXJncztcbiAgfSBlbHNlIGlmICh0eXBlb2YgYXJndW1lbnRzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgTW9kdWxlWydhcmd1bWVudHMnXSA9IGFyZ3VtZW50cztcbiAgfVxuXG4gIGlmICh0eXBlb2YgcXVpdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIE1vZHVsZVsncXVpdCddID0gZnVuY3Rpb24oc3RhdHVzLCB0b1Rocm93KSB7XG4gICAgICBxdWl0KHN0YXR1cyk7XG4gICAgfVxuICB9XG5cbn1cbmVsc2UgaWYgKEVOVklST05NRU5UX0lTX1dFQiB8fCBFTlZJUk9OTUVOVF9JU19XT1JLRVIpIHtcbiAgTW9kdWxlWydyZWFkJ10gPSBmdW5jdGlvbiBzaGVsbF9yZWFkKHVybCkge1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4aHIub3BlbignR0VUJywgdXJsLCBmYWxzZSk7XG4gICAgeGhyLnNlbmQobnVsbCk7XG4gICAgcmV0dXJuIHhoci5yZXNwb25zZVRleHQ7XG4gIH07XG5cbiAgaWYgKEVOVklST05NRU5UX0lTX1dPUktFUikge1xuICAgIE1vZHVsZVsncmVhZEJpbmFyeSddID0gZnVuY3Rpb24gcmVhZEJpbmFyeSh1cmwpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcbiAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgeGhyLnNlbmQobnVsbCk7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoeGhyLnJlc3BvbnNlKTtcbiAgICB9O1xuICB9XG5cbiAgTW9kdWxlWydyZWFkQXN5bmMnXSA9IGZ1bmN0aW9uIHJlYWRBc3luYyh1cmwsIG9ubG9hZCwgb25lcnJvcikge1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4aHIub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24geGhyX29ubG9hZCgpIHtcbiAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCB8fCAoeGhyLnN0YXR1cyA9PSAwICYmIHhoci5yZXNwb25zZSkpIHsgLy8gZmlsZSBVUkxzIGNhbiByZXR1cm4gMFxuICAgICAgICBvbmxvYWQoeGhyLnJlc3BvbnNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9uZXJyb3IoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHhoci5vbmVycm9yID0gb25lcnJvcjtcbiAgICB4aHIuc2VuZChudWxsKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIGFyZ3VtZW50cyAhPSAndW5kZWZpbmVkJykge1xuICAgIE1vZHVsZVsnYXJndW1lbnRzJ10gPSBhcmd1bWVudHM7XG4gIH1cblxuICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKCFNb2R1bGVbJ3ByaW50J10pIE1vZHVsZVsncHJpbnQnXSA9IGZ1bmN0aW9uIHNoZWxsX3ByaW50KHgpIHtcbiAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgIH07XG4gICAgaWYgKCFNb2R1bGVbJ3ByaW50RXJyJ10pIE1vZHVsZVsncHJpbnRFcnInXSA9IGZ1bmN0aW9uIHNoZWxsX3ByaW50RXJyKHgpIHtcbiAgICAgIGNvbnNvbGUud2Fybih4KTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIC8vIFByb2JhYmx5IGEgd29ya2VyLCBhbmQgd2l0aG91dCBjb25zb2xlLmxvZy4gV2UgY2FuIGRvIHZlcnkgbGl0dGxlIGhlcmUuLi5cbiAgICB2YXIgVFJZX1VTRV9EVU1QID0gZmFsc2U7XG4gICAgaWYgKCFNb2R1bGVbJ3ByaW50J10pIE1vZHVsZVsncHJpbnQnXSA9IChUUllfVVNFX0RVTVAgJiYgKHR5cGVvZihkdW1wKSAhPT0gXCJ1bmRlZmluZWRcIikgPyAoZnVuY3Rpb24oeCkge1xuICAgICAgZHVtcCh4KTtcbiAgICB9KSA6IChmdW5jdGlvbih4KSB7XG4gICAgICAvLyBzZWxmLnBvc3RNZXNzYWdlKHgpOyAvLyBlbmFibGUgdGhpcyBpZiB5b3Ugd2FudCBzdGRvdXQgdG8gYmUgc2VudCBhcyBtZXNzYWdlc1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChFTlZJUk9OTUVOVF9JU19XT1JLRVIpIHtcbiAgICBNb2R1bGVbJ2xvYWQnXSA9IGltcG9ydFNjcmlwdHM7XG4gIH1cblxuICBpZiAodHlwZW9mIE1vZHVsZVsnc2V0V2luZG93VGl0bGUnXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBNb2R1bGVbJ3NldFdpbmRvd1RpdGxlJ10gPSBmdW5jdGlvbih0aXRsZSkgeyBkb2N1bWVudC50aXRsZSA9IHRpdGxlIH07XG4gIH1cbn1cbmVsc2Uge1xuICAvLyBVbnJlYWNoYWJsZSBiZWNhdXNlIFNIRUxMIGlzIGRlcGVuZGFudCBvbiB0aGUgb3RoZXJzXG4gIHRocm93ICdVbmtub3duIHJ1bnRpbWUgZW52aXJvbm1lbnQuIFdoZXJlIGFyZSB3ZT8nO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxFdmFsKHgpIHtcbiAgZXZhbC5jYWxsKG51bGwsIHgpO1xufVxuaWYgKCFNb2R1bGVbJ2xvYWQnXSAmJiBNb2R1bGVbJ3JlYWQnXSkge1xuICBNb2R1bGVbJ2xvYWQnXSA9IGZ1bmN0aW9uIGxvYWQoZikge1xuICAgIGdsb2JhbEV2YWwoTW9kdWxlWydyZWFkJ10oZikpO1xuICB9O1xufVxuaWYgKCFNb2R1bGVbJ3ByaW50J10pIHtcbiAgTW9kdWxlWydwcmludCddID0gZnVuY3Rpb24oKXt9O1xufVxuaWYgKCFNb2R1bGVbJ3ByaW50RXJyJ10pIHtcbiAgTW9kdWxlWydwcmludEVyciddID0gTW9kdWxlWydwcmludCddO1xufVxuaWYgKCFNb2R1bGVbJ2FyZ3VtZW50cyddKSB7XG4gIE1vZHVsZVsnYXJndW1lbnRzJ10gPSBbXTtcbn1cbmlmICghTW9kdWxlWyd0aGlzUHJvZ3JhbSddKSB7XG4gIE1vZHVsZVsndGhpc1Byb2dyYW0nXSA9ICcuL3RoaXMucHJvZ3JhbSc7XG59XG5pZiAoIU1vZHVsZVsncXVpdCddKSB7XG4gIE1vZHVsZVsncXVpdCddID0gZnVuY3Rpb24oc3RhdHVzLCB0b1Rocm93KSB7XG4gICAgdGhyb3cgdG9UaHJvdztcbiAgfVxufVxuXG4vLyAqKiogRW52aXJvbm1lbnQgc2V0dXAgY29kZSAqKipcblxuLy8gQ2xvc3VyZSBoZWxwZXJzXG5Nb2R1bGUucHJpbnQgPSBNb2R1bGVbJ3ByaW50J107XG5Nb2R1bGUucHJpbnRFcnIgPSBNb2R1bGVbJ3ByaW50RXJyJ107XG5cbi8vIENhbGxiYWNrc1xuTW9kdWxlWydwcmVSdW4nXSA9IFtdO1xuTW9kdWxlWydwb3N0UnVuJ10gPSBbXTtcblxuLy8gTWVyZ2UgYmFjayBpbiB0aGUgb3ZlcnJpZGVzXG5mb3IgKHZhciBrZXkgaW4gbW9kdWxlT3ZlcnJpZGVzKSB7XG4gIGlmIChtb2R1bGVPdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgIE1vZHVsZVtrZXldID0gbW9kdWxlT3ZlcnJpZGVzW2tleV07XG4gIH1cbn1cbi8vIEZyZWUgdGhlIG9iamVjdCBoaWVyYXJjaHkgY29udGFpbmVkIGluIHRoZSBvdmVycmlkZXMsIHRoaXMgbGV0cyB0aGUgR0Ncbi8vIHJlY2xhaW0gZGF0YSB1c2VkIGUuZy4gaW4gbWVtb3J5SW5pdGlhbGl6ZXJSZXF1ZXN0LCB3aGljaCBpcyBhIGxhcmdlIHR5cGVkIGFycmF5LlxubW9kdWxlT3ZlcnJpZGVzID0gdW5kZWZpbmVkO1xuXG5cblxuLy8ge3tQUkVBTUJMRV9BRERJVElPTlN9fVxuXG4vLyA9PT0gUHJlYW1ibGUgbGlicmFyeSBzdHVmZiA9PT1cblxuLy8gRG9jdW1lbnRhdGlvbiBmb3IgdGhlIHB1YmxpYyBBUElzIGRlZmluZWQgaW4gdGhpcyBmaWxlIG11c3QgYmUgdXBkYXRlZCBpbjpcbi8vICAgIHNpdGUvc291cmNlL2RvY3MvYXBpX3JlZmVyZW5jZS9wcmVhbWJsZS5qcy5yc3Rcbi8vIEEgcHJlYnVpbHQgbG9jYWwgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnRhdGlvbiBpcyBhdmFpbGFibGUgYXQ6XG4vLyAgICBzaXRlL2J1aWxkL3RleHQvZG9jcy9hcGlfcmVmZXJlbmNlL3ByZWFtYmxlLmpzLnR4dFxuLy8gWW91IGNhbiBhbHNvIGJ1aWxkIGRvY3MgbG9jYWxseSBhcyBIVE1MIG9yIG90aGVyIGZvcm1hdHMgaW4gc2l0ZS9cbi8vIEFuIG9ubGluZSBIVE1MIHZlcnNpb24gKHdoaWNoIG1heSBiZSBvZiBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIEVtc2NyaXB0ZW4pXG4vLyAgICBpcyB1cCBhdCBodHRwOi8va3JpcGtlbi5naXRodWIuaW8vZW1zY3JpcHRlbi1zaXRlL2RvY3MvYXBpX3JlZmVyZW5jZS9wcmVhbWJsZS5qcy5odG1sXG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUnVudGltZSBjb2RlIHNoYXJlZCB3aXRoIGNvbXBpbGVyXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxudmFyIFJ1bnRpbWUgPSB7XG4gIHNldFRlbXBSZXQwOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0ZW1wUmV0MCA9IHZhbHVlO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgZ2V0VGVtcFJldDA6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGVtcFJldDA7XG4gIH0sXG4gIHN0YWNrU2F2ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBTVEFDS1RPUDtcbiAgfSxcbiAgc3RhY2tSZXN0b3JlOiBmdW5jdGlvbiAoc3RhY2tUb3ApIHtcbiAgICBTVEFDS1RPUCA9IHN0YWNrVG9wO1xuICB9LFxuICBnZXROYXRpdmVUeXBlU2l6ZTogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2kxJzogY2FzZSAnaTgnOiByZXR1cm4gMTtcbiAgICAgIGNhc2UgJ2kxNic6IHJldHVybiAyO1xuICAgICAgY2FzZSAnaTMyJzogcmV0dXJuIDQ7XG4gICAgICBjYXNlICdpNjQnOiByZXR1cm4gODtcbiAgICAgIGNhc2UgJ2Zsb2F0JzogcmV0dXJuIDQ7XG4gICAgICBjYXNlICdkb3VibGUnOiByZXR1cm4gODtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaWYgKHR5cGVbdHlwZS5sZW5ndGgtMV0gPT09ICcqJykge1xuICAgICAgICAgIHJldHVybiBSdW50aW1lLlFVQU5UVU1fU0laRTsgLy8gQSBwb2ludGVyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZVswXSA9PT0gJ2knKSB7XG4gICAgICAgICAgdmFyIGJpdHMgPSBwYXJzZUludCh0eXBlLnN1YnN0cigxKSk7XG4gICAgICAgICAgYXNzZXJ0KGJpdHMgJSA4ID09PSAwKTtcbiAgICAgICAgICByZXR1cm4gYml0cy84O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBnZXROYXRpdmVGaWVsZFNpemU6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KFJ1bnRpbWUuZ2V0TmF0aXZlVHlwZVNpemUodHlwZSksIFJ1bnRpbWUuUVVBTlRVTV9TSVpFKTtcbiAgfSxcbiAgU1RBQ0tfQUxJR046IDE2LFxuICBwcmVwVmFyYXJnOiBmdW5jdGlvbiAocHRyLCB0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT09ICdkb3VibGUnIHx8IHR5cGUgPT09ICdpNjQnKSB7XG4gICAgICAvLyBtb3ZlIHNvIHRoZSBsb2FkIGlzIGFsaWduZWRcbiAgICAgIGlmIChwdHIgJiA3KSB7XG4gICAgICAgIGFzc2VydCgocHRyICYgNykgPT09IDQpO1xuICAgICAgICBwdHIgKz0gNDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0KChwdHIgJiAzKSA9PT0gMCk7XG4gICAgfVxuICAgIHJldHVybiBwdHI7XG4gIH0sXG4gIGdldEFsaWduU2l6ZTogZnVuY3Rpb24gKHR5cGUsIHNpemUsIHZhcmFyZykge1xuICAgIC8vIHdlIGFsaWduIGk2NHMgYW5kIGRvdWJsZXMgb24gNjQtYml0IGJvdW5kYXJpZXMsIHVubGlrZSB4ODZcbiAgICBpZiAoIXZhcmFyZyAmJiAodHlwZSA9PSAnaTY0JyB8fCB0eXBlID09ICdkb3VibGUnKSkgcmV0dXJuIDg7XG4gICAgaWYgKCF0eXBlKSByZXR1cm4gTWF0aC5taW4oc2l6ZSwgOCk7IC8vIGFsaWduIHN0cnVjdHVyZXMgaW50ZXJuYWxseSB0byA2NCBiaXRzXG4gICAgcmV0dXJuIE1hdGgubWluKHNpemUgfHwgKHR5cGUgPyBSdW50aW1lLmdldE5hdGl2ZUZpZWxkU2l6ZSh0eXBlKSA6IDApLCBSdW50aW1lLlFVQU5UVU1fU0laRSk7XG4gIH0sXG4gIGR5bkNhbGw6IGZ1bmN0aW9uIChzaWcsIHB0ciwgYXJncykge1xuICAgIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoKSB7XG4gICAgICBhc3NlcnQoYXJncy5sZW5ndGggPT0gc2lnLmxlbmd0aC0xKTtcbiAgICAgIGFzc2VydCgoJ2R5bkNhbGxfJyArIHNpZykgaW4gTW9kdWxlLCAnYmFkIGZ1bmN0aW9uIHBvaW50ZXIgdHlwZSAtIG5vIHRhYmxlIGZvciBzaWcgXFwnJyArIHNpZyArICdcXCcnKTtcbiAgICAgIHJldHVybiBNb2R1bGVbJ2R5bkNhbGxfJyArIHNpZ10uYXBwbHkobnVsbCwgW3B0cl0uY29uY2F0KGFyZ3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0KHNpZy5sZW5ndGggPT0gMSk7XG4gICAgICBhc3NlcnQoKCdkeW5DYWxsXycgKyBzaWcpIGluIE1vZHVsZSwgJ2JhZCBmdW5jdGlvbiBwb2ludGVyIHR5cGUgLSBubyB0YWJsZSBmb3Igc2lnIFxcJycgKyBzaWcgKyAnXFwnJyk7XG4gICAgICByZXR1cm4gTW9kdWxlWydkeW5DYWxsXycgKyBzaWddLmNhbGwobnVsbCwgcHRyKTtcbiAgICB9XG4gIH0sXG4gIGZ1bmN0aW9uUG9pbnRlcnM6IFtdLFxuICBhZGRGdW5jdGlvbjogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IFJ1bnRpbWUuZnVuY3Rpb25Qb2ludGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFSdW50aW1lLmZ1bmN0aW9uUG9pbnRlcnNbaV0pIHtcbiAgICAgICAgUnVudGltZS5mdW5jdGlvblBvaW50ZXJzW2ldID0gZnVuYztcbiAgICAgICAgcmV0dXJuIDIqKDEgKyBpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgJ0ZpbmlzaGVkIHVwIGFsbCByZXNlcnZlZCBmdW5jdGlvbiBwb2ludGVycy4gVXNlIGEgaGlnaGVyIHZhbHVlIGZvciBSRVNFUlZFRF9GVU5DVElPTl9QT0lOVEVSUy4nO1xuICB9LFxuICByZW1vdmVGdW5jdGlvbjogZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgUnVudGltZS5mdW5jdGlvblBvaW50ZXJzWyhpbmRleC0yKS8yXSA9IG51bGw7XG4gIH0sXG4gIHdhcm5PbmNlOiBmdW5jdGlvbiAodGV4dCkge1xuICAgIGlmICghUnVudGltZS53YXJuT25jZS5zaG93bikgUnVudGltZS53YXJuT25jZS5zaG93biA9IHt9O1xuICAgIGlmICghUnVudGltZS53YXJuT25jZS5zaG93blt0ZXh0XSkge1xuICAgICAgUnVudGltZS53YXJuT25jZS5zaG93blt0ZXh0XSA9IDE7XG4gICAgICBNb2R1bGUucHJpbnRFcnIodGV4dCk7XG4gICAgfVxuICB9LFxuICBmdW5jV3JhcHBlcnM6IHt9LFxuICBnZXRGdW5jV3JhcHBlcjogZnVuY3Rpb24gKGZ1bmMsIHNpZykge1xuICAgIGFzc2VydChzaWcpO1xuICAgIGlmICghUnVudGltZS5mdW5jV3JhcHBlcnNbc2lnXSkge1xuICAgICAgUnVudGltZS5mdW5jV3JhcHBlcnNbc2lnXSA9IHt9O1xuICAgIH1cbiAgICB2YXIgc2lnQ2FjaGUgPSBSdW50aW1lLmZ1bmNXcmFwcGVyc1tzaWddO1xuICAgIGlmICghc2lnQ2FjaGVbZnVuY10pIHtcbiAgICAgIC8vIG9wdGltaXplIGF3YXkgYXJndW1lbnRzIHVzYWdlIGluIGNvbW1vbiBjYXNlc1xuICAgICAgaWYgKHNpZy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgc2lnQ2FjaGVbZnVuY10gPSBmdW5jdGlvbiBkeW5DYWxsX3dyYXBwZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIFJ1bnRpbWUuZHluQ2FsbChzaWcsIGZ1bmMpO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmIChzaWcubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIHNpZ0NhY2hlW2Z1bmNdID0gZnVuY3Rpb24gZHluQ2FsbF93cmFwcGVyKGFyZykge1xuICAgICAgICAgIHJldHVybiBSdW50aW1lLmR5bkNhbGwoc2lnLCBmdW5jLCBbYXJnXSk7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZW5lcmFsIGNhc2VcbiAgICAgICAgc2lnQ2FjaGVbZnVuY10gPSBmdW5jdGlvbiBkeW5DYWxsX3dyYXBwZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIFJ1bnRpbWUuZHluQ2FsbChzaWcsIGZ1bmMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2lnQ2FjaGVbZnVuY107XG4gIH0sXG4gIGdldENvbXBpbGVyU2V0dGluZzogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyAnWW91IG11c3QgYnVpbGQgd2l0aCAtcyBSRVRBSU5fQ09NUElMRVJfU0VUVElOR1M9MSBmb3IgUnVudGltZS5nZXRDb21waWxlclNldHRpbmcgb3IgZW1zY3JpcHRlbl9nZXRfY29tcGlsZXJfc2V0dGluZyB0byB3b3JrJztcbiAgfSxcbiAgc3RhY2tBbGxvYzogZnVuY3Rpb24gKHNpemUpIHsgdmFyIHJldCA9IFNUQUNLVE9QO1NUQUNLVE9QID0gKFNUQUNLVE9QICsgc2l6ZSl8MDtTVEFDS1RPUCA9ICgoKFNUQUNLVE9QKSsxNSkmLTE2KTsoYXNzZXJ0KCgoKFNUQUNLVE9QfDApIDwgKFNUQUNLX01BWHwwKSl8MCkpfDApOyByZXR1cm4gcmV0OyB9LFxuICBzdGF0aWNBbGxvYzogZnVuY3Rpb24gKHNpemUpIHsgdmFyIHJldCA9IFNUQVRJQ1RPUDtTVEFUSUNUT1AgPSAoU1RBVElDVE9QICsgKGFzc2VydCghc3RhdGljU2VhbGVkKSxzaXplKSl8MDtTVEFUSUNUT1AgPSAoKChTVEFUSUNUT1ApKzE1KSYtMTYpOyByZXR1cm4gcmV0OyB9LFxuICBkeW5hbWljQWxsb2M6IGZ1bmN0aW9uIChzaXplKSB7IGFzc2VydChEWU5BTUlDVE9QX1BUUik7dmFyIHJldCA9IEhFQVAzMltEWU5BTUlDVE9QX1BUUj4+Ml07dmFyIGVuZCA9ICgoKHJldCArIHNpemUgKyAxNSl8MCkgJiAtMTYpO0hFQVAzMltEWU5BTUlDVE9QX1BUUj4+Ml0gPSBlbmQ7aWYgKGVuZCA+PSBUT1RBTF9NRU1PUlkpIHt2YXIgc3VjY2VzcyA9IGVubGFyZ2VNZW1vcnkoKTtpZiAoIXN1Y2Nlc3MpIHtIRUFQMzJbRFlOQU1JQ1RPUF9QVFI+PjJdID0gcmV0O3JldHVybiAwO319cmV0dXJuIHJldDt9LFxuICBhbGlnbk1lbW9yeTogZnVuY3Rpb24gKHNpemUscXVhbnR1bSkgeyB2YXIgcmV0ID0gc2l6ZSA9IE1hdGguY2VpbCgoc2l6ZSkvKHF1YW50dW0gPyBxdWFudHVtIDogMTYpKSoocXVhbnR1bSA/IHF1YW50dW0gOiAxNik7IHJldHVybiByZXQ7IH0sXG4gIG1ha2VCaWdJbnQ6IGZ1bmN0aW9uIChsb3csaGlnaCx1bnNpZ25lZCkgeyB2YXIgcmV0ID0gKHVuc2lnbmVkID8gKCgrKChsb3c+Pj4wKSkpKygoKygoaGlnaD4+PjApKSkqNDI5NDk2NzI5Ni4wKSkgOiAoKCsoKGxvdz4+PjApKSkrKCgrKChoaWdofDApKSkqNDI5NDk2NzI5Ni4wKSkpOyByZXR1cm4gcmV0OyB9LFxuICBHTE9CQUxfQkFTRTogMTAyNCxcbiAgUVVBTlRVTV9TSVpFOiA0LFxuICBfX2R1bW15X186IDBcbn1cblxuXG5cbk1vZHVsZVtcIlJ1bnRpbWVcIl0gPSBSdW50aW1lO1xuXG5cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSdW50aW1lIGVzc2VudGlhbHNcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG52YXIgQUJPUlQgPSAwOyAvLyB3aGV0aGVyIHdlIGFyZSBxdWl0dGluZyB0aGUgYXBwbGljYXRpb24uIG5vIGNvZGUgc2hvdWxkIHJ1biBhZnRlciB0aGlzLiBzZXQgaW4gZXhpdCgpIGFuZCBhYm9ydCgpXG52YXIgRVhJVFNUQVRVUyA9IDA7XG5cbi8qKiBAdHlwZSB7ZnVuY3Rpb24oKiwgc3RyaW5nPSl9ICovXG5mdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCB0ZXh0KSB7XG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgYWJvcnQoJ0Fzc2VydGlvbiBmYWlsZWQ6ICcgKyB0ZXh0KTtcbiAgfVxufVxuXG52YXIgZ2xvYmFsU2NvcGUgPSB0aGlzO1xuXG4vLyBSZXR1cm5zIHRoZSBDIGZ1bmN0aW9uIHdpdGggYSBzcGVjaWZpZWQgaWRlbnRpZmllciAoZm9yIEMrKywgeW91IG5lZWQgdG8gZG8gbWFudWFsIG5hbWUgbWFuZ2xpbmcpXG5mdW5jdGlvbiBnZXRDRnVuYyhpZGVudCkge1xuICB2YXIgZnVuYyA9IE1vZHVsZVsnXycgKyBpZGVudF07IC8vIGNsb3N1cmUgZXhwb3J0ZWQgZnVuY3Rpb25cbiAgaWYgKCFmdW5jKSB7XG4gICAgdHJ5IHsgZnVuYyA9IGV2YWwoJ18nICsgaWRlbnQpOyB9IGNhdGNoKGUpIHt9XG4gIH1cbiAgYXNzZXJ0KGZ1bmMsICdDYW5ub3QgY2FsbCB1bmtub3duIGZ1bmN0aW9uICcgKyBpZGVudCArICcgKHBlcmhhcHMgTExWTSBvcHRpbWl6YXRpb25zIG9yIGNsb3N1cmUgcmVtb3ZlZCBpdD8pJyk7XG4gIHJldHVybiBmdW5jO1xufVxuXG52YXIgY3dyYXAsIGNjYWxsO1xuKGZ1bmN0aW9uKCl7XG4gIHZhciBKU2Z1bmNzID0ge1xuICAgIC8vIEhlbHBlcnMgZm9yIGN3cmFwIC0tIGl0IGNhbid0IHJlZmVyIHRvIFJ1bnRpbWUgZGlyZWN0bHkgYmVjYXVzZSBpdCBtaWdodFxuICAgIC8vIGJlIHJlbmFtZWQgYnkgY2xvc3VyZSwgaW5zdGVhZCBpdCBjYWxscyBKU2Z1bmNzWydzdGFja1NhdmUnXS5ib2R5IHRvIGZpbmRcbiAgICAvLyBvdXQgd2hhdCB0aGUgbWluaWZpZWQgZnVuY3Rpb24gbmFtZSBpcy5cbiAgICAnc3RhY2tTYXZlJzogZnVuY3Rpb24oKSB7XG4gICAgICBSdW50aW1lLnN0YWNrU2F2ZSgpXG4gICAgfSxcbiAgICAnc3RhY2tSZXN0b3JlJzogZnVuY3Rpb24oKSB7XG4gICAgICBSdW50aW1lLnN0YWNrUmVzdG9yZSgpXG4gICAgfSxcbiAgICAvLyB0eXBlIGNvbnZlcnNpb24gZnJvbSBqcyB0byBjXG4gICAgJ2FycmF5VG9DJyA6IGZ1bmN0aW9uKGFycikge1xuICAgICAgdmFyIHJldCA9IFJ1bnRpbWUuc3RhY2tBbGxvYyhhcnIubGVuZ3RoKTtcbiAgICAgIHdyaXRlQXJyYXlUb01lbW9yeShhcnIsIHJldCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgJ3N0cmluZ1RvQycgOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIHZhciByZXQgPSAwO1xuICAgICAgaWYgKHN0ciAhPT0gbnVsbCAmJiBzdHIgIT09IHVuZGVmaW5lZCAmJiBzdHIgIT09IDApIHsgLy8gbnVsbCBzdHJpbmdcbiAgICAgICAgLy8gYXQgbW9zdCA0IGJ5dGVzIHBlciBVVEYtOCBjb2RlIHBvaW50LCArMSBmb3IgdGhlIHRyYWlsaW5nICdcXDAnXG4gICAgICAgIHZhciBsZW4gPSAoc3RyLmxlbmd0aCA8PCAyKSArIDE7XG4gICAgICAgIHJldCA9IFJ1bnRpbWUuc3RhY2tBbGxvYyhsZW4pO1xuICAgICAgICBzdHJpbmdUb1VURjgoc3RyLCByZXQsIGxlbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfTtcbiAgLy8gRm9yIGZhc3QgbG9va3VwIG9mIGNvbnZlcnNpb24gZnVuY3Rpb25zXG4gIHZhciB0b0MgPSB7J3N0cmluZycgOiBKU2Z1bmNzWydzdHJpbmdUb0MnXSwgJ2FycmF5JyA6IEpTZnVuY3NbJ2FycmF5VG9DJ119O1xuXG4gIC8vIEMgY2FsbGluZyBpbnRlcmZhY2UuXG4gIGNjYWxsID0gZnVuY3Rpb24gY2NhbGxGdW5jKGlkZW50LCByZXR1cm5UeXBlLCBhcmdUeXBlcywgYXJncywgb3B0cykge1xuICAgIHZhciBmdW5jID0gZ2V0Q0Z1bmMoaWRlbnQpO1xuICAgIHZhciBjQXJncyA9IFtdO1xuICAgIHZhciBzdGFjayA9IDA7XG4gICAgYXNzZXJ0KHJldHVyblR5cGUgIT09ICdhcnJheScsICdSZXR1cm4gdHlwZSBzaG91bGQgbm90IGJlIFwiYXJyYXlcIi4nKTtcbiAgICBpZiAoYXJncykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb252ZXJ0ZXIgPSB0b0NbYXJnVHlwZXNbaV1dO1xuICAgICAgICBpZiAoY29udmVydGVyKSB7XG4gICAgICAgICAgaWYgKHN0YWNrID09PSAwKSBzdGFjayA9IFJ1bnRpbWUuc3RhY2tTYXZlKCk7XG4gICAgICAgICAgY0FyZ3NbaV0gPSBjb252ZXJ0ZXIoYXJnc1tpXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY0FyZ3NbaV0gPSBhcmdzW2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciByZXQgPSBmdW5jLmFwcGx5KG51bGwsIGNBcmdzKTtcbiAgICBpZiAoKCFvcHRzIHx8ICFvcHRzLmFzeW5jKSAmJiB0eXBlb2YgRW10ZXJwcmV0ZXJBc3luYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFzc2VydCghRW10ZXJwcmV0ZXJBc3luYy5zdGF0ZSwgJ2Nhbm5vdCBzdGFydCBhc3luYyBvcCB3aXRoIG5vcm1hbCBKUyBjYWxsaW5nIGNjYWxsJyk7XG4gICAgfVxuICAgIGlmIChvcHRzICYmIG9wdHMuYXN5bmMpIGFzc2VydCghcmV0dXJuVHlwZSwgJ2FzeW5jIGNjYWxscyBjYW5ub3QgcmV0dXJuIHZhbHVlcycpO1xuICAgIGlmIChyZXR1cm5UeXBlID09PSAnc3RyaW5nJykgcmV0ID0gUG9pbnRlcl9zdHJpbmdpZnkocmV0KTtcbiAgICBpZiAoc3RhY2sgIT09IDApIHtcbiAgICAgIGlmIChvcHRzICYmIG9wdHMuYXN5bmMpIHtcbiAgICAgICAgRW10ZXJwcmV0ZXJBc3luYy5hc3luY0ZpbmFsaXplcnMucHVzaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBSdW50aW1lLnN0YWNrUmVzdG9yZShzdGFjayk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBSdW50aW1lLnN0YWNrUmVzdG9yZShzdGFjayk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICB2YXIgc291cmNlUmVnZXggPSAvXmZ1bmN0aW9uXFxzKlthLXpBLVokXzAtOV0qXFxzKlxcKChbXildKilcXClcXHMqe1xccyooW14qXSo/KVtcXHM7XSooPzpyZXR1cm5cXHMqKC4qPylbO1xcc10qKT99JC87XG4gIGZ1bmN0aW9uIHBhcnNlSlNGdW5jKGpzZnVuYykge1xuICAgIC8vIE1hdGNoIHRoZSBib2R5IGFuZCB0aGUgcmV0dXJuIHZhbHVlIG9mIGEgamF2YXNjcmlwdCBmdW5jdGlvbiBzb3VyY2VcbiAgICB2YXIgcGFyc2VkID0ganNmdW5jLnRvU3RyaW5nKCkubWF0Y2goc291cmNlUmVnZXgpLnNsaWNlKDEpO1xuICAgIHJldHVybiB7YXJndW1lbnRzIDogcGFyc2VkWzBdLCBib2R5IDogcGFyc2VkWzFdLCByZXR1cm5WYWx1ZTogcGFyc2VkWzJdfVxuICB9XG5cbiAgLy8gc291cmNlcyBvZiB1c2VmdWwgZnVuY3Rpb25zLiB3ZSBjcmVhdGUgdGhpcyBsYXppbHkgYXMgaXQgY2FuIHRyaWdnZXIgYSBzb3VyY2UgZGVjb21wcmVzc2lvbiBvbiB0aGlzIGVudGlyZSBmaWxlXG4gIHZhciBKU3NvdXJjZSA9IG51bGw7XG4gIGZ1bmN0aW9uIGVuc3VyZUpTc291cmNlKCkge1xuICAgIGlmICghSlNzb3VyY2UpIHtcbiAgICAgIEpTc291cmNlID0ge307XG4gICAgICBmb3IgKHZhciBmdW4gaW4gSlNmdW5jcykge1xuICAgICAgICBpZiAoSlNmdW5jcy5oYXNPd25Qcm9wZXJ0eShmdW4pKSB7XG4gICAgICAgICAgLy8gRWxlbWVudHMgb2YgdG9Dc291cmNlIGFyZSBhcnJheXMgb2YgdGhyZWUgaXRlbXM6XG4gICAgICAgICAgLy8gdGhlIGNvZGUsIGFuZCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgICAgICAgSlNzb3VyY2VbZnVuXSA9IHBhcnNlSlNGdW5jKEpTZnVuY3NbZnVuXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjd3JhcCA9IGZ1bmN0aW9uIGN3cmFwKGlkZW50LCByZXR1cm5UeXBlLCBhcmdUeXBlcykge1xuICAgIGFyZ1R5cGVzID0gYXJnVHlwZXMgfHwgW107XG4gICAgdmFyIGNmdW5jID0gZ2V0Q0Z1bmMoaWRlbnQpO1xuICAgIC8vIFdoZW4gdGhlIGZ1bmN0aW9uIHRha2VzIG51bWJlcnMgYW5kIHJldHVybnMgYSBudW1iZXIsIHdlIGNhbiBqdXN0IHJldHVyblxuICAgIC8vIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgIHZhciBudW1lcmljQXJncyA9IGFyZ1R5cGVzLmV2ZXJ5KGZ1bmN0aW9uKHR5cGUpeyByZXR1cm4gdHlwZSA9PT0gJ251bWJlcid9KTtcbiAgICB2YXIgbnVtZXJpY1JldCA9IChyZXR1cm5UeXBlICE9PSAnc3RyaW5nJyk7XG4gICAgaWYgKCBudW1lcmljUmV0ICYmIG51bWVyaWNBcmdzKSB7XG4gICAgICByZXR1cm4gY2Z1bmM7XG4gICAgfVxuICAgIC8vIENyZWF0aW9uIG9mIHRoZSBhcmd1bWVudHMgbGlzdCAoW1wiJDFcIixcIiQyXCIsLi4uLFwiJG5hcmdzXCJdKVxuICAgIHZhciBhcmdOYW1lcyA9IGFyZ1R5cGVzLm1hcChmdW5jdGlvbih4LGkpe3JldHVybiAnJCcraX0pO1xuICAgIHZhciBmdW5jc3RyID0gXCIoZnVuY3Rpb24oXCIgKyBhcmdOYW1lcy5qb2luKCcsJykgKyBcIikge1wiO1xuICAgIHZhciBuYXJncyA9IGFyZ1R5cGVzLmxlbmd0aDtcbiAgICBpZiAoIW51bWVyaWNBcmdzKSB7XG4gICAgICAvLyBHZW5lcmF0ZSB0aGUgY29kZSBuZWVkZWQgdG8gY29udmVydCB0aGUgYXJndW1lbnRzIGZyb20gamF2YXNjcmlwdFxuICAgICAgLy8gdmFsdWVzIHRvIHBvaW50ZXJzXG4gICAgICBlbnN1cmVKU3NvdXJjZSgpO1xuICAgICAgZnVuY3N0ciArPSAndmFyIHN0YWNrID0gJyArIEpTc291cmNlWydzdGFja1NhdmUnXS5ib2R5ICsgJzsnO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYXJnczsgaSsrKSB7XG4gICAgICAgIHZhciBhcmcgPSBhcmdOYW1lc1tpXSwgdHlwZSA9IGFyZ1R5cGVzW2ldO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ251bWJlcicpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgY29udmVydENvZGUgPSBKU3NvdXJjZVt0eXBlICsgJ1RvQyddOyAvLyBbY29kZSwgcmV0dXJuXVxuICAgICAgICBmdW5jc3RyICs9ICd2YXIgJyArIGNvbnZlcnRDb2RlLmFyZ3VtZW50cyArICcgPSAnICsgYXJnICsgJzsnO1xuICAgICAgICBmdW5jc3RyICs9IGNvbnZlcnRDb2RlLmJvZHkgKyAnOyc7XG4gICAgICAgIGZ1bmNzdHIgKz0gYXJnICsgJz0oJyArIGNvbnZlcnRDb2RlLnJldHVyblZhbHVlICsgJyk7JztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXaGVuIHRoZSBjb2RlIGlzIGNvbXByZXNzZWQsIHRoZSBuYW1lIG9mIGNmdW5jIGlzIG5vdCBsaXRlcmFsbHkgJ2NmdW5jJyBhbnltb3JlXG4gICAgdmFyIGNmdW5jbmFtZSA9IHBhcnNlSlNGdW5jKGZ1bmN0aW9uKCl7cmV0dXJuIGNmdW5jfSkucmV0dXJuVmFsdWU7XG4gICAgLy8gQ2FsbCB0aGUgZnVuY3Rpb25cbiAgICBmdW5jc3RyICs9ICd2YXIgcmV0ID0gJyArIGNmdW5jbmFtZSArICcoJyArIGFyZ05hbWVzLmpvaW4oJywnKSArICcpOyc7XG4gICAgaWYgKCFudW1lcmljUmV0KSB7IC8vIFJldHVybiB0eXBlIGNhbiBvbmx5IGJ5ICdzdHJpbmcnIG9yICdudW1iZXInXG4gICAgICAvLyBDb252ZXJ0IHRoZSByZXN1bHQgdG8gYSBzdHJpbmdcbiAgICAgIHZhciBzdHJnZnkgPSBwYXJzZUpTRnVuYyhmdW5jdGlvbigpe3JldHVybiBQb2ludGVyX3N0cmluZ2lmeX0pLnJldHVyblZhbHVlO1xuICAgICAgZnVuY3N0ciArPSAncmV0ID0gJyArIHN0cmdmeSArICcocmV0KTsnO1xuICAgIH1cbiAgICBmdW5jc3RyICs9IFwiaWYgKHR5cGVvZiBFbXRlcnByZXRlckFzeW5jID09PSAnb2JqZWN0JykgeyBhc3NlcnQoIUVtdGVycHJldGVyQXN5bmMuc3RhdGUsICdjYW5ub3Qgc3RhcnQgYXN5bmMgb3Agd2l0aCBub3JtYWwgSlMgY2FsbGluZyBjd3JhcCcpIH1cIjtcbiAgICBpZiAoIW51bWVyaWNBcmdzKSB7XG4gICAgICAvLyBJZiB3ZSBoYWQgYSBzdGFjaywgcmVzdG9yZSBpdFxuICAgICAgZW5zdXJlSlNzb3VyY2UoKTtcbiAgICAgIGZ1bmNzdHIgKz0gSlNzb3VyY2VbJ3N0YWNrUmVzdG9yZSddLmJvZHkucmVwbGFjZSgnKCknLCAnKHN0YWNrKScpICsgJzsnO1xuICAgIH1cbiAgICBmdW5jc3RyICs9ICdyZXR1cm4gcmV0fSknO1xuICAgIHJldHVybiBldmFsKGZ1bmNzdHIpO1xuICB9O1xufSkoKTtcbk1vZHVsZVtcImNjYWxsXCJdID0gY2NhbGw7XG5Nb2R1bGVbXCJjd3JhcFwiXSA9IGN3cmFwO1xuXG4vKiogQHR5cGUge2Z1bmN0aW9uKG51bWJlciwgbnVtYmVyLCBzdHJpbmcsIGJvb2xlYW49KX0gKi9cbmZ1bmN0aW9uIHNldFZhbHVlKHB0ciwgdmFsdWUsIHR5cGUsIG5vU2FmZSkge1xuICB0eXBlID0gdHlwZSB8fCAnaTgnO1xuICBpZiAodHlwZS5jaGFyQXQodHlwZS5sZW5ndGgtMSkgPT09ICcqJykgdHlwZSA9ICdpMzInOyAvLyBwb2ludGVycyBhcmUgMzItYml0XG4gICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2kxJzogSEVBUDhbKChwdHIpPj4wKV09dmFsdWU7IGJyZWFrO1xuICAgICAgY2FzZSAnaTgnOiBIRUFQOFsoKHB0cik+PjApXT12YWx1ZTsgYnJlYWs7XG4gICAgICBjYXNlICdpMTYnOiBIRUFQMTZbKChwdHIpPj4xKV09dmFsdWU7IGJyZWFrO1xuICAgICAgY2FzZSAnaTMyJzogSEVBUDMyWygocHRyKT4+MildPXZhbHVlOyBicmVhaztcbiAgICAgIGNhc2UgJ2k2NCc6ICh0ZW1wSTY0ID0gW3ZhbHVlPj4+MCwodGVtcERvdWJsZT12YWx1ZSwoKyhNYXRoX2Ficyh0ZW1wRG91YmxlKSkpID49IDEuMCA/ICh0ZW1wRG91YmxlID4gMC4wID8gKChNYXRoX21pbigoKyhNYXRoX2Zsb29yKCh0ZW1wRG91YmxlKS80Mjk0OTY3Mjk2LjApKSksIDQyOTQ5NjcyOTUuMCkpfDApPj4+MCA6ICh+figoKyhNYXRoX2NlaWwoKHRlbXBEb3VibGUgLSArKCgofn4odGVtcERvdWJsZSkpKT4+PjApKS80Mjk0OTY3Mjk2LjApKSkpKT4+PjApIDogMCldLEhFQVAzMlsoKHB0cik+PjIpXT10ZW1wSTY0WzBdLEhFQVAzMlsoKChwdHIpKyg0KSk+PjIpXT10ZW1wSTY0WzFdKTsgYnJlYWs7XG4gICAgICBjYXNlICdmbG9hdCc6IEhFQVBGMzJbKChwdHIpPj4yKV09dmFsdWU7IGJyZWFrO1xuICAgICAgY2FzZSAnZG91YmxlJzogSEVBUEY2NFsoKHB0cik+PjMpXT12YWx1ZTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBhYm9ydCgnaW52YWxpZCB0eXBlIGZvciBzZXRWYWx1ZTogJyArIHR5cGUpO1xuICAgIH1cbn1cbk1vZHVsZVtcInNldFZhbHVlXCJdID0gc2V0VmFsdWU7XG5cbi8qKiBAdHlwZSB7ZnVuY3Rpb24obnVtYmVyLCBzdHJpbmcsIGJvb2xlYW49KX0gKi9cbmZ1bmN0aW9uIGdldFZhbHVlKHB0ciwgdHlwZSwgbm9TYWZlKSB7XG4gIHR5cGUgPSB0eXBlIHx8ICdpOCc7XG4gIGlmICh0eXBlLmNoYXJBdCh0eXBlLmxlbmd0aC0xKSA9PT0gJyonKSB0eXBlID0gJ2kzMic7IC8vIHBvaW50ZXJzIGFyZSAzMi1iaXRcbiAgICBzd2l0Y2godHlwZSkge1xuICAgICAgY2FzZSAnaTEnOiByZXR1cm4gSEVBUDhbKChwdHIpPj4wKV07XG4gICAgICBjYXNlICdpOCc6IHJldHVybiBIRUFQOFsoKHB0cik+PjApXTtcbiAgICAgIGNhc2UgJ2kxNic6IHJldHVybiBIRUFQMTZbKChwdHIpPj4xKV07XG4gICAgICBjYXNlICdpMzInOiByZXR1cm4gSEVBUDMyWygocHRyKT4+MildO1xuICAgICAgY2FzZSAnaTY0JzogcmV0dXJuIEhFQVAzMlsoKHB0cik+PjIpXTtcbiAgICAgIGNhc2UgJ2Zsb2F0JzogcmV0dXJuIEhFQVBGMzJbKChwdHIpPj4yKV07XG4gICAgICBjYXNlICdkb3VibGUnOiByZXR1cm4gSEVBUEY2NFsoKHB0cik+PjMpXTtcbiAgICAgIGRlZmF1bHQ6IGFib3J0KCdpbnZhbGlkIHR5cGUgZm9yIHNldFZhbHVlOiAnICsgdHlwZSk7XG4gICAgfVxuICByZXR1cm4gbnVsbDtcbn1cbk1vZHVsZVtcImdldFZhbHVlXCJdID0gZ2V0VmFsdWU7XG5cbnZhciBBTExPQ19OT1JNQUwgPSAwOyAvLyBUcmllcyB0byB1c2UgX21hbGxvYygpXG52YXIgQUxMT0NfU1RBQ0sgPSAxOyAvLyBMaXZlcyBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoZSBjdXJyZW50IGZ1bmN0aW9uIGNhbGxcbnZhciBBTExPQ19TVEFUSUMgPSAyOyAvLyBDYW5ub3QgYmUgZnJlZWRcbnZhciBBTExPQ19EWU5BTUlDID0gMzsgLy8gQ2Fubm90IGJlIGZyZWVkIGV4Y2VwdCB0aHJvdWdoIHNicmtcbnZhciBBTExPQ19OT05FID0gNDsgLy8gRG8gbm90IGFsbG9jYXRlXG5Nb2R1bGVbXCJBTExPQ19OT1JNQUxcIl0gPSBBTExPQ19OT1JNQUw7XG5Nb2R1bGVbXCJBTExPQ19TVEFDS1wiXSA9IEFMTE9DX1NUQUNLO1xuTW9kdWxlW1wiQUxMT0NfU1RBVElDXCJdID0gQUxMT0NfU1RBVElDO1xuTW9kdWxlW1wiQUxMT0NfRFlOQU1JQ1wiXSA9IEFMTE9DX0RZTkFNSUM7XG5Nb2R1bGVbXCJBTExPQ19OT05FXCJdID0gQUxMT0NfTk9ORTtcblxuLy8gYWxsb2NhdGUoKTogVGhpcyBpcyBmb3IgaW50ZXJuYWwgdXNlLiBZb3UgY2FuIHVzZSBpdCB5b3Vyc2VsZiBhcyB3ZWxsLCBidXQgdGhlIGludGVyZmFjZVxuLy8gICAgICAgICAgICAgaXMgYSBsaXR0bGUgdHJpY2t5IChzZWUgZG9jcyByaWdodCBiZWxvdykuIFRoZSByZWFzb24gaXMgdGhhdCBpdCBpcyBvcHRpbWl6ZWRcbi8vICAgICAgICAgICAgIGZvciBtdWx0aXBsZSBzeW50YXhlcyB0byBzYXZlIHNwYWNlIGluIGdlbmVyYXRlZCBjb2RlLiBTbyB5b3Ugc2hvdWxkXG4vLyAgICAgICAgICAgICBub3JtYWxseSBub3QgdXNlIGFsbG9jYXRlKCksIGFuZCBpbnN0ZWFkIGFsbG9jYXRlIG1lbW9yeSB1c2luZyBfbWFsbG9jKCksXG4vLyAgICAgICAgICAgICBpbml0aWFsaXplIGl0IHdpdGggc2V0VmFsdWUoKSwgYW5kIHNvIGZvcnRoLlxuLy8gQHNsYWI6IEFuIGFycmF5IG9mIGRhdGEsIG9yIGEgbnVtYmVyLiBJZiBhIG51bWJlciwgdGhlbiB0aGUgc2l6ZSBvZiB0aGUgYmxvY2sgdG8gYWxsb2NhdGUsXG4vLyAgICAgICAgaW4gKmJ5dGVzKiAobm90ZSB0aGF0IHRoaXMgaXMgc29tZXRpbWVzIGNvbmZ1c2luZzogdGhlIG5leHQgcGFyYW1ldGVyIGRvZXMgbm90XG4vLyAgICAgICAgYWZmZWN0IHRoaXMhKVxuLy8gQHR5cGVzOiBFaXRoZXIgYW4gYXJyYXkgb2YgdHlwZXMsIG9uZSBmb3IgZWFjaCBieXRlIChvciAwIGlmIG5vIHR5cGUgYXQgdGhhdCBwb3NpdGlvbiksXG4vLyAgICAgICAgIG9yIGEgc2luZ2xlIHR5cGUgd2hpY2ggaXMgdXNlZCBmb3IgdGhlIGVudGlyZSBibG9jay4gVGhpcyBvbmx5IG1hdHRlcnMgaWYgdGhlcmVcbi8vICAgICAgICAgaXMgaW5pdGlhbCBkYXRhIC0gaWYgQHNsYWIgaXMgYSBudW1iZXIsIHRoZW4gdGhpcyBkb2VzIG5vdCBtYXR0ZXIgYXQgYWxsIGFuZCBpc1xuLy8gICAgICAgICBpZ25vcmVkLlxuLy8gQGFsbG9jYXRvcjogSG93IHRvIGFsbG9jYXRlIG1lbW9yeSwgc2VlIEFMTE9DXypcbi8qKiBAdHlwZSB7ZnVuY3Rpb24oKFR5cGVkQXJyYXl8QXJyYXk8bnVtYmVyPnxudW1iZXIpLCBzdHJpbmcsIG51bWJlciwgbnVtYmVyPSl9ICovXG5mdW5jdGlvbiBhbGxvY2F0ZShzbGFiLCB0eXBlcywgYWxsb2NhdG9yLCBwdHIpIHtcbiAgdmFyIHplcm9pbml0LCBzaXplO1xuICBpZiAodHlwZW9mIHNsYWIgPT09ICdudW1iZXInKSB7XG4gICAgemVyb2luaXQgPSB0cnVlO1xuICAgIHNpemUgPSBzbGFiO1xuICB9IGVsc2Uge1xuICAgIHplcm9pbml0ID0gZmFsc2U7XG4gICAgc2l6ZSA9IHNsYWIubGVuZ3RoO1xuICB9XG5cbiAgdmFyIHNpbmdsZVR5cGUgPSB0eXBlb2YgdHlwZXMgPT09ICdzdHJpbmcnID8gdHlwZXMgOiBudWxsO1xuXG4gIHZhciByZXQ7XG4gIGlmIChhbGxvY2F0b3IgPT0gQUxMT0NfTk9ORSkge1xuICAgIHJldCA9IHB0cjtcbiAgfSBlbHNlIHtcbiAgICByZXQgPSBbdHlwZW9mIF9tYWxsb2MgPT09ICdmdW5jdGlvbicgPyBfbWFsbG9jIDogUnVudGltZS5zdGF0aWNBbGxvYywgUnVudGltZS5zdGFja0FsbG9jLCBSdW50aW1lLnN0YXRpY0FsbG9jLCBSdW50aW1lLmR5bmFtaWNBbGxvY11bYWxsb2NhdG9yID09PSB1bmRlZmluZWQgPyBBTExPQ19TVEFUSUMgOiBhbGxvY2F0b3JdKE1hdGgubWF4KHNpemUsIHNpbmdsZVR5cGUgPyAxIDogdHlwZXMubGVuZ3RoKSk7XG4gIH1cblxuICBpZiAoemVyb2luaXQpIHtcbiAgICB2YXIgcHRyID0gcmV0LCBzdG9wO1xuICAgIGFzc2VydCgocmV0ICYgMykgPT0gMCk7XG4gICAgc3RvcCA9IHJldCArIChzaXplICYgfjMpO1xuICAgIGZvciAoOyBwdHIgPCBzdG9wOyBwdHIgKz0gNCkge1xuICAgICAgSEVBUDMyWygocHRyKT4+MildPTA7XG4gICAgfVxuICAgIHN0b3AgPSByZXQgKyBzaXplO1xuICAgIHdoaWxlIChwdHIgPCBzdG9wKSB7XG4gICAgICBIRUFQOFsoKHB0cisrKT4+MCldPTA7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBpZiAoc2luZ2xlVHlwZSA9PT0gJ2k4Jykge1xuICAgIGlmIChzbGFiLnN1YmFycmF5IHx8IHNsYWIuc2xpY2UpIHtcbiAgICAgIEhFQVBVOC5zZXQoLyoqIEB0eXBlIHshVWludDhBcnJheX0gKi8gKHNsYWIpLCByZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBIRUFQVTguc2V0KG5ldyBVaW50OEFycmF5KHNsYWIpLCByZXQpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgdmFyIGkgPSAwLCB0eXBlLCB0eXBlU2l6ZSwgcHJldmlvdXNUeXBlO1xuICB3aGlsZSAoaSA8IHNpemUpIHtcbiAgICB2YXIgY3VyciA9IHNsYWJbaV07XG5cbiAgICBpZiAodHlwZW9mIGN1cnIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGN1cnIgPSBSdW50aW1lLmdldEZ1bmN0aW9uSW5kZXgoY3Vycik7XG4gICAgfVxuXG4gICAgdHlwZSA9IHNpbmdsZVR5cGUgfHwgdHlwZXNbaV07XG4gICAgaWYgKHR5cGUgPT09IDApIHtcbiAgICAgIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBhc3NlcnQodHlwZSwgJ011c3Qga25vdyB3aGF0IHR5cGUgdG8gc3RvcmUgaW4gYWxsb2NhdGUhJyk7XG5cbiAgICBpZiAodHlwZSA9PSAnaTY0JykgdHlwZSA9ICdpMzInOyAvLyBzcGVjaWFsIGNhc2U6IHdlIGhhdmUgb25lIGkzMiBoZXJlLCBhbmQgb25lIGkzMiBsYXRlclxuXG4gICAgc2V0VmFsdWUocmV0K2ksIGN1cnIsIHR5cGUpO1xuXG4gICAgLy8gbm8gbmVlZCB0byBsb29rIHVwIHNpemUgdW5sZXNzIHR5cGUgY2hhbmdlcywgc28gY2FjaGUgaXRcbiAgICBpZiAocHJldmlvdXNUeXBlICE9PSB0eXBlKSB7XG4gICAgICB0eXBlU2l6ZSA9IFJ1bnRpbWUuZ2V0TmF0aXZlVHlwZVNpemUodHlwZSk7XG4gICAgICBwcmV2aW91c1R5cGUgPSB0eXBlO1xuICAgIH1cbiAgICBpICs9IHR5cGVTaXplO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cbk1vZHVsZVtcImFsbG9jYXRlXCJdID0gYWxsb2NhdGU7XG5cbi8vIEFsbG9jYXRlIG1lbW9yeSBkdXJpbmcgYW55IHN0YWdlIG9mIHN0YXJ0dXAgLSBzdGF0aWMgbWVtb3J5IGVhcmx5IG9uLCBkeW5hbWljIG1lbW9yeSBsYXRlciwgbWFsbG9jIHdoZW4gcmVhZHlcbmZ1bmN0aW9uIGdldE1lbW9yeShzaXplKSB7XG4gIGlmICghc3RhdGljU2VhbGVkKSByZXR1cm4gUnVudGltZS5zdGF0aWNBbGxvYyhzaXplKTtcbiAgaWYgKCFydW50aW1lSW5pdGlhbGl6ZWQpIHJldHVybiBSdW50aW1lLmR5bmFtaWNBbGxvYyhzaXplKTtcbiAgcmV0dXJuIF9tYWxsb2Moc2l6ZSk7XG59XG5Nb2R1bGVbXCJnZXRNZW1vcnlcIl0gPSBnZXRNZW1vcnk7XG5cbi8qKiBAdHlwZSB7ZnVuY3Rpb24obnVtYmVyLCBudW1iZXI9KX0gKi9cbmZ1bmN0aW9uIFBvaW50ZXJfc3RyaW5naWZ5KHB0ciwgbGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPT09IDAgfHwgIXB0cikgcmV0dXJuICcnO1xuICAvLyBUT0RPOiB1c2UgVGV4dERlY29kZXJcbiAgLy8gRmluZCB0aGUgbGVuZ3RoLCBhbmQgY2hlY2sgZm9yIFVURiB3aGlsZSBkb2luZyBzb1xuICB2YXIgaGFzVXRmID0gMDtcbiAgdmFyIHQ7XG4gIHZhciBpID0gMDtcbiAgd2hpbGUgKDEpIHtcbiAgICBhc3NlcnQocHRyICsgaSA8IFRPVEFMX01FTU9SWSk7XG4gICAgdCA9IEhFQVBVOFsoKChwdHIpKyhpKSk+PjApXTtcbiAgICBoYXNVdGYgfD0gdDtcbiAgICBpZiAodCA9PSAwICYmICFsZW5ndGgpIGJyZWFrO1xuICAgIGkrKztcbiAgICBpZiAobGVuZ3RoICYmIGkgPT0gbGVuZ3RoKSBicmVhaztcbiAgfVxuICBpZiAoIWxlbmd0aCkgbGVuZ3RoID0gaTtcblxuICB2YXIgcmV0ID0gJyc7XG5cbiAgaWYgKGhhc1V0ZiA8IDEyOCkge1xuICAgIHZhciBNQVhfQ0hVTksgPSAxMDI0OyAvLyBzcGxpdCB1cCBpbnRvIGNodW5rcywgYmVjYXVzZSAuYXBwbHkgb24gYSBodWdlIHN0cmluZyBjYW4gb3ZlcmZsb3cgdGhlIHN0YWNrXG4gICAgdmFyIGN1cnI7XG4gICAgd2hpbGUgKGxlbmd0aCA+IDApIHtcbiAgICAgIGN1cnIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgSEVBUFU4LnN1YmFycmF5KHB0ciwgcHRyICsgTWF0aC5taW4obGVuZ3RoLCBNQVhfQ0hVTkspKSk7XG4gICAgICByZXQgPSByZXQgPyByZXQgKyBjdXJyIDogY3VycjtcbiAgICAgIHB0ciArPSBNQVhfQ0hVTks7XG4gICAgICBsZW5ndGggLT0gTUFYX0NIVU5LO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHJldHVybiBNb2R1bGVbJ1VURjhUb1N0cmluZyddKHB0cik7XG59XG5Nb2R1bGVbXCJQb2ludGVyX3N0cmluZ2lmeVwiXSA9IFBvaW50ZXJfc3RyaW5naWZ5O1xuXG4vLyBHaXZlbiBhIHBvaW50ZXIgJ3B0cicgdG8gYSBudWxsLXRlcm1pbmF0ZWQgQVNDSUktZW5jb2RlZCBzdHJpbmcgaW4gdGhlIGVtc2NyaXB0ZW4gSEVBUCwgcmV0dXJuc1xuLy8gYSBjb3B5IG9mIHRoYXQgc3RyaW5nIGFzIGEgSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0LlxuXG5mdW5jdGlvbiBBc2NpaVRvU3RyaW5nKHB0cikge1xuICB2YXIgc3RyID0gJyc7XG4gIHdoaWxlICgxKSB7XG4gICAgdmFyIGNoID0gSEVBUDhbKChwdHIrKyk+PjApXTtcbiAgICBpZiAoIWNoKSByZXR1cm4gc3RyO1xuICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcbiAgfVxufVxuTW9kdWxlW1wiQXNjaWlUb1N0cmluZ1wiXSA9IEFzY2lpVG9TdHJpbmc7XG5cbi8vIENvcGllcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0ICdzdHInIHRvIHRoZSBlbXNjcmlwdGVuIEhFQVAgYXQgYWRkcmVzcyAnb3V0UHRyJyxcbi8vIG51bGwtdGVybWluYXRlZCBhbmQgZW5jb2RlZCBpbiBBU0NJSSBmb3JtLiBUaGUgY29weSB3aWxsIHJlcXVpcmUgYXQgbW9zdCBzdHIubGVuZ3RoKzEgYnl0ZXMgb2Ygc3BhY2UgaW4gdGhlIEhFQVAuXG5cbmZ1bmN0aW9uIHN0cmluZ1RvQXNjaWkoc3RyLCBvdXRQdHIpIHtcbiAgcmV0dXJuIHdyaXRlQXNjaWlUb01lbW9yeShzdHIsIG91dFB0ciwgZmFsc2UpO1xufVxuTW9kdWxlW1wic3RyaW5nVG9Bc2NpaVwiXSA9IHN0cmluZ1RvQXNjaWk7XG5cbi8vIEdpdmVuIGEgcG9pbnRlciAncHRyJyB0byBhIG51bGwtdGVybWluYXRlZCBVVEY4LWVuY29kZWQgc3RyaW5nIGluIHRoZSBnaXZlbiBhcnJheSB0aGF0IGNvbnRhaW5zIHVpbnQ4IHZhbHVlcywgcmV0dXJuc1xuLy8gYSBjb3B5IG9mIHRoYXQgc3RyaW5nIGFzIGEgSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0LlxuXG52YXIgVVRGOERlY29kZXIgPSB0eXBlb2YgVGV4dERlY29kZXIgIT09ICd1bmRlZmluZWQnID8gbmV3IFRleHREZWNvZGVyKCd1dGY4JykgOiB1bmRlZmluZWQ7XG5mdW5jdGlvbiBVVEY4QXJyYXlUb1N0cmluZyh1OEFycmF5LCBpZHgpIHtcbiAgdmFyIGVuZFB0ciA9IGlkeDtcbiAgLy8gVGV4dERlY29kZXIgbmVlZHMgdG8ga25vdyB0aGUgYnl0ZSBsZW5ndGggaW4gYWR2YW5jZSwgaXQgZG9lc24ndCBzdG9wIG9uIG51bGwgdGVybWluYXRvciBieSBpdHNlbGYuXG4gIC8vIEFsc28sIHVzZSB0aGUgbGVuZ3RoIGluZm8gdG8gYXZvaWQgcnVubmluZyB0aW55IHN0cmluZ3MgdGhyb3VnaCBUZXh0RGVjb2Rlciwgc2luY2UgLnN1YmFycmF5KCkgYWxsb2NhdGVzIGdhcmJhZ2UuXG4gIHdoaWxlICh1OEFycmF5W2VuZFB0cl0pICsrZW5kUHRyO1xuXG4gIGlmIChlbmRQdHIgLSBpZHggPiAxNiAmJiB1OEFycmF5LnN1YmFycmF5ICYmIFVURjhEZWNvZGVyKSB7XG4gICAgcmV0dXJuIFVURjhEZWNvZGVyLmRlY29kZSh1OEFycmF5LnN1YmFycmF5KGlkeCwgZW5kUHRyKSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHUwLCB1MSwgdTIsIHUzLCB1NCwgdTU7XG5cbiAgICB2YXIgc3RyID0gJyc7XG4gICAgd2hpbGUgKDEpIHtcbiAgICAgIC8vIEZvciBVVEY4IGJ5dGUgc3RydWN0dXJlLCBzZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvbiBhbmQgaHR0cHM6Ly93d3cuaWV0Zi5vcmcvcmZjL3JmYzIyNzkudHh0IGFuZCBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzYyOVxuICAgICAgdTAgPSB1OEFycmF5W2lkeCsrXTtcbiAgICAgIGlmICghdTApIHJldHVybiBzdHI7XG4gICAgICBpZiAoISh1MCAmIDB4ODApKSB7IHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHUwKTsgY29udGludWU7IH1cbiAgICAgIHUxID0gdThBcnJheVtpZHgrK10gJiA2MztcbiAgICAgIGlmICgodTAgJiAweEUwKSA9PSAweEMwKSB7IHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCgodTAgJiAzMSkgPDwgNikgfCB1MSk7IGNvbnRpbnVlOyB9XG4gICAgICB1MiA9IHU4QXJyYXlbaWR4KytdICYgNjM7XG4gICAgICBpZiAoKHUwICYgMHhGMCkgPT0gMHhFMCkge1xuICAgICAgICB1MCA9ICgodTAgJiAxNSkgPDwgMTIpIHwgKHUxIDw8IDYpIHwgdTI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1MyA9IHU4QXJyYXlbaWR4KytdICYgNjM7XG4gICAgICAgIGlmICgodTAgJiAweEY4KSA9PSAweEYwKSB7XG4gICAgICAgICAgdTAgPSAoKHUwICYgNykgPDwgMTgpIHwgKHUxIDw8IDEyKSB8ICh1MiA8PCA2KSB8IHUzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHU0ID0gdThBcnJheVtpZHgrK10gJiA2MztcbiAgICAgICAgICBpZiAoKHUwICYgMHhGQykgPT0gMHhGOCkge1xuICAgICAgICAgICAgdTAgPSAoKHUwICYgMykgPDwgMjQpIHwgKHUxIDw8IDE4KSB8ICh1MiA8PCAxMikgfCAodTMgPDwgNikgfCB1NDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdTUgPSB1OEFycmF5W2lkeCsrXSAmIDYzO1xuICAgICAgICAgICAgdTAgPSAoKHUwICYgMSkgPDwgMzApIHwgKHUxIDw8IDI0KSB8ICh1MiA8PCAxOCkgfCAodTMgPDwgMTIpIHwgKHU0IDw8IDYpIHwgdTU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodTAgPCAweDEwMDAwKSB7XG4gICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaCA9IHUwIC0gMHgxMDAwMDtcbiAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhEODAwIHwgKGNoID4+IDEwKSwgMHhEQzAwIHwgKGNoICYgMHgzRkYpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbk1vZHVsZVtcIlVURjhBcnJheVRvU3RyaW5nXCJdID0gVVRGOEFycmF5VG9TdHJpbmc7XG5cbi8vIEdpdmVuIGEgcG9pbnRlciAncHRyJyB0byBhIG51bGwtdGVybWluYXRlZCBVVEY4LWVuY29kZWQgc3RyaW5nIGluIHRoZSBlbXNjcmlwdGVuIEhFQVAsIHJldHVybnNcbi8vIGEgY29weSBvZiB0aGF0IHN0cmluZyBhcyBhIEphdmFzY3JpcHQgU3RyaW5nIG9iamVjdC5cblxuZnVuY3Rpb24gVVRGOFRvU3RyaW5nKHB0cikge1xuICByZXR1cm4gVVRGOEFycmF5VG9TdHJpbmcoSEVBUFU4LHB0cik7XG59XG5Nb2R1bGVbXCJVVEY4VG9TdHJpbmdcIl0gPSBVVEY4VG9TdHJpbmc7XG5cbi8vIENvcGllcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0ICdzdHInIHRvIHRoZSBnaXZlbiBieXRlIGFycmF5IGF0IGFkZHJlc3MgJ291dElkeCcsXG4vLyBlbmNvZGVkIGluIFVURjggZm9ybSBhbmQgbnVsbC10ZXJtaW5hdGVkLiBUaGUgY29weSB3aWxsIHJlcXVpcmUgYXQgbW9zdCBzdHIubGVuZ3RoKjQrMSBieXRlcyBvZiBzcGFjZSBpbiB0aGUgSEVBUC5cbi8vIFVzZSB0aGUgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4IHRvIGNvbXB1dGUgdGhlIGV4YWN0IG51bWJlciBvZiBieXRlcyAoZXhjbHVkaW5nIG51bGwgdGVybWluYXRvcikgdGhhdCB0aGlzIGZ1bmN0aW9uIHdpbGwgd3JpdGUuXG4vLyBQYXJhbWV0ZXJzOlxuLy8gICBzdHI6IHRoZSBKYXZhc2NyaXB0IHN0cmluZyB0byBjb3B5LlxuLy8gICBvdXRVOEFycmF5OiB0aGUgYXJyYXkgdG8gY29weSB0by4gRWFjaCBpbmRleCBpbiB0aGlzIGFycmF5IGlzIGFzc3VtZWQgdG8gYmUgb25lIDgtYnl0ZSBlbGVtZW50LlxuLy8gICBvdXRJZHg6IFRoZSBzdGFydGluZyBvZmZzZXQgaW4gdGhlIGFycmF5IHRvIGJlZ2luIHRoZSBjb3B5aW5nLlxuLy8gICBtYXhCeXRlc1RvV3JpdGU6IFRoZSBtYXhpbXVtIG51bWJlciBvZiBieXRlcyB0aGlzIGZ1bmN0aW9uIGNhbiB3cml0ZSB0byB0aGUgYXJyYXkuIFRoaXMgY291bnQgc2hvdWxkIGluY2x1ZGUgdGhlIG51bGxcbi8vICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hdG9yLCBpLmUuIGlmIG1heEJ5dGVzVG9Xcml0ZT0xLCBvbmx5IHRoZSBudWxsIHRlcm1pbmF0b3Igd2lsbCBiZSB3cml0dGVuIGFuZCBub3RoaW5nIGVsc2UuXG4vLyAgICAgICAgICAgICAgICAgICAgbWF4Qnl0ZXNUb1dyaXRlPTAgZG9lcyBub3Qgd3JpdGUgYW55IGJ5dGVzIHRvIHRoZSBvdXRwdXQsIG5vdCBldmVuIHRoZSBudWxsIHRlcm1pbmF0b3IuXG4vLyBSZXR1cm5zIHRoZSBudW1iZXIgb2YgYnl0ZXMgd3JpdHRlbiwgRVhDTFVESU5HIHRoZSBudWxsIHRlcm1pbmF0b3IuXG5cbmZ1bmN0aW9uIHN0cmluZ1RvVVRGOEFycmF5KHN0ciwgb3V0VThBcnJheSwgb3V0SWR4LCBtYXhCeXRlc1RvV3JpdGUpIHtcbiAgaWYgKCEobWF4Qnl0ZXNUb1dyaXRlID4gMCkpIC8vIFBhcmFtZXRlciBtYXhCeXRlc1RvV3JpdGUgaXMgbm90IG9wdGlvbmFsLiBOZWdhdGl2ZSB2YWx1ZXMsIDAsIG51bGwsIHVuZGVmaW5lZCBhbmQgZmFsc2UgZWFjaCBkb24ndCB3cml0ZSBvdXQgYW55IGJ5dGVzLlxuICAgIHJldHVybiAwO1xuXG4gIHZhciBzdGFydElkeCA9IG91dElkeDtcbiAgdmFyIGVuZElkeCA9IG91dElkeCArIG1heEJ5dGVzVG9Xcml0ZSAtIDE7IC8vIC0xIGZvciBzdHJpbmcgbnVsbCB0ZXJtaW5hdG9yLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIEdvdGNoYTogY2hhckNvZGVBdCByZXR1cm5zIGEgMTYtYml0IHdvcmQgdGhhdCBpcyBhIFVURi0xNiBlbmNvZGVkIGNvZGUgdW5pdCwgbm90IGEgVW5pY29kZSBjb2RlIHBvaW50IG9mIHRoZSBjaGFyYWN0ZXIhIFNvIGRlY29kZSBVVEYxNi0+VVRGMzItPlVURjguXG4gICAgLy8gU2VlIGh0dHA6Ly91bmljb2RlLm9yZy9mYXEvdXRmX2JvbS5odG1sI3V0ZjE2LTNcbiAgICAvLyBGb3IgVVRGOCBieXRlIHN0cnVjdHVyZSwgc2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVVRGLTgjRGVzY3JpcHRpb24gYW5kIGh0dHBzOi8vd3d3LmlldGYub3JnL3JmYy9yZmMyMjc5LnR4dCBhbmQgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM2MjlcbiAgICB2YXIgdSA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBwb3NzaWJseSBhIGxlYWQgc3Vycm9nYXRlXG4gICAgaWYgKHUgPj0gMHhEODAwICYmIHUgPD0gMHhERkZGKSB1ID0gMHgxMDAwMCArICgodSAmIDB4M0ZGKSA8PCAxMCkgfCAoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4M0ZGKTtcbiAgICBpZiAodSA8PSAweDdGKSB7XG4gICAgICBpZiAob3V0SWR4ID49IGVuZElkeCkgYnJlYWs7XG4gICAgICBvdXRVOEFycmF5W291dElkeCsrXSA9IHU7XG4gICAgfSBlbHNlIGlmICh1IDw9IDB4N0ZGKSB7XG4gICAgICBpZiAob3V0SWR4ICsgMSA+PSBlbmRJZHgpIGJyZWFrO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweEMwIHwgKHUgPj4gNik7XG4gICAgICBvdXRVOEFycmF5W291dElkeCsrXSA9IDB4ODAgfCAodSAmIDYzKTtcbiAgICB9IGVsc2UgaWYgKHUgPD0gMHhGRkZGKSB7XG4gICAgICBpZiAob3V0SWR4ICsgMiA+PSBlbmRJZHgpIGJyZWFrO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweEUwIHwgKHUgPj4gMTIpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKCh1ID4+IDYpICYgNjMpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKHUgJiA2Myk7XG4gICAgfSBlbHNlIGlmICh1IDw9IDB4MUZGRkZGKSB7XG4gICAgICBpZiAob3V0SWR4ICsgMyA+PSBlbmRJZHgpIGJyZWFrO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweEYwIHwgKHUgPj4gMTgpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKCh1ID4+IDEyKSAmIDYzKTtcbiAgICAgIG91dFU4QXJyYXlbb3V0SWR4KytdID0gMHg4MCB8ICgodSA+PiA2KSAmIDYzKTtcbiAgICAgIG91dFU4QXJyYXlbb3V0SWR4KytdID0gMHg4MCB8ICh1ICYgNjMpO1xuICAgIH0gZWxzZSBpZiAodSA8PSAweDNGRkZGRkYpIHtcbiAgICAgIGlmIChvdXRJZHggKyA0ID49IGVuZElkeCkgYnJlYWs7XG4gICAgICBvdXRVOEFycmF5W291dElkeCsrXSA9IDB4RjggfCAodSA+PiAyNCk7XG4gICAgICBvdXRVOEFycmF5W291dElkeCsrXSA9IDB4ODAgfCAoKHUgPj4gMTgpICYgNjMpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKCh1ID4+IDEyKSAmIDYzKTtcbiAgICAgIG91dFU4QXJyYXlbb3V0SWR4KytdID0gMHg4MCB8ICgodSA+PiA2KSAmIDYzKTtcbiAgICAgIG91dFU4QXJyYXlbb3V0SWR4KytdID0gMHg4MCB8ICh1ICYgNjMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3V0SWR4ICsgNSA+PSBlbmRJZHgpIGJyZWFrO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweEZDIHwgKHUgPj4gMzApO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKCh1ID4+IDI0KSAmIDYzKTtcbiAgICAgIG91dFU4QXJyYXlbb3V0SWR4KytdID0gMHg4MCB8ICgodSA+PiAxOCkgJiA2Myk7XG4gICAgICBvdXRVOEFycmF5W291dElkeCsrXSA9IDB4ODAgfCAoKHUgPj4gMTIpICYgNjMpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKCh1ID4+IDYpICYgNjMpO1xuICAgICAgb3V0VThBcnJheVtvdXRJZHgrK10gPSAweDgwIHwgKHUgJiA2Myk7XG4gICAgfVxuICB9XG4gIC8vIE51bGwtdGVybWluYXRlIHRoZSBwb2ludGVyIHRvIHRoZSBidWZmZXIuXG4gIG91dFU4QXJyYXlbb3V0SWR4XSA9IDA7XG4gIHJldHVybiBvdXRJZHggLSBzdGFydElkeDtcbn1cbk1vZHVsZVtcInN0cmluZ1RvVVRGOEFycmF5XCJdID0gc3RyaW5nVG9VVEY4QXJyYXk7XG5cbi8vIENvcGllcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0ICdzdHInIHRvIHRoZSBlbXNjcmlwdGVuIEhFQVAgYXQgYWRkcmVzcyAnb3V0UHRyJyxcbi8vIG51bGwtdGVybWluYXRlZCBhbmQgZW5jb2RlZCBpbiBVVEY4IGZvcm0uIFRoZSBjb3B5IHdpbGwgcmVxdWlyZSBhdCBtb3N0IHN0ci5sZW5ndGgqNCsxIGJ5dGVzIG9mIHNwYWNlIGluIHRoZSBIRUFQLlxuLy8gVXNlIHRoZSBmdW5jdGlvbiBsZW5ndGhCeXRlc1VURjggdG8gY29tcHV0ZSB0aGUgZXhhY3QgbnVtYmVyIG9mIGJ5dGVzIChleGNsdWRpbmcgbnVsbCB0ZXJtaW5hdG9yKSB0aGF0IHRoaXMgZnVuY3Rpb24gd2lsbCB3cml0ZS5cbi8vIFJldHVybnMgdGhlIG51bWJlciBvZiBieXRlcyB3cml0dGVuLCBFWENMVURJTkcgdGhlIG51bGwgdGVybWluYXRvci5cblxuZnVuY3Rpb24gc3RyaW5nVG9VVEY4KHN0ciwgb3V0UHRyLCBtYXhCeXRlc1RvV3JpdGUpIHtcbiAgYXNzZXJ0KHR5cGVvZiBtYXhCeXRlc1RvV3JpdGUgPT0gJ251bWJlcicsICdzdHJpbmdUb1VURjgoc3RyLCBvdXRQdHIsIG1heEJ5dGVzVG9Xcml0ZSkgaXMgbWlzc2luZyB0aGUgdGhpcmQgcGFyYW1ldGVyIHRoYXQgc3BlY2lmaWVzIHRoZSBsZW5ndGggb2YgdGhlIG91dHB1dCBidWZmZXIhJyk7XG4gIHJldHVybiBzdHJpbmdUb1VURjhBcnJheShzdHIsIEhFQVBVOCxvdXRQdHIsIG1heEJ5dGVzVG9Xcml0ZSk7XG59XG5Nb2R1bGVbXCJzdHJpbmdUb1VURjhcIl0gPSBzdHJpbmdUb1VURjg7XG5cbi8vIFJldHVybnMgdGhlIG51bWJlciBvZiBieXRlcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBzdHJpbmcgdGFrZXMgaWYgZW5jb2RlZCBhcyBhIFVURjggYnl0ZSBhcnJheSwgRVhDTFVESU5HIHRoZSBudWxsIHRlcm1pbmF0b3IgYnl0ZS5cblxuZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4KHN0cikge1xuICB2YXIgbGVuID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBHb3RjaGE6IGNoYXJDb2RlQXQgcmV0dXJucyBhIDE2LWJpdCB3b3JkIHRoYXQgaXMgYSBVVEYtMTYgZW5jb2RlZCBjb2RlIHVuaXQsIG5vdCBhIFVuaWNvZGUgY29kZSBwb2ludCBvZiB0aGUgY2hhcmFjdGVyISBTbyBkZWNvZGUgVVRGMTYtPlVURjMyLT5VVEY4LlxuICAgIC8vIFNlZSBodHRwOi8vdW5pY29kZS5vcmcvZmFxL3V0Zl9ib20uaHRtbCN1dGYxNi0zXG4gICAgdmFyIHUgPSBzdHIuY2hhckNvZGVBdChpKTsgLy8gcG9zc2libHkgYSBsZWFkIHN1cnJvZ2F0ZVxuICAgIGlmICh1ID49IDB4RDgwMCAmJiB1IDw9IDB4REZGRikgdSA9IDB4MTAwMDAgKyAoKHUgJiAweDNGRikgPDwgMTApIHwgKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweDNGRik7XG4gICAgaWYgKHUgPD0gMHg3Rikge1xuICAgICAgKytsZW47XG4gICAgfSBlbHNlIGlmICh1IDw9IDB4N0ZGKSB7XG4gICAgICBsZW4gKz0gMjtcbiAgICB9IGVsc2UgaWYgKHUgPD0gMHhGRkZGKSB7XG4gICAgICBsZW4gKz0gMztcbiAgICB9IGVsc2UgaWYgKHUgPD0gMHgxRkZGRkYpIHtcbiAgICAgIGxlbiArPSA0O1xuICAgIH0gZWxzZSBpZiAodSA8PSAweDNGRkZGRkYpIHtcbiAgICAgIGxlbiArPSA1O1xuICAgIH0gZWxzZSB7XG4gICAgICBsZW4gKz0gNjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxlbjtcbn1cbk1vZHVsZVtcImxlbmd0aEJ5dGVzVVRGOFwiXSA9IGxlbmd0aEJ5dGVzVVRGODtcblxuLy8gR2l2ZW4gYSBwb2ludGVyICdwdHInIHRvIGEgbnVsbC10ZXJtaW5hdGVkIFVURjE2TEUtZW5jb2RlZCBzdHJpbmcgaW4gdGhlIGVtc2NyaXB0ZW4gSEVBUCwgcmV0dXJuc1xuLy8gYSBjb3B5IG9mIHRoYXQgc3RyaW5nIGFzIGEgSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0LlxuXG52YXIgVVRGMTZEZWNvZGVyID0gdHlwZW9mIFRleHREZWNvZGVyICE9PSAndW5kZWZpbmVkJyA/IG5ldyBUZXh0RGVjb2RlcigndXRmLTE2bGUnKSA6IHVuZGVmaW5lZDtcbmZ1bmN0aW9uIFVURjE2VG9TdHJpbmcocHRyKSB7XG4gIGFzc2VydChwdHIgJSAyID09IDAsICdQb2ludGVyIHBhc3NlZCB0byBVVEYxNlRvU3RyaW5nIG11c3QgYmUgYWxpZ25lZCB0byB0d28gYnl0ZXMhJyk7XG4gIHZhciBlbmRQdHIgPSBwdHI7XG4gIC8vIFRleHREZWNvZGVyIG5lZWRzIHRvIGtub3cgdGhlIGJ5dGUgbGVuZ3RoIGluIGFkdmFuY2UsIGl0IGRvZXNuJ3Qgc3RvcCBvbiBudWxsIHRlcm1pbmF0b3IgYnkgaXRzZWxmLlxuICAvLyBBbHNvLCB1c2UgdGhlIGxlbmd0aCBpbmZvIHRvIGF2b2lkIHJ1bm5pbmcgdGlueSBzdHJpbmdzIHRocm91Z2ggVGV4dERlY29kZXIsIHNpbmNlIC5zdWJhcnJheSgpIGFsbG9jYXRlcyBnYXJiYWdlLlxuICB2YXIgaWR4ID0gZW5kUHRyID4+IDE7XG4gIHdoaWxlIChIRUFQMTZbaWR4XSkgKytpZHg7XG4gIGVuZFB0ciA9IGlkeCA8PCAxO1xuXG4gIGlmIChlbmRQdHIgLSBwdHIgPiAzMiAmJiBVVEYxNkRlY29kZXIpIHtcbiAgICByZXR1cm4gVVRGMTZEZWNvZGVyLmRlY29kZShIRUFQVTguc3ViYXJyYXkocHRyLCBlbmRQdHIpKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaSA9IDA7XG5cbiAgICB2YXIgc3RyID0gJyc7XG4gICAgd2hpbGUgKDEpIHtcbiAgICAgIHZhciBjb2RlVW5pdCA9IEhFQVAxNlsoKChwdHIpKyhpKjIpKT4+MSldO1xuICAgICAgaWYgKGNvZGVVbml0ID09IDApIHJldHVybiBzdHI7XG4gICAgICArK2k7XG4gICAgICAvLyBmcm9tQ2hhckNvZGUgY29uc3RydWN0cyBhIGNoYXJhY3RlciBmcm9tIGEgVVRGLTE2IGNvZGUgdW5pdCwgc28gd2UgY2FuIHBhc3MgdGhlIFVURjE2IHN0cmluZyByaWdodCB0aHJvdWdoLlxuICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVVuaXQpO1xuICAgIH1cbiAgfVxufVxuXG5cbi8vIENvcGllcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBTdHJpbmcgb2JqZWN0ICdzdHInIHRvIHRoZSBlbXNjcmlwdGVuIEhFQVAgYXQgYWRkcmVzcyAnb3V0UHRyJyxcbi8vIG51bGwtdGVybWluYXRlZCBhbmQgZW5jb2RlZCBpbiBVVEYxNiBmb3JtLiBUaGUgY29weSB3aWxsIHJlcXVpcmUgYXQgbW9zdCBzdHIubGVuZ3RoKjQrMiBieXRlcyBvZiBzcGFjZSBpbiB0aGUgSEVBUC5cbi8vIFVzZSB0aGUgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEYxNigpIHRvIGNvbXB1dGUgdGhlIGV4YWN0IG51bWJlciBvZiBieXRlcyAoZXhjbHVkaW5nIG51bGwgdGVybWluYXRvcikgdGhhdCB0aGlzIGZ1bmN0aW9uIHdpbGwgd3JpdGUuXG4vLyBQYXJhbWV0ZXJzOlxuLy8gICBzdHI6IHRoZSBKYXZhc2NyaXB0IHN0cmluZyB0byBjb3B5LlxuLy8gICBvdXRQdHI6IEJ5dGUgYWRkcmVzcyBpbiBFbXNjcmlwdGVuIEhFQVAgd2hlcmUgdG8gd3JpdGUgdGhlIHN0cmluZyB0by5cbi8vICAgbWF4Qnl0ZXNUb1dyaXRlOiBUaGUgbWF4aW11bSBudW1iZXIgb2YgYnl0ZXMgdGhpcyBmdW5jdGlvbiBjYW4gd3JpdGUgdG8gdGhlIGFycmF5LiBUaGlzIGNvdW50IHNob3VsZCBpbmNsdWRlIHRoZSBudWxsXG4vLyAgICAgICAgICAgICAgICAgICAgdGVybWluYXRvciwgaS5lLiBpZiBtYXhCeXRlc1RvV3JpdGU9Miwgb25seSB0aGUgbnVsbCB0ZXJtaW5hdG9yIHdpbGwgYmUgd3JpdHRlbiBhbmQgbm90aGluZyBlbHNlLlxuLy8gICAgICAgICAgICAgICAgICAgIG1heEJ5dGVzVG9Xcml0ZTwyIGRvZXMgbm90IHdyaXRlIGFueSBieXRlcyB0byB0aGUgb3V0cHV0LCBub3QgZXZlbiB0aGUgbnVsbCB0ZXJtaW5hdG9yLlxuLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4sIEVYQ0xVRElORyB0aGUgbnVsbCB0ZXJtaW5hdG9yLlxuXG5mdW5jdGlvbiBzdHJpbmdUb1VURjE2KHN0ciwgb3V0UHRyLCBtYXhCeXRlc1RvV3JpdGUpIHtcbiAgYXNzZXJ0KG91dFB0ciAlIDIgPT0gMCwgJ1BvaW50ZXIgcGFzc2VkIHRvIHN0cmluZ1RvVVRGMTYgbXVzdCBiZSBhbGlnbmVkIHRvIHR3byBieXRlcyEnKTtcbiAgYXNzZXJ0KHR5cGVvZiBtYXhCeXRlc1RvV3JpdGUgPT0gJ251bWJlcicsICdzdHJpbmdUb1VURjE2KHN0ciwgb3V0UHRyLCBtYXhCeXRlc1RvV3JpdGUpIGlzIG1pc3NpbmcgdGhlIHRoaXJkIHBhcmFtZXRlciB0aGF0IHNwZWNpZmllcyB0aGUgbGVuZ3RoIG9mIHRoZSBvdXRwdXQgYnVmZmVyIScpO1xuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogaWYgbWF4IGJ5dGVzIGlzIG5vdCBzcGVjaWZpZWQsIGFzc3VtZSB1bnNhZmUgdW5ib3VuZGVkIHdyaXRlIGlzIGFsbG93ZWQuXG4gIGlmIChtYXhCeXRlc1RvV3JpdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIG1heEJ5dGVzVG9Xcml0ZSA9IDB4N0ZGRkZGRkY7XG4gIH1cbiAgaWYgKG1heEJ5dGVzVG9Xcml0ZSA8IDIpIHJldHVybiAwO1xuICBtYXhCeXRlc1RvV3JpdGUgLT0gMjsgLy8gTnVsbCB0ZXJtaW5hdG9yLlxuICB2YXIgc3RhcnRQdHIgPSBvdXRQdHI7XG4gIHZhciBudW1DaGFyc1RvV3JpdGUgPSAobWF4Qnl0ZXNUb1dyaXRlIDwgc3RyLmxlbmd0aCoyKSA/IChtYXhCeXRlc1RvV3JpdGUgLyAyKSA6IHN0ci5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ2hhcnNUb1dyaXRlOyArK2kpIHtcbiAgICAvLyBjaGFyQ29kZUF0IHJldHVybnMgYSBVVEYtMTYgZW5jb2RlZCBjb2RlIHVuaXQsIHNvIGl0IGNhbiBiZSBkaXJlY3RseSB3cml0dGVuIHRvIHRoZSBIRUFQLlxuICAgIHZhciBjb2RlVW5pdCA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBwb3NzaWJseSBhIGxlYWQgc3Vycm9nYXRlXG4gICAgSEVBUDE2Wygob3V0UHRyKT4+MSldPWNvZGVVbml0O1xuICAgIG91dFB0ciArPSAyO1xuICB9XG4gIC8vIE51bGwtdGVybWluYXRlIHRoZSBwb2ludGVyIHRvIHRoZSBIRUFQLlxuICBIRUFQMTZbKChvdXRQdHIpPj4xKV09MDtcbiAgcmV0dXJuIG91dFB0ciAtIHN0YXJ0UHRyO1xufVxuXG5cbi8vIFJldHVybnMgdGhlIG51bWJlciBvZiBieXRlcyB0aGUgZ2l2ZW4gSmF2YXNjcmlwdCBzdHJpbmcgdGFrZXMgaWYgZW5jb2RlZCBhcyBhIFVURjE2IGJ5dGUgYXJyYXksIEVYQ0xVRElORyB0aGUgbnVsbCB0ZXJtaW5hdG9yIGJ5dGUuXG5cbmZ1bmN0aW9uIGxlbmd0aEJ5dGVzVVRGMTYoc3RyKSB7XG4gIHJldHVybiBzdHIubGVuZ3RoKjI7XG59XG5cblxuZnVuY3Rpb24gVVRGMzJUb1N0cmluZyhwdHIpIHtcbiAgYXNzZXJ0KHB0ciAlIDQgPT0gMCwgJ1BvaW50ZXIgcGFzc2VkIHRvIFVURjMyVG9TdHJpbmcgbXVzdCBiZSBhbGlnbmVkIHRvIGZvdXIgYnl0ZXMhJyk7XG4gIHZhciBpID0gMDtcblxuICB2YXIgc3RyID0gJyc7XG4gIHdoaWxlICgxKSB7XG4gICAgdmFyIHV0ZjMyID0gSEVBUDMyWygoKHB0cikrKGkqNCkpPj4yKV07XG4gICAgaWYgKHV0ZjMyID09IDApXG4gICAgICByZXR1cm4gc3RyO1xuICAgICsraTtcbiAgICAvLyBHb3RjaGE6IGZyb21DaGFyQ29kZSBjb25zdHJ1Y3RzIGEgY2hhcmFjdGVyIGZyb20gYSBVVEYtMTYgZW5jb2RlZCBjb2RlIChwYWlyKSwgbm90IGZyb20gYSBVbmljb2RlIGNvZGUgcG9pbnQhIFNvIGVuY29kZSB0aGUgY29kZSBwb2ludCB0byBVVEYtMTYgZm9yIGNvbnN0cnVjdGluZy5cbiAgICAvLyBTZWUgaHR0cDovL3VuaWNvZGUub3JnL2ZhcS91dGZfYm9tLmh0bWwjdXRmMTYtM1xuICAgIGlmICh1dGYzMiA+PSAweDEwMDAwKSB7XG4gICAgICB2YXIgY2ggPSB1dGYzMiAtIDB4MTAwMDA7XG4gICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgweEQ4MDAgfCAoY2ggPj4gMTApLCAweERDMDAgfCAoY2ggJiAweDNGRikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSh1dGYzMik7XG4gICAgfVxuICB9XG59XG5cblxuLy8gQ29waWVzIHRoZSBnaXZlbiBKYXZhc2NyaXB0IFN0cmluZyBvYmplY3QgJ3N0cicgdG8gdGhlIGVtc2NyaXB0ZW4gSEVBUCBhdCBhZGRyZXNzICdvdXRQdHInLFxuLy8gbnVsbC10ZXJtaW5hdGVkIGFuZCBlbmNvZGVkIGluIFVURjMyIGZvcm0uIFRoZSBjb3B5IHdpbGwgcmVxdWlyZSBhdCBtb3N0IHN0ci5sZW5ndGgqNCs0IGJ5dGVzIG9mIHNwYWNlIGluIHRoZSBIRUFQLlxuLy8gVXNlIHRoZSBmdW5jdGlvbiBsZW5ndGhCeXRlc1VURjMyKCkgdG8gY29tcHV0ZSB0aGUgZXhhY3QgbnVtYmVyIG9mIGJ5dGVzIChleGNsdWRpbmcgbnVsbCB0ZXJtaW5hdG9yKSB0aGF0IHRoaXMgZnVuY3Rpb24gd2lsbCB3cml0ZS5cbi8vIFBhcmFtZXRlcnM6XG4vLyAgIHN0cjogdGhlIEphdmFzY3JpcHQgc3RyaW5nIHRvIGNvcHkuXG4vLyAgIG91dFB0cjogQnl0ZSBhZGRyZXNzIGluIEVtc2NyaXB0ZW4gSEVBUCB3aGVyZSB0byB3cml0ZSB0aGUgc3RyaW5nIHRvLlxuLy8gICBtYXhCeXRlc1RvV3JpdGU6IFRoZSBtYXhpbXVtIG51bWJlciBvZiBieXRlcyB0aGlzIGZ1bmN0aW9uIGNhbiB3cml0ZSB0byB0aGUgYXJyYXkuIFRoaXMgY291bnQgc2hvdWxkIGluY2x1ZGUgdGhlIG51bGxcbi8vICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hdG9yLCBpLmUuIGlmIG1heEJ5dGVzVG9Xcml0ZT00LCBvbmx5IHRoZSBudWxsIHRlcm1pbmF0b3Igd2lsbCBiZSB3cml0dGVuIGFuZCBub3RoaW5nIGVsc2UuXG4vLyAgICAgICAgICAgICAgICAgICAgbWF4Qnl0ZXNUb1dyaXRlPDQgZG9lcyBub3Qgd3JpdGUgYW55IGJ5dGVzIHRvIHRoZSBvdXRwdXQsIG5vdCBldmVuIHRoZSBudWxsIHRlcm1pbmF0b3IuXG4vLyBSZXR1cm5zIHRoZSBudW1iZXIgb2YgYnl0ZXMgd3JpdHRlbiwgRVhDTFVESU5HIHRoZSBudWxsIHRlcm1pbmF0b3IuXG5cbmZ1bmN0aW9uIHN0cmluZ1RvVVRGMzIoc3RyLCBvdXRQdHIsIG1heEJ5dGVzVG9Xcml0ZSkge1xuICBhc3NlcnQob3V0UHRyICUgNCA9PSAwLCAnUG9pbnRlciBwYXNzZWQgdG8gc3RyaW5nVG9VVEYzMiBtdXN0IGJlIGFsaWduZWQgdG8gZm91ciBieXRlcyEnKTtcbiAgYXNzZXJ0KHR5cGVvZiBtYXhCeXRlc1RvV3JpdGUgPT0gJ251bWJlcicsICdzdHJpbmdUb1VURjMyKHN0ciwgb3V0UHRyLCBtYXhCeXRlc1RvV3JpdGUpIGlzIG1pc3NpbmcgdGhlIHRoaXJkIHBhcmFtZXRlciB0aGF0IHNwZWNpZmllcyB0aGUgbGVuZ3RoIG9mIHRoZSBvdXRwdXQgYnVmZmVyIScpO1xuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogaWYgbWF4IGJ5dGVzIGlzIG5vdCBzcGVjaWZpZWQsIGFzc3VtZSB1bnNhZmUgdW5ib3VuZGVkIHdyaXRlIGlzIGFsbG93ZWQuXG4gIGlmIChtYXhCeXRlc1RvV3JpdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIG1heEJ5dGVzVG9Xcml0ZSA9IDB4N0ZGRkZGRkY7XG4gIH1cbiAgaWYgKG1heEJ5dGVzVG9Xcml0ZSA8IDQpIHJldHVybiAwO1xuICB2YXIgc3RhcnRQdHIgPSBvdXRQdHI7XG4gIHZhciBlbmRQdHIgPSBzdGFydFB0ciArIG1heEJ5dGVzVG9Xcml0ZSAtIDQ7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gR290Y2hhOiBjaGFyQ29kZUF0IHJldHVybnMgYSAxNi1iaXQgd29yZCB0aGF0IGlzIGEgVVRGLTE2IGVuY29kZWQgY29kZSB1bml0LCBub3QgYSBVbmljb2RlIGNvZGUgcG9pbnQgb2YgdGhlIGNoYXJhY3RlciEgV2UgbXVzdCBkZWNvZGUgdGhlIHN0cmluZyB0byBVVEYtMzIgdG8gdGhlIGhlYXAuXG4gICAgLy8gU2VlIGh0dHA6Ly91bmljb2RlLm9yZy9mYXEvdXRmX2JvbS5odG1sI3V0ZjE2LTNcbiAgICB2YXIgY29kZVVuaXQgPSBzdHIuY2hhckNvZGVBdChpKTsgLy8gcG9zc2libHkgYSBsZWFkIHN1cnJvZ2F0ZVxuICAgIGlmIChjb2RlVW5pdCA+PSAweEQ4MDAgJiYgY29kZVVuaXQgPD0gMHhERkZGKSB7XG4gICAgICB2YXIgdHJhaWxTdXJyb2dhdGUgPSBzdHIuY2hhckNvZGVBdCgrK2kpO1xuICAgICAgY29kZVVuaXQgPSAweDEwMDAwICsgKChjb2RlVW5pdCAmIDB4M0ZGKSA8PCAxMCkgfCAodHJhaWxTdXJyb2dhdGUgJiAweDNGRik7XG4gICAgfVxuICAgIEhFQVAzMlsoKG91dFB0cik+PjIpXT1jb2RlVW5pdDtcbiAgICBvdXRQdHIgKz0gNDtcbiAgICBpZiAob3V0UHRyICsgNCA+IGVuZFB0cikgYnJlYWs7XG4gIH1cbiAgLy8gTnVsbC10ZXJtaW5hdGUgdGhlIHBvaW50ZXIgdG8gdGhlIEhFQVAuXG4gIEhFQVAzMlsoKG91dFB0cik+PjIpXT0wO1xuICByZXR1cm4gb3V0UHRyIC0gc3RhcnRQdHI7XG59XG5cblxuLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGJ5dGVzIHRoZSBnaXZlbiBKYXZhc2NyaXB0IHN0cmluZyB0YWtlcyBpZiBlbmNvZGVkIGFzIGEgVVRGMTYgYnl0ZSBhcnJheSwgRVhDTFVESU5HIHRoZSBudWxsIHRlcm1pbmF0b3IgYnl0ZS5cblxuZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEYzMihzdHIpIHtcbiAgdmFyIGxlbiA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gR290Y2hhOiBjaGFyQ29kZUF0IHJldHVybnMgYSAxNi1iaXQgd29yZCB0aGF0IGlzIGEgVVRGLTE2IGVuY29kZWQgY29kZSB1bml0LCBub3QgYSBVbmljb2RlIGNvZGUgcG9pbnQgb2YgdGhlIGNoYXJhY3RlciEgV2UgbXVzdCBkZWNvZGUgdGhlIHN0cmluZyB0byBVVEYtMzIgdG8gdGhlIGhlYXAuXG4gICAgLy8gU2VlIGh0dHA6Ly91bmljb2RlLm9yZy9mYXEvdXRmX2JvbS5odG1sI3V0ZjE2LTNcbiAgICB2YXIgY29kZVVuaXQgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICBpZiAoY29kZVVuaXQgPj0gMHhEODAwICYmIGNvZGVVbml0IDw9IDB4REZGRikgKytpOyAvLyBwb3NzaWJseSBhIGxlYWQgc3Vycm9nYXRlLCBzbyBza2lwIG92ZXIgdGhlIHRhaWwgc3Vycm9nYXRlLlxuICAgIGxlbiArPSA0O1xuICB9XG5cbiAgcmV0dXJuIGxlbjtcbn1cblxuXG5mdW5jdGlvbiBkZW1hbmdsZShmdW5jKSB7XG4gIHZhciBfX2N4YV9kZW1hbmdsZV9mdW5jID0gTW9kdWxlWydfX19jeGFfZGVtYW5nbGUnXSB8fCBNb2R1bGVbJ19fY3hhX2RlbWFuZ2xlJ107XG4gIGlmIChfX2N4YV9kZW1hbmdsZV9mdW5jKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBzID1cbiAgICAgICAgZnVuYy5zdWJzdHIoMSk7XG4gICAgICB2YXIgbGVuID0gbGVuZ3RoQnl0ZXNVVEY4KHMpKzE7XG4gICAgICB2YXIgYnVmID0gX21hbGxvYyhsZW4pO1xuICAgICAgc3RyaW5nVG9VVEY4KHMsIGJ1ZiwgbGVuKTtcbiAgICAgIHZhciBzdGF0dXMgPSBfbWFsbG9jKDQpO1xuICAgICAgdmFyIHJldCA9IF9fY3hhX2RlbWFuZ2xlX2Z1bmMoYnVmLCAwLCAwLCBzdGF0dXMpO1xuICAgICAgaWYgKGdldFZhbHVlKHN0YXR1cywgJ2kzMicpID09PSAwICYmIHJldCkge1xuICAgICAgICByZXR1cm4gUG9pbnRlcl9zdHJpbmdpZnkocmV0KTtcbiAgICAgIH1cbiAgICAgIC8vIG90aGVyd2lzZSwgbGliY3h4YWJpIGZhaWxlZFxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgLy8gaWdub3JlIHByb2JsZW1zIGhlcmVcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGJ1ZikgX2ZyZWUoYnVmKTtcbiAgICAgIGlmIChzdGF0dXMpIF9mcmVlKHN0YXR1cyk7XG4gICAgICBpZiAocmV0KSBfZnJlZShyZXQpO1xuICAgIH1cbiAgICAvLyBmYWlsdXJlIHdoZW4gdXNpbmcgbGliY3h4YWJpLCBkb24ndCBkZW1hbmdsZVxuICAgIHJldHVybiBmdW5jO1xuICB9XG4gIFJ1bnRpbWUud2Fybk9uY2UoJ3dhcm5pbmc6IGJ1aWxkIHdpdGggIC1zIERFTUFOR0xFX1NVUFBPUlQ9MSAgdG8gbGluayBpbiBsaWJjeHhhYmkgZGVtYW5nbGluZycpO1xuICByZXR1cm4gZnVuYztcbn1cblxuZnVuY3Rpb24gZGVtYW5nbGVBbGwodGV4dCkge1xuICB2YXIgcmVnZXggPVxuICAgIC9fX1pbXFx3XFxkX10rL2c7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UocmVnZXgsXG4gICAgZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIHkgPSBkZW1hbmdsZSh4KTtcbiAgICAgIHJldHVybiB4ID09PSB5ID8geCA6ICh4ICsgJyBbJyArIHkgKyAnXScpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBqc1N0YWNrVHJhY2UoKSB7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgaWYgKCFlcnIuc3RhY2spIHtcbiAgICAvLyBJRTEwKyBzcGVjaWFsIGNhc2VzOiBJdCBkb2VzIGhhdmUgY2FsbHN0YWNrIGluZm8sIGJ1dCBpdCBpcyBvbmx5IHBvcHVsYXRlZCBpZiBhbiBFcnJvciBvYmplY3QgaXMgdGhyb3duLFxuICAgIC8vIHNvIHRyeSB0aGF0IGFzIGEgc3BlY2lhbC1jYXNlLlxuICAgIHRyeSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoMCk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBlcnIgPSBlO1xuICAgIH1cbiAgICBpZiAoIWVyci5zdGFjaykge1xuICAgICAgcmV0dXJuICcobm8gc3RhY2sgdHJhY2UgYXZhaWxhYmxlKSc7XG4gICAgfVxuICB9XG4gIHJldHVybiBlcnIuc3RhY2sudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgdmFyIGpzID0ganNTdGFja1RyYWNlKCk7XG4gIGlmIChNb2R1bGVbJ2V4dHJhU3RhY2tUcmFjZSddKSBqcyArPSAnXFxuJyArIE1vZHVsZVsnZXh0cmFTdGFja1RyYWNlJ10oKTtcbiAgcmV0dXJuIGRlbWFuZ2xlQWxsKGpzKTtcbn1cbk1vZHVsZVtcInN0YWNrVHJhY2VcIl0gPSBzdGFja1RyYWNlO1xuXG4vLyBNZW1vcnkgbWFuYWdlbWVudFxuXG52YXIgUEFHRV9TSVpFID0gMTYzODQ7XG52YXIgV0FTTV9QQUdFX1NJWkUgPSA2NTUzNjtcbnZhciBBU01KU19QQUdFX1NJWkUgPSAxNjc3NzIxNjtcbnZhciBNSU5fVE9UQUxfTUVNT1JZID0gMTY3NzcyMTY7XG5cbmZ1bmN0aW9uIGFsaWduVXAoeCwgbXVsdGlwbGUpIHtcbiAgaWYgKHggJSBtdWx0aXBsZSA+IDApIHtcbiAgICB4ICs9IG11bHRpcGxlIC0gKHggJSBtdWx0aXBsZSk7XG4gIH1cbiAgcmV0dXJuIHg7XG59XG5cbnZhciBIRUFQLFxuLyoqIEB0eXBlIHtBcnJheUJ1ZmZlcn0gKi9cbiAgYnVmZmVyLFxuLyoqIEB0eXBlIHtJbnQ4QXJyYXl9ICovXG4gIEhFQVA4LFxuLyoqIEB0eXBlIHtVaW50OEFycmF5fSAqL1xuICBIRUFQVTgsXG4vKiogQHR5cGUge0ludDE2QXJyYXl9ICovXG4gIEhFQVAxNixcbi8qKiBAdHlwZSB7VWludDE2QXJyYXl9ICovXG4gIEhFQVBVMTYsXG4vKiogQHR5cGUge0ludDMyQXJyYXl9ICovXG4gIEhFQVAzMixcbi8qKiBAdHlwZSB7VWludDMyQXJyYXl9ICovXG4gIEhFQVBVMzIsXG4vKiogQHR5cGUge0Zsb2F0MzJBcnJheX0gKi9cbiAgSEVBUEYzMixcbi8qKiBAdHlwZSB7RmxvYXQ2NEFycmF5fSAqL1xuICBIRUFQRjY0O1xuXG5mdW5jdGlvbiB1cGRhdGVHbG9iYWxCdWZmZXIoYnVmKSB7XG4gIE1vZHVsZVsnYnVmZmVyJ10gPSBidWZmZXIgPSBidWY7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUdsb2JhbEJ1ZmZlclZpZXdzKCkge1xuICBNb2R1bGVbJ0hFQVA4J10gPSBIRUFQOCA9IG5ldyBJbnQ4QXJyYXkoYnVmZmVyKTtcbiAgTW9kdWxlWydIRUFQMTYnXSA9IEhFQVAxNiA9IG5ldyBJbnQxNkFycmF5KGJ1ZmZlcik7XG4gIE1vZHVsZVsnSEVBUDMyJ10gPSBIRUFQMzIgPSBuZXcgSW50MzJBcnJheShidWZmZXIpO1xuICBNb2R1bGVbJ0hFQVBVOCddID0gSEVBUFU4ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgTW9kdWxlWydIRUFQVTE2J10gPSBIRUFQVTE2ID0gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlcik7XG4gIE1vZHVsZVsnSEVBUFUzMiddID0gSEVBUFUzMiA9IG5ldyBVaW50MzJBcnJheShidWZmZXIpO1xuICBNb2R1bGVbJ0hFQVBGMzInXSA9IEhFQVBGMzIgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlcik7XG4gIE1vZHVsZVsnSEVBUEY2NCddID0gSEVBUEY2NCA9IG5ldyBGbG9hdDY0QXJyYXkoYnVmZmVyKTtcbn1cblxudmFyIFNUQVRJQ19CQVNFLCBTVEFUSUNUT1AsIHN0YXRpY1NlYWxlZDsgLy8gc3RhdGljIGFyZWFcbnZhciBTVEFDS19CQVNFLCBTVEFDS1RPUCwgU1RBQ0tfTUFYOyAvLyBzdGFjayBhcmVhXG52YXIgRFlOQU1JQ19CQVNFLCBEWU5BTUlDVE9QX1BUUjsgLy8gZHluYW1pYyBhcmVhIGhhbmRsZWQgYnkgc2Jya1xuXG4gIFNUQVRJQ19CQVNFID0gU1RBVElDVE9QID0gU1RBQ0tfQkFTRSA9IFNUQUNLVE9QID0gU1RBQ0tfTUFYID0gRFlOQU1JQ19CQVNFID0gRFlOQU1JQ1RPUF9QVFIgPSAwO1xuICBzdGF0aWNTZWFsZWQgPSBmYWxzZTtcblxuXG4vLyBJbml0aWFsaXplcyB0aGUgc3RhY2sgY29va2llLiBDYWxsZWQgYXQgdGhlIHN0YXJ0dXAgb2YgbWFpbiBhbmQgYXQgdGhlIHN0YXJ0dXAgb2YgZWFjaCB0aHJlYWQgaW4gcHRocmVhZHMgbW9kZS5cbmZ1bmN0aW9uIHdyaXRlU3RhY2tDb29raWUoKSB7XG4gIGFzc2VydCgoU1RBQ0tfTUFYICYgMykgPT0gMCk7XG4gIEhFQVBVMzJbKFNUQUNLX01BWCA+PiAyKS0xXSA9IDB4MDIxMzU0Njc7XG4gIEhFQVBVMzJbKFNUQUNLX01BWCA+PiAyKS0yXSA9IDB4ODlCQUNERkU7XG59XG5cbmZ1bmN0aW9uIGNoZWNrU3RhY2tDb29raWUoKSB7XG4gIGlmIChIRUFQVTMyWyhTVEFDS19NQVggPj4gMiktMV0gIT0gMHgwMjEzNTQ2NyB8fCBIRUFQVTMyWyhTVEFDS19NQVggPj4gMiktMl0gIT0gMHg4OUJBQ0RGRSkge1xuICAgIGFib3J0KCdTdGFjayBvdmVyZmxvdyEgU3RhY2sgY29va2llIGhhcyBiZWVuIG92ZXJ3cml0dGVuLCBleHBlY3RlZCBoZXggZHdvcmRzIDB4ODlCQUNERkUgYW5kIDB4MDIxMzU0NjcsIGJ1dCByZWNlaXZlZCAweCcgKyBIRUFQVTMyWyhTVEFDS19NQVggPj4gMiktMl0udG9TdHJpbmcoMTYpICsgJyAnICsgSEVBUFUzMlsoU1RBQ0tfTUFYID4+IDIpLTFdLnRvU3RyaW5nKDE2KSk7XG4gIH1cbiAgLy8gQWxzbyB0ZXN0IHRoZSBnbG9iYWwgYWRkcmVzcyAwIGZvciBpbnRlZ3JpdHkuIFRoaXMgY2hlY2sgaXMgbm90IGNvbXBhdGlibGUgd2l0aCBTQUZFX1NQTElUX01FTU9SWSB0aG91Z2gsIHNpbmNlIHRoYXQgbW9kZSBhbHJlYWR5IHRlc3RzIGFsbCBhZGRyZXNzIDAgYWNjZXNzZXMgb24gaXRzIG93bi5cbiAgaWYgKEhFQVAzMlswXSAhPT0gMHg2MzczNmQ2NSAvKiAnZW1zYycgKi8pIHRocm93ICdSdW50aW1lIGVycm9yOiBUaGUgYXBwbGljYXRpb24gaGFzIGNvcnJ1cHRlZCBpdHMgaGVhcCBtZW1vcnkgYXJlYSAoYWRkcmVzcyB6ZXJvKSEnO1xufVxuXG5mdW5jdGlvbiBhYm9ydFN0YWNrT3ZlcmZsb3coYWxsb2NTaXplKSB7XG4gIGFib3J0KCdTdGFjayBvdmVyZmxvdyEgQXR0ZW1wdGVkIHRvIGFsbG9jYXRlICcgKyBhbGxvY1NpemUgKyAnIGJ5dGVzIG9uIHRoZSBzdGFjaywgYnV0IHN0YWNrIGhhcyBvbmx5ICcgKyAoU1RBQ0tfTUFYIC0gTW9kdWxlWydhc20nXS5zdGFja1NhdmUoKSArIGFsbG9jU2l6ZSkgKyAnIGJ5dGVzIGF2YWlsYWJsZSEnKTtcbn1cblxuZnVuY3Rpb24gYWJvcnRPbkNhbm5vdEdyb3dNZW1vcnkoKSB7XG4gIGFib3J0KCdDYW5ub3QgZW5sYXJnZSBtZW1vcnkgYXJyYXlzLiBFaXRoZXIgKDEpIGNvbXBpbGUgd2l0aCAgLXMgVE9UQUxfTUVNT1JZPVggIHdpdGggWCBoaWdoZXIgdGhhbiB0aGUgY3VycmVudCB2YWx1ZSAnICsgVE9UQUxfTUVNT1JZICsgJywgKDIpIGNvbXBpbGUgd2l0aCAgLXMgQUxMT1dfTUVNT1JZX0dST1dUSD0xICB3aGljaCBhbGxvd3MgaW5jcmVhc2luZyB0aGUgc2l6ZSBhdCBydW50aW1lLCBvciAoMykgaWYgeW91IHdhbnQgbWFsbG9jIHRvIHJldHVybiBOVUxMICgwKSBpbnN0ZWFkIG9mIHRoaXMgYWJvcnQsIGNvbXBpbGUgd2l0aCAgLXMgQUJPUlRJTkdfTUFMTE9DPTAgJyk7XG59XG5cbmlmICghTW9kdWxlWydyZWFsbG9jQnVmZmVyJ10pIE1vZHVsZVsncmVhbGxvY0J1ZmZlciddID0gZnVuY3Rpb24oc2l6ZSkge1xuICB2YXIgcmV0O1xuICB0cnkge1xuICAgIGlmIChBcnJheUJ1ZmZlci50cmFuc2Zlcikge1xuICAgICAgcmV0ID0gQXJyYXlCdWZmZXIudHJhbnNmZXIoYnVmZmVyLCBzaXplKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG9sZEhFQVA4ID0gSEVBUDg7XG4gICAgICByZXQgPSBuZXcgQXJyYXlCdWZmZXIoc2l6ZSk7XG4gICAgICB2YXIgdGVtcCA9IG5ldyBJbnQ4QXJyYXkocmV0KTtcbiAgICAgIHRlbXAuc2V0KG9sZEhFQVA4KTtcbiAgICB9XG4gIH0gY2F0Y2goZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgc3VjY2VzcyA9IF9lbXNjcmlwdGVuX3JlcGxhY2VfbWVtb3J5KHJldCk7XG4gIGlmICghc3VjY2VzcykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gZW5sYXJnZU1lbW9yeSgpIHtcbiAgLy8gVE9UQUxfTUVNT1JZIGlzIHRoZSBjdXJyZW50IHNpemUgb2YgdGhlIGFjdHVhbCBhcnJheSwgYW5kIERZTkFNSUNUT1AgaXMgdGhlIG5ldyB0b3AuXG4gIGFzc2VydChIRUFQMzJbRFlOQU1JQ1RPUF9QVFI+PjJdID4gVE9UQUxfTUVNT1JZKTsgLy8gVGhpcyBmdW5jdGlvbiBzaG91bGQgb25seSBldmVyIGJlIGNhbGxlZCBhZnRlciB0aGUgY2VpbGluZyBvZiB0aGUgZHluYW1pYyBoZWFwIGhhcyBhbHJlYWR5IGJlZW4gYnVtcGVkIHRvIGV4Y2VlZCB0aGUgY3VycmVudCB0b3RhbCBzaXplIG9mIHRoZSBhc20uanMgaGVhcC5cblxuXG4gIHZhciBQQUdFX01VTFRJUExFID0gTW9kdWxlW1widXNpbmdXYXNtXCJdID8gV0FTTV9QQUdFX1NJWkUgOiBBU01KU19QQUdFX1NJWkU7IC8vIEluIHdhc20sIGhlYXAgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjRLQi4gSW4gYXNtLmpzLCB0aGV5IG5lZWQgdG8gYmUgbXVsdGlwbGVzIG9mIDE2TUIuXG4gIHZhciBMSU1JVCA9IDIxNDc0ODM2NDggLSBQQUdFX01VTFRJUExFOyAvLyBXZSBjYW4gZG8gb25lIHBhZ2Ugc2hvcnQgb2YgMkdCIGFzIHRoZW9yZXRpY2FsIG1heGltdW0uXG5cbiAgaWYgKEhFQVAzMltEWU5BTUlDVE9QX1BUUj4+Ml0gPiBMSU1JVCkge1xuICAgIE1vZHVsZS5wcmludEVycignQ2Fubm90IGVubGFyZ2UgbWVtb3J5LCBhc2tlZCB0byBnbyB1cCB0byAnICsgSEVBUDMyW0RZTkFNSUNUT1BfUFRSPj4yXSArICcgYnl0ZXMsIGJ1dCB0aGUgbGltaXQgaXMgJyArIExJTUlUICsgJyBieXRlcyEnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB2YXIgT0xEX1RPVEFMX01FTU9SWSA9IFRPVEFMX01FTU9SWTtcbiAgVE9UQUxfTUVNT1JZID0gTWF0aC5tYXgoVE9UQUxfTUVNT1JZLCBNSU5fVE9UQUxfTUVNT1JZKTsgLy8gU28gdGhlIGxvb3AgYmVsb3cgd2lsbCBub3QgYmUgaW5maW5pdGUsIGFuZCBtaW5pbXVtIGFzbS5qcyBtZW1vcnkgc2l6ZSBpcyAxNk1CLlxuXG4gIHdoaWxlIChUT1RBTF9NRU1PUlkgPCBIRUFQMzJbRFlOQU1JQ1RPUF9QVFI+PjJdKSB7IC8vIEtlZXAgaW5jcmVtZW50aW5nIHRoZSBoZWFwIHNpemUgYXMgbG9uZyBhcyBpdCdzIGxlc3MgdGhhbiB3aGF0IGlzIHJlcXVlc3RlZC5cbiAgICBpZiAoVE9UQUxfTUVNT1JZIDw9IDUzNjg3MDkxMikge1xuICAgICAgVE9UQUxfTUVNT1JZID0gYWxpZ25VcCgyICogVE9UQUxfTUVNT1JZLCBQQUdFX01VTFRJUExFKTsgLy8gU2ltcGxlIGhldXJpc3RpYzogZG91YmxlIHVudGlsIDFHQi4uLlxuICAgIH0gZWxzZSB7XG4gICAgICBUT1RBTF9NRU1PUlkgPSBNYXRoLm1pbihhbGlnblVwKCgzICogVE9UQUxfTUVNT1JZICsgMjE0NzQ4MzY0OCkgLyA0LCBQQUdFX01VTFRJUExFKSwgTElNSVQpOyAvLyAuLi4sIGJ1dCBhZnRlciB0aGF0LCBhZGQgc21hbGxlciBpbmNyZW1lbnRzIHRvd2FyZHMgMkdCLCB3aGljaCB3ZSBjYW5ub3QgcmVhY2hcbiAgICB9XG4gIH1cblxuICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpO1xuXG4gIHZhciByZXBsYWNlbWVudCA9IE1vZHVsZVsncmVhbGxvY0J1ZmZlciddKFRPVEFMX01FTU9SWSk7XG4gIGlmICghcmVwbGFjZW1lbnQgfHwgcmVwbGFjZW1lbnQuYnl0ZUxlbmd0aCAhPSBUT1RBTF9NRU1PUlkpIHtcbiAgICBNb2R1bGUucHJpbnRFcnIoJ0ZhaWxlZCB0byBncm93IHRoZSBoZWFwIGZyb20gJyArIE9MRF9UT1RBTF9NRU1PUlkgKyAnIGJ5dGVzIHRvICcgKyBUT1RBTF9NRU1PUlkgKyAnIGJ5dGVzLCBub3QgZW5vdWdoIG1lbW9yeSEnKTtcbiAgICBpZiAocmVwbGFjZW1lbnQpIHtcbiAgICAgIE1vZHVsZS5wcmludEVycignRXhwZWN0ZWQgdG8gZ2V0IGJhY2sgYSBidWZmZXIgb2Ygc2l6ZSAnICsgVE9UQUxfTUVNT1JZICsgJyBieXRlcywgYnV0IGluc3RlYWQgZ290IGJhY2sgYSBidWZmZXIgb2Ygc2l6ZSAnICsgcmVwbGFjZW1lbnQuYnl0ZUxlbmd0aCk7XG4gICAgfVxuICAgIC8vIHJlc3RvcmUgdGhlIHN0YXRlIHRvIGJlZm9yZSB0aGlzIGNhbGwsIHdlIGZhaWxlZFxuICAgIFRPVEFMX01FTU9SWSA9IE9MRF9UT1RBTF9NRU1PUlk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gZXZlcnl0aGluZyB3b3JrZWRcblxuICB1cGRhdGVHbG9iYWxCdWZmZXIocmVwbGFjZW1lbnQpO1xuICB1cGRhdGVHbG9iYWxCdWZmZXJWaWV3cygpO1xuXG4gIE1vZHVsZS5wcmludEVycignZW5sYXJnZWQgbWVtb3J5IGFycmF5cyBmcm9tICcgKyBPTERfVE9UQUxfTUVNT1JZICsgJyB0byAnICsgVE9UQUxfTUVNT1JZICsgJywgdG9vayAnICsgKERhdGUubm93KCkgLSBzdGFydCkgKyAnIG1zIChoYXMgQXJyYXlCdWZmZXIudHJhbnNmZXI/ICcgKyAoISFBcnJheUJ1ZmZlci50cmFuc2ZlcikgKyAnKScpO1xuXG4gIGlmICghTW9kdWxlW1widXNpbmdXYXNtXCJdKSB7XG4gICAgTW9kdWxlLnByaW50RXJyKCdXYXJuaW5nOiBFbmxhcmdpbmcgbWVtb3J5IGFycmF5cywgdGhpcyBpcyBub3QgZmFzdCEgJyArIFtPTERfVE9UQUxfTUVNT1JZLCBUT1RBTF9NRU1PUlldKTtcbiAgfVxuXG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBieXRlTGVuZ3RoO1xudHJ5IHtcbiAgYnl0ZUxlbmd0aCA9IEZ1bmN0aW9uLnByb3RvdHlwZS5jYWxsLmJpbmQoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihBcnJheUJ1ZmZlci5wcm90b3R5cGUsICdieXRlTGVuZ3RoJykuZ2V0KTtcbiAgYnl0ZUxlbmd0aChuZXcgQXJyYXlCdWZmZXIoNCkpOyAvLyBjYW4gZmFpbCBvbiBvbGRlciBpZVxufSBjYXRjaChlKSB7IC8vIGNhbiBmYWlsIG9uIG9sZGVyIG5vZGUvdjhcbiAgYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uKGJ1ZmZlcikgeyByZXR1cm4gYnVmZmVyLmJ5dGVMZW5ndGg7IH07XG59XG5cbnZhciBUT1RBTF9TVEFDSyA9IE1vZHVsZVsnVE9UQUxfU1RBQ0snXSB8fCA1MjQyODgwO1xudmFyIFRPVEFMX01FTU9SWSA9IE1vZHVsZVsnVE9UQUxfTUVNT1JZJ10gfHwgMTY3NzcyMTY7XG5pZiAoVE9UQUxfTUVNT1JZIDwgVE9UQUxfU1RBQ0spIE1vZHVsZS5wcmludEVycignVE9UQUxfTUVNT1JZIHNob3VsZCBiZSBsYXJnZXIgdGhhbiBUT1RBTF9TVEFDSywgd2FzICcgKyBUT1RBTF9NRU1PUlkgKyAnISAoVE9UQUxfU1RBQ0s9JyArIFRPVEFMX1NUQUNLICsgJyknKTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgcnVudGltZSdzIG1lbW9yeVxuLy8gY2hlY2sgZm9yIGZ1bGwgZW5naW5lIHN1cHBvcnQgKHVzZSBzdHJpbmcgJ3N1YmFycmF5JyB0byBhdm9pZCBjbG9zdXJlIGNvbXBpbGVyIGNvbmZ1c2lvbilcbmFzc2VydCh0eXBlb2YgSW50MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEZsb2F0NjRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgSW50MzJBcnJheS5wcm90b3R5cGUuc3ViYXJyYXkgIT09IHVuZGVmaW5lZCAmJiBJbnQzMkFycmF5LnByb3RvdHlwZS5zZXQgIT09IHVuZGVmaW5lZCxcbiAgICAgICAnSlMgZW5naW5lIGRvZXMgbm90IHByb3ZpZGUgZnVsbCB0eXBlZCBhcnJheSBzdXBwb3J0Jyk7XG5cblxuXG4vLyBVc2UgYSBwcm92aWRlZCBidWZmZXIsIGlmIHRoZXJlIGlzIG9uZSwgb3IgZWxzZSBhbGxvY2F0ZSBhIG5ldyBvbmVcbmlmIChNb2R1bGVbJ2J1ZmZlciddKSB7XG4gIGJ1ZmZlciA9IE1vZHVsZVsnYnVmZmVyJ107XG4gIGFzc2VydChidWZmZXIuYnl0ZUxlbmd0aCA9PT0gVE9UQUxfTUVNT1JZLCAncHJvdmlkZWQgYnVmZmVyIHNob3VsZCBiZSAnICsgVE9UQUxfTUVNT1JZICsgJyBieXRlcywgYnV0IGl0IGlzICcgKyBidWZmZXIuYnl0ZUxlbmd0aCk7XG59IGVsc2Uge1xuICAvLyBVc2UgYSBXZWJBc3NlbWJseSBtZW1vcnkgd2hlcmUgYXZhaWxhYmxlXG4gIGlmICh0eXBlb2YgV2ViQXNzZW1ibHkgPT09ICdvYmplY3QnICYmIHR5cGVvZiBXZWJBc3NlbWJseS5NZW1vcnkgPT09ICdmdW5jdGlvbicpIHtcbiAgICBhc3NlcnQoVE9UQUxfTUVNT1JZICUgV0FTTV9QQUdFX1NJWkUgPT09IDApO1xuICAgIE1vZHVsZVsnd2FzbU1lbW9yeSddID0gbmV3IFdlYkFzc2VtYmx5Lk1lbW9yeSh7ICdpbml0aWFsJzogVE9UQUxfTUVNT1JZIC8gV0FTTV9QQUdFX1NJWkUgfSk7XG4gICAgYnVmZmVyID0gTW9kdWxlWyd3YXNtTWVtb3J5J10uYnVmZmVyO1xuICB9IGVsc2VcbiAge1xuICAgIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihUT1RBTF9NRU1PUlkpO1xuICB9XG4gIGFzc2VydChidWZmZXIuYnl0ZUxlbmd0aCA9PT0gVE9UQUxfTUVNT1JZKTtcbn1cbnVwZGF0ZUdsb2JhbEJ1ZmZlclZpZXdzKCk7XG5cblxuZnVuY3Rpb24gZ2V0VG90YWxNZW1vcnkoKSB7XG4gIHJldHVybiBUT1RBTF9NRU1PUlk7XG59XG5cbi8vIEVuZGlhbm5lc3MgY2hlY2sgKG5vdGU6IGFzc3VtZXMgY29tcGlsZXIgYXJjaCB3YXMgbGl0dGxlLWVuZGlhbilcbiAgSEVBUDMyWzBdID0gMHg2MzczNmQ2NTsgLyogJ2Vtc2MnICovXG5IRUFQMTZbMV0gPSAweDYzNzM7XG5pZiAoSEVBUFU4WzJdICE9PSAweDczIHx8IEhFQVBVOFszXSAhPT0gMHg2MykgdGhyb3cgJ1J1bnRpbWUgZXJyb3I6IGV4cGVjdGVkIHRoZSBzeXN0ZW0gdG8gYmUgbGl0dGxlLWVuZGlhbiEnO1xuXG5Nb2R1bGVbJ0hFQVAnXSA9IEhFQVA7XG5Nb2R1bGVbJ2J1ZmZlciddID0gYnVmZmVyO1xuTW9kdWxlWydIRUFQOCddID0gSEVBUDg7XG5Nb2R1bGVbJ0hFQVAxNiddID0gSEVBUDE2O1xuTW9kdWxlWydIRUFQMzInXSA9IEhFQVAzMjtcbk1vZHVsZVsnSEVBUFU4J10gPSBIRUFQVTg7XG5Nb2R1bGVbJ0hFQVBVMTYnXSA9IEhFQVBVMTY7XG5Nb2R1bGVbJ0hFQVBVMzInXSA9IEhFQVBVMzI7XG5Nb2R1bGVbJ0hFQVBGMzInXSA9IEhFQVBGMzI7XG5Nb2R1bGVbJ0hFQVBGNjQnXSA9IEhFQVBGNjQ7XG5cbmZ1bmN0aW9uIGNhbGxSdW50aW1lQ2FsbGJhY2tzKGNhbGxiYWNrcykge1xuICB3aGlsZShjYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgIHZhciBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgZnVuYyA9IGNhbGxiYWNrLmZ1bmM7XG4gICAgaWYgKHR5cGVvZiBmdW5jID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKGNhbGxiYWNrLmFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIE1vZHVsZVsnZHluQ2FsbF92J10oZnVuYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBNb2R1bGVbJ2R5bkNhbGxfdmknXShmdW5jLCBjYWxsYmFjay5hcmcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmdW5jKGNhbGxiYWNrLmFyZyA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGNhbGxiYWNrLmFyZyk7XG4gICAgfVxuICB9XG59XG5cbnZhciBfX0FUUFJFUlVOX18gID0gW107IC8vIGZ1bmN0aW9ucyBjYWxsZWQgYmVmb3JlIHRoZSBydW50aW1lIGlzIGluaXRpYWxpemVkXG52YXIgX19BVElOSVRfXyAgICA9IFtdOyAvLyBmdW5jdGlvbnMgY2FsbGVkIGR1cmluZyBzdGFydHVwXG52YXIgX19BVE1BSU5fXyAgICA9IFtdOyAvLyBmdW5jdGlvbnMgY2FsbGVkIHdoZW4gbWFpbigpIGlzIHRvIGJlIHJ1blxudmFyIF9fQVRFWElUX18gICAgPSBbXTsgLy8gZnVuY3Rpb25zIGNhbGxlZCBkdXJpbmcgc2h1dGRvd25cbnZhciBfX0FUUE9TVFJVTl9fID0gW107IC8vIGZ1bmN0aW9ucyBjYWxsZWQgYWZ0ZXIgdGhlIHJ1bnRpbWUgaGFzIGV4aXRlZFxuXG52YXIgcnVudGltZUluaXRpYWxpemVkID0gZmFsc2U7XG52YXIgcnVudGltZUV4aXRlZCA9IGZhbHNlO1xuXG5cbmZ1bmN0aW9uIHByZVJ1bigpIHtcbiAgLy8gY29tcGF0aWJpbGl0eSAtIG1lcmdlIGluIGFueXRoaW5nIGZyb20gTW9kdWxlWydwcmVSdW4nXSBhdCB0aGlzIHRpbWVcbiAgaWYgKE1vZHVsZVsncHJlUnVuJ10pIHtcbiAgICBpZiAodHlwZW9mIE1vZHVsZVsncHJlUnVuJ10gPT0gJ2Z1bmN0aW9uJykgTW9kdWxlWydwcmVSdW4nXSA9IFtNb2R1bGVbJ3ByZVJ1biddXTtcbiAgICB3aGlsZSAoTW9kdWxlWydwcmVSdW4nXS5sZW5ndGgpIHtcbiAgICAgIGFkZE9uUHJlUnVuKE1vZHVsZVsncHJlUnVuJ10uc2hpZnQoKSk7XG4gICAgfVxuICB9XG4gIGNhbGxSdW50aW1lQ2FsbGJhY2tzKF9fQVRQUkVSVU5fXyk7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUluaXRSdW50aW1lKCkge1xuICBjaGVja1N0YWNrQ29va2llKCk7XG4gIGlmIChydW50aW1lSW5pdGlhbGl6ZWQpIHJldHVybjtcbiAgcnVudGltZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgY2FsbFJ1bnRpbWVDYWxsYmFja3MoX19BVElOSVRfXyk7XG59XG5cbmZ1bmN0aW9uIHByZU1haW4oKSB7XG4gIGNoZWNrU3RhY2tDb29raWUoKTtcbiAgY2FsbFJ1bnRpbWVDYWxsYmFja3MoX19BVE1BSU5fXyk7XG59XG5cbmZ1bmN0aW9uIGV4aXRSdW50aW1lKCkge1xuICBjaGVja1N0YWNrQ29va2llKCk7XG4gIGNhbGxSdW50aW1lQ2FsbGJhY2tzKF9fQVRFWElUX18pO1xuICBydW50aW1lRXhpdGVkID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9zdFJ1bigpIHtcbiAgY2hlY2tTdGFja0Nvb2tpZSgpO1xuICAvLyBjb21wYXRpYmlsaXR5IC0gbWVyZ2UgaW4gYW55dGhpbmcgZnJvbSBNb2R1bGVbJ3Bvc3RSdW4nXSBhdCB0aGlzIHRpbWVcbiAgaWYgKE1vZHVsZVsncG9zdFJ1biddKSB7XG4gICAgaWYgKHR5cGVvZiBNb2R1bGVbJ3Bvc3RSdW4nXSA9PSAnZnVuY3Rpb24nKSBNb2R1bGVbJ3Bvc3RSdW4nXSA9IFtNb2R1bGVbJ3Bvc3RSdW4nXV07XG4gICAgd2hpbGUgKE1vZHVsZVsncG9zdFJ1biddLmxlbmd0aCkge1xuICAgICAgYWRkT25Qb3N0UnVuKE1vZHVsZVsncG9zdFJ1biddLnNoaWZ0KCkpO1xuICAgIH1cbiAgfVxuICBjYWxsUnVudGltZUNhbGxiYWNrcyhfX0FUUE9TVFJVTl9fKTtcbn1cblxuZnVuY3Rpb24gYWRkT25QcmVSdW4oY2IpIHtcbiAgX19BVFBSRVJVTl9fLnVuc2hpZnQoY2IpO1xufVxuTW9kdWxlW1wiYWRkT25QcmVSdW5cIl0gPSBhZGRPblByZVJ1bjtcblxuZnVuY3Rpb24gYWRkT25Jbml0KGNiKSB7XG4gIF9fQVRJTklUX18udW5zaGlmdChjYik7XG59XG5Nb2R1bGVbXCJhZGRPbkluaXRcIl0gPSBhZGRPbkluaXQ7XG5cbmZ1bmN0aW9uIGFkZE9uUHJlTWFpbihjYikge1xuICBfX0FUTUFJTl9fLnVuc2hpZnQoY2IpO1xufVxuTW9kdWxlW1wiYWRkT25QcmVNYWluXCJdID0gYWRkT25QcmVNYWluO1xuXG5mdW5jdGlvbiBhZGRPbkV4aXQoY2IpIHtcbiAgX19BVEVYSVRfXy51bnNoaWZ0KGNiKTtcbn1cbk1vZHVsZVtcImFkZE9uRXhpdFwiXSA9IGFkZE9uRXhpdDtcblxuZnVuY3Rpb24gYWRkT25Qb3N0UnVuKGNiKSB7XG4gIF9fQVRQT1NUUlVOX18udW5zaGlmdChjYik7XG59XG5Nb2R1bGVbXCJhZGRPblBvc3RSdW5cIl0gPSBhZGRPblBvc3RSdW47XG5cbi8vIFRvb2xzXG5cbi8qKiBAdHlwZSB7ZnVuY3Rpb24oc3RyaW5nLCBib29sZWFuPSwgbnVtYmVyPSl9ICovXG5mdW5jdGlvbiBpbnRBcnJheUZyb21TdHJpbmcoc3RyaW5neSwgZG9udEFkZE51bGwsIGxlbmd0aCkge1xuICB2YXIgbGVuID0gbGVuZ3RoID4gMCA/IGxlbmd0aCA6IGxlbmd0aEJ5dGVzVVRGOChzdHJpbmd5KSsxO1xuICB2YXIgdThhcnJheSA9IG5ldyBBcnJheShsZW4pO1xuICB2YXIgbnVtQnl0ZXNXcml0dGVuID0gc3RyaW5nVG9VVEY4QXJyYXkoc3RyaW5neSwgdThhcnJheSwgMCwgdThhcnJheS5sZW5ndGgpO1xuICBpZiAoZG9udEFkZE51bGwpIHU4YXJyYXkubGVuZ3RoID0gbnVtQnl0ZXNXcml0dGVuO1xuICByZXR1cm4gdThhcnJheTtcbn1cbk1vZHVsZVtcImludEFycmF5RnJvbVN0cmluZ1wiXSA9IGludEFycmF5RnJvbVN0cmluZztcblxuZnVuY3Rpb24gaW50QXJyYXlUb1N0cmluZyhhcnJheSkge1xuICB2YXIgcmV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hyID0gYXJyYXlbaV07XG4gICAgaWYgKGNociA+IDB4RkYpIHtcbiAgICAgIGFzc2VydChmYWxzZSwgJ0NoYXJhY3RlciBjb2RlICcgKyBjaHIgKyAnICgnICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIpICsgJykgIGF0IG9mZnNldCAnICsgaSArICcgbm90IGluIDB4MDAtMHhGRi4nKTtcbiAgICAgIGNociAmPSAweEZGO1xuICAgIH1cbiAgICByZXQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGNocikpO1xuICB9XG4gIHJldHVybiByZXQuam9pbignJyk7XG59XG5Nb2R1bGVbXCJpbnRBcnJheVRvU3RyaW5nXCJdID0gaW50QXJyYXlUb1N0cmluZztcblxuLy8gRGVwcmVjYXRlZDogVGhpcyBmdW5jdGlvbiBzaG91bGQgbm90IGJlIGNhbGxlZCBiZWNhdXNlIGl0IGlzIHVuc2FmZSBhbmQgZG9lcyBub3QgcHJvdmlkZVxuLy8gYSBtYXhpbXVtIGxlbmd0aCBsaW1pdCBvZiBob3cgbWFueSBieXRlcyBpdCBpcyBhbGxvd2VkIHRvIHdyaXRlLiBQcmVmZXIgY2FsbGluZyB0aGVcbi8vIGZ1bmN0aW9uIHN0cmluZ1RvVVRGOEFycmF5KCkgaW5zdGVhZCwgd2hpY2ggdGFrZXMgaW4gYSBtYXhpbXVtIGxlbmd0aCB0aGF0IGNhbiBiZSB1c2VkXG4vLyB0byBiZSBzZWN1cmUgZnJvbSBvdXQgb2YgYm91bmRzIHdyaXRlcy5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZnVuY3Rpb24gd3JpdGVTdHJpbmdUb01lbW9yeShzdHJpbmcsIGJ1ZmZlciwgZG9udEFkZE51bGwpIHtcbiAgUnVudGltZS53YXJuT25jZSgnd3JpdGVTdHJpbmdUb01lbW9yeSBpcyBkZXByZWNhdGVkIGFuZCBzaG91bGQgbm90IGJlIGNhbGxlZCEgVXNlIHN0cmluZ1RvVVRGOCgpIGluc3RlYWQhJyk7XG5cbiAgdmFyIC8qKiBAdHlwZSB7bnVtYmVyfSAqLyBsYXN0Q2hhciwgLyoqIEB0eXBlIHtudW1iZXJ9ICovIGVuZDtcbiAgaWYgKGRvbnRBZGROdWxsKSB7XG4gICAgLy8gc3RyaW5nVG9VVEY4QXJyYXkgYWx3YXlzIGFwcGVuZHMgbnVsbC4gSWYgd2UgZG9uJ3Qgd2FudCB0byBkbyB0aGF0LCByZW1lbWJlciB0aGVcbiAgICAvLyBjaGFyYWN0ZXIgdGhhdCBleGlzdGVkIGF0IHRoZSBsb2NhdGlvbiB3aGVyZSB0aGUgbnVsbCB3aWxsIGJlIHBsYWNlZCwgYW5kIHJlc3RvcmVcbiAgICAvLyB0aGF0IGFmdGVyIHRoZSB3cml0ZSAoYmVsb3cpLlxuICAgIGVuZCA9IGJ1ZmZlciArIGxlbmd0aEJ5dGVzVVRGOChzdHJpbmcpO1xuICAgIGxhc3RDaGFyID0gSEVBUDhbZW5kXTtcbiAgfVxuICBzdHJpbmdUb1VURjgoc3RyaW5nLCBidWZmZXIsIEluZmluaXR5KTtcbiAgaWYgKGRvbnRBZGROdWxsKSBIRUFQOFtlbmRdID0gbGFzdENoYXI7IC8vIFJlc3RvcmUgdGhlIHZhbHVlIHVuZGVyIHRoZSBudWxsIGNoYXJhY3Rlci5cbn1cbk1vZHVsZVtcIndyaXRlU3RyaW5nVG9NZW1vcnlcIl0gPSB3cml0ZVN0cmluZ1RvTWVtb3J5O1xuXG5mdW5jdGlvbiB3cml0ZUFycmF5VG9NZW1vcnkoYXJyYXksIGJ1ZmZlcikge1xuICBhc3NlcnQoYXJyYXkubGVuZ3RoID49IDAsICd3cml0ZUFycmF5VG9NZW1vcnkgYXJyYXkgbXVzdCBoYXZlIGEgbGVuZ3RoIChzaG91bGQgYmUgYW4gYXJyYXkgb3IgdHlwZWQgYXJyYXkpJylcbiAgSEVBUDguc2V0KGFycmF5LCBidWZmZXIpO1xufVxuTW9kdWxlW1wid3JpdGVBcnJheVRvTWVtb3J5XCJdID0gd3JpdGVBcnJheVRvTWVtb3J5O1xuXG5mdW5jdGlvbiB3cml0ZUFzY2lpVG9NZW1vcnkoc3RyLCBidWZmZXIsIGRvbnRBZGROdWxsKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgYXNzZXJ0KHN0ci5jaGFyQ29kZUF0KGkpID09PSBzdHIuY2hhckNvZGVBdChpKSYweGZmKTtcbiAgICBIRUFQOFsoKGJ1ZmZlcisrKT4+MCldPXN0ci5jaGFyQ29kZUF0KGkpO1xuICB9XG4gIC8vIE51bGwtdGVybWluYXRlIHRoZSBwb2ludGVyIHRvIHRoZSBIRUFQLlxuICBpZiAoIWRvbnRBZGROdWxsKSBIRUFQOFsoKGJ1ZmZlcik+PjApXT0wO1xufVxuTW9kdWxlW1wid3JpdGVBc2NpaVRvTWVtb3J5XCJdID0gd3JpdGVBc2NpaVRvTWVtb3J5O1xuXG5mdW5jdGlvbiB1blNpZ24odmFsdWUsIGJpdHMsIGlnbm9yZSkge1xuICBpZiAodmFsdWUgPj0gMCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICByZXR1cm4gYml0cyA8PSAzMiA/IDIqTWF0aC5hYnMoMSA8PCAoYml0cy0xKSkgKyB2YWx1ZSAvLyBOZWVkIHNvbWUgdHJpY2tlcnksIHNpbmNlIGlmIGJpdHMgPT0gMzIsIHdlIGFyZSByaWdodCBhdCB0aGUgbGltaXQgb2YgdGhlIGJpdHMgSlMgdXNlcyBpbiBiaXRzaGlmdHNcbiAgICAgICAgICAgICAgICAgICAgOiBNYXRoLnBvdygyLCBiaXRzKSAgICAgICAgICsgdmFsdWU7XG59XG5mdW5jdGlvbiByZVNpZ24odmFsdWUsIGJpdHMsIGlnbm9yZSkge1xuICBpZiAodmFsdWUgPD0gMCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICB2YXIgaGFsZiA9IGJpdHMgPD0gMzIgPyBNYXRoLmFicygxIDw8IChiaXRzLTEpKSAvLyBhYnMgaXMgbmVlZGVkIGlmIGJpdHMgPT0gMzJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogTWF0aC5wb3coMiwgYml0cy0xKTtcbiAgaWYgKHZhbHVlID49IGhhbGYgJiYgKGJpdHMgPD0gMzIgfHwgdmFsdWUgPiBoYWxmKSkgeyAvLyBmb3IgaHVnZSB2YWx1ZXMsIHdlIGNhbiBoaXQgdGhlIHByZWNpc2lvbiBsaW1pdCBhbmQgYWx3YXlzIGdldCB0cnVlIGhlcmUuIHNvIGRvbid0IGRvIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBidXQsIGluIGdlbmVyYWwgdGhlcmUgaXMgbm8gcGVyZmVjdCBzb2x1dGlvbiBoZXJlLiBXaXRoIDY0LWJpdCBpbnRzLCB3ZSBnZXQgcm91bmRpbmcgYW5kIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IEluIGk2NCBtb2RlIDEsIHJlc2lnbiB0aGUgdHdvIHBhcnRzIHNlcGFyYXRlbHkgYW5kIHNhZmVseVxuICAgIHZhbHVlID0gLTIqaGFsZiArIHZhbHVlOyAvLyBDYW5ub3QgYml0c2hpZnQgaGFsZiwgYXMgaXQgbWF5IGJlIGF0IHRoZSBsaW1pdCBvZiB0aGUgYml0cyBKUyB1c2VzIGluIGJpdHNoaWZ0c1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuXG4vLyBjaGVjayBmb3IgaW11bCBzdXBwb3J0LCBhbmQgYWxzbyBmb3IgY29ycmVjdG5lc3MgKCBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTI2MzQ1IClcbmlmICghTWF0aFsnaW11bCddIHx8IE1hdGhbJ2ltdWwnXSgweGZmZmZmZmZmLCA1KSAhPT0gLTUpIE1hdGhbJ2ltdWwnXSA9IGZ1bmN0aW9uIGltdWwoYSwgYikge1xuICB2YXIgYWggID0gYSA+Pj4gMTY7XG4gIHZhciBhbCA9IGEgJiAweGZmZmY7XG4gIHZhciBiaCAgPSBiID4+PiAxNjtcbiAgdmFyIGJsID0gYiAmIDB4ZmZmZjtcbiAgcmV0dXJuIChhbCpibCArICgoYWgqYmwgKyBhbCpiaCkgPDwgMTYpKXwwO1xufTtcbk1hdGguaW11bCA9IE1hdGhbJ2ltdWwnXTtcblxuaWYgKCFNYXRoWydmcm91bmQnXSkge1xuICB2YXIgZnJvdW5kQnVmZmVyID0gbmV3IEZsb2F0MzJBcnJheSgxKTtcbiAgTWF0aFsnZnJvdW5kJ10gPSBmdW5jdGlvbih4KSB7IGZyb3VuZEJ1ZmZlclswXSA9IHg7IHJldHVybiBmcm91bmRCdWZmZXJbMF0gfTtcbn1cbk1hdGguZnJvdW5kID0gTWF0aFsnZnJvdW5kJ107XG5cbmlmICghTWF0aFsnY2x6MzInXSkgTWF0aFsnY2x6MzInXSA9IGZ1bmN0aW9uKHgpIHtcbiAgeCA9IHggPj4+IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMzI7IGkrKykge1xuICAgIGlmICh4ICYgKDEgPDwgKDMxIC0gaSkpKSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gMzI7XG59O1xuTWF0aC5jbHozMiA9IE1hdGhbJ2NsejMyJ11cblxuaWYgKCFNYXRoWyd0cnVuYyddKSBNYXRoWyd0cnVuYyddID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA8IDAgPyBNYXRoLmNlaWwoeCkgOiBNYXRoLmZsb29yKHgpO1xufTtcbk1hdGgudHJ1bmMgPSBNYXRoWyd0cnVuYyddO1xuXG52YXIgTWF0aF9hYnMgPSBNYXRoLmFicztcbnZhciBNYXRoX2NvcyA9IE1hdGguY29zO1xudmFyIE1hdGhfc2luID0gTWF0aC5zaW47XG52YXIgTWF0aF90YW4gPSBNYXRoLnRhbjtcbnZhciBNYXRoX2Fjb3MgPSBNYXRoLmFjb3M7XG52YXIgTWF0aF9hc2luID0gTWF0aC5hc2luO1xudmFyIE1hdGhfYXRhbiA9IE1hdGguYXRhbjtcbnZhciBNYXRoX2F0YW4yID0gTWF0aC5hdGFuMjtcbnZhciBNYXRoX2V4cCA9IE1hdGguZXhwO1xudmFyIE1hdGhfbG9nID0gTWF0aC5sb2c7XG52YXIgTWF0aF9zcXJ0ID0gTWF0aC5zcXJ0O1xudmFyIE1hdGhfY2VpbCA9IE1hdGguY2VpbDtcbnZhciBNYXRoX2Zsb29yID0gTWF0aC5mbG9vcjtcbnZhciBNYXRoX3BvdyA9IE1hdGgucG93O1xudmFyIE1hdGhfaW11bCA9IE1hdGguaW11bDtcbnZhciBNYXRoX2Zyb3VuZCA9IE1hdGguZnJvdW5kO1xudmFyIE1hdGhfcm91bmQgPSBNYXRoLnJvdW5kO1xudmFyIE1hdGhfbWluID0gTWF0aC5taW47XG52YXIgTWF0aF9jbHozMiA9IE1hdGguY2x6MzI7XG52YXIgTWF0aF90cnVuYyA9IE1hdGgudHJ1bmM7XG5cbi8vIEEgY291bnRlciBvZiBkZXBlbmRlbmNpZXMgZm9yIGNhbGxpbmcgcnVuKCkuIElmIHdlIG5lZWQgdG9cbi8vIGRvIGFzeW5jaHJvbm91cyB3b3JrIGJlZm9yZSBydW5uaW5nLCBpbmNyZW1lbnQgdGhpcyBhbmRcbi8vIGRlY3JlbWVudCBpdC4gSW5jcmVtZW50aW5nIG11c3QgaGFwcGVuIGluIGEgcGxhY2UgbGlrZVxuLy8gUFJFX1JVTl9BRERJVElPTlMgKHVzZWQgYnkgZW1jYyB0byBhZGQgZmlsZSBwcmVsb2FkaW5nKS5cbi8vIE5vdGUgdGhhdCB5b3UgY2FuIGFkZCBkZXBlbmRlbmNpZXMgaW4gcHJlUnVuLCBldmVuIHRob3VnaFxuLy8gaXQgaGFwcGVucyByaWdodCBiZWZvcmUgcnVuIC0gcnVuIHdpbGwgYmUgcG9zdHBvbmVkIHVudGlsXG4vLyB0aGUgZGVwZW5kZW5jaWVzIGFyZSBtZXQuXG52YXIgcnVuRGVwZW5kZW5jaWVzID0gMDtcbnZhciBydW5EZXBlbmRlbmN5V2F0Y2hlciA9IG51bGw7XG52YXIgZGVwZW5kZW5jaWVzRnVsZmlsbGVkID0gbnVsbDsgLy8gb3ZlcnJpZGRlbiB0byB0YWtlIGRpZmZlcmVudCBhY3Rpb25zIHdoZW4gYWxsIHJ1biBkZXBlbmRlbmNpZXMgYXJlIGZ1bGZpbGxlZFxudmFyIHJ1bkRlcGVuZGVuY3lUcmFja2luZyA9IHt9O1xuXG5mdW5jdGlvbiBnZXRVbmlxdWVSdW5EZXBlbmRlbmN5KGlkKSB7XG4gIHZhciBvcmlnID0gaWQ7XG4gIHdoaWxlICgxKSB7XG4gICAgaWYgKCFydW5EZXBlbmRlbmN5VHJhY2tpbmdbaWRdKSByZXR1cm4gaWQ7XG4gICAgaWQgPSBvcmlnICsgTWF0aC5yYW5kb20oKTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIGFkZFJ1bkRlcGVuZGVuY3koaWQpIHtcbiAgcnVuRGVwZW5kZW5jaWVzKys7XG4gIGlmIChNb2R1bGVbJ21vbml0b3JSdW5EZXBlbmRlbmNpZXMnXSkge1xuICAgIE1vZHVsZVsnbW9uaXRvclJ1bkRlcGVuZGVuY2llcyddKHJ1bkRlcGVuZGVuY2llcyk7XG4gIH1cbiAgaWYgKGlkKSB7XG4gICAgYXNzZXJ0KCFydW5EZXBlbmRlbmN5VHJhY2tpbmdbaWRdKTtcbiAgICBydW5EZXBlbmRlbmN5VHJhY2tpbmdbaWRdID0gMTtcbiAgICBpZiAocnVuRGVwZW5kZW5jeVdhdGNoZXIgPT09IG51bGwgJiYgdHlwZW9mIHNldEludGVydmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gQ2hlY2sgZm9yIG1pc3NpbmcgZGVwZW5kZW5jaWVzIGV2ZXJ5IGZldyBzZWNvbmRzXG4gICAgICBydW5EZXBlbmRlbmN5V2F0Y2hlciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoQUJPUlQpIHtcbiAgICAgICAgICBjbGVhckludGVydmFsKHJ1bkRlcGVuZGVuY3lXYXRjaGVyKTtcbiAgICAgICAgICBydW5EZXBlbmRlbmN5V2F0Y2hlciA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzaG93biA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBkZXAgaW4gcnVuRGVwZW5kZW5jeVRyYWNraW5nKSB7XG4gICAgICAgICAgaWYgKCFzaG93bikge1xuICAgICAgICAgICAgc2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgTW9kdWxlLnByaW50RXJyKCdzdGlsbCB3YWl0aW5nIG9uIHJ1biBkZXBlbmRlbmNpZXM6Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIE1vZHVsZS5wcmludEVycignZGVwZW5kZW5jeTogJyArIGRlcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNob3duKSB7XG4gICAgICAgICAgTW9kdWxlLnByaW50RXJyKCcoZW5kIG9mIGxpc3QpJyk7XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMDAwKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgTW9kdWxlLnByaW50RXJyKCd3YXJuaW5nOiBydW4gZGVwZW5kZW5jeSBhZGRlZCB3aXRob3V0IElEJyk7XG4gIH1cbn1cbk1vZHVsZVtcImFkZFJ1bkRlcGVuZGVuY3lcIl0gPSBhZGRSdW5EZXBlbmRlbmN5O1xuXG5mdW5jdGlvbiByZW1vdmVSdW5EZXBlbmRlbmN5KGlkKSB7XG4gIHJ1bkRlcGVuZGVuY2llcy0tO1xuICBpZiAoTW9kdWxlWydtb25pdG9yUnVuRGVwZW5kZW5jaWVzJ10pIHtcbiAgICBNb2R1bGVbJ21vbml0b3JSdW5EZXBlbmRlbmNpZXMnXShydW5EZXBlbmRlbmNpZXMpO1xuICB9XG4gIGlmIChpZCkge1xuICAgIGFzc2VydChydW5EZXBlbmRlbmN5VHJhY2tpbmdbaWRdKTtcbiAgICBkZWxldGUgcnVuRGVwZW5kZW5jeVRyYWNraW5nW2lkXTtcbiAgfSBlbHNlIHtcbiAgICBNb2R1bGUucHJpbnRFcnIoJ3dhcm5pbmc6IHJ1biBkZXBlbmRlbmN5IHJlbW92ZWQgd2l0aG91dCBJRCcpO1xuICB9XG4gIGlmIChydW5EZXBlbmRlbmNpZXMgPT0gMCkge1xuICAgIGlmIChydW5EZXBlbmRlbmN5V2F0Y2hlciAhPT0gbnVsbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChydW5EZXBlbmRlbmN5V2F0Y2hlcik7XG4gICAgICBydW5EZXBlbmRlbmN5V2F0Y2hlciA9IG51bGw7XG4gICAgfVxuICAgIGlmIChkZXBlbmRlbmNpZXNGdWxmaWxsZWQpIHtcbiAgICAgIHZhciBjYWxsYmFjayA9IGRlcGVuZGVuY2llc0Z1bGZpbGxlZDtcbiAgICAgIGRlcGVuZGVuY2llc0Z1bGZpbGxlZCA9IG51bGw7XG4gICAgICBjYWxsYmFjaygpOyAvLyBjYW4gYWRkIGFub3RoZXIgZGVwZW5kZW5jaWVzRnVsZmlsbGVkXG4gICAgfVxuICB9XG59XG5Nb2R1bGVbXCJyZW1vdmVSdW5EZXBlbmRlbmN5XCJdID0gcmVtb3ZlUnVuRGVwZW5kZW5jeTtcblxuTW9kdWxlW1wicHJlbG9hZGVkSW1hZ2VzXCJdID0ge307IC8vIG1hcHMgdXJsIHRvIGltYWdlIGRhdGFcbk1vZHVsZVtcInByZWxvYWRlZEF1ZGlvc1wiXSA9IHt9OyAvLyBtYXBzIHVybCB0byBhdWRpbyBkYXRhXG5cblxuXG52YXIgbWVtb3J5SW5pdGlhbGl6ZXIgPSBudWxsO1xuXG5cblxudmFyIC8qIHNob3cgZXJyb3JzIG9uIGxpa2VseSBjYWxscyB0byBGUyB3aGVuIGl0IHdhcyBub3QgaW5jbHVkZWQgKi8gRlMgPSB7XG4gIGVycm9yOiBmdW5jdGlvbigpIHtcbiAgICBhYm9ydCgnRmlsZXN5c3RlbSBzdXBwb3J0IChGUykgd2FzIG5vdCBpbmNsdWRlZC4gVGhlIHByb2JsZW0gaXMgdGhhdCB5b3UgYXJlIHVzaW5nIGZpbGVzIGZyb20gSlMsIGJ1dCBmaWxlcyB3ZXJlIG5vdCB1c2VkIGZyb20gQy9DKyssIHNvIGZpbGVzeXN0ZW0gc3VwcG9ydCB3YXMgbm90IGF1dG8taW5jbHVkZWQuIFlvdSBjYW4gZm9yY2UtaW5jbHVkZSBmaWxlc3lzdGVtIHN1cHBvcnQgd2l0aCAgLXMgRk9SQ0VfRklMRVNZU1RFTT0xJyk7XG4gIH0sXG4gIGluaXQ6IGZ1bmN0aW9uKCkgeyBGUy5lcnJvcigpIH0sXG4gIGNyZWF0ZURhdGFGaWxlOiBmdW5jdGlvbigpIHsgRlMuZXJyb3IoKSB9LFxuICBjcmVhdGVQcmVsb2FkZWRGaWxlOiBmdW5jdGlvbigpIHsgRlMuZXJyb3IoKSB9LFxuICBjcmVhdGVMYXp5RmlsZTogZnVuY3Rpb24oKSB7IEZTLmVycm9yKCkgfSxcbiAgb3BlbjogZnVuY3Rpb24oKSB7IEZTLmVycm9yKCkgfSxcbiAgbWtkZXY6IGZ1bmN0aW9uKCkgeyBGUy5lcnJvcigpIH0sXG4gIHJlZ2lzdGVyRGV2aWNlOiBmdW5jdGlvbigpIHsgRlMuZXJyb3IoKSB9LFxuICBhbmFseXplUGF0aDogZnVuY3Rpb24oKSB7IEZTLmVycm9yKCkgfSxcbiAgbG9hZEZpbGVzRnJvbURCOiBmdW5jdGlvbigpIHsgRlMuZXJyb3IoKSB9LFxuXG4gIEVycm5vRXJyb3I6IGZ1bmN0aW9uIEVycm5vRXJyb3IoKSB7IEZTLmVycm9yKCkgfSxcbn07XG5Nb2R1bGVbJ0ZTX2NyZWF0ZURhdGFGaWxlJ10gPSBGUy5jcmVhdGVEYXRhRmlsZTtcbk1vZHVsZVsnRlNfY3JlYXRlUHJlbG9hZGVkRmlsZSddID0gRlMuY3JlYXRlUHJlbG9hZGVkRmlsZTtcblxuXG5mdW5jdGlvbiBpbnRlZ3JhdGVXYXNtSlMoTW9kdWxlKSB7XG4gIC8vIHdhc20uanMgaGFzIHNldmVyYWwgbWV0aG9kcyBmb3IgY3JlYXRpbmcgdGhlIGNvbXBpbGVkIGNvZGUgbW9kdWxlIGhlcmU6XG4gIC8vICAqICduYXRpdmUtd2FzbScgOiB1c2UgbmF0aXZlIFdlYkFzc2VtYmx5IHN1cHBvcnQgaW4gdGhlIGJyb3dzZXJcbiAgLy8gICogJ2ludGVycHJldC1zLWV4cHInOiBsb2FkIHMtZXhwcmVzc2lvbiBjb2RlIGZyb20gYSAud2FzdCBhbmQgaW50ZXJwcmV0XG4gIC8vICAqICdpbnRlcnByZXQtYmluYXJ5JzogbG9hZCBiaW5hcnkgd2FzbSBhbmQgaW50ZXJwcmV0XG4gIC8vICAqICdpbnRlcnByZXQtYXNtMndhc20nOiBsb2FkIGFzbS5qcyBjb2RlLCB0cmFuc2xhdGUgdG8gd2FzbSwgYW5kIGludGVycHJldFxuICAvLyAgKiAnYXNtanMnOiBubyB3YXNtLCBqdXN0IGxvYWQgdGhlIGFzbS5qcyBjb2RlIGFuZCB1c2UgdGhhdCAoZ29vZCBmb3IgdGVzdGluZylcbiAgLy8gVGhlIG1ldGhvZCBjYW4gYmUgc2V0IGF0IGNvbXBpbGUgdGltZSAoQklOQVJZRU5fTUVUSE9EKSwgb3IgcnVudGltZSBieSBzZXR0aW5nIE1vZHVsZVsnd2FzbUpTTWV0aG9kJ10uXG4gIC8vIFRoZSBtZXRob2QgY2FuIGJlIGEgY29tbWEtc2VwYXJhdGVkIGxpc3QsIGluIHdoaWNoIGNhc2UsIHdlIHdpbGwgdHJ5IHRoZVxuICAvLyBvcHRpb25zIG9uZSBieSBvbmUuIFNvbWUgb2YgdGhlbSBjYW4gZmFpbCBncmFjZWZ1bGx5LCBhbmQgdGhlbiB3ZSBjYW4gdHJ5XG4gIC8vIHRoZSBuZXh0LlxuXG4gIC8vIGlucHV0c1xuXG4gIHZhciBtZXRob2QgPSBNb2R1bGVbJ3dhc21KU01ldGhvZCddIHx8ICduYXRpdmUtd2FzbSc7XG4gIE1vZHVsZVsnd2FzbUpTTWV0aG9kJ10gPSBtZXRob2Q7XG5cbiAgdmFyIHdhc21UZXh0RmlsZSA9IE1vZHVsZVsnd2FzbVRleHRGaWxlJ10gfHwgJ2xpYmpwZWdhc20ud2FzdCc7XG4gIHZhciB3YXNtQmluYXJ5RmlsZSA9IE1vZHVsZVsnd2FzbUJpbmFyeUZpbGUnXSB8fCAnbGlianBlZ2FzbS53YXNtJztcbiAgdmFyIGFzbWpzQ29kZUZpbGUgPSBNb2R1bGVbJ2FzbWpzQ29kZUZpbGUnXSB8fCAnbGlianBlZ2FzbS50ZW1wLmFzbS5qcyc7XG5cbiAgaWYgKHR5cGVvZiBNb2R1bGVbJ2xvY2F0ZUZpbGUnXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHdhc21UZXh0RmlsZSA9IE1vZHVsZVsnbG9jYXRlRmlsZSddKHdhc21UZXh0RmlsZSk7XG4gICAgd2FzbUJpbmFyeUZpbGUgPSBNb2R1bGVbJ2xvY2F0ZUZpbGUnXSh3YXNtQmluYXJ5RmlsZSk7XG4gICAgYXNtanNDb2RlRmlsZSA9IE1vZHVsZVsnbG9jYXRlRmlsZSddKGFzbWpzQ29kZUZpbGUpO1xuICB9XG5cbiAgLy8gdXRpbGl0aWVzXG5cbiAgdmFyIHdhc21QYWdlU2l6ZSA9IDY0KjEwMjQ7XG5cbiAgdmFyIGFzbTJ3YXNtSW1wb3J0cyA9IHsgLy8gc3BlY2lhbCBhc20yd2FzbSBpbXBvcnRzXG4gICAgXCJmNjQtcmVtXCI6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHJldHVybiB4ICUgeTtcbiAgICB9LFxuICAgIFwiZjY0LXRvLWludFwiOiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4geCB8IDA7XG4gICAgfSxcbiAgICBcImkzMnMtZGl2XCI6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHJldHVybiAoKHggfCAwKSAvICh5IHwgMCkpIHwgMDtcbiAgICB9LFxuICAgIFwiaTMydS1kaXZcIjogZnVuY3Rpb24oeCwgeSkge1xuICAgICAgcmV0dXJuICgoeCA+Pj4gMCkgLyAoeSA+Pj4gMCkpID4+PiAwO1xuICAgIH0sXG4gICAgXCJpMzJzLXJlbVwiOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICByZXR1cm4gKCh4IHwgMCkgJSAoeSB8IDApKSB8IDA7XG4gICAgfSxcbiAgICBcImkzMnUtcmVtXCI6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHJldHVybiAoKHggPj4+IDApICUgKHkgPj4+IDApKSA+Pj4gMDtcbiAgICB9LFxuICAgIFwiZGVidWdnZXJcIjogZnVuY3Rpb24oKSB7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9LFxuICB9O1xuXG4gIHZhciBpbmZvID0ge1xuICAgICdnbG9iYWwnOiBudWxsLFxuICAgICdlbnYnOiBudWxsLFxuICAgICdhc20yd2FzbSc6IGFzbTJ3YXNtSW1wb3J0cyxcbiAgICAncGFyZW50JzogTW9kdWxlIC8vIE1vZHVsZSBpbnNpZGUgd2FzbS1qcy5jcHAgcmVmZXJzIHRvIHdhc20tanMuY3BwOyB0aGlzIGFsbG93cyBhY2Nlc3MgdG8gdGhlIG91dHNpZGUgcHJvZ3JhbS5cbiAgfTtcblxuICB2YXIgZXhwb3J0cyA9IG51bGw7XG5cbiAgZnVuY3Rpb24gbG9va3VwSW1wb3J0KG1vZCwgYmFzZSkge1xuICAgIHZhciBsb29rdXAgPSBpbmZvO1xuICAgIGlmIChtb2QuaW5kZXhPZignLicpIDwgMCkge1xuICAgICAgbG9va3VwID0gKGxvb2t1cCB8fCB7fSlbbW9kXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHBhcnRzID0gbW9kLnNwbGl0KCcuJyk7XG4gICAgICBsb29rdXAgPSAobG9va3VwIHx8IHt9KVtwYXJ0c1swXV07XG4gICAgICBsb29rdXAgPSAobG9va3VwIHx8IHt9KVtwYXJ0c1sxXV07XG4gICAgfVxuICAgIGlmIChiYXNlKSB7XG4gICAgICBsb29rdXAgPSAobG9va3VwIHx8IHt9KVtiYXNlXTtcbiAgICB9XG4gICAgaWYgKGxvb2t1cCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBhYm9ydCgnYmFkIGxvb2t1cEltcG9ydCB0byAoJyArIG1vZCArICcpLicgKyBiYXNlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvb2t1cDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlTWVtb3J5KG5ld0J1ZmZlcikge1xuICAgIC8vIFRoZSB3YXNtIGluc3RhbmNlIGNyZWF0ZXMgaXRzIG1lbW9yeS4gQnV0IHN0YXRpYyBpbml0IGNvZGUgbWlnaHQgaGF2ZSB3cml0dGVuIHRvXG4gICAgLy8gYnVmZmVyIGFscmVhZHksIGluY2x1ZGluZyB0aGUgbWVtIGluaXQgZmlsZSwgYW5kIHdlIG11c3QgY29weSBpdCBvdmVyIGluIGEgcHJvcGVyIG1lcmdlLlxuICAgIC8vIFRPRE86IGF2b2lkIHRoaXMgY29weSwgYnkgYXZvaWRpbmcgc3VjaCBzdGF0aWMgaW5pdCB3cml0ZXNcbiAgICAvLyBUT0RPOiBpbiBzaG9ydGVyIHRlcm0sIGp1c3QgY29weSB1cCB0byB0aGUgbGFzdCBzdGF0aWMgaW5pdCB3cml0ZVxuICAgIHZhciBvbGRCdWZmZXIgPSBNb2R1bGVbJ2J1ZmZlciddO1xuICAgIGlmIChuZXdCdWZmZXIuYnl0ZUxlbmd0aCA8IG9sZEJ1ZmZlci5ieXRlTGVuZ3RoKSB7XG4gICAgICBNb2R1bGVbJ3ByaW50RXJyJ10oJ3RoZSBuZXcgYnVmZmVyIGluIG1lcmdlTWVtb3J5IGlzIHNtYWxsZXIgdGhhbiB0aGUgcHJldmlvdXMgb25lLiBpbiBuYXRpdmUgd2FzbSwgd2Ugc2hvdWxkIGdyb3cgbWVtb3J5IGhlcmUnKTtcbiAgICB9XG4gICAgdmFyIG9sZFZpZXcgPSBuZXcgSW50OEFycmF5KG9sZEJ1ZmZlcik7XG4gICAgdmFyIG5ld1ZpZXcgPSBuZXcgSW50OEFycmF5KG5ld0J1ZmZlcik7XG5cbiAgICAvLyBJZiB3ZSBoYXZlIGEgbWVtIGluaXQgZmlsZSwgZG8gbm90IHRyYW1wbGUgaXRcbiAgICBpZiAoIW1lbW9yeUluaXRpYWxpemVyKSB7XG4gICAgICBvbGRWaWV3LnNldChuZXdWaWV3LnN1YmFycmF5KE1vZHVsZVsnU1RBVElDX0JBU0UnXSwgTW9kdWxlWydTVEFUSUNfQkFTRSddICsgTW9kdWxlWydTVEFUSUNfQlVNUCddKSwgTW9kdWxlWydTVEFUSUNfQkFTRSddKTtcbiAgICB9XG5cbiAgICBuZXdWaWV3LnNldChvbGRWaWV3KTtcbiAgICB1cGRhdGVHbG9iYWxCdWZmZXIobmV3QnVmZmVyKTtcbiAgICB1cGRhdGVHbG9iYWxCdWZmZXJWaWV3cygpO1xuICB9XG5cbiAgdmFyIFdhc21UeXBlcyA9IHtcbiAgICBub25lOiAwLFxuICAgIGkzMjogMSxcbiAgICBpNjQ6IDIsXG4gICAgZjMyOiAzLFxuICAgIGY2NDogNFxuICB9O1xuXG4gIGZ1bmN0aW9uIGZpeEltcG9ydHMoaW1wb3J0cykge1xuICAgIGlmICghMCkgcmV0dXJuIGltcG9ydHM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIGZvciAodmFyIGkgaW4gaW1wb3J0cykge1xuICAgICAgdmFyIGZpeGVkID0gaTtcbiAgICAgIGlmIChmaXhlZFswXSA9PSAnXycpIGZpeGVkID0gZml4ZWQuc3Vic3RyKDEpO1xuICAgICAgcmV0W2ZpeGVkXSA9IGltcG9ydHNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRCaW5hcnkoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBiaW5hcnk7XG4gICAgICBpZiAoTW9kdWxlWyd3YXNtQmluYXJ5J10pIHtcbiAgICAgICAgYmluYXJ5ID0gTW9kdWxlWyd3YXNtQmluYXJ5J107XG4gICAgICAgIGJpbmFyeSA9IG5ldyBVaW50OEFycmF5KGJpbmFyeSk7XG4gICAgICB9IGVsc2UgaWYgKE1vZHVsZVsncmVhZEJpbmFyeSddKSB7XG4gICAgICAgIGJpbmFyeSA9IE1vZHVsZVsncmVhZEJpbmFyeSddKHdhc21CaW5hcnlGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFwib24gdGhlIHdlYiwgd2UgbmVlZCB0aGUgd2FzbSBiaW5hcnkgdG8gYmUgcHJlbG9hZGVkIGFuZCBzZXQgb24gTW9kdWxlWyd3YXNtQmluYXJ5J10uIGVtY2MucHkgd2lsbCBkbyB0aGF0IGZvciB5b3Ugd2hlbiBnZW5lcmF0aW5nIEhUTUwgKGJ1dCBub3QgSlMpXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gYmluYXJ5O1xuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICBhYm9ydChlcnIpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJpbmFyeVByb21pc2UoKSB7XG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSB0aGUgYmluYXJ5IHlldCwgYW5kIGhhdmUgdGhlIEZldGNoIGFwaSwgdXNlIHRoYXRcbiAgICBpZiAoIU1vZHVsZVsnd2FzbUJpbmFyeSddICYmIHR5cGVvZiBmZXRjaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGZldGNoKHdhc21CaW5hcnlGaWxlLCB7IGNyZWRlbnRpYWxzOiAnc2FtZS1vcmlnaW4nIH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZVsnb2snXSkge1xuICAgICAgICAgIHRocm93IFwiZmFpbGVkIHRvIGxvYWQgd2FzbSBiaW5hcnkgZmlsZSBhdCAnXCIgKyB3YXNtQmluYXJ5RmlsZSArIFwiJ1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXNwb25zZVsnYXJyYXlCdWZmZXInXSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgZ2V0QmluYXJ5IHNob3VsZCBiZSBhYmxlIHRvIGdldCBpdCBzeW5jaHJvbm91c2x5XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVzb2x2ZShnZXRCaW5hcnkoKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBkby1tZXRob2QgZnVuY3Rpb25zXG5cbiAgZnVuY3Rpb24gZG9KdXN0QXNtKGdsb2JhbCwgZW52LCBwcm92aWRlZEJ1ZmZlcikge1xuICAgIC8vIGlmIG5vIE1vZHVsZS5hc20sIG9yIGl0J3MgdGhlIG1ldGhvZCBoYW5kbGVyIGhlbHBlciAoc2VlIGJlbG93KSwgdGhlbiBhcHBseVxuICAgIC8vIHRoZSBhc21qc1xuICAgIGlmICh0eXBlb2YgTW9kdWxlWydhc20nXSAhPT0gJ2Z1bmN0aW9uJyB8fCBNb2R1bGVbJ2FzbSddID09PSBtZXRob2RIYW5kbGVyKSB7XG4gICAgICBpZiAoIU1vZHVsZVsnYXNtUHJlbG9hZCddKSB7XG4gICAgICAgIC8vIHlvdSBjYW4gbG9hZCB0aGUgLmFzbS5qcyBmaWxlIGJlZm9yZSB0aGlzLCB0byBhdm9pZCB0aGlzIHN5bmMgeGhyIGFuZCBldmFsXG4gICAgICAgIGV2YWwoTW9kdWxlWydyZWFkJ10oYXNtanNDb2RlRmlsZSkpOyAvLyBzZXQgTW9kdWxlLmFzbVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTW9kdWxlWydhc20nXSA9IE1vZHVsZVsnYXNtUHJlbG9hZCddO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIE1vZHVsZVsnYXNtJ10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIE1vZHVsZVsncHJpbnRFcnInXSgnYXNtIGV2YWxsaW5nIGRpZCBub3Qgc2V0IHRoZSBtb2R1bGUgcHJvcGVybHknKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIE1vZHVsZVsnYXNtJ10oZ2xvYmFsLCBlbnYsIHByb3ZpZGVkQnVmZmVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvTmF0aXZlV2FzbShnbG9iYWwsIGVudiwgcHJvdmlkZWRCdWZmZXIpIHtcbiAgICBpZiAodHlwZW9mIFdlYkFzc2VtYmx5ICE9PSAnb2JqZWN0Jykge1xuICAgICAgTW9kdWxlWydwcmludEVyciddKCdubyBuYXRpdmUgd2FzbSBzdXBwb3J0IGRldGVjdGVkJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIHByZXBhcmUgbWVtb3J5IGltcG9ydFxuICAgIGlmICghKE1vZHVsZVsnd2FzbU1lbW9yeSddIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuTWVtb3J5KSkge1xuICAgICAgTW9kdWxlWydwcmludEVyciddKCdubyBuYXRpdmUgd2FzbSBNZW1vcnkgaW4gdXNlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVudlsnbWVtb3J5J10gPSBNb2R1bGVbJ3dhc21NZW1vcnknXTtcbiAgICAvLyBMb2FkIHRoZSB3YXNtIG1vZHVsZSBhbmQgY3JlYXRlIGFuIGluc3RhbmNlIG9mIHVzaW5nIG5hdGl2ZSBzdXBwb3J0IGluIHRoZSBKUyBlbmdpbmUuXG4gICAgaW5mb1snZ2xvYmFsJ10gPSB7XG4gICAgICAnTmFOJzogTmFOLFxuICAgICAgJ0luZmluaXR5JzogSW5maW5pdHlcbiAgICB9O1xuICAgIGluZm9bJ2dsb2JhbC5NYXRoJ10gPSBnbG9iYWwuTWF0aDtcbiAgICBpbmZvWydlbnYnXSA9IGVudjtcbiAgICAvLyBoYW5kbGUgYSBnZW5lcmF0ZWQgd2FzbSBpbnN0YW5jZSwgcmVjZWl2aW5nIGl0cyBleHBvcnRzIGFuZFxuICAgIC8vIHBlcmZvcm1pbmcgb3RoZXIgbmVjZXNzYXJ5IHNldHVwXG4gICAgZnVuY3Rpb24gcmVjZWl2ZUluc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICBleHBvcnRzID0gaW5zdGFuY2UuZXhwb3J0cztcbiAgICAgIGlmIChleHBvcnRzLm1lbW9yeSkgbWVyZ2VNZW1vcnkoZXhwb3J0cy5tZW1vcnkpO1xuICAgICAgTW9kdWxlWydhc20nXSA9IGV4cG9ydHM7XG4gICAgICBNb2R1bGVbXCJ1c2luZ1dhc21cIl0gPSB0cnVlO1xuICAgICAgcmVtb3ZlUnVuRGVwZW5kZW5jeSgnd2FzbS1pbnN0YW50aWF0ZScpO1xuICAgIH1cblxuICAgIGFkZFJ1bkRlcGVuZGVuY3koJ3dhc20taW5zdGFudGlhdGUnKTsgLy8gd2UgY2FuJ3QgcnVuIHlldFxuXG4gICAgLy8gVXNlciBzaGVsbCBwYWdlcyBjYW4gd3JpdGUgdGhlaXIgb3duIE1vZHVsZS5pbnN0YW50aWF0ZVdhc20gPSBmdW5jdGlvbihpbXBvcnRzLCBzdWNjZXNzQ2FsbGJhY2spIGNhbGxiYWNrXG4gICAgLy8gdG8gbWFudWFsbHkgaW5zdGFudGlhdGUgdGhlIFdhc20gbW9kdWxlIHRoZW1zZWx2ZXMuIFRoaXMgYWxsb3dzIHBhZ2VzIHRvIHJ1biB0aGUgaW5zdGFudGlhdGlvbiBwYXJhbGxlbFxuICAgIC8vIHRvIGFueSBvdGhlciBhc3luYyBzdGFydHVwIGFjdGlvbnMgdGhleSBhcmUgcGVyZm9ybWluZy5cbiAgICBpZiAoTW9kdWxlWydpbnN0YW50aWF0ZVdhc20nXSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIE1vZHVsZVsnaW5zdGFudGlhdGVXYXNtJ10oaW5mbywgcmVjZWl2ZUluc3RhbmNlKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBNb2R1bGVbJ3ByaW50RXJyJ10oJ01vZHVsZS5pbnN0YW50aWF0ZVdhc20gY2FsbGJhY2sgZmFpbGVkIHdpdGggZXJyb3I6ICcgKyBlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGdldEJpbmFyeVByb21pc2UoKS50aGVuKGZ1bmN0aW9uKGJpbmFyeSkge1xuICAgICAgcmV0dXJuIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKGJpbmFyeSwgaW5mbylcbiAgICB9KS50aGVuKGZ1bmN0aW9uKG91dHB1dCkge1xuICAgICAgLy8gcmVjZWl2ZUluc3RhbmNlKCkgd2lsbCBzd2FwIGluIHRoZSBleHBvcnRzICh0byBNb2R1bGUuYXNtKSBzbyB0aGV5IGNhbiBiZSBjYWxsZWRcbiAgICAgIHJlY2VpdmVJbnN0YW5jZShvdXRwdXRbJ2luc3RhbmNlJ10pO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgTW9kdWxlWydwcmludEVyciddKCdmYWlsZWQgdG8gYXN5bmNocm9ub3VzbHkgcHJlcGFyZSB3YXNtOiAnICsgcmVhc29uKTtcbiAgICAgIGFib3J0KHJlYXNvbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHt9OyAvLyBubyBleHBvcnRzIHlldDsgd2UnbGwgZmlsbCB0aGVtIGluIGxhdGVyXG4gIH1cblxuICBmdW5jdGlvbiBkb1dhc21Qb2x5ZmlsbChnbG9iYWwsIGVudiwgcHJvdmlkZWRCdWZmZXIsIG1ldGhvZCkge1xuICAgIGlmICh0eXBlb2YgV2FzbUpTICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBNb2R1bGVbJ3ByaW50RXJyJ10oJ1dhc21KUyBub3QgZGV0ZWN0ZWQgLSBwb2x5ZmlsbCBub3QgYnVuZGxlZD8nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBVc2Ugd2FzbS5qcyB0byBwb2x5ZmlsbCBhbmQgZXhlY3V0ZSBjb2RlIGluIGEgd2FzbSBpbnRlcnByZXRlci5cbiAgICB2YXIgd2FzbUpTID0gV2FzbUpTKHt9KTtcblxuICAgIC8vIFhYWCBkb24ndCBiZSBjb25mdXNlZC4gTW9kdWxlIGhlcmUgaXMgaW4gdGhlIG91dHNpZGUgcHJvZ3JhbS4gd2FzbUpTIGlzIHRoZSBpbm5lciB3YXNtLWpzLmNwcC5cbiAgICB3YXNtSlNbJ291dHNpZGUnXSA9IE1vZHVsZTsgLy8gSW5zaWRlIHdhc20tanMuY3BwLCBNb2R1bGVbJ291dHNpZGUnXSByZWFjaGVzIHRoZSBvdXRzaWRlIG1vZHVsZS5cblxuICAgIC8vIEluZm9ybWF0aW9uIGZvciB0aGUgaW5zdGFuY2Ugb2YgdGhlIG1vZHVsZS5cbiAgICB3YXNtSlNbJ2luZm8nXSA9IGluZm87XG5cbiAgICB3YXNtSlNbJ2xvb2t1cEltcG9ydCddID0gbG9va3VwSW1wb3J0O1xuXG4gICAgYXNzZXJ0KHByb3ZpZGVkQnVmZmVyID09PSBNb2R1bGVbJ2J1ZmZlciddKTsgLy8gd2Ugc2hvdWxkIG5vdCBldmVuIG5lZWQgdG8gcGFzcyBpdCBhcyBhIDNyZCBhcmcgZm9yIHdhc20sIGJ1dCB0aGF0J3MgdGhlIGFzbS5qcyB3YXkuXG5cbiAgICBpbmZvLmdsb2JhbCA9IGdsb2JhbDtcbiAgICBpbmZvLmVudiA9IGVudjtcblxuICAgIC8vIHBvbHlmaWxsIGludGVycHJldGVyIGV4cGVjdHMgYW4gQXJyYXlCdWZmZXJcbiAgICBhc3NlcnQocHJvdmlkZWRCdWZmZXIgPT09IE1vZHVsZVsnYnVmZmVyJ10pO1xuICAgIGVudlsnbWVtb3J5J10gPSBwcm92aWRlZEJ1ZmZlcjtcbiAgICBhc3NlcnQoZW52WydtZW1vcnknXSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAgIHdhc21KU1sncHJvdmlkZWRUb3RhbE1lbW9yeSddID0gTW9kdWxlWydidWZmZXInXS5ieXRlTGVuZ3RoO1xuXG4gICAgLy8gUHJlcGFyZSB0byBnZW5lcmF0ZSB3YXNtLCB1c2luZyBlaXRoZXIgYXNtMndhc20gb3Igcy1leHByc1xuICAgIHZhciBjb2RlO1xuICAgIGlmIChtZXRob2QgPT09ICdpbnRlcnByZXQtYmluYXJ5Jykge1xuICAgICAgY29kZSA9IGdldEJpbmFyeSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2RlID0gTW9kdWxlWydyZWFkJ10obWV0aG9kID09ICdpbnRlcnByZXQtYXNtMndhc20nID8gYXNtanNDb2RlRmlsZSA6IHdhc21UZXh0RmlsZSk7XG4gICAgfVxuICAgIHZhciB0ZW1wO1xuICAgIGlmIChtZXRob2QgPT0gJ2ludGVycHJldC1hc20yd2FzbScpIHtcbiAgICAgIHRlbXAgPSB3YXNtSlNbJ19tYWxsb2MnXShjb2RlLmxlbmd0aCArIDEpO1xuICAgICAgd2FzbUpTWyd3cml0ZUFzY2lpVG9NZW1vcnknXShjb2RlLCB0ZW1wKTtcbiAgICAgIHdhc21KU1snX2xvYWRfYXNtMndhc20nXSh0ZW1wKTtcbiAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ2ludGVycHJldC1zLWV4cHInKSB7XG4gICAgICB0ZW1wID0gd2FzbUpTWydfbWFsbG9jJ10oY29kZS5sZW5ndGggKyAxKTtcbiAgICAgIHdhc21KU1snd3JpdGVBc2NpaVRvTWVtb3J5J10oY29kZSwgdGVtcCk7XG4gICAgICB3YXNtSlNbJ19sb2FkX3NfZXhwcjJ3YXNtJ10odGVtcCk7XG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdpbnRlcnByZXQtYmluYXJ5Jykge1xuICAgICAgdGVtcCA9IHdhc21KU1snX21hbGxvYyddKGNvZGUubGVuZ3RoKTtcbiAgICAgIHdhc21KU1snSEVBUFU4J10uc2V0KGNvZGUsIHRlbXApO1xuICAgICAgd2FzbUpTWydfbG9hZF9iaW5hcnkyd2FzbSddKHRlbXAsIGNvZGUubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgJ3doYXQ/ICcgKyBtZXRob2Q7XG4gICAgfVxuICAgIHdhc21KU1snX2ZyZWUnXSh0ZW1wKTtcblxuICAgIHdhc21KU1snX2luc3RhbnRpYXRlJ10odGVtcCk7XG5cbiAgICBpZiAoTW9kdWxlWyduZXdCdWZmZXInXSkge1xuICAgICAgbWVyZ2VNZW1vcnkoTW9kdWxlWyduZXdCdWZmZXInXSk7XG4gICAgICBNb2R1bGVbJ25ld0J1ZmZlciddID0gbnVsbDtcbiAgICB9XG5cbiAgICBleHBvcnRzID0gd2FzbUpTWydhc21FeHBvcnRzJ107XG5cbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfVxuXG4gIC8vIFdlIG1heSBoYXZlIGEgcHJlbG9hZGVkIHZhbHVlIGluIE1vZHVsZS5hc20sIHNhdmUgaXRcbiAgTW9kdWxlWydhc21QcmVsb2FkJ10gPSBNb2R1bGVbJ2FzbSddO1xuXG4gIC8vIE1lbW9yeSBncm93dGggaW50ZWdyYXRpb24gY29kZVxuXG4gIHZhciBhc21qc1JlYWxsb2NCdWZmZXIgPSBNb2R1bGVbJ3JlYWxsb2NCdWZmZXInXTtcblxuICB2YXIgd2FzbVJlYWxsb2NCdWZmZXIgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgdmFyIFBBR0VfTVVMVElQTEUgPSBNb2R1bGVbXCJ1c2luZ1dhc21cIl0gPyBXQVNNX1BBR0VfU0laRSA6IEFTTUpTX1BBR0VfU0laRTsgLy8gSW4gd2FzbSwgaGVhcCBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NEtCLiBJbiBhc20uanMsIHRoZXkgbmVlZCB0byBiZSBtdWx0aXBsZXMgb2YgMTZNQi5cbiAgICBzaXplID0gYWxpZ25VcChzaXplLCBQQUdFX01VTFRJUExFKTsgLy8gcm91bmQgdXAgdG8gd2FzbSBwYWdlIHNpemVcbiAgICB2YXIgb2xkID0gTW9kdWxlWydidWZmZXInXTtcbiAgICB2YXIgb2xkU2l6ZSA9IG9sZC5ieXRlTGVuZ3RoO1xuICAgIGlmIChNb2R1bGVbXCJ1c2luZ1dhc21cIl0pIHtcbiAgICAgIC8vIG5hdGl2ZSB3YXNtIHN1cHBvcnRcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBNb2R1bGVbJ3dhc21NZW1vcnknXS5ncm93KChzaXplIC0gb2xkU2l6ZSkgLyB3YXNtUGFnZVNpemUpOyAvLyAuZ3JvdygpIHRha2VzIGEgZGVsdGEgY29tcGFyZWQgdG8gdGhlIHByZXZpb3VzIHNpemVcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gKC0xIHwgMCkpIHtcbiAgICAgICAgICAvLyBzdWNjZXNzIGluIG5hdGl2ZSB3YXNtIG1lbW9yeSBncm93dGgsIGdldCB0aGUgYnVmZmVyIGZyb20gdGhlIG1lbW9yeVxuICAgICAgICAgIHJldHVybiBNb2R1bGVbJ2J1ZmZlciddID0gTW9kdWxlWyd3YXNtTWVtb3J5J10uYnVmZmVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignTW9kdWxlLnJlYWxsb2NCdWZmZXI6IEF0dGVtcHRlZCB0byBncm93IGZyb20gJyArIG9sZFNpemUgICsgJyBieXRlcyB0byAnICsgc2l6ZSArICcgYnl0ZXMsIGJ1dCBnb3QgZXJyb3I6ICcgKyBlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHdhc20gaW50ZXJwcmV0ZXIgc3VwcG9ydFxuICAgICAgZXhwb3J0c1snX19ncm93V2FzbU1lbW9yeSddKChzaXplIC0gb2xkU2l6ZSkgLyB3YXNtUGFnZVNpemUpOyAvLyB0aW55IHdhc20gbWV0aG9kIHRoYXQganVzdCBkb2VzIGdyb3dfbWVtb3J5XG4gICAgICAvLyBpbiBpbnRlcnByZXRlciwgd2UgcmVwbGFjZSBNb2R1bGUuYnVmZmVyIGlmIHdlIGFsbG9jYXRlXG4gICAgICByZXR1cm4gTW9kdWxlWydidWZmZXInXSAhPT0gb2xkID8gTW9kdWxlWydidWZmZXInXSA6IG51bGw7IC8vIGlmIGl0IHdhcyByZWFsbG9jYXRlZCwgaXQgY2hhbmdlZFxuICAgIH1cbiAgfTtcblxuICBNb2R1bGVbJ3JlYWxsb2NCdWZmZXInXSA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICBpZiAoZmluYWxNZXRob2QgPT09ICdhc21qcycpIHtcbiAgICAgIHJldHVybiBhc21qc1JlYWxsb2NCdWZmZXIoc2l6ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB3YXNtUmVhbGxvY0J1ZmZlcihzaXplKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gd2UgbWF5IHRyeSBtb3JlIHRoYW4gb25lOyB0aGlzIGlzIHRoZSBmaW5hbCBvbmUsIHRoYXQgd29ya2VkIGFuZCB3ZSBhcmUgdXNpbmdcbiAgdmFyIGZpbmFsTWV0aG9kID0gJyc7XG5cbiAgLy8gUHJvdmlkZSBhbiBcImFzbS5qcyBmdW5jdGlvblwiIGZvciB0aGUgYXBwbGljYXRpb24sIGNhbGxlZCB0byBcImxpbmtcIiB0aGUgYXNtLmpzIG1vZHVsZS4gV2UgaW5zdGFudGlhdGVcbiAgLy8gdGhlIHdhc20gbW9kdWxlIGF0IHRoYXQgdGltZSwgYW5kIGl0IHJlY2VpdmVzIGltcG9ydHMgYW5kIHByb3ZpZGVzIGV4cG9ydHMgYW5kIHNvIGZvcnRoLCB0aGUgYXBwXG4gIC8vIGRvZXNuJ3QgbmVlZCB0byBjYXJlIHRoYXQgaXQgaXMgd2FzbSBvciBvbHlmaWxsZWQgd2FzbSBvciBhc20uanMuXG5cbiAgTW9kdWxlWydhc20nXSA9IGZ1bmN0aW9uKGdsb2JhbCwgZW52LCBwcm92aWRlZEJ1ZmZlcikge1xuICAgIGdsb2JhbCA9IGZpeEltcG9ydHMoZ2xvYmFsKTtcbiAgICBlbnYgPSBmaXhJbXBvcnRzKGVudik7XG5cbiAgICAvLyBpbXBvcnQgdGFibGVcbiAgICBpZiAoIWVudlsndGFibGUnXSkge1xuICAgICAgdmFyIFRBQkxFX1NJWkUgPSBNb2R1bGVbJ3dhc21UYWJsZVNpemUnXTtcbiAgICAgIGlmIChUQUJMRV9TSVpFID09PSB1bmRlZmluZWQpIFRBQkxFX1NJWkUgPSAxMDI0OyAvLyB3b3JrcyBpbiBiaW5hcnllbiBpbnRlcnByZXRlciBhdCBsZWFzdFxuICAgICAgdmFyIE1BWF9UQUJMRV9TSVpFID0gTW9kdWxlWyd3YXNtTWF4VGFibGVTaXplJ107XG4gICAgICBpZiAodHlwZW9mIFdlYkFzc2VtYmx5ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgV2ViQXNzZW1ibHkuVGFibGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaWYgKE1BWF9UQUJMRV9TSVpFICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlbnZbJ3RhYmxlJ10gPSBuZXcgV2ViQXNzZW1ibHkuVGFibGUoeyAnaW5pdGlhbCc6IFRBQkxFX1NJWkUsICdtYXhpbXVtJzogTUFYX1RBQkxFX1NJWkUsICdlbGVtZW50JzogJ2FueWZ1bmMnIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudlsndGFibGUnXSA9IG5ldyBXZWJBc3NlbWJseS5UYWJsZSh7ICdpbml0aWFsJzogVEFCTEVfU0laRSwgZWxlbWVudDogJ2FueWZ1bmMnIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnZbJ3RhYmxlJ10gPSBuZXcgQXJyYXkoVEFCTEVfU0laRSk7IC8vIHdvcmtzIGluIGJpbmFyeWVuIGludGVycHJldGVyIGF0IGxlYXN0XG4gICAgICB9XG4gICAgICBNb2R1bGVbJ3dhc21UYWJsZSddID0gZW52Wyd0YWJsZSddO1xuICAgIH1cblxuICAgIGlmICghZW52WydtZW1vcnlCYXNlJ10pIHtcbiAgICAgIGVudlsnbWVtb3J5QmFzZSddID0gTW9kdWxlWydTVEFUSUNfQkFTRSddOyAvLyB0ZWxsIHRoZSBtZW1vcnkgc2VnbWVudHMgd2hlcmUgdG8gcGxhY2UgdGhlbXNlbHZlc1xuICAgIH1cbiAgICBpZiAoIWVudlsndGFibGVCYXNlJ10pIHtcbiAgICAgIGVudlsndGFibGVCYXNlJ10gPSAwOyAvLyB0YWJsZSBzdGFydHMgYXQgMCBieSBkZWZhdWx0LCBpbiBkeW5hbWljIGxpbmtpbmcgdGhpcyB3aWxsIGNoYW5nZVxuICAgIH1cblxuICAgIC8vIHRyeSB0aGUgbWV0aG9kcy4gZWFjaCBzaG91bGQgcmV0dXJuIHRoZSBleHBvcnRzIGlmIGl0IHN1Y2NlZWRlZFxuXG4gICAgdmFyIGV4cG9ydHM7XG4gICAgdmFyIG1ldGhvZHMgPSBtZXRob2Quc3BsaXQoJywnKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGN1cnIgPSBtZXRob2RzW2ldO1xuXG5cbiAgICAgIGZpbmFsTWV0aG9kID0gY3VycjtcblxuICAgICAgaWYgKGN1cnIgPT09ICduYXRpdmUtd2FzbScpIHtcbiAgICAgICAgaWYgKGV4cG9ydHMgPSBkb05hdGl2ZVdhc20oZ2xvYmFsLCBlbnYsIHByb3ZpZGVkQnVmZmVyKSkgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKGN1cnIgPT09ICdhc21qcycpIHtcbiAgICAgICAgaWYgKGV4cG9ydHMgPSBkb0p1c3RBc20oZ2xvYmFsLCBlbnYsIHByb3ZpZGVkQnVmZmVyKSkgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKGN1cnIgPT09ICdpbnRlcnByZXQtYXNtMndhc20nIHx8IGN1cnIgPT09ICdpbnRlcnByZXQtcy1leHByJyB8fCBjdXJyID09PSAnaW50ZXJwcmV0LWJpbmFyeScpIHtcbiAgICAgICAgaWYgKGV4cG9ydHMgPSBkb1dhc21Qb2x5ZmlsbChnbG9iYWwsIGVudiwgcHJvdmlkZWRCdWZmZXIsIGN1cnIpKSBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFib3J0KCdiYWQgbWV0aG9kOiAnICsgY3Vycik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFleHBvcnRzKSB0aHJvdyAnbm8gYmluYXJ5ZW4gbWV0aG9kIHN1Y2NlZWRlZC4gY29uc2lkZXIgZW5hYmxpbmcgbW9yZSBvcHRpb25zLCBsaWtlIGludGVycHJldGluZywgaWYgeW91IHdhbnQgdGhhdDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXBrZW4vZW1zY3JpcHRlbi93aWtpL1dlYkFzc2VtYmx5I2JpbmFyeWVuLW1ldGhvZHMnO1xuXG5cbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfTtcblxuICB2YXIgbWV0aG9kSGFuZGxlciA9IE1vZHVsZVsnYXNtJ107IC8vIG5vdGUgb3VyIG1ldGhvZCBoYW5kbGVyLCBhcyB3ZSBtYXkgbW9kaWZ5IE1vZHVsZVsnYXNtJ10gbGF0ZXJcbn1cblxuaW50ZWdyYXRlV2FzbUpTKE1vZHVsZSk7XG5cbi8vID09PSBCb2R5ID09PVxuXG52YXIgQVNNX0NPTlNUUyA9IFtdO1xuXG5cblxuXG5TVEFUSUNfQkFTRSA9IFJ1bnRpbWUuR0xPQkFMX0JBU0U7XG5cblNUQVRJQ1RPUCA9IFNUQVRJQ19CQVNFICsgMjIzNTI7XG4vKiBnbG9iYWwgaW5pdGlhbGl6ZXJzICovICBfX0FUSU5JVF9fLnB1c2goeyBmdW5jOiBmdW5jdGlvbigpIHsgX19HTE9CQUxfX3N1Yl9JX2FwaV9jcHAoKSB9IH0sIHsgZnVuYzogZnVuY3Rpb24oKSB7IF9fR0xPQkFMX19zdWJfSV9iaW5kX2NwcCgpIH0gfSk7XG5cblxubWVtb3J5SW5pdGlhbGl6ZXIgPSBNb2R1bGVbXCJ3YXNtSlNNZXRob2RcIl0uaW5kZXhPZihcImFzbWpzXCIpID49IDAgfHwgTW9kdWxlW1wid2FzbUpTTWV0aG9kXCJdLmluZGV4T2YoXCJpbnRlcnByZXQtYXNtMndhc21cIikgPj0gMCA/IFwibGlianBlZ2FzbS5qcy5tZW1cIiA6IG51bGw7XG5cblxuXG5cbnZhciBTVEFUSUNfQlVNUCA9IDIyMzUyO1xuTW9kdWxlW1wiU1RBVElDX0JBU0VcIl0gPSBTVEFUSUNfQkFTRTtcbk1vZHVsZVtcIlNUQVRJQ19CVU1QXCJdID0gU1RBVElDX0JVTVA7XG5cbi8qIG5vIG1lbW9yeSBpbml0aWFsaXplciAqL1xudmFyIHRlbXBEb3VibGVQdHIgPSBTVEFUSUNUT1A7IFNUQVRJQ1RPUCArPSAxNjtcblxuYXNzZXJ0KHRlbXBEb3VibGVQdHIgJSA4ID09IDApO1xuXG5mdW5jdGlvbiBjb3B5VGVtcEZsb2F0KHB0cikgeyAvLyBmdW5jdGlvbnMsIGJlY2F1c2UgaW5saW5pbmcgdGhpcyBjb2RlIGluY3JlYXNlcyBjb2RlIHNpemUgdG9vIG11Y2hcblxuICBIRUFQOFt0ZW1wRG91YmxlUHRyXSA9IEhFQVA4W3B0cl07XG5cbiAgSEVBUDhbdGVtcERvdWJsZVB0cisxXSA9IEhFQVA4W3B0cisxXTtcblxuICBIRUFQOFt0ZW1wRG91YmxlUHRyKzJdID0gSEVBUDhbcHRyKzJdO1xuXG4gIEhFQVA4W3RlbXBEb3VibGVQdHIrM10gPSBIRUFQOFtwdHIrM107XG5cbn1cblxuZnVuY3Rpb24gY29weVRlbXBEb3VibGUocHRyKSB7XG5cbiAgSEVBUDhbdGVtcERvdWJsZVB0cl0gPSBIRUFQOFtwdHJdO1xuXG4gIEhFQVA4W3RlbXBEb3VibGVQdHIrMV0gPSBIRUFQOFtwdHIrMV07XG5cbiAgSEVBUDhbdGVtcERvdWJsZVB0cisyXSA9IEhFQVA4W3B0cisyXTtcblxuICBIRUFQOFt0ZW1wRG91YmxlUHRyKzNdID0gSEVBUDhbcHRyKzNdO1xuXG4gIEhFQVA4W3RlbXBEb3VibGVQdHIrNF0gPSBIRUFQOFtwdHIrNF07XG5cbiAgSEVBUDhbdGVtcERvdWJsZVB0cis1XSA9IEhFQVA4W3B0cis1XTtcblxuICBIRUFQOFt0ZW1wRG91YmxlUHRyKzZdID0gSEVBUDhbcHRyKzZdO1xuXG4gIEhFQVA4W3RlbXBEb3VibGVQdHIrN10gPSBIRUFQOFtwdHIrN107XG5cbn1cblxuLy8ge3tQUkVfTElCUkFSWX19XG5cblxuICBmdW5jdGlvbiBfX19hc3NlcnRfZmFpbChjb25kaXRpb24sIGZpbGVuYW1lLCBsaW5lLCBmdW5jKSB7XG4gICAgICBBQk9SVCA9IHRydWU7XG4gICAgICB0aHJvdyAnQXNzZXJ0aW9uIGZhaWxlZDogJyArIFBvaW50ZXJfc3RyaW5naWZ5KGNvbmRpdGlvbikgKyAnLCBhdDogJyArIFtmaWxlbmFtZSA/IFBvaW50ZXJfc3RyaW5naWZ5KGZpbGVuYW1lKSA6ICd1bmtub3duIGZpbGVuYW1lJywgbGluZSwgZnVuYyA/IFBvaW50ZXJfc3RyaW5naWZ5KGZ1bmMpIDogJ3Vua25vd24gZnVuY3Rpb24nXSArICcgYXQgJyArIHN0YWNrVHJhY2UoKTtcbiAgICB9XG5cbiAgXG4gIFxuICBcbiAgZnVuY3Rpb24gZW1iaW5kX2luaXRfY2hhckNvZGVzKCkge1xuICAgICAgdmFyIGNvZGVzID0gbmV3IEFycmF5KDI1Nik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gICAgICAgICAgY29kZXNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpO1xuICAgICAgfVxuICAgICAgZW1iaW5kX2NoYXJDb2RlcyA9IGNvZGVzO1xuICAgIH12YXIgZW1iaW5kX2NoYXJDb2Rlcz11bmRlZmluZWQ7ZnVuY3Rpb24gcmVhZExhdGluMVN0cmluZyhwdHIpIHtcbiAgICAgIHZhciByZXQgPSBcIlwiO1xuICAgICAgdmFyIGMgPSBwdHI7XG4gICAgICB3aGlsZSAoSEVBUFU4W2NdKSB7XG4gICAgICAgICAgcmV0ICs9IGVtYmluZF9jaGFyQ29kZXNbSEVBUFU4W2MrK11dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIFxuICBcbiAgdmFyIGF3YWl0aW5nRGVwZW5kZW5jaWVzPXt9O1xuICBcbiAgdmFyIHJlZ2lzdGVyZWRUeXBlcz17fTtcbiAgXG4gIHZhciB0eXBlRGVwZW5kZW5jaWVzPXt9O1xuICBcbiAgXG4gIFxuICBcbiAgXG4gIFxuICB2YXIgY2hhcl8wPTQ4O1xuICBcbiAgdmFyIGNoYXJfOT01NztmdW5jdGlvbiBtYWtlTGVnYWxGdW5jdGlvbk5hbWUobmFtZSkge1xuICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gbmFtZSkge1xuICAgICAgICAgIHJldHVybiAnX3Vua25vd24nO1xuICAgICAgfVxuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW15hLXpBLVowLTlfXS9nLCAnJCcpO1xuICAgICAgdmFyIGYgPSBuYW1lLmNoYXJDb2RlQXQoMCk7XG4gICAgICBpZiAoZiA+PSBjaGFyXzAgJiYgZiA8PSBjaGFyXzkpIHtcbiAgICAgICAgICByZXR1cm4gJ18nICsgbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICB9XG4gICAgfWZ1bmN0aW9uIGNyZWF0ZU5hbWVkRnVuY3Rpb24obmFtZSwgYm9keSkge1xuICAgICAgbmFtZSA9IG1ha2VMZWdhbEZ1bmN0aW9uTmFtZShuYW1lKTtcbiAgICAgIC8qanNoaW50IGV2aWw6dHJ1ZSovXG4gICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFxuICAgICAgICAgIFwiYm9keVwiLFxuICAgICAgICAgIFwicmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArIFwiKCkge1xcblwiICtcbiAgICAgICAgICBcIiAgICBcXFwidXNlIHN0cmljdFxcXCI7XCIgK1xuICAgICAgICAgIFwiICAgIHJldHVybiBib2R5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XFxuXCIgK1xuICAgICAgICAgIFwifTtcXG5cIlxuICAgICAgKShib2R5KTtcbiAgICB9ZnVuY3Rpb24gZXh0ZW5kRXJyb3IoYmFzZUVycm9yVHlwZSwgZXJyb3JOYW1lKSB7XG4gICAgICB2YXIgZXJyb3JDbGFzcyA9IGNyZWF0ZU5hbWVkRnVuY3Rpb24oZXJyb3JOYW1lLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgdGhpcy5uYW1lID0gZXJyb3JOYW1lO1xuICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIFxuICAgICAgICAgIHZhciBzdGFjayA9IChuZXcgRXJyb3IobWVzc2FnZSkpLnN0YWNrO1xuICAgICAgICAgIGlmIChzdGFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuc3RhY2sgPSB0aGlzLnRvU3RyaW5nKCkgKyAnXFxuJyArXG4gICAgICAgICAgICAgICAgICBzdGFjay5yZXBsYWNlKC9eRXJyb3IoOlteXFxuXSopP1xcbi8sICcnKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGVycm9yQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShiYXNlRXJyb3JUeXBlLnByb3RvdHlwZSk7XG4gICAgICBlcnJvckNsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGVycm9yQ2xhc3M7XG4gICAgICBlcnJvckNsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh0aGlzLm1lc3NhZ2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyAnOiAnICsgdGhpcy5tZXNzYWdlO1xuICAgICAgICAgIH1cbiAgICAgIH07XG4gIFxuICAgICAgcmV0dXJuIGVycm9yQ2xhc3M7XG4gICAgfXZhciBCaW5kaW5nRXJyb3I9dW5kZWZpbmVkO2Z1bmN0aW9uIHRocm93QmluZGluZ0Vycm9yKG1lc3NhZ2UpIHtcbiAgICAgIHRocm93IG5ldyBCaW5kaW5nRXJyb3IobWVzc2FnZSk7XG4gICAgfVxuICBcbiAgXG4gIFxuICB2YXIgSW50ZXJuYWxFcnJvcj11bmRlZmluZWQ7ZnVuY3Rpb24gdGhyb3dJbnRlcm5hbEVycm9yKG1lc3NhZ2UpIHtcbiAgICAgIHRocm93IG5ldyBJbnRlcm5hbEVycm9yKG1lc3NhZ2UpO1xuICAgIH1mdW5jdGlvbiB3aGVuRGVwZW5kZW50VHlwZXNBcmVSZXNvbHZlZChteVR5cGVzLCBkZXBlbmRlbnRUeXBlcywgZ2V0VHlwZUNvbnZlcnRlcnMpIHtcbiAgICAgIG15VHlwZXMuZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgdHlwZURlcGVuZGVuY2llc1t0eXBlXSA9IGRlcGVuZGVudFR5cGVzO1xuICAgICAgfSk7XG4gIFxuICAgICAgZnVuY3Rpb24gb25Db21wbGV0ZSh0eXBlQ29udmVydGVycykge1xuICAgICAgICAgIHZhciBteVR5cGVDb252ZXJ0ZXJzID0gZ2V0VHlwZUNvbnZlcnRlcnModHlwZUNvbnZlcnRlcnMpO1xuICAgICAgICAgIGlmIChteVR5cGVDb252ZXJ0ZXJzLmxlbmd0aCAhPT0gbXlUeXBlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdGhyb3dJbnRlcm5hbEVycm9yKCdNaXNtYXRjaGVkIHR5cGUgY29udmVydGVyIGNvdW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbXlUeXBlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICByZWdpc3RlclR5cGUobXlUeXBlc1tpXSwgbXlUeXBlQ29udmVydGVyc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICBcbiAgICAgIHZhciB0eXBlQ29udmVydGVycyA9IG5ldyBBcnJheShkZXBlbmRlbnRUeXBlcy5sZW5ndGgpO1xuICAgICAgdmFyIHVucmVnaXN0ZXJlZFR5cGVzID0gW107XG4gICAgICB2YXIgcmVnaXN0ZXJlZCA9IDA7XG4gICAgICBkZXBlbmRlbnRUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKGR0LCBpKSB7XG4gICAgICAgICAgaWYgKHJlZ2lzdGVyZWRUeXBlcy5oYXNPd25Qcm9wZXJ0eShkdCkpIHtcbiAgICAgICAgICAgICAgdHlwZUNvbnZlcnRlcnNbaV0gPSByZWdpc3RlcmVkVHlwZXNbZHRdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHVucmVnaXN0ZXJlZFR5cGVzLnB1c2goZHQpO1xuICAgICAgICAgICAgICBpZiAoIWF3YWl0aW5nRGVwZW5kZW5jaWVzLmhhc093blByb3BlcnR5KGR0KSkge1xuICAgICAgICAgICAgICAgICAgYXdhaXRpbmdEZXBlbmRlbmNpZXNbZHRdID0gW107XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXdhaXRpbmdEZXBlbmRlbmNpZXNbZHRdLnB1c2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICB0eXBlQ29udmVydGVyc1tpXSA9IHJlZ2lzdGVyZWRUeXBlc1tkdF07XG4gICAgICAgICAgICAgICAgICArK3JlZ2lzdGVyZWQ7XG4gICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCA9PT0gdW5yZWdpc3RlcmVkVHlwZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgb25Db21wbGV0ZSh0eXBlQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKDAgPT09IHVucmVnaXN0ZXJlZFR5cGVzLmxlbmd0aCkge1xuICAgICAgICAgIG9uQ29tcGxldGUodHlwZUNvbnZlcnRlcnMpO1xuICAgICAgfVxuICAgIH1mdW5jdGlvbiByZWdpc3RlclR5cGUocmF3VHlwZSwgcmVnaXN0ZXJlZEluc3RhbmNlLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgXG4gICAgICBpZiAoISgnYXJnUGFja0FkdmFuY2UnIGluIHJlZ2lzdGVyZWRJbnN0YW5jZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyZWdpc3RlclR5cGUgcmVnaXN0ZXJlZEluc3RhbmNlIHJlcXVpcmVzIGFyZ1BhY2tBZHZhbmNlJyk7XG4gICAgICB9XG4gIFxuICAgICAgdmFyIG5hbWUgPSByZWdpc3RlcmVkSW5zdGFuY2UubmFtZTtcbiAgICAgIGlmICghcmF3VHlwZSkge1xuICAgICAgICAgIHRocm93QmluZGluZ0Vycm9yKCd0eXBlIFwiJyArIG5hbWUgKyAnXCIgbXVzdCBoYXZlIGEgcG9zaXRpdmUgaW50ZWdlciB0eXBlaWQgcG9pbnRlcicpO1xuICAgICAgfVxuICAgICAgaWYgKHJlZ2lzdGVyZWRUeXBlcy5oYXNPd25Qcm9wZXJ0eShyYXdUeXBlKSkge1xuICAgICAgICAgIGlmIChvcHRpb25zLmlnbm9yZUR1cGxpY2F0ZVJlZ2lzdHJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93QmluZGluZ0Vycm9yKFwiQ2Fubm90IHJlZ2lzdGVyIHR5cGUgJ1wiICsgbmFtZSArIFwiJyB0d2ljZVwiKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIFxuICAgICAgcmVnaXN0ZXJlZFR5cGVzW3Jhd1R5cGVdID0gcmVnaXN0ZXJlZEluc3RhbmNlO1xuICAgICAgZGVsZXRlIHR5cGVEZXBlbmRlbmNpZXNbcmF3VHlwZV07XG4gIFxuICAgICAgaWYgKGF3YWl0aW5nRGVwZW5kZW5jaWVzLmhhc093blByb3BlcnR5KHJhd1R5cGUpKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGF3YWl0aW5nRGVwZW5kZW5jaWVzW3Jhd1R5cGVdO1xuICAgICAgICAgIGRlbGV0ZSBhd2FpdGluZ0RlcGVuZGVuY2llc1tyYXdUeXBlXTtcbiAgICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYikge1xuICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1mdW5jdGlvbiBfX2VtYmluZF9yZWdpc3Rlcl92b2lkKHJhd1R5cGUsIG5hbWUpIHtcbiAgICAgIG5hbWUgPSByZWFkTGF0aW4xU3RyaW5nKG5hbWUpO1xuICAgICAgcmVnaXN0ZXJUeXBlKHJhd1R5cGUsIHtcbiAgICAgICAgICBpc1ZvaWQ6IHRydWUsIC8vIHZvaWQgcmV0dXJuIHZhbHVlcyBjYW4gYmUgb3B0aW1pemVkIG91dCBzb21ldGltZXNcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICdhcmdQYWNrQWR2YW5jZSc6IDAsXG4gICAgICAgICAgJ2Zyb21XaXJlVHlwZSc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3RvV2lyZVR5cGUnOiBmdW5jdGlvbihkZXN0cnVjdG9ycywgbykge1xuICAgICAgICAgICAgICAvLyBUT0RPOiBhc3NlcnQgaWYgYW55dGhpbmcgZWxzZSBpcyBnaXZlbj9cbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gIFxuICBmdW5jdGlvbiBfX1pTdDE4dW5jYXVnaHRfZXhjZXB0aW9udigpIHsgLy8gc3RkOjp1bmNhdWdodF9leGNlcHRpb24oKVxuICAgICAgcmV0dXJuICEhX19aU3QxOHVuY2F1Z2h0X2V4Y2VwdGlvbnYudW5jYXVnaHRfZXhjZXB0aW9uO1xuICAgIH1cbiAgXG4gIFxuICBcbiAgdmFyIEVYQ0VQVElPTlM9e2xhc3Q6MCxjYXVnaHQ6W10saW5mb3M6e30sZGVBZGp1c3Q6ZnVuY3Rpb24gKGFkanVzdGVkKSB7XG4gICAgICAgIGlmICghYWRqdXN0ZWQgfHwgRVhDRVBUSU9OUy5pbmZvc1thZGp1c3RlZF0pIHJldHVybiBhZGp1c3RlZDtcbiAgICAgICAgZm9yICh2YXIgcHRyIGluIEVYQ0VQVElPTlMuaW5mb3MpIHtcbiAgICAgICAgICB2YXIgaW5mbyA9IEVYQ0VQVElPTlMuaW5mb3NbcHRyXTtcbiAgICAgICAgICBpZiAoaW5mby5hZGp1c3RlZCA9PT0gYWRqdXN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBwdHI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhZGp1c3RlZDtcbiAgICAgIH0sYWRkUmVmOmZ1bmN0aW9uIChwdHIpIHtcbiAgICAgICAgaWYgKCFwdHIpIHJldHVybjtcbiAgICAgICAgdmFyIGluZm8gPSBFWENFUFRJT05TLmluZm9zW3B0cl07XG4gICAgICAgIGluZm8ucmVmY291bnQrKztcbiAgICAgIH0sZGVjUmVmOmZ1bmN0aW9uIChwdHIpIHtcbiAgICAgICAgaWYgKCFwdHIpIHJldHVybjtcbiAgICAgICAgdmFyIGluZm8gPSBFWENFUFRJT05TLmluZm9zW3B0cl07XG4gICAgICAgIGFzc2VydChpbmZvLnJlZmNvdW50ID4gMCk7XG4gICAgICAgIGluZm8ucmVmY291bnQtLTtcbiAgICAgICAgLy8gQSByZXRocm93biBleGNlcHRpb24gY2FuIHJlYWNoIHJlZmNvdW50IDA7IGl0IG11c3Qgbm90IGJlIGRpc2NhcmRlZFxuICAgICAgICAvLyBJdHMgbmV4dCBoYW5kbGVyIHdpbGwgY2xlYXIgdGhlIHJldGhyb3duIGZsYWcgYW5kIGFkZFJlZiBpdCwgcHJpb3IgdG9cbiAgICAgICAgLy8gZmluYWwgZGVjUmVmIGFuZCBkZXN0cnVjdGlvbiBoZXJlXG4gICAgICAgIGlmIChpbmZvLnJlZmNvdW50ID09PSAwICYmICFpbmZvLnJldGhyb3duKSB7XG4gICAgICAgICAgaWYgKGluZm8uZGVzdHJ1Y3Rvcikge1xuICAgICAgICAgICAgTW9kdWxlWydkeW5DYWxsX3ZpJ10oaW5mby5kZXN0cnVjdG9yLCBwdHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgRVhDRVBUSU9OUy5pbmZvc1twdHJdO1xuICAgICAgICAgIF9fX2N4YV9mcmVlX2V4Y2VwdGlvbihwdHIpO1xuICAgICAgICB9XG4gICAgICB9LGNsZWFyUmVmOmZ1bmN0aW9uIChwdHIpIHtcbiAgICAgICAgaWYgKCFwdHIpIHJldHVybjtcbiAgICAgICAgdmFyIGluZm8gPSBFWENFUFRJT05TLmluZm9zW3B0cl07XG4gICAgICAgIGluZm8ucmVmY291bnQgPSAwO1xuICAgICAgfX07XG4gIGZ1bmN0aW9uIF9fX3Jlc3VtZUV4Y2VwdGlvbihwdHIpIHtcbiAgICAgIGlmICghRVhDRVBUSU9OUy5sYXN0KSB7IEVYQ0VQVElPTlMubGFzdCA9IHB0cjsgfVxuICAgICAgdGhyb3cgcHRyO1xuICAgIH1mdW5jdGlvbiBfX19jeGFfZmluZF9tYXRjaGluZ19jYXRjaCgpIHtcbiAgICAgIHZhciB0aHJvd24gPSBFWENFUFRJT05TLmxhc3Q7XG4gICAgICBpZiAoIXRocm93bikge1xuICAgICAgICAvLyBqdXN0IHBhc3MgdGhyb3VnaCB0aGUgbnVsbCBwdHJcbiAgICAgICAgcmV0dXJuICgoUnVudGltZS5zZXRUZW1wUmV0MCgwKSwwKXwwKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbmZvID0gRVhDRVBUSU9OUy5pbmZvc1t0aHJvd25dO1xuICAgICAgdmFyIHRocm93bnR5cGUgPSBpbmZvLnR5cGU7XG4gICAgICBpZiAoIXRocm93bnR5cGUpIHtcbiAgICAgICAgLy8ganVzdCBwYXNzIHRocm91Z2ggdGhlIHRocm93biBwdHJcbiAgICAgICAgcmV0dXJuICgoUnVudGltZS5zZXRUZW1wUmV0MCgwKSx0aHJvd24pfDApO1xuICAgICAgfVxuICAgICAgdmFyIHR5cGVBcnJheSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIFxuICAgICAgdmFyIHBvaW50ZXIgPSBNb2R1bGVbJ19fX2N4YV9pc19wb2ludGVyX3R5cGUnXSh0aHJvd250eXBlKTtcbiAgICAgIC8vIGNhbl9jYXRjaCByZWNlaXZlcyBhICoqLCBhZGQgaW5kaXJlY3Rpb25cbiAgICAgIGlmICghX19fY3hhX2ZpbmRfbWF0Y2hpbmdfY2F0Y2guYnVmZmVyKSBfX19jeGFfZmluZF9tYXRjaGluZ19jYXRjaC5idWZmZXIgPSBfbWFsbG9jKDQpO1xuICAgICAgSEVBUDMyWygoX19fY3hhX2ZpbmRfbWF0Y2hpbmdfY2F0Y2guYnVmZmVyKT4+MildPXRocm93bjtcbiAgICAgIHRocm93biA9IF9fX2N4YV9maW5kX21hdGNoaW5nX2NhdGNoLmJ1ZmZlcjtcbiAgICAgIC8vIFRoZSBkaWZmZXJlbnQgY2F0Y2ggYmxvY2tzIGFyZSBkZW5vdGVkIGJ5IGRpZmZlcmVudCB0eXBlcy5cbiAgICAgIC8vIER1ZSB0byBpbmhlcml0YW5jZSwgdGhvc2UgdHlwZXMgbWF5IG5vdCBwcmVjaXNlbHkgbWF0Y2ggdGhlXG4gICAgICAvLyB0eXBlIG9mIHRoZSB0aHJvd24gb2JqZWN0LiBGaW5kIG9uZSB3aGljaCBtYXRjaGVzLCBhbmRcbiAgICAgIC8vIHJldHVybiB0aGUgdHlwZSBvZiB0aGUgY2F0Y2ggYmxvY2sgd2hpY2ggc2hvdWxkIGJlIGNhbGxlZC5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZUFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlQXJyYXlbaV0gJiYgTW9kdWxlWydfX19jeGFfY2FuX2NhdGNoJ10odHlwZUFycmF5W2ldLCB0aHJvd250eXBlLCB0aHJvd24pKSB7XG4gICAgICAgICAgdGhyb3duID0gSEVBUDMyWygodGhyb3duKT4+MildOyAvLyB1bmRvIGluZGlyZWN0aW9uXG4gICAgICAgICAgaW5mby5hZGp1c3RlZCA9IHRocm93bjtcbiAgICAgICAgICByZXR1cm4gKChSdW50aW1lLnNldFRlbXBSZXQwKHR5cGVBcnJheVtpXSksdGhyb3duKXwwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gU2hvdWxkbid0IGhhcHBlbiB1bmxlc3Mgd2UgaGF2ZSBib2d1cyBkYXRhIGluIHR5cGVBcnJheVxuICAgICAgLy8gb3IgZW5jb3VudGVyIGEgdHlwZSBmb3Igd2hpY2ggZW1zY3JpcHRlbiBkb2Vzbid0IGhhdmUgc3VpdGFibGVcbiAgICAgIC8vIHR5cGVpbmZvIGRlZmluZWQuIEJlc3QtZWZmb3J0cyBtYXRjaCBqdXN0IGluIGNhc2UuXG4gICAgICB0aHJvd24gPSBIRUFQMzJbKCh0aHJvd24pPj4yKV07IC8vIHVuZG8gaW5kaXJlY3Rpb25cbiAgICAgIHJldHVybiAoKFJ1bnRpbWUuc2V0VGVtcFJldDAodGhyb3dudHlwZSksdGhyb3duKXwwKTtcbiAgICB9ZnVuY3Rpb24gX19fY3hhX3Rocm93KHB0ciwgdHlwZSwgZGVzdHJ1Y3Rvcikge1xuICAgICAgRVhDRVBUSU9OUy5pbmZvc1twdHJdID0ge1xuICAgICAgICBwdHI6IHB0cixcbiAgICAgICAgYWRqdXN0ZWQ6IHB0cixcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgZGVzdHJ1Y3RvcjogZGVzdHJ1Y3RvcixcbiAgICAgICAgcmVmY291bnQ6IDAsXG4gICAgICAgIGNhdWdodDogZmFsc2UsXG4gICAgICAgIHJldGhyb3duOiBmYWxzZVxuICAgICAgfTtcbiAgICAgIEVYQ0VQVElPTlMubGFzdCA9IHB0cjtcbiAgICAgIGlmICghKFwidW5jYXVnaHRfZXhjZXB0aW9uXCIgaW4gX19aU3QxOHVuY2F1Z2h0X2V4Y2VwdGlvbnYpKSB7XG4gICAgICAgIF9fWlN0MTh1bmNhdWdodF9leGNlcHRpb252LnVuY2F1Z2h0X2V4Y2VwdGlvbiA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfX1pTdDE4dW5jYXVnaHRfZXhjZXB0aW9udi51bmNhdWdodF9leGNlcHRpb24rKztcbiAgICAgIH1cbiAgICAgIHRocm93IHB0cjtcbiAgICB9XG5cbiAgIFxuICBNb2R1bGVbXCJfbWVtc2V0XCJdID0gX21lbXNldDtcblxuICBcbiAgZnVuY3Rpb24gZ2V0U2hpZnRGcm9tU2l6ZShzaXplKSB7XG4gICAgICBzd2l0Y2ggKHNpemUpIHtcbiAgICAgICAgICBjYXNlIDE6IHJldHVybiAwO1xuICAgICAgICAgIGNhc2UgMjogcmV0dXJuIDE7XG4gICAgICAgICAgY2FzZSA0OiByZXR1cm4gMjtcbiAgICAgICAgICBjYXNlIDg6IHJldHVybiAzO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gdHlwZSBzaXplOiAnICsgc2l6ZSk7XG4gICAgICB9XG4gICAgfWZ1bmN0aW9uIF9fZW1iaW5kX3JlZ2lzdGVyX2Jvb2wocmF3VHlwZSwgbmFtZSwgc2l6ZSwgdHJ1ZVZhbHVlLCBmYWxzZVZhbHVlKSB7XG4gICAgICB2YXIgc2hpZnQgPSBnZXRTaGlmdEZyb21TaXplKHNpemUpO1xuICBcbiAgICAgIG5hbWUgPSByZWFkTGF0aW4xU3RyaW5nKG5hbWUpO1xuICAgICAgcmVnaXN0ZXJUeXBlKHJhd1R5cGUsIHtcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICdmcm9tV2lyZVR5cGUnOiBmdW5jdGlvbih3dCkge1xuICAgICAgICAgICAgICAvLyBhbWJpZ3VvdXMgZW1zY3JpcHRlbiBBQkk6IHNvbWV0aW1lcyByZXR1cm4gdmFsdWVzIGFyZVxuICAgICAgICAgICAgICAvLyB0cnVlIG9yIGZhbHNlLCBhbmQgc29tZXRpbWVzIGludGVnZXJzICgwIG9yIDEpXG4gICAgICAgICAgICAgIHJldHVybiAhIXd0O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3RvV2lyZVR5cGUnOiBmdW5jdGlvbihkZXN0cnVjdG9ycywgbykge1xuICAgICAgICAgICAgICByZXR1cm4gbyA/IHRydWVWYWx1ZSA6IGZhbHNlVmFsdWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnYXJnUGFja0FkdmFuY2UnOiA4LFxuICAgICAgICAgICdyZWFkVmFsdWVGcm9tUG9pbnRlcic6IGZ1bmN0aW9uKHBvaW50ZXIpIHtcbiAgICAgICAgICAgICAgLy8gVE9ETzogaWYgaGVhcCBpcyBmaXhlZCAobGlrZSBpbiBhc20uanMpIHRoaXMgY291bGQgYmUgZXhlY3V0ZWQgb3V0c2lkZVxuICAgICAgICAgICAgICB2YXIgaGVhcDtcbiAgICAgICAgICAgICAgaWYgKHNpemUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgIGhlYXAgPSBIRUFQODtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChzaXplID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICBoZWFwID0gSEVBUDE2O1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpemUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgIGhlYXAgPSBIRUFQMzI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiVW5rbm93biBib29sZWFuIHR5cGUgc2l6ZTogXCIgKyBuYW1lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gdGhpc1snZnJvbVdpcmVUeXBlJ10oaGVhcFtwb2ludGVyID4+IHNoaWZ0XSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXN0cnVjdG9yRnVuY3Rpb246IG51bGwsIC8vIFRoaXMgdHlwZSBkb2VzIG5vdCBuZWVkIGEgZGVzdHJ1Y3RvclxuICAgICAgfSk7XG4gICAgfVxuXG4gIFxuICBmdW5jdGlvbiBzaW1wbGVSZWFkVmFsdWVGcm9tUG9pbnRlcihwb2ludGVyKSB7XG4gICAgICByZXR1cm4gdGhpc1snZnJvbVdpcmVUeXBlJ10oSEVBUFUzMltwb2ludGVyID4+IDJdKTtcbiAgICB9ZnVuY3Rpb24gX19lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyhyYXdUeXBlLCBuYW1lKSB7XG4gICAgICBuYW1lID0gcmVhZExhdGluMVN0cmluZyhuYW1lKTtcbiAgICAgIHJlZ2lzdGVyVHlwZShyYXdUeXBlLCB7XG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAnZnJvbVdpcmVUeXBlJzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgdmFyIGxlbmd0aCA9IEhFQVBVMzJbdmFsdWUgPj4gMl07XG4gICAgICAgICAgICAgIHZhciBhID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgIGFbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKEhFQVBVOFt2YWx1ZSArIDQgKyBpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgX2ZyZWUodmFsdWUpO1xuICAgICAgICAgICAgICByZXR1cm4gYS5qb2luKCcnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd0b1dpcmVUeXBlJzogZnVuY3Rpb24oZGVzdHJ1Y3RvcnMsIHZhbHVlKSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9IG5ldyBVaW50OEFycmF5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICBcbiAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0VEFFbGVtZW50KHRhLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhW2luZGV4XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmdW5jdGlvbiBnZXRTdHJpbmdFbGVtZW50KHN0cmluZywgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzdHJpbmcuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIGdldEVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgIGdldEVsZW1lbnQgPSBnZXRUQUVsZW1lbnQ7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBVaW50OENsYW1wZWRBcnJheSkge1xuICAgICAgICAgICAgICAgICAgZ2V0RWxlbWVudCA9IGdldFRBRWxlbWVudDtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEludDhBcnJheSkge1xuICAgICAgICAgICAgICAgICAgZ2V0RWxlbWVudCA9IGdldFRBRWxlbWVudDtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICBnZXRFbGVtZW50ID0gZ2V0U3RyaW5nRWxlbWVudDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRocm93QmluZGluZ0Vycm9yKCdDYW5ub3QgcGFzcyBub24tc3RyaW5nIHRvIHN0ZDo6c3RyaW5nJyk7XG4gICAgICAgICAgICAgIH1cbiAgXG4gICAgICAgICAgICAgIC8vIGFzc3VtZXMgNC1ieXRlIGFsaWdubWVudFxuICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICB2YXIgcHRyID0gX21hbGxvYyg0ICsgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgSEVBUFUzMltwdHIgPj4gMl0gPSBsZW5ndGg7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBjaGFyQ29kZSA9IGdldEVsZW1lbnQodmFsdWUsIGkpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgX2ZyZWUocHRyKTtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvd0JpbmRpbmdFcnJvcignU3RyaW5nIGhhcyBVVEYtMTYgY29kZSB1bml0cyB0aGF0IGRvIG5vdCBmaXQgaW4gOCBiaXRzJyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBIRUFQVThbcHRyICsgNCArIGldID0gY2hhckNvZGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGRlc3RydWN0b3JzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICBkZXN0cnVjdG9ycy5wdXNoKF9mcmVlLCBwdHIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwdHI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnYXJnUGFja0FkdmFuY2UnOiA4LFxuICAgICAgICAgICdyZWFkVmFsdWVGcm9tUG9pbnRlcic6IHNpbXBsZVJlYWRWYWx1ZUZyb21Qb2ludGVyLFxuICAgICAgICAgIGRlc3RydWN0b3JGdW5jdGlvbjogZnVuY3Rpb24ocHRyKSB7IF9mcmVlKHB0cik7IH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgZnVuY3Rpb24gX19fY3hhX2ZyZWVfZXhjZXB0aW9uKHB0cikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIF9mcmVlKHB0cik7XG4gICAgICB9IGNhdGNoKGUpIHsgLy8gWFhYIEZJWE1FXG4gICAgICAgIE1vZHVsZS5wcmludEVycignZXhjZXB0aW9uIGR1cmluZyBjeGFfZnJlZV9leGNlcHRpb246ICcgKyBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgZnVuY3Rpb24gX19fbG9jaygpIHt9XG5cbiAgZnVuY3Rpb24gX19fdW5sb2NrKCkge31cblxuICAgXG4gIE1vZHVsZVtcIl9zYXZlU2V0am1wXCJdID0gX3NhdmVTZXRqbXA7XG5cbiAgXG4gIGZ1bmN0aW9uIF9lbWJpbmRfcmVwcih2KSB7XG4gICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgICB9XG4gICAgICB2YXIgdCA9IHR5cGVvZiB2O1xuICAgICAgaWYgKHQgPT09ICdvYmplY3QnIHx8IHQgPT09ICdhcnJheScgfHwgdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHJldHVybiB2LnRvU3RyaW5nKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnJyArIHY7XG4gICAgICB9XG4gICAgfVxuICBcbiAgZnVuY3Rpb24gaW50ZWdlclJlYWRWYWx1ZUZyb21Qb2ludGVyKG5hbWUsIHNoaWZ0LCBzaWduZWQpIHtcbiAgICAgIC8vIGludGVnZXJzIGFyZSBxdWl0ZSBjb21tb24sIHNvIGdlbmVyYXRlIHZlcnkgc3BlY2lhbGl6ZWQgZnVuY3Rpb25zXG4gICAgICBzd2l0Y2ggKHNoaWZ0KSB7XG4gICAgICAgICAgY2FzZSAwOiByZXR1cm4gc2lnbmVkID9cbiAgICAgICAgICAgICAgZnVuY3Rpb24gcmVhZFM4RnJvbVBvaW50ZXIocG9pbnRlcikgeyByZXR1cm4gSEVBUDhbcG9pbnRlcl07IH0gOlxuICAgICAgICAgICAgICBmdW5jdGlvbiByZWFkVThGcm9tUG9pbnRlcihwb2ludGVyKSB7IHJldHVybiBIRUFQVThbcG9pbnRlcl07IH07XG4gICAgICAgICAgY2FzZSAxOiByZXR1cm4gc2lnbmVkID9cbiAgICAgICAgICAgICAgZnVuY3Rpb24gcmVhZFMxNkZyb21Qb2ludGVyKHBvaW50ZXIpIHsgcmV0dXJuIEhFQVAxNltwb2ludGVyID4+IDFdOyB9IDpcbiAgICAgICAgICAgICAgZnVuY3Rpb24gcmVhZFUxNkZyb21Qb2ludGVyKHBvaW50ZXIpIHsgcmV0dXJuIEhFQVBVMTZbcG9pbnRlciA+PiAxXTsgfTtcbiAgICAgICAgICBjYXNlIDI6IHJldHVybiBzaWduZWQgP1xuICAgICAgICAgICAgICBmdW5jdGlvbiByZWFkUzMyRnJvbVBvaW50ZXIocG9pbnRlcikgeyByZXR1cm4gSEVBUDMyW3BvaW50ZXIgPj4gMl07IH0gOlxuICAgICAgICAgICAgICBmdW5jdGlvbiByZWFkVTMyRnJvbVBvaW50ZXIocG9pbnRlcikgeyByZXR1cm4gSEVBUFUzMltwb2ludGVyID4+IDJdOyB9O1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbmtub3duIGludGVnZXIgdHlwZTogXCIgKyBuYW1lKTtcbiAgICAgIH1cbiAgICB9ZnVuY3Rpb24gX19lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlcihwcmltaXRpdmVUeXBlLCBuYW1lLCBzaXplLCBtaW5SYW5nZSwgbWF4UmFuZ2UpIHtcbiAgICAgIG5hbWUgPSByZWFkTGF0aW4xU3RyaW5nKG5hbWUpO1xuICAgICAgaWYgKG1heFJhbmdlID09PSAtMSkgeyAvLyBMTFZNIGRvZXNuJ3QgaGF2ZSBzaWduZWQgYW5kIHVuc2lnbmVkIDMyLWJpdCB0eXBlcywgc28gdTMyIGxpdGVyYWxzIGNvbWUgb3V0IGFzICdpMzIgLTEnLiBBbHdheXMgdHJlYXQgdGhvc2UgYXMgbWF4IHUzMi5cbiAgICAgICAgICBtYXhSYW5nZSA9IDQyOTQ5NjcyOTU7XG4gICAgICB9XG4gIFxuICAgICAgdmFyIHNoaWZ0ID0gZ2V0U2hpZnRGcm9tU2l6ZShzaXplKTtcbiAgICAgIFxuICAgICAgdmFyIGZyb21XaXJlVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgaWYgKG1pblJhbmdlID09PSAwKSB7XG4gICAgICAgICAgdmFyIGJpdHNoaWZ0ID0gMzIgLSA4KnNpemU7XG4gICAgICAgICAgZnJvbVdpcmVUeXBlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICh2YWx1ZSA8PCBiaXRzaGlmdCkgPj4+IGJpdHNoaWZ0O1xuICAgICAgICAgIH07XG4gICAgICB9XG4gIFxuICAgICAgdmFyIGlzVW5zaWduZWRUeXBlID0gKG5hbWUuaW5kZXhPZigndW5zaWduZWQnKSAhPSAtMSk7XG4gIFxuICAgICAgcmVnaXN0ZXJUeXBlKHByaW1pdGl2ZVR5cGUsIHtcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICdmcm9tV2lyZVR5cGUnOiBmcm9tV2lyZVR5cGUsXG4gICAgICAgICAgJ3RvV2lyZVR5cGUnOiBmdW5jdGlvbihkZXN0cnVjdG9ycywgdmFsdWUpIHtcbiAgICAgICAgICAgICAgLy8gdG9kbzogSGVyZSB3ZSBoYXZlIGFuIG9wcG9ydHVuaXR5IGZvciAtTzMgbGV2ZWwgXCJ1bnNhZmVcIiBvcHRpbWl6YXRpb25zOiB3ZSBjb3VsZFxuICAgICAgICAgICAgICAvLyBhdm9pZCB0aGUgZm9sbG93aW5nIHR3byBpZigpcyBhbmQgYXNzdW1lIHZhbHVlIGlzIG9mIHByb3BlciB0eXBlLlxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm51bWJlclwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJib29sZWFuXCIpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IFwiJyArIF9lbWJpbmRfcmVwcih2YWx1ZSkgKyAnXCIgdG8gJyArIHRoaXMubmFtZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHZhbHVlIDwgbWluUmFuZ2UgfHwgdmFsdWUgPiBtYXhSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUGFzc2luZyBhIG51bWJlciBcIicgKyBfZW1iaW5kX3JlcHIodmFsdWUpICsgJ1wiIGZyb20gSlMgc2lkZSB0byBDL0MrKyBzaWRlIHRvIGFuIGFyZ3VtZW50IG9mIHR5cGUgXCInICsgbmFtZSArICdcIiwgd2hpY2ggaXMgb3V0c2lkZSB0aGUgdmFsaWQgcmFuZ2UgWycgKyBtaW5SYW5nZSArICcsICcgKyBtYXhSYW5nZSArICddIScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBpc1Vuc2lnbmVkVHlwZSA/ICh2YWx1ZSA+Pj4gMCkgOiAodmFsdWUgfCAwKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdhcmdQYWNrQWR2YW5jZSc6IDgsXG4gICAgICAgICAgJ3JlYWRWYWx1ZUZyb21Qb2ludGVyJzogaW50ZWdlclJlYWRWYWx1ZUZyb21Qb2ludGVyKG5hbWUsIHNoaWZ0LCBtaW5SYW5nZSAhPT0gMCksXG4gICAgICAgICAgZGVzdHJ1Y3RvckZ1bmN0aW9uOiBudWxsLCAvLyBUaGlzIHR5cGUgZG9lcyBub3QgbmVlZCBhIGRlc3RydWN0b3JcbiAgICAgIH0pO1xuICAgIH1cblxuICBcbiAgZnVuY3Rpb24gX19leGl0KHN0YXR1cykge1xuICAgICAgLy8gdm9pZCBfZXhpdChpbnQgc3RhdHVzKTtcbiAgICAgIC8vIGh0dHA6Ly9wdWJzLm9wZW5ncm91cC5vcmcvb25saW5lcHVicy8wMDAwOTUzOTkvZnVuY3Rpb25zL2V4aXQuaHRtbFxuICAgICAgTW9kdWxlWydleGl0J10oc3RhdHVzKTtcbiAgICB9ZnVuY3Rpb24gX2V4aXQoc3RhdHVzKSB7XG4gICAgICBfX2V4aXQoc3RhdHVzKTtcbiAgICB9XG5cbiAgXG4gIFxuICB2YXIgZW12YWxfZnJlZV9saXN0PVtdO1xuICBcbiAgdmFyIGVtdmFsX2hhbmRsZV9hcnJheT1be30se3ZhbHVlOnVuZGVmaW5lZH0se3ZhbHVlOm51bGx9LHt2YWx1ZTp0cnVlfSx7dmFsdWU6ZmFsc2V9XTtmdW5jdGlvbiBfX2VtdmFsX2RlY3JlZihoYW5kbGUpIHtcbiAgICAgIGlmIChoYW5kbGUgPiA0ICYmIDAgPT09IC0tZW12YWxfaGFuZGxlX2FycmF5W2hhbmRsZV0ucmVmY291bnQpIHtcbiAgICAgICAgICBlbXZhbF9oYW5kbGVfYXJyYXlbaGFuZGxlXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBlbXZhbF9mcmVlX2xpc3QucHVzaChoYW5kbGUpO1xuICAgICAgfVxuICAgIH1cbiAgXG4gIFxuICBcbiAgZnVuY3Rpb24gY291bnRfZW12YWxfaGFuZGxlcygpIHtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gNTsgaSA8IGVtdmFsX2hhbmRsZV9hcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmIChlbXZhbF9oYW5kbGVfYXJyYXlbaV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICArK2NvdW50O1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3VudDtcbiAgICB9XG4gIFxuICBmdW5jdGlvbiBnZXRfZmlyc3RfZW12YWwoKSB7XG4gICAgICBmb3IgKHZhciBpID0gNTsgaSA8IGVtdmFsX2hhbmRsZV9hcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmIChlbXZhbF9oYW5kbGVfYXJyYXlbaV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZW12YWxfaGFuZGxlX2FycmF5W2ldO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1mdW5jdGlvbiBpbml0X2VtdmFsKCkge1xuICAgICAgTW9kdWxlWydjb3VudF9lbXZhbF9oYW5kbGVzJ10gPSBjb3VudF9lbXZhbF9oYW5kbGVzO1xuICAgICAgTW9kdWxlWydnZXRfZmlyc3RfZW12YWwnXSA9IGdldF9maXJzdF9lbXZhbDtcbiAgICB9ZnVuY3Rpb24gX19lbXZhbF9yZWdpc3Rlcih2YWx1ZSkge1xuICBcbiAgICAgIHN3aXRjaCh2YWx1ZSl7XG4gICAgICAgIGNhc2UgdW5kZWZpbmVkIDp7IHJldHVybiAxOyB9XG4gICAgICAgIGNhc2UgbnVsbCA6eyByZXR1cm4gMjsgfVxuICAgICAgICBjYXNlIHRydWUgOnsgcmV0dXJuIDM7IH1cbiAgICAgICAgY2FzZSBmYWxzZSA6eyByZXR1cm4gNDsgfVxuICAgICAgICBkZWZhdWx0OntcbiAgICAgICAgICB2YXIgaGFuZGxlID0gZW12YWxfZnJlZV9saXN0Lmxlbmd0aCA/XG4gICAgICAgICAgICAgIGVtdmFsX2ZyZWVfbGlzdC5wb3AoKSA6XG4gICAgICAgICAgICAgIGVtdmFsX2hhbmRsZV9hcnJheS5sZW5ndGg7XG4gIFxuICAgICAgICAgIGVtdmFsX2hhbmRsZV9hcnJheVtoYW5kbGVdID0ge3JlZmNvdW50OiAxLCB2YWx1ZTogdmFsdWV9O1xuICAgICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfWZ1bmN0aW9uIF9fZW1iaW5kX3JlZ2lzdGVyX2VtdmFsKHJhd1R5cGUsIG5hbWUpIHtcbiAgICAgIG5hbWUgPSByZWFkTGF0aW4xU3RyaW5nKG5hbWUpO1xuICAgICAgcmVnaXN0ZXJUeXBlKHJhd1R5cGUsIHtcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICdmcm9tV2lyZVR5cGUnOiBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgICAgdmFyIHJ2ID0gZW12YWxfaGFuZGxlX2FycmF5W2hhbmRsZV0udmFsdWU7XG4gICAgICAgICAgICAgIF9fZW12YWxfZGVjcmVmKGhhbmRsZSk7XG4gICAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd0b1dpcmVUeXBlJzogZnVuY3Rpb24oZGVzdHJ1Y3RvcnMsIHZhbHVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBfX2VtdmFsX3JlZ2lzdGVyKHZhbHVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdhcmdQYWNrQWR2YW5jZSc6IDgsXG4gICAgICAgICAgJ3JlYWRWYWx1ZUZyb21Qb2ludGVyJzogc2ltcGxlUmVhZFZhbHVlRnJvbVBvaW50ZXIsXG4gICAgICAgICAgZGVzdHJ1Y3RvckZ1bmN0aW9uOiBudWxsLCAvLyBUaGlzIHR5cGUgZG9lcyBub3QgbmVlZCBhIGRlc3RydWN0b3JcbiAgXG4gICAgICAgICAgLy8gVE9ETzogZG8gd2UgbmVlZCBhIGRlbGV0ZU9iamVjdCBoZXJlPyAgd3JpdGUgYSB0ZXN0IHdoZXJlXG4gICAgICAgICAgLy8gZW12YWwgaXMgcGFzc2VkIGludG8gSlMgdmlhIGFuIGludGVyZmFjZVxuICAgICAgfSk7XG4gICAgfVxuXG4gIGZ1bmN0aW9uIF9fX2N4YV9hbGxvY2F0ZV9leGNlcHRpb24oc2l6ZSkge1xuICAgICAgcmV0dXJuIF9tYWxsb2Moc2l6ZSk7XG4gICAgfVxuXG4gIFxuICB2YXIgU1lTQ0FMTFM9e3ZhcmFyZ3M6MCxnZXQ6ZnVuY3Rpb24gKHZhcmFyZ3MpIHtcbiAgICAgICAgU1lTQ0FMTFMudmFyYXJncyArPSA0O1xuICAgICAgICB2YXIgcmV0ID0gSEVBUDMyWygoKFNZU0NBTExTLnZhcmFyZ3MpLSg0KSk+PjIpXTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sZ2V0U3RyOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJldCA9IFBvaW50ZXJfc3RyaW5naWZ5KFNZU0NBTExTLmdldCgpKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sZ2V0NjQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbG93ID0gU1lTQ0FMTFMuZ2V0KCksIGhpZ2ggPSBTWVNDQUxMUy5nZXQoKTtcbiAgICAgICAgaWYgKGxvdyA+PSAwKSBhc3NlcnQoaGlnaCA9PT0gMCk7XG4gICAgICAgIGVsc2UgYXNzZXJ0KGhpZ2ggPT09IC0xKTtcbiAgICAgICAgcmV0dXJuIGxvdztcbiAgICAgIH0sZ2V0WmVybzpmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydChTWVNDQUxMUy5nZXQoKSA9PT0gMCk7XG4gICAgICB9fTtmdW5jdGlvbiBfX19zeXNjYWxsNTQod2hpY2gsIHZhcmFyZ3MpIHtTWVNDQUxMUy52YXJhcmdzID0gdmFyYXJncztcbiAgdHJ5IHtcbiAgIC8vIGlvY3RsXG4gICAgICByZXR1cm4gMDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKHR5cGVvZiBGUyA9PT0gJ3VuZGVmaW5lZCcgfHwgIShlIGluc3RhbmNlb2YgRlMuRXJybm9FcnJvcikpIGFib3J0KGUpO1xuICAgIHJldHVybiAtZS5lcnJubztcbiAgfVxuICB9XG5cbiAgXG4gICBcbiAgTW9kdWxlW1wiX3Rlc3RTZXRqbXBcIl0gPSBfdGVzdFNldGptcDtmdW5jdGlvbiBfbG9uZ2ptcChlbnYsIHZhbHVlKSB7XG4gICAgICBNb2R1bGVbJ3NldFRocmV3J10oZW52LCB2YWx1ZSB8fCAxKTtcbiAgICAgIHRocm93ICdsb25nam1wJztcbiAgICB9XG5cbiAgXG4gIGZ1bmN0aW9uIGZsb2F0UmVhZFZhbHVlRnJvbVBvaW50ZXIobmFtZSwgc2hpZnQpIHtcbiAgICAgIHN3aXRjaCAoc2hpZnQpIHtcbiAgICAgICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbihwb2ludGVyKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzWydmcm9tV2lyZVR5cGUnXShIRUFQRjMyW3BvaW50ZXIgPj4gMl0pO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY2FzZSAzOiByZXR1cm4gZnVuY3Rpb24ocG9pbnRlcikge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpc1snZnJvbVdpcmVUeXBlJ10oSEVBUEY2NFtwb2ludGVyID4+IDNdKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbmtub3duIGZsb2F0IHR5cGU6IFwiICsgbmFtZSk7XG4gICAgICB9XG4gICAgfWZ1bmN0aW9uIF9fZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0KHJhd1R5cGUsIG5hbWUsIHNpemUpIHtcbiAgICAgIHZhciBzaGlmdCA9IGdldFNoaWZ0RnJvbVNpemUoc2l6ZSk7XG4gICAgICBuYW1lID0gcmVhZExhdGluMVN0cmluZyhuYW1lKTtcbiAgICAgIHJlZ2lzdGVyVHlwZShyYXdUeXBlLCB7XG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAnZnJvbVdpcmVUeXBlJzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3RvV2lyZVR5cGUnOiBmdW5jdGlvbihkZXN0cnVjdG9ycywgdmFsdWUpIHtcbiAgICAgICAgICAgICAgLy8gdG9kbzogSGVyZSB3ZSBoYXZlIGFuIG9wcG9ydHVuaXR5IGZvciAtTzMgbGV2ZWwgXCJ1bnNhZmVcIiBvcHRpbWl6YXRpb25zOiB3ZSBjb3VsZFxuICAgICAgICAgICAgICAvLyBhdm9pZCB0aGUgZm9sbG93aW5nIGlmKCkgYW5kIGFzc3VtZSB2YWx1ZSBpcyBvZiBwcm9wZXIgdHlwZS5cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCBcIicgKyBfZW1iaW5kX3JlcHIodmFsdWUpICsgJ1wiIHRvICcgKyB0aGlzLm5hbWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdhcmdQYWNrQWR2YW5jZSc6IDgsXG4gICAgICAgICAgJ3JlYWRWYWx1ZUZyb21Qb2ludGVyJzogZmxvYXRSZWFkVmFsdWVGcm9tUG9pbnRlcihuYW1lLCBzaGlmdCksXG4gICAgICAgICAgZGVzdHJ1Y3RvckZ1bmN0aW9uOiBudWxsLCAvLyBUaGlzIHR5cGUgZG9lcyBub3QgbmVlZCBhIGRlc3RydWN0b3JcbiAgICAgIH0pO1xuICAgIH1cblxuICBcbiAgXG4gIFxuICBcbiAgdmFyIF9lbnZpcm9uPVNUQVRJQ1RPUDsgU1RBVElDVE9QICs9IDE2Ozt2YXIgX19fZW52aXJvbj1fZW52aXJvbjtmdW5jdGlvbiBfX19idWlsZEVudmlyb25tZW50KGVudikge1xuICAgICAgLy8gV0FSTklORzogQXJiaXRyYXJ5IGxpbWl0IVxuICAgICAgdmFyIE1BWF9FTlZfVkFMVUVTID0gNjQ7XG4gICAgICB2YXIgVE9UQUxfRU5WX1NJWkUgPSAxMDI0O1xuICBcbiAgICAgIC8vIFN0YXRpY2FsbHkgYWxsb2NhdGUgbWVtb3J5IGZvciB0aGUgZW52aXJvbm1lbnQuXG4gICAgICB2YXIgcG9vbFB0cjtcbiAgICAgIHZhciBlbnZQdHI7XG4gICAgICBpZiAoIV9fX2J1aWxkRW52aXJvbm1lbnQuY2FsbGVkKSB7XG4gICAgICAgIF9fX2J1aWxkRW52aXJvbm1lbnQuY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgdmFsdWVzLiBVc2Ugc3RyaW5nIGtleXMgZm9yIENsb3N1cmUgQ29tcGlsZXIgY29tcGF0aWJpbGl0eS5cbiAgICAgICAgRU5WWydVU0VSJ10gPSBFTlZbJ0xPR05BTUUnXSA9ICd3ZWJfdXNlcic7XG4gICAgICAgIEVOVlsnUEFUSCddID0gJy8nO1xuICAgICAgICBFTlZbJ1BXRCddID0gJy8nO1xuICAgICAgICBFTlZbJ0hPTUUnXSA9ICcvaG9tZS93ZWJfdXNlcic7XG4gICAgICAgIEVOVlsnTEFORyddID0gJ0MnO1xuICAgICAgICBFTlZbJ18nXSA9IE1vZHVsZVsndGhpc1Byb2dyYW0nXTtcbiAgICAgICAgLy8gQWxsb2NhdGUgbWVtb3J5LlxuICAgICAgICBwb29sUHRyID0gYWxsb2NhdGUoVE9UQUxfRU5WX1NJWkUsICdpOCcsIEFMTE9DX1NUQVRJQyk7XG4gICAgICAgIGVudlB0ciA9IGFsbG9jYXRlKE1BWF9FTlZfVkFMVUVTICogNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2k4KicsIEFMTE9DX1NUQVRJQyk7XG4gICAgICAgIEhFQVAzMlsoKGVudlB0cik+PjIpXT1wb29sUHRyO1xuICAgICAgICBIRUFQMzJbKChfZW52aXJvbik+PjIpXT1lbnZQdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnZQdHIgPSBIRUFQMzJbKChfZW52aXJvbik+PjIpXTtcbiAgICAgICAgcG9vbFB0ciA9IEhFQVAzMlsoKGVudlB0cik+PjIpXTtcbiAgICAgIH1cbiAgXG4gICAgICAvLyBDb2xsZWN0IGtleT12YWx1ZSBsaW5lcy5cbiAgICAgIHZhciBzdHJpbmdzID0gW107XG4gICAgICB2YXIgdG90YWxTaXplID0gMDtcbiAgICAgIGZvciAodmFyIGtleSBpbiBlbnYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBlbnZba2V5XSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB2YXIgbGluZSA9IGtleSArICc9JyArIGVudltrZXldO1xuICAgICAgICAgIHN0cmluZ3MucHVzaChsaW5lKTtcbiAgICAgICAgICB0b3RhbFNpemUgKz0gbGluZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0b3RhbFNpemUgPiBUT1RBTF9FTlZfU0laRSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vudmlyb25tZW50IHNpemUgZXhjZWVkZWQgVE9UQUxfRU5WX1NJWkUhJyk7XG4gICAgICB9XG4gIFxuICAgICAgLy8gTWFrZSBuZXcuXG4gICAgICB2YXIgcHRyU2l6ZSA9IDQ7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGxpbmUgPSBzdHJpbmdzW2ldO1xuICAgICAgICB3cml0ZUFzY2lpVG9NZW1vcnkobGluZSwgcG9vbFB0cik7XG4gICAgICAgIEhFQVAzMlsoKChlbnZQdHIpKyhpICogcHRyU2l6ZSkpPj4yKV09cG9vbFB0cjtcbiAgICAgICAgcG9vbFB0ciArPSBsaW5lLmxlbmd0aCArIDE7XG4gICAgICB9XG4gICAgICBIRUFQMzJbKCgoZW52UHRyKSsoc3RyaW5ncy5sZW5ndGggKiBwdHJTaXplKSk+PjIpXT0wO1xuICAgIH12YXIgRU5WPXt9O2Z1bmN0aW9uIF9nZXRlbnYobmFtZSkge1xuICAgICAgLy8gY2hhciAqZ2V0ZW52KGNvbnN0IGNoYXIgKm5hbWUpO1xuICAgICAgLy8gaHR0cDovL3B1YnMub3Blbmdyb3VwLm9yZy9vbmxpbmVwdWJzLzAwOTY5NTM5OS9mdW5jdGlvbnMvZ2V0ZW52Lmh0bWxcbiAgICAgIGlmIChuYW1lID09PSAwKSByZXR1cm4gMDtcbiAgICAgIG5hbWUgPSBQb2ludGVyX3N0cmluZ2lmeShuYW1lKTtcbiAgICAgIGlmICghRU5WLmhhc093blByb3BlcnR5KG5hbWUpKSByZXR1cm4gMDtcbiAgXG4gICAgICBpZiAoX2dldGVudi5yZXQpIF9mcmVlKF9nZXRlbnYucmV0KTtcbiAgICAgIF9nZXRlbnYucmV0ID0gYWxsb2NhdGUoaW50QXJyYXlGcm9tU3RyaW5nKEVOVltuYW1lXSksICdpOCcsIEFMTE9DX05PUk1BTCk7XG4gICAgICByZXR1cm4gX2dldGVudi5yZXQ7XG4gICAgfVxuXG4gIFxuICBcbiAgZnVuY3Rpb24gbmV3Xyhjb25zdHJ1Y3RvciwgYXJndW1lbnRMaXN0KSB7XG4gICAgICBpZiAoIShjb25zdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25ld18gY2FsbGVkIHdpdGggY29uc3RydWN0b3IgdHlwZSAnICsgdHlwZW9mKGNvbnN0cnVjdG9yKSArIFwiIHdoaWNoIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgICAgfVxuICBcbiAgICAgIC8qXG4gICAgICAgKiBQcmV2aW91c2x5LCB0aGUgZm9sbG93aW5nIGxpbmUgd2FzIGp1c3Q6XG4gIFxuICAgICAgIGZ1bmN0aW9uIGR1bW15KCkge307XG4gIFxuICAgICAgICogVW5mb3J0dW5hdGVseSwgQ2hyb21lIHdhcyBwcmVzZXJ2aW5nICdkdW1teScgYXMgdGhlIG9iamVjdCdzIG5hbWUsIGV2ZW4gdGhvdWdoIGF0IGNyZWF0aW9uLCB0aGUgJ2R1bW15JyBoYXMgdGhlXG4gICAgICAgKiBjb3JyZWN0IGNvbnN0cnVjdG9yIG5hbWUuICBUaHVzLCBvYmplY3RzIGNyZWF0ZWQgd2l0aCBJTVZVLm5ldyB3b3VsZCBzaG93IHVwIGluIHRoZSBkZWJ1Z2dlciBhcyAnZHVtbXknLCB3aGljaFxuICAgICAgICogaXNuJ3QgdmVyeSBoZWxwZnVsLiAgVXNpbmcgSU1WVS5jcmVhdGVOYW1lZEZ1bmN0aW9uIGFkZHJlc3NlcyB0aGUgaXNzdWUuICBEb3VibGVseS11bmZvcnR1bmF0ZWx5LCB0aGVyZSdzIG5vIHdheVxuICAgICAgICogdG8gd3JpdGUgYSB0ZXN0IGZvciB0aGlzIGJlaGF2aW9yLiAgLU5SRCAyMDEzLjAyLjIyXG4gICAgICAgKi9cbiAgICAgIHZhciBkdW1teSA9IGNyZWF0ZU5hbWVkRnVuY3Rpb24oY29uc3RydWN0b3IubmFtZSB8fCAndW5rbm93bkZ1bmN0aW9uTmFtZScsIGZ1bmN0aW9uKCl7fSk7XG4gICAgICBkdW1teS5wcm90b3R5cGUgPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICB2YXIgb2JqID0gbmV3IGR1bW15O1xuICBcbiAgICAgIHZhciByID0gY29uc3RydWN0b3IuYXBwbHkob2JqLCBhcmd1bWVudExpc3QpO1xuICAgICAgcmV0dXJuIChyIGluc3RhbmNlb2YgT2JqZWN0KSA/IHIgOiBvYmo7XG4gICAgfVxuICBcbiAgZnVuY3Rpb24gcnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnMpIHtcbiAgICAgIHdoaWxlIChkZXN0cnVjdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgcHRyID0gZGVzdHJ1Y3RvcnMucG9wKCk7XG4gICAgICAgICAgdmFyIGRlbCA9IGRlc3RydWN0b3JzLnBvcCgpO1xuICAgICAgICAgIGRlbChwdHIpO1xuICAgICAgfVxuICAgIH1mdW5jdGlvbiBjcmFmdEludm9rZXJGdW5jdGlvbihodW1hbk5hbWUsIGFyZ1R5cGVzLCBjbGFzc1R5cGUsIGNwcEludm9rZXJGdW5jLCBjcHBUYXJnZXRGdW5jKSB7XG4gICAgICAvLyBodW1hbk5hbWU6IGEgaHVtYW4tcmVhZGFibGUgc3RyaW5nIG5hbWUgZm9yIHRoZSBmdW5jdGlvbiB0byBiZSBnZW5lcmF0ZWQuXG4gICAgICAvLyBhcmdUeXBlczogQW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgZW1iaW5kIHR5cGUgb2JqZWN0cyBmb3IgYWxsIHR5cGVzIGluIHRoZSBmdW5jdGlvbiBzaWduYXR1cmUuXG4gICAgICAvLyAgICBhcmdUeXBlc1swXSBpcyB0aGUgdHlwZSBvYmplY3QgZm9yIHRoZSBmdW5jdGlvbiByZXR1cm4gdmFsdWUuXG4gICAgICAvLyAgICBhcmdUeXBlc1sxXSBpcyB0aGUgdHlwZSBvYmplY3QgZm9yIGZ1bmN0aW9uIHRoaXMgb2JqZWN0L2NsYXNzIHR5cGUsIG9yIG51bGwgaWYgbm90IGNyYWZ0aW5nIGFuIGludm9rZXIgZm9yIGEgY2xhc3MgbWV0aG9kLlxuICAgICAgLy8gICAgYXJnVHlwZXNbMi4uLl0gYXJlIHRoZSBhY3R1YWwgZnVuY3Rpb24gcGFyYW1ldGVycy5cbiAgICAgIC8vIGNsYXNzVHlwZTogVGhlIGVtYmluZCB0eXBlIG9iamVjdCBmb3IgdGhlIGNsYXNzIHRvIGJlIGJvdW5kLCBvciBudWxsIGlmIHRoaXMgaXMgbm90IGEgbWV0aG9kIG9mIGEgY2xhc3MuXG4gICAgICAvLyBjcHBJbnZva2VyRnVuYzogSlMgRnVuY3Rpb24gb2JqZWN0IHRvIHRoZSBDKystc2lkZSBmdW5jdGlvbiB0aGF0IGludGVyb3BzIGludG8gQysrIGNvZGUuXG4gICAgICAvLyBjcHBUYXJnZXRGdW5jOiBGdW5jdGlvbiBwb2ludGVyIChhbiBpbnRlZ2VyIHRvIEZVTkNUSU9OX1RBQkxFKSB0byB0aGUgdGFyZ2V0IEMrKyBmdW5jdGlvbiB0aGUgY3BwSW52b2tlckZ1bmMgd2lsbCBlbmQgdXAgY2FsbGluZy5cbiAgICAgIHZhciBhcmdDb3VudCA9IGFyZ1R5cGVzLmxlbmd0aDtcbiAgXG4gICAgICBpZiAoYXJnQ291bnQgPCAyKSB7XG4gICAgICAgICAgdGhyb3dCaW5kaW5nRXJyb3IoXCJhcmdUeXBlcyBhcnJheSBzaXplIG1pc21hdGNoISBNdXN0IGF0IGxlYXN0IGdldCByZXR1cm4gdmFsdWUgYW5kICd0aGlzJyB0eXBlcyFcIik7XG4gICAgICB9XG4gIFxuICAgICAgdmFyIGlzQ2xhc3NNZXRob2RGdW5jID0gKGFyZ1R5cGVzWzFdICE9PSBudWxsICYmIGNsYXNzVHlwZSAhPT0gbnVsbCk7XG4gIFxuICAgICAgLy8gRnJlZSBmdW5jdGlvbnMgd2l0aCBzaWduYXR1cmUgXCJ2b2lkIGZ1bmN0aW9uKClcIiBkbyBub3QgbmVlZCBhbiBpbnZva2VyIHRoYXQgbWFyc2hhbGxzIGJldHdlZW4gd2lyZSB0eXBlcy5cbiAgLy8gVE9ETzogVGhpcyBvbWl0cyBhcmd1bWVudCBjb3VudCBjaGVjayAtIGVuYWJsZSBvbmx5IGF0IC1PMyBvciBzaW1pbGFyLlxuICAvLyAgICBpZiAoRU5BQkxFX1VOU0FGRV9PUFRTICYmIGFyZ0NvdW50ID09IDIgJiYgYXJnVHlwZXNbMF0ubmFtZSA9PSBcInZvaWRcIiAmJiAhaXNDbGFzc01ldGhvZEZ1bmMpIHtcbiAgLy8gICAgICAgcmV0dXJuIEZVTkNUSU9OX1RBQkxFW2ZuXTtcbiAgLy8gICAgfVxuICBcbiAgICAgIHZhciBhcmdzTGlzdCA9IFwiXCI7XG4gICAgICB2YXIgYXJnc0xpc3RXaXJlZCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYXJnQ291bnQgLSAyOyArK2kpIHtcbiAgICAgICAgICBhcmdzTGlzdCArPSAoaSE9PTA/XCIsIFwiOlwiXCIpK1wiYXJnXCIraTtcbiAgICAgICAgICBhcmdzTGlzdFdpcmVkICs9IChpIT09MD9cIiwgXCI6XCJcIikrXCJhcmdcIitpK1wiV2lyZWRcIjtcbiAgICAgIH1cbiAgXG4gICAgICB2YXIgaW52b2tlckZuQm9keSA9XG4gICAgICAgICAgXCJyZXR1cm4gZnVuY3Rpb24gXCIrbWFrZUxlZ2FsRnVuY3Rpb25OYW1lKGh1bWFuTmFtZSkrXCIoXCIrYXJnc0xpc3QrXCIpIHtcXG5cIiArXG4gICAgICAgICAgXCJpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gXCIrKGFyZ0NvdW50IC0gMikrXCIpIHtcXG5cIiArXG4gICAgICAgICAgICAgIFwidGhyb3dCaW5kaW5nRXJyb3IoJ2Z1bmN0aW9uIFwiK2h1bWFuTmFtZStcIiBjYWxsZWQgd2l0aCAnICsgYXJndW1lbnRzLmxlbmd0aCArICcgYXJndW1lbnRzLCBleHBlY3RlZCBcIisoYXJnQ291bnQgLSAyKStcIiBhcmdzIScpO1xcblwiICtcbiAgICAgICAgICBcIn1cXG5cIjtcbiAgXG4gIFxuICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIG5lZWQgdG8gdXNlIGEgZHluYW1pYyBzdGFjayB0byBzdG9yZSB0aGUgZGVzdHJ1Y3RvcnMgZm9yIHRoZSBmdW5jdGlvbiBwYXJhbWV0ZXJzLlxuICAgICAgLy8gVE9ETzogUmVtb3ZlIHRoaXMgY29tcGxldGVseSBvbmNlIGFsbCBmdW5jdGlvbiBpbnZva2VycyBhcmUgYmVpbmcgZHluYW1pY2FsbHkgZ2VuZXJhdGVkLlxuICAgICAgdmFyIG5lZWRzRGVzdHJ1Y3RvclN0YWNrID0gZmFsc2U7XG4gIFxuICAgICAgZm9yKHZhciBpID0gMTsgaSA8IGFyZ1R5cGVzLmxlbmd0aDsgKytpKSB7IC8vIFNraXAgcmV0dXJuIHZhbHVlIGF0IGluZGV4IDAgLSBpdCdzIG5vdCBkZWxldGVkIGhlcmUuXG4gICAgICAgICAgaWYgKGFyZ1R5cGVzW2ldICE9PSBudWxsICYmIGFyZ1R5cGVzW2ldLmRlc3RydWN0b3JGdW5jdGlvbiA9PT0gdW5kZWZpbmVkKSB7IC8vIFRoZSB0eXBlIGRvZXMgbm90IGRlZmluZSBhIGRlc3RydWN0b3IgZnVuY3Rpb24gLSBtdXN0IHVzZSBkeW5hbWljIHN0YWNrXG4gICAgICAgICAgICAgIG5lZWRzRGVzdHJ1Y3RvclN0YWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICBcbiAgICAgIGlmIChuZWVkc0Rlc3RydWN0b3JTdGFjaykge1xuICAgICAgICAgIGludm9rZXJGbkJvZHkgKz1cbiAgICAgICAgICAgICAgXCJ2YXIgZGVzdHJ1Y3RvcnMgPSBbXTtcXG5cIjtcbiAgICAgIH1cbiAgXG4gICAgICB2YXIgZHRvclN0YWNrID0gbmVlZHNEZXN0cnVjdG9yU3RhY2sgPyBcImRlc3RydWN0b3JzXCIgOiBcIm51bGxcIjtcbiAgICAgIHZhciBhcmdzMSA9IFtcInRocm93QmluZGluZ0Vycm9yXCIsIFwiaW52b2tlclwiLCBcImZuXCIsIFwicnVuRGVzdHJ1Y3RvcnNcIiwgXCJyZXRUeXBlXCIsIFwiY2xhc3NQYXJhbVwiXTtcbiAgICAgIHZhciBhcmdzMiA9IFt0aHJvd0JpbmRpbmdFcnJvciwgY3BwSW52b2tlckZ1bmMsIGNwcFRhcmdldEZ1bmMsIHJ1bkRlc3RydWN0b3JzLCBhcmdUeXBlc1swXSwgYXJnVHlwZXNbMV1dO1xuICBcbiAgXG4gICAgICBpZiAoaXNDbGFzc01ldGhvZEZ1bmMpIHtcbiAgICAgICAgICBpbnZva2VyRm5Cb2R5ICs9IFwidmFyIHRoaXNXaXJlZCA9IGNsYXNzUGFyYW0udG9XaXJlVHlwZShcIitkdG9yU3RhY2srXCIsIHRoaXMpO1xcblwiO1xuICAgICAgfVxuICBcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhcmdDb3VudCAtIDI7ICsraSkge1xuICAgICAgICAgIGludm9rZXJGbkJvZHkgKz0gXCJ2YXIgYXJnXCIraStcIldpcmVkID0gYXJnVHlwZVwiK2krXCIudG9XaXJlVHlwZShcIitkdG9yU3RhY2srXCIsIGFyZ1wiK2krXCIpOyAvLyBcIithcmdUeXBlc1tpKzJdLm5hbWUrXCJcXG5cIjtcbiAgICAgICAgICBhcmdzMS5wdXNoKFwiYXJnVHlwZVwiK2kpO1xuICAgICAgICAgIGFyZ3MyLnB1c2goYXJnVHlwZXNbaSsyXSk7XG4gICAgICB9XG4gIFxuICAgICAgaWYgKGlzQ2xhc3NNZXRob2RGdW5jKSB7XG4gICAgICAgICAgYXJnc0xpc3RXaXJlZCA9IFwidGhpc1dpcmVkXCIgKyAoYXJnc0xpc3RXaXJlZC5sZW5ndGggPiAwID8gXCIsIFwiIDogXCJcIikgKyBhcmdzTGlzdFdpcmVkO1xuICAgICAgfVxuICBcbiAgICAgIHZhciByZXR1cm5zID0gKGFyZ1R5cGVzWzBdLm5hbWUgIT09IFwidm9pZFwiKTtcbiAgXG4gICAgICBpbnZva2VyRm5Cb2R5ICs9XG4gICAgICAgICAgKHJldHVybnM/XCJ2YXIgcnYgPSBcIjpcIlwiKSArIFwiaW52b2tlcihmblwiKyhhcmdzTGlzdFdpcmVkLmxlbmd0aD4wP1wiLCBcIjpcIlwiKSthcmdzTGlzdFdpcmVkK1wiKTtcXG5cIjtcbiAgXG4gICAgICBpZiAobmVlZHNEZXN0cnVjdG9yU3RhY2spIHtcbiAgICAgICAgICBpbnZva2VyRm5Cb2R5ICs9IFwicnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnMpO1xcblwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IodmFyIGkgPSBpc0NsYXNzTWV0aG9kRnVuYz8xOjI7IGkgPCBhcmdUeXBlcy5sZW5ndGg7ICsraSkgeyAvLyBTa2lwIHJldHVybiB2YWx1ZSBhdCBpbmRleCAwIC0gaXQncyBub3QgZGVsZXRlZCBoZXJlLiBBbHNvIHNraXAgY2xhc3MgdHlwZSBpZiBub3QgYSBtZXRob2QuXG4gICAgICAgICAgICAgIHZhciBwYXJhbU5hbWUgPSAoaSA9PT0gMSA/IFwidGhpc1dpcmVkXCIgOiAoXCJhcmdcIisoaSAtIDIpK1wiV2lyZWRcIikpO1xuICAgICAgICAgICAgICBpZiAoYXJnVHlwZXNbaV0uZGVzdHJ1Y3RvckZ1bmN0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICBpbnZva2VyRm5Cb2R5ICs9IHBhcmFtTmFtZStcIl9kdG9yKFwiK3BhcmFtTmFtZStcIik7IC8vIFwiK2FyZ1R5cGVzW2ldLm5hbWUrXCJcXG5cIjtcbiAgICAgICAgICAgICAgICAgIGFyZ3MxLnB1c2gocGFyYW1OYW1lK1wiX2R0b3JcIik7XG4gICAgICAgICAgICAgICAgICBhcmdzMi5wdXNoKGFyZ1R5cGVzW2ldLmRlc3RydWN0b3JGdW5jdGlvbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gIFxuICAgICAgaWYgKHJldHVybnMpIHtcbiAgICAgICAgICBpbnZva2VyRm5Cb2R5ICs9IFwidmFyIHJldCA9IHJldFR5cGUuZnJvbVdpcmVUeXBlKHJ2KTtcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcInJldHVybiByZXQ7XFxuXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgfVxuICAgICAgaW52b2tlckZuQm9keSArPSBcIn1cXG5cIjtcbiAgXG4gICAgICBhcmdzMS5wdXNoKGludm9rZXJGbkJvZHkpO1xuICBcbiAgICAgIHZhciBpbnZva2VyRnVuY3Rpb24gPSBuZXdfKEZ1bmN0aW9uLCBhcmdzMSkuYXBwbHkobnVsbCwgYXJnczIpO1xuICAgICAgcmV0dXJuIGludm9rZXJGdW5jdGlvbjtcbiAgICB9XG4gIFxuICBcbiAgZnVuY3Rpb24gZW5zdXJlT3ZlcmxvYWRUYWJsZShwcm90bywgbWV0aG9kTmFtZSwgaHVtYW5OYW1lKSB7XG4gICAgICBpZiAodW5kZWZpbmVkID09PSBwcm90b1ttZXRob2ROYW1lXS5vdmVybG9hZFRhYmxlKSB7XG4gICAgICAgICAgdmFyIHByZXZGdW5jID0gcHJvdG9bbWV0aG9kTmFtZV07XG4gICAgICAgICAgLy8gSW5qZWN0IGFuIG92ZXJsb2FkIHJlc29sdmVyIGZ1bmN0aW9uIHRoYXQgcm91dGVzIHRvIHRoZSBhcHByb3ByaWF0ZSBvdmVybG9hZCBiYXNlZCBvbiB0aGUgbnVtYmVyIG9mIGFyZ3VtZW50cy5cbiAgICAgICAgICBwcm90b1ttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAvLyBUT0RPIFRoaXMgY2hlY2sgY2FuIGJlIHJlbW92ZWQgaW4gLU8zIGxldmVsIFwidW5zYWZlXCIgb3B0aW1pemF0aW9ucy5cbiAgICAgICAgICAgICAgaWYgKCFwcm90b1ttZXRob2ROYW1lXS5vdmVybG9hZFRhYmxlLmhhc093blByb3BlcnR5KGFyZ3VtZW50cy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvd0JpbmRpbmdFcnJvcihcIkZ1bmN0aW9uICdcIiArIGh1bWFuTmFtZSArIFwiJyBjYWxsZWQgd2l0aCBhbiBpbnZhbGlkIG51bWJlciBvZiBhcmd1bWVudHMgKFwiICsgYXJndW1lbnRzLmxlbmd0aCArIFwiKSAtIGV4cGVjdHMgb25lIG9mIChcIiArIHByb3RvW21ldGhvZE5hbWVdLm92ZXJsb2FkVGFibGUgKyBcIikhXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBwcm90b1ttZXRob2ROYW1lXS5vdmVybG9hZFRhYmxlW2FyZ3VtZW50cy5sZW5ndGhdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICAvLyBNb3ZlIHRoZSBwcmV2aW91cyBmdW5jdGlvbiBpbnRvIHRoZSBvdmVybG9hZCB0YWJsZS5cbiAgICAgICAgICBwcm90b1ttZXRob2ROYW1lXS5vdmVybG9hZFRhYmxlID0gW107XG4gICAgICAgICAgcHJvdG9bbWV0aG9kTmFtZV0ub3ZlcmxvYWRUYWJsZVtwcmV2RnVuYy5hcmdDb3VudF0gPSBwcmV2RnVuYztcbiAgICAgIH1cbiAgICB9ZnVuY3Rpb24gZXhwb3NlUHVibGljU3ltYm9sKG5hbWUsIHZhbHVlLCBudW1Bcmd1bWVudHMpIHtcbiAgICAgIGlmIChNb2R1bGUuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSBudW1Bcmd1bWVudHMgfHwgKHVuZGVmaW5lZCAhPT0gTW9kdWxlW25hbWVdLm92ZXJsb2FkVGFibGUgJiYgdW5kZWZpbmVkICE9PSBNb2R1bGVbbmFtZV0ub3ZlcmxvYWRUYWJsZVtudW1Bcmd1bWVudHNdKSkge1xuICAgICAgICAgICAgICB0aHJvd0JpbmRpbmdFcnJvcihcIkNhbm5vdCByZWdpc3RlciBwdWJsaWMgbmFtZSAnXCIgKyBuYW1lICsgXCInIHR3aWNlXCIpO1xuICAgICAgICAgIH1cbiAgXG4gICAgICAgICAgLy8gV2UgYXJlIGV4cG9zaW5nIGEgZnVuY3Rpb24gd2l0aCB0aGUgc2FtZSBuYW1lIGFzIGFuIGV4aXN0aW5nIGZ1bmN0aW9uLiBDcmVhdGUgYW4gb3ZlcmxvYWQgdGFibGUgYW5kIGEgZnVuY3Rpb24gc2VsZWN0b3JcbiAgICAgICAgICAvLyB0aGF0IHJvdXRlcyBiZXR3ZWVuIHRoZSB0d28uXG4gICAgICAgICAgZW5zdXJlT3ZlcmxvYWRUYWJsZShNb2R1bGUsIG5hbWUsIG5hbWUpO1xuICAgICAgICAgIGlmIChNb2R1bGUuaGFzT3duUHJvcGVydHkobnVtQXJndW1lbnRzKSkge1xuICAgICAgICAgICAgICB0aHJvd0JpbmRpbmdFcnJvcihcIkNhbm5vdCByZWdpc3RlciBtdWx0aXBsZSBvdmVybG9hZHMgb2YgYSBmdW5jdGlvbiB3aXRoIHRoZSBzYW1lIG51bWJlciBvZiBhcmd1bWVudHMgKFwiICsgbnVtQXJndW1lbnRzICsgXCIpIVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQWRkIHRoZSBuZXcgZnVuY3Rpb24gaW50byB0aGUgb3ZlcmxvYWQgdGFibGUuXG4gICAgICAgICAgTW9kdWxlW25hbWVdLm92ZXJsb2FkVGFibGVbbnVtQXJndW1lbnRzXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICAgTW9kdWxlW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gbnVtQXJndW1lbnRzKSB7XG4gICAgICAgICAgICAgIE1vZHVsZVtuYW1lXS5udW1Bcmd1bWVudHMgPSBudW1Bcmd1bWVudHM7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXG4gIGZ1bmN0aW9uIGhlYXAzMlZlY3RvclRvQXJyYXkoY291bnQsIGZpcnN0RWxlbWVudCkge1xuICAgICAgdmFyIGFycmF5ID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICBhcnJheS5wdXNoKEhFQVAzMlsoZmlyc3RFbGVtZW50ID4+IDIpICsgaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cbiAgXG4gIGZ1bmN0aW9uIHJlcGxhY2VQdWJsaWNTeW1ib2wobmFtZSwgdmFsdWUsIG51bUFyZ3VtZW50cykge1xuICAgICAgaWYgKCFNb2R1bGUuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICB0aHJvd0ludGVybmFsRXJyb3IoJ1JlcGxhY2luZyBub25leGlzdGFudCBwdWJsaWMgc3ltYm9sJyk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGVyZSdzIGFuIG92ZXJsb2FkIHRhYmxlIGZvciB0aGlzIHN5bWJvbCwgcmVwbGFjZSB0aGUgc3ltYm9sIGluIHRoZSBvdmVybG9hZCB0YWJsZSBpbnN0ZWFkLlxuICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gTW9kdWxlW25hbWVdLm92ZXJsb2FkVGFibGUgJiYgdW5kZWZpbmVkICE9PSBudW1Bcmd1bWVudHMpIHtcbiAgICAgICAgICBNb2R1bGVbbmFtZV0ub3ZlcmxvYWRUYWJsZVtudW1Bcmd1bWVudHNdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgICBNb2R1bGVbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICBNb2R1bGVbbmFtZV0uYXJnQ291bnQgPSBudW1Bcmd1bWVudHM7XG4gICAgICB9XG4gICAgfVxuICBcbiAgZnVuY3Rpb24gcmVxdWlyZUZ1bmN0aW9uKHNpZ25hdHVyZSwgcmF3RnVuY3Rpb24pIHtcbiAgICAgIHNpZ25hdHVyZSA9IHJlYWRMYXRpbjFTdHJpbmcoc2lnbmF0dXJlKTtcbiAgXG4gICAgICBmdW5jdGlvbiBtYWtlRHluQ2FsbGVyKGR5bkNhbGwpIHtcbiAgICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgc2lnbmF0dXJlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgIGFyZ3MucHVzaCgnYScgKyBpKTtcbiAgICAgICAgICB9XG4gIFxuICAgICAgICAgIHZhciBuYW1lID0gJ2R5bkNhbGxfJyArIHNpZ25hdHVyZSArICdfJyArIHJhd0Z1bmN0aW9uO1xuICAgICAgICAgIHZhciBib2R5ID0gJ3JldHVybiBmdW5jdGlvbiAnICsgbmFtZSArICcoJyArIGFyZ3Muam9pbignLCAnKSArICcpIHtcXG4nO1xuICAgICAgICAgIGJvZHkgICAgKz0gJyAgICByZXR1cm4gZHluQ2FsbChyYXdGdW5jdGlvbicgKyAoYXJncy5sZW5ndGggPyAnLCAnIDogJycpICsgYXJncy5qb2luKCcsICcpICsgJyk7XFxuJztcbiAgICAgICAgICBib2R5ICAgICs9ICd9O1xcbic7XG4gIFxuICAgICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKCdkeW5DYWxsJywgJ3Jhd0Z1bmN0aW9uJywgYm9keSkpKGR5bkNhbGwsIHJhd0Z1bmN0aW9uKTtcbiAgICAgIH1cbiAgXG4gICAgICB2YXIgZnA7XG4gICAgICBpZiAoTW9kdWxlWydGVU5DVElPTl9UQUJMRV8nICsgc2lnbmF0dXJlXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZnAgPSBNb2R1bGVbJ0ZVTkNUSU9OX1RBQkxFXycgKyBzaWduYXR1cmVdW3Jhd0Z1bmN0aW9uXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIEZVTkNUSU9OX1RBQkxFICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgZnAgPSBGVU5DVElPTl9UQUJMRVtyYXdGdW5jdGlvbl07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGFzbS5qcyBkb2VzIG5vdCBnaXZlIGRpcmVjdCBhY2Nlc3MgdG8gdGhlIGZ1bmN0aW9uIHRhYmxlcyxcbiAgICAgICAgICAvLyBhbmQgdGh1cyB3ZSBtdXN0IGdvIHRocm91Z2ggdGhlIGR5bkNhbGwgaW50ZXJmYWNlIHdoaWNoIGFsbG93c1xuICAgICAgICAgIC8vIGNhbGxpbmcgaW50byBhIHNpZ25hdHVyZSdzIGZ1bmN0aW9uIHRhYmxlIGJ5IHBvaW50ZXIgdmFsdWUuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZGhlcm1hbi9hc20uanMvaXNzdWVzLzgzXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBUaGlzIGhhcyB0aHJlZSBtYWluIHBlbmFsdGllczpcbiAgICAgICAgICAvLyAtIGR5bkNhbGwgaXMgYW5vdGhlciBmdW5jdGlvbiBjYWxsIGluIHRoZSBwYXRoIGZyb20gSmF2YVNjcmlwdCB0byBDKysuXG4gICAgICAgICAgLy8gLSBKSVRzIG1heSBub3QgcHJlZGljdCB0aHJvdWdoIHRoZSBmdW5jdGlvbiB0YWJsZSBpbmRpcmVjdGlvbiBhdCBydW50aW1lLlxuICAgICAgICAgIHZhciBkYyA9IE1vZHVsZVtcImFzbVwiXVsnZHluQ2FsbF8nICsgc2lnbmF0dXJlXTtcbiAgICAgICAgICBpZiAoZGMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAvLyBXZSB3aWxsIGFsd2F5cyBlbnRlciB0aGlzIGJyYW5jaCBpZiB0aGUgc2lnbmF0dXJlXG4gICAgICAgICAgICAgIC8vIGNvbnRhaW5zICdmJyBhbmQgUFJFQ0lTRV9GMzIgaXMgbm90IGVuYWJsZWQuXG4gICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgIC8vIFRyeSBhZ2FpbiwgcmVwbGFjaW5nICdmJyB3aXRoICdkJy5cbiAgICAgICAgICAgICAgZGMgPSBNb2R1bGVbXCJhc21cIl1bJ2R5bkNhbGxfJyArIHNpZ25hdHVyZS5yZXBsYWNlKC9mL2csICdkJyldO1xuICAgICAgICAgICAgICBpZiAoZGMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgdGhyb3dCaW5kaW5nRXJyb3IoXCJObyBkeW5DYWxsIGludm9rZXIgZm9yIHNpZ25hdHVyZTogXCIgKyBzaWduYXR1cmUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZwID0gbWFrZUR5bkNhbGxlcihkYyk7XG4gICAgICB9XG4gIFxuICAgICAgaWYgKHR5cGVvZiBmcCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgdGhyb3dCaW5kaW5nRXJyb3IoXCJ1bmtub3duIGZ1bmN0aW9uIHBvaW50ZXIgd2l0aCBzaWduYXR1cmUgXCIgKyBzaWduYXR1cmUgKyBcIjogXCIgKyByYXdGdW5jdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnA7XG4gICAgfVxuICBcbiAgXG4gIHZhciBVbmJvdW5kVHlwZUVycm9yPXVuZGVmaW5lZDtcbiAgXG4gIGZ1bmN0aW9uIGdldFR5cGVOYW1lKHR5cGUpIHtcbiAgICAgIHZhciBwdHIgPSBfX19nZXRUeXBlTmFtZSh0eXBlKTtcbiAgICAgIHZhciBydiA9IHJlYWRMYXRpbjFTdHJpbmcocHRyKTtcbiAgICAgIF9mcmVlKHB0cik7XG4gICAgICByZXR1cm4gcnY7XG4gICAgfWZ1bmN0aW9uIHRocm93VW5ib3VuZFR5cGVFcnJvcihtZXNzYWdlLCB0eXBlcykge1xuICAgICAgdmFyIHVuYm91bmRUeXBlcyA9IFtdO1xuICAgICAgdmFyIHNlZW4gPSB7fTtcbiAgICAgIGZ1bmN0aW9uIHZpc2l0KHR5cGUpIHtcbiAgICAgICAgICBpZiAoc2Vlblt0eXBlXSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZWdpc3RlcmVkVHlwZXNbdHlwZV0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZURlcGVuZGVuY2llc1t0eXBlXSkge1xuICAgICAgICAgICAgICB0eXBlRGVwZW5kZW5jaWVzW3R5cGVdLmZvckVhY2godmlzaXQpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHVuYm91bmRUeXBlcy5wdXNoKHR5cGUpO1xuICAgICAgICAgIHNlZW5bdHlwZV0gPSB0cnVlO1xuICAgICAgfVxuICAgICAgdHlwZXMuZm9yRWFjaCh2aXNpdCk7XG4gIFxuICAgICAgdGhyb3cgbmV3IFVuYm91bmRUeXBlRXJyb3IobWVzc2FnZSArICc6ICcgKyB1bmJvdW5kVHlwZXMubWFwKGdldFR5cGVOYW1lKS5qb2luKFsnLCAnXSkpO1xuICAgIH1mdW5jdGlvbiBfX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbihuYW1lLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNBZGRyLCBzaWduYXR1cmUsIHJhd0ludm9rZXIsIGZuKSB7XG4gICAgICB2YXIgYXJnVHlwZXMgPSBoZWFwMzJWZWN0b3JUb0FycmF5KGFyZ0NvdW50LCByYXdBcmdUeXBlc0FkZHIpO1xuICAgICAgbmFtZSA9IHJlYWRMYXRpbjFTdHJpbmcobmFtZSk7XG4gICAgICBcbiAgICAgIHJhd0ludm9rZXIgPSByZXF1aXJlRnVuY3Rpb24oc2lnbmF0dXJlLCByYXdJbnZva2VyKTtcbiAgXG4gICAgICBleHBvc2VQdWJsaWNTeW1ib2wobmFtZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhyb3dVbmJvdW5kVHlwZUVycm9yKCdDYW5ub3QgY2FsbCAnICsgbmFtZSArICcgZHVlIHRvIHVuYm91bmQgdHlwZXMnLCBhcmdUeXBlcyk7XG4gICAgICB9LCBhcmdDb3VudCAtIDEpO1xuICBcbiAgICAgIHdoZW5EZXBlbmRlbnRUeXBlc0FyZVJlc29sdmVkKFtdLCBhcmdUeXBlcywgZnVuY3Rpb24oYXJnVHlwZXMpIHtcbiAgICAgICAgICB2YXIgaW52b2tlckFyZ3NBcnJheSA9IFthcmdUeXBlc1swXSAvKiByZXR1cm4gdmFsdWUgKi8sIG51bGwgLyogbm8gY2xhc3MgJ3RoaXMnKi9dLmNvbmNhdChhcmdUeXBlcy5zbGljZSgxKSAvKiBhY3R1YWwgcGFyYW1zICovKTtcbiAgICAgICAgICByZXBsYWNlUHVibGljU3ltYm9sKG5hbWUsIGNyYWZ0SW52b2tlckZ1bmN0aW9uKG5hbWUsIGludm9rZXJBcmdzQXJyYXksIG51bGwgLyogbm8gY2xhc3MgJ3RoaXMnKi8sIHJhd0ludm9rZXIsIGZuKSwgYXJnQ291bnQgLSAxKTtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICB9KTtcbiAgICB9XG5cbiAgZnVuY3Rpb24gX19fY3hhX2ZpbmRfbWF0Y2hpbmdfY2F0Y2hfMigpIHtcbiAgICAgICAgICByZXR1cm4gX19fY3hhX2ZpbmRfbWF0Y2hpbmdfY2F0Y2guYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuXG4gIFxuICBmdW5jdGlvbiBfZW1zY3JpcHRlbl9tZW1jcHlfYmlnKGRlc3QsIHNyYywgbnVtKSB7XG4gICAgICBIRUFQVTguc2V0KEhFQVBVOC5zdWJhcnJheShzcmMsIHNyYytudW0pLCBkZXN0KTtcbiAgICAgIHJldHVybiBkZXN0O1xuICAgIH0gXG4gIE1vZHVsZVtcIl9tZW1jcHlcIl0gPSBfbWVtY3B5O1xuXG4gIGZ1bmN0aW9uIF9fX3N5c2NhbGw2KHdoaWNoLCB2YXJhcmdzKSB7U1lTQ0FMTFMudmFyYXJncyA9IHZhcmFyZ3M7XG4gIHRyeSB7XG4gICAvLyBjbG9zZVxuICAgICAgdmFyIHN0cmVhbSA9IFNZU0NBTExTLmdldFN0cmVhbUZyb21GRCgpO1xuICAgICAgRlMuY2xvc2Uoc3RyZWFtKTtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAodHlwZW9mIEZTID09PSAndW5kZWZpbmVkJyB8fCAhKGUgaW5zdGFuY2VvZiBGUy5FcnJub0Vycm9yKSkgYWJvcnQoZSk7XG4gICAgcmV0dXJuIC1lLmVycm5vO1xuICB9XG4gIH1cblxuICBcbiAgZnVuY3Rpb24gX19fc2V0RXJyTm8odmFsdWUpIHtcbiAgICAgIGlmIChNb2R1bGVbJ19fX2Vycm5vX2xvY2F0aW9uJ10pIEhFQVAzMlsoKE1vZHVsZVsnX19fZXJybm9fbG9jYXRpb24nXSgpKT4+MildPXZhbHVlO1xuICAgICAgZWxzZSBNb2R1bGUucHJpbnRFcnIoJ2ZhaWxlZCB0byBzZXQgZXJybm8gZnJvbSBKUycpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gXG4gIE1vZHVsZVtcIl9zYnJrXCJdID0gX3Nicms7XG5cbiAgdmFyIF9sbHZtX3Bvd19mMzI9TWF0aF9wb3c7XG5cbiAgZnVuY3Rpb24gX19lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcocmF3VHlwZSwgY2hhclNpemUsIG5hbWUpIHtcbiAgICAgIC8vIG5iLiBkbyBub3QgY2FjaGUgSEVBUFUxNiBhbmQgSEVBUFUzMiwgdGhleSBtYXkgYmUgZGVzdHJveWVkIGJ5IGVubGFyZ2VNZW1vcnkoKS5cbiAgICAgIG5hbWUgPSByZWFkTGF0aW4xU3RyaW5nKG5hbWUpO1xuICAgICAgdmFyIGdldEhlYXAsIHNoaWZ0O1xuICAgICAgaWYgKGNoYXJTaXplID09PSAyKSB7XG4gICAgICAgICAgZ2V0SGVhcCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gSEVBUFUxNjsgfTtcbiAgICAgICAgICBzaGlmdCA9IDE7XG4gICAgICB9IGVsc2UgaWYgKGNoYXJTaXplID09PSA0KSB7XG4gICAgICAgICAgZ2V0SGVhcCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gSEVBUFUzMjsgfTtcbiAgICAgICAgICBzaGlmdCA9IDI7XG4gICAgICB9XG4gICAgICByZWdpc3RlclR5cGUocmF3VHlwZSwge1xuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgJ2Zyb21XaXJlVHlwZSc6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgIHZhciBIRUFQID0gZ2V0SGVhcCgpO1xuICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gSEVBUFUzMlt2YWx1ZSA+PiAyXTtcbiAgICAgICAgICAgICAgdmFyIGEgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gKHZhbHVlICsgNCkgPj4gc2hpZnQ7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgIGFbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKEhFQVBbc3RhcnQgKyBpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgX2ZyZWUodmFsdWUpO1xuICAgICAgICAgICAgICByZXR1cm4gYS5qb2luKCcnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd0b1dpcmVUeXBlJzogZnVuY3Rpb24oZGVzdHJ1Y3RvcnMsIHZhbHVlKSB7XG4gICAgICAgICAgICAgIC8vIGFzc3VtZXMgNC1ieXRlIGFsaWdubWVudFxuICAgICAgICAgICAgICB2YXIgSEVBUCA9IGdldEhlYXAoKTtcbiAgICAgICAgICAgICAgdmFyIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgdmFyIHB0ciA9IF9tYWxsb2MoNCArIGxlbmd0aCAqIGNoYXJTaXplKTtcbiAgICAgICAgICAgICAgSEVBUFUzMltwdHIgPj4gMl0gPSBsZW5ndGg7XG4gICAgICAgICAgICAgIHZhciBzdGFydCA9IChwdHIgKyA0KSA+PiBzaGlmdDtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgSEVBUFtzdGFydCArIGldID0gdmFsdWUuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZGVzdHJ1Y3RvcnMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3JzLnB1c2goX2ZyZWUsIHB0cik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHB0cjtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdhcmdQYWNrQWR2YW5jZSc6IDgsXG4gICAgICAgICAgJ3JlYWRWYWx1ZUZyb21Qb2ludGVyJzogc2ltcGxlUmVhZFZhbHVlRnJvbVBvaW50ZXIsXG4gICAgICAgICAgZGVzdHJ1Y3RvckZ1bmN0aW9uOiBmdW5jdGlvbihwdHIpIHsgX2ZyZWUocHRyKTsgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuXG4gIGZ1bmN0aW9uIF9fX2d4eF9wZXJzb25hbGl0eV92MCgpIHtcbiAgICB9XG5cbiAgIFxuICBNb2R1bGVbXCJfbGx2bV9ic3dhcF9pMzJcIl0gPSBfbGx2bV9ic3dhcF9pMzI7XG5cbiAgZnVuY3Rpb24gX19lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcocmF3VHlwZSwgZGF0YVR5cGVJbmRleCwgbmFtZSkge1xuICAgICAgdmFyIHR5cGVNYXBwaW5nID0gW1xuICAgICAgICAgIEludDhBcnJheSxcbiAgICAgICAgICBVaW50OEFycmF5LFxuICAgICAgICAgIEludDE2QXJyYXksXG4gICAgICAgICAgVWludDE2QXJyYXksXG4gICAgICAgICAgSW50MzJBcnJheSxcbiAgICAgICAgICBVaW50MzJBcnJheSxcbiAgICAgICAgICBGbG9hdDMyQXJyYXksXG4gICAgICAgICAgRmxvYXQ2NEFycmF5LFxuICAgICAgXTtcbiAgXG4gICAgICB2YXIgVEEgPSB0eXBlTWFwcGluZ1tkYXRhVHlwZUluZGV4XTtcbiAgXG4gICAgICBmdW5jdGlvbiBkZWNvZGVNZW1vcnlWaWV3KGhhbmRsZSkge1xuICAgICAgICAgIGhhbmRsZSA9IGhhbmRsZSA+PiAyO1xuICAgICAgICAgIHZhciBoZWFwID0gSEVBUFUzMjtcbiAgICAgICAgICB2YXIgc2l6ZSA9IGhlYXBbaGFuZGxlXTsgLy8gaW4gZWxlbWVudHNcbiAgICAgICAgICB2YXIgZGF0YSA9IGhlYXBbaGFuZGxlICsgMV07IC8vIGJ5dGUgb2Zmc2V0IGludG8gZW1zY3JpcHRlbiBoZWFwXG4gICAgICAgICAgcmV0dXJuIG5ldyBUQShoZWFwWydidWZmZXInXSwgZGF0YSwgc2l6ZSk7XG4gICAgICB9XG4gIFxuICAgICAgbmFtZSA9IHJlYWRMYXRpbjFTdHJpbmcobmFtZSk7XG4gICAgICByZWdpc3RlclR5cGUocmF3VHlwZSwge1xuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgJ2Zyb21XaXJlVHlwZSc6IGRlY29kZU1lbW9yeVZpZXcsXG4gICAgICAgICAgJ2FyZ1BhY2tBZHZhbmNlJzogOCxcbiAgICAgICAgICAncmVhZFZhbHVlRnJvbVBvaW50ZXInOiBkZWNvZGVNZW1vcnlWaWV3LFxuICAgICAgfSwge1xuICAgICAgICAgIGlnbm9yZUR1cGxpY2F0ZVJlZ2lzdHJhdGlvbnM6IHRydWUsXG4gICAgICB9KTtcbiAgICB9XG5cblxuICBmdW5jdGlvbiBfX19zeXNjYWxsMTQwKHdoaWNoLCB2YXJhcmdzKSB7U1lTQ0FMTFMudmFyYXJncyA9IHZhcmFyZ3M7XG4gIHRyeSB7XG4gICAvLyBsbHNlZWtcbiAgICAgIHZhciBzdHJlYW0gPSBTWVNDQUxMUy5nZXRTdHJlYW1Gcm9tRkQoKSwgb2Zmc2V0X2hpZ2ggPSBTWVNDQUxMUy5nZXQoKSwgb2Zmc2V0X2xvdyA9IFNZU0NBTExTLmdldCgpLCByZXN1bHQgPSBTWVNDQUxMUy5nZXQoKSwgd2hlbmNlID0gU1lTQ0FMTFMuZ2V0KCk7XG4gICAgICAvLyBOT1RFOiBvZmZzZXRfaGlnaCBpcyB1bnVzZWQgLSBFbXNjcmlwdGVuJ3Mgb2ZmX3QgaXMgMzItYml0XG4gICAgICB2YXIgb2Zmc2V0ID0gb2Zmc2V0X2xvdztcbiAgICAgIEZTLmxsc2VlayhzdHJlYW0sIG9mZnNldCwgd2hlbmNlKTtcbiAgICAgIEhFQVAzMlsoKHJlc3VsdCk+PjIpXT1zdHJlYW0ucG9zaXRpb247XG4gICAgICBpZiAoc3RyZWFtLmdldGRlbnRzICYmIG9mZnNldCA9PT0gMCAmJiB3aGVuY2UgPT09IDApIHN0cmVhbS5nZXRkZW50cyA9IG51bGw7IC8vIHJlc2V0IHJlYWRkaXIgc3RhdGVcbiAgICAgIHJldHVybiAwO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAodHlwZW9mIEZTID09PSAndW5kZWZpbmVkJyB8fCAhKGUgaW5zdGFuY2VvZiBGUy5FcnJub0Vycm9yKSkgYWJvcnQoZSk7XG4gICAgcmV0dXJuIC1lLmVycm5vO1xuICB9XG4gIH1cblxuICBmdW5jdGlvbiBfX19zeXNjYWxsMTQ2KHdoaWNoLCB2YXJhcmdzKSB7U1lTQ0FMTFMudmFyYXJncyA9IHZhcmFyZ3M7XG4gIHRyeSB7XG4gICAvLyB3cml0ZXZcbiAgICAgIC8vIGhhY2sgdG8gc3VwcG9ydCBwcmludGYgaW4gTk9fRklMRVNZU1RFTVxuICAgICAgdmFyIHN0cmVhbSA9IFNZU0NBTExTLmdldCgpLCBpb3YgPSBTWVNDQUxMUy5nZXQoKSwgaW92Y250ID0gU1lTQ0FMTFMuZ2V0KCk7XG4gICAgICB2YXIgcmV0ID0gMDtcbiAgICAgIGlmICghX19fc3lzY2FsbDE0Ni5idWZmZXIpIHtcbiAgICAgICAgX19fc3lzY2FsbDE0Ni5idWZmZXJzID0gW251bGwsIFtdLCBbXV07IC8vIDEgPT4gc3Rkb3V0LCAyID0+IHN0ZGVyclxuICAgICAgICBfX19zeXNjYWxsMTQ2LnByaW50Q2hhciA9IGZ1bmN0aW9uKHN0cmVhbSwgY3Vycikge1xuICAgICAgICAgIHZhciBidWZmZXIgPSBfX19zeXNjYWxsMTQ2LmJ1ZmZlcnNbc3RyZWFtXTtcbiAgICAgICAgICBhc3NlcnQoYnVmZmVyKTtcbiAgICAgICAgICBpZiAoY3VyciA9PT0gMCB8fCBjdXJyID09PSAxMCkge1xuICAgICAgICAgICAgKHN0cmVhbSA9PT0gMSA/IE1vZHVsZVsncHJpbnQnXSA6IE1vZHVsZVsncHJpbnRFcnInXSkoVVRGOEFycmF5VG9TdHJpbmcoYnVmZmVyLCAwKSk7XG4gICAgICAgICAgICBidWZmZXIubGVuZ3RoID0gMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVmZmVyLnB1c2goY3Vycik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpb3ZjbnQ7IGkrKykge1xuICAgICAgICB2YXIgcHRyID0gSEVBUDMyWygoKGlvdikrKGkqOCkpPj4yKV07XG4gICAgICAgIHZhciBsZW4gPSBIRUFQMzJbKCgoaW92KSsoaSo4ICsgNCkpPj4yKV07XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICBfX19zeXNjYWxsMTQ2LnByaW50Q2hhcihzdHJlYW0sIEhFQVBVOFtwdHIral0pO1xuICAgICAgICB9XG4gICAgICAgIHJldCArPSBsZW47XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAodHlwZW9mIEZTID09PSAndW5kZWZpbmVkJyB8fCAhKGUgaW5zdGFuY2VvZiBGUy5FcnJub0Vycm9yKSkgYWJvcnQoZSk7XG4gICAgcmV0dXJuIC1lLmVycm5vO1xuICB9XG4gIH1cbmVtYmluZF9pbml0X2NoYXJDb2RlcygpO1xuQmluZGluZ0Vycm9yID0gTW9kdWxlWydCaW5kaW5nRXJyb3InXSA9IGV4dGVuZEVycm9yKEVycm9yLCAnQmluZGluZ0Vycm9yJyk7O1xuSW50ZXJuYWxFcnJvciA9IE1vZHVsZVsnSW50ZXJuYWxFcnJvciddID0gZXh0ZW5kRXJyb3IoRXJyb3IsICdJbnRlcm5hbEVycm9yJyk7O1xuaW5pdF9lbXZhbCgpOztcbl9fX2J1aWxkRW52aXJvbm1lbnQoRU5WKTs7XG5VbmJvdW5kVHlwZUVycm9yID0gTW9kdWxlWydVbmJvdW5kVHlwZUVycm9yJ10gPSBleHRlbmRFcnJvcihFcnJvciwgJ1VuYm91bmRUeXBlRXJyb3InKTs7XG4vKiBmbHVzaCBhbnl0aGluZyByZW1haW5pbmcgaW4gdGhlIGJ1ZmZlciBkdXJpbmcgc2h1dGRvd24gKi8gX19BVEVYSVRfXy5wdXNoKGZ1bmN0aW9uKCkgeyB2YXIgZmZsdXNoID0gTW9kdWxlW1wiX2ZmbHVzaFwiXTsgaWYgKGZmbHVzaCkgZmZsdXNoKDApOyB2YXIgcHJpbnRDaGFyID0gX19fc3lzY2FsbDE0Ni5wcmludENoYXI7IGlmICghcHJpbnRDaGFyKSByZXR1cm47IHZhciBidWZmZXJzID0gX19fc3lzY2FsbDE0Ni5idWZmZXJzOyBpZiAoYnVmZmVyc1sxXS5sZW5ndGgpIHByaW50Q2hhcigxLCAxMCk7IGlmIChidWZmZXJzWzJdLmxlbmd0aCkgcHJpbnRDaGFyKDIsIDEwKTsgfSk7O1xuRFlOQU1JQ1RPUF9QVFIgPSBhbGxvY2F0ZSgxLCBcImkzMlwiLCBBTExPQ19TVEFUSUMpO1xuXG5TVEFDS19CQVNFID0gU1RBQ0tUT1AgPSBSdW50aW1lLmFsaWduTWVtb3J5KFNUQVRJQ1RPUCk7XG5cblNUQUNLX01BWCA9IFNUQUNLX0JBU0UgKyBUT1RBTF9TVEFDSztcblxuRFlOQU1JQ19CQVNFID0gUnVudGltZS5hbGlnbk1lbW9yeShTVEFDS19NQVgpO1xuXG5IRUFQMzJbRFlOQU1JQ1RPUF9QVFI+PjJdID0gRFlOQU1JQ19CQVNFO1xuXG5zdGF0aWNTZWFsZWQgPSB0cnVlOyAvLyBzZWFsIHRoZSBzdGF0aWMgcG9ydGlvbiBvZiBtZW1vcnlcblxuYXNzZXJ0KERZTkFNSUNfQkFTRSA8IFRPVEFMX01FTU9SWSwgXCJUT1RBTF9NRU1PUlkgbm90IGJpZyBlbm91Z2ggZm9yIHN0YWNrXCIpO1xuXG5cbmZ1bmN0aW9uIG51bGxGdW5jX3ZpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICd2aScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfaWlpaSh4KSB7IE1vZHVsZVtcInByaW50RXJyXCJdKFwiSW52YWxpZCBmdW5jdGlvbiBwb2ludGVyIGNhbGxlZCB3aXRoIHNpZ25hdHVyZSAnaWlpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfdmlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICd2aWknLiBQZXJoYXBzIHRoaXMgaXMgYW4gaW52YWxpZCB2YWx1ZSAoZS5nLiBjYXVzZWQgYnkgY2FsbGluZyBhIHZpcnR1YWwgbWV0aG9kIG9uIGEgTlVMTCBwb2ludGVyKT8gT3IgY2FsbGluZyBhIGZ1bmN0aW9uIHdpdGggYW4gaW5jb3JyZWN0IHR5cGUsIHdoaWNoIHdpbGwgZmFpbD8gKGl0IGlzIHdvcnRoIGJ1aWxkaW5nIHlvdXIgc291cmNlIGZpbGVzIHdpdGggLVdlcnJvciAod2FybmluZ3MgYXJlIGVycm9ycyksIGFzIHdhcm5pbmdzIGNhbiBpbmRpY2F0ZSB1bmRlZmluZWQgYmVoYXZpb3Igd2hpY2ggY2FuIGNhdXNlIHRoaXMpXCIpOyAgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJCdWlsZCB3aXRoIEFTU0VSVElPTlM9MiBmb3IgbW9yZSBpbmZvLlwiKTthYm9ydCh4KSB9XG5cbmZ1bmN0aW9uIG51bGxGdW5jX2lpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICdpaWlpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfdmlpaWlpaWkoeCkgeyBNb2R1bGVbXCJwcmludEVyclwiXShcIkludmFsaWQgZnVuY3Rpb24gcG9pbnRlciBjYWxsZWQgd2l0aCBzaWduYXR1cmUgJ3ZpaWlpaWlpJy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY192aWlpaWkoeCkgeyBNb2R1bGVbXCJwcmludEVyclwiXShcIkludmFsaWQgZnVuY3Rpb24gcG9pbnRlciBjYWxsZWQgd2l0aCBzaWduYXR1cmUgJ3ZpaWlpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfaWlpaWlpaWlpaSh4KSB7IE1vZHVsZVtcInByaW50RXJyXCJdKFwiSW52YWxpZCBmdW5jdGlvbiBwb2ludGVyIGNhbGxlZCB3aXRoIHNpZ25hdHVyZSAnaWlpaWlpaWlpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfaWlpaWlpaWlpaWkoeCkgeyBNb2R1bGVbXCJwcmludEVyclwiXShcIkludmFsaWQgZnVuY3Rpb24gcG9pbnRlciBjYWxsZWQgd2l0aCBzaWduYXR1cmUgJ2lpaWlpaWlpaWlpJy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY192KHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICd2Jy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY19paWlpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICdpaWlpaWlpJy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY19paSh4KSB7IE1vZHVsZVtcInByaW50RXJyXCJdKFwiSW52YWxpZCBmdW5jdGlvbiBwb2ludGVyIGNhbGxlZCB3aXRoIHNpZ25hdHVyZSAnaWknLiBQZXJoYXBzIHRoaXMgaXMgYW4gaW52YWxpZCB2YWx1ZSAoZS5nLiBjYXVzZWQgYnkgY2FsbGluZyBhIHZpcnR1YWwgbWV0aG9kIG9uIGEgTlVMTCBwb2ludGVyKT8gT3IgY2FsbGluZyBhIGZ1bmN0aW9uIHdpdGggYW4gaW5jb3JyZWN0IHR5cGUsIHdoaWNoIHdpbGwgZmFpbD8gKGl0IGlzIHdvcnRoIGJ1aWxkaW5nIHlvdXIgc291cmNlIGZpbGVzIHdpdGggLVdlcnJvciAod2FybmluZ3MgYXJlIGVycm9ycyksIGFzIHdhcm5pbmdzIGNhbiBpbmRpY2F0ZSB1bmRlZmluZWQgYmVoYXZpb3Igd2hpY2ggY2FuIGNhdXNlIHRoaXMpXCIpOyAgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJCdWlsZCB3aXRoIEFTU0VSVElPTlM9MiBmb3IgbW9yZSBpbmZvLlwiKTthYm9ydCh4KSB9XG5cbmZ1bmN0aW9uIG51bGxGdW5jX3ZpaWkoeCkgeyBNb2R1bGVbXCJwcmludEVyclwiXShcIkludmFsaWQgZnVuY3Rpb24gcG9pbnRlciBjYWxsZWQgd2l0aCBzaWduYXR1cmUgJ3ZpaWknLiBQZXJoYXBzIHRoaXMgaXMgYW4gaW52YWxpZCB2YWx1ZSAoZS5nLiBjYXVzZWQgYnkgY2FsbGluZyBhIHZpcnR1YWwgbWV0aG9kIG9uIGEgTlVMTCBwb2ludGVyKT8gT3IgY2FsbGluZyBhIGZ1bmN0aW9uIHdpdGggYW4gaW5jb3JyZWN0IHR5cGUsIHdoaWNoIHdpbGwgZmFpbD8gKGl0IGlzIHdvcnRoIGJ1aWxkaW5nIHlvdXIgc291cmNlIGZpbGVzIHdpdGggLVdlcnJvciAod2FybmluZ3MgYXJlIGVycm9ycyksIGFzIHdhcm5pbmdzIGNhbiBpbmRpY2F0ZSB1bmRlZmluZWQgYmVoYXZpb3Igd2hpY2ggY2FuIGNhdXNlIHRoaXMpXCIpOyAgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJCdWlsZCB3aXRoIEFTU0VSVElPTlM9MiBmb3IgbW9yZSBpbmZvLlwiKTthYm9ydCh4KSB9XG5cbmZ1bmN0aW9uIG51bGxGdW5jX2ZmKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICdmZicuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfaWlpaWlpaWlpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICdpaWlpaWlpaWlpaWknLiBQZXJoYXBzIHRoaXMgaXMgYW4gaW52YWxpZCB2YWx1ZSAoZS5nLiBjYXVzZWQgYnkgY2FsbGluZyBhIHZpcnR1YWwgbWV0aG9kIG9uIGEgTlVMTCBwb2ludGVyKT8gT3IgY2FsbGluZyBhIGZ1bmN0aW9uIHdpdGggYW4gaW5jb3JyZWN0IHR5cGUsIHdoaWNoIHdpbGwgZmFpbD8gKGl0IGlzIHdvcnRoIGJ1aWxkaW5nIHlvdXIgc291cmNlIGZpbGVzIHdpdGggLVdlcnJvciAod2FybmluZ3MgYXJlIGVycm9ycyksIGFzIHdhcm5pbmdzIGNhbiBpbmRpY2F0ZSB1bmRlZmluZWQgYmVoYXZpb3Igd2hpY2ggY2FuIGNhdXNlIHRoaXMpXCIpOyAgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJCdWlsZCB3aXRoIEFTU0VSVElPTlM9MiBmb3IgbW9yZSBpbmZvLlwiKTthYm9ydCh4KSB9XG5cbmZ1bmN0aW9uIG51bGxGdW5jX2ZmZih4KSB7IE1vZHVsZVtcInByaW50RXJyXCJdKFwiSW52YWxpZCBmdW5jdGlvbiBwb2ludGVyIGNhbGxlZCB3aXRoIHNpZ25hdHVyZSAnZmZmJy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY192aWlpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICd2aWlpaWlpJy4gUGVyaGFwcyB0aGlzIGlzIGFuIGludmFsaWQgdmFsdWUgKGUuZy4gY2F1c2VkIGJ5IGNhbGxpbmcgYSB2aXJ0dWFsIG1ldGhvZCBvbiBhIE5VTEwgcG9pbnRlcik/IE9yIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIGFuIGluY29ycmVjdCB0eXBlLCB3aGljaCB3aWxsIGZhaWw/IChpdCBpcyB3b3J0aCBidWlsZGluZyB5b3VyIHNvdXJjZSBmaWxlcyB3aXRoIC1XZXJyb3IgKHdhcm5pbmdzIGFyZSBlcnJvcnMpLCBhcyB3YXJuaW5ncyBjYW4gaW5kaWNhdGUgdW5kZWZpbmVkIGJlaGF2aW9yIHdoaWNoIGNhbiBjYXVzZSB0aGlzKVwiKTsgIE1vZHVsZVtcInByaW50RXJyXCJdKFwiQnVpbGQgd2l0aCBBU1NFUlRJT05TPTIgZm9yIG1vcmUgaW5mby5cIik7YWJvcnQoeCkgfVxuXG5mdW5jdGlvbiBudWxsRnVuY19paWkoeCkgeyBNb2R1bGVbXCJwcmludEVyclwiXShcIkludmFsaWQgZnVuY3Rpb24gcG9pbnRlciBjYWxsZWQgd2l0aCBzaWduYXR1cmUgJ2lpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuZnVuY3Rpb24gbnVsbEZ1bmNfaWlpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICdpaWlpaWknLiBQZXJoYXBzIHRoaXMgaXMgYW4gaW52YWxpZCB2YWx1ZSAoZS5nLiBjYXVzZWQgYnkgY2FsbGluZyBhIHZpcnR1YWwgbWV0aG9kIG9uIGEgTlVMTCBwb2ludGVyKT8gT3IgY2FsbGluZyBhIGZ1bmN0aW9uIHdpdGggYW4gaW5jb3JyZWN0IHR5cGUsIHdoaWNoIHdpbGwgZmFpbD8gKGl0IGlzIHdvcnRoIGJ1aWxkaW5nIHlvdXIgc291cmNlIGZpbGVzIHdpdGggLVdlcnJvciAod2FybmluZ3MgYXJlIGVycm9ycyksIGFzIHdhcm5pbmdzIGNhbiBpbmRpY2F0ZSB1bmRlZmluZWQgYmVoYXZpb3Igd2hpY2ggY2FuIGNhdXNlIHRoaXMpXCIpOyAgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJCdWlsZCB3aXRoIEFTU0VSVElPTlM9MiBmb3IgbW9yZSBpbmZvLlwiKTthYm9ydCh4KSB9XG5cbmZ1bmN0aW9uIG51bGxGdW5jX3ZpaWlpKHgpIHsgTW9kdWxlW1wicHJpbnRFcnJcIl0oXCJJbnZhbGlkIGZ1bmN0aW9uIHBvaW50ZXIgY2FsbGVkIHdpdGggc2lnbmF0dXJlICd2aWlpaScuIFBlcmhhcHMgdGhpcyBpcyBhbiBpbnZhbGlkIHZhbHVlIChlLmcuIGNhdXNlZCBieSBjYWxsaW5nIGEgdmlydHVhbCBtZXRob2Qgb24gYSBOVUxMIHBvaW50ZXIpPyBPciBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCBhbiBpbmNvcnJlY3QgdHlwZSwgd2hpY2ggd2lsbCBmYWlsPyAoaXQgaXMgd29ydGggYnVpbGRpbmcgeW91ciBzb3VyY2UgZmlsZXMgd2l0aCAtV2Vycm9yICh3YXJuaW5ncyBhcmUgZXJyb3JzKSwgYXMgd2FybmluZ3MgY2FuIGluZGljYXRlIHVuZGVmaW5lZCBiZWhhdmlvciB3aGljaCBjYW4gY2F1c2UgdGhpcylcIik7ICBNb2R1bGVbXCJwcmludEVyclwiXShcIkJ1aWxkIHdpdGggQVNTRVJUSU9OUz0yIGZvciBtb3JlIGluZm8uXCIpO2Fib3J0KHgpIH1cblxuTW9kdWxlWyd3YXNtVGFibGVTaXplJ10gPSA3MDA5O1xuXG5Nb2R1bGVbJ3dhc21NYXhUYWJsZVNpemUnXSA9IDcwMDk7XG5cbmZ1bmN0aW9uIGludm9rZV92aShpbmRleCxhMSkge1xuICB0cnkge1xuICAgIE1vZHVsZVtcImR5bkNhbGxfdmlcIl0oaW5kZXgsYTEpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaShpbmRleCxhMSxhMixhMykge1xuICB0cnkge1xuICAgIHJldHVybiBNb2R1bGVbXCJkeW5DYWxsX2lpaWlcIl0oaW5kZXgsYTEsYTIsYTMpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfdmlpKGluZGV4LGExLGEyKSB7XG4gIHRyeSB7XG4gICAgTW9kdWxlW1wiZHluQ2FsbF92aWlcIl0oaW5kZXgsYTEsYTIpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWkoaW5kZXgsYTEsYTIsYTMsYTQpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gTW9kdWxlW1wiZHluQ2FsbF9paWlpaVwiXShpbmRleCxhMSxhMixhMyxhNCk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGlmICh0eXBlb2YgZSAhPT0gJ251bWJlcicgJiYgZSAhPT0gJ2xvbmdqbXAnKSB0aHJvdyBlO1xuICAgIE1vZHVsZVtcInNldFRocmV3XCJdKDEsIDApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZV92aWlpaWlpaShpbmRleCxhMSxhMixhMyxhNCxhNSxhNixhNykge1xuICB0cnkge1xuICAgIE1vZHVsZVtcImR5bkNhbGxfdmlpaWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYsYTcpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfdmlpaWlpKGluZGV4LGExLGEyLGEzLGE0LGE1KSB7XG4gIHRyeSB7XG4gICAgTW9kdWxlW1wiZHluQ2FsbF92aWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWlpaWlpaShpbmRleCxhMSxhMixhMyxhNCxhNSxhNixhNyxhOCxhOSkge1xuICB0cnkge1xuICAgIHJldHVybiBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYsYTcsYTgsYTkpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWlpaWlpaWkoaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYsYTcsYTgsYTksYTEwKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIE1vZHVsZVtcImR5bkNhbGxfaWlpaWlpaWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYsYTcsYTgsYTksYTEwKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgaWYgKHR5cGVvZiBlICE9PSAnbnVtYmVyJyAmJiBlICE9PSAnbG9uZ2ptcCcpIHRocm93IGU7XG4gICAgTW9kdWxlW1wic2V0VGhyZXdcIl0oMSwgMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlX3YoaW5kZXgpIHtcbiAgdHJ5IHtcbiAgICBNb2R1bGVbXCJkeW5DYWxsX3ZcIl0oaW5kZXgpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWlpaShpbmRleCxhMSxhMixhMyxhNCxhNSxhNikge1xuICB0cnkge1xuICAgIHJldHVybiBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWkoaW5kZXgsYTEpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gTW9kdWxlW1wiZHluQ2FsbF9paVwiXShpbmRleCxhMSk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGlmICh0eXBlb2YgZSAhPT0gJ251bWJlcicgJiYgZSAhPT0gJ2xvbmdqbXAnKSB0aHJvdyBlO1xuICAgIE1vZHVsZVtcInNldFRocmV3XCJdKDEsIDApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZV92aWlpKGluZGV4LGExLGEyLGEzKSB7XG4gIHRyeSB7XG4gICAgTW9kdWxlW1wiZHluQ2FsbF92aWlpXCJdKGluZGV4LGExLGEyLGEzKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgaWYgKHR5cGVvZiBlICE9PSAnbnVtYmVyJyAmJiBlICE9PSAnbG9uZ2ptcCcpIHRocm93IGU7XG4gICAgTW9kdWxlW1wic2V0VGhyZXdcIl0oMSwgMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlX2ZmKGluZGV4LGExKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIE1vZHVsZVtcImR5bkNhbGxfZmZcIl0oaW5kZXgsYTEpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWlpaWlpaWlpKGluZGV4LGExLGEyLGEzLGE0LGE1LGE2LGE3LGE4LGE5LGExMCxhMTEpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gTW9kdWxlW1wiZHluQ2FsbF9paWlpaWlpaWlpaWlcIl0oaW5kZXgsYTEsYTIsYTMsYTQsYTUsYTYsYTcsYTgsYTksYTEwLGExMSk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGlmICh0eXBlb2YgZSAhPT0gJ251bWJlcicgJiYgZSAhPT0gJ2xvbmdqbXAnKSB0aHJvdyBlO1xuICAgIE1vZHVsZVtcInNldFRocmV3XCJdKDEsIDApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZV9mZmYoaW5kZXgsYTEsYTIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gTW9kdWxlW1wiZHluQ2FsbF9mZmZcIl0oaW5kZXgsYTEsYTIpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfdmlpaWlpaShpbmRleCxhMSxhMixhMyxhNCxhNSxhNikge1xuICB0cnkge1xuICAgIE1vZHVsZVtcImR5bkNhbGxfdmlpaWlpaVwiXShpbmRleCxhMSxhMixhMyxhNCxhNSxhNik7XG4gIH0gY2F0Y2goZSkge1xuICAgIGlmICh0eXBlb2YgZSAhPT0gJ251bWJlcicgJiYgZSAhPT0gJ2xvbmdqbXAnKSB0aHJvdyBlO1xuICAgIE1vZHVsZVtcInNldFRocmV3XCJdKDEsIDApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZV9paWkoaW5kZXgsYTEsYTIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gTW9kdWxlW1wiZHluQ2FsbF9paWlcIl0oaW5kZXgsYTEsYTIpO1xuICB9IGNhdGNoKGUpIHtcbiAgICBpZiAodHlwZW9mIGUgIT09ICdudW1iZXInICYmIGUgIT09ICdsb25nam1wJykgdGhyb3cgZTtcbiAgICBNb2R1bGVbXCJzZXRUaHJld1wiXSgxLCAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VfaWlpaWlpKGluZGV4LGExLGEyLGEzLGE0LGE1KSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIE1vZHVsZVtcImR5bkNhbGxfaWlpaWlpXCJdKGluZGV4LGExLGEyLGEzLGE0LGE1KTtcbiAgfSBjYXRjaChlKSB7XG4gICAgaWYgKHR5cGVvZiBlICE9PSAnbnVtYmVyJyAmJiBlICE9PSAnbG9uZ2ptcCcpIHRocm93IGU7XG4gICAgTW9kdWxlW1wic2V0VGhyZXdcIl0oMSwgMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlX3ZpaWlpKGluZGV4LGExLGEyLGEzLGE0KSB7XG4gIHRyeSB7XG4gICAgTW9kdWxlW1wiZHluQ2FsbF92aWlpaVwiXShpbmRleCxhMSxhMixhMyxhNCk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGlmICh0eXBlb2YgZSAhPT0gJ251bWJlcicgJiYgZSAhPT0gJ2xvbmdqbXAnKSB0aHJvdyBlO1xuICAgIE1vZHVsZVtcInNldFRocmV3XCJdKDEsIDApO1xuICB9XG59XG5cbk1vZHVsZS5hc21HbG9iYWxBcmcgPSB7IFwiTWF0aFwiOiBNYXRoLCBcIkludDhBcnJheVwiOiBJbnQ4QXJyYXksIFwiSW50MTZBcnJheVwiOiBJbnQxNkFycmF5LCBcIkludDMyQXJyYXlcIjogSW50MzJBcnJheSwgXCJVaW50OEFycmF5XCI6IFVpbnQ4QXJyYXksIFwiVWludDE2QXJyYXlcIjogVWludDE2QXJyYXksIFwiVWludDMyQXJyYXlcIjogVWludDMyQXJyYXksIFwiRmxvYXQzMkFycmF5XCI6IEZsb2F0MzJBcnJheSwgXCJGbG9hdDY0QXJyYXlcIjogRmxvYXQ2NEFycmF5LCBcIk5hTlwiOiBOYU4sIFwiSW5maW5pdHlcIjogSW5maW5pdHksIFwiYnl0ZUxlbmd0aFwiOiBieXRlTGVuZ3RoIH07XG5cbk1vZHVsZS5hc21MaWJyYXJ5QXJnID0geyBcImFib3J0XCI6IGFib3J0LCBcImFzc2VydFwiOiBhc3NlcnQsIFwiZW5sYXJnZU1lbW9yeVwiOiBlbmxhcmdlTWVtb3J5LCBcImdldFRvdGFsTWVtb3J5XCI6IGdldFRvdGFsTWVtb3J5LCBcImFib3J0T25DYW5ub3RHcm93TWVtb3J5XCI6IGFib3J0T25DYW5ub3RHcm93TWVtb3J5LCBcImFib3J0U3RhY2tPdmVyZmxvd1wiOiBhYm9ydFN0YWNrT3ZlcmZsb3csIFwibnVsbEZ1bmNfdmlcIjogbnVsbEZ1bmNfdmksIFwibnVsbEZ1bmNfaWlpaVwiOiBudWxsRnVuY19paWlpLCBcIm51bGxGdW5jX3ZpaVwiOiBudWxsRnVuY192aWksIFwibnVsbEZ1bmNfaWlpaWlcIjogbnVsbEZ1bmNfaWlpaWksIFwibnVsbEZ1bmNfdmlpaWlpaWlcIjogbnVsbEZ1bmNfdmlpaWlpaWksIFwibnVsbEZ1bmNfdmlpaWlpXCI6IG51bGxGdW5jX3ZpaWlpaSwgXCJudWxsRnVuY19paWlpaWlpaWlpXCI6IG51bGxGdW5jX2lpaWlpaWlpaWksIFwibnVsbEZ1bmNfaWlpaWlpaWlpaWlcIjogbnVsbEZ1bmNfaWlpaWlpaWlpaWksIFwibnVsbEZ1bmNfdlwiOiBudWxsRnVuY192LCBcIm51bGxGdW5jX2lpaWlpaWlcIjogbnVsbEZ1bmNfaWlpaWlpaSwgXCJudWxsRnVuY19paVwiOiBudWxsRnVuY19paSwgXCJudWxsRnVuY192aWlpXCI6IG51bGxGdW5jX3ZpaWksIFwibnVsbEZ1bmNfZmZcIjogbnVsbEZ1bmNfZmYsIFwibnVsbEZ1bmNfaWlpaWlpaWlpaWlpXCI6IG51bGxGdW5jX2lpaWlpaWlpaWlpaSwgXCJudWxsRnVuY19mZmZcIjogbnVsbEZ1bmNfZmZmLCBcIm51bGxGdW5jX3ZpaWlpaWlcIjogbnVsbEZ1bmNfdmlpaWlpaSwgXCJudWxsRnVuY19paWlcIjogbnVsbEZ1bmNfaWlpLCBcIm51bGxGdW5jX2lpaWlpaVwiOiBudWxsRnVuY19paWlpaWksIFwibnVsbEZ1bmNfdmlpaWlcIjogbnVsbEZ1bmNfdmlpaWksIFwiaW52b2tlX3ZpXCI6IGludm9rZV92aSwgXCJpbnZva2VfaWlpaVwiOiBpbnZva2VfaWlpaSwgXCJpbnZva2VfdmlpXCI6IGludm9rZV92aWksIFwiaW52b2tlX2lpaWlpXCI6IGludm9rZV9paWlpaSwgXCJpbnZva2VfdmlpaWlpaWlcIjogaW52b2tlX3ZpaWlpaWlpLCBcImludm9rZV92aWlpaWlcIjogaW52b2tlX3ZpaWlpaSwgXCJpbnZva2VfaWlpaWlpaWlpaVwiOiBpbnZva2VfaWlpaWlpaWlpaSwgXCJpbnZva2VfaWlpaWlpaWlpaWlcIjogaW52b2tlX2lpaWlpaWlpaWlpLCBcImludm9rZV92XCI6IGludm9rZV92LCBcImludm9rZV9paWlpaWlpXCI6IGludm9rZV9paWlpaWlpLCBcImludm9rZV9paVwiOiBpbnZva2VfaWksIFwiaW52b2tlX3ZpaWlcIjogaW52b2tlX3ZpaWksIFwiaW52b2tlX2ZmXCI6IGludm9rZV9mZiwgXCJpbnZva2VfaWlpaWlpaWlpaWlpXCI6IGludm9rZV9paWlpaWlpaWlpaWksIFwiaW52b2tlX2ZmZlwiOiBpbnZva2VfZmZmLCBcImludm9rZV92aWlpaWlpXCI6IGludm9rZV92aWlpaWlpLCBcImludm9rZV9paWlcIjogaW52b2tlX2lpaSwgXCJpbnZva2VfaWlpaWlpXCI6IGludm9rZV9paWlpaWksIFwiaW52b2tlX3ZpaWlpXCI6IGludm9rZV92aWlpaSwgXCJmbG9hdFJlYWRWYWx1ZUZyb21Qb2ludGVyXCI6IGZsb2F0UmVhZFZhbHVlRnJvbVBvaW50ZXIsIFwic2ltcGxlUmVhZFZhbHVlRnJvbVBvaW50ZXJcIjogc2ltcGxlUmVhZFZhbHVlRnJvbVBvaW50ZXIsIFwiX19fc3lzY2FsbDU0XCI6IF9fX3N5c2NhbGw1NCwgXCJfX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlld1wiOiBfX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldywgXCJ0aHJvd0ludGVybmFsRXJyb3JcIjogdGhyb3dJbnRlcm5hbEVycm9yLCBcImdldF9maXJzdF9lbXZhbFwiOiBnZXRfZmlyc3RfZW12YWwsIFwiX19fZ3h4X3BlcnNvbmFsaXR5X3YwXCI6IF9fX2d4eF9wZXJzb25hbGl0eV92MCwgXCJleHRlbmRFcnJvclwiOiBleHRlbmRFcnJvciwgXCJfX19hc3NlcnRfZmFpbFwiOiBfX19hc3NlcnRfZmFpbCwgXCJfX19jeGFfZnJlZV9leGNlcHRpb25cIjogX19fY3hhX2ZyZWVfZXhjZXB0aW9uLCBcIl9fX2N4YV9maW5kX21hdGNoaW5nX2NhdGNoXzJcIjogX19fY3hhX2ZpbmRfbWF0Y2hpbmdfY2F0Y2hfMiwgXCJfX19jeGFfZmluZF9tYXRjaGluZ19jYXRjaFwiOiBfX19jeGFfZmluZF9tYXRjaGluZ19jYXRjaCwgXCJfX19idWlsZEVudmlyb25tZW50XCI6IF9fX2J1aWxkRW52aXJvbm1lbnQsIFwiX2xvbmdqbXBcIjogX2xvbmdqbXAsIFwiZ2V0U2hpZnRGcm9tU2l6ZVwiOiBnZXRTaGlmdEZyb21TaXplLCBcIl9fZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uXCI6IF9fZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLCBcImVtYmluZF9pbml0X2NoYXJDb2Rlc1wiOiBlbWJpbmRfaW5pdF9jaGFyQ29kZXMsIFwicmVxdWlyZUZ1bmN0aW9uXCI6IHJlcXVpcmVGdW5jdGlvbiwgXCJfX19zZXRFcnJOb1wiOiBfX19zZXRFcnJObywgXCJfX2VtdmFsX3JlZ2lzdGVyXCI6IF9fZW12YWxfcmVnaXN0ZXIsIFwiX2xsdm1fcG93X2YzMlwiOiBfbGx2bV9wb3dfZjMyLCBcIl9fZW1iaW5kX3JlZ2lzdGVyX3ZvaWRcIjogX19lbWJpbmRfcmVnaXN0ZXJfdm9pZCwgXCJfZW1zY3JpcHRlbl9tZW1jcHlfYmlnXCI6IF9lbXNjcmlwdGVuX21lbWNweV9iaWcsIFwiX19lbWJpbmRfcmVnaXN0ZXJfYm9vbFwiOiBfX2VtYmluZF9yZWdpc3Rlcl9ib29sLCBcIl9fX3Jlc3VtZUV4Y2VwdGlvblwiOiBfX19yZXN1bWVFeGNlcHRpb24sIFwiX19aU3QxOHVuY2F1Z2h0X2V4Y2VwdGlvbnZcIjogX19aU3QxOHVuY2F1Z2h0X2V4Y2VwdGlvbnYsIFwiX19leGl0XCI6IF9fZXhpdCwgXCJnZXRUeXBlTmFtZVwiOiBnZXRUeXBlTmFtZSwgXCJfX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZ1wiOiBfX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZywgXCJjcmVhdGVOYW1lZEZ1bmN0aW9uXCI6IGNyZWF0ZU5hbWVkRnVuY3Rpb24sIFwiX19lbWJpbmRfcmVnaXN0ZXJfZW12YWxcIjogX19lbWJpbmRfcmVnaXN0ZXJfZW12YWwsIFwicmVhZExhdGluMVN0cmluZ1wiOiByZWFkTGF0aW4xU3RyaW5nLCBcInRocm93VW5ib3VuZFR5cGVFcnJvclwiOiB0aHJvd1VuYm91bmRUeXBlRXJyb3IsIFwiY3JhZnRJbnZva2VyRnVuY3Rpb25cIjogY3JhZnRJbnZva2VyRnVuY3Rpb24sIFwiX19lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlclwiOiBfX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLCBcIl9fZW12YWxfZGVjcmVmXCI6IF9fZW12YWxfZGVjcmVmLCBcIl9nZXRlbnZcIjogX2dldGVudiwgXCJfX2VtYmluZF9yZWdpc3Rlcl9mbG9hdFwiOiBfX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCwgXCJtYWtlTGVnYWxGdW5jdGlvbk5hbWVcIjogbWFrZUxlZ2FsRnVuY3Rpb25OYW1lLCBcImludGVnZXJSZWFkVmFsdWVGcm9tUG9pbnRlclwiOiBpbnRlZ2VyUmVhZFZhbHVlRnJvbVBvaW50ZXIsIFwiX19fdW5sb2NrXCI6IF9fX3VubG9jaywgXCJoZWFwMzJWZWN0b3JUb0FycmF5XCI6IGhlYXAzMlZlY3RvclRvQXJyYXksIFwiaW5pdF9lbXZhbFwiOiBpbml0X2VtdmFsLCBcIndoZW5EZXBlbmRlbnRUeXBlc0FyZVJlc29sdmVkXCI6IHdoZW5EZXBlbmRlbnRUeXBlc0FyZVJlc29sdmVkLCBcIm5ld19cIjogbmV3XywgXCJyZWdpc3RlclR5cGVcIjogcmVnaXN0ZXJUeXBlLCBcIl9fX2N4YV90aHJvd1wiOiBfX19jeGFfdGhyb3csIFwiX19fbG9ja1wiOiBfX19sb2NrLCBcIl9fX3N5c2NhbGw2XCI6IF9fX3N5c2NhbGw2LCBcInRocm93QmluZGluZ0Vycm9yXCI6IHRocm93QmluZGluZ0Vycm9yLCBcImVuc3VyZU92ZXJsb2FkVGFibGVcIjogZW5zdXJlT3ZlcmxvYWRUYWJsZSwgXCJjb3VudF9lbXZhbF9oYW5kbGVzXCI6IGNvdW50X2VtdmFsX2hhbmRsZXMsIFwiX19fY3hhX2FsbG9jYXRlX2V4Y2VwdGlvblwiOiBfX19jeGFfYWxsb2NhdGVfZXhjZXB0aW9uLCBcInJ1bkRlc3RydWN0b3JzXCI6IHJ1bkRlc3RydWN0b3JzLCBcIl9lbWJpbmRfcmVwclwiOiBfZW1iaW5kX3JlcHIsIFwiX19fc3lzY2FsbDE0MFwiOiBfX19zeXNjYWxsMTQwLCBcImV4cG9zZVB1YmxpY1N5bWJvbFwiOiBleHBvc2VQdWJsaWNTeW1ib2wsIFwiX2V4aXRcIjogX2V4aXQsIFwiX19lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ1wiOiBfX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLCBcInJlcGxhY2VQdWJsaWNTeW1ib2xcIjogcmVwbGFjZVB1YmxpY1N5bWJvbCwgXCJfX19zeXNjYWxsMTQ2XCI6IF9fX3N5c2NhbGwxNDYsIFwiRFlOQU1JQ1RPUF9QVFJcIjogRFlOQU1JQ1RPUF9QVFIsIFwidGVtcERvdWJsZVB0clwiOiB0ZW1wRG91YmxlUHRyLCBcIkFCT1JUXCI6IEFCT1JULCBcIlNUQUNLVE9QXCI6IFNUQUNLVE9QLCBcIlNUQUNLX01BWFwiOiBTVEFDS19NQVggfTtcbi8vIEVNU0NSSVBURU5fU1RBUlRfQVNNXG52YXIgYXNtID1Nb2R1bGVbXCJhc21cIl0vLyBFTVNDUklQVEVOX0VORF9BU01cbihNb2R1bGUuYXNtR2xvYmFsQXJnLCBNb2R1bGUuYXNtTGlicmFyeUFyZywgYnVmZmVyKTtcblxudmFyIHJlYWxfc3RhY2tTYXZlID0gYXNtW1wic3RhY2tTYXZlXCJdOyBhc21bXCJzdGFja1NhdmVcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX3N0YWNrU2F2ZS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfc2V0VGhyZXcgPSBhc21bXCJzZXRUaHJld1wiXTsgYXNtW1wic2V0VGhyZXdcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX3NldFRocmV3LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9fZmZsdXNoID0gYXNtW1wiX2ZmbHVzaFwiXTsgYXNtW1wiX2ZmbHVzaFwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfX2ZmbHVzaC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX2VuY29kZV9qcGVnID0gYXNtW1wiX2VuY29kZV9qcGVnXCJdOyBhc21bXCJfZW5jb2RlX2pwZWdcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19lbmNvZGVfanBlZy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX19fY3hhX2lzX3BvaW50ZXJfdHlwZSA9IGFzbVtcIl9fX2N4YV9pc19wb2ludGVyX3R5cGVcIl07IGFzbVtcIl9fX2N4YV9pc19wb2ludGVyX3R5cGVcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19fX2N4YV9pc19wb2ludGVyX3R5cGUuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5cbnZhciByZWFsX19zYnJrID0gYXNtW1wiX3NicmtcIl07IGFzbVtcIl9zYnJrXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gcmVhbF9fc2Jyay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX2xsdm1fYnN3YXBfaTMyID0gYXNtW1wiX2xsdm1fYnN3YXBfaTMyXCJdOyBhc21bXCJfbGx2bV9ic3dhcF9pMzJcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19sbHZtX2Jzd2FwX2kzMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX2RlY29kZV9qcGVnID0gYXNtW1wiX2RlY29kZV9qcGVnXCJdOyBhc21bXCJfZGVjb2RlX2pwZWdcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19kZWNvZGVfanBlZy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfc3RhY2tBbGxvYyA9IGFzbVtcInN0YWNrQWxsb2NcIl07IGFzbVtcInN0YWNrQWxsb2NcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX3N0YWNrQWxsb2MuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5cbnZhciByZWFsX19fR0xPQkFMX19zdWJfSV9hcGlfY3BwID0gYXNtW1wiX19HTE9CQUxfX3N1Yl9JX2FwaV9jcHBcIl07IGFzbVtcIl9fR0xPQkFMX19zdWJfSV9hcGlfY3BwXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gcmVhbF9fX0dMT0JBTF9fc3ViX0lfYXBpX2NwcC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfZ2V0VGVtcFJldDAgPSBhc21bXCJnZXRUZW1wUmV0MFwiXTsgYXNtW1wiZ2V0VGVtcFJldDBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX2dldFRlbXBSZXQwLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9fX0dMT0JBTF9fc3ViX0lfYmluZF9jcHAgPSBhc21bXCJfX0dMT0JBTF9fc3ViX0lfYmluZF9jcHBcIl07IGFzbVtcIl9fR0xPQkFMX19zdWJfSV9iaW5kX2NwcFwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfX19HTE9CQUxfX3N1Yl9JX2JpbmRfY3BwLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9zZXRUZW1wUmV0MCA9IGFzbVtcInNldFRlbXBSZXQwXCJdOyBhc21bXCJzZXRUZW1wUmV0MFwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfc2V0VGVtcFJldDAuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5cbnZhciByZWFsX19yZWFsbG9jID0gYXNtW1wiX3JlYWxsb2NcIl07IGFzbVtcIl9yZWFsbG9jXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gcmVhbF9fcmVhbGxvYy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX3NhdmVTZXRqbXAgPSBhc21bXCJfc2F2ZVNldGptcFwiXTsgYXNtW1wiX3NhdmVTZXRqbXBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19zYXZlU2V0am1wLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9fZW1zY3JpcHRlbl9nZXRfZ2xvYmFsX2xpYmMgPSBhc21bXCJfZW1zY3JpcHRlbl9nZXRfZ2xvYmFsX2xpYmNcIl07IGFzbVtcIl9lbXNjcmlwdGVuX2dldF9nbG9iYWxfbGliY1wiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfX2Vtc2NyaXB0ZW5fZ2V0X2dsb2JhbF9saWJjLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9fX19nZXRUeXBlTmFtZSA9IGFzbVtcIl9fX2dldFR5cGVOYW1lXCJdOyBhc21bXCJfX19nZXRUeXBlTmFtZVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfX19fZ2V0VHlwZU5hbWUuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5cbnZhciByZWFsX19fX2Vycm5vX2xvY2F0aW9uID0gYXNtW1wiX19fZXJybm9fbG9jYXRpb25cIl07IGFzbVtcIl9fX2Vycm5vX2xvY2F0aW9uXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gcmVhbF9fX19lcnJub19sb2NhdGlvbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX3Rlc3RTZXRqbXAgPSBhc21bXCJfdGVzdFNldGptcFwiXTsgYXNtW1wiX3Rlc3RTZXRqbXBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX190ZXN0U2V0am1wLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9fX19jeGFfY2FuX2NhdGNoID0gYXNtW1wiX19fY3hhX2Nhbl9jYXRjaFwiXTsgYXNtW1wiX19fY3hhX2Nhbl9jYXRjaFwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfX19fY3hhX2Nhbl9jYXRjaC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX2ZyZWUgPSBhc21bXCJfZnJlZVwiXTsgYXNtW1wiX2ZyZWVcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19mcmVlLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgcmVhbF9lc3RhYmxpc2hTdGFja1NwYWNlID0gYXNtW1wiZXN0YWJsaXNoU3RhY2tTcGFjZVwiXTsgYXNtW1wiZXN0YWJsaXNoU3RhY2tTcGFjZVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIHJlYWxfZXN0YWJsaXNoU3RhY2tTcGFjZS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfc3RhY2tSZXN0b3JlID0gYXNtW1wic3RhY2tSZXN0b3JlXCJdOyBhc21bXCJzdGFja1Jlc3RvcmVcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX3N0YWNrUmVzdG9yZS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcblxudmFyIHJlYWxfX21hbGxvYyA9IGFzbVtcIl9tYWxsb2NcIl07IGFzbVtcIl9tYWxsb2NcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiByZWFsX19tYWxsb2MuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5Nb2R1bGVbXCJhc21cIl0gPSBhc207XG52YXIgc3RhY2tTYXZlID0gTW9kdWxlW1wic3RhY2tTYXZlXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wic3RhY2tTYXZlXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBzZXRUaHJldyA9IE1vZHVsZVtcInNldFRocmV3XCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wic2V0VGhyZXdcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9mZmx1c2ggPSBNb2R1bGVbXCJfZmZsdXNoXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX2ZmbHVzaFwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX2VuY29kZV9qcGVnID0gTW9kdWxlW1wiX2VuY29kZV9qcGVnXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX2VuY29kZV9qcGVnXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfX19jeGFfaXNfcG9pbnRlcl90eXBlID0gTW9kdWxlW1wiX19fY3hhX2lzX3BvaW50ZXJfdHlwZVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9fX2N4YV9pc19wb2ludGVyX3R5cGVcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9tZW1zZXQgPSBNb2R1bGVbXCJfbWVtc2V0XCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX21lbXNldFwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX3NicmsgPSBNb2R1bGVbXCJfc2Jya1wiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9zYnJrXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfbWVtY3B5ID0gTW9kdWxlW1wiX21lbWNweVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9tZW1jcHlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9sbHZtX2Jzd2FwX2kzMiA9IE1vZHVsZVtcIl9sbHZtX2Jzd2FwX2kzMlwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9sbHZtX2Jzd2FwX2kzMlwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX2RlY29kZV9qcGVnID0gTW9kdWxlW1wiX2RlY29kZV9qcGVnXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX2RlY29kZV9qcGVnXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBzdGFja0FsbG9jID0gTW9kdWxlW1wic3RhY2tBbGxvY1wiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcInN0YWNrQWxsb2NcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9fR0xPQkFMX19zdWJfSV9hcGlfY3BwID0gTW9kdWxlW1wiX19HTE9CQUxfX3N1Yl9JX2FwaV9jcHBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJfX0dMT0JBTF9fc3ViX0lfYXBpX2NwcFwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZ2V0VGVtcFJldDAgPSBNb2R1bGVbXCJnZXRUZW1wUmV0MFwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImdldFRlbXBSZXQwXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfX0dMT0JBTF9fc3ViX0lfYmluZF9jcHAgPSBNb2R1bGVbXCJfX0dMT0JBTF9fc3ViX0lfYmluZF9jcHBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJfX0dMT0JBTF9fc3ViX0lfYmluZF9jcHBcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIHNldFRlbXBSZXQwID0gTW9kdWxlW1wic2V0VGVtcFJldDBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJzZXRUZW1wUmV0MFwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX3JlYWxsb2MgPSBNb2R1bGVbXCJfcmVhbGxvY1wiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9yZWFsbG9jXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfc2F2ZVNldGptcCA9IE1vZHVsZVtcIl9zYXZlU2V0am1wXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX3NhdmVTZXRqbXBcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9lbXNjcmlwdGVuX2dldF9nbG9iYWxfbGliYyA9IE1vZHVsZVtcIl9lbXNjcmlwdGVuX2dldF9nbG9iYWxfbGliY1wiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9lbXNjcmlwdGVuX2dldF9nbG9iYWxfbGliY1wiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX19fZ2V0VHlwZU5hbWUgPSBNb2R1bGVbXCJfX19nZXRUeXBlTmFtZVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9fX2dldFR5cGVOYW1lXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfX19lcnJub19sb2NhdGlvbiA9IE1vZHVsZVtcIl9fX2Vycm5vX2xvY2F0aW9uXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX19fZXJybm9fbG9jYXRpb25cIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF90ZXN0U2V0am1wID0gTW9kdWxlW1wiX3Rlc3RTZXRqbXBcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJfdGVzdFNldGptcFwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX19fY3hhX2Nhbl9jYXRjaCA9IE1vZHVsZVtcIl9fX2N4YV9jYW5fY2F0Y2hcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJfX19jeGFfY2FuX2NhdGNoXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBfZnJlZSA9IE1vZHVsZVtcIl9mcmVlXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX2ZyZWVcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIHJ1blBvc3RTZXRzID0gTW9kdWxlW1wicnVuUG9zdFNldHNcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJydW5Qb3N0U2V0c1wiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZXN0YWJsaXNoU3RhY2tTcGFjZSA9IE1vZHVsZVtcImVzdGFibGlzaFN0YWNrU3BhY2VcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJlc3RhYmxpc2hTdGFja1NwYWNlXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBzdGFja1Jlc3RvcmUgPSBNb2R1bGVbXCJzdGFja1Jlc3RvcmVcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJzdGFja1Jlc3RvcmVcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIF9tYWxsb2MgPSBNb2R1bGVbXCJfbWFsbG9jXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiX21hbGxvY1wiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgX2Vtc2NyaXB0ZW5fcmVwbGFjZV9tZW1vcnkgPSBNb2R1bGVbXCJfZW1zY3JpcHRlbl9yZXBsYWNlX21lbW9yeVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcIl9lbXNjcmlwdGVuX3JlcGxhY2VfbWVtb3J5XCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX3ZpID0gTW9kdWxlW1wiZHluQ2FsbF92aVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfdmlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfaWlpaSA9IE1vZHVsZVtcImR5bkNhbGxfaWlpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfaWlpaVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF92aWkgPSBNb2R1bGVbXCJkeW5DYWxsX3ZpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfdmlpXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX2lpaWlpID0gTW9kdWxlW1wiZHluQ2FsbF9paWlpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfaWlpaWlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfdmlpaWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX3ZpaWlpaWlpXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiZHluQ2FsbF92aWlpaWlpaVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF92aWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX3ZpaWlpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfdmlpaWlpXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX2lpaWlpaWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaWlpaWlcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJkeW5DYWxsX2lpaWlpaWlpaWlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfaWlpaWlpaWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaWlpaWlpXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiZHluQ2FsbF9paWlpaWlpaWlpaVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF92ID0gTW9kdWxlW1wiZHluQ2FsbF92XCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiZHluQ2FsbF92XCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX2lpaWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaWlcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJkeW5DYWxsX2lpaWlpaWlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfaWkgPSBNb2R1bGVbXCJkeW5DYWxsX2lpXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiZHluQ2FsbF9paVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF92aWlpID0gTW9kdWxlW1wiZHluQ2FsbF92aWlpXCJdID0gZnVuY3Rpb24oKSB7XG4gIGFzc2VydChydW50aW1lSW5pdGlhbGl6ZWQsICd5b3UgbmVlZCB0byB3YWl0IGZvciB0aGUgcnVudGltZSB0byBiZSByZWFkeSAoZS5nLiB3YWl0IGZvciBtYWluKCkgdG8gYmUgY2FsbGVkKScpO1xuICBhc3NlcnQoIXJ1bnRpbWVFeGl0ZWQsICd0aGUgcnVudGltZSB3YXMgZXhpdGVkICh1c2UgTk9fRVhJVF9SVU5USU1FIHRvIGtlZXAgaXQgYWxpdmUgYWZ0ZXIgbWFpbigpIGV4aXRzKScpO1xuICByZXR1cm4gTW9kdWxlW1wiYXNtXCJdW1wiZHluQ2FsbF92aWlpXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX2ZmID0gTW9kdWxlW1wiZHluQ2FsbF9mZlwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfZmZcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfaWlpaWlpaWlpaWlpID0gTW9kdWxlW1wiZHluQ2FsbF9paWlpaWlpaWlpaWlcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJkeW5DYWxsX2lpaWlpaWlpaWlpaVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF9mZmYgPSBNb2R1bGVbXCJkeW5DYWxsX2ZmZlwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfZmZmXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX3ZpaWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX3ZpaWlpaWlcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJkeW5DYWxsX3ZpaWlpaWlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xudmFyIGR5bkNhbGxfaWlpID0gTW9kdWxlW1wiZHluQ2FsbF9paWlcIl0gPSBmdW5jdGlvbigpIHtcbiAgYXNzZXJ0KHJ1bnRpbWVJbml0aWFsaXplZCwgJ3lvdSBuZWVkIHRvIHdhaXQgZm9yIHRoZSBydW50aW1lIHRvIGJlIHJlYWR5IChlLmcuIHdhaXQgZm9yIG1haW4oKSB0byBiZSBjYWxsZWQpJyk7XG4gIGFzc2VydCghcnVudGltZUV4aXRlZCwgJ3RoZSBydW50aW1lIHdhcyBleGl0ZWQgKHVzZSBOT19FWElUX1JVTlRJTUUgdG8ga2VlcCBpdCBhbGl2ZSBhZnRlciBtYWluKCkgZXhpdHMpJyk7XG4gIHJldHVybiBNb2R1bGVbXCJhc21cIl1bXCJkeW5DYWxsX2lpaVwiXS5hcHBseShudWxsLCBhcmd1bWVudHMpIH07XG52YXIgZHluQ2FsbF9paWlpaWkgPSBNb2R1bGVbXCJkeW5DYWxsX2lpaWlpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfaWlpaWlpXCJdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykgfTtcbnZhciBkeW5DYWxsX3ZpaWlpID0gTW9kdWxlW1wiZHluQ2FsbF92aWlpaVwiXSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQocnVudGltZUluaXRpYWxpemVkLCAneW91IG5lZWQgdG8gd2FpdCBmb3IgdGhlIHJ1bnRpbWUgdG8gYmUgcmVhZHkgKGUuZy4gd2FpdCBmb3IgbWFpbigpIHRvIGJlIGNhbGxlZCknKTtcbiAgYXNzZXJ0KCFydW50aW1lRXhpdGVkLCAndGhlIHJ1bnRpbWUgd2FzIGV4aXRlZCAodXNlIE5PX0VYSVRfUlVOVElNRSB0byBrZWVwIGl0IGFsaXZlIGFmdGVyIG1haW4oKSBleGl0cyknKTtcbiAgcmV0dXJuIE1vZHVsZVtcImFzbVwiXVtcImR5bkNhbGxfdmlpaWlcIl0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSB9O1xuO1xuUnVudGltZS5zdGFja0FsbG9jID0gTW9kdWxlWydzdGFja0FsbG9jJ107XG5SdW50aW1lLnN0YWNrU2F2ZSA9IE1vZHVsZVsnc3RhY2tTYXZlJ107XG5SdW50aW1lLnN0YWNrUmVzdG9yZSA9IE1vZHVsZVsnc3RhY2tSZXN0b3JlJ107XG5SdW50aW1lLmVzdGFibGlzaFN0YWNrU3BhY2UgPSBNb2R1bGVbJ2VzdGFibGlzaFN0YWNrU3BhY2UnXTtcblJ1bnRpbWUuc2V0VGVtcFJldDAgPSBNb2R1bGVbJ3NldFRlbXBSZXQwJ107XG5SdW50aW1lLmdldFRlbXBSZXQwID0gTW9kdWxlWydnZXRUZW1wUmV0MCddO1xuXG5cbi8vID09PSBBdXRvLWdlbmVyYXRlZCBwb3N0YW1ibGUgc2V0dXAgZW50cnkgc3R1ZmYgPT09XG5cbk1vZHVsZVsnYXNtJ10gPSBhc207XG5cblxuXG5pZiAobWVtb3J5SW5pdGlhbGl6ZXIpIHtcbiAgaWYgKHR5cGVvZiBNb2R1bGVbJ2xvY2F0ZUZpbGUnXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG1lbW9yeUluaXRpYWxpemVyID0gTW9kdWxlWydsb2NhdGVGaWxlJ10obWVtb3J5SW5pdGlhbGl6ZXIpO1xuICB9IGVsc2UgaWYgKE1vZHVsZVsnbWVtb3J5SW5pdGlhbGl6ZXJQcmVmaXhVUkwnXSkge1xuICAgIG1lbW9yeUluaXRpYWxpemVyID0gTW9kdWxlWydtZW1vcnlJbml0aWFsaXplclByZWZpeFVSTCddICsgbWVtb3J5SW5pdGlhbGl6ZXI7XG4gIH1cbiAgaWYgKEVOVklST05NRU5UX0lTX05PREUgfHwgRU5WSVJPTk1FTlRfSVNfU0hFTEwpIHtcbiAgICB2YXIgZGF0YSA9IE1vZHVsZVsncmVhZEJpbmFyeSddKG1lbW9yeUluaXRpYWxpemVyKTtcbiAgICBIRUFQVTguc2V0KGRhdGEsIFJ1bnRpbWUuR0xPQkFMX0JBU0UpO1xuICB9IGVsc2Uge1xuICAgIGFkZFJ1bkRlcGVuZGVuY3koJ21lbW9yeSBpbml0aWFsaXplcicpO1xuICAgIHZhciBhcHBseU1lbW9yeUluaXRpYWxpemVyID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCkgZGF0YSA9IG5ldyBVaW50OEFycmF5KGRhdGEpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFzc2VydChIRUFQVThbUnVudGltZS5HTE9CQUxfQkFTRSArIGldID09PSAwLCBcImFyZWEgZm9yIG1lbW9yeSBpbml0aWFsaXplciBzaG91bGQgbm90IGhhdmUgYmVlbiB0b3VjaGVkIGJlZm9yZSBpdCdzIGxvYWRlZFwiKTtcbiAgICAgIH1cbiAgICAgIEhFQVBVOC5zZXQoZGF0YSwgUnVudGltZS5HTE9CQUxfQkFTRSk7XG4gICAgICAvLyBEZWxldGUgdGhlIHR5cGVkIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIGxhcmdlIGJsb2Igb2YgdGhlIG1lbW9yeSBpbml0aWFsaXplciByZXF1ZXN0IHJlc3BvbnNlIHNvIHRoYXRcbiAgICAgIC8vIHdlIHdvbid0IGtlZXAgdW5uZWNlc3NhcnkgbWVtb3J5IGx5aW5nIGFyb3VuZC4gSG93ZXZlciwga2VlcCB0aGUgWEhSIG9iamVjdCBpdHNlbGYgYWxpdmUgc28gdGhhdCBlLmcuXG4gICAgICAvLyBpdHMgLnN0YXR1cyBmaWVsZCBjYW4gc3RpbGwgYmUgYWNjZXNzZWQgbGF0ZXIuXG4gICAgICBpZiAoTW9kdWxlWydtZW1vcnlJbml0aWFsaXplclJlcXVlc3QnXSkgZGVsZXRlIE1vZHVsZVsnbWVtb3J5SW5pdGlhbGl6ZXJSZXF1ZXN0J10ucmVzcG9uc2U7XG4gICAgICByZW1vdmVSdW5EZXBlbmRlbmN5KCdtZW1vcnkgaW5pdGlhbGl6ZXInKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9Ccm93c2VyTG9hZCgpIHtcbiAgICAgIE1vZHVsZVsncmVhZEFzeW5jJ10obWVtb3J5SW5pdGlhbGl6ZXIsIGFwcGx5TWVtb3J5SW5pdGlhbGl6ZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aHJvdyAnY291bGQgbm90IGxvYWQgbWVtb3J5IGluaXRpYWxpemVyICcgKyBtZW1vcnlJbml0aWFsaXplcjtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoTW9kdWxlWydtZW1vcnlJbml0aWFsaXplclJlcXVlc3QnXSkge1xuICAgICAgLy8gYSBuZXR3b3JrIHJlcXVlc3QgaGFzIGFscmVhZHkgYmVlbiBjcmVhdGVkLCBqdXN0IHVzZSB0aGF0XG4gICAgICBmdW5jdGlvbiB1c2VSZXF1ZXN0KCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IE1vZHVsZVsnbWVtb3J5SW5pdGlhbGl6ZXJSZXF1ZXN0J107XG4gICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyAhPT0gMjAwICYmIHJlcXVlc3Quc3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgLy8gSWYgeW91IHNlZSB0aGlzIHdhcm5pbmcsIHRoZSBpc3N1ZSBtYXkgYmUgdGhhdCB5b3UgYXJlIHVzaW5nIGxvY2F0ZUZpbGUgb3IgbWVtb3J5SW5pdGlhbGl6ZXJQcmVmaXhVUkwsIGFuZCBkZWZpbmluZyB0aGVtIGluIEpTLiBUaGF0XG4gICAgICAgICAgLy8gbWVhbnMgdGhhdCB0aGUgSFRNTCBmaWxlIGRvZXNuJ3Qga25vdyBhYm91dCB0aGVtLCBhbmQgd2hlbiBpdCB0cmllcyB0byBjcmVhdGUgdGhlIG1lbSBpbml0IHJlcXVlc3QgZWFybHksIGRvZXMgaXQgdG8gdGhlIHdyb25nIHBsYWNlLlxuICAgICAgICAgIC8vIExvb2sgaW4geW91ciBicm93c2VyJ3MgZGV2dG9vbHMgbmV0d29yayBjb25zb2xlIHRvIHNlZSB3aGF0J3MgZ29pbmcgb24uXG4gICAgICAgICAgY29uc29sZS53YXJuKCdhIHByb2JsZW0gc2VlbXMgdG8gaGF2ZSBoYXBwZW5lZCB3aXRoIE1vZHVsZS5tZW1vcnlJbml0aWFsaXplclJlcXVlc3QsIHN0YXR1czogJyArIHJlcXVlc3Quc3RhdHVzICsgJywgcmV0cnlpbmcgJyArIG1lbW9yeUluaXRpYWxpemVyKTtcbiAgICAgICAgICBkb0Jyb3dzZXJMb2FkKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGFwcGx5TWVtb3J5SW5pdGlhbGl6ZXIocmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICB9XG4gICAgICBpZiAoTW9kdWxlWydtZW1vcnlJbml0aWFsaXplclJlcXVlc3QnXS5yZXNwb25zZSkge1xuICAgICAgICBzZXRUaW1lb3V0KHVzZVJlcXVlc3QsIDApOyAvLyBpdCdzIGFscmVhZHkgaGVyZTsgYnV0LCBhcHBseSBpdCBhc3luY2hyb25vdXNseVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTW9kdWxlWydtZW1vcnlJbml0aWFsaXplclJlcXVlc3QnXS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgdXNlUmVxdWVzdCk7IC8vIHdhaXQgZm9yIGl0XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGZldGNoIGl0IGZyb20gdGhlIG5ldHdvcmsgb3Vyc2VsdmVzXG4gICAgICBkb0Jyb3dzZXJMb2FkKCk7XG4gICAgfVxuICB9XG59XG5cblxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge0Vycm9yfVxuICovXG5mdW5jdGlvbiBFeGl0U3RhdHVzKHN0YXR1cykge1xuICB0aGlzLm5hbWUgPSBcIkV4aXRTdGF0dXNcIjtcbiAgdGhpcy5tZXNzYWdlID0gXCJQcm9ncmFtIHRlcm1pbmF0ZWQgd2l0aCBleGl0KFwiICsgc3RhdHVzICsgXCIpXCI7XG4gIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xufTtcbkV4aXRTdGF0dXMucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5FeGl0U3RhdHVzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV4aXRTdGF0dXM7XG5cbnZhciBpbml0aWFsU3RhY2tUb3A7XG52YXIgcHJlbG9hZFN0YXJ0VGltZSA9IG51bGw7XG52YXIgY2FsbGVkTWFpbiA9IGZhbHNlO1xuXG5kZXBlbmRlbmNpZXNGdWxmaWxsZWQgPSBmdW5jdGlvbiBydW5DYWxsZXIoKSB7XG4gIC8vIElmIHJ1biBoYXMgbmV2ZXIgYmVlbiBjYWxsZWQsIGFuZCB3ZSBzaG91bGQgY2FsbCBydW4gKElOVk9LRV9SVU4gaXMgdHJ1ZSwgYW5kIE1vZHVsZS5ub0luaXRpYWxSdW4gaXMgbm90IGZhbHNlKVxuICBpZiAoIU1vZHVsZVsnY2FsbGVkUnVuJ10pIHJ1bigpO1xuICBpZiAoIU1vZHVsZVsnY2FsbGVkUnVuJ10pIGRlcGVuZGVuY2llc0Z1bGZpbGxlZCA9IHJ1bkNhbGxlcjsgLy8gdHJ5IHRoaXMgYWdhaW4gbGF0ZXIsIGFmdGVyIG5ldyBkZXBzIGFyZSBmdWxmaWxsZWRcbn1cblxuTW9kdWxlWydjYWxsTWFpbiddID0gTW9kdWxlLmNhbGxNYWluID0gZnVuY3Rpb24gY2FsbE1haW4oYXJncykge1xuICBhc3NlcnQocnVuRGVwZW5kZW5jaWVzID09IDAsICdjYW5ub3QgY2FsbCBtYWluIHdoZW4gYXN5bmMgZGVwZW5kZW5jaWVzIHJlbWFpbiEgKGxpc3RlbiBvbiBfX0FUTUFJTl9fKScpO1xuICBhc3NlcnQoX19BVFBSRVJVTl9fLmxlbmd0aCA9PSAwLCAnY2Fubm90IGNhbGwgbWFpbiB3aGVuIHByZVJ1biBmdW5jdGlvbnMgcmVtYWluIHRvIGJlIGNhbGxlZCcpO1xuXG4gIGFyZ3MgPSBhcmdzIHx8IFtdO1xuXG4gIGVuc3VyZUluaXRSdW50aW1lKCk7XG5cbiAgdmFyIGFyZ2MgPSBhcmdzLmxlbmd0aCsxO1xuICBmdW5jdGlvbiBwYWQoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA0LTE7IGkrKykge1xuICAgICAgYXJndi5wdXNoKDApO1xuICAgIH1cbiAgfVxuICB2YXIgYXJndiA9IFthbGxvY2F0ZShpbnRBcnJheUZyb21TdHJpbmcoTW9kdWxlWyd0aGlzUHJvZ3JhbSddKSwgJ2k4JywgQUxMT0NfTk9STUFMKSBdO1xuICBwYWQoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdjLTE7IGkgPSBpICsgMSkge1xuICAgIGFyZ3YucHVzaChhbGxvY2F0ZShpbnRBcnJheUZyb21TdHJpbmcoYXJnc1tpXSksICdpOCcsIEFMTE9DX05PUk1BTCkpO1xuICAgIHBhZCgpO1xuICB9XG4gIGFyZ3YucHVzaCgwKTtcbiAgYXJndiA9IGFsbG9jYXRlKGFyZ3YsICdpMzInLCBBTExPQ19OT1JNQUwpO1xuXG5cbiAgdHJ5IHtcblxuICAgIHZhciByZXQgPSBNb2R1bGVbJ19tYWluJ10oYXJnYywgYXJndiwgMCk7XG5cblxuICAgIC8vIGlmIHdlJ3JlIG5vdCBydW5uaW5nIGFuIGV2ZW50ZWQgbWFpbiBsb29wLCBpdCdzIHRpbWUgdG8gZXhpdFxuICAgIGV4aXQocmV0LCAvKiBpbXBsaWNpdCA9ICovIHRydWUpO1xuICB9XG4gIGNhdGNoKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEV4aXRTdGF0dXMpIHtcbiAgICAgIC8vIGV4aXQoKSB0aHJvd3MgdGhpcyBvbmNlIGl0J3MgZG9uZSB0byBtYWtlIHN1cmUgZXhlY3V0aW9uXG4gICAgICAvLyBoYXMgYmVlbiBzdG9wcGVkIGNvbXBsZXRlbHlcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGUgPT0gJ1NpbXVsYXRlSW5maW5pdGVMb29wJykge1xuICAgICAgLy8gcnVubmluZyBhbiBldmVudGVkIG1haW4gbG9vcCwgZG9uJ3QgaW1tZWRpYXRlbHkgZXhpdFxuICAgICAgTW9kdWxlWydub0V4aXRSdW50aW1lJ10gPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdG9Mb2cgPSBlO1xuICAgICAgaWYgKGUgJiYgdHlwZW9mIGUgPT09ICdvYmplY3QnICYmIGUuc3RhY2spIHtcbiAgICAgICAgdG9Mb2cgPSBbZSwgZS5zdGFja107XG4gICAgICB9XG4gICAgICBNb2R1bGUucHJpbnRFcnIoJ2V4Y2VwdGlvbiB0aHJvd246ICcgKyB0b0xvZyk7XG4gICAgICBNb2R1bGVbJ3F1aXQnXSgxLCBlKTtcbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgY2FsbGVkTWFpbiA9IHRydWU7XG4gIH1cbn1cblxuXG5cblxuLyoqIEB0eXBlIHtmdW5jdGlvbihBcnJheT0pfSAqL1xuZnVuY3Rpb24gcnVuKGFyZ3MpIHtcbiAgYXJncyA9IGFyZ3MgfHwgTW9kdWxlWydhcmd1bWVudHMnXTtcblxuICBpZiAocHJlbG9hZFN0YXJ0VGltZSA9PT0gbnVsbCkgcHJlbG9hZFN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgaWYgKHJ1bkRlcGVuZGVuY2llcyA+IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB3cml0ZVN0YWNrQ29va2llKCk7XG5cbiAgcHJlUnVuKCk7XG5cbiAgaWYgKHJ1bkRlcGVuZGVuY2llcyA+IDApIHJldHVybjsgLy8gYSBwcmVSdW4gYWRkZWQgYSBkZXBlbmRlbmN5LCBydW4gd2lsbCBiZSBjYWxsZWQgbGF0ZXJcbiAgaWYgKE1vZHVsZVsnY2FsbGVkUnVuJ10pIHJldHVybjsgLy8gcnVuIG1heSBoYXZlIGp1c3QgYmVlbiBjYWxsZWQgdGhyb3VnaCBkZXBlbmRlbmNpZXMgYmVpbmcgZnVsZmlsbGVkIGp1c3QgaW4gdGhpcyB2ZXJ5IGZyYW1lXG5cbiAgZnVuY3Rpb24gZG9SdW4oKSB7XG4gICAgaWYgKE1vZHVsZVsnY2FsbGVkUnVuJ10pIHJldHVybjsgLy8gcnVuIG1heSBoYXZlIGp1c3QgYmVlbiBjYWxsZWQgd2hpbGUgdGhlIGFzeW5jIHNldFN0YXR1cyB0aW1lIGJlbG93IHdhcyBoYXBwZW5pbmdcbiAgICBNb2R1bGVbJ2NhbGxlZFJ1biddID0gdHJ1ZTtcblxuICAgIGlmIChBQk9SVCkgcmV0dXJuO1xuXG4gICAgZW5zdXJlSW5pdFJ1bnRpbWUoKTtcblxuICAgIHByZU1haW4oKTtcblxuICAgIGlmIChFTlZJUk9OTUVOVF9JU19XRUIgJiYgcHJlbG9hZFN0YXJ0VGltZSAhPT0gbnVsbCkge1xuICAgICAgTW9kdWxlLnByaW50RXJyKCdwcmUtbWFpbiBwcmVwIHRpbWU6ICcgKyAoRGF0ZS5ub3coKSAtIHByZWxvYWRTdGFydFRpbWUpICsgJyBtcycpO1xuICAgIH1cblxuICAgIGlmIChNb2R1bGVbJ29uUnVudGltZUluaXRpYWxpemVkJ10pIE1vZHVsZVsnb25SdW50aW1lSW5pdGlhbGl6ZWQnXSgpO1xuXG4gICAgaWYgKE1vZHVsZVsnX21haW4nXSAmJiBzaG91bGRSdW5Ob3cpIE1vZHVsZVsnY2FsbE1haW4nXShhcmdzKTtcblxuICAgIHBvc3RSdW4oKTtcbiAgfVxuXG4gIGlmIChNb2R1bGVbJ3NldFN0YXR1cyddKSB7XG4gICAgTW9kdWxlWydzZXRTdGF0dXMnXSgnUnVubmluZy4uLicpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBNb2R1bGVbJ3NldFN0YXR1cyddKCcnKTtcbiAgICAgIH0sIDEpO1xuICAgICAgZG9SdW4oKTtcbiAgICB9LCAxKTtcbiAgfSBlbHNlIHtcbiAgICBkb1J1bigpO1xuICB9XG4gIGNoZWNrU3RhY2tDb29raWUoKTtcbn1cbk1vZHVsZVsncnVuJ10gPSBNb2R1bGUucnVuID0gcnVuO1xuXG5mdW5jdGlvbiBleGl0KHN0YXR1cywgaW1wbGljaXQpIHtcbiAgaWYgKGltcGxpY2l0ICYmIE1vZHVsZVsnbm9FeGl0UnVudGltZSddKSB7XG4gICAgTW9kdWxlLnByaW50RXJyKCdleGl0KCcgKyBzdGF0dXMgKyAnKSBpbXBsaWNpdGx5IGNhbGxlZCBieSBlbmQgb2YgbWFpbigpLCBidXQgbm9FeGl0UnVudGltZSwgc28gbm90IGV4aXRpbmcgdGhlIHJ1bnRpbWUgKHlvdSBjYW4gdXNlIGVtc2NyaXB0ZW5fZm9yY2VfZXhpdCwgaWYgeW91IHdhbnQgdG8gZm9yY2UgYSB0cnVlIHNodXRkb3duKScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChNb2R1bGVbJ25vRXhpdFJ1bnRpbWUnXSkge1xuICAgIE1vZHVsZS5wcmludEVycignZXhpdCgnICsgc3RhdHVzICsgJykgY2FsbGVkLCBidXQgbm9FeGl0UnVudGltZSwgc28gaGFsdGluZyBleGVjdXRpb24gYnV0IG5vdCBleGl0aW5nIHRoZSBydW50aW1lIG9yIHByZXZlbnRpbmcgZnVydGhlciBhc3luYyBleGVjdXRpb24gKHlvdSBjYW4gdXNlIGVtc2NyaXB0ZW5fZm9yY2VfZXhpdCwgaWYgeW91IHdhbnQgdG8gZm9yY2UgYSB0cnVlIHNodXRkb3duKScpO1xuICB9IGVsc2Uge1xuXG4gICAgQUJPUlQgPSB0cnVlO1xuICAgIEVYSVRTVEFUVVMgPSBzdGF0dXM7XG4gICAgU1RBQ0tUT1AgPSBpbml0aWFsU3RhY2tUb3A7XG5cbiAgICBleGl0UnVudGltZSgpO1xuXG4gICAgaWYgKE1vZHVsZVsnb25FeGl0J10pIE1vZHVsZVsnb25FeGl0J10oc3RhdHVzKTtcbiAgfVxuXG4gIGlmIChFTlZJUk9OTUVOVF9JU19OT0RFKSB7XG4gICAgcHJvY2Vzc1snZXhpdCddKHN0YXR1cyk7XG4gIH1cbiAgTW9kdWxlWydxdWl0J10oc3RhdHVzLCBuZXcgRXhpdFN0YXR1cyhzdGF0dXMpKTtcbn1cbk1vZHVsZVsnZXhpdCddID0gTW9kdWxlLmV4aXQgPSBleGl0O1xuXG52YXIgYWJvcnREZWNvcmF0b3JzID0gW107XG5cbmZ1bmN0aW9uIGFib3J0KHdoYXQpIHtcbiAgaWYgKE1vZHVsZVsnb25BYm9ydCddKSB7XG4gICAgTW9kdWxlWydvbkFib3J0J10od2hhdCk7XG4gIH1cblxuICBpZiAod2hhdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgTW9kdWxlLnByaW50KHdoYXQpO1xuICAgIE1vZHVsZS5wcmludEVycih3aGF0KTtcbiAgICB3aGF0ID0gSlNPTi5zdHJpbmdpZnkod2hhdClcbiAgfSBlbHNlIHtcbiAgICB3aGF0ID0gJyc7XG4gIH1cblxuICBBQk9SVCA9IHRydWU7XG4gIEVYSVRTVEFUVVMgPSAxO1xuXG4gIHZhciBleHRyYSA9ICcnO1xuXG4gIHZhciBvdXRwdXQgPSAnYWJvcnQoJyArIHdoYXQgKyAnKSBhdCAnICsgc3RhY2tUcmFjZSgpICsgZXh0cmE7XG4gIGlmIChhYm9ydERlY29yYXRvcnMpIHtcbiAgICBhYm9ydERlY29yYXRvcnMuZm9yRWFjaChmdW5jdGlvbihkZWNvcmF0b3IpIHtcbiAgICAgIG91dHB1dCA9IGRlY29yYXRvcihvdXRwdXQsIHdoYXQpO1xuICAgIH0pO1xuICB9XG4gIHRocm93IG91dHB1dDtcbn1cbk1vZHVsZVsnYWJvcnQnXSA9IE1vZHVsZS5hYm9ydCA9IGFib3J0O1xuXG4vLyB7e1BSRV9SVU5fQURESVRJT05TfX1cblxuaWYgKE1vZHVsZVsncHJlSW5pdCddKSB7XG4gIGlmICh0eXBlb2YgTW9kdWxlWydwcmVJbml0J10gPT0gJ2Z1bmN0aW9uJykgTW9kdWxlWydwcmVJbml0J10gPSBbTW9kdWxlWydwcmVJbml0J11dO1xuICB3aGlsZSAoTW9kdWxlWydwcmVJbml0J10ubGVuZ3RoID4gMCkge1xuICAgIE1vZHVsZVsncHJlSW5pdCddLnBvcCgpKCk7XG4gIH1cbn1cblxuLy8gc2hvdWxkUnVuTm93IHJlZmVycyB0byBjYWxsaW5nIG1haW4oKSwgbm90IHJ1bigpLlxudmFyIHNob3VsZFJ1bk5vdyA9IHRydWU7XG5pZiAoTW9kdWxlWydub0luaXRpYWxSdW4nXSkge1xuICBzaG91bGRSdW5Ob3cgPSBmYWxzZTtcbn1cblxuXG5ydW4oKTtcblxuLy8ge3tQT1NUX1JVTl9BRERJVElPTlN9fVxuXG5cblxuXG5cbi8vIHt7TU9EVUxFX0FERElUSU9OU319XG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNb2R1bGUgPSByZXF1aXJlKCcuLi9idWlsZC9saWJqcGVnYXNtJyk7XG52YXIgUnVudGltZSA9IE1vZHVsZVsnUnVudGltZSddO1xuXG5tb2R1bGUuZXhwb3J0cy5lbmNvZGUgPSBlbmNvZGVKcGVnO1xubW9kdWxlLmV4cG9ydHMuZGVjb2RlID0gZGVjb2RlSnBlZztcbm1vZHVsZS5leHBvcnRzLnJlc2l6ZSA9IHJlc2l6ZTtcblxuLyogc2VlICdhcGkuaCcgZm9yIGRlY2xhcmF0aW9ucyAqL1xudmFyIGVuY29kZV9qcGVnID0gTW9kdWxlLmN3cmFwKCdlbmNvZGVfanBlZycsICdudW1iZXInLCBbJ251bWJlcicsICdudW1iZXInLCAnbnVtYmVyJywgJ251bWJlcicsICdudW1iZXInLCAnbnVtYmVyJywgJ251bWJlciddKTtcbnZhciBkZWNvZGVfanBlZyA9IE1vZHVsZS5jd3JhcCgnZGVjb2RlX2pwZWcnLCAnbnVtYmVyJywgWydudW1iZXInLCAnbnVtYmVyJywgJ251bWJlcicsICdudW1iZXInLCAnbnVtYmVyJywgJ251bWJlciddKTtcblxudmFyIFNJWkVfT0ZfUE9JTlRFUiA9IDQ7XG5cblxuLyoqXG4gKiBFbmNvZGVzIFJHQiBkYXRhIGFzIEpQRUcuXG4gKlxuICogQHBhcmFtIHJnYkFycmF5IEFycmF5QnVmZmVyIC0gQW4gYXJyYXkgb3IgUkdCIHRyaXBsZXRzLlxuICogQHBhcmFtIHJnYldpZHRoIFdpZHRoIG9mIFJHQiBpbWFnZSwgcGl4ZWxzLlxuICogQHBhcmFtIHJnYkhlaWdodCBIZWlnaHQgb2YgUkdCIGltYWdlLCBwaXhlbHMuXG4gKiBAcGFyYW0gcXVhbGl0eSBBIHF1YWxpdHksIFswIC0gMTAwXVxuICogQHJldHVybiBBbiBBcnJheUJ1ZmZlciB3aXRoIHRoZSBlbmNvZGVkIGRhdGFcbiAqIFRocm93cyBhbiAnRXJyb3InIGluIGNhc2Ugb2YgYW55IGVycm9yIGNvbmRpdGlvbi5cbiAqL1xuZnVuY3Rpb24gZW5jb2RlSnBlZyhyZ2JBcnJheSwgcmdiV2lkdGgsIHJnYkhlaWdodCwgcXVhbGl0eSkge1xuICB2YXIgc3RhY2sgPSBSdW50aW1lLnN0YWNrU2F2ZSgpO1xuXG4gIHZhciByZ2JCdWZmZXJQdHIgPSBNb2R1bGUuX21hbGxvYyhyZ2JBcnJheS5ieXRlTGVuZ3RoKTtcbiAgTW9kdWxlLkhFQVBVOC5zZXQobmV3IFVpbnQ4QXJyYXkocmdiQXJyYXkpLCByZ2JCdWZmZXJQdHIpO1xuXG4gIHZhciBvdXRCdWZmZXJQdHJQdHIgPSBSdW50aW1lLnN0YWNrQWxsb2MoU0laRV9PRl9QT0lOVEVSKTtcbiAgdmFyIG91dEJ1ZmZlclNpemVQdHIgPSBSdW50aW1lLnN0YWNrQWxsb2MoU0laRV9PRl9QT0lOVEVSKTtcbiAgdmFyIG91dE1zZ1B0clB0ciA9IFJ1bnRpbWUuc3RhY2tBbGxvYyhTSVpFX09GX1BPSU5URVIpO1xuXG4gIE1vZHVsZS5zZXRWYWx1ZShvdXRCdWZmZXJQdHJQdHIsIDAsICdpMzInKTtcbiAgTW9kdWxlLnNldFZhbHVlKG91dEJ1ZmZlclNpemVQdHIsIDAsICdpMzInKTtcbiAgTW9kdWxlLnNldFZhbHVlKG91dE1zZ1B0clB0ciwgMCwgJ2kzMicpO1xuXG4gIC8vIGludm9rZVxuICB2YXIgcmVzdWx0ID0gZW5jb2RlX2pwZWcocmdiQnVmZmVyUHRyLCByZ2JXaWR0aCwgcmdiSGVpZ2h0LCBxdWFsaXR5LCBvdXRCdWZmZXJQdHJQdHIsIG91dEJ1ZmZlclNpemVQdHIsIG91dE1zZ1B0clB0cik7XG5cbiAgdmFyIG91dEJ1ZmZlclB0ciA9IE1vZHVsZS5nZXRWYWx1ZShvdXRCdWZmZXJQdHJQdHIsICdpMzInKTtcbiAgdmFyIG91dEJ1ZmZlclNpemUgPSBNb2R1bGUuZ2V0VmFsdWUob3V0QnVmZmVyU2l6ZVB0ciwgJ2kzMicpO1xuICB2YXIgb3V0TXNnUHRyID0gTW9kdWxlLmdldFZhbHVlKG91dE1zZ1B0clB0ciwgJ2kzMicpO1xuXG4gIHZhciBlcnI7XG4gIHZhciBlbmNvZGVkO1xuXG4gIGlmKCFyZXN1bHQpIHtcbiAgICB2YXIganBlZ0J1ZmZlciA9IG5ldyBVaW50OEFycmF5KE1vZHVsZS5IRUFQVTguYnVmZmVyLCBvdXRCdWZmZXJQdHIsIG91dEJ1ZmZlclNpemUpO1xuICAgIGVuY29kZWQgPSBuZXcgQXJyYXlCdWZmZXIob3V0QnVmZmVyU2l6ZSk7XG4gICAgbmV3IFVpbnQ4QXJyYXkoZW5jb2RlZCkuc2V0KGpwZWdCdWZmZXIpO1xuICB9IGVsc2Uge1xuICAgIGVyciA9IG5ldyBFcnJvcihNb2R1bGUuUG9pbnRlcl9zdHJpbmdpZnkob3V0TXNnUHRyKSk7XG4gIH1cblxuICBNb2R1bGUuX2ZyZWUocmdiQnVmZmVyUHRyKTtcbiAgTW9kdWxlLl9mcmVlKG91dEJ1ZmZlclB0cik7XG4gIE1vZHVsZS5fZnJlZShvdXRNc2dQdHIpO1xuXG4gIFJ1bnRpbWUuc3RhY2tSZXN0b3JlKHN0YWNrKTtcblxuICBpZihlcnIpIHtcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICByZXR1cm4gZW5jb2RlZDtcbn1cblxuLyoqXG4gKiBEZWNvZGVzIEpQRUdcbiAqIEBwYXJhbSBqcGVnQXJyYXkgQW4gQXJyYXlCdWZmZXIgd2l0aCBKUEVHIGRhdGEuXG4gKiBAcmV0dXJuIEFuIG9iamVjdDogeyBidWZmZXI6IEFycmF5QnVmZmVyLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciB9LlxuICogVGhyb3dzIGFuIEVycm9yIGluIGNhc2Ugb2YgYW55IGVycm9yIGNvbmRpdGlvbi5cbiAqL1xuZnVuY3Rpb24gZGVjb2RlSnBlZyhqcGVnQXJyYXkpIHtcbiAgdmFyIHN0YWNrID0gUnVudGltZS5zdGFja1NhdmUoKTtcblxuICB2YXIganBlZ0J1ZmZlclB0ciA9IE1vZHVsZS5fbWFsbG9jKGpwZWdBcnJheS5ieXRlTGVuZ3RoKTtcbiAgTW9kdWxlLkhFQVBVOC5zZXQobmV3IFVpbnQ4QXJyYXkoanBlZ0FycmF5KSwganBlZ0J1ZmZlclB0cik7ICBcblxuICB2YXIgb3V0QnVmZmVyUHRyUHRyID0gUnVudGltZS5zdGFja0FsbG9jKFNJWkVfT0ZfUE9JTlRFUik7XG4gIHZhciBvdXRCdWZmZXJXaWR0aFB0ciA9IFJ1bnRpbWUuc3RhY2tBbGxvYyhTSVpFX09GX1BPSU5URVIpO1xuICB2YXIgb3V0QnVmZmVySGVpZ2h0UHRyID0gUnVudGltZS5zdGFja0FsbG9jKFNJWkVfT0ZfUE9JTlRFUik7XG4gIHZhciBvdXRNc2dQdHJQdHIgPSBSdW50aW1lLnN0YWNrQWxsb2MoU0laRV9PRl9QT0lOVEVSKTtcblxuICBNb2R1bGUuc2V0VmFsdWUob3V0QnVmZmVyUHRyUHRyLCAwLCAnaTMyJyk7XG4gIE1vZHVsZS5zZXRWYWx1ZShvdXRCdWZmZXJXaWR0aFB0ciwgMCwgJ2kzMicpO1xuICBNb2R1bGUuc2V0VmFsdWUob3V0QnVmZmVySGVpZ2h0UHRyLCAwLCAnaTMyJyk7XG4gIE1vZHVsZS5zZXRWYWx1ZShvdXRNc2dQdHJQdHIsIDAsICdpMzInKTtcblxuICB2YXIgcmVzdWx0ID0gZGVjb2RlX2pwZWcoanBlZ0J1ZmZlclB0ciwganBlZ0FycmF5LmJ5dGVMZW5ndGgsIG91dEJ1ZmZlclB0clB0ciwgb3V0QnVmZmVyV2lkdGhQdHIsIG91dEJ1ZmZlckhlaWdodFB0ciwgb3V0TXNnUHRyUHRyKTtcblxuICB2YXIgb3V0QnVmZmVyUHRyID0gTW9kdWxlLmdldFZhbHVlKG91dEJ1ZmZlclB0clB0ciwgJ2kzMicpO1xuICB2YXIgb3V0QnVmZmVyV2lkdGggPSBNb2R1bGUuZ2V0VmFsdWUob3V0QnVmZmVyV2lkdGhQdHIsICdpMzInKTtcbiAgdmFyIG91dEJ1ZmZlckhlaWdodCA9IE1vZHVsZS5nZXRWYWx1ZShvdXRCdWZmZXJIZWlnaHRQdHIsICdpMzInKTtcbiAgdmFyIG91dE1zZ1B0ciA9IE1vZHVsZS5nZXRWYWx1ZShvdXRNc2dQdHJQdHIsICdpMzInKTtcblxuICB2YXIgZXJyO1xuICB2YXIgZGVjb2RlZDtcblxuICBpZighcmVzdWx0KSB7XG4gICAgdmFyIG91dEJ1ZmZlclNpemUgPSBvdXRCdWZmZXJXaWR0aCAqIG91dEJ1ZmZlckhlaWdodCAqIDM7XG4gICAgdmFyIHJnYkJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KE1vZHVsZS5IRUFQVTguYnVmZmVyLCBvdXRCdWZmZXJQdHIsIG91dEJ1ZmZlclNpemUpO1xuICAgIGRlY29kZWQgPSBuZXcgQXJyYXlCdWZmZXIob3V0QnVmZmVyU2l6ZSk7XG4gICAgbmV3IFVpbnQ4QXJyYXkoZGVjb2RlZCkuc2V0KHJnYkJ1ZmZlcik7XG4gIH0gZWxzZSB7XG4gICAgZXJyID0gbmV3IEVycm9yKE1vZHVsZS5Qb2ludGVyX3N0cmluZ2lmeShvdXRNc2dQdHIpKTtcbiAgfVxuXG4gIE1vZHVsZS5fZnJlZShqcGVnQnVmZmVyUHRyKTtcbiAgTW9kdWxlLl9mcmVlKG91dEJ1ZmZlclB0cik7XG4gIE1vZHVsZS5fZnJlZShvdXRNc2dQdHIpO1xuXG4gIFJ1bnRpbWUuc3RhY2tSZXN0b3JlKHN0YWNrKTtcblxuICBpZihlcnIpIHtcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGJ1ZmZlcjogZGVjb2RlZCxcbiAgICB3aWR0aDogb3V0QnVmZmVyV2lkdGgsXG4gICAgaGVpZ2h0OiBvdXRCdWZmZXJIZWlnaHRcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXNhbXBsZXMgUkdQIGFycmF5IG9mIGltYWdlXG4gKlxuICogQHBhcmFte0FycmF5QnVmZmVyfSByZ2JBcnJheSAtIEFuIGFycmF5IG9yIFJHQiAoMyBjaGFubmVscylcbiAqIHRyaXBsZXRzLCBwaXhlbCBhcmUgcmVwcmVzZW50ZWQgYnkgW1IxLCBHMSwgQjEsIFIyLCBHMiwgQjIsIC4uLl1cbiAqIEBwYXJhbXtOdW1iZXJ9IGZyb21XaWR0aCBXaWR0aCBvZiBSR0IgaW1hZ2UsIHBpeGVscy5cbiAqIEBwYXJhbXtOdW1iZXJ9IGZyb21IZWlnaHQgSGVpZ2h0IG9mIFJHQiBpbWFnZSwgcGl4ZWxzLlxuICogQHBhcmFte051bWJlcn0gdG9XaWR0aCBEZXNpcmVkIHdpZHRoIG9mIFJHQiBpbWFnZSwgcGl4ZWxzLlxuICogQHBhcmFte051bWJlcn0gdG9IZWlnaHQgRGVzaXJlZCBoZWlnaHQgb2YgUkdCIGltYWdlLCBwaXhlbHMuXG4gKiBAcGFyYW17U3RyaW5nfSBhbGdvcml0aG0gdG8gdXNlLiBTdXBwb3J0ZWQgdmFsdWVzOiBcImJveFwiLCBcIm1pdGNoZWxsXCIuIERlZmF1bHQ6IG1pdGNoZWxsXG4gKiBAcmV0dXJuIEFuIEFycmF5QnVmZmVyIHdpdGggcmVjb2RlZCBkYXRhIGluIGRpbWVuc2lvbnMgdG9XaWR0aCB4IHRvSGVpZ2h0XG4gKiBUaHJvd3MgYW4gJ0Vycm9yJyBpbiBjYXNlIG9mIGFueSBlcnJvciBjb25kaXRpb24uXG4gKi9cblxuY29uc3QgRmlsdGVyID0ge1xuICAgIGJveDogMSxcbiAgICB0cmlhbmdsZTogMixcbiAgICBjdWJpY3NwbGluZTogMyxcbiAgICBjYXRtdWxscm9tOiA0LFxuICAgIG1pdGNoZWxsOiA1LFxuICAgIGxhbmN6b3MzOiA2LFxufTtcblxuZnVuY3Rpb24gcmVzaXplKHJnYkFycmF5LCBmcm9tV2lkdGgsIGZyb21IZWlnaHQsIHRvV2lkdGgsIHRvSGVpZ2h0LCBhbGdvcml0aG0gPSBcIm1pdGNoZWxsXCIpIHtcbiAgICB2YXIgc3RhY2sgPSBSdW50aW1lLnN0YWNrU2F2ZSgpO1xuXG4gICAgdmFyIG51bUNoYW5uZWxzID0gMztcbiAgICB2YXIgb3V0QnVmZmVyU2l6ZSA9IHRvV2lkdGggKiB0b0hlaWdodCAgKiBudW1DaGFubmVsczsgLy8gZWFjaCBwaXhlbCA9IG51bSBjaGFubmVscyBieXRlc1xuICAgIHZhciBvdXRCdWZmZXJQdHIgPSBNb2R1bGUuX21hbGxvYyhvdXRCdWZmZXJTaXplKTtcblxuICAgIHZhciBzdHJpZGVJbkJ5dGVzID0gMDtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmICghRmlsdGVyW2FsZ29yaXRobV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFsZ29yaXRobSBcIiArIGFsZ29yaXRobSArIFwiIGlzIG5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICByZXN1bHQgPSBNb2R1bGUuc3RiaXJfcmVzaXplX3VpbnQ4X2dlbmVyaWMocmdiQXJyYXksIGZyb21XaWR0aCwgZnJvbUhlaWdodCwgc3RyaWRlSW5CeXRlcyxcbiAgICAgICAgb3V0QnVmZmVyUHRyLCB0b1dpZHRoLCB0b0hlaWdodCwgc3RyaWRlSW5CeXRlcywgbnVtQ2hhbm5lbHMsIEZpbHRlclthbGdvcml0aG1dKTtcbiAgICB2YXIgZXJyO1xuICAgIHZhciBlbmNvZGVkO1xuXG4gICAgaWYocmVzdWx0ID09PSAxKSB7XG4gICAgICAgIHZhciBqcGVnQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoTW9kdWxlLkhFQVBVOC5idWZmZXIsIG91dEJ1ZmZlclB0ciwgb3V0QnVmZmVyU2l6ZSk7XG4gICAgICAgIGVuY29kZWQgPSBuZXcgQXJyYXlCdWZmZXIob3V0QnVmZmVyU2l6ZSk7XG4gICAgICAgIG5ldyBVaW50OEFycmF5KGVuY29kZWQpLnNldChqcGVnQnVmZmVyKTtcbiAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gMCl7XG4gICAgICAgIGVyciA9IG5ldyBFcnJvcigncmVzaXplIGZhaWxlZC4gRGV0YWlscyBhcmUgdW5rbm93bicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVyciA9IG5ldyBFcnJvcigncmVzaXplIHJldHVybmVkIHVua25vd24gcmV0dXJuIGNvZGU9JyArIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgTW9kdWxlLl9mcmVlKG91dEJ1ZmZlclB0cik7XG5cbiAgICBSdW50aW1lLnN0YWNrUmVzdG9yZShzdGFjayk7XG5cbiAgICBpZihlcnIpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIHJldHVybiBlbmNvZGVkO1xufSIsInZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cdHZhciBQTFVTX1VSTF9TQUZFID0gJy0nLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIX1VSTF9TQUZFID0gJ18nLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUyB8fFxuXHRcdCAgICBjb2RlID09PSBQTFVTX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSCB8fFxuXHRcdCAgICBjb2RlID09PSBTTEFTSF9VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzXCIsXCIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliXCIpXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5YVdaNUwyeHBZaTlmWlcxd2RIa3Vhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJanRCUVVGQklpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUlpWFgwPSIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIHJvb3RQYXJlbnQgPSB7fVxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBEdWUgdG8gdmFyaW91cyBicm93c2VyIGJ1Z3MsIHNvbWV0aW1lcyB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXNlZCBldmVuXG4gKiB3aGVuIHRoZSBicm93c2VyIHN1cHBvcnRzIHR5cGVkIGFycmF5cy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqICAgLSBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsXG4gKiAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogICAtIFNhZmFyaSA1LTcgbGFja3Mgc3VwcG9ydCBmb3IgY2hhbmdpbmcgdGhlIGBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yYCBwcm9wZXJ0eVxuICogICAgIG9uIG9iamVjdHMuXG4gKlxuICogICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cblxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXlcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IGJlaGF2ZXMgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUICE9PSB1bmRlZmluZWRcbiAgPyBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVFxuICA6IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICBmdW5jdGlvbiBCYXIgKCkge31cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIGFyci5jb25zdHJ1Y3RvciA9IEJhclxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIGFyci5jb25zdHJ1Y3RvciA9PT0gQmFyICYmIC8vIGNvbnN0cnVjdG9yIGNhbiBiZSBzZXRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgYXJyLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGtNYXhMZW5ndGggKCkge1xuICByZXR1cm4gQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgICA/IDB4N2ZmZmZmZmZcbiAgICA6IDB4M2ZmZmZmZmZcbn1cblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgLy8gQXZvaWQgZ29pbmcgdGhyb3VnaCBhbiBBcmd1bWVudHNBZGFwdG9yVHJhbXBvbGluZSBpbiB0aGUgY29tbW9uIGNhc2UuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSByZXR1cm4gbmV3IEJ1ZmZlcihhcmcsIGFyZ3VtZW50c1sxXSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihhcmcpXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwXG4gICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWRcbiAgfVxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAob2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gZnJvbVR5cGVkQXJyYXkodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodGhhdCwgb2JqZWN0KVxuICAgIH1cbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAodGhhdCwgYXJyYXkpIHtcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYXJyYXkuYnl0ZUxlbmd0aFxuICAgIHRoYXQgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkoYXJyYXkpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0ID0gZnJvbVR5cGVkQXJyYXkodGhhdCwgbmV3IFVpbnQ4QXJyYXkoYXJyYXkpKVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbiAgQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcbn0gZWxzZSB7XG4gIC8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG4gIEJ1ZmZlci5wcm90b3R5cGUubGVuZ3RoID0gdW5kZWZpbmVkXG4gIEJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG59XG5cbmZ1bmN0aW9uIGFsbG9jYXRlICh0aGF0LCBsZW5ndGgpIHtcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UsIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgdGhhdCA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICAgIHRoYXQuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGZyb21Qb29sID0gbGVuZ3RoICE9PSAwICYmIGxlbmd0aCA8PSBCdWZmZXIucG9vbFNpemUgPj4+IDFcbiAgaWYgKGZyb21Qb29sKSB0aGF0LnBhcmVudCA9IHJvb3RQYXJlbnRcblxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwga01heExlbmd0aGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBrTWF4TGVuZ3RoKCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aCgpLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTbG93QnVmZmVyKSkgcmV0dXJuIG5ldyBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuICBkZWxldGUgYnVmLnBhcmVudFxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICB2YXIgaSA9IDBcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIGJyZWFrXG5cbiAgICArK2lcbiAgfVxuXG4gIGlmIChpICE9PSBsZW4pIHtcbiAgICB4ID0gYVtpXVxuICAgIHkgPSBiW2ldXG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3QgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzLicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSBzdHJpbmcgPSAnJyArIHN0cmluZ1xuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgLy8gRGVwcmVjYXRlZFxuICAgICAgY2FzZSAncmF3JzpcbiAgICAgIGNhc2UgJ3Jhd3MnOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgfCAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCB8IDBcblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoZW5kIDw9IHN0YXJ0KSByZXR1cm4gJydcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIDBcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCkge1xuICBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIGJ5dGVPZmZzZXQgPj49IDBcblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiAtMVxuICBpZiAoYnl0ZU9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuIC0xXG5cbiAgLy8gTmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBNYXRoLm1heCh0aGlzLmxlbmd0aCArIGJ5dGVPZmZzZXQsIDApXG5cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHJldHVybiAtMSAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZyBhbHdheXMgZmFpbHNcbiAgICByZXR1cm4gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZih0aGlzLCBbIHZhbCBdLCBieXRlT2Zmc2V0KVxuICB9XG5cbiAgZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCkge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKHZhciBpID0gMDsgYnl0ZU9mZnNldCArIGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJbYnl0ZU9mZnNldCArIGldID09PSB2YWxbZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXhdKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsLmxlbmd0aCkgcmV0dXJuIGJ5dGVPZmZzZXQgKyBmb3VuZEluZGV4XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG4vLyBgZ2V0YCBpcyBkZXByZWNhdGVkXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCBpcyBkZXByZWNhdGVkXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICBpZiAobmV3QnVmLmxlbmd0aCkgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldFN0YXJ0KVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiB0b0FycmF5QnVmZmVyICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiBfYXVnbWVudCAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgc2V0IG1ldGhvZCBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
