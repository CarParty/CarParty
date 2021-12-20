#!/usr/bin/env node

const fs = require('fs');

const outputPath = './dist';
const outputFile = outputPath + '/versions.json';

process.on('uncaughtException', function (err) {
  console.log('[VersionExtract] encountered exception, aborting');
  // write most basic possible result
  fs.writeFileSync(outputFile, JSON.stringify({}), 'utf8');
  return;
});

// may fail ?
const Git = require('nodegit');

const result = {};

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath);
}

// open repository
const repo = Git.Repository.open('..');

// get branch name
repo.then(function (repo) {
  return repo.getCurrentBranch();
}).then(function (branch) {
  const branchName = branch.shorthand();
  result.branch = branchName;
});


repo.then(function (repo) {
  return repo.getHeadCommit();
}).then(function (latestCommit) {
  result.commits = [];

  result.hash = latestCommit.sha();

  const history = latestCommit.history();
  let limit = 10;
  history.on("commit", function (commit) {
    if (limit <= 0) {
      // write out result for consumption
      fs.writeFileSync(outputFile, JSON.stringify(result), 'utf8');
      return;
    }
    limit--;

    result.commits.push({
      "hash": commit.sha(),
      "author": commit.author().name(),
      "date": commit.date().getTime(),
      "message": commit.message()
    });
  });
  history.start();
});
