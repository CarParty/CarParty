const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = env => {
  return ({
    mode: env.MODE,
    entry: ['./src', './scss/styles.scss'],
    devtool: env.MODE === 'development' ? 'inline-source-map' : false,
    devServer: {
      static: './dist'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.(html)$/,
          use: {
            loader: 'html-loader',
            // options: {
            //   attrs: false,
            // },
          },
        },
        {
          test: /\.css$/,
          use: [
            //MiniCssExtractPlugin.loader, 
            'css-loader',
            'sass-loader'
          ],
        },
        // let webpack load the font files (currently only KaTeX fonts),
        // but we'll later fetch them from a CDN instead
        {
          test: /\.(woff(2)?|ttf|eot|otf)(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'fonts/'
              }
            }
          ]
        },
        {
          test: /styles\.(scss)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].css',
                outputPath: 'assets/'
              }
            }, {
              loader: 'extract-loader'
            }, {
              // Translate CSS into CommonJS modules
              loader: 'css-loader',
              options: {
                esModule: false // I don't really want to set this, but somehow this now became required
              }
            }, {
              // Run postcss actions
              loader: 'postcss-loader',
            }, {
              // Compile Sass to CSS
              loader: 'sass-loader'
            }
          ]
        },
        {
          test: /\.(scss)$/,
          exclude: /styles/,
          use: [
            {
              // Translate CSS into CommonJS modules
              loader: 'css-loader',
              options: {
                esModule: false // I don't really want to set this, but somehow this now became required
              }
            }, {
              // Run postcss actions
              loader: 'postcss-loader',
            }, {
              // Compile Sass to CSS
              loader: 'sass-loader'
            }
          ]
        },
        {
          test: /\.riv$/,
          type: 'asset/resource'
        }
      ],
    },
    /*optimization: {
      //minimize: true,
      minimizer: [
        new CssMinimizerPlugin(),
      ],
    },*/
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      fallback: { 'util': false }
    },
    output: {
      chunkFilename: '[name].bundle.js',
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/' // workaround because between css-loader and file-loader they interpret the default value 'auto' as an actual path
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        inject: 'head',
        template: 'public/index.html'
      }),
      // new MiniCssExtractPlugin(),
      new webpack.DefinePlugin({
        // inject version information
        VERSION_PROD: JSON.stringify(env.MODE !== 'development')
      }),
      // new BundleAnalyzerPlugin()
    ]
  });
};
