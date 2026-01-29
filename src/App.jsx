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

function App() {
  const [scene, setScene] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateAnalysis = async () => {
    if (!scene.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      alert("Failed to analyze scene");
    } finally {
      setLoading(false);
    }
  };

  const renderObject = (obj) => (
    <ul>
      {Object.values(obj).map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  );

  return (
    <div style={{ background: "#0f0f0f", color: "#fff", minHeight: "100vh", padding: 30 }}>
      <h1>🎬 SceneCraft</h1>
      <p>AI Scene Analysis for Filmmakers</p>

      <textarea
        rows={4}
        style={{ width: "100%", background: "#222", color: "#fff", padding: 10 }}
        value={scene}
        onChange={(e) => setScene(e.target.value)}
      />

      <button onClick={generateAnalysis} style={{ marginTop: 15 }}>
        {loading ? "Analyzing..." : "Generate Scene Analysis"}
      </button>

      {result && (
        <>
          <hr />
          <h2>🎓 Mentor Explanation</h2>
          <p>{result.mentor_explanation}</p>

          <hr />
          <h2>🧩 Beginner Guidance</h2>
          {renderObject(result.beginner_guidance)}

          <hr />
          <h2>🧠 Scene Analysis</h2>
          {renderObject(result.scene_analysis)}

          <hr />
          <h2>🎯 Scene Intelligence</h2>
          {renderObject(result.scene_intelligence)}

          <hr />
          <h2>📸 Shot List</h2>
          <ol>
            {result.shot_list.map((s, i) => (
              <li key={i}>
                <b>{s.shot_type}</b> — {s.purpose}
                <br />
                <small>Camera: {s.camera_movement}</small>
              </li>
            ))}
          </ol>

          <hr />
          <h2>🎥 Director Plan</h2>
          {renderObject(result.director_plan)}

          <hr />
          <h2>🎬 Production Notes</h2>
          {renderObject(result.production_notes)}

          <hr />
          <h2>📊 Confidence Breakdown</h2>
          <ul>
            <li>Emotion: {Math.round(result.confidence_breakdown.emotion_clarity * 100)}%</li>
            <li>Visual: {Math.round(result.confidence_breakdown.visual_clarity * 100)}%</li>
            <li>Narrative: {Math.round(result.confidence_breakdown.narrative_clarity * 100)}%</li>
          </ul>

          <hr />
          <h2>🏁 AI Confidence</h2>
          <p>{result.ai_confidence}%</p>
        </>
      )}
    </div>
  );
}

export default App;
