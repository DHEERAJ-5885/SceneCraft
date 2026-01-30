// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import Groq from "groq-sdk";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// app.post("/analyze", async (req, res) => {
//   try {
//     const { scene } = req.body;

//     if (!scene || scene.trim().length < 10) {
//       return res.json({
//         analysis: "Scene is too short to analyze meaningfully.",
//       });
//     }

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.1-8b-instant",

//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a professional film director and screenwriting analyst. Analyze scenes clearly for filmmakers.",
//         },
//         {
//           role: "user",
//           content: `Analyze this film scene in detail:\n\n${scene}`,
//         },
//       ],
//       temperature: 0.7,
//     });

//     const output = completion.choices[0]?.message?.content;

//     if (!output) {
//       throw new Error("Empty AI response");
//     }

//     console.log("✅ AI RESPONSE GENERATED");

//     res.json({ analysis: output });
//   } catch (error) {
//     console.error("❌ AI ERROR:", error.message);
//     res.json({
//       analysis: "AI could not analyze the scene.",
//     });
//   }
// });

// app.listen(5000, () => {
//   console.log("✅ SceneCraft backend running on http://localhost:5000");
// });



/**
 * SceneCraft Backend
 * Option B Architecture
 * AI = Creative Brain
 * Backend = Structure + Stability
 *
 * Old logic is preserved in comments for clarity.
 */

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import fetch from "node-fetch";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = 5000;

// /* ================================
//    🔹 HEALTH CHECK
// ================================ */
// app.get("/", (req, res) => {
//   res.send("✅ SceneCraft backend running");
// });

// /* ================================
//    🔹 MAIN ANALYSIS ENDPOINT
// ================================ */
// app.post("/analyze", async (req, res) => {
//   const { scene } = req.body;

//   if (!scene || scene.trim().length < 10) {
//     return res.status(400).json({
//       error: "Scene description too short"
//     });
//   }

//   try {
//     /* =====================================================
//        🔹 OLD LOGIC (KEPT FOR REFERENCE)
//        -----------------------------------------------------
//        Previously:
//        - Directly trusted AI JSON
//        - Crashed on invalid responses
//        - Model instability caused failures
//     ===================================================== */

//     /*
//     const aiResponse = await callAI(scene);
//     const parsed = JSON.parse(aiResponse);
//     return res.json(parsed);
//     */

//     /* =====================================================
//        ✅ NEW OPTION B LOGIC (STABLE)
//        -----------------------------------------------------
//        - AI gives creative insight (unstructured allowed)
//        - Backend builds reliable structure
//     ===================================================== */

//     const aiText = await callAI(scene);

//     console.log("RAW AI DATA:\n", aiText);

//     // 🔹 STEP 1: Extract creative meaning safely
//     const creative = extractCreativeInsights(aiText);

//     // 🔹 STEP 2: Backend derives production intelligence
//     const breakdown = generateSceneBreakdown(scene);
//     const productionNotes = generateProductionNotes(breakdown);

//     // 🔹 STEP 3: Final structured response (ALWAYS VALID)
//     const finalResponse = {
//       analysis: {
//         short_summary: creative.short_summary,
//         story_analysis: creative.story_analysis,
//         film_analysis: creative.film_analysis
//       },
//       scene_intelligence: {
//         intent: creative.intent,
//         emotion: creative.emotion,
//         visual_mood: creative.visual_mood,
//         camera_style: creative.camera_style
//       },
//       breakdown,
//       production_notes: productionNotes,
//       confidence: creative.confidence
//     };

//     return res.json(finalResponse);

//   } catch (error) {
//     console.error("❌ AI ERROR:", error.message);

//     // Absolute fallback (never crash frontend)
//     return res.json({
//       analysis: {
//         short_summary: "AI could not fully analyze the scene.",
//         story_analysis: "Please refine the scene description.",
//         film_analysis: "Consider adding location, emotion, or action."
//       },
//       scene_intelligence: {
//         intent: "unknown",
//         emotion: "unknown",
//         visual_mood: "neutral",
//         camera_style: "static"
//       },
//       breakdown: {
//         location: "Unknown",
//         characters: "Unknown",
//         props: "Unknown",
//         time: "Unknown",
//         complexity: "Low"
//       },
//       production_notes: {
//         budget_fit: "Low",
//         risks: ["Insufficient scene detail"],
//         suggestion: "Add more descriptive elements"
//       },
//       confidence: 0.3
//     });
//   }
// });

