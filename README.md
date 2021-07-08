# serverless-backup-vault-cleaner

[![serverless][icon-serverless]][link-serverless]
[![license][icon-lic]][link-lic]
[![build status][icon-ci]][link-ci]
[![npm version][icon-npm]][link-npm]

Serverless Framework plugin that empties an AWS backup vault before removing a deployed stack.

## Installation

```
npm install serverless-backup-vault-cleaner --save-dev
```

## Usage

Add the following to your `serverless.yml`:

```yml
plugins:
  - serverless-backup-vault-cleaner
```

This plugin does not have any configuration options (yet).

[//]: # (Note: icon sources seem to be random. It's just because shields.io is extremely slow so using alternatives whenever possible)
[icon-serverless]: http://public.serverless.com/badges/v3.svg
[icon-lic]: https://img.shields.io/github/license/coyoteecd/serverless-backup-vault-cleaner
[icon-ci]: https://travis-ci.com/coyoteecd/serverless-backup-vault-cleaner.svg?branch=master
[icon-npm]: https://badge.fury.io/js/serverless-backup-vault-cleaner.svg

[link-serverless]: http://www.serverless.com
[link-lic]: https://github.com/coyoteecd/serverless-backup-vault-cleaner/blob/master/LICENSE
[link-ci]: https://travis-ci.com/coyoteecd/serverless-backup-vault-cleaner
[link-npm]: https://www.npmjs.com/package/serverless-backup-vault-cleaner
