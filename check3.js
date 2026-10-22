const fs = require("fs");
var files = [
    "src/app/analytics/page.js",
    "src/app/burnout/page.js",
    "src/app/powerbi/page.js",
];
files.forEach(function(rel) {
    var content = fs.readFileSync("e:/MajorPr/majorpr-app/" + rel, "utf8");
    var bad = content.split("\n").filter(function(l){ return /[^\x00-\x7F]/.test(l); });
    console.log("=== " + rel.split("/").pop() + " ===");
    bad.slice(0,5).forEach(function(l){ console.log(JSON.stringify(l.trim().slice(0,100))); });
});