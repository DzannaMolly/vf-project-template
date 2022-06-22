import { getCAConfig, useCodeArtifact } from '../lib';

if (require.main === module) {
  getCAConfig().then(config => useCodeArtifact({ ...config, updatePackageLock: true }));
}
