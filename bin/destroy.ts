import { exec } from '../lib/exec';
import { getConfig } from '../lib';

export async function destroy(): Promise<void> {
  const { profile, branch } = await getConfig();
  let _profile = ` --profile ${profile}`;
  if (process.env.CICD) {
    _profile = '';
  }
  // eslint-disable-next-line no-console
  console.log(`>>>
>>> Destroying '${branch}' branch from ${profile} account
>>> Using profile ${profile}
>>>\n\n`);
  try {
    await exec(`npm run cdk -- destroy --all --force${_profile}`);
  } catch {
    process.exit(-1);
  }
}

if (require.main === module) {
  destroy();
}
