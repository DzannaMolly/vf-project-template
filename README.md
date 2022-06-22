# Description

In an effort to ease your journey with this repo we have setup some conventions that will help. It is setup for branch based development and use with multiple AWS accounts. It is also equipped to allow for a separate environment for consultant development.

> Check out the [Devika Anil's Tutorial](https://voicefoundry-cloud.atlassian.net/wiki/spaces/VFDocumentation/pages/2365587460/VF+Project+Template+Tutorial) for a step-by-step guide.

---

## Table of Contents

- [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Bootstrapping](#bootstrapping)
  - [Directory Layout](#directory-layout)
  - [Deployment](#deployment)
  - [Dependencies](#dependencies)
    - [NPM Pack](#npm-pack)
    - [Publishing to Client CodeArtifact](#publishing-to-client-codeartifact)
  - [Unit / Integration testing](#unit--integration-testing)
  - [Important things to know](#important-things-to-know)

Other READMEs

- [Configuration](config/00-README.md)
- [Packages](packages/README.md)
- [Integrating vf-deploy](docs/vf-deploy.md)

---

## Bootstrapping

To start, make sure to have a [Github Public Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) is generated and stored in Secrets Manager in each account.
The following permissions are needed for the token:

```text
repo
  repo:status
  repo_deployment
  public_repo
  repo:invite
  security_events

write:packages
  read:packages

admin:repo_hook
  write:repo_hook
  read:repo_hook
```

When storing in Secrets Manager, set the token as a plaintext value for Github. If using Bitbucket, it will need to be a key/value pair of username/password.

The name you choose for this secret will be the `oauthSecretName` that must be set in the config file.

Ensure all config files are properly set up for all the apps you plan on deploying to each AWS environment.
[Click here](config/00-README.md) to learn about Configuration

Make sure all dependencies are installed.
You can run `npm i` from the root and there is a postinstall script that will handle installing dependencies in all the apps in the `packages/*` folder.

After all configs are set up, you can run from the root directory:

```bash
npm run bootstrap
```

This will:

- Bootstrap all AWS environments with CDK (if not done already)
- Publish all private packages to the client's Prod CodeArtifact
  - See [Publishing to Client CodeArtifact](#publishing-to-client-codeartifact) for more detail.
- Synth and deploy `connect-core`
- Synth and deploy all other apps in `packages/*`

From this point forward, further deployment will be handled by the CI/CD pipeline with Github webhooks and CodeBuild. See [Deployment](#deployment).

---

## Directory Layout

This repo is adopting a **Monorepo architechure**, utilizing compartmentalized "packages" that can be deployed from one repo. There are some benefits to utilizing a monorepo architechture. Depending on the need, you can add/remove packages for your project.
This allows for modular CDK apps on a per client basis, instead of one central CDK app that has multiple stacks for each app.

For example, if you have a client that does not need voicemail, you can simply delete the voicemail folder within the packages directory and remove the `VoicemailStackProps` from the [Configuration.ts](config/Configuration.ts) interface.

```text
    ├── bin                               # scripts run by all packages, publishing to CA
    ├── config                            # Config files for branch-based deployment setup here
        ├── Configuration.ts              # Interface definition for config files
        ├── *.config.ts                   # Config file where * === branch (dev/test/prod)
    ├── lib                               # shared scripts/helper functions
    ├── packages                          # Modularized CDK apps live here
        ├── admin
            ├── infra.ts                  # CDK stack defined here
            ├── package.json
            ├── ...                       # other configs (cdk.json, tsconfig.json, etc)
        ├── cicd
            ├── buildspec.yml             # buildspec for cicd pipelines
            ├── buildChangedPackages.ts   # script to determine which packages to run in codebuild
            ├── infra.ts
            ├── package.json
            ├── ...
        ├── connect-core                  # Custom Connect Instance CDK stack
            ├── ...                       # Same as `admin`
        ├── voicemail
        ├── ...                           # Other apps could be added (ie. CCP)
    ├── ...                               # Other configs...
    └── README.md
```

---

## Deployment

After setting up your configuration files, the first major step is to download dependencies and publish the private ones to the client's `prod` CodeArtifact. See [Publishing to Client CodeArtifact](#publishing-to-client-codeartifact).

When everything is ready, run `npm run synth` followed by `npm run deploy` from the root -- this will run a script that will synth/deploy all the apps in the packages folder.

**_IMPORTANT_**: You will need to synth/deploy each package for every stage. This means if you have 3 stages, you will need to synth/deploy the admin, connect-core, connect-lambdas and voicemail apps 3 times each... meaning there will be a total of 12 CodeBuilds across whatever accounts are being used.

In other words, make sure you run synth/deploy from each `branch` you need to deploy to so that all apps will be deployed to each `branch`.

Once each package is deployed from your local machine, it will stand up a CDK stack with a CodeBuild construct. From this point forward, any development/iteration made to the github repo's correlating branch will automatically trigger that stack and build using the `buildspec.yml` within that package.

Each modular package is also set up to only run CodeBuild if changes are made within that `packages/*` folder.
For example, in the `packages/connect-core/infra.ts` file:

```typescript
  await GithubCodeBuild.create(app, `CICD${toPascal(stage)}`, {
      stackName: `${stagePrefix}-connect-core-cicd`,
      profile,
      env,
      projectName: `${project}-connect-core-${stage}`,
      branch,
      repo: repo.name,
      owner: repo.owner,
      githubCredentialsSecretARN: repo.oauthSecretARN,
      buildSpec: `packages/connect-core/buildspec.yml`,
      filePath: `packages/connect-core/*`,
      buildPolicyStatements: [
        new PolicyStatement({
          actions: ['connect:ListInstances', 'ds:DescribeDirectories'],
          resources: ['*']
        })
      ],
      environment: {
        CA_ACCOUNT: {
          value: codeArtifact.account
        },
        CA_REGION: {
          value: codeArtifact.region
        }
      }
    });
  }
```

The `filePath` property is letting CodeBuild know that this stack will only be triggered on changes to the repo that affect files within `packages/connect-core/*`. If you are push changes to the admin app within the same branch, it will only build/deploy the admin app for that branch/stage.

Since each package is decoupled from one another, triggering multiple CodeBuilds from one push is possible (say if you made changes to both the admin and voicemail app at the same time).

---

## Dependencies

### NPM Pack

In the root `bin/` you will see `installPackFiles.ts`. This is responsible for taking the packages in this repo, building local tars, and setting packages to those local paths.

This works by recursively gathering all packages installed in `node_modules/@ttec-dig-vf` of the root & any `packages/*` directories and packing them.

```script
npm run installPackFiles
```

This will:

- Create a Packs folder.
- Writes tars to Packs folder.
- Remove the `node_modules` folder in all applicable directories.
- Remove `package-lock` files in all applicable directories.
- Reinstall dependencies using packs.

---

### Publishing to Client CodeArtifact

In the root `bin/` you will see `publishToCodeArtifact.ts`. This is responsible for taking the packages in this repo and installing them to the client account.

This works by recursively gathering all packages installed in `node_modules/@ttec-dig-vf` of the root & any `packages/*` directories and publishing them to the client CodeArtifact account. If a CodeArtifact repository doesn't exist on the client account for vf apps, this script will also handle it's creation.

**_IMPORTANT_**: A `main` config file is required for the project -- you will be hosting all private CodeArtifact packages in the client's Prod AWS account.

When you have all the dependencies needed for all packages installed on your local machine. Run from the root directory:

```script
npm run pub
```

This will:

- Create a CodeArtifact Domain/Repo if necessary
- Build a domain policy for all other accounts that need cross-account access that have an `account.region` and `account.id` defined in the other `*.config.ts` files.
  - (See [`lib/buildCodeArtifact.ts`](lib/buildCodeArtifact.ts))
- Automatically publish all private dependencies, recursively
  - Some versions of admin/voicemail have dependencies on older versions of cdk-resources within their own `node_modules` folder.
- Create an `.npmrc` file in the root directory and every directory within `packages/*`
  - This ensures the repo is installing from CodeArtifact instead of private TTEC repo
- Remove the `node_modules` folder in all applicable directories
- Reinstall dependencies using any published packages in CodeArtifact

---

## Interacting with CodeArtifact Packages directly

If necessary, you can [interact with your packages via your client's code artifact packages directly](https://docs.aws.amazon.com/codeartifact/latest/ug/packages.html) through the use of [npm with code artifact](https://docs.aws.amazon.com/codeartifact/latest/ug/npm-auth.html).

There are two helper scripts in the `bin` directory of this repository that can be copied into any project and is not tied to vmail, the OMP, or CDK.

- `loginToCodeArtifact.sh` will generate `.npmrc` files for you to interact with your packages with. To use this script, follow these steps:

1. `cd` to the root of the repository
2. run `./bin/loginToCodeArtifact.sh --region $REGION --account $ACCOUNT --profile $PROFILE`

- `publishToCodeArtifact.sh` will publish any `@ttec-dig-vf` modules to CodeArtifact. To use this script, follow these steps:

1. `cd` into the `bin` directory
2. run `tsc publishToCodeArtifact.ts && node ./bin/publishToCodeArtifact.js`

## Unit / Integration testing

The test suite within `packages/connect-lambdas` provided is an example comprised of unit tests with jest.
From within the connect-lambdas directory, to run all tests execute:

```bash
npm run test
```

## Important things to know

_NOTE_: If you already have a Connect Instance you plan to use, you can remove the `connect-core` package from the repo just like the other... but the config file will still need the Connect Instance Alias set as follows:

```typescript
  client: 'vf',
  project: 'win',
  //set the instance alias so the connectInstanceId can still be looked up and dynamically configured in other packages when synthing/deploying
  connectCore: {
    instanceAlias: 'preconfigured-instance-alias'
  }
```

_NOTE_: If deleting stacks, by default voicemail and admin apps do not remove cognito resources. In addition, admin does not delete the dynamoDB table resource. The Connect-Storage stack does not delete the S3 bucket. All of these resources will need to be removed manually if you plan on re-deploying.

_NOTE_: Connect as a service limits the number of `CreateInstance` and `DeleteInstance` api calls that can be made against an account in a month. Please only create the instances and try not to build them for branches or you will get locked of building them. This is a hard limit and the number is unpublished. [see here](https://docs.aws.amazon.com/connect/latest/APIReference/API_CreateInstance.html) Once this happens there is nothing you can do about it. You won't even be able to build them from the console at that point.

_NOTE_: The first time you run `npm run synth/deploy` from your local machine the packages will set a placeholder for `connectInstanceId` in CDK stacks that expect one. [see here](packages/admin/infra.ts#L17) This is because the `connect-core` stack is responsible for instantiating the Connect Instance that will be used by all the other apps. Once `connect-core` is deployed future builds of each app will properly populate/update the `connectInstanceId`. (See [lib/getConfig.ts](lib/getConfig.ts) and [lib/getConnectInstanceId.ts](lib/getConnectInstanceId.ts) for implementation)
