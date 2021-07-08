import Serverless from 'serverless';
import ServerlessBackupVaultCleaner from '../src/index';

describe('ServerlessBackupVaultCleaner', () => {

  it('should create the plugin', () => {
    const serverless = {
      cli: jasmine.createSpyObj(['log'])
    } as Serverless;

    const plugin = new ServerlessBackupVaultCleaner(serverless);
    expect(plugin).toBeTruthy();
    expect(serverless.cli.log).toHaveBeenCalled();
  });
});
