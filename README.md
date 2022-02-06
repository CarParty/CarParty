# The CarParty Phone Client

This branch implements a simple basic web application to connect to _The __CarParty__ Websocket Relay_ to control a single car in _The __CarParty__ Godot Game_. All relevant files are located in the subdirectory `CarPartyClient/`, thus the following description assumes to be in that directory unless stated otherwise.

## Requirements

- [node.js](https://nodejs.org/en/)
  - Choose any somewhat recent version, anything >= 11 should be fine.
  - Node.js is a runtime for JavaScript which does not require a Browser.
  - It bundles [npm](https://www.npmjs.com/), the abbreviation for Node Package Manager (contrary to what the upper left corner of its website might say).
  - We use it to fetch all dependencies and run our build step.

## Build

To collect, transpile and bundle all source files and assets, use:

```
npm install
npm run build
```

The first command fetches all required dependencies (currently exclusively build tools & more than it actually uses).

The second command is the actual build step. This will deposit all required files minified in the directory `./dist`.

## Development

For an auto-refreshing, live development server on `localhost:4200` use (note that you'll still need to install dependencies using `npm install`, but only once or on dependency changes):

```
npm run start
```

Or alternatively `npm run start:unsafe` if you want to disable the host check. This will also other clients in the same network to access your development page, therefore use only when desired.

## Testing

While this project currently doesn't have many tests, testing is set up and configured to be run in browsers. Use

```
npm run test
```

to run all tests once or `npm run test:watch` to run tests on every file change. For usage during CI workflows, use `npm run test:headless` to indicate that tests should be run in headless browsers or not at all. Other than that, available browsers should be detected automatically in every setting.

At this moment, only the most important and complex parts are covered by tests.

## Other files

The subdirectory `transport_schema/` contains JSON schema for the protocol between server and clients, both written from the perspective of sending towards the relay. These don't represent the current version, but the present parts have not changed, only were extended with additional options.
