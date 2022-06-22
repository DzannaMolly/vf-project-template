import { exec, getConfig } from '../lib';

export async function synth(): Promise<void> {
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
  try {
    await exec(`npm run cdk -- synth${_profile}`);
  } catch {
    process.exit(-1);
  }
}

if (require.main === module) {
  synth();
}
