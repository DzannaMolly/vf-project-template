import { useGitHub } from '../lib';

if (require.main === module) {
  useGitHub({ updatePackageLock: true });
}
