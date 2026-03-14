const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.js');
const source = fs.readFileSync(indexPath, 'utf8');

const requirePattern = /var (\w+) = require\("([^"]+)"\);/g;
const requires = [];
let match;
while ((match = requirePattern.exec(source)) !== null) {
  requires.push({ varName: match[1], modulePath: match[2] });
}

const exportPattern =
  /Object\.defineProperty\(exports, "(\w+)", \{ enumerable: true, get: function \(\) \{ return (\w+)\.(\w+); \} \}\);/g;
const namedExports = [];
while ((match = exportPattern.exec(source)) !== null) {
  namedExports.push({
    exportName: match[1],
    varName: match[2],
    propName: match[3],
  });
}

const defaultExport = namedExports.find((e) => e.exportName === 'default');
if (!defaultExport) {
  console.log('No default export found in dist/index.js, skipping interop fix.');
  process.exit(0);
}

let output = '"use strict";\n';

for (const req of requires) {
  output += `var ${req.varName} = require("${req.modulePath}");\n`;
}

output += `module.exports = ${defaultExport.varName}.${defaultExport.propName};\n`;
output += `module.exports.__esModule = true;\n`;
output += `module.exports.default = ${defaultExport.varName}.${defaultExport.propName};\n`;

for (const exp of namedExports) {
  if (exp.exportName !== 'default') {
    output += `module.exports.${exp.exportName} = ${exp.varName}.${exp.propName};\n`;
  }
}

fs.writeFileSync(indexPath, output);
console.log('Fixed CJS/ESM interop for dist/index.js');