// /* ================================
//    🔹 AI CALL FUNCTION
// ================================ */
// async function callAI(scene) {
//   const apiKey = process.env.GROQ_API_KEY;

//   const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${apiKey}`
//     },
//     body: JSON.stringify({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         {
//           role: "system",
//           content: "You are a film analyst. Explain scenes clearly."
//         },
//         {
//           role: "user",
//           content: scene
//         }
//       ]
//     })
//   });

//   const data = await response.json();

//   if (!data.choices || !data.choices[0]) {
//     throw new Error("Invalid AI response");
//   }

//   return data.choices[0].message.content;
// }

// /* ================================
//    🔹 CREATIVE EXTRACTION (SAFE)
// ================================ */
// function extractCreativeInsights(text) {
//   return {
//     short_summary: extractSentence(text, 1),
//     story_analysis: extractSentence(text, 2),
//     film_analysis: extractSentence(text, 3),
//     intent: guessIntent(text),
//     emotion: guessEmotion(text),
//     visual_mood: guessMood(text),
//     camera_style: guessCamera(text),
//     confidence: 0.8
//   };
// }

// /* ================================
//    🔹 BACKEND INTELLIGENCE
// ================================ */
// function generateSceneBreakdown(scene) {
//   return {
//     location: detectLocation(scene),
//     characters: detectCharacters(scene),
//     props: detectProps(scene),
//     time: detectTime(scene),
//     complexity: detectComplexity(scene)
//   };
// }

// function generateProductionNotes(breakdown) {
//   return {
//     budget_fit: breakdown.complexity === "High" ? "High" : "Low–Medium",
//     risks: [
//       breakdown.time === "Night" ? "Lighting challenges" : null,
//       breakdown.location.includes("abandoned") ? "Safety concerns" : null
//     ].filter(Boolean),
//     suggestion: "Consider controlled lighting and minimal crew"
//   };
// }

// /* ================================
//    🔹 SIMPLE HEURISTICS (STABLE)
// ================================ */
// function extractSentence(text, index) {
//   const sentences = text.split(".").filter(s => s.trim().length > 10);
//   return sentences[index - 1] || sentences[0] || "Not available";
// }

// function detectLocation(scene) {
//   if (scene.toLowerCase().includes("temple")) return "Temple";
//   if (scene.toLowerCase().includes("house")) return "House";
//   return "General Location";
// }

// function detectCharacters(scene) {
//   if (scene.toLowerCase().includes("hero")) return "Hero";
//   return "Multiple / Unknown";
// }

// function detectProps(scene) {
//   return "Torch, Door, Environment elements";
// }

// function detectTime(scene) {
//   if (scene.toLowerCase().includes("night")) return "Night";
//   return "Day / Unspecified";
// }

// function detectComplexity(scene) {
//   return scene.length > 150 ? "Medium" : "Low";
// }

// function guessIntent(text) {
//   if (text.toLowerCase().includes("explore")) return "Exploration";
//   return "Discovery";
// }

// function guessEmotion(text) {
//   if (text.toLowerCase().includes("fear")) return "Fear";
//   return "Curiosity";
// }

// function guessMood(text) {
//   return "Mysterious";
// }

// function guessCamera(text) {
//   return "Establishing shots and close-ups";
// }

// /* ================================
//    🔹 SERVER START
// ================================ */
// app.listen(PORT, () => {
//   console.log(`✅ SceneCraft backend running on http://localhost:${PORT}`);
// });









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

  try {
    return JSON.parse(text);
  } catch {}

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

