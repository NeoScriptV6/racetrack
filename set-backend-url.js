const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'public', 'backend-url.txt');
fs.writeFileSync(filePath, 'http://localhost:3000', 'utf8');
console.log(`backend-url.txt set to: ${url}`);