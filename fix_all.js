const fs = require("fs");

// Step 1: undo one round of latin1->utf8 corruption
function undoOneRound(filePath) {
    var raw = fs.readFileSync(filePath, "latin1");
    var bytes = Buffer.alloc(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
    return bytes.toString("utf8");
}

// Step 2: replace all remaining non-ASCII (still-corrupt emoji/special chars) with ASCII equivalents
function replaceNonAscii(text) {
    // Common emoji used in the app - map corrupt sequences to ASCII/text fallbacks
    var map = [
        // Emoji icon strings in AuraCardHeader icon prop and JSX
        [/ðŸ•¸ï¸/g, "O"],        // 🕸️ spider web -> O
        [/ðŸ"Š/g, "|"],           // 📊 bar chart -> |
        [/ðŸ§ /g, "*"],           // 🧠 brain -> *
        [/ðŸ"‹/g, "-"],           // 📋 clipboard -> -
        [/ðŸ"¡/g, "~"],           // 📡 satellite -> ~
        [/ðŸ"ˆ/g, "^"],           // 📈 chart -> ^
        [/ðŸŒ™/g, ")"],           // 🌙 moon -> )
        [/ðŸ"¥/g, "!"],           // 🔥 fire -> !
        [/ðŸ'™/g, "<3"],          // 💙 heart -> <3
        [/ðŸ›¡ï¸/g, "[]"],        // 🛡️ shield -> []
        [/ðŸ"©/g, "@"],           // 📩 email -> @
        [/ðŸ"/g, "#"],            // 🔍 search -> #
        [/ðŸ"/g, ">"],            // 🔎 -> >
        [/ðŸ'§/g, "~"],           // 💧 water -> ~
        [/â­/g, "*"],             // ⭐ star -> *
        // Special chars in text
        [/â€"/g, "-"],            // — em dash -> -
        [/â€˜/g, "'"],            // ' left single quote -> '
        [/â€™/g, "'"],            // ' right single quote -> '
        [/â€œ/g, '"'],            // " left double quote -> "
        [/â€/g, '"'],             // " right double quote -> "
        [/Â·/g, "·"],             // · middle dot (this one is 2-byte in UTF-8, keep as middot)
        [/âš¡/g, "!"],            // ⚡ lightning -> !
        [/â–²/g, "^"],            // ▲ triangle -> ^
        [/âœ"/g, "v"],            // ✓ checkmark -> v
        [/â†'/g, "->"],           // → arrow -> ->
        [/ï¸/g, ""],              // variation selector - just remove
        // Catch-all: replace any remaining sequences starting with typical corruption pattern
        [/[ðŸ][^\s"<>{}[\](),.;:!?]*ï¸?/g, ""],
        [/â[^\s"<>{}[\](),.;:!?'`]*/g, ""],
    ];
    map.forEach(function(pair) { text = text.replace(pair[0], pair[1]); });
    return text;
}

var files = [
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
    var text = undoOneRound(path);
    text = replaceNonAscii(text);
    fs.writeFileSync(path, text, "utf8");
    var remaining = (text.match(/[^\x00-\x7F]/g) || []).length;
    console.log("Done (" + remaining + " non-ascii remain): " + rel.split("/").pop());
});