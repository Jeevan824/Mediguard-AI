const fs = require("fs");

// After 1 round we still have 25 non-ascii chars.
// These are the original emoji/special chars that were in the source - they are VALID UTF-8.
// Check: are they actual emoji or still garbled?
var path = "e:/MajorPr/majorpr-app/src/app/analytics/page.js";
var raw = fs.readFileSync(path, "latin1");
var bytes = Buffer.alloc(raw.length);
for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
var decoded = bytes.toString("utf8");

var nonAsciiLines = decoded.split("\n").filter(function(l){ return /[^\x00-\x7F]/.test(l); });
nonAsciiLines.forEach(function(l) { console.log(JSON.stringify(l.trim().slice(0,100))); });