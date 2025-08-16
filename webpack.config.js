const path = require('path');

module.exports = [
  // Extension source
  {
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  skipLibCheck: true
                }
              }
            }
          ]
        }
      ]
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
      level: "log"
    }
  },
  // Webview source
  {
    target: ['web', 'es5'],
    mode: 'none',
    entry: './src/webview/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'webview.js'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  skipLibCheck: true
                }
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    devtool: 'nosources-source-map'
  },
  // Whisper Worker
  {
    target: ['webworker'],
    mode: 'none',
    entry: './src/workers/whisperWorker.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'whisperWorker.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  skipLibCheck: true
                }
              }
            }
          ]
        }
      ]
    },
    devtool: 'nosources-source-map'
  }
];