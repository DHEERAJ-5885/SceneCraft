// import { useState } from "react";
// import "./App.css";

// function App() {
//   const [scene, setScene] = useState("");
//   const [analysis, setAnalysis] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const generateAnalysis = async () => {
//     if (!scene.trim()) {
//       setError("Please enter a scene description.");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     setAnalysis("");

//     try {
//       const response = await fetch("http://localhost:5000/analyze", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ scene }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data?.error || "AI analysis failed");
//       }

//       // ✅ SAFE: treat AI output as plain text
//       setAnalysis(data?.analysis || "AI could not analyze the scene.");
//     } catch (err) {
//       console.error(err);
//       setError("Something went wrong while analyzing the scene.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="app-container">
//       <h1>🎬 SceneCraft</h1>
//       <p>Real AI-Powered Scene Analysis</p>

//       <textarea
//         value={scene}
//         onChange={(e) => setScene(e.target.value)}
//         placeholder="Describe your scene here..."
//         rows={6}
//       />

//       <button onClick={generateAnalysis} disabled={loading}>
//         {loading ? "Analyzing..." : "Generate Scene Analysis"}
//       </button>

//       {error && <p className="error">{error}</p>}

//       {analysis && (
//         <div className="analysis-box">
//           <h2>Scene Analysis</h2>
//           {analysis.split("\n\n").map((para, index) => (
//             <p key={index}>{para}</p>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;



















import { useState } from "react";
import { analyzeScene } from "./ai/sceneAnalyzer";

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

    // nested object
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

  // NEW: View mode
  const [mode, setMode] = useState("pro"); // "pro" | "beginner"

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

  // If backend provides views, use them. Otherwise fallback to old structure.
  const active = result?.views?.[mode] || result;

  return (
    <div style={{ background: "#0f0f0f", color: "#fff", minHeight: "100vh", padding: 30 }}>
      <h1>🎬 SceneCraft</h1>
      <p>AI Scene Analysis for Filmmakers</p>

      <textarea
        rows={6}
        style={{ width: "100%", background: "#222", color: "#fff", padding: 10 }}
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        placeholder="Paste your scene here..."
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={generateAnalysis}>
          {loading ? "Analyzing..." : "Generate Scene Analysis"}
        </button>

        {/* Mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("beginner")}
            style={{ opacity: mode === "beginner" ? 1 : 0.6 }}
          >
            🧑‍🎓 Beginner View
          </button>
          <button
            onClick={() => setMode("pro")}
            style={{ opacity: mode === "pro" ? 1 : 0.6 }}
          >
            🎬 Pro View
          </button>
        </div>
      </div>

      {active && (
        <>
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

          {/* Pro only quick notes */}
          {mode === "pro" && (
            <>
              <hr />
              <h2>⚡ Pro Quick Notes</h2>
              <ul>
                <li><b>Intent:</b> {active.scene_intelligence?.intent || "—"}</li>
                <li><b>Emotion:</b> {active.scene_intelligence?.emotion || "—"}</li>
                <li><b>Visual Mood:</b> {active.scene_intelligence?.visual_mood || "—"}</li>
                <li><b>Camera Style:</b> {active.scene_intelligence?.camera_style || "—"}</li>
              </ul>
            </>
          )}

          {/* Beginner guidance only for beginner mode */}
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
          <h2>🎬 Production Notes</h2>
          <KeyValueList data={active.production_notes} />

          <hr />
          <h2>📊 Confidence Breakdown</h2>
          <ul>
            <li>
              Emotion: {Math.round((active.confidence_breakdown?.emotion_clarity ?? 0.6) * 100)}%
            </li>
            <li>
              Visual: {Math.round((active.confidence_breakdown?.visual_clarity ?? 0.6) * 100)}%
            </li>
            <li>
              Narrative: {Math.round((active.confidence_breakdown?.narrative_clarity ?? 0.6) * 100)}%
            </li>
          </ul>

          <hr />
          <h2>🏁 AI Confidence</h2>
          <p>{active.ai_confidence}%</p>

          {/* Organizer JSON output */}
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
  );
}
