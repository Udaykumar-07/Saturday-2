import { execSync } from 'child_process';
import fs from 'fs';

console.log('Fetching expo-modules-core@2.2.3 tarball...');
execSync('npm pack expo-modules-core@2.2.3', { stdio: 'inherit' });

console.log('Extracting archive...');
execSync('tar -xzf expo-modules-core-2.2.3.tgz', { stdio: 'inherit' });

console.log('Copying full package into node_modules/expo-modules-core...');
fs.cpSync('package', 'node_modules/expo-modules-core', { recursive: true, force: true });

fs.rmSync('package', { recursive: true, force: true });
fs.rmSync('expo-modules-core-2.2.3.tgz', { force: true });

const targetFile = 'node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/types/ConcreteTypedArrays.kt';
console.log('Verification check:', targetFile, '->', fs.existsSync(targetFile));
