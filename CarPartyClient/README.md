# The CarParty Phone Client

This implements a simple basic web application to connect to _The CarParty Websocket Relay_ to control a single car in _The CarParty Godot Game_.

Currently lacking basic features, most notably a sensible design and any network implementation.

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

Or alternatively `npm run start:unsafe` if you want to disable the host check. This will also other clients in the same network to access your development page, therefore use only when desired
