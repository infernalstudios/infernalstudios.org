/* eslint-disable */
const path = require('path');
const fs = require('fs');

module.exports = {
  mode: 'production',
  entry: {
    questlog: './public/script/questlog.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'built'),
    filename: '[name].bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          configFile: 'tsconfig.client.json',
        }
      },
    ],
  },
};