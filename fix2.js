const fs = require("fs");

// analytics/page.js - stray quote in JSX text
var f1 = "e:/MajorPr/majorpr-app/src/app/analytics/page.js";
var t1 = fs.readFileSync(f1, "utf8");
t1 = t1.replace(
    'No events logged yet " start the camera to begin.',
    'No events logged yet - start the camera to begin.'
);
// Fix unescaped " in JSX text if any remain
t1 = t1.replace(/<p([^>]*)>([^<]*)"([^<]*)<\/p>/g, function(m, attrs, pre, post) {
    return '<p' + attrs + '>' + pre + '&quot;' + post + '</p>';
});
fs.writeFileSync(f1, t1, "utf8");
console.log("Fixed analytics");

// assistant/page.js - bullet point JSX 
var f2 = "e:/MajorPr/majorpr-app/src/app/assistant/page.js";
var t2 = fs.readFileSync(f2, "utf8");
// Fix: return <p ...>"• " + line.slice(2)}</p>  -> return <p ...>• {line.slice(2)}</p>
t2 = t2.replace(
    '>"• " + line.slice(2)}</p>',
    '>• {line.slice(2)}</p>'
);
// Also fix: return <p ...>" {line.slice(2)}</p>
t2 = t2.replace(
    '">" {line.slice(2)}</p>',
    '>• {line.slice(2)}</p>'
);
fs.writeFileSync(f2, t2, "utf8");
console.log("Fixed assistant");

// ScreenDistanceAlert - check for unescaped quotes in JSX text
var f3 = "e:/MajorPr/majorpr-app/src/components/health/ScreenDistanceAlert.js";
var t3 = fs.readFileSync(f3, "utf8");
// Find lines with bare quotes in JSX text (not in attributes)
var lines = t3.split("\n");
lines = lines.map(function(line) {
    // Fix: text content with unescaped "
    if (line.match(/>\s*[^{<"]*"[^{<"]*\s*</) && !line.match(/className|style|href|onClick|placeholder/)) {
        return line.replace(/"(?=[^=])/g, "&quot;");
    }
    return line;
});
t3 = lines.join("\n");
fs.writeFileSync(f3, t3, "utf8");
console.log("Fixed ScreenDistanceAlert");