/**
 * AURA AI — Wellness Assistant Response Engine
 * Context-aware empathetic response system for the AI chat interface.
 */

/**
 * @typedef {Object} AssistantContext
 * @property {number} wellnessScore   - 0-100
 * @property {number} stressScore     - 0-100
 * @property {number} fatigueScore    - 0-100
 * @property {number} focusScore      - 0-100
 * @property {number} burnoutRisk     - 0-100
 * @property {string} cognitiveState  - Human state label
 * @property {number} sessionMinutes  - Current session duration
 * @property {string[]} deviations    - Active behavioral deviations
 */

const EMPATHY_OPENERS = [
    "I can see what you're going through. ",
    "I'm here with you. ",
    "That's completely understandable. ",
    "You're doing well to notice this. ",
    "Let's work through this together. ",
];

function opener() {
    return EMPATHY_OPENERS[Math.floor(Math.random() * EMPATHY_OPENERS.length)];
}

/**
 * Intent classifier — maps user input to intent category.
 * @param {string} input
 * @returns {string} intent
 */
export function classifyIntent(input) {
    const lower = input.toLowerCase();
    if (/tired|fatigue|exhaust|sleep|drows|heavy eye/i.test(lower)) return "fatigue";
    if (/stress|anxious|overwhelm|pressure|panic/i.test(lower)) return "stress";
    if (/focus|distract|concentrate|mind wandering|zoning/i.test(lower)) return "focus";
    if (/burnout|burnt out|can't continue|quitting|breaking/i.test(lower)) return "burnout";
    if (/breath|relax|calm|meditat/i.test(lower)) return "breathing";
    if (/water|hydrat|drink/i.test(lower)) return "hydration";
    if (/break|stretch|move|walk/i.test(lower)) return "movement";
    if (/sleep|rest|night|bed/i.test(lower)) return "sleep";
    if (/score|metric|data|how am i|status/i.test(lower)) return "status";
    if (/help|what can you do|guide/i.test(lower)) return "help";
    if (/hello|hi|hey|good morning|morning/i.test(lower)) return "greeting";
    if (/thank|thanks|appreciate/i.test(lower)) return "gratitude";
    if (/why|explain|what is|how does/i.test(lower)) return "explain";
    return "general";
}

/**
 * Generates a contextual, empathetic response.
 * @param {string} intent
 * @param {AssistantContext} ctx
 * @returns {{ text: string, actions: string[] }}
 */
export function generateResponse(intent, ctx) {
    const {
        wellnessScore = 70,
        stressScore = 30,
        fatigueScore = 25,
        focusScore = 70,
        burnoutRisk = 15,
        cognitiveState = "Steady Flow",
        sessionMinutes = 30,
        deviations = [],
    } = ctx;

    switch (intent) {
        case "greeting": {
            const greets = [
                `Hello! I'm AURA, your cognitive wellness companion. Right now your wellness score is **${wellnessScore}/100** and you're in **${cognitiveState}** mode. How can I help you today?`,
                `Hey! Great to check in. Your current state is **${cognitiveState}** — ${wellnessScore >= 70 ? "you're doing really well! 🌟" : "let's work on improving your wellbeing together."}`,
                `Good to see you! You've been working for **${Math.round(sessionMinutes)} minutes**. ${sessionMinutes > 60 ? "A short break soon would do you good. 💙" : "You're in a great rhythm!"}`
            ];
            return { text: greets[Math.floor(Math.random() * greets.length)], actions: ["Check my status", "I need to relax", "Help me focus"] };
        }

        case "fatigue": {
            const advice = fatigueScore > 60
                ? `${opener()}Your fatigue score is quite high at **${fatigueScore}/100**. Your eyes have been working hard — the EAR data confirms it. Here's what will help most right now:\n\n1. 🌑 Try the **eye palming** exercise (cover eyes with warm palms for 30 seconds)\n2. 💧 Drink water — dehydration directly worsens eye fatigue\n3. ⏱️ Take a **5-minute screen break** — look at something 20 feet away for 20 seconds\n\nShould I start a recovery routine for you?`
                : `Your fatigue level looks manageable at **${fatigueScore}/100**, but it's good to be proactive. Make sure you're blinking consciously, staying hydrated, and taking micro-breaks every 20 minutes.`;
            return { text: advice, actions: ["Start eye recovery", "Take a break now", "Log water"] };
        }

        case "stress": {
            const text = stressScore > 70
                ? `${opener()}Your stress score is **${stressScore}/100** — that's genuinely elevated. Your nervous system is working overtime, and I can see the behavioral signals clearly.\n\nLet me help you right now:\n\n🫁 **4-7-8 Breathing** (19 seconds per cycle) — the fastest evidence-based stress reducer\n📋 **Task breakdown** — overwhelming tasks feel smaller when split into 3-minute actions\n☕ **Step away** — even 3 minutes changes your cortisol profile\n\nYour baseline stress is **${Math.round(ctx.stressScore)}** — this is higher than your normal. Want me to guide you through a breathing session?`
                : `Stress at **${stressScore}/100** — manageable, but worth watching. Your AURA is tracking if it escalates. Try the breathing guide if you feel tension building.`;
            return { text: text, actions: ["Start breathing guide", "Break down my tasks", "What's causing this?"] };
        }

        case "focus": {
            const text = focusScore < 50
                ? `Focus score is at **${focusScore}/100** — your attention seems fragmented. Common causes AURA can see:\n\n${deviations.length > 0 ? "• " + deviations.join("\n• ") + "\n\n" : ""}**To regain focus:**\n1. 🎯 Close all non-essential tabs\n2. 🔕 Enable Focus Mode (reduces UI to essentials)\n3. ⏱️ Start a 25-minute Pomodoro session\n4. 🎵 Consistent ambient sound helps many people\n\nWant me to activate Focus Session Manager?`
                : `Your focus score is solid at **${focusScore}/100**! You're in ${cognitiveState} mode. To deepen this:\n- Keep your current rhythm\n- Your typing consistency is tracking well\n- Optimal sessions are 25-45 minutes — ${sessionMinutes < 25 ? "you're just getting warmed up!" : sessionMinutes > 50 ? "consider a short break soon to maintain this quality." : "you're in the sweet spot!"}`;
            return { text: text, actions: ["Start Focus Session", "Enable Focus Mode", "Pomodoro timer"] };
        }

        case "burnout": {
            const text = burnoutRisk > 60
                ? `${opener()}Your 7-day burnout risk is **${burnoutRisk}%** — this is a serious signal and I'm glad you're paying attention to it.\n\nBurnout isn't weakness. It's a physiological response to sustained overload. Here's your personalized recovery plan:\n\n**Immediate (today):**\n• Cap your session at 2 hours total\n• Take a 15-minute walk\n• Sleep 30 minutes earlier tonight\n\n**This week:**\n• Identify your 3 highest-stress activities and defer one\n• Protect at least one 2-hour block of deep, low-stress work\n• Log your sleep every day — it's the #1 burnout predictor\n\nI'll monitor your risk daily and alert you if it escalates. You're not alone in this. 💙`
                : `Burnout risk at **${burnoutRisk}%** — still in the safe zone. But your awareness is your greatest asset. Keep logging sleep, taking breaks, and staying hydrated.`;
            return { text: text, actions: ["See my risk factors", "Recovery plan", "Sleep log"] };
        }

        case "breathing": {
            return {
                text: `The **4-7-8 breathing technique** is one of the most effective interventions for acute stress:\n\n🫁 **Inhale** through your nose for **4 seconds**\n⏸️ **Hold** your breath for **7 seconds**\n💨 **Exhale** slowly through your mouth for **8 seconds**\n\nOne cycle = 19 seconds. Three cycles = under 1 minute. Research shows it activates your parasympathetic nervous system within seconds.\n\nYour current stress is **${stressScore}/100**. Shall I open the breathing guide now?`,
                actions: ["Open breathing guide", "Tell me more", "Not now"]
            };
        }

        case "status": {
            return {
                text: `📊 **Your AURA Status — Right Now**\n\n| Dimension | Score | Status |\n|---|---|---|\n| Wellness | ${wellnessScore}/100 | ${wellnessScore >= 70 ? "✅" : wellnessScore >= 45 ? "⚠️" : "🚨"} |\n| Stress | ${stressScore}/100 | ${stressScore <= 40 ? "✅" : stressScore <= 65 ? "⚠️" : "🚨"} |\n| Fatigue | ${fatigueScore}/100 | ${fatigueScore <= 35 ? "✅" : fatigueScore <= 60 ? "⚠️" : "🚨"} |\n| Focus | ${focusScore}/100 | ${focusScore >= 65 ? "✅" : focusScore >= 40 ? "⚠️" : "🚨"} |\n| Burnout Risk | ${burnoutRisk}% | ${burnoutRisk <= 25 ? "✅" : burnoutRisk <= 50 ? "⚠️" : "🚨"} |\n\nCognitive state: **${cognitiveState}**\nSession duration: **${Math.round(sessionMinutes)} minutes**\n${deviations.length > 0 ? "\n⚡ " + deviations.join("\n⚡ ") : ""}`,
                actions: ["What should I do?", "See analytics", "Breathing guide"]
            };
        }

        case "help": {
            return {
                text: `I'm **AURA** — your Adaptive Human Wellness Intelligence companion. Here's what I can do:\n\n🧠 **Explain** your cognitive state and what's driving it\n🫁 **Guide** breathing exercises and recovery\n📊 **Interpret** your wellness metrics in plain language\n🎯 **Coach** you back into focus\n💤 **Optimize** your sleep and recovery\n⚡ **Alert** you to burnout risk before it hits\n🏃 **Prompt** movement and hydration reminders\n\nJust talk to me naturally — I understand what you're going through.`,
                actions: ["Check my status", "I'm stressed", "I'm tired", "Help me focus"]
            };
        }

        case "gratitude": {
            const responses = [
                "That means a lot. I'm always here when you need support. 💙",
                "You're welcome! Taking care of your cognitive health is one of the most important things you can do. Keep checking in!",
                "Happy to help. Remember — small consistent habits create massive change over time. You're building something important. 🌟"
            ];
            return { text: responses[Math.floor(Math.random() * responses.length)], actions: [] };
        }

        case "hydration": {
            return {
                text: `Hydration and cognitive performance are directly linked. Even **1-2% dehydration** can reduce cognitive performance by up to 10%.\n\nYour current stress level (**${stressScore}/100**) also increases fluid loss — stressed people need more water, not less.\n\n**Quick guide:**\n• Drink a glass now (200-250ml)\n• Aim for 6-8 glasses over your workday\n• Herbal tea counts — coffee partially counts\n\nI've logged a water sip for you. Your daily count is tracked in the Hydration module.`,
                actions: ["Log water intake", "Set reminders", "Back to wellness"]
            };
        }

        case "movement": {
            return {
                text: `Movement is medicine for your brain. Every 50-60 minutes of desk work, a 2-minute movement break can:\n\n• Reduce cortisol by ~15%\n• Restore 10-15 minutes of focused cognitive work\n• Reduce eye strain and back pain\n\n**Right now:** Try the 4-stretch routine:\n1. 🔄 Neck rolls (10s each side)\n2. 🙆 Shoulder shrugs (hold 3s, release)\n3. 🤲 Wrist circles\n4. 🌑 Eye palming (30s)\n\nYou've been working for **${Math.round(sessionMinutes)} minutes**. ${sessionMinutes > 50 ? "A break is overdue!" : "Build the habit now."}`,
                actions: ["Start movement prompt", "Log a break", "Set movement reminders"]
            };
        }

        case "sleep": {
            return {
                text: `Sleep is the most powerful cognitive performance optimizer that exists — and it's free.\n\nBased on your AURA data:\n• Your current stress (**${stressScore}**) predicts ${stressScore > 60 ? "difficulty falling asleep tonight — let's address this now" : "reasonable sleep conditions tonight"}\n• Fatigue at **${fatigueScore}** suggests your brain ${fatigueScore > 60 ? "needs recovery — earlier bedtime tonight" : "has reserves"}\n\n**Tonight's recommendations:**\n1. Stop screens 45 minutes before bed\n2. Do 3 cycles of 4-7-8 breathing before sleep\n3. Keep your room cool (65-68°F / 18-20°C)\n4. Log your sleep quality tomorrow — it helps AURA personalize your experience\n\nWant to see how your sleep affects your focus scores?`,
                actions: ["Sleep log", "Breathing for sleep", "Sleep correlation chart"]
            };
        }

        default: {
            const stateResponses = {
                high: `I notice you might be going through something intense — your wellness metrics are showing some signals. ${opener()}Tell me more about how you're feeling, and I'll help you find the right support.`,
                medium: `Right now you're in **${cognitiveState}** mode with a wellness score of **${wellnessScore}/100**. Is there something specific you'd like to work on?`,
                good: `You're in a solid **${cognitiveState}** state — wellness at **${wellnessScore}/100**. What's on your mind? I'm here to help optimize your session further.`,
            };
            const level = wellnessScore < 40 ? "high" : wellnessScore < 65 ? "medium" : "good";
            return { text: stateResponses[level], actions: ["Check my status", "I need help", "How do I improve?"] };
        }
    }
}

/**
 * Initial greeting message from AURA.
 * @param {AssistantContext} ctx
 * @returns {{ text: string, actions: string[] }}
 */
export function getWelcomeMessage(ctx) {
    return {
        text: `Hello! I'm **AURA** — your Adaptive Human Wellness Intelligence companion. 🌟\n\nI'm continuously monitoring your cognitive state through your camera, keyboard, and mouse behavior. Right now your overall wellness is **${ctx.wellnessScore}/100** and you're in **${ctx.cognitiveState}** mode.\n\nI can explain your metrics, guide breathing exercises, help you regain focus, or just listen. What would you like to work on?`,
        actions: ["Check my full status", "I need to relax", "Help me focus", "What's my burnout risk?"]
    };
}
