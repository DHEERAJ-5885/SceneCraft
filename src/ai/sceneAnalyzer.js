// ---------------------------
//    Scene Analyzer (Frontend Safe)
//    - Normalizes backend output into a stable schema
//    - Prevents analysis on empty / junk scenes (like ".")
//    - Supports A/B variants for same scene (draft vs improved)
// ------------------------------------------- */

/**
 * Reject useless input like ".", "....", empty, spaces only, etc.
 */
function isMeaningfulScene(text = "") {
  const trimmed = String(text).trim();
  if (!trimmed) return false;

  // If the text becomes empty after removing punctuation, it's junk
  const withoutPunct = trimmed.replace(/[.,!?;:"'`~()\[\]{}<>|\\/+=_*^%@#$\-—–]/g, "").trim();
  if (!withoutPunct) return false;

  // Too short to analyze meaningfully
  if (withoutPunct.length < 12) return false;

  return true;
}

/**
 * Ensure arrays are always arrays.
 */
function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

/**
 * Ensure object is always object.
 */
function toObject(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

/**
 * Beginner fallback derived from Pro
 * (same logic you already use, but duplicated here so backend shape doesn’t break the UI)
 */
function deriveBeginnerFromPro(proView) {
  const si = toObject(proView?.scene_intelligence);
  const beats = toArray(proView?.key_beats);
  const shots = toArray(proView?.shot_list);

  return {
    scene_overview: proView?.scene_overview || "—",
    key_beats: beats,
    mentor_explanation:
      proView?.mentor_explanation ||
      "This scene is being interpreted into beginner-friendly steps: what to show, why to show it, and how to shoot it.",

    beginner_guidance: {
      "What is happening?": proView?.scene_overview || "—",
      "What emotion should audience feel?": si.emotion || "—",
      "What is the visual mood?": si.visual_mood || "—",
      "How to shoot simply (student level)": {
        "Camera plan": si.camera_style || "Use wide shots for location + close-ups for emotion.",
        "Shots to capture (minimum)": shots.slice(0, 5).map((s, i) => ({
          step: i + 1,
          shot_type: s?.shot_type || "—",
          purpose: s?.purpose || "—",
        })),
      },
    },

    scene_analysis: toObject(proView?.scene_analysis),

    confidence_breakdown:
      proView?.confidence_breakdown && typeof proView.confidence_breakdown === "object"
        ? proView.confidence_breakdown
        : { emotion_clarity: 0.65, visual_clarity: 0.6, narrative_clarity: 0.65 },

    ai_confidence: proView?.ai_confidence ?? 0.75,
  };
}

/**
 * Normalize ANY backend response → stable schema for UI.
 * Output shape guaranteed:
 * {
 *   views: { pro: {...}, beginner: {...} },
 *   organizer_json: {...},
 *   meta: {...},
 * }
 */
export function normalizeAIResponse(raw, sceneText = "", variant = "A") {
  const safeRaw = toObject(raw);

  // Some backends return already "views.pro/beginner"
  const hasViews = safeRaw.views && typeof safeRaw.views === "object";

  const proCandidate = hasViews ? (safeRaw.views.pro || safeRaw.pro || safeRaw) : (safeRaw.pro || safeRaw);
  const proView = toObject(proCandidate);

  // Build beginner from backend OR derive from pro
  const beginnerCandidate = hasViews ? safeRaw.views.beginner : safeRaw.beginner;
  const beginnerView = beginnerCandidate ? toObject(beginnerCandidate) : deriveBeginnerFromPro(proView);

  // Organizer / intent pack safe
  const organizer =
    safeRaw.organizer_json ||
    safeRaw.intent_pack ||
    safeRaw.organizer ||
    {};

  const organizer_json = toObject(organizer);

  // Production notes safe (budget cards depend on this)
  const prodNotes = toObject(proView.production_notes);
  const budgetDetails = toObject(prodNotes.budget_details);

  // Guarantee some keys exist so your Budget UI won’t render weird vertical text
  // (when undefined + CSS squeezes, things look like that “single letters” column)
  const stabilizedBudgetDetails = {
    tier: budgetDetails.tier || budgetDetails.Tier || prodNotes.budget_tier || "—",
    estimate_range_inr:
      budgetDetails.estimate_range_inr ||
      budgetDetails.Estimate_Range_Inr ||
      prodNotes.estimate_range_inr ||
      "—",
    cost_drivers:
      budgetDetails.cost_drivers ||
      budgetDetails.Cost_Drivers ||
      prodNotes.cost_drivers ||
      null,
    money_savers:
      budgetDetails.money_savers ||
      budgetDetails.Money_Savers ||
      prodNotes.money_savers ||
      null,
    risks:
      budgetDetails.risks ||
      budgetDetails.Risks ||
      prodNotes.risks ||
      null,
  };

  const proFinal = {
    ...proView,
    // enforce arrays
    key_beats: toArray(proView.key_beats),
    shot_list: toArray(proView.shot_list),
    scene_intelligence: toObject(proView.scene_intelligence),
    scene_analysis: toObject(proView.scene_analysis),
    director_plan: toObject(proView.director_plan),
    confidence_breakdown: toObject(proView.confidence_breakdown),
    production_notes: {
      ...prodNotes,
      budget_details: stabilizedBudgetDetails,
    },
  };

  const beginnerFinal = {
    ...beginnerView,
    key_beats: toArray(beginnerView.key_beats),
    scene_analysis: toObject(beginnerView.scene_analysis),
    beginner_guidance: toObject(beginnerView.beginner_guidance),
    confidence_breakdown: toObject(beginnerView.confidence_breakdown),
  };

  return {
    views: { pro: proFinal, beginner: beginnerFinal },
    organizer_json,
    meta: {
      normalized: true,
      variant,
      received_at: new Date().toISOString(),
      scene_length: String(sceneText || "").length,
    },
  };
}

/**
 * Analyze scene with backend + normalization
 * Supports variant "A" or "B" so you can generate two outputs for same scene.
 */
export async function analyzeScene(sceneText, options = {}) {
  const variant = options?.variant || "A"; // "A" | "B"

  if (!isMeaningfulScene(sceneText)) {
    // Clean, user-facing error so you can show message in UI
    throw new Error("Input scene is not analyzed. Please paste a meaningful scene (not empty or just symbols).");
  }

  const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const response = await fetch(`${API_BASE}/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scene: sceneText,
    variant,
  }),
});

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // Backend sent non-JSON
    throw new Error("AI analysis failed: server returned invalid JSON.");
  }

  if (!response.ok) {
    throw new Error(data?.error || "AI analysis failed");
  }

  // ✅ Always return normalized shape for your UI
  return normalizeAIResponse(data, sceneText, variant);
}