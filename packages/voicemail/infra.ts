import { App } from 'aws-cdk-lib';
import { VoiceMailApp } from '@ttec-dig-vf/connect-voicemail';
import { getConfig } from '../../lib';

const app = new App();

(async function buildInfra() {
  const config = await getConfig();
  const { client, project, env, prefix, stage, branch, connectInstanceId, voicemail } = config;
  if (!voicemail) {
    throw new Error(`no voicemail app configuration in ${branch}.config.ts`);
  }
  if (!connectInstanceId) {
    // eslint-disable-next-line no-console
    console.log('no connect instance deployed yet. building with temp string for Id');
  }

  new VoiceMailApp(app, `${prefix}-voicemail`, {
    client,
    project: `${project}-vm`,
    stage,
    connectInstanceId: connectInstanceId ?? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    env,
    ...voicemail
  });

  app.synth();
})();
