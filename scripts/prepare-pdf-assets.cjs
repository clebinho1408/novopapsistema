// PDF.js needs local font/CMap data, including when deployed without internet.
const fs = require('node:fs');
const path = require('node:path');
for (const directory of ['cmaps', 'standard_fonts']) {
  fs.cpSync(path.join('node_modules/pdfjs-dist', directory),
    path.join('public/pdf-assets', directory), { recursive: true });
}
