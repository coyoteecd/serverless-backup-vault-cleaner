# serverless-backup-vault-cleaner

[![serverless][icon-serverless]][link-serverless]
[![license][icon-lic]][link-lic]
[![build status][icon-ci]][link-ci]
[![npm version][icon-npm]][link-npm]

Serverless Framework plugin that empties an AWS backup vault (i.e. deletes all its restore points) before removing a deployed stack.
This makes it possible to remove stacks that contain a backup vault as a resource.

## Installation

```
npm install serverless-backup-vault-cleaner --save-dev
```

## Usage

Add the following to your `serverless.yml`:

```yml
plugins:
  - serverless-backup-vault-cleaner

custom:
  serverless-backup-vault-cleaner:
    # Names of backup vaults to remove before a stack is removed
    backupVaults:
      - vaultName1
      - vaultName2

    # (optional) Backup vaults to remove before a stack is deployed
    backupVaultsToCleanOnDeploy:
      - oldBucketName
```

When removing a Serverless Framework stack, this plugin automatically empties the backup vaults listed under `backupVaults` option.

When deploying a Serverless Framework stack, this plugin automatically empties the backup vaults listed under `backupVaultsToCleanOnDeploy` option.
Use this when renaming or removing a backup vault (put here the old vault name) to avoid deployment errors when CloudFormation tries to remove the old backup vault.

## Permissions

The plugin requires the following permissions for the role that Serverless runs with:

- backup:DescribeBackupVault
- backup:ListRecoveryPointsByBackupVault
- backup:DeleteRecoveryPoint

[//]: # (Note: icon sources seem to be random. It's just because shields.io is extremely slow so using alternatives whenever possible)
[icon-serverless]: http://public.serverless.com/badges/v3.svg
[icon-lic]: https://img.shields.io/github/license/coyoteecd/serverless-backup-vault-cleaner
[icon-ci]: https://travis-ci.com/coyoteecd/serverless-backup-vault-cleaner.svg?branch=master
[icon-npm]: https://badge.fury.io/js/serverless-backup-vault-cleaner.svg

[link-serverless]: http://www.serverless.com
[link-lic]: https://github.com/coyoteecd/serverless-backup-vault-cleaner/blob/master/LICENSE
[link-ci]: https://travis-ci.com/coyoteecd/serverless-backup-vault-cleaner
[link-npm]: https://www.npmjs.com/package/serverless-backup-vault-cleaner
