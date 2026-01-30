import { useMemo, useRef, useState } from "react";
import { analyzeScene } from "./ai/sceneAnalyzer";
import { exportNodeToPdf } from "./utils/exportPdf";

function KeyValueList({ data }) {
  if (!data || typeof data !== "object") return <p>—</p>;

  const renderValue = (v) => {
    if (v == null) return "—";

    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }

    if (Array.isArray(v)) {
      if (v.every((x) => typeof x !== "object" || x === null)) {
        return v.map(String).join(", ");
      }
      return (
        <ul style={{ marginTop: 6 }}>
          {v.map((item, idx) => (
            <li key={idx}>
              {typeof item === "object" && item !== null ? <KeyValueList data={item} /> : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    return <KeyValueList data={v} />;
  };

  return (
    <ul>
      {Object.entries(data).map(([k, v]) => (
        <li key={k} style={{ marginBottom: 6 }}>
          <b>{k.replaceAll("_", " ")}:</b> {renderValue(v)}
        </li>
      ))}
    </ul>
  );
}

function formatNow() {
  const d = new Date();
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

// E) Output Quality Badge logic (super safe, no backend changes)
function computeQuality(result) {
  if (!result) return { label: "—", type: "neutral", details: "" };

  // If backend gave json_output but it's missing pro/beginner, likely recovered/fallback
  const hasJson = result.json_output && typeof result.json_output === "object";
  const hasViews = result.views && typeof result.views === "object";
  const hasPro = hasViews && result.views.pro;
  const hasBeginner = hasViews && result.views.beginner;

  // if we have views, it’s usable
  if (hasPro && hasBeginner) {
    // detect recovered: json_output missing expected keys OR raw_text exists but parsed is weak
    const recovered =
      !hasJson ||
      (!result.json_output?.pro && !result.json_output?.beginner) ||
      (hasJson && Object.keys(result.json_output).length <= 1);

    if (recovered) {
      return {
        label: "Recovered Output (Fallback Safety Used)",
        type: "warn",
        details: "AI response was partially recovered to keep the app stable.",
      };
    }

    return {
      label: "Valid AI Output",
      type: "ok",
      details: "Structured output generated successfully.",
    };
  }

  return {
    label: "Incomplete Output",
    type: "warn",
    details: "Some sections were missing; try generating again.",
  };
}

// D) Templates (no extra files, no new deps)
const TEMPLATES = [
  {
    name: "⚡ Action (Shipyard Neon)",
    text: `Title: The Silent Symphony
Setting: An abandoned, rain-soaked shipyard in Vizag.
Vibe: High contrast, neon blues and deep oranges, slow-motion hero entry.

[0:00 - 0:15] VISUAL: Camera skims an inch above puddles. Reflections of rusted containers. Heavy rain—no thunder—only clink-clink of a chain.
[0:15 - 0:30] ENTRY: Black umbrella enters. Polished boots step into water. Each step syncs with bass thud.
[0:30 - 0:45] CONFRONTATION: Hero stops. Twenty mercenaries under flickering floodlight, armed but trembling.
Dialogue (Hero): "I didn't come here to finish the war." (drops umbrella) "I came here to finish the map."
[0:45 - 1:00] ACTION: 360-degree single-shot. Rain freezes mid-air (bullet-time). Hero fights like a dancer. Hits create shockwaves of droplets.`,
  },
  {
    name: "🔥 Festival (Temple Jathara)",
    text: `Title: The Weight of the Crown
Setting: A crowded temple festival (Jathara) at night.
Vibe: Crimson reds, thousands of glowing oil lamps, smell of jasmine and gunpowder.

[0:00 - 0:20] ATMOSPHERE: Frame filled with swirling red Gulal. Massive Dappu drums beat a frantic rhythm.
[0:20 - 0:40] POWER DISPLAY: Villain (a powerful politician) stands on a pedestal, smirking, preparing to light a massive effigy. He thinks he has won.
[0:40 - 1:00] SHIFT: A ripple in the crowd. Someone walks against the flow—calm. The drums feel like a warning now.`,
  },
  {
    name: "😱 Horror (Corridor)",
    text: `Title: Footsteps Without Feet
Setting: College hostel corridor at 2:13 AM.
Vibe: Sickly green tube lights, long shadows, silence broken by distant metal taps.

[0:00 - 0:20] SETUP: A student walks with phone flashlight. Power flickers. A door creaks open by itself.
[0:20 - 0:40] BUILD: Footsteps approach—yet no one appears. The student whispers, "Who’s there?"
[0:40 - 1:00] PAYOFF: Phone light dies. In total darkness, a breath is heard inches away.`,
  },
  {
    name: "💔 Romance (Bus Stop)",
    text: `Title: The Unsent Message
Setting: Rainy bus stop, evening.
Vibe: Warm streetlight halos, soft rain, muffled traffic.

[0:00 - 0:20] SETUP: Two people stand close but emotionally far. One types a message, deletes it.
[0:20 - 0:40] TENSION: The bus arrives. Doors open. Silence stretches.
[0:40 - 1:00] END BEAT: One steps in. The other doesn’t wave. Only the phone screen glows.`,
  },
];

export default function App() {
  const [scene, setScene] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("pro"); // "pro" | "beginner"
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const pdfRef = useRef(null);

  const active = result?.views?.[mode] || result;

  const quality = useMemo(() => computeQuality(result), [result]);

  const generateAnalysis = async () => {
    if (!scene.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeScene(scene);
      setResult(data);
      setCopied(false);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze scene");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    try {
      if (!result) {
        alert("Generate an analysis first.");
        return;
      }

      setPdfLoading(true);
      await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // C) Copy Organizer JSON
  const copyOrganizerJson = async () => {
    try {
      if (!result?.organizer_json) {
        alert("Organizer JSON not available yet. Generate analysis first.");
        return;
      }
      const text = JSON.stringify(result.organizer_json, null, 2);

      // modern clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        window.prompt("Copy this JSON:", text);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.error(e);
      alert("Copy failed. Try again.");
    }
  };

  const badgeStyle = (() => {
    if (quality.type === "ok") return { background: "#0b3", color: "#000" };
    if (quality.type === "warn") return { background: "#f5a623", color: "#000" };
    return { background: "#555", color: "#fff" };
  })();

  return (
    <div style={{ background: "#0f0f0f", color: "#fff", minHeight: "100vh", padding: 30 }}>
      <h1>🎬 SceneCraft</h1>
      <p>AI Scene Analysis for Filmmakers</p>

      {/* D) Templates */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Templates:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => setScene(t.text)}
              style={{
                background: "#1b1b1b",
                color: "#fff",
                border: "1px solid #333",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                opacity: 0.95,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <textarea
        rows={7}
        style={{ width: "100%", background: "#222", color: "#fff", padding: 10, borderRadius: 10, border: "1px solid #333" }}
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        placeholder="Paste your scene here..."
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={generateAnalysis} disabled={loading}>
          {loading ? "Analyzing..." : "Generate Scene Analysis"}
        </button>

        {/* PDF Export */}
        <button onClick={exportPdf} disabled={!result || pdfLoading} style={{ opacity: !result ? 0.6 : 1 }}>
          {pdfLoading ? "Exporting PDF..." : "⬇️ Export PDF"}
        </button>

        {/* C) Copy JSON */}
        <button onClick={copyOrganizerJson} disabled={!result?.organizer_json}>
          {copied ? "✅ Copied!" : "📋 Copy Organizer JSON"}
        </button>

        {/* Mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setMode("beginner")} style={{ opacity: mode === "beginner" ? 1 : 0.6 }}>
            🧑‍🎓 Beginner View
          </button>
          <button onClick={() => setMode("pro")} style={{ opacity: mode === "pro" ? 1 : 0.6 }}>
            🎬 Pro View
          </button>
        </div>
      </div>

      {/* ✅ Everything inside this div will be exported into PDF */}
      <div ref={pdfRef} id="pdf-export-root" style={{ background: "#0f0f0f", color: "#fff", padding: 20, marginTop: 14 }}>
        {/* A) Report Header (shows in UI + PDF) */}
        <div
          style={{
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            background: "#121212",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>🎬 SceneCraft Report</div>
            <div style={{ opacity: 0.8 }}>{formatNow()}</div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ opacity: 0.85 }}>View:</span>
              <span
                style={{
                  background: "#222",
                  border: "1px solid #333",
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
              >
                {mode === "pro" ? "Pro" : "Beginner"}
              </span>

              {/* E) Quality Badge */}
              <span
                title={quality.details}
                style={{
                  ...badgeStyle,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontWeight: 700,
                }}
              >
                {quality.label}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Generated output is structured for judges + filmmakers. If AI returns partial data, SceneCraft safely recovers it (no blank screens).
          </div>
        </div>

        {active && (
          <>
            <hr />

            <h2>📝 Input Scene</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
              {scene || "—"}
            </pre>

            <hr />
            <h2>🧾 Scene Overview</h2>
            <p>{active.scene_overview || "—"}</p>

            <h2>🧩 Key Beats</h2>
            <ul>
              {(active.key_beats || []).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <hr />
            <h2>🎓 Mentor Explanation</h2>
            <p>{active.mentor_explanation || "—"}</p>

            {mode === "pro" && (
              <>
                <hr />
                <h2>⚡ Pro Quick Notes</h2>
                <ul>
                  <li>
                    <b>Intent:</b> {active.scene_intelligence?.intent || "—"}
                  </li>
                  <li>
                    <b>Emotion:</b> {active.scene_intelligence?.emotion || "—"}
                  </li>
                  <li>
                    <b>Visual Mood:</b> {active.scene_intelligence?.visual_mood || "—"}
                  </li>
                  <li>
                    <b>Camera Style:</b> {active.scene_intelligence?.camera_style || "—"}
                  </li>
                </ul>
              </>
            )}

            {mode === "beginner" && (
              <>
                <hr />
                <h2>🧩 Beginner Guidance</h2>
                <KeyValueList data={active.beginner_guidance} />
              </>
            )}

            <hr />
            <h2>🧠 Scene Analysis</h2>
            <KeyValueList data={active.scene_analysis} />

            <hr />
            <h2>🎯 Scene Intelligence</h2>
            <KeyValueList data={active.scene_intelligence} />

            <hr />
            <h2>📸 Shot List</h2>
            <ol>
              {(active.shot_list || []).map((s, i) => (
                <li key={i}>
                  <b>{s.shot_type}</b> — {s.purpose}
                  <br />
                  <small>Camera: {s.camera_movement}</small>
                </li>
              ))}
            </ol>

            <hr />
            <h2>🎥 Director Plan</h2>
            <KeyValueList data={active.director_plan} />

            <hr />
            <h2>🎬 Production Notes (Budget + Risks)</h2>
            <KeyValueList data={active.production_notes} />

            <hr />
            <h2>📊 Confidence Breakdown</h2>
            <ul>
              <li>Emotion: {Math.round((active.confidence_breakdown?.emotion_clarity ?? 0.6) * 100)}%</li>
              <li>Visual: {Math.round((active.confidence_breakdown?.visual_clarity ?? 0.6) * 100)}%</li>
              <li>Narrative: {Math.round((active.confidence_breakdown?.narrative_clarity ?? 0.6) * 100)}%</li>
            </ul>

            <hr />
            <h2>🏁 AI Confidence</h2>
            <p>{active.ai_confidence}%</p>

            {result?.organizer_json && (
              <>
                <hr />
                <h2>🧾 Organizer JSON Output</h2>
                <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
                  {JSON.stringify(result.organizer_json, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}






// import { useState } from "react";
// import { analyzeScene } from "./ai/sceneAnalyzer";

// function KeyValueList({ data }) {
//   if (!data || typeof data !== "object") return <p>—</p>;

//   const renderValue = (v) => {
//     if (v == null) return "—";

//     if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
//       return String(v);
//     }

//     if (Array.isArray(v)) {
//       if (v.every((x) => typeof x !== "object" || x === null)) {
//         return v.map(String).join(", ");
//       }
//       return (
//         <ul>
//           {v.map((item, idx) => (
//             <li key={idx}>
//               {typeof item === "object" && item !== null ? <KeyValueList data={item} /> : String(item)}
//             </li>
//           ))}
//         </ul>
//       );
//     }

//     return <KeyValueList data={v} />;
//   };

//   return (
//     <ul>
//       {Object.entries(data).map(([k, v]) => (
//         <li key={k} style={{ marginBottom: 6 }}>
//           <b>{k.replaceAll("_", " ")}:</b> {renderValue(v)}
//         </li>
//       ))}
//     </ul>
//   );
// }

// export default function App() {
//   const [scene, setScene] = useState("");
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const [mode, setMode] = useState("pro"); // "pro" | "beginner"

//   const generateAnalysis = async () => {
//     if (!scene.trim()) return;

//     setLoading(true);
//     setResult(null);

//     try {
//       const data = await analyzeScene(scene);
//       setResult(data);
//     } catch (err) {
//       console.error(err);
//       alert("Failed to analyze scene");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const active = result?.views?.[mode] || result;

//   return (
//     <div style={{ background: "#0f0f0f", color: "#fff", minHeight: "100vh", padding: 30 }}>
//       <h1>🎬 SceneCraft</h1>
//       <p>AI Scene Analysis for Filmmakers</p>

//       <textarea
//         rows={6}
//         style={{ width: "100%", background: "#222", color: "#fff", padding: 10 }}
//         value={scene}
//         onChange={(e) => setScene(e.target.value)}
//         placeholder="Paste your scene here..."
//       />

//       <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
//         <button onClick={generateAnalysis}>
//           {loading ? "Analyzing..." : "Generate Scene Analysis"}
//         </button>

//         <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
//           <button
//             onClick={() => setMode("beginner")}
//             style={{ opacity: mode === "beginner" ? 1 : 0.6 }}
//           >
//             🧑‍🎓 Beginner View
//           </button>
//           <button
//             onClick={() => setMode("pro")}
//             style={{ opacity: mode === "pro" ? 1 : 0.6 }}
//           >
//             🎬 Pro View
//           </button>
//         </div>
//       </div>

//       {active && (
//         <>
//           <hr />

//           <h2>🧾 Scene Overview</h2>
//           <p>{active.scene_overview || "—"}</p>

//           <h2>🧩 Key Beats</h2>
//           <ul>
//             {(active.key_beats || []).map((b, i) => (
//               <li key={i}>{b}</li>
//             ))}
//           </ul>

//           <hr />
//           <h2>🎓 Mentor Explanation</h2>
//           <p>{active.mentor_explanation || "—"}</p>

//           {mode === "pro" && (
//             <>
//               <hr />
//               <h2>⚡ Pro Quick Notes</h2>
//               <ul>
//                 <li><b>Intent:</b> {active.scene_intelligence?.intent || "—"}</li>
//                 <li><b>Emotion:</b> {active.scene_intelligence?.emotion || "—"}</li>
//                 <li><b>Visual Mood:</b> {active.scene_intelligence?.visual_mood || "—"}</li>
//                 <li><b>Camera Style:</b> {active.scene_intelligence?.camera_style || "—"}</li>
//               </ul>
//             </>
//           )}

//           {mode === "beginner" && (
//             <>
//               <hr />
//               <h2>🧩 Beginner Guidance</h2>
//               <KeyValueList data={active.beginner_guidance} />
//             </>
//           )}

//           <hr />
//           <h2>🧠 Scene Analysis</h2>
//           <KeyValueList data={active.scene_analysis} />

//           <hr />
//           <h2>🎯 Scene Intelligence</h2>
//           <KeyValueList data={active.scene_intelligence} />

//           <hr />
//           <h2>📸 Shot List</h2>
//           <ol>
//             {(active.shot_list || []).map((s, i) => (
//               <li key={i}>
//                 <b>{s.shot_type}</b> — {s.purpose}
//                 <br />
//                 <small>Camera: {s.camera_movement}</small>
//               </li>
//             ))}
//           </ol>

//           <hr />
//           <h2>🎥 Director Plan</h2>
//           <KeyValueList data={active.director_plan} />

//           <hr />
//           <h2>🎬 Production Notes</h2>
//           <KeyValueList data={active.production_notes} />

//           <hr />
//           <h2>📊 Confidence Breakdown</h2>
//           <ul>
//             <li>Emotion: {Math.round(((result?.confidence_breakdown?.emotion_clarity) ?? 0.6) * 100)}%</li>
//             <li>Visual: {Math.round(((result?.confidence_breakdown?.visual_clarity) ?? 0.6) * 100)}%</li>
//             <li>Narrative: {Math.round(((result?.confidence_breakdown?.narrative_clarity) ?? 0.6) * 100)}%</li>
//           </ul>

//           <hr />
//           <h2>🏁 AI Confidence</h2>
//           <p>{result?.ai_confidence ?? 75}%</p>

//           {result?.organizer_json && (
//             <>
//               <hr />
//               <h2>🧾 Organizer JSON Output</h2>
//               <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: 12, borderRadius: 8 }}>
//                 {JSON.stringify(result.organizer_json, null, 2)}
//               </pre>
//             </>
//           )}
//         </>
//       )}
//     </div>
//   );
// }
