import type {
  DeleteRecoveryPointInput, DescribeBackupVaultInput,
  ListRecoveryPointsByBackupVaultInput, ListRecoveryPointsByBackupVaultOutput, RecoveryPointByBackupVaultList
} from 'aws-sdk/clients/backup';
import Serverless, { Options } from 'serverless';
import Plugin, { Logging } from 'serverless/classes/Plugin';
import Aws from 'serverless/plugins/aws/provider/awsProvider';

export default class ServerlessBackupVaultCleaner implements Plugin {
  public hooks: Plugin.Hooks;
  private provider: Aws;
  private log: Logging['log'];

  constructor(
    private readonly serverless: Serverless,
    _options: Options,
    logging: Logging,
  ) {
    this.log = logging.log;
    this.provider = this.serverless.getProvider('aws');
    this.hooks = {
      'before:deploy:deploy': async () => this.remove(true),
      'before:remove:remove': async () => this.remove(false),
    };
  }

  private async remove(isDeploying: boolean): Promise<void> {
    const config = this.loadConfig();
    const backupVaultsToEmpty = isDeploying ? config.backupVaultsToCleanOnDeploy : config.backupVaults;

    // Filter out inaccessible backup vaults before doing the work;
    // this is so we don't log unnecessary/ugly errors in case e.g. old vaults left in backupVaultsToCleanOnDeploy have already been removed
    const existingVaults: string[] = [];
    for (const backupVault of backupVaultsToEmpty) {
      const exists = await this.backupVaultExists(backupVault);
      if (exists) {
        existingVaults.push(backupVault);
      } else {
        this.log.warning(`${backupVault} not found or you do not have permissions, skipping...`);
      }
    }

    // Parallelize the removal to speed things up
    const removePromises = existingVaults.map(vaultName => this
      .listRecoveryPoints(vaultName)
      .then(keys => this.deleteRecoveryPoints(vaultName, keys))
      .then(() => this.log.success(`${vaultName} successfully emptied`))
      .catch(err => this.log.error(`${vaultName} cannot be emptied. ${err}`)));

    await Promise.all(removePromises);
  }

  private async backupVaultExists(backupVaultName: string): Promise<boolean> {
    const params: DescribeBackupVaultInput = { BackupVaultName: backupVaultName };
    return this.provider.request('Backup', 'describeBackupVault', params)
      .then(() => true)
      .catch(() => false);
  }

  private async listRecoveryPoints(backupVaultName: string): Promise<RecoveryPointByBackupVaultList> {
    const listParams: ListRecoveryPointsByBackupVaultInput = {
      BackupVaultName: backupVaultName
    };
    let recoveryPoints: RecoveryPointByBackupVaultList = [];

    while (true) {
      const listResult: ListRecoveryPointsByBackupVaultOutput = await this.provider.request('Backup', 'listRecoveryPointsByBackupVault', listParams);
      if (listResult.RecoveryPoints) {
        recoveryPoints = recoveryPoints.concat(listResult.RecoveryPoints);
      }

      if (!listResult.NextToken) {
        break;
      }
      listParams.NextToken = listResult.NextToken;
    }

    return recoveryPoints;
  }

  private async deleteRecoveryPoints(backupVaultName: string, recoveryPoints: RecoveryPointByBackupVaultList): Promise<void> {
    const params: DeleteRecoveryPointInput[] = recoveryPoints.map(rp => ({
      BackupVaultName: backupVaultName,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      RecoveryPointArn: rp.RecoveryPointArn!
    }));
    await Promise.all(
      params.map(param => this.provider.request('Backup', 'deleteRecoveryPoint', param))
    );
  }

  private loadConfig(): Required<ServerlessBackupVaultCleanerConfig> {
    const providedConfig: Partial<ServerlessBackupVaultCleanerConfig> = this.serverless.service.custom['serverless-backup-vault-cleaner'];
    if (!providedConfig.backupVaults && !providedConfig.backupVaultsToCleanOnDeploy) {
      throw new Error('You must configure "backupVaults" or "backupVaultsToCleanOnDeploy" parameters in custom > serverless-backup-vault-cleaner section');
    }

    return {
      backupVaults: providedConfig.backupVaults || [],
      backupVaultsToCleanOnDeploy: providedConfig.backupVaultsToCleanOnDeploy || [],
    };
  }
}

module.exports = ServerlessBackupVaultCleaner;
