/// <reference path="../typings/globals/node/index.d.ts" />
import * as fs from 'fs'

// This code is intended to run under Node, but dropped under Webpack.
// The point of this piece is to load the ./lib/libdts.txt file as text.
// Under Node, this code does it. Under Webpack, the "to-string" loader performs this function.
require.extensions['.txt'] = function (module, filename) {
	module.exports = fs.readFileSync(filename, 'utf8');
};