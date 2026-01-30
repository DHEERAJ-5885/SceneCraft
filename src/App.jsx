import { useRef, useState } from "react";
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
        <ul>
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

export default function App() {
  const [scene, setScene] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("pro"); // "pro" | "beginner"
  const [pdfLoading, setPdfLoading] = useState(false);

  // ✅ Only this section is captured into PDF
  const pdfRef = useRef(null);

  const generateAnalysis = async () => {
    if (!scene.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeScene(scene);
      setResult(data);
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

      // ✅ Export exactly what is visible inside pdfRef
      await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const active = result?.views?.[mode] || result;

  // ✅ Helps prevent ugly page splits in PDF
  const pdfSectionStyle = {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.25)",
    pageBreakInside: "avoid",
    breakInside: "avoid",
  };

  const preStyle = {
    whiteSpace: "pre-wrap",
    background: "#111",
    padding: 12,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
  };

  return (
    <div style={{ background: "#0f0f0f", color: "#fff", minHeight: "100vh", padding: 30 }}>
      <h1>🎬 SceneCraft</h1>
      <p>AI Scene Analysis for Filmmakers</p>

      <textarea
        rows={7}
        style={{ width: "100%", background: "#222", color: "#fff", padding: 10 }}
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        placeholder="Paste your scene here..."
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={generateAnalysis} disabled={loading}>
          {loading ? "Analyzing..." : "Generate Scene Analysis"}
        </button>

        {/* ✅ PDF Export Button */}
        <button onClick={exportPdf} disabled={!result || pdfLoading} style={{ opacity: !result ? 0.6 : 1 }}>
          {pdfLoading ? "Exporting PDF..." : "⬇️ Export PDF"}
        </button>

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
      <div ref={pdfRef} id="pdf-export-root" style={{ background: "#0f0f0f", color: "#fff", padding: 20 }}>
        {active && (
          <>
            <div style={pdfSectionStyle}>
              <h2>📝 Input Scene</h2>
              <pre style={preStyle}>{scene || "—"}</pre>
            </div>

            <div style={pdfSectionStyle}>
              <h2>🧾 Scene Overview</h2>
              <p>{active.scene_overview || "—"}</p>
            </div>

            <div style={pdfSectionStyle}>
              <h2>🧩 Key Beats</h2>
              <ul>
                {(active.key_beats || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div style={pdfSectionStyle}>
              <h2>🎓 Mentor Explanation</h2>
              <p>{active.mentor_explanation || "—"}</p>
            </div>

            {mode === "pro" && (
              <div style={pdfSectionStyle}>
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
              </div>
            )}

            {mode === "beginner" && (
              <div style={pdfSectionStyle}>
                <h2>🧩 Beginner Guidance</h2>
                <KeyValueList data={active.beginner_guidance} />
              </div>
            )}

            <div style={pdfSectionStyle}>
              <h2>🧠 Scene Analysis</h2>
              <KeyValueList data={active.scene_analysis} />
            </div>

            <div style={pdfSectionStyle}>
              <h2>🎯 Scene Intelligence</h2>
              <KeyValueList data={active.scene_intelligence} />
            </div>

            <div style={pdfSectionStyle}>
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
            </div>

            <div style={pdfSectionStyle}>
              <h2>🎥 Director Plan</h2>
              <KeyValueList data={active.director_plan} />
            </div>

            <div style={pdfSectionStyle}>
              <h2>🎬 Production Notes (Budget + Risks)</h2>
              <KeyValueList data={active.production_notes} />
            </div>

            <div style={pdfSectionStyle}>
              <h2>📊 Confidence Breakdown</h2>
              <ul>
                <li>Emotion: {Math.round((active.confidence_breakdown?.emotion_clarity ?? 0.6) * 100)}%</li>
                <li>Visual: {Math.round((active.confidence_breakdown?.visual_clarity ?? 0.6) * 100)}%</li>
                <li>Narrative: {Math.round((active.confidence_breakdown?.narrative_clarity ?? 0.6) * 100)}%</li>
              </ul>

              <h2 style={{ marginTop: 10 }}>🏁 AI Confidence</h2>
              <p>{active.ai_confidence}%</p>
            </div>

            {result?.organizer_json && (
              <div style={{ ...pdfSectionStyle, borderBottom: "none" }}>
                <h2>🧾 Organizer JSON Output</h2>
                <pre style={preStyle}>{JSON.stringify(result.organizer_json, null, 2)}</pre>
              </div>
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