const fallbackBlock = (rawText) => ({
  scene_overview: "AI could not generate a clean overview. Please try again.",
  key_beats: [
    "Who is in the scene?",
    "Where are we?",
    "What happens first?",
    "What is the main conflict?",
    "What is the final beat?",
  ],
  mentor_explanation: rawText || "Mentor explanation unavailable.",
  beginner_guidance: {
    what_the_audience_should_feel:
      "Describe the main emotion (fear, sadness, excitement). Add what the hero wants and what blocks them.",
    how_to_shoot_this_scene:
      "Shoot a wide shot for place, a medium shot for action, and a close-up for emotion. Keep it simple and clear.",
    why_these_choices_work:
      "Wide gives context, medium shows action, close-up delivers emotion. This is basic cinematic grammar.",
  },
  scene_analysis: {
    short_summary: "Try again with clearer character goal and stakes.",
    story_analysis: "Add goal, conflict, and consequence to strengthen story meaning.",
    film_analysis: "Add lighting mood, time of day, and camera style for cinematic feel.",
  },
  scene_intelligence: {
    intent: "Unknown",
    emotion: "Unknown",
    visual_mood: "Unknown",
    camera_style: "Unknown",
  },
  shot_list: [
    { shot_number: 1, shot_type: "Wide Shot", camera_movement: "Static", purpose: "Establish location and situation" },
    { shot_number: 2, shot_type: "Medium Shot", camera_movement: "Static", purpose: "Show the main action clearly" },
    { shot_number: 3, shot_type: "Close-Up", camera_movement: "Static", purpose: "Show emotion and reaction" },
  ],
  director_plan: {
    visual_approach: "Keep visuals clean and readable. Clarity first, style second.",
    lighting_plan: "Use natural light or one key light. Avoid messy shadows unless intentional.",
    sound_design: "Add ambience + one strong sound detail (chain, breath, rain).",
    pacing: "Slow build → tension peak → end on a clear beat (reaction/reveal).",
    transition_idea: "Cut on action or use a close-up reaction to transition.",
  },
  production_notes: {
    budget_fit: "Low",
    risks: "If goal/stakes are unclear, the scene feels empty.",
    suggestion: "Add: who wants what, what blocks them, what happens if they fail.",
  },
  confidence_breakdown: {
    emotion_clarity: 0.6,
    visual_clarity: 0.6,
    narrative_clarity: 0.6,
  },
  ai_confidence: 75,
});

const computeConfidence = (breakdown, fallback = 80) => {
  const e = safeNumber(breakdown?.emotion_clarity, 0, 1, 0.6);
  const v = safeNumber(breakdown?.visual_clarity, 0, 1, 0.6);
  const n = safeNumber(breakdown?.narrative_clarity, 0, 1, 0.6);
  const avg = (e + v + n) / 3;
  const pct = Math.round(avg * 100);
  return safeNumber(pct, 0, 100, fallback);
};

const normalizeOne = (parsed, rawText) => {
  const safe = fallbackBlock(rawText);
  if (!parsed || typeof parsed !== "object") return safe;

  const confidence_breakdown = {
    emotion_clarity: safeNumber(
      parsed.confidence_breakdown?.emotion_clarity,
      0,
      1,
      safe.confidence_breakdown.emotion_clarity
    ),
    visual_clarity: safeNumber(
      parsed.confidence_breakdown?.visual_clarity,
      0,
      1,
      safe.confidence_breakdown.visual_clarity
    ),
    narrative_clarity: safeNumber(
      parsed.confidence_breakdown?.narrative_clarity,
      0,
      1,
      safe.confidence_breakdown.narrative_clarity
    ),
  };

  const ai_confidence =
    parsed.ai_confidence != null
      ? safeNumber(parsed.ai_confidence, 0, 100, computeConfidence(confidence_breakdown, 80))
      : computeConfidence(confidence_breakdown, 80);

  return {
    scene_overview: String(parsed.scene_overview ?? safe.scene_overview),
    key_beats: Array.isArray(parsed.key_beats) ? parsed.key_beats.map(String).slice(0, 12) : safe.key_beats,

    mentor_explanation: String(parsed.mentor_explanation ?? safe.mentor_explanation),

    beginner_guidance: {
      what_the_audience_should_feel: String(
        parsed.beginner_guidance?.what_the_audience_should_feel ?? safe.beginner_guidance.what_the_audience_should_feel
      ),
      how_to_shoot_this_scene: String(
        parsed.beginner_guidance?.how_to_shoot_this_scene ?? safe.beginner_guidance.how_to_shoot_this_scene
      ),
      why_these_choices_work: String(
        parsed.beginner_guidance?.why_these_choices_work ?? safe.beginner_guidance.why_these_choices_work
      ),
    },

    scene_analysis: {
      short_summary: String(parsed.scene_analysis?.short_summary ?? safe.scene_analysis.short_summary),
      story_analysis: String(parsed.scene_analysis?.story_analysis ?? safe.scene_analysis.story_analysis),
      film_analysis: String(parsed.scene_analysis?.film_analysis ?? safe.scene_analysis.film_analysis),
    },

    scene_intelligence: {
      intent: String(parsed.scene_intelligence?.intent ?? safe.scene_intelligence.intent),
      emotion: String(parsed.scene_intelligence?.emotion ?? safe.scene_intelligence.emotion),
      visual_mood: String(parsed.scene_intelligence?.visual_mood ?? safe.scene_intelligence.visual_mood),
      camera_style: String(parsed.scene_intelligence?.camera_style ?? safe.scene_intelligence.camera_style),
    },

    shot_list: ensureShots(parsed.shot_list),

    director_plan: {
      visual_approach: String(parsed.director_plan?.visual_approach ?? safe.director_plan.visual_approach),
      lighting_plan: String(parsed.director_plan?.lighting_plan ?? safe.director_plan.lighting_plan),
      sound_design: String(parsed.director_plan?.sound_design ?? safe.director_plan.sound_design),
      pacing: String(parsed.director_plan?.pacing ?? safe.director_plan.pacing),
      transition_idea: String(parsed.director_plan?.transition_idea ?? safe.director_plan.transition_idea),
    },

    production_notes: {
      budget_fit: String(parsed.production_notes?.budget_fit ?? safe.production_notes.budget_fit),
      risks: String(parsed.production_notes?.risks ?? safe.production_notes.risks),
      suggestion: String(parsed.production_notes?.suggestion ?? safe.production_notes.suggestion),
    },

    confidence_breakdown,
    ai_confidence,
  };
};

// ---------- route ----------
app.post("/analyze", async (req, res) => {
  try {
    const { scene } = req.body;

    if (!scene || !scene.trim()) {
      return res.status(400).json({ error: "Scene text is required" });
    }

    const lengthHint =
      scene.length > 900
        ? "NOTE: This is a LONG scene. Do not skip beats. Extract key beats first, then analyze."
        : "NOTE: This is a short scene. Still provide full structure.";

    const prompt = `
You are SceneCraft — an expert film mentor + film teacher.

RETURN ONLY VALID JSON. No markdown. No extra text.

We need TWO VIEWS (both mandatory):
1) pro: compact, filmmaker language (not too long)
2) beginner: very simple language, step-by-step, like teaching a 10th class student

IMPORTANT RULES:
- For long scenes: first extract key_beats (5–10 bullets) capturing the whole scene, then use them in analysis.
- Avoid repeating the same phrases. Use fresh wording.
- Budget must NOT be generic. Explain WHY (location, actors, stunts, VFX, sound, lighting).
- confidence_breakdown values must be 0–1.
- ai_confidence must vary based on confidence_breakdown (not always 85).

${lengthHint}

Return JSON in THIS structure:

{
  "pro": {
    "scene_overview": "string",
    "key_beats": ["..."],
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
      "risks": "string",
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
    "key_beats": ["..."],
    "mentor_explanation": "string (more detailed than pro)",
    "beginner_guidance": {
      "what_the_audience_should_feel": "string (simple)",
      "how_to_shoot_this_scene": "string (step-by-step)",
      "why_these_choices_work": "string (simple explanation)"
    },
    "scene_analysis": {
      "short_summary": "string",
      "story_analysis": "string (simple)",
      "film_analysis": "string (simple)"
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
      "risks": "string",
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
      "visual_feeling": ["..."],
      "camera_help": "string"
    }
  }
}

Scene:
"""${scene}"""
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.45,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = completion.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(rawText);

    if (!parsed) {
      const safe = normalizeOne(null, rawText);
      return res.json({
        ...safe,
        views: { pro: safe, beginner: safe },
        organizer_json: null,
        json_output: null,
        raw_text: rawText,
      });
    }

    const pro = normalizeOne(parsed.pro, rawText);
    const beginner = normalizeOne(parsed.beginner, rawText);
    const organizer_json = parsed.organizer_json ?? null;

    return res.json({
      ...pro,
      views: { pro, beginner },
      organizer_json,
      json_output: parsed,
      raw_text: rawText,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI analysis failed" });
  }
});

app.listen(5000, () => {
  console.log("✅ SceneCraft backend running on http://localhost:5000");
});
