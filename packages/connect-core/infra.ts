import { App } from 'aws-cdk-lib';
import { ConnectCore } from './stacks/ConnectCore';
import { getConfig } from '../../lib';

const app = new App();

(async function buildInfra() {
  const config = await getConfig();
  const { prefix, env, connectCore } = config;

  new ConnectCore(app, 'ConnectStack', {
    env,
    prefix,
    ...connectCore
  });

  app.synth();
})();
