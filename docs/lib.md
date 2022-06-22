# Lib Scripts

This section will go into more detail of the lib scripts, explaining what they are and how they are used.

## Table of Contents

- [Lib Scripts](#lib-scripts)
  - [Table of Contents](#table-of-contents)
    - [changeCase.ts](#changecasets)
    - [directoryUtils.ts](#directoryutilsts)
    - [getAWSAccounts.ts](#getawsaccountsts)
    - [getConfig.ts](#getconfigts)
    - [getConnectInstanceId.ts](#getconnectinstanceidts)
    - [privateModuleUtils.ts](#privatemoduleutilsts)

### changeCase.ts

Provides string manipulation functions that will convert a string to a specified typographical standard (ie. kebab-case, camelCase, PascalCase)

### directoryUtils.ts

Functions that can provide the absolutely directory paths of specified locations within the repo (ie. Root, package directories, etc.)

- fromRoot
- getDirectoriesAtPath
- getPackageDirectories
- getPackageNames

### getAWSAccounts.ts

Function that looks into the `config/` directory of the repo, finds any files following the pattern: `*.config.ts` and ensures the following properties exist on the config file:

- account.id
- account.region
- account.profile

It will return the AWS account info as well as the branch name of the config file (ie. 'test' if looking at `test.config.ts`)

### getConfig.ts

Houses multiple functions:

- getStage
  - Normalizes branch name to standard stage names for deployment
- getLocalGitBranch
  - Get the current branch from local git
- getConfigFromFile
  - returns the config object within the specified config file parameter
- getProdConfig
  - returns the config object for the Production stage -- this will be derived from either a named `master` or `main` config file. Throws an error if you have both/neither configs set up on the repo (as you can only have one).
- getConfig
  - returns all the required configurations in order to deploy the checked out branch to AWS. This will grab the config for the current branch, as well as the production config (in order to deploy/refer to CA in prod) to be passed to whatever stacks/packages you are standing up.

More detailed descriptions of these functions are self-documented.

### getConnectInstanceId.ts

Function that returns the Connect Instance Id that matches the Connect Alias defined in the `*.config.ts` file you are currently working from. This is retrieved using the API so that packages dependent on the `connect-core` package can dynamically be referred to after the core stack deploys.

Or, if not using the `connect-core` stack, you can provide a Connect Alias in your config file as follows:

```ts
const config: Configuration = {
  // ... other configs
  connectCore: {
    instanceAlias: 'named-alias-here'
  }
};
export default config;
```

### privateModuleUtils.ts

A collection of functions that are used in various bin scripts.

The main exported functions:

- buildCodeArtifact
  - builds a CA if there is no domain on the AWS account
  - builds a repo if there is none in the CA domain
  - sets domain permissions on the CA account with all AWS accounts defined in any of the config files
- buildUri
  - returns the string URI of the code artifact domain on the Prod account
- buildNpmrc
  - writes a `.npmrc` file containing the configs necessary to read/write packages to/from the proper location (ie. CodeArtifact instead of Github)
- publishPrivateModule
  - builds an `.npmrc` file and publishes the module within a specified directory within the repo.
- getCCAAuthToken
  - returns the authToken to access CodeArtifact
- fixPackageLock
  - within a directory, removes the `package-lock.json` and any `@ttec-dig-vf` packages and reinstalls dependencies
  - this is part of the process when reinstalling packages from CA instead of github for iterative deployment
- fixPackageLocks
  - loops through fixPackageLock for a given array of directories
- getCAConfig
  - returns the CodeArtifact config
    - Does this by getting the AWS id/region from the master/main branch config and generating a CA auth token and returning other properties.
