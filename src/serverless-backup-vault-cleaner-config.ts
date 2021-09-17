interface ServerlessBackupVaultCleanerConfig {

  /**
   * Names of backup vaults  to be cleaned up on remove.
   */
  backupVaults?: string[];

  /**
   * Names of backup vaults to be cleaned up before a stack deploy.
   * Use this when e.g. renaming a backup vault in the stack resources; the old backup vault should be listed here
   * (and can be removed later once the stack has been upgraded).
   */
  backupVaultsToCleanOnDeploy?: string[];
}
