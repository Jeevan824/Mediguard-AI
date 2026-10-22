const fs = require("fs");

// Replace every corrupted icon value with a simple ASCII char, and fix text nodes
// Pattern: icon="<corrupt>" -> icon="x"
// Also fix other corrupt text patterns

var iconMap = {
    "O": "~",        // was spider web
    // these are the ones still failing - need direct byte-level replace
};

var files = [
    "e:/MajorPr/majorpr-app/src/app/analytics/page.js",
    "e:/MajorPr/majorpr-app/src/app/assistant/page.js",
    "e:/MajorPr/majorpr-app/src/app/burnout/page.js",
    "e:/MajorPr/majorpr-app/src/app/powerbi/page.js",
    "e:/MajorPr/majorpr-app/src/app/research/page.js",
    "e:/MajorPr/majorpr-app/src/components/DashboardSection.js",
    "e:/MajorPr/majorpr-app/src/components/DetectionSection.js",
    "e:/MajorPr/majorpr-app/src/components/health/BreathingGuide.js",
    "e:/MajorPr/majorpr-app/src/components/health/HydrationReminder.js",
    "e:/MajorPr/majorpr-app/src/components/health/ScreenDistanceAlert.js",
    "e:/MajorPr/majorpr-app/src/context/PersonalizationContext.js",
];

files.forEach(function(path) {
    var text = fs.readFileSync(path, "utf8");
    var original = text;
    
    // Replace icon="<anything non-ASCII>" with icon="*"
    text = text.replace(/icon="([^"]*[^\x00-\x7F][^"]*)"/g, 'icon="*"');
    
    // Fix text patterns: em dash variants
    text = text.replace(/[^\x00-\x7F]·[^\x00-\x7F]/g, " - ");
    text = text.replace(/·/g, " - ");
    
    // Fix "No events logged yet <corrupt> start" pattern
    text = text.replace(/yet [^\x00-\x7F]+ start/g, "yet - start");
    
    // Fix "Updated in real time" with middle dot
    text = text.replace(/model [^\x00-\x7F]+ Updated/g, "model - Updated");
    text = text.replace(/data [^\x00-\x7F]+ Behavioral/g, "data - Behavioral");
    text = text.replace(/data [^\x00-\x7F]+ Export/g, "data - Export");
    
    // Fix print button with emoji
    text = text.replace(/[^\x00-\x7F]+ Print/g, "Print");
    
    // Fix toggle button text with emoji
    text = text.replace(/\? "[^\x00-\x7F]+ Raw/g, '? "Raw');
    text = text.replace(/: "[^\x00-\x7F]+ Computed"/g, ': "Computed"');
    
    // Catch-all: replace any remaining non-ASCII char sequences in JSX string literals/text
    text = text.replace(/[^\x00-\x7F]+/g, function(match) {
        // Keep if it looks like it might be intentional (> 1 valid UTF-8 sequence?)
        // Just replace all remaining with empty or space
        return "";
    });
    
    fs.writeFileSync(path, text, "utf8");
    var remaining = (text.match(/[^\x00-\x7F]/g) || []).length;
    var changed = text !== original;
    console.log("(" + remaining + " remain, changed=" + changed + "): " + path.split("/").pop());
});