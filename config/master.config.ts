import { Configuration } from './Configuration';

const config: Configuration = {
  client: 'client-name',
  project: 'project-name',
  repo: {
    host: 'GitHub',
    name: 'vf-project-template',
    owner: 'DzannaMolly',
    oauthSecretName: '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' //from Secrets Manager
  },
  account: {
    profile: 'default',
    region: 'us-east-1',
    id: '157164668893'
  },
  //see https://github.com/TTEC-Dig-VF/vf-project-template#removing-connect-core
  //if connecting to an existing Connect Instance
  connectCore: {
    instanceAlias: 'contosoanafortest'
  },
  //optional packages:
  //see https://github.com/TTEC-Dig-VF/vf-project-template/blob/main/docs/packages.md#how-to-add-a-package
  //for adding new packages
  admin: {
    adminUserEmail: 'admin@email.com',
    loggingLevel: 'debug',
    retain: true,
    useLayer: true,
    features: {
      calendarManagementEnabled: true,
      configSetManagement: true,
      connectUserManagementEnabled: false,
      flowEngineManagementEnabled: false,
      syncManagementEnabled: false,
      permissionsManagementEnabled: false,
      tenancyEnabled: false
    }
  },
  connectLambdas: {
    loggingLevel: 'debug'
  },
  voicemail: {
    replyEmail: 'reply@email.com'
  }
};
export default config;
