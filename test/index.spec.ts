import type { DeleteRecoveryPointInput, ListRecoveryPointsByBackupVaultOutput } from 'aws-sdk/clients/backup';
import Serverless from 'serverless';
import Aws from 'serverless/plugins/aws/provider/awsProvider';
import ServerlessBackupVaultCleaner from '../src/index';

describe('ServerlessBackupVaultCleaner', () => {

  it('should create the plugin', () => {
    const { serverless } = stubServerlessInstance();
    const plugin = new ServerlessBackupVaultCleaner(serverless);
    expect(plugin).toBeTruthy();
  });

  it('should fail when neither backupVaults nor backupVaultsToCleanOnDeploy is configured', async () => {
    const { serverless } = stubServerlessInstance({});
    const plugin = new ServerlessBackupVaultCleaner(serverless);
    expect(plugin).toBeTruthy();

    const removeFn = plugin.hooks['before:remove:remove'];
    await expectAsync(removeFn()).toBeRejectedWith(jasmine.objectContaining({
      message: jasmine.stringMatching(/You must configure.+/)
    }));
  });

  describe('before stack removal', () => {
    it('should empty configured backup vaults', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1', 'b2'],
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo({
        RecoveryPoints: [
          { RecoveryPointArn: 'arn1' },
          { RecoveryPointArn: 'arn2' }
        ]
      } as ListRecoveryPointsByBackupVaultOutput);

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b1',
        RecoveryPointArn: 'arn1'
      }));
      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b2',
        RecoveryPointArn: 'arn2'
      }));
    });

    it('should delete all recovery points when listRecoveryPointsByBackupVault returns truncated results', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1'],
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      let callCount = 0;
      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.callFake(() => ({
        RecoveryPoints: [
          { RecoveryPointArn: `arn${callCount}` },
        ],
        NextToken: (callCount++ === 0) ? 'more' : undefined
      }) as ListRecoveryPointsByBackupVaultOutput);

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        RecoveryPointArn: 'arn0'
      }));
      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        RecoveryPointArn: 'arn1'
      }));
    });

    it('should log a message when listing the contents of an existing backup vault fails', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1', 'b2'],
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      const errorMsg = 'bad object';
      let callCount = 0;
      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.callFake(
        () => (callCount++ > 0
          ? Promise.reject(errorMsg)
          : ({
            RecoveryPoints: [
              { RecoveryPointArn: 'arn1' },
            ]
          }) as ListRecoveryPointsByBackupVaultOutput)
      );

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b1',
        RecoveryPointArn: 'arn1'
      }));
      expect(requestSpy).not.toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b2'
      }));
      expect(serverless.cli.log).toHaveBeenCalledWith(jasmine.stringMatching(`cannot be emptied. ${errorMsg}`));
    });

    it('should log a message when deleting a recovery point fails', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1'],
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo({
        RecoveryPoints: [
          { RecoveryPointArn: 'arn1' },
          { RecoveryPointArn: 'arn2' }
        ]
      } as ListRecoveryPointsByBackupVaultOutput);

      let callCount = 0;
      requestSpy.withArgs('Backup', 'deleteRecoveryPoint', jasmine.anything()).and.callFake(
        () => (callCount++ === 0
          ? Promise.reject(new Error('Fail'))
          : Promise.resolve())
      );

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(serverless.cli.log).toHaveBeenCalledWith(jasmine.stringMatching('cannot be emptied. Error: Fail'));
    });

    it('should skip backup vaults that do not exist', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1'],
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo(
        { RecoveryPoints: [] } as ListRecoveryPointsByBackupVaultOutput
      );
      requestSpy.withArgs('Backup', 'describeBackupVault', jasmine.anything()).and.rejectWith('bad bucket');

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).not.toHaveBeenCalledWith('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything());
      expect(serverless.cli.log).toHaveBeenCalledWith(jasmine.stringMatching('skipping'));
    });

    it('should skip configured backupVaultsToCleanOnDeploy', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaultsToCleanOnDeploy: ['b2']
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo({
        RecoveryPoints: [
          { RecoveryPointArn: 'arn1' }
        ]
      } as ListRecoveryPointsByBackupVaultOutput);

      const removeFn = plugin.hooks['before:remove:remove'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).not.toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.anything());
    });
  });

  describe('before stack deploy', () => {
    it('should not empty configured backup vaults', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaults: ['b1']
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo({
        RecoveryPoints: [
          { RecoveryPointArn: 'arn1' }
        ]
      } as ListRecoveryPointsByBackupVaultOutput);

      const removeFn = plugin.hooks['before:deploy:deploy'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).not.toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.anything());
    });

    it('should empty configured backupVaultsToCleanOnDeploy', async () => {
      const { requestSpy, serverless } = stubServerlessInstance({
        backupVaultsToCleanOnDeploy: ['b1', 'b2']
      });
      const plugin = new ServerlessBackupVaultCleaner(serverless);

      requestSpy.withArgs('Backup', 'listRecoveryPointsByBackupVault', jasmine.anything()).and.resolveTo({
        RecoveryPoints: [
          { RecoveryPointArn: 'arn' }
        ]
      } as ListRecoveryPointsByBackupVaultOutput);

      const removeFn = plugin.hooks['before:deploy:deploy'];
      await expectAsync(removeFn()).toBeResolved();

      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b1',
        RecoveryPointArn: 'arn'
      }));
      expect(requestSpy).toHaveBeenCalledWith('Backup', 'deleteRecoveryPoint', jasmine.objectContaining<DeleteRecoveryPointInput>({
        BackupVaultName: 'b2',
        RecoveryPointArn: 'arn'
      }));
    });
  });

  function stubServerlessInstance(config?: Partial<ServerlessBackupVaultCleanerConfig>): { requestSpy: jasmine.Spy; serverless: jasmine.SpyObj<Serverless> } {
    const requestSpy = jasmine.createSpy('request').and.resolveTo({});
    return {
      requestSpy,
      serverless: jasmine.createSpyObj<Serverless>({
        getProvider: ({
          request: requestSpy
        }) as unknown as Aws,
      }, {
        cli: jasmine.createSpyObj(['log']),
        service: jasmine.createSpyObj([], {
          custom: {
            'serverless-backup-vault-cleaner': config
          }
        })
      })
    };
  }
});
