const fs = require("fs");

var fixes = [
    // PersonalizationContext.js - em dash in string literals stripped, leaving broken strings
    {
        file: "e:/MajorPr/majorpr-app/src/context/PersonalizationContext.js",
        replacements: [
            ['? "Blink rate 40% below your normal " possible eye fatigue"',
             '? "Blink rate 40% below your normal - possible eye fatigue"'],
            [': "Blink rate elevated " possible stress or dry eyes"',
             ': "Blink rate elevated - possible stress or dry eyes"'],
            ['"Typing speed dropped 35% from your baseline " cognitive slowdown detected"',
             '"Typing speed dropped 35% from your baseline - cognitive slowdown detected"'],
            ['"Stress level significantly above your personal baseline"',
             '"Stress level significantly above your personal baseline"'],
        ]
    },
    // DetectionSection.js - em dash in ternary string
    {
        file: "e:/MajorPr/majorpr-app/src/components/DetectionSection.js",
        replacements: [
            ['"CAMERA " LIVE"', '"CAMERA - LIVE"'],
            ['"CAMERA " OFF"', '"CAMERA - OFF"'],
        ]
    },
    // assistant/page.js - bullet point char stripped from string check
    {
        file: "e:/MajorPr/majorpr-app/src/app/assistant/page.js",
        replacements: [
            ['line.startsWith("" ")', 'line.startsWith("• ")'],
            ['"" {line.slice(2)}</p>', '"• " + line.slice(2)}</p>'],
        ]
    },
    // analytics/page.js - unescaped quote left in JSX text
    {
        file: "e:/MajorPr/majorpr-app/src/app/analytics/page.js",
        replacements: [
            [/start the camera to be[^<]*/g, 'start the camera to begin.'],
            ['No events logged yet \\"', 'No events logged yet - '],
        ]
    },
    // ScreenDistanceAlert.js - unescaped quotes
    {
        file: "e:/MajorPr/majorpr-app/src/components/health/ScreenDistanceAlert.js",
        replacements: [
            ['"Your eyes will thank you."', '"Your eyes will thank you."'],
        ]
    },
];

fixes.forEach(function(f) {
    var text = fs.readFileSync(f.file, "utf8");
    f.replacements.forEach(function(pair) {
        if (typeof pair[0] === "string") {
            text = text.split(pair[0]).join(pair[1]);
        } else {
            text = text.replace(pair[0], pair[1]);
        }
    });
    fs.writeFileSync(f.file, text, "utf8");
    console.log("Fixed: " + f.file.split("/").pop());
});