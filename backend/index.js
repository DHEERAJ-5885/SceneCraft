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

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Utility: always return safe numbers
const safeNumber = (v, min, max, fallback) => {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

app.post("/analyze", async (req, res) => {
  try {
    const { scene } = req.body;

    if (!scene || !scene.trim()) {
      return res.status(400).json({ error: "Scene text is required" });
    }

    const prompt = `
You are SceneCraft — an expert film mentor, teacher, and director.

RETURN ONLY VALID JSON.
ALL KEYS ARE REQUIRED.
NO MARKDOWN. NO EXTRA TEXT.

Required JSON structure:

mentor_explanation: string

beginner_guidance: {
  what_the_audience_should_feel: string
  how_to_shoot_this_scene: string
  why_these_choices_work: string
}

scene_analysis: {
  short_summary: string
  story_analysis: string
  film_analysis: string
}

scene_intelligence: {
  intent: string
  emotion: string
  visual_mood: string
  camera_style: string
}

shot_list: array of at least 3 objects, each with:
  shot_number: number
  shot_type: string
  camera_movement: string
  purpose: string

director_plan: {
  visual_approach: string
  lighting_plan: string
  sound_design: string
  pacing: string
  transition_idea: string
}

production_notes: {
  budget_fit: string
  risks: string
  suggestion: string
}

confidence_breakdown: {
  emotion_clarity: number (0–1)
  visual_clarity: number (0–1)
  narrative_clarity: number (0–1)
}

ai_confidence: number (0–100)

Scene:
"""${scene}"""
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.4,
      response_format: { type: "json_object" }, // 🔒 CRITICAL
      messages: [{ role: "user", content: prompt }],
    });

    const parsed = completion.choices[0].message.content;

    let data;
    try {
      data = JSON.parse(parsed);
    } catch {
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    // 🔒 FINAL GUARANTEED RESPONSE
    const response = {
      mentor_explanation: data.mentor_explanation,

      beginner_guidance: data.beginner_guidance,

      scene_analysis: data.scene_analysis,

      scene_intelligence: data.scene_intelligence,

      shot_list: Array.isArray(data.shot_list) ? data.shot_list : [],

      director_plan: data.director_plan,

      production_notes: data.production_notes,

      confidence_breakdown: {
        emotion_clarity: safeNumber(data.confidence_breakdown?.emotion_clarity, 0, 1, 0.6),
        visual_clarity: safeNumber(data.confidence_breakdown?.visual_clarity, 0, 1, 0.6),
        narrative_clarity: safeNumber(data.confidence_breakdown?.narrative_clarity, 0, 1, 0.6),
      },

      ai_confidence: safeNumber(data.ai_confidence, 0, 100, 80),
    };

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI analysis failed" });
  }
});

app.listen(5000, () => {
  console.log("✅ SceneCraft backend running on http://localhost:5000");
});
