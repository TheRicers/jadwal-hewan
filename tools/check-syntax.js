const fs = require('fs');
const parser = require('@babel/parser');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node tools/check-syntax.js <file...>');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  try {
    parser.parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });
  } catch (error) {
    failed = true;
    console.error(`${file}: ${error.message}`);
  }
}

if (failed) process.exit(1);
