import fs from 'node:fs';
import path from 'node:path';

const kyouiku = new Set([...fs.readFileSync('tools/kyouiku.txt', 'utf8')]);
const juniorHigh = new Set([...fs.readFileSync('tools/junior_high.txt', 'utf8')]);

console.log('Kyouiku kanji set size:', kyouiku.size);
console.log('Junior high kanji set size:', juniorHigh.size);

function findUnrubied(text) {
  // Replace existing ruby blocks {A|B} with placeholders of the same length or ignore them
  // A ruby block is {base|ruby}
  const rubyRegex = /\{([^|}]+)\|([^}]+)\}/g;
  let clean = '';
  let lastIndex = 0;
  let match;
  
  const ranges = [];
  while ((match = rubyRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, base: match[1], ruby: match[2] });
  }

  function isInsideRuby(idx) {
    return ranges.some(r => idx >= r.start && idx < r.end);
  }

  const unrubied = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Check if kanji
    if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(ch)) {
      if (!kyouiku.has(ch) && !isInsideRuby(i)) {
        // Find word context around i
        const start = Math.max(0, i - 10);
        const end = Math.min(text.length, i + 10);
        const snippet = text.slice(start, end).replace(/\n/g, ' ');
        unrubied.push({ char: ch, pos: i, snippet });
      }
    }
  }
  return unrubied;
}

const files = fs.readdirSync('chapters/ja')
  .filter(f => f.startsWith('ep') && f.endsWith('.md'))
  .map(f => path.join('chapters/ja', f));

let totalUnrubied = 0;
const charCounts = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const results = findUnrubied(content);
  totalUnrubied += results.length;
  results.forEach(r => {
    charCounts[r.char] = (charCounts[r.char] || 0) + 1;
  });
  console.log(`${file}: ${results.length} unrubied junior high kanji`);
}

console.log(`\nTotal unrubied junior high kanji occurrences across all chapters: ${totalUnrubied}`);
console.log(`Unique unrubied kanji characters: ${Object.keys(charCounts).length}`);
const sorted = Object.entries(charCounts).sort((a, b) => b[1] - a[1]);
console.log('\nTop unrubied characters:', sorted.slice(0, 30).map(([c, n]) => `${c}:${n}`).join(' '));
