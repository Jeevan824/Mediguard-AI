const fs = require("fs");

function fixEncoding(str) {
    const bytes = Buffer.alloc(str.length);
    for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xFF;
    }
    return bytes.toString("utf8");
}

const files = [
    "src/app/analytics/page.js",
    "src/app/assistant/page.js",
    "src/app/burnout/page.js",
    "src/app/powerbi/page.js",
    "src/app/research/page.js",
    "src/components/DashboardSection.js",
    "src/components/DetectionSection.js",
    "src/components/health/BreathingGuide.js",
    "src/components/health/HydrationReminder.js",
    "src/components/health/ScreenDistanceAlert.js",
    "src/context/PersonalizationContext.js",
];

files.forEach(function(rel) {
    var path = "e:/MajorPr/majorpr-app/" + rel;
    var raw = fs.readFileSync(path, "latin1");
    var fixed = fixEncoding(raw);
    fs.writeFileSync(path, fixed, "utf8");
    var check = fs.readFileSync(path, "utf8");
    var stillBad = /\uFFFD/.test(check) || check.indexOf("Â·") !== -1 || check.indexOf("ðŸ") !== -1;
    console.log((stillBad ? "STILL BAD" : "OK") + ": " + rel.split("/").pop());
});