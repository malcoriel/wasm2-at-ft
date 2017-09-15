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