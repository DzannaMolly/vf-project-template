import { App } from 'aws-cdk-lib';
import { ConnectLambdas } from './stacks/ConnectLambdas';
import { getConfig } from '../../lib';

const app = new App();

(async function buildInfra() {
  const config = await getConfig();
  const { prefix, client, env, stage, connectInstanceId, connectLambdas } = config;

  if (!connectLambdas) {
    throw new Error(`no connect-lambdas configuration in ${stage}.config.ts`);
  }
  if (!connectInstanceId) {
    // eslint-disable-next-line no-console
    console.log('no connect instance deployed yet. building with temp string for Id');
  }

  new ConnectLambdas(app, `${prefix}-connect-lambdas`, {
    env,
    client,
    stage,
    secretName: `${prefix}-lambdas`,
    prefix,
    connectInstanceId: connectInstanceId ?? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    loggingLevel: connectLambdas.loggingLevel
  });

  app.synth();
})();
