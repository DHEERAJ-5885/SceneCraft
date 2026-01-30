

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ---------- helpers ----------
const safeNumber = (v, min, max, fallback) => {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const extractJsonObject = (text) => {
  if (!text || typeof text !== "string") return null;

  // 1) direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // 2) slice from first { to last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const maybe = text.slice(first, last + 1);
  try {
    return JSON.parse(maybe);
  } catch {
    return null;
  }
};

const pickFirstLineAfter = (text, label) => {
  const idx = text.toLowerCase().indexOf(label.toLowerCase());
  if (idx === -1) return "";
  const slice = text.slice(idx + label.length);
  const line = slice.split("\n")[0];
  return (line || "").trim();
};

const extractSettingHints = (scene) => {
  const settingLine = pickFirstLineAfter(scene, "Setting:");
  const vibeLine = pickFirstLineAfter(scene, "Vibe:");
  const titleLine = pickFirstLineAfter(scene, "Title:");

  const lower = scene.toLowerCase();
  const time =
    lower.includes("night") ? "Night"
    : lower.includes("morning") ? "Morning"
    : lower.includes("evening") ? "Evening"
    : lower.includes("day") ? "Day"
    : "Unspecified";

  const charactersGuess = [
    lower.includes("hero") ? "Hero" : null,
    lower.includes("villain") ? "Villain" : null,
    lower.includes("girl") ? "Girl" : null,
    lower.includes("boy") ? "Boy" : null,
    lower.includes("parents") ? "Parents" : null,
    lower.includes("mercenaries") ? "Mercenaries" : null,
  ].filter(Boolean);

  const propsGuess = [
    lower.includes("gun") ? "Gun" : null,
    lower.includes("knife") || lower.includes("blade") ? "Blade/Knife" : null,
    lower.includes("umbrella") ? "Umbrella" : null,
    lower.includes("effigy") ? "Effigy" : null,
    lower.includes("oil lamp") || lower.includes("lamps") ? "Oil lamps" : null,
    lower.includes("chain") ? "Metal chain" : null,
    lower.includes("rain") ? "Rain" : null,
    lower.includes("gulal") ? "Gulal" : null,
    lower.includes("dappu") || lower.includes("drum") ? "Drums" : null,
  ].filter(Boolean);

  return {
    title: titleLine || "Untitled Scene",
    location: settingLine || "Unspecified location",
    vibe: vibeLine || "Cinematic",
    time,
    characters: charactersGuess.length ? charactersGuess.join(", ") : "Unspecified",
    props: propsGuess.length ? propsGuess.join(", ") : "Unspecified",
  };
};

const ensureShots = (shotList) => {
  const shots = Array.isArray(shotList) ? shotList : [];
  const fixed = shots
    .filter((s) => s && typeof s === "object")
    .map((s, idx) => ({
      shot_number: safeNumber(s.shot_number ?? idx + 1, 1, 999, idx + 1),
      shot_type: String(s.shot_type ?? "Shot"),
      camera_movement: String(s.camera_movement ?? "Static"),
      purpose: String(s.purpose ?? "Purpose not provided"),
    }));

  while (fixed.length < 3) {
    fixed.push({
      shot_number: fixed.length + 1,
      shot_type: "Medium Shot",
      camera_movement: "Static",
      purpose: "Extra coverage for clarity",
    });
  }

  return fixed;
};

const normalizeBudget = (b, fallbackTier = "Low") => {
  const tier = String(b?.tier ?? b?.budget_tier ?? fallbackTier);
  const estimate_range_inr = String(b?.estimate_range_inr ?? b?.estimate_range ?? "₹10,000 - ₹50,000");
  const cost_drivers = Array.isArray(b?.cost_drivers) ? b.cost_drivers.map(String).slice(0, 8) : [];
  const money_savers = Array.isArray(b?.money_savers) ? b.money_savers.map(String).slice(0, 8) : [];
  const risks = Array.isArray(b?.risks) ? b.risks.map(String).slice(0, 8) : [];

  return {
    tier,
    estimate_range_inr,
    cost_drivers: cost_drivers.length ? cost_drivers : ["Location/permits", "Lighting", "Transport"],
    money_savers: money_savers.length ? money_savers : ["Use one location", "Natural light", "Minimal crew"],
    risks: risks.length ? risks : ["Safety risk if action/stunts exist", "Continuity issues in long scenes"],
  };
};

const computeConfidence = (breakdown) => {
  const e = safeNumber(breakdown?.emotion_clarity, 0, 1, 0.7);
  const v = safeNumber(breakdown?.visual_clarity, 0, 1, 0.7);
  const n = safeNumber(breakdown?.narrative_clarity, 0, 1, 0.7);
  return Math.round(((e + v + n) / 3) * 100);
};

const normalizeOne = (parsed, hints) => {
  const confidence_breakdown = {
    emotion_clarity: safeNumber(parsed?.confidence_breakdown?.emotion_clarity, 0, 1, 0.7),
    visual_clarity: safeNumber(parsed?.confidence_breakdown?.visual_clarity, 0, 1, 0.7),
    narrative_clarity: safeNumber(parsed?.confidence_breakdown?.narrative_clarity, 0, 1, 0.7),
  };

  const ai_confidence = safeNumber(parsed?.ai_confidence, 0, 100, computeConfidence(confidence_breakdown));

  const si = parsed?.scene_intelligence ?? {};
  const scene_intelligence = {
    intent: String(si.intent ?? "Explain the scene’s goal clearly"),
    emotion: String(si.emotion ?? "Tension"),
    visual_mood: String(si.visual_mood ?? hints.vibe ?? "Cinematic"),
    camera_style: String(si.camera_style ?? "Wide → Medium → Close-up progression"),
  };

  return {
    scene_overview: String(parsed?.scene_overview ?? `A scene set in ${hints.location} with a ${hints.vibe} vibe.`),

    key_beats: Array.isArray(parsed?.key_beats)
      ? parsed.key_beats.map(String).slice(0, 14)
      : [
          "Establish location and mood",
          "Introduce character(s)",
          "Reveal goal/intent",
          "Conflict appears",
          "End on a strong beat",
        ],

    mentor_explanation: String(
      parsed?.mentor_explanation ??
        "Mentor note: Prioritize clarity first. Then add style (lighting, sound, camera) to amplify emotion."
    ),

    beginner_guidance: {
      what_the_audience_should_feel: String(
        parsed?.beginner_guidance?.what_the_audience_should_feel ??
          "Choose ONE emotion (fear/sad/exciting). Make every shot support that emotion."
      ),
      how_to_shoot_this_scene: String(
        parsed?.beginner_guidance?.how_to_shoot_this_scene ??
          "Step 1: Wide shot to show place. Step 2: Medium shot for action. Step 3: Close-up for emotion."
      ),
      why_these_choices_work: String(
        parsed?.beginner_guidance?.why_these_choices_work ??
          "Wide gives context, medium shows action, close-up shows feelings. This is basic film language."
      ),
    },

    scene_analysis: {
      short_summary: String(parsed?.scene_analysis?.short_summary ?? "A clear cinematic beat with strong mood."),
      story_analysis: String(parsed?.scene_analysis?.story_analysis ?? "Define goal, obstacle, and consequence."),
      film_analysis: String(parsed?.scene_analysis?.film_analysis ?? "Use lighting + sound + camera rhythm to shape emotion."),
    },

    scene_intelligence,

    shot_list: ensureShots(parsed?.shot_list),

    director_plan: {
      visual_approach: String(parsed?.director_plan?.visual_approach ?? "Readable blocking, strong silhouettes, motivated camera."),
      lighting_plan: String(parsed?.director_plan?.lighting_plan ?? "One key light + practicals. Use contrast to guide attention."),
      sound_design: String(parsed?.director_plan?.sound_design ?? "Ambience + one signature sound detail + controlled score."),
      pacing: String(parsed?.director_plan?.pacing ?? "Beat-by-beat build → peak → clean ending beat."),
      transition_idea: String(parsed?.director_plan?.transition_idea ?? "Cut on action or cut to reaction for impact."),
    },

    production_notes: {
      budget_fit: String(parsed?.production_notes?.budget_fit ?? "Explainable budget"),
      budget_details: normalizeBudget(parsed?.production_notes?.budget_details ?? parsed?.budget_details ?? parsed?.budget),
      suggestion: String(parsed?.production_notes?.suggestion ?? "Make stakes visible and end the scene on a clear beat."),
    },

    confidence_breakdown,
    ai_confidence,
  };
};

const normalizeOrganizerJson = (oj, hints, confidencePct) => {
  const emotion = String(oj?.emotion ?? "Tension");
  const visual_mood = String(oj?.visual_mood ?? hints.vibe ?? "Cinematic");
  const camera_style = String(oj?.camera_style ?? "Wide → Medium → Close-up progression");
  const confidence = safeNumber(oj?.confidence, 0, 1, safeNumber(confidencePct / 100, 0, 1, 0.75));

  return {
    emotion,
    visual_mood,
    camera_style,
    confidence,
    scene_breakdown: {
      location: String(oj?.scene_breakdown?.location ?? hints.location),
      characters: String(oj?.scene_breakdown?.characters ?? hints.characters),
      props: String(oj?.scene_breakdown?.props ?? hints.props),
      time: String(oj?.scene_breakdown?.time ?? hints.time),
      complexity: String(oj?.scene_breakdown?.complexity ?? "Medium"),
    },
    director_guidance: {
      audience_should_feel: String(oj?.director_guidance?.audience_should_feel ?? emotion),
      visual_feeling: Array.isArray(oj?.director_guidance?.visual_feeling)
        ? oj.director_guidance.visual_feeling.map(String).slice(0, 6)
        : ["Contrast", "Motivated lighting", "Controlled camera movement"],
      camera_help: String(
        oj?.director_guidance?.camera_help ??
          "Start wide for geography, then push-in to increase tension, then close-ups for emotion."
      ),
    },
  };
};

// ---------- route ----------
app.post("/analyze", async (req, res) => {
  try {
    const { scene } = req.body;

    if (!scene || !scene.trim()) {
      return res.status(400).json({ error: "Scene text is required" });
    }

    const hints = extractSettingHints(scene);

    const longHint =
      scene.length > 900
        ? "LONG SCENE: Extract key beats covering the ENTIRE timeline. Do not skip major beats."
        : "SHORT SCENE: Still give full structure.";

    const prompt = `
You are SceneCraft — an expert film mentor + teacher.

RETURN ONLY JSON.
NO markdown. NO backticks. NO explanation outside JSON.

Rules:
- Avoid repeating phrases.
- Key beats must cover full scene (especially long scenes).
- Beginner view: super simple step-by-step.
- Pro view: compact filmmaker language.
- Budget must be explainable: tier + INR range + cost drivers + money savers + risks.
- confidence_breakdown values must be 0..1
- ai_confidence must vary based on confidence_breakdown.

${longHint}

Return EXACTLY this JSON shape:

{
  "pro": {
    "scene_overview": "string",
    "key_beats": ["string"],
    "mentor_explanation": "string",
    "beginner_guidance": {
      "what_the_audience_should_feel": "string",
      "how_to_shoot_this_scene": "string",
      "why_these_choices_work": "string"
    },
    "scene_analysis": {
      "short_summary": "string",
      "story_analysis": "string",
      "film_analysis": "string"
    },
    "scene_intelligence": {
      "intent": "string",
      "emotion": "string",
      "visual_mood": "string",
      "camera_style": "string"
    },
    "shot_list": [
      { "shot_number": 1, "shot_type": "string", "camera_movement": "string", "purpose": "string" }
    ],
    "director_plan": {
      "visual_approach": "string",
      "lighting_plan": "string",
      "sound_design": "string",
      "pacing": "string",
      "transition_idea": "string"
    },
    "production_notes": {
      "budget_fit": "string",
      "budget_details": {
        "tier": "Low|Medium|High",
        "estimate_range_inr": "string",
        "cost_drivers": ["string"],
        "money_savers": ["string"],
        "risks": ["string"]
      },
      "suggestion": "string"
    },
    "confidence_breakdown": {
      "emotion_clarity": 0.0,
      "visual_clarity": 0.0,
      "narrative_clarity": 0.0
    },
    "ai_confidence": 0
  },

  "beginner": {
    "scene_overview": "string",
    "key_beats": ["string"],
    "mentor_explanation": "string",
    "beginner_guidance": {
      "what_the_audience_should_feel": "string",
      "how_to_shoot_this_scene": "string",
      "why_these_choices_work": "string"
    },
    "scene_analysis": {
      "short_summary": "string",
      "story_analysis": "string",
      "film_analysis": "string"
    },
    "scene_intelligence": {
      "intent": "string",
      "emotion": "string",
      "visual_mood": "string",
      "camera_style": "string"
    },
    "shot_list": [
      { "shot_number": 1, "shot_type": "string", "camera_movement": "string", "purpose": "string" }
    ],
    "director_plan": {
      "visual_approach": "string",
      "lighting_plan": "string",
      "sound_design": "string",
      "pacing": "string",
      "transition_idea": "string"
    },
    "production_notes": {
      "budget_fit": "string",
      "budget_details": {
        "tier": "Low|Medium|High",
        "estimate_range_inr": "string",
        "cost_drivers": ["string"],
        "money_savers": ["string"],
        "risks": ["string"]
      },
      "suggestion": "string"
    },
    "confidence_breakdown": {
      "emotion_clarity": 0.0,
      "visual_clarity": 0.0,
      "narrative_clarity": 0.0
    },
    "ai_confidence": 0
  },

  "organizer_json": {
    "emotion": "string",
    "visual_mood": "string",
    "camera_style": "string",
    "confidence": 0.0,
    "scene_breakdown": {
      "location": "string",
      "characters": "string",
      "props": "string",
      "time": "string",
      "complexity": "string"
    },
    "director_guidance": {
      "audience_should_feel": "string",
      "visual_feeling": ["string"],
      "camera_help": "string"
    }
  }
}

Scene:
"""${scene}"""
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.35,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw) || {};

    // If model returns {pro:..., beginner:...} we use it.
    // If not, we still normalize safely.
    const pro = normalizeOne(parsed.pro, hints);
    const beginner = normalizeOne(parsed.beginner, hints);
    const organizer_json = normalizeOrganizerJson(parsed.organizer_json, hints, pro.ai_confidence);

    return res.json({
      ...pro,
      views: { pro, beginner },
      organizer_json,
      json_output: parsed,
      raw_text: raw,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI analysis failed" });
  }
});

app.listen(5000, () => {
  console.log("✅ SceneCraft backend running on http://localhost:5000");
});








// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import Groq from "groq-sdk";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // ---------- helpers ----------
// const safeNumber = (v, min, max, fallback) => {
//   const n = Number(v);
//   if (Number.isNaN(n)) return fallback;
//   return Math.min(max, Math.max(min, n));
// };

// const extractJsonObject = (text) => {
//   if (!text || typeof text !== "string") return null;

//   try {
//     return JSON.parse(text);
//   } catch {}

//   const first = text.indexOf("{");
//   const last = text.lastIndexOf("}");
//   if (first === -1 || last === -1 || last <= first) return null;

//   const maybe = text.slice(first, last + 1);
//   try {
//     return JSON.parse(maybe);
//   } catch {
//     return null;
//   }
// };

// const ensureShots = (shotList) => {
//   const shots = Array.isArray(shotList) ? shotList : [];
//   const fixed = shots
//     .filter((s) => s && typeof s === "object")
//     .map((s, idx) => ({
//       shot_number: safeNumber(s.shot_number ?? idx + 1, 1, 999, idx + 1),
//       shot_type: String(s.shot_type ?? "Shot"),
//       camera_movement: String(s.camera_movement ?? "Static"),
//       purpose: String(s.purpose ?? "Purpose not provided"),
//     }));

//   while (fixed.length < 3) {
//     fixed.push({
//       shot_number: fixed.length + 1,
//       shot_type: "Medium Shot",
//       camera_movement: "Static",
//       purpose: "Extra coverage for clarity",
//     });
//   }

//   return fixed;
// };

// const fallbackBlock = (rawText) => ({
//   scene_overview: "AI could not generate a clean overview. Please try again.",
//   key_beats: [
//     "Who is in the scene?",
//     "Where are we?",
//     "What happens first?",
//     "What is the main conflict?",
//     "What is the final beat?",
//   ],
//   mentor_explanation: rawText || "Mentor explanation unavailable.",
//   beginner_guidance: {
//     what_the_audience_should_feel:
//       "Describe the main emotion (fear, sadness, excitement). Add what the hero wants and what blocks them.",
//     how_to_shoot_this_scene:
//       "Shoot a wide shot for place, a medium shot for action, and a close-up for emotion. Keep it simple and clear.",
//     why_these_choices_work:
//       "Wide gives context, medium shows action, close-up delivers emotion. This is basic cinematic grammar.",
//   },
//   scene_analysis: {
//     short_summary: "Try again with clearer character goal and stakes.",
//     story_analysis: "Add goal, conflict, and consequence to strengthen story meaning.",
//     film_analysis: "Add lighting mood, time of day, and camera style for cinematic feel.",
//   },
//   scene_intelligence: {
//     intent: "Unknown",
//     emotion: "Unknown",
//     visual_mood: "Unknown",
//     camera_style: "Unknown",
//   },
//   shot_list: [
//     { shot_number: 1, shot_type: "Wide Shot", camera_movement: "Static", purpose: "Establish location and situation" },
//     { shot_number: 2, shot_type: "Medium Shot", camera_movement: "Static", purpose: "Show the main action clearly" },
//     { shot_number: 3, shot_type: "Close-Up", camera_movement: "Static", purpose: "Show emotion and reaction" },
//   ],
//   director_plan: {
//     visual_approach: "Keep visuals clean and readable. Clarity first, style second.",
//     lighting_plan: "Use natural light or one key light. Avoid messy shadows unless intentional.",
//     sound_design: "Add ambience + one strong sound detail (chain, breath, rain).",
//     pacing: "Slow build → tension peak → end on a clear beat (reaction/reveal).",
//     transition_idea: "Cut on action or use a close-up reaction to transition.",
//   },
//   production_notes: {
//     budget_fit: "Low",
//     risks: "If goal/stakes are unclear, the scene feels empty.",
//     suggestion: "Add: who wants what, what blocks them, what happens if they fail.",
//   },
//   confidence_breakdown: {
//     emotion_clarity: 0.6,
//     visual_clarity: 0.6,
//     narrative_clarity: 0.6,
//   },
//   ai_confidence: 75,
// });

// const computeConfidence = (breakdown, fallback = 80) => {
//   const e = safeNumber(breakdown?.emotion_clarity, 0, 1, 0.6);
//   const v = safeNumber(breakdown?.visual_clarity, 0, 1, 0.6);
//   const n = safeNumber(breakdown?.narrative_clarity, 0, 1, 0.6);
//   const avg = (e + v + n) / 3;
//   const pct = Math.round(avg * 100);
//   return safeNumber(pct, 0, 100, fallback);
// };

// const normalizeOne = (parsed, rawText) => {
//   const safe = fallbackBlock(rawText);
//   if (!parsed || typeof parsed !== "object") return safe;

//   const confidence_breakdown = {
//     emotion_clarity: safeNumber(
//       parsed.confidence_breakdown?.emotion_clarity,
//       0,
//       1,
//       safe.confidence_breakdown.emotion_clarity
//     ),
//     visual_clarity: safeNumber(
//       parsed.confidence_breakdown?.visual_clarity,
//       0,
//       1,
//       safe.confidence_breakdown.visual_clarity
//     ),
//     narrative_clarity: safeNumber(
//       parsed.confidence_breakdown?.narrative_clarity,
//       0,
//       1,
//       safe.confidence_breakdown.narrative_clarity
//     ),
//   };

//   const ai_confidence =
//     parsed.ai_confidence != null
//       ? safeNumber(parsed.ai_confidence, 0, 100, computeConfidence(confidence_breakdown, 80))
//       : computeConfidence(confidence_breakdown, 80);

//   return {
//     scene_overview: String(parsed.scene_overview ?? safe.scene_overview),
//     key_beats: Array.isArray(parsed.key_beats) ? parsed.key_beats.map(String).slice(0, 12) : safe.key_beats,

//     mentor_explanation: String(parsed.mentor_explanation ?? safe.mentor_explanation),

//     beginner_guidance: {
//       what_the_audience_should_feel: String(
//         parsed.beginner_guidance?.what_the_audience_should_feel ?? safe.beginner_guidance.what_the_audience_should_feel
//       ),
//       how_to_shoot_this_scene: String(
//         parsed.beginner_guidance?.how_to_shoot_this_scene ?? safe.beginner_guidance.how_to_shoot_this_scene
//       ),
//       why_these_choices_work: String(
//         parsed.beginner_guidance?.why_these_choices_work ?? safe.beginner_guidance.why_these_choices_work
//       ),
//     },

//     scene_analysis: {
//       short_summary: String(parsed.scene_analysis?.short_summary ?? safe.scene_analysis.short_summary),
//       story_analysis: String(parsed.scene_analysis?.story_analysis ?? safe.scene_analysis.story_analysis),
//       film_analysis: String(parsed.scene_analysis?.film_analysis ?? safe.scene_analysis.film_analysis),
//     },

//     scene_intelligence: {
//       intent: String(parsed.scene_intelligence?.intent ?? safe.scene_intelligence.intent),
//       emotion: String(parsed.scene_intelligence?.emotion ?? safe.scene_intelligence.emotion),
//       visual_mood: String(parsed.scene_intelligence?.visual_mood ?? safe.scene_intelligence.visual_mood),
//       camera_style: String(parsed.scene_intelligence?.camera_style ?? safe.scene_intelligence.camera_style),
//     },

//     shot_list: ensureShots(parsed.shot_list),

//     director_plan: {
//       visual_approach: String(parsed.director_plan?.visual_approach ?? safe.director_plan.visual_approach),
//       lighting_plan: String(parsed.director_plan?.lighting_plan ?? safe.director_plan.lighting_plan),
//       sound_design: String(parsed.director_plan?.sound_design ?? safe.director_plan.sound_design),
//       pacing: String(parsed.director_plan?.pacing ?? safe.director_plan.pacing),
//       transition_idea: String(parsed.director_plan?.transition_idea ?? safe.director_plan.transition_idea),
//     },

//     production_notes: {
//       budget_fit: String(parsed.production_notes?.budget_fit ?? safe.production_notes.budget_fit),
//       risks: String(parsed.production_notes?.risks ?? safe.production_notes.risks),
//       suggestion: String(parsed.production_notes?.suggestion ?? safe.production_notes.suggestion),
//     },

//     confidence_breakdown,
//     ai_confidence,
//   };
// };

// // ---------- route ----------
// app.post("/analyze", async (req, res) => {
//   try {
//     const { scene } = req.body;

//     if (!scene || !scene.trim()) {
//       return res.status(400).json({ error: "Scene text is required" });
//     }

//     const lengthHint =
//       scene.length > 900
//         ? "NOTE: This is a LONG scene. Do not skip beats. Extract key beats first, then analyze."
//         : "NOTE: This is a short scene. Still provide full structure.";

//     const prompt = `
// You are SceneCraft — an expert film mentor + film teacher.

// RETURN ONLY VALID JSON. No markdown. No extra text.

// We need TWO VIEWS (both mandatory):
// 1) pro: compact, filmmaker language (not too long)
// 2) beginner: very simple language, step-by-step, like teaching a 10th class student

// IMPORTANT RULES:
// - For long scenes: first extract key_beats (5–10 bullets) capturing the whole scene, then use them in analysis.
// - Avoid repeating the same phrases. Use fresh wording.
// - Budget must NOT be generic. Explain WHY (location, actors, stunts, VFX, sound, lighting).
// - confidence_breakdown values must be 0–1.
// - ai_confidence must vary based on confidence_breakdown (not always 85).

// ${lengthHint}

// Return JSON in THIS structure:

// {
//   "pro": {
//     "scene_overview": "string",
//     "key_beats": ["..."],
//     "mentor_explanation": "string",
//     "beginner_guidance": {
//       "what_the_audience_should_feel": "string",
//       "how_to_shoot_this_scene": "string",
//       "why_these_choices_work": "string"
//     },
//     "scene_analysis": {
//       "short_summary": "string",
//       "story_analysis": "string",
//       "film_analysis": "string"
//     },
//     "scene_intelligence": {
//       "intent": "string",
//       "emotion": "string",
//       "visual_mood": "string",
//       "camera_style": "string"
//     },
//     "shot_list": [
//       { "shot_number": 1, "shot_type": "string", "camera_movement": "string", "purpose": "string" }
//     ],
//     "director_plan": {
//       "visual_approach": "string",
//       "lighting_plan": "string",
//       "sound_design": "string",
//       "pacing": "string",
//       "transition_idea": "string"
//     },
//     "production_notes": {
//       "budget_fit": "string",
//       "risks": "string",
//       "suggestion": "string"
//     },
//     "confidence_breakdown": {
//       "emotion_clarity": 0.0,
//       "visual_clarity": 0.0,
//       "narrative_clarity": 0.0
//     },
//     "ai_confidence": 0
//   },

//   "beginner": {
//     "scene_overview": "string",
//     "key_beats": ["..."],
//     "mentor_explanation": "string (more detailed than pro)",
//     "beginner_guidance": {
//       "what_the_audience_should_feel": "string (simple)",
//       "how_to_shoot_this_scene": "string (step-by-step)",
//       "why_these_choices_work": "string (simple explanation)"
//     },
//     "scene_analysis": {
//       "short_summary": "string",
//       "story_analysis": "string (simple)",
//       "film_analysis": "string (simple)"
//     },
//     "scene_intelligence": {
//       "intent": "string",
//       "emotion": "string",
//       "visual_mood": "string",
//       "camera_style": "string"
//     },
//     "shot_list": [
//       { "shot_number": 1, "shot_type": "string", "camera_movement": "string", "purpose": "string" }
//     ],
//     "director_plan": {
//       "visual_approach": "string",
//       "lighting_plan": "string",
//       "sound_design": "string",
//       "pacing": "string",
//       "transition_idea": "string"
//     },
//     "production_notes": {
//       "budget_fit": "string",
//       "risks": "string",
//       "suggestion": "string"
//     },
//     "confidence_breakdown": {
//       "emotion_clarity": 0.0,
//       "visual_clarity": 0.0,
//       "narrative_clarity": 0.0
//     },
//     "ai_confidence": 0
//   },

//   "organizer_json": {
//     "emotion": "string",
//     "visual_mood": "string",
//     "camera_style": "string",
//     "confidence": 0.0,
//     "scene_breakdown": {
//       "location": "string",
//       "characters": "string",
//       "props": "string",
//       "time": "string",
//       "complexity": "string"
//     },
//     "director_guidance": {
//       "audience_should_feel": "string",
//       "visual_feeling": ["..."],
//       "camera_help": "string"
//     }
//   }
// }

// Scene:
// """${scene}"""
// `;

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",
//       temperature: 0.45,
//       messages: [{ role: "user", content: prompt }],
//     });

//     const rawText = completion.choices?.[0]?.message?.content ?? "";
//     const parsed = extractJsonObject(rawText);

//     if (!parsed) {
//       const safe = normalizeOne(null, rawText);
//       // ✅ make confidence consistent even in fallback
//       const sharedBreakdown = safe.confidence_breakdown;
//       const sharedConfidence = computeConfidence(sharedBreakdown, safe.ai_confidence);

//       safe.confidence_breakdown = sharedBreakdown;
//       safe.ai_confidence = sharedConfidence;

//       return res.json({
//         ...safe,
//         views: { pro: safe, beginner: safe },
//         organizer_json: null,
//         json_output: null,
//         raw_text: rawText,
//       });
//     }

//     const pro = normalizeOne(parsed.pro, rawText);
//     const beginner = normalizeOne(parsed.beginner, rawText);

//     // ✅ FIX: ONE confidence + ONE breakdown for BOTH views
//     const sharedBreakdown = {
//       emotion_clarity: safeNumber(
//         (pro.confidence_breakdown.emotion_clarity + beginner.confidence_breakdown.emotion_clarity) / 2,
//         0,
//         1,
//         0.6
//       ),
//       visual_clarity: safeNumber(
//         (pro.confidence_breakdown.visual_clarity + beginner.confidence_breakdown.visual_clarity) / 2,
//         0,
//         1,
//         0.6
//       ),
//       narrative_clarity: safeNumber(
//         (pro.confidence_breakdown.narrative_clarity + beginner.confidence_breakdown.narrative_clarity) / 2,
//         0,
//         1,
//         0.6
//       ),
//     };

//     const sharedConfidence = computeConfidence(sharedBreakdown, 80);

//     pro.confidence_breakdown = sharedBreakdown;
//     beginner.confidence_breakdown = sharedBreakdown;

//     pro.ai_confidence = sharedConfidence;
//     beginner.ai_confidence = sharedConfidence;

//     const organizer_json = parsed.organizer_json ?? null;
//     if (organizer_json) {
//       organizer_json.confidence = safeNumber(organizer_json.confidence, 0, 1, sharedConfidence / 100);
//     }

//     // ✅ Backward compatible response: top-level shows PRO
//     return res.json({
//       ...pro,
//       // force top-level confidence to be shared too
//       confidence_breakdown: sharedBreakdown,
//       ai_confidence: sharedConfidence,

//       views: { pro, beginner },
//       organizer_json,
//       json_output: parsed,
//       raw_text: rawText,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "AI analysis failed" });
//   }
// });

// app.listen(5000, () => {
//   console.log("✅ SceneCraft backend running on http://localhost:5000");
// });



