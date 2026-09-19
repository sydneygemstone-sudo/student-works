const fs = require('fs');
const path = require('path');

const srcThree = path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.min.js');
const destDir = path.join(__dirname, '..', 'client', 'vendor');
const destThree = path.join(destDir, 'three.min.js');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcThree)) {
  fs.copyFileSync(srcThree, destThree);
  console.log(`[build] Successfully vendored Three.js to ${destThree}`);
} else {
  console.warn(`[build] Warning: ${srcThree} not found!`);
}
