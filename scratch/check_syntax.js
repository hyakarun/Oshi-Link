const fs = require('fs');
const content = fs.readFileSync('/Users/mukulogi/Oshi-Link/src/app/page.tsx', 'utf8');

function count(char) {
  return (content.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

console.log('--- Brace/Quote Count ---');
console.log('{ :', count('{'));
console.log('} :', count('}'));
console.log('( :', count('('));
console.log(') :', count(')'));
console.log('< :', count('<'));
console.log('> :', count('>'));
console.log('` :', count('`'));
console.log('" :', count('"'));
console.log("' :", count("'"));

// Check for unclosed template literals
let inBacktick = false;
let backtickLines = [];
const lines = content.split('\n');
lines.forEach((line, i) => {
    const counts = (line.match(/`/g) || []).length;
    if (counts % 2 !== 0) {
        inBacktick = !inBacktick;
        backtickLines.push(i + 1);
    }
});

console.log('\n--- Template Literal Issues ---');
console.log('Unbalanced backtick lines:', backtickLines);
if (inBacktick) console.log('CAUTION: File ends inside a template literal!');

// Simplistic nesting check
let balance = 0;
lines.forEach((line, i) => {
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
        if (balance < 0) {
            console.log(`ERROR: Negative balance at line ${i+1}`);
            balance = 0;
        }
    }
});
console.log('Final balance:', balance);
