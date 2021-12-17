// Karma configuration
const webpackConfig = require('./webpack.config.js')({ MODE: 'development' });

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ['jasmine', 'webpack', 'detectBrowsers'],


    // list of files / patterns to load in the browser
    files: [
      { pattern: 'src/**/*spec.ts', watched: false } // using webpacks watch
    ],


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      '**/*.ts': 'webpack',
      'src/**/*!(spec).ts': 'coverage'
    },


    // reusing the relevant webpack configurations
    webpack: {
      resolve: webpackConfig.resolve,
      module: webpackConfig.module
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ['progress', 'coverage', 'kjhtml'],


    coverageReporter: {
      dir: 'coverage/',
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // cancel current run on file change
    restartOnFileChange: true,


    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    // using karma-detect-browsers (configuration below)
    /*browsers: [
      'Firefox',
      'Chrome',
      // 'Safari'
    ],*/

    // custom launcher configurations
    // for now only for our headless targets
    customLaunchers: {
      'FirefoxHeadless': {
        base: 'Firefox',
        flags: [
          '-headless',
        ],
      },
      /*'ChromeHeadless': {
        base: 'Chrome',
        flags: [
          '--headless',
          '--no-sandbox'
        ],
      },
      'ChromiumHeadless': {
        base: 'Chromium',
        flags: [
          '--headless',
          '--no-sandbox'
        ],
      }*/
    },


    // auto-detect available/installed browsers, but only use allowed browsers (filter out IE, Edge, PhantomJS, ...)
    // whitelist might need to be extended with more browsers
    // main advantage: don't try to test Safari on non-MacOS
    detectBrowsers: {
      postDetection: function (availableBrowsers) {
        const whitelist = ['Firefox', 'Chrome', 'Chromium', 'Opera', 'Safari'];

        console.log('Available Browsers:', availableBrowsers);
        return availableBrowsers.filter(browser => whitelist.includes(browser))
          // hackily detect whether we want to run headless (check if scriptname contains 'headless')
          // in this case substitute the default launcher for our custom configurations
          .map(browser => `${browser}${process.env.npm_lifecycle_event.includes('headless')
            && (browser === 'Firefox' /*|| browser === 'Chrome' || browser === 'Chromium'*/) ? 'Headless' : ''}`);
      }
    },


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity
  });
};
