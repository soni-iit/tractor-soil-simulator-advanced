// Build:  node build.js
//   index.html  – ADVANCED simulator (v3) built from src/advanced.template.html
//   basic.html  – lightweight v2 calibrated simulator (src/body.html + app.js)
const fs = require('fs'), r = f => fs.readFileSync(__dirname + '/src/' + f, 'utf8');
let adv = r('advanced.template.html')
  .replace('/*@@MODEL@@*/', () => r('model.js'))
  .replace('/*@@DATA@@*/', () => r('data.js'))
  .replace('/*@@ADVHTML@@*/', () => r('advanced.html'))
  .replace('/*@@ADVJS@@*/', () => r('advanced.js'));
fs.writeFileSync(__dirname + '/index.html', adv);
console.log('index.html (advanced) ' + (adv.length / 1024).toFixed(0) + ' KB');
const lite = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tractor–Soil Simulator v2 (calibrated, compact)</title>
<style>\n${r('style.css')}</style></head><body>
${r('body.html')}
<script>\n${r('model.js')}</script>
<script>\n${r('data.js')}</script>
<script>\n${r('app.js')}</script>
</body></html>`;
fs.writeFileSync(__dirname + '/basic.html', lite);
console.log('basic.html (compact v2) ' + (lite.length / 1024).toFixed(0) + ' KB');
