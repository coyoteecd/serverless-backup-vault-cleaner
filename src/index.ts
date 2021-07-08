import Serverless from 'serverless';
import Plugin from 'serverless/classes/Plugin';

export default class ServerlessBackupVaultCleaner implements Plugin {
  public hooks: Plugin.Hooks;

  constructor(serverless: Serverless) {
    this.hooks = {
    };

    serverless.cli.log('serverless-backup-vault-cleaner initialized');
  }
}

module.exports = ServerlessBackupVaultCleaner;