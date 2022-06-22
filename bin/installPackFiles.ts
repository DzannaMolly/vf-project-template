import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ROOT_DIR, exec, getDirectoriesAtPath, getPackageDirectories } from '../lib';

async function getTTECPaths() {
  const allDirs = await getPackageDirectories(true);
  let ttecPaths: string[] = [];

  for (const dir of allDirs) {
    const path = resolve(dir, 'node_modules', '@ttec-dig-vf');
    if (!existsSync(path)) {
      continue;
    }
    const packagePaths = await getDirectoriesAtPath(path);
    ttecPaths = ttecPaths.concat(packagePaths);
  }
  return ttecPaths;
}

async function generatePackFiles(paths: string[]) {
  if (!existsSync(resolve(ROOT_DIR, 'packs'))) {
    await exec('mkdir packs');
  }
  const packPromises: Promise<string>[] = [];

  for (const path of paths) {
    packPromises.push(exec(`npm pack ${path} --pack-destination ./packs`));
  }
  await Promise.all(packPromises);
}

function getPackageDir(directory: string) {
  return resolve(directory, '..', '..', '..');
}

async function installPackFiles() {
  const ttecPaths = await getTTECPaths();
  try {
    await generatePackFiles(ttecPaths);

    for (const path of ttecPaths) {
      const packageDir = getPackageDir(path);
      const packageJson = JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf-8'));
      const packageName = packageJson.name.split('/').pop();
      const version = packageJson.version;
      const packFile = resolve(ROOT_DIR, 'packs', `ttec-dig-vf-${packageName}-${version}.tgz`);

      await exec(`(cd ${packageDir} && rimraf package-lock.json)`);
      await exec(`(cd ${packageDir} && rimraf node_modules/@ttec-dig-vf/${packageName})`);
      await exec(`(cd ${packageDir} && npm i ${packFile})`, false);
    }
  } catch (error) {
    console.log(error);
  }
}

if (require.main === module) {
  installPackFiles();
}
