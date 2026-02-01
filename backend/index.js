

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



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ SceneCraft backend running on port ${PORT}`);
});




// the waste code cgnage trying 
