const fs = require("fs");

// 1. assistant/page.js - className string got mangled (missing closing quote)
var f1 = "e:/MajorPr/majorpr-app/src/app/assistant/page.js";
var t1 = fs.readFileSync(f1, "utf8");
t1 = t1.replace(
    'className="text-xs text-gray-300 pl-3>',
    'className="text-xs text-gray-300 pl-3">'
);
fs.writeFileSync(f1, t1, "utf8");
console.log("Fixed assistant className");

// 2. ScreenDistanceAlert - bare " in JSX text (ellipsis was stripped)
var f2 = "e:/MajorPr/majorpr-app/src/components/health/ScreenDistanceAlert.js";
var t2 = fs.readFileSync(f2, "utf8");
// "Calibrating screen distance" (" is the stripped ellipsis …)
t2 = t2.replace(
    'Calibrating screen distance" (',
    'Calibrating screen distance... ('
);
// "Risk of eye strain " please move back"
t2 = t2.replace(
    'Risk of eye strain " please move back.',
    'Risk of eye strain - please move back.'
);
fs.writeFileSync(f2, t2, "utf8");
console.log("Fixed ScreenDistanceAlert text");