import fs from 'node:fs';
import path from 'node:path';

let errors = 0;

function checkFile(relPath) {
  const fullPath = path.join('docs', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERROR] File missing: ${fullPath}`);
    errors++;
    return;
  }
  const html = fs.readFileSync(fullPath, 'utf8');

  // Check 1: No raw {base|ruby} left in rendered HTML
  const rawRubyMatches = html.match(/\{[^|}<>]+\|[^}<>]+\}/g);
  if (rawRubyMatches) {
    console.error(`[ERROR] ${relPath}: Found ${rawRubyMatches.length} raw unrendered ruby blocks:`, rawRubyMatches.slice(0, 5));
    errors++;
  }

  // Check 2: No <ruby> tags inside <title> or <meta> or JSON-LD
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  if (headMatch) {
    const headHtml = headMatch[0];
    if (/<ruby/i.test(headHtml)) {
      console.error(`[ERROR] ${relPath}: <head> contains <ruby> tag!`);
      errors++;
    }
    if (/\{[^|}<>]+\|/i.test(headHtml)) {
      console.error(`[ERROR] ${relPath}: <head> contains raw ruby syntax!`);
      errors++;
    }
  }

  // Check 3: Check ruby tag well-formedness
  const rubyCount = (html.match(/<ruby>/g) || []).length;
  const rubyCloseCount = (html.match(/<\/ruby>/g) || []).length;
  const rtCount = (html.match(/<rt>/g) || []).length;
  const rtCloseCount = (html.match(/<\/rt>/g) || []).length;

  if (rubyCount !== rubyCloseCount || rtCount !== rtCloseCount || rubyCount !== rtCount) {
    console.error(`[ERROR] ${relPath}: Tag mismatch! <ruby>=${rubyCount}, </ruby>=${rubyCloseCount}, <rt>=${rtCount}, </rt>=${rtCloseCount}`);
    errors++;
  }

  console.log(`OK: ${relPath} (${rubyCount} ruby tags rendered, metadata clean)`);
}

console.log('--- Verifying Japanese pages ---');
checkFile('ja/index.html');
checkFile('ja/bonus/index.html');
for (let n = 1; n <= 12; n++) {
  checkFile(`ja/ep${String(n).padStart(2, '0')}/index.html`);
}

if (errors === 0) {
  console.log('\nALL HTML VERIFICATION CHECKS PASSED PERFECTLY!');
} else {
  console.error(`\nFound ${errors} errors in HTML verification.`);
  process.exit(1);
}
