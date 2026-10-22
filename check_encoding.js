const fs = require("fs");

// The corruption happened multiple times. Check how deep by trying to decode iteratively.
function tryFix(str) {
    // Keep decoding latin1->utf8 until stable
    var prev = str;
    for (var attempt = 0; attempt < 5; attempt++) {
        var bytes = Buffer.alloc(prev.length);
        for (var i = 0; i < prev.length; i++) {
            bytes[i] = prev.charCodeAt(i) & 0xFF;
        }
        var next;
        try { next = bytes.toString("utf8"); } catch(e) { break; }
        // Check if it improved (fewer non-ASCII replacement chars)
        var badCount = (next.match(/\uFFFD|[\x80-\x9F]/g) || []).length;
        var prevBadCount = (prev.match(/[\x80-\xFF]/g) || []).length;
        if (badCount === 0 && prevBadCount > 0) { prev = next; break; }
        if (next === prev) break;
        prev = next;
    }
    return prev;
}

// Better: just check how many rounds are needed on one file
var path = "e:/MajorPr/majorpr-app/src/app/analytics/page.js";
var raw = fs.readFileSync(path, "latin1");
console.log("Round 0 non-ascii:", (raw.match(/[^\x00-\x7F]/g)||[]).length);
for (var round = 1; round <= 4; round++) {
    var bytes = Buffer.alloc(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
    var decoded;
    try { decoded = bytes.toString("utf8"); } catch(e) { console.log("Round " + round + " failed: " + e); break; }
    console.log("Round " + round + " non-ascii:", (decoded.match(/[^\x00-\x7F]/g)||[]).length, "sample:", decoded.split("\n").filter(function(l){return /[^\x00-\x7F]/.test(l);})[0] || "NONE");
    raw = decoded;
    if ((decoded.match(/[^\x00-\x7F]/g)||[]).length < 50) break;
}