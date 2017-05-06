const path = require('path');

module.exports = {
  entry: "./built/src/tstc.js",
  target: 'node',
  output: { 
    path: path.join( __dirname, 'bin' ), 
    filename: 'tstc.js' 
  },
  module: {
    rules: [
      { test: /node-adaptor/, use: "null-loader" },
      { test: /\.txt$/, use: "raw-loader" }      
    ]
  }
}