#!/bin/bash
# 将 SMP工业AI平台-原型v2.html (JSX源文件) 编译为纯JS版本
# 用法: ./prototype/build.sh
set -e
cd "$(dirname "$0")/.."

SRC="prototype/SMP工业AI平台-原型v2.html"
OUT="prototype/SMP工业AI平台-原型v2-compiled.html"
BABEL_TOOLS="/tmp/babel-tools"

# 安装 Babel（仅首次）
if [ ! -d "$BABEL_TOOLS/node_modules/@babel/core" ]; then
  echo "Installing Babel tools..."
  npm install --prefix $BABEL_TOOLS @babel/core @babel/plugin-transform-react-jsx 2>&1 | tail -2
fi

node - <<'JSEOF'
const fs = require('fs');
const babel = require('/tmp/babel-tools/node_modules/@babel/core');
const jsxPlugin = require('/tmp/babel-tools/node_modules/@babel/plugin-transform-react-jsx');

const html = fs.readFileSync('prototype/SMP工业AI平台-原型v2.html', 'utf8');
const m = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!m) { console.error('No babel script found'); process.exit(1); }

const t0 = Date.now();
const result = babel.transformSync(m[1], {
  plugins: [[jsxPlugin, {runtime:'classic'}]],
  filename: 'app.jsx',
});
console.log(`Compiled ${m[1].split('\n').length} lines in ${Date.now()-t0}ms`);

let compiled = html.replace(
  /<script type="text\/babel">[\s\S]*?<\/script>/,
  `<script>\n${result.code}\n</script>`
);
// Remove Babel CDN (not needed in compiled version)
compiled = compiled.replace('<script src="https://unpkg.com/@babel/standalone@7.23.2/babel.min.js"></script>\n','');

fs.writeFileSync('prototype/SMP工业AI平台-原型v2-compiled.html', compiled);
console.log('Output: prototype/SMP工业AI平台-原型v2-compiled.html');
JSEOF
