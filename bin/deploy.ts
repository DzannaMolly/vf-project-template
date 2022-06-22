import { exec } from '../lib/exec';
import { getConfig } from '../lib';

export async function deploy(): Promise<void> {
  const { profile, branch } = await getConfig();
  let _profile = ` --profile ${profile}`;
  if (process.env.CICD) {
    _profile = '';
  }
  // eslint-disable-next-line no-console
  console.log(`>>>
>>> Synthesizing '${branch}' branch for deploy to ${profile} account
>>> Using profile ${_profile === '' ? 'default' : profile}
>>>\n\n`);
  const stackName: string = process.env.STACK || '--all';
  try {
    await exec(`npm run cdk -- deploy ${stackName} --require-approval never${_profile}`);
  } catch {
    process.exit(-1);
  }
}

if (require.main === module) {
  deploy();
}
