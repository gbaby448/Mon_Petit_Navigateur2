const fs = require('fs');
const code = fs.readFileSync('src/main.js', 'utf8');
const handles = [];
code.split('\n').forEach(function(line, idx) {
    const m = line.match(/ipcMain\.(on|handle)\(['"]([^'"]+)['"]/);
    if (m) handles.push({ name: m[2], line: idx + 1 });
});
const seen = {};
const dups = [];
handles.forEach(function(h) {
    if (seen[h.name]) {
        dups.push({ name: h.name, first: seen[h.name], second: h.line });
    } else {
        seen[h.name] = h.line;
    }
});
console.log('Duplicates found:', dups.length ? JSON.stringify(dups, null, 2) : 'None');
