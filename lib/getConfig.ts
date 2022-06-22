import { readdirSync } from 'fs';
import { resolve } from 'path';
import { Environment } from 'aws-cdk-lib';
import { Configuration } from '../config/Configuration';
import { exec } from './exec';
import { toKebab } from './changeCase';
import { getConnectInstanceId } from './getConnectInstanceId';

const CONFIG_DIRECTORY = resolve(__dirname, '..', 'config');
const DEFAULT_CONFIG_FILENAME = 'default.config.ts';

/**
 * @description Stages names generally are `dev`, `qa`, and `prod`.  Git branch names for
 * `dev` stage can be `dev` of `develop`. Git branch for `prod` stage can be either `master`
 * or `main`.  Normalizes branch name to standard stage names.
 */
function getStage(branchOrFilename: string): string {
  const branch = branchOrFilename.includes('.') ? branchOrFilename.split('.')[0] : branchOrFilename;
  return toKebab(branch === 'main' || branch === 'master' ? 'prod' : branch === 'develop' ? 'dev' : branch);
}

/**
 * @description Get the current branch from local git
 * Note: does not work on CI where git is not available
 */
export async function getLocalGitBranch(): Promise<string> {
  const output: string = await exec('git status', false);
  const [, branch] = /^On\sbranch\s([\S]*).*/.exec(output.toString()) || [];
  return branch;
}

/**
 * @param filename (format is 'stage.config.ts')
 * @returns Configuration
 */
function getConfigFromFile(filename: string): Configuration {
  const filepath = resolve(CONFIG_DIRECTORY, filename);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(filepath);
  if (!config.default) {
    throw new Error(`config object must be default export of file\n${filepath}`);
  }
  return config.default;
}

/**
 * @description Get the configuration for the prod stage.  Checks for files named
 * `main.config.ts` and `master.config.ts` and throws errors if both exist or neither exist.
 * There must be a prod stage configuration as CodeArtifact is deployed to the prod account.
 */
export function getProdConfig(): Configuration {
  let masterConfig: Configuration | undefined;
  let mainConfig: Configuration | undefined;
  try {
    // eslint-disable-next-line prefer-const
    masterConfig = getConfigFromFile('master.config.ts');
    // eslint-disable-next-line no-empty
  } catch {}
  try {
    // eslint-disable-next-line prefer-const
    mainConfig = getConfigFromFile('main.config.ts');
    // eslint-disable-next-line no-empty
  } catch {}
  if (masterConfig && mainConfig) {
    throw new Error('Cannot have both master and main config files');
  }
  if (!masterConfig && !mainConfig) {
    throw new Error('Must have either master or main config file');
  }
  return (mainConfig ?? masterConfig) as Configuration;
}

export type StageConfig = Omit<Configuration, 'account'> & {
  branch: string;
  stage: string;
  prefix: string;
  env: Required<Environment>;
  profile: string;
  region: string;
  accountId: string;
  connectInstanceId?: string;
  codeArtifact: {
    account: string;
    region: string;
  };
};

export async function getConfig(_branch?: string): Promise<StageConfig> {
  let branch: string;
  if (_branch) {
    branch = _branch;
  } else if (process.env.BRANCH) {
    branch = process.env.BRANCH;
  } else {
    branch = await getLocalGitBranch();
  }

  if (!branch) {
    throw new Error('could not determine what stage to deploy. no process.env.BRANCH nor git branch available');
  }
  /**
   * NOTE: prod account houses the code artifacts for project
   */
  const prodConfig = getProdConfig();
  const stage = getStage(branch);

  const branchConfigFilename = `${branch}.config.ts`;
  const configFiles = readdirSync(CONFIG_DIRECTORY);
  const configFileName = configFiles.find(filename => filename === branchConfigFilename)
    ? branchConfigFilename
    : DEFAULT_CONFIG_FILENAME;
  const config = getConfigFromFile(configFileName);

  const prefix = `${config.client}-${config.project}-${stage}`;
  const profile = config.account.profile;
  const connectInstanceId = await getConnectInstanceId({
    prefix,
    profile,
    region: config.account.region,
    instanceAlias: config.connectCore?.instanceAlias
  });

  return {
    ...config,
    branch,
    stage,
    prefix,
    profile,
    region: config.account.region,
    accountId: config.account.id,
    connectInstanceId,
    env: {
      account: config.account.id,
      region: config.account.region
    },
    codeArtifact: {
      account: prodConfig.account.id,
      region: prodConfig.account.region
    }
  };
}
