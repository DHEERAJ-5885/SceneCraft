// import { useMemo, useRef, useState } from "react";
// import { analyzeScene } from "./ai/sceneAnalyzer";
// import { exportNodeToPdf } from "./utils/exportPdf";

// /* -------------------------------------------
//    Helpers
// ------------------------------------------- */

// function KeyValueList({ data }) {
//   if (!data || typeof data !== "object") return <p style={{ opacity: 0.8 }}>—</p>;

//   const renderValue = (v) => {
//     if (v == null) return "—";
//     if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);

//     if (Array.isArray(v)) {
//       if (v.every((x) => typeof x !== "object" || x === null)) return v.map(String).join(", ");
//       return (
//         <ul style={{ marginTop: 6 }}>
//           {v.map((item, idx) => (
//             <li key={idx} style={{ marginBottom: 6 }}>
//               {typeof item === "object" && item !== null ? <KeyValueList data={item} /> : String(item)}
//             </li>
//           ))}
//         </ul>
//       );
//     }

//     return <KeyValueList data={v} />;
//   };

//   return (
//     <div style={{ display: "grid", gap: 10 }}>
//       {Object.entries(data).map(([k, v]) => (
//         <div
//           key={k}
//           style={{
//             display: "grid",
//             gridTemplateColumns: "220px 1fr",
//             gap: 12,
//             padding: "10px 12px",
//             border: "1px solid rgba(255,255,255,0.08)",
//             borderRadius: 12,
//             background: "rgba(255,255,255,0.03)",
//           }}
//         >
//           <div style={{ opacity: 0.85, fontWeight: 700, textTransform: "capitalize" }}>
//             {k.replaceAll("_", " ")}
//           </div>
//           <div style={{ opacity: 0.92, lineHeight: 1.6 }}>{renderValue(v)}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function formatNow() {
//   const d = new Date();
//   const date = d.toLocaleDateString();
//   const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   return `${date} • ${time}`;
// }

// function computeQuality(result) {
//   if (!result) return { label: "—", type: "neutral", details: "" };

//   const hasViews = result.views && typeof result.views === "object";
//   const hasPro = hasViews && result.views.pro;
//   const hasBeginner = hasViews && result.views.beginner;

//   if (hasPro && hasBeginner) {
//     return {
//       label: "Valid AI Output",
//       type: "ok",
//       details: "Structured output generated successfully.",
//     };
//   }

//   return {
//     label: "Partial Output",
//     type: "warn",
//     details: "Some sections were missing; try generating again.",
//   };
// }

// /** Beginner fallback: if backend doesn't provide views.beginner, we generate a simple, helpful one */
// function buildBeginnerViewFromPro(proView) {
//   const si = proView?.scene_intelligence || {};
//   const beats = Array.isArray(proView?.key_beats) ? proView.key_beats : [];
//   const overview = proView?.scene_overview || "—";

//   return {
//     scene_overview: overview,
//     key_beats: beats.slice(0, 6),
//     mentor_explanation:
//       "This is a beginner-friendly view. It explains the scene in simple terms and tells you what to focus on while shooting.",
//     beginner_guidance: {
//       what_is_happening: overview,
//       main_emotion: si?.emotion || "—",
//       visual_mood: si?.visual_mood || "—",
//       camera_tip:
//         si?.camera_style
//           ? `Try this camera style: ${si.camera_style}`
//           : "Use simple coverage: wide → medium → close-up.",
//       editing_tip: "Cut on action and on emotion (face reactions) for impact.",
//       sound_tip: "Use background sound to increase tension or romance, based on the emotion.",
//       top_3_beats_to_shoot_first: beats.slice(0, 3),
//     },
//     scene_analysis: proView?.scene_analysis || {},
//     confidence_breakdown: proView?.confidence_breakdown || { emotion_clarity: 0.6, visual_clarity: 0.6, narrative_clarity: 0.6 },
//     ai_confidence: proView?.ai_confidence ?? 0.75,
//   };
// }

// /** Budget estimator (local heuristic) so budget varies even if backend repeats values */
// function estimateBudgetINR(sceneText, active) {
//   const txt = (sceneText || "").toLowerCase();
//   const beats = Array.isArray(active?.key_beats) ? active.key_beats.length : 0;
//   const shots = Array.isArray(active?.shot_list) ? active.shot_list.length : 0;

//   let score = 10 + beats * 2 + shots * 1.5;

//   const bump = (k, v) => {
//     if (txt.includes(k)) score += v;
//   };

//   bump("crowd", 18);
//   bump("festival", 16);
//   bump("jathara", 18);
//   bump("rain", 12);
//   bump("night", 10);
//   bump("chase", 18);
//   bump("fight", 20);
//   bump("explosion", 35);
//   bump("gun", 25);
//   bump("blood", 12);
//   bump("vfx", 40);
//   bump("cgi", 40);
//   bump("helicopter", 50);
//   bump("car", 10);
//   bump("bus", 8);
//   bump("hospital", 14);
//   bump("temple", 10);
//   bump("hostel", 6);

//   let tier = "Low";
//   if (score > 70) tier = "High";
//   else if (score > 40) tier = "Medium";

//   const base =
//     tier === "Low" ? 150000 :
//     tier === "Medium" ? 600000 :
//     1500000;

//   // Add some scaling but keep sane
//   const min = Math.round(base * (0.85 + Math.min(score, 120) / 300));
//   const max = Math.round(base * (1.25 + Math.min(score, 120) / 220));

//   const costDrivers = [];
//   if (txt.includes("rain")) costDrivers.push("Rain setup / water continuity");
//   if (txt.includes("crowd") || txt.includes("festival") || txt.includes("jathara")) costDrivers.push("Extras / crowd control");
//   if (txt.includes("fight") || txt.includes("chase")) costDrivers.push("Stunts / safety");
//   if (txt.includes("vfx") || txt.includes("cgi")) costDrivers.push("VFX / post");

//   if (!costDrivers.length) costDrivers.push("Location, equipment, and time");

//   const moneySavers = ["Shoot with natural locations", "Use practical lighting", "Plan shots to reduce retakes"];
//   if (tier === "High") moneySavers.push("Block action carefully to reduce stunt takes");

//   const risks = ["Weather changes", "Continuity mismatch", "Schedule overrun"];
//   if (txt.includes("crowd") || txt.includes("festival") || txt.includes("jathara")) risks.push("Crowd safety & permissions");

//   return {
//     tier,
//     estimate_range_inr: `${min.toLocaleString("en-IN")} - ${max.toLocaleString("en-IN")}`,
//     cost_drivers: costDrivers,
//     money_savers: moneySavers,
//     risks,
//     confidence_note: "This is a local estimate (heuristic) to support planning; AI budget may vary with backend tuning.",
//   };
// }

// /** Storyboard / Previz signals without backend change */
// function buildStoryboardSignals({ scene, mode, active, result }) {
//   const si = active?.scene_intelligence || {};
//   const beats = Array.isArray(active?.key_beats) ? active.key_beats : [];
//   const shots = Array.isArray(active?.shot_list) ? active.shot_list : [];

//   const frames = beats.map((beat, idx) => {
//     const shot = shots[idx] || {};
//     return {
//       frame_number: idx + 1,
//       beat: beat || "—",
//       recommended_shot_type: shot?.shot_type || "—",
//       camera_movement: shot?.camera_movement || "—",
//       director_intent: shot?.purpose || "—",
//     };
//   });

//   return {
//     meta: {
//       product: "SceneCraft",
//       view_mode: mode,
//       generated_at: new Date().toISOString(),
//     },
//     creative_intent: {
//       intent: si?.intent ?? "—",
//       emotion: si?.emotion ?? (result?.organizer_json?.emotion ?? "—"),
//       visual_mood: si?.visual_mood ?? (result?.organizer_json?.visual_mood ?? "—"),
//       camera_style: si?.camera_style ?? (result?.organizer_json?.camera_style ?? "—"),
//     },
//     storyboard_frames: frames.length
//       ? frames
//       : [{ frame_number: 1, beat: "—", recommended_shot_type: "—", camera_movement: "—", director_intent: "—" }],
//     downstream_ready: {
//       storyboard_generator: "Use storyboard_frames as frame prompts",
//       directors_assistant: "Use creative_intent + frames to guide continuity & coverage",
//       previz_system: "Use camera_style + shot_type + movement per frame",
//     },
//     original_scene_text: scene || "—",
//   };
// }

// /* -----------------------------
//    Versioning (A/B) Utilities
// --------------------------------*/
// const STORAGE_KEYS = {
//   A: "scenecraft_version_A_v1",
//   B: "scenecraft_version_B_v1",
// };

// function safeReadVersion(slot) {
//   try {
//     const raw = localStorage.getItem(STORAGE_KEYS[slot]);
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     // Basic sanity check
//     if (!parsed || typeof parsed !== "object") return null;
//     return parsed;
//   } catch {
//     return null;
//   }
// }

// function safeWriteVersion(slot, payload) {
//   try {
//     localStorage.setItem(STORAGE_KEYS[slot], JSON.stringify(payload));
//     return true;
//   } catch {
//     return false;
//   }
// }

// function diffText(a, b) {
//   if (!a && !b) return "—";
//   if (a === b) return "Same";
//   if (!a) return "Only in B";
//   if (!b) return "Only in A";
//   return "Different";
// }

// /* -------------------------------------------
//    UI Components
// ------------------------------------------- */

// function Pill({ children, active, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       style={{
//         border: "1px solid rgba(255,255,255,0.12)",
//         background: active ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.04)",
//         color: "#fff",
//         padding: "8px 12px",
//         borderRadius: 999,
//         cursor: "pointer",
//         fontWeight: 700,
//         opacity: active ? 1 : 0.85,
//         transition: "all 120ms ease",
//         whiteSpace: "nowrap",
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function Card({ title, icon, children, right }) {
//   return (
//     <div
//       style={{
//         border: "1px solid rgba(255,255,255,0.10)",
//         background: "rgba(255,255,255,0.03)",
//         borderRadius: 16,
//         padding: 16,
//         boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
//       }}
//     >
//       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
//         <div style={{ fontSize: 18 }}>{icon}</div>
//         <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
//         <div style={{ marginLeft: "auto" }}>{right}</div>
//       </div>
//       {children}
//     </div>
//   );
// }

// function Section({ title, icon, children, defaultOpen = true, forceOpen = false }) {
//   const [open, setOpen] = useState(defaultOpen);
//   const isOpen = forceOpen ? true : open;

//   return (
//     <div
//       style={{
//         border: "1px solid rgba(255,255,255,0.10)",
//         background: "rgba(255,255,255,0.02)",
//         borderRadius: 16,
//         overflow: "hidden",
//       }}
//     >
//       <button
//         onClick={() => {
//           if (!forceOpen) setOpen(!open);
//         }}
//         style={{
//           width: "100%",
//           display: "flex",
//           alignItems: "center",
//           gap: 10,
//           padding: "12px 14px",
//           background: "rgba(255,255,255,0.03)",
//           border: "none",
//           color: "#fff",
//           cursor: forceOpen ? "default" : "pointer",
//           opacity: forceOpen ? 0.95 : 1,
//         }}
//       >
//         <span style={{ fontSize: 16 }}>{icon}</span>
//         <span style={{ fontWeight: 900 }}>{title}</span>

//         {!forceOpen && (
//           <span style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 900 }}>
//             {isOpen ? "—" : "+"}
//           </span>
//         )}
//       </button>

//       {isOpen && <div style={{ padding: 14, lineHeight: 1.65 }}>{children}</div>}
//     </div>
//   );
// }

// /* -------------------------------------------
//    Templates
// ------------------------------------------- */

// const TEMPLATES = [
//   {
//     name: "⚡ Action (Shipyard Neon)",
//     text: `Title: The Silent Symphony
// Setting: An abandoned, rain-soaked shipyard in Vizag.
// Vibe: High contrast, neon blues and deep oranges, slow-motion hero entry.

// [0:00 - 0:15] VISUAL: Camera skims an inch above puddles. Reflections of rusted containers. Heavy rain—no thunder—only clink-clink of a chain.
// [0:15 - 0:30] ENTRY: Black umbrella enters. Polished boots step into water. Each step syncs with bass thud.
// [0:30 - 0:45] CONFRONTATION: Hero stops. Twenty mercenaries under flickering floodlight, armed but trembling.
// Dialogue (Hero): "I didn't come here to finish the war." (drops umbrella) "I came here to finish the map."
// [0:45 - 1:00] ACTION: 360-degree single-shot. Rain freezes mid-air (bullet-time). Hero fights like a dancer. Hits create shockwaves of droplets.`,
//   },
//   {
//     name: "🔥 Festival (Temple Jathara)",
//     text: `Title: The Weight of the Crown
// Setting: A crowded temple festival (Jathara) at night.
// Vibe: Crimson reds, thousands of glowing oil lamps, smell of jasmine and gunpowder.

// [0:00 - 0:20] ATMOSPHERE: Frame filled with swirling red Gulal. Massive Dappu drums beat a frantic rhythm.
// [0:20 - 0:40] POWER DISPLAY: Villain (a powerful politician) stands on a pedestal, smirking, preparing to light a massive effigy. He thinks he has won.
// [0:40 - 1:00] SHIFT: A ripple in the crowd. Someone walks against the flow—calm. The drums feel like a warning now.`,
//   },
//   {
//     name: "😱 Horror (Corridor)",
//     text: `Title: Footsteps Without Feet
// Setting: College hostel corridor at 2:13 AM.
// Vibe: Sickly green tube lights, long shadows, silence broken by distant metal taps.

// [0:00 - 0:20] SETUP: A student walks with phone flashlight. Power flickers. A door creaks open by itself.
// [0:20 - 0:40] BUILD: Footsteps approach—yet no one appears. The student whispers, "Who’s there?"
// [0:40 - 1:00] PAYOFF: Phone light dies. In total darkness, a breath is heard inches away.`,
//   },
//   {
//     name: "💔 Romance (Bus Stop)",
//     text: `Title: The Unsent Message
// Setting: Rainy bus stop, evening.
// Vibe: Warm streetlight halos, soft rain, muffled traffic.

// [0:00 - 0:20] SETUP: Two people stand close but emotionally far. One types a message, deletes it.
// [0:20 - 0:40] TENSION: The bus arrives. Doors open. Silence stretches.
// [0:40 - 1:00] END BEAT: One steps in. The other doesn’t wave. Only the phone screen glows.`,
//   },
// ];

// /* -------------------------------------------
//    App
// ------------------------------------------- */

// export default function App() {
//   const [scene, setScene] = useState("");
//   const [result, setResult] = useState(null);

//   const [loading, setLoading] = useState(false);
//   const [mode, setMode] = useState("pro"); // pro | beginner

//   const [pdfLoading, setPdfLoading] = useState(false);
//   const [fullPdfLoading, setFullPdfLoading] = useState(false);

//   const [tab, setTab] = useState("report"); // report | shots | budget | pipeline | storyboard | compare
//   const [exportMode, setExportMode] = useState(false);
//   const [fullPdfMode, setFullPdfMode] = useState(false);

//   const [copied, setCopied] = useState(false);
//   const [storyCopied, setStoryCopied] = useState(false);

//   // Versioning UI
//   const [slot, setSlot] = useState("A"); // A | B
//   const [toast, setToast] = useState("");

//   const pdfRef = useRef(null);

//   const quality = useMemo(() => computeQuality(result), [result]);

//   const badgeStyle = (() => {
//     if (quality.type === "ok") return { background: "rgba(34,197,94,0.90)", color: "#08140b" };
//     if (quality.type === "warn") return { background: "rgba(245,158,11,0.95)", color: "#130a00" };
//     return { background: "rgba(255,255,255,0.25)", color: "#fff" };
//   })();

//   // Active view: pro or beginner, with safe fallback for beginner
//   const active = useMemo(() => {
//     if (!result) return null;
//     const pro = result?.views?.pro || result;
//     const beginnerFromApi = result?.views?.beginner;

//     if (mode === "pro") return pro;

//     // Beginner mode:
//     if (beginnerFromApi) return beginnerFromApi;

//     // fallback:
//     return buildBeginnerViewFromPro(pro);
//   }, [result, mode]);

//   const storyboardSignals = useMemo(() => {
//     if (!result || !active) return null;
//     return buildStoryboardSignals({ scene, mode, active, result });
//   }, [result, scene, mode, active]);

//   const localBudget = useMemo(() => {
//     if (!active) return null;
//     return estimateBudgetINR(scene, active);
//   }, [scene, active]);

//   const showToast = (msg) => {
//     setToast(msg);
//     setTimeout(() => setToast(""), 1400);
//   };

//   const generateAnalysis = async () => {
//     if (!scene.trim()) return;

//     setLoading(true);
//     setResult(null);
//     try {
//       const data = await analyzeScene(scene);
//       setResult(data);
//       setTab("report");
//       setCopied(false);
//       setStoryCopied(false);
//     } catch (err) {
//       console.error(err);
//       alert("Failed to analyze scene");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportPdf = async () => {
//     try {
//       if (!result) {
//         alert("Generate an analysis first.");
//         return;
//       }
//       setPdfLoading(true);
//       setExportMode(true);

//       await new Promise((r) => requestAnimationFrame(r));
//       await new Promise((r) => requestAnimationFrame(r));
//       await new Promise((r) => setTimeout(r, 300));

//       await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_${tab}_Report.pdf`);
//     } catch (err) {
//       console.error(err);
//       alert("PDF export failed. Please try again.");
//     } finally {
//       setExportMode(false);
//       setPdfLoading(false);
//     }
//   };

//   const exportFullPdf = async () => {
//     try {
//       if (!result) {
//         alert("Generate an analysis first.");
//         return;
//       }

//       setFullPdfLoading(true);
//       setExportMode(true);
//       setFullPdfMode(true);

//       await new Promise((r) => requestAnimationFrame(r));
//       await new Promise((r) => requestAnimationFrame(r));
//       await new Promise((r) => setTimeout(r, 350));

//       await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_FULL_Report.pdf`);
//     } catch (err) {
//       console.error(err);
//       alert("Full PDF export failed. Please try again.");
//     } finally {
//       setFullPdfMode(false);
//       setExportMode(false);
//       setFullPdfLoading(false);
//     }
//   };

//   const copyOrganizerJson = async () => {
//     try {
//       if (!result?.organizer_json) {
//         alert("Pipeline JSON not available yet. Generate analysis first.");
//         return;
//       }
//       const text = JSON.stringify(result.organizer_json, null, 2);

//       if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
//       else window.prompt("Copy this JSON:", text);

//       setCopied(true);
//       setTimeout(() => setCopied(false), 1400);
//     } catch (e) {
//       console.error(e);
//       alert("Copy failed. Try again.");
//     }
//   };

//   const copyStoryboardJson = async () => {
//     try {
//       if (!storyboardSignals) {
//         alert("Storyboard signals not available yet. Generate analysis first.");
//         return;
//       }
//       const text = JSON.stringify(storyboardSignals, null, 2);

//       if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
//       else window.prompt("Copy this JSON:", text);

//       setStoryCopied(true);
//       setTimeout(() => setStoryCopied(false), 1400);
//     } catch (e) {
//       console.error(e);
//       alert("Copy failed. Try again.");
//     }
//   };

//   // ✅ Version Save/Load (the real fix for Compare confusion)
//   const saveVersion = () => {
//     if (!result) {
//       alert("Generate analysis first, then save a version.");
//       return;
//     }
//     const payload = {
//       slot,
//       savedAt: Date.now(),
//       scene,
//       mode,
//       result,
//     };
//     const ok = safeWriteVersion(slot, payload);
//     if (!ok) alert("Save failed (storage blocked). Try in normal browser mode.");
//     else showToast(`Saved Version ${slot}`);
//   };

//   const loadVersion = () => {
//     const data = safeReadVersion(slot);
//     if (!data) {
//       alert(`No saved data found in Version ${slot}.`);
//       return;
//     }
//     setScene(data.scene || "");
//     setResult(data.result || null);
//     setTab("report");
//     showToast(`Loaded Version ${slot}`);
//   };

//   const versionA = useMemo(() => safeReadVersion("A"), [toast, slot, result]);
//   const versionB = useMemo(() => safeReadVersion("B"), [toast, slot, result]);

//   const aiConfidenceFixed =
//     active?.ai_confidence != null
//       ? active.ai_confidence <= 1
//         ? Math.round(active.ai_confidence * 100)
//         : Math.round(active.ai_confidence)
//       : 0;

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         color: "#fff",
//         background:
//           "radial-gradient(1200px 600px at 20% 10%, rgba(168,85,247,0.20), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34,197,94,0.13), transparent 55%), #0b0b0f",
//         padding: 24,
//       }}
//     >
//       {/* Toast */}
//       {toast && (
//         <div
//           style={{
//             position: "fixed",
//             top: 16,
//             right: 16,
//             zIndex: 999,
//             background: "rgba(0,0,0,0.75)",
//             border: "1px solid rgba(255,255,255,0.12)",
//             padding: "10px 12px",
//             borderRadius: 12,
//             fontWeight: 900,
//           }}
//         >
//           {toast}
//         </div>
//       )}

//       {/* Top Brand Bar */}
//       <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
//         <div style={{ fontSize: 34 }}>🎬</div>
//         <div>
//           <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: 0.2 }}>SceneCraft</div>
//           <div style={{ opacity: 0.85, marginTop: 2 }}>AI Scene Analysis for Filmmakers</div>
//         </div>

//         <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
//           <Pill active={mode === "beginner"} onClick={() => setMode("beginner")}>
//             🧑‍🎓 Beginner
//           </Pill>
//           <Pill active={mode === "pro"} onClick={() => setMode("pro")}>
//             🎬 Pro
//           </Pill>
//         </div>
//       </div>

//       {/* Main Grid */}
//       <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
//         {/* LEFT PANEL */}
//         <div style={{ display: "grid", gap: 14 }}>
//           <Card icon="🧩" title="Scene Presets" right={<span style={{ opacity: 0.75, fontSize: 12 }}>Click to load</span>}>
//             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//               {TEMPLATES.map((t) => (
//                 <button
//                   key={t.name}
//                   onClick={() => setScene(t.text)}
//                   style={{
//                     background: "rgba(255,255,255,0.04)",
//                     border: "1px solid rgba(255,255,255,0.12)",
//                     color: "#fff",
//                     padding: "8px 10px",
//                     borderRadius: 12,
//                     cursor: "pointer",
//                     fontWeight: 800,
//                     opacity: 0.92,
//                   }}
//                   title="Loads a sample scene so you can demo fast"
//                 >
//                   {t.name}
//                 </button>
//               ))}
//             </div>
//           </Card>

//           <Card icon="✍️" title="Your Scene Input">
//             <textarea
//               rows={14}
//               value={scene}
//               onChange={(e) => setScene(e.target.value)}
//               placeholder="Paste your scene here… (Title / Setting / Vibe / timeline beats)"
//               style={{
//                 width: "100%",
//                 background: "rgba(0,0,0,0.35)",
//                 color: "#fff",
//                 padding: 12,
//                 borderRadius: 14,
//                 border: "1px solid rgba(255,255,255,0.12)",
//                 outline: "none",
//                 lineHeight: 1.6,
//                 resize: "vertical",
//               }}
//             />

//             {/* Versioning (clean UI) */}
//             <div
//               style={{
//                 marginTop: 12,
//                 padding: 12,
//                 borderRadius: 14,
//                 border: "1px solid rgba(255,255,255,0.10)",
//                 background: "rgba(255,255,255,0.03)",
//               }}
//             >
//               <div style={{ fontWeight: 1000, marginBottom: 10, opacity: 0.95 }}>Versions</div>

//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                 <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                   <span style={{ opacity: 0.85, fontWeight: 900 }}>Slot:</span>
//                   <button
//                     onClick={() => setSlot("A")}
//                     style={{
//                       border: "1px solid rgba(255,255,255,0.12)",
//                       background: slot === "A" ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.04)",
//                       color: "#fff",
//                       padding: "8px 10px",
//                       borderRadius: 12,
//                       cursor: "pointer",
//                       fontWeight: 900,
//                     }}
//                   >
//                     A
//                   </button>
//                   <button
//                     onClick={() => setSlot("B")}
//                     style={{
//                       border: "1px solid rgba(255,255,255,0.12)",
//                       background: slot === "B" ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.04)",
//                       color: "#fff",
//                       padding: "8px 10px",
//                       borderRadius: 12,
//                       cursor: "pointer",
//                       fontWeight: 900,
//                     }}
//                   >
//                     B
//                   </button>
//                 </div>

//                 <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
//                   <button
//                     onClick={saveVersion}
//                     disabled={!result}
//                     style={{
//                       padding: "10px 12px",
//                       borderRadius: 12,
//                       border: "1px solid rgba(255,255,255,0.14)",
//                       background: !result ? "rgba(255,255,255,0.05)" : "rgba(168,85,247,0.18)",
//                       color: "#fff",
//                       fontWeight: 1000,
//                       cursor: !result ? "not-allowed" : "pointer",
//                       opacity: !result ? 0.6 : 1,
//                     }}
//                   >
//                     💾 Save Slot {slot}
//                   </button>

//                   <button
//                     onClick={loadVersion}
//                     style={{
//                       padding: "10px 12px",
//                       borderRadius: 12,
//                       border: "1px solid rgba(255,255,255,0.14)",
//                       background: "rgba(255,255,255,0.06)",
//                       color: "#fff",
//                       fontWeight: 1000,
//                       cursor: "pointer",
//                     }}
//                   >
//                     ⬇️ Load Slot {slot}
//                   </button>
//                 </div>
//               </div>

//               <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
//                 <div>
//                   A: {versionA?.savedAt ? new Date(versionA.savedAt).toLocaleString() : "Not saved"}
//                 </div>
//                 <div>
//                   B: {versionB?.savedAt ? new Date(versionB.savedAt).toLocaleString() : "Not saved"}
//                 </div>
//               </div>
//             </div>

//             {/* Main Actions */}
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
//               <button
//                 onClick={generateAnalysis}
//                 disabled={loading}
//                 style={{
//                   padding: "12px 12px",
//                   borderRadius: 14,
//                   border: "1px solid rgba(255,255,255,0.14)",
//                   background: loading ? "rgba(255,255,255,0.08)" : "rgba(168,85,247,0.35)",
//                   color: "#fff",
//                   fontWeight: 1000,
//                   cursor: loading ? "not-allowed" : "pointer",
//                 }}
//               >
//                 {loading ? "Analyzing…" : "Generate Analysis"}
//               </button>

//               <button
//                 onClick={exportPdf}
//                 disabled={!result || pdfLoading}
//                 style={{
//                   padding: "12px 12px",
//                   borderRadius: 14,
//                   border: "1px solid rgba(255,255,255,0.14)",
//                   background: !result ? "rgba(255,255,255,0.05)" : "rgba(34,197,94,0.24)",
//                   color: "#fff",
//                   fontWeight: 1000,
//                   cursor: !result || pdfLoading ? "not-allowed" : "pointer",
//                   opacity: !result ? 0.6 : 1,
//                 }}
//               >
//                 {pdfLoading ? "Exporting…" : "⬇️ Export This Tab PDF"}
//               </button>

//               <button
//                 onClick={exportFullPdf}
//                 disabled={!result || fullPdfLoading}
//                 style={{
//                   gridColumn: "1 / -1",
//                   padding: "12px 12px",
//                   borderRadius: 14,
//                   border: "1px solid rgba(255,255,255,0.14)",
//                   background: !result ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.22)",
//                   color: "#fff",
//                   fontWeight: 1000,
//                   cursor: !result || fullPdfLoading ? "not-allowed" : "pointer",
//                   opacity: !result ? 0.6 : 1,
//                 }}
//               >
//                 {fullPdfLoading ? "Exporting Full PDF…" : "📘 Export FULL PDF (All Tabs)"}
//               </button>

//               <button
//                 onClick={copyOrganizerJson}
//                 disabled={!result?.organizer_json}
//                 style={{
//                   gridColumn: "1 / -1",
//                   padding: "12px 12px",
//                   borderRadius: 14,
//                   border: "1px solid rgba(255,255,255,0.14)",
//                   background: !result?.organizer_json ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)",
//                   color: "#fff",
//                   fontWeight: 1000,
//                   cursor: !result?.organizer_json ? "not-allowed" : "pointer",
//                   opacity: !result?.organizer_json ? 0.6 : 1,
//                 }}
//               >
//                 {copied ? "✅ Copied Pipeline JSON" : "📋 Copy Pipeline JSON"}
//               </button>

//               <button
//                 onClick={copyStoryboardJson}
//                 disabled={!storyboardSignals}
//                 style={{
//                   gridColumn: "1 / -1",
//                   padding: "12px 12px",
//                   borderRadius: 14,
//                   border: "1px solid rgba(255,255,255,0.14)",
//                   background: !storyboardSignals ? "rgba(255,255,255,0.05)" : "rgba(168,85,247,0.18)",
//                   color: "#fff",
//                   fontWeight: 1000,
//                   cursor: !storyboardSignals ? "not-allowed" : "pointer",
//                   opacity: !storyboardSignals ? 0.6 : 1,
//                 }}
//               >
//                 {storyCopied ? "✅ Copied Storyboard Signals JSON" : "🧠 Copy Storyboard Signals JSON"}
//               </button>
//             </div>

//             <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: 1.5 }}>
//               Tip: Save A = “first draft”. Improve scene. Save B = “improved draft”. Compare tab becomes your judge-magnet.
//             </div>
//           </Card>
//         </div>

//         {/* RIGHT PANEL */}
//         <div style={{ display: "grid", gap: 14 }}>
//           {/* Tabs */}
//           <Card
//             icon="📄"
//             title="Analysis Workspace"
//             right={
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 <Pill active={tab === "report"} onClick={() => setTab("report")}>Report</Pill>
//                 <Pill active={tab === "shots"} onClick={() => setTab("shots")}>Shots</Pill>
//                 <Pill active={tab === "budget"} onClick={() => setTab("budget")}>Budget</Pill>
//                 <Pill active={tab === "pipeline"} onClick={() => setTab("pipeline")}>Pipeline</Pill>
//                 <Pill active={tab === "storyboard"} onClick={() => setTab("storyboard")}>Storyboard</Pill>
//                 <Pill active={tab === "compare"} onClick={() => setTab("compare")}>Compare</Pill>
//               </div>
//             }
//           >
//             <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
//               This is your “judge stage” — keep it clean, story-driven, and obviously useful.
//             </div>
//           </Card>

//           {/* PDF Export Root */}
//           <div
//             ref={pdfRef}
//             id="pdf-export-root"
//             style={{
//               border: "1px solid rgba(255,255,255,0.10)",
//               borderRadius: 18,
//               overflow: exportMode ? "visible" : "hidden",
//               background: "rgba(255,255,255,0.02)",
//               boxShadow: exportMode ? "none" : "0 20px 60px rgba(0,0,0,0.35)",
//             }}
//           >
//             {/* Report Header */}
//             <div
//               style={{
//                 position: exportMode ? "relative" : "sticky",
//                 top: 0,
//                 zIndex: 5,
//                 padding: 14,
//                 background: "rgba(10,10,14,0.92)",
//                 backdropFilter: exportMode ? "none" : "blur(10px)",
//                 borderBottom: "1px solid rgba(255,255,255,0.10)",
//               }}
//             >
//               <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
//                 <div style={{ fontWeight: 1000, fontSize: 18 }}>🎬 SceneCraft Report</div>
//                 <div style={{ opacity: 0.8 }}>{formatNow()}</div>

//                 <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
//                   <span style={{ opacity: 0.8, fontWeight: 800 }}>View:</span>
//                   <span
//                     style={{
//                       padding: "6px 10px",
//                       borderRadius: 999,
//                       border: "1px solid rgba(255,255,255,0.12)",
//                       background: "rgba(255,255,255,0.04)",
//                       fontWeight: 900,
//                     }}
//                   >
//                     {mode === "pro" ? "Pro" : "Beginner"}
//                   </span>

//                   <span
//                     title={quality.details}
//                     style={{
//                       ...badgeStyle,
//                       padding: "6px 10px",
//                       borderRadius: 999,
//                       fontWeight: 1000,
//                     }}
//                   >
//                     {quality.label}
//                   </span>
//                 </div>
//               </div>

//               {exportMode && (
//                 <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
//                   Export mode: all sections expanded for complete PDF capture.
//                 </div>
//               )}
//             </div>

//             {/* Content */}
//             <div style={{ padding: 14 }}>
//               {!active ? (
//                 <div
//                   style={{
//                     border: "1px dashed rgba(255,255,255,0.18)",
//                     borderRadius: 16,
//                     padding: 18,
//                     background: "rgba(255,255,255,0.02)",
//                     opacity: 0.9,
//                     lineHeight: 1.7,
//                   }}
//                 >
//                   <div style={{ fontWeight: 1000, fontSize: 18 }}>👋 Ready when you are</div>
//                   <div style={{ marginTop: 6, opacity: 0.85 }}>
//                     Load a preset or paste a scene → hit <b>Generate Analysis</b>.
//                   </div>
//                 </div>
//               ) : (
//                 <div style={{ display: "grid", gap: 12 }}>
//                   {/* REPORT */}
//                   {(tab === "report" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginBottom: 6 }}>📄 Report</div>}

//                       <Section title="Input Scene" icon="📝" defaultOpen={false} forceOpen={exportMode}>
//                         <pre
//                           style={{
//                             whiteSpace: "pre-wrap",
//                             background: "rgba(0,0,0,0.35)",
//                             padding: 12,
//                             borderRadius: 14,
//                             border: "1px solid rgba(255,255,255,0.12)",
//                             lineHeight: 1.6,
//                           }}
//                         >
//                           {scene || "—"}
//                         </pre>
//                       </Section>

//                       <Section title="Scene Overview" icon="🧾" forceOpen={exportMode}>
//                         <div style={{ fontSize: 16, opacity: 0.95 }}>{active.scene_overview || "—"}</div>
//                       </Section>

//                       <Section title="Key Beats" icon="🧩" forceOpen={exportMode}>
//                         <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.75 }}>
//                           {(active.key_beats || []).map((b, i) => (
//                             <li key={i} style={{ marginBottom: 8 }}>{b}</li>
//                           ))}
//                         </ol>
//                       </Section>

//                       <Section title="Mentor Explanation" icon="🎓" forceOpen={exportMode}>
//                         <div style={{ opacity: 0.95, lineHeight: 1.75 }}>{active.mentor_explanation || "—"}</div>
//                       </Section>

//                       {mode === "pro" ? (
//                         <Section title="Pro Quick Notes" icon="⚡" forceOpen={exportMode}>
//                           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                             {[
//                               ["Intent", active.scene_intelligence?.intent],
//                               ["Emotion", active.scene_intelligence?.emotion],
//                               ["Visual Mood", active.scene_intelligence?.visual_mood],
//                               ["Camera Style", active.scene_intelligence?.camera_style],
//                             ].map(([label, value]) => (
//                               <div
//                                 key={label}
//                                 style={{
//                                   padding: 12,
//                                   borderRadius: 14,
//                                   border: "1px solid rgba(255,255,255,0.10)",
//                                   background: "rgba(255,255,255,0.03)",
//                                 }}
//                               >
//                                 <div style={{ opacity: 0.8, fontWeight: 900 }}>{label}</div>
//                                 <div style={{ marginTop: 6 }}>{value || "—"}</div>
//                               </div>
//                             ))}
//                           </div>
//                         </Section>
//                       ) : (
//                         <Section title="Beginner Guidance" icon="🧑‍🎓" forceOpen={exportMode}>
//                           <KeyValueList data={active.beginner_guidance} />
//                         </Section>
//                       )}

//                       <Section title="Scene Analysis" icon="🧠" forceOpen={exportMode}>
//                         <KeyValueList data={active.scene_analysis} />
//                       </Section>

//                       <Section title="Confidence" icon="📊" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Emotion</div>
//                             <div style={{ marginTop: 6 }}>
//                               {Math.round((active.confidence_breakdown?.emotion_clarity ?? 0.6) * 100)}%
//                             </div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Visual</div>
//                             <div style={{ marginTop: 6 }}>
//                               {Math.round((active.confidence_breakdown?.visual_clarity ?? 0.6) * 100)}%
//                             </div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Narrative</div>
//                             <div style={{ marginTop: 6 }}>
//                               {Math.round((active.confidence_breakdown?.narrative_clarity ?? 0.6) * 100)}%
//                             </div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>AI Confidence</div>
//                             <div style={{ marginTop: 6 }}>{aiConfidenceFixed}%</div>
//                           </div>
//                         </div>
//                       </Section>
//                     </>
//                   )}

//                   {/* SHOTS */}
//                   {(tab === "shots" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 10, marginBottom: 6 }}>📸 Shots</div>}

//                       <Section title="Scene Intelligence" icon="🎯" forceOpen={exportMode}>
//                         <KeyValueList data={active.scene_intelligence} />
//                       </Section>

//                       <Section title="Shot List" icon="📸" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gap: 10 }}>
//                           {(active.shot_list || []).map((s, i) => (
//                             <div
//                               key={i}
//                               style={{
//                                 padding: 12,
//                                 borderRadius: 16,
//                                 border: "1px solid rgba(255,255,255,0.10)",
//                                 background: "rgba(255,255,255,0.03)",
//                               }}
//                             >
//                               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                                 <div
//                                   style={{
//                                     width: 34,
//                                     height: 34,
//                                     borderRadius: 12,
//                                     background: "rgba(168,85,247,0.25)",
//                                     display: "grid",
//                                     placeItems: "center",
//                                     fontWeight: 1000,
//                                   }}
//                                 >
//                                   {s.shot_number ?? i + 1}
//                                 </div>
//                                 <div style={{ fontWeight: 1000 }}>{s.shot_type}</div>
//                                 <div style={{ marginLeft: "auto", opacity: 0.85 }}>🎥 {s.camera_movement}</div>
//                               </div>
//                               <div style={{ marginTop: 10, opacity: 0.92, lineHeight: 1.6 }}>{s.purpose}</div>
//                             </div>
//                           ))}
//                         </div>
//                       </Section>

//                       <Section title="Director Plan" icon="🎥" forceOpen={exportMode}>
//                         <KeyValueList data={active.director_plan} />
//                       </Section>
//                     </>
//                   )}

//                   {/* BUDGET */}
//                   {(tab === "budget" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 10, marginBottom: 6 }}>💸 Budget</div>}

//                       <Section title="AI Production Notes (Budget + Risks)" icon="🎬" forceOpen={exportMode}>
//                         <KeyValueList data={active.production_notes} />
//                       </Section>

//                       <Section title="SceneCraft Local Estimate (Varies by Scene)" icon="🧮" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gap: 10 }}>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Tier</div>
//                             <div style={{ marginTop: 6 }}>{localBudget?.tier || "—"}</div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Estimate Range (INR)</div>
//                             <div style={{ marginTop: 6 }}>{localBudget?.estimate_range_inr || "—"}</div>
//                           </div>
//                         </div>

//                         <div style={{ marginTop: 10 }}>
//                           <div style={{ opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Cost Drivers</div>
//                           <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
//                             {(localBudget?.cost_drivers || []).map((x, i) => <li key={i}>{x}</li>)}
//                           </ul>
//                         </div>

//                         <div style={{ marginTop: 10 }}>
//                           <div style={{ opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Money Savers</div>
//                           <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
//                             {(localBudget?.money_savers || []).map((x, i) => <li key={i}>{x}</li>)}
//                           </ul>
//                         </div>

//                         <div style={{ marginTop: 10 }}>
//                           <div style={{ opacity: 0.85, fontWeight: 900, marginBottom: 6 }}>Risks</div>
//                           <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
//                             {(localBudget?.risks || []).map((x, i) => <li key={i}>{x}</li>)}
//                           </ul>
//                         </div>

//                         <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: 1.6 }}>
//                           {localBudget?.confidence_note}
//                         </div>
//                       </Section>
//                     </>
//                   )}

//                   {/* PIPELINE (renamed from Organizer) */}
//                   {(tab === "pipeline" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 10, marginBottom: 6 }}>🧩 Pipeline</div>}

//                       <Section title="Downstream Tool Signals (Pipeline JSON)" icon="🧾" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Emotion</div>
//                             <div style={{ marginTop: 6 }}>{result?.organizer_json?.emotion ?? "—"}</div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Visual Mood</div>
//                             <div style={{ marginTop: 6 }}>{result?.organizer_json?.visual_mood ?? "—"}</div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Camera Style</div>
//                             <div style={{ marginTop: 6 }}>{result?.organizer_json?.camera_style ?? "—"}</div>
//                           </div>
//                           <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                             <div style={{ opacity: 0.8, fontWeight: 900 }}>Confidence</div>
//                             <div style={{ marginTop: 6 }}>
//                               {result?.organizer_json?.confidence != null
//                                 ? `${Math.round(
//                                     result.organizer_json.confidence <= 1
//                                       ? result.organizer_json.confidence * 100
//                                       : result.organizer_json.confidence
//                                   )}%`
//                                 : "—"}
//                             </div>
//                           </div>
//                         </div>
//                       </Section>

//                       <Section title="Pipeline JSON Output" icon="📦" defaultOpen={false} forceOpen={exportMode}>
//                         <pre
//                           style={{
//                             whiteSpace: "pre-wrap",
//                             background: "rgba(0,0,0,0.35)",
//                             padding: 12,
//                             borderRadius: 14,
//                             border: "1px solid rgba(255,255,255,0.12)",
//                             lineHeight: 1.55,
//                           }}
//                         >
//                           {result?.organizer_json ? JSON.stringify(result.organizer_json, null, 2) : "—"}
//                         </pre>
//                       </Section>
//                     </>
//                   )}

//                   {/* STORYBOARD */}
//                   {(tab === "storyboard" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 10, marginBottom: 6 }}>🧠 Storyboard Signals</div>}

//                       <Section title="Multimodal Scene Intent" icon="🧠" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                           {[
//                             ["Intent", storyboardSignals?.creative_intent?.intent],
//                             ["Emotion", storyboardSignals?.creative_intent?.emotion],
//                             ["Visual Mood", storyboardSignals?.creative_intent?.visual_mood],
//                             ["Camera Style", storyboardSignals?.creative_intent?.camera_style],
//                           ].map(([label, value]) => (
//                             <div
//                               key={label}
//                               style={{
//                                 padding: 12,
//                                 borderRadius: 14,
//                                 border: "1px solid rgba(255,255,255,0.10)",
//                                 background: "rgba(255,255,255,0.03)",
//                               }}
//                             >
//                               <div style={{ opacity: 0.8, fontWeight: 900 }}>{label}</div>
//                               <div style={{ marginTop: 6 }}>{value ?? "—"}</div>
//                             </div>
//                           ))}
//                         </div>

//                         <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12, lineHeight: 1.55 }}>
//                           These signals are designed for downstream tools: storyboard generators, director assistants, and previz systems.
//                         </div>
//                       </Section>

//                       <Section title="Storyboard Frames (Beat → Shot Mapping)" icon="🎞️" forceOpen={exportMode}>
//                         <div style={{ display: "grid", gap: 10 }}>
//                           {(storyboardSignals?.storyboard_frames || []).map((f, i) => (
//                             <div
//                               key={i}
//                               style={{
//                                 padding: 12,
//                                 borderRadius: 16,
//                                 border: "1px solid rgba(255,255,255,0.10)",
//                                 background: "rgba(255,255,255,0.03)",
//                               }}
//                             >
//                               <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
//                                 <div
//                                   style={{
//                                     width: 36,
//                                     height: 36,
//                                     borderRadius: 12,
//                                     background: "rgba(59,130,246,0.25)",
//                                     display: "grid",
//                                     placeItems: "center",
//                                     fontWeight: 1000,
//                                   }}
//                                 >
//                                   {f.frame_number ?? i + 1}
//                                 </div>
//                                 <div style={{ fontWeight: 1000, opacity: 0.95 }}>Frame Prompt</div>
//                                 <div style={{ marginLeft: "auto", opacity: 0.85 }}>
//                                   📷 {f.recommended_shot_type} • 🎥 {f.camera_movement}
//                                 </div>
//                               </div>

//                               <div style={{ marginTop: 10, opacity: 0.95, lineHeight: 1.6 }}>
//                                 <b>Beat:</b> {f.beat}
//                               </div>

//                               <div style={{ marginTop: 8, opacity: 0.88, lineHeight: 1.6 }}>
//                                 <b>Director Intent:</b> {f.director_intent}
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </Section>

//                       <Section title="Previz / Tool-Ready JSON (Downstream)" icon="📦" defaultOpen={false} forceOpen={exportMode}>
//                         <pre
//                           style={{
//                             whiteSpace: "pre-wrap",
//                             background: "rgba(0,0,0,0.35)",
//                             padding: 12,
//                             borderRadius: 14,
//                             border: "1px solid rgba(255,255,255,0.12)",
//                             lineHeight: 1.55,
//                           }}
//                         >
//                           {storyboardSignals ? JSON.stringify(storyboardSignals, null, 2) : "—"}
//                         </pre>
//                       </Section>
//                     </>
//                   )}

//                   {/* COMPARE */}
//                   {(tab === "compare" || fullPdfMode) && (
//                     <>
//                       {fullPdfMode && <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 10, marginBottom: 6 }}>🆚 Compare</div>}

//                       <Section title="A vs B Snapshot" icon="🆚" forceOpen={exportMode}>
//                         {!versionA || !versionB ? (
//                           <div style={{ opacity: 0.9, lineHeight: 1.7 }}>
//                             Save <b>Version A</b> and <b>Version B</b> first. Then Compare shows what changed.
//                           </div>
//                         ) : (
//                           <div style={{ display: "grid", gap: 12 }}>
//                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//                               <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                                 <div style={{ fontWeight: 1000, marginBottom: 6 }}>Version A</div>
//                                 <div style={{ opacity: 0.8, fontSize: 12 }}>
//                                   {new Date(versionA.savedAt).toLocaleString()}
//                                 </div>
//                                 <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, lineHeight: 1.6 }}>
//                                   Scene length: {(versionA.scene || "").length} chars
//                                 </div>
//                               </div>

//                               <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
//                                 <div style={{ fontWeight: 1000, marginBottom: 6 }}>Version B</div>
//                                 <div style={{ opacity: 0.8, fontSize: 12 }}>
//                                   {new Date(versionB.savedAt).toLocaleString()}
//                                 </div>
//                                 <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, lineHeight: 1.6 }}>
//                                   Scene length: {(versionB.scene || "").length} chars
//                                 </div>
//                               </div>
//                             </div>

//                             {/* Compare Key Fields */}
//                             <div
//                               style={{
//                                 padding: 12,
//                                 borderRadius: 14,
//                                 border: "1px solid rgba(255,255,255,0.10)",
//                                 background: "rgba(255,255,255,0.02)",
//                               }}
//                             >
//                               <div style={{ fontWeight: 1000, marginBottom: 10 }}>Key Creative Intent Differences</div>

//                               {(() => {
//                                 const A = versionA?.result?.views?.pro || versionA?.result || {};
//                                 const B = versionB?.result?.views?.pro || versionB?.result || {};
//                                 const siA = A.scene_intelligence || {};
//                                 const siB = B.scene_intelligence || {};

//                                 const rows = [
//                                   ["Intent", siA.intent, siB.intent],
//                                   ["Emotion", siA.emotion, siB.emotion],
//                                   ["Visual Mood", siA.visual_mood, siB.visual_mood],
//                                   ["Camera Style", siA.camera_style, siB.camera_style],
//                                   ["Budget Tier (AI)", A.production_notes?.budget_details?.tier, B.production_notes?.budget_details?.tier],
//                                 ];

//                                 return (
//                                   <div style={{ display: "grid", gap: 10 }}>
//                                     {rows.map(([label, a, b]) => (
//                                       <div
//                                         key={label}
//                                         style={{
//                                           display: "grid",
//                                           gridTemplateColumns: "180px 1fr 1fr 120px",
//                                           gap: 10,
//                                           padding: 10,
//                                           borderRadius: 12,
//                                           border: "1px solid rgba(255,255,255,0.08)",
//                                           background: "rgba(255,255,255,0.03)",
//                                           alignItems: "center",
//                                         }}
//                                       >
//                                         <div style={{ fontWeight: 900, opacity: 0.9 }}>{label}</div>
//                                         <div style={{ opacity: 0.95 }}>{a || "—"}</div>
//                                         <div style={{ opacity: 0.95 }}>{b || "—"}</div>
//                                         <div
//                                           style={{
//                                             fontWeight: 1000,
//                                             opacity: 0.95,
//                                             textAlign: "right",
//                                             color: a === b ? "rgba(255,255,255,0.75)" : "rgba(34,197,94,0.95)",
//                                           }}
//                                         >
//                                           {diffText(a, b)}
//                                         </div>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 );
//                               })()}
//                             </div>

//                             <div style={{ opacity: 0.78, fontSize: 12, lineHeight: 1.6 }}>
//                               Jury-friendly punchline: “We don’t just generate output — we support iteration. A/B comparison proves creative decision changes.”
//                             </div>
//                           </div>
//                         )}
//                       </Section>
//                     </>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
//             Studio vibe: tabs for clarity. Compare mode = product maturity flex.
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

/* =========================================================
   App.jsx ✅ REPLACE YOUR FILE CONTENT WITH THIS FULL CODE
   (I kept your original structure + added fixes)
========================================================= */
import { useMemo, useRef, useState } from "react";
import { analyzeScene } from "./ai/sceneAnalyzer";
import { exportNodeToPdf } from "./utils/exportPdf";

/* -------------------------------------------
   Helpers
------------------------------------------- */

function isMeaningfulScene(text = "") {
  const t = String(text ?? "").trim();

  // Block dots / symbols / very short inputs
  if (t.length < 25) return false;

  // Must include letters (not only punctuation)
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters < 10) return false;

  // Must have at least a few words
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;

  // Block inputs like "." ".." "---" "..."
  if (/^[.\-_*~`'"!?(),\s]+$/.test(t)) return false;

  return true;
}

function KeyValueList({ data }) {
  if (!data || typeof data !== "object") return <p style={{ opacity: 0.8 }}>—</p>;

  const renderValue = (v) => {
    if (v == null) return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);

    if (Array.isArray(v)) {
      if (v.every((x) => typeof x !== "object" || x === null)) return v.map(String).join(", ");
      return (
        <ul style={{ marginTop: 6 }}>
          {v.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              {typeof item === "object" && item !== null ? <KeyValueList data={item} /> : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    return <KeyValueList data={v} />;
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Object.entries(data).map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: 12,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",

            // ✅ Fix “vertical letters / weird wrapping in PDF”
            overflowWrap: "anywhere",
            wordBreak: "normal",
          }}
        >
          <div style={{ opacity: 0.85, fontWeight: 700, textTransform: "capitalize" }}>
            {k.replaceAll("_", " ")}
          </div>
          <div style={{ opacity: 0.92, lineHeight: 1.6 }}>{renderValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

function formatNow() {
  const d = new Date();
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

function computeQuality(result) {
  if (!result) return { label: "—", type: "neutral", details: "" };

  const hasViews = result.views && typeof result.views === "object";
  const hasPro = hasViews && result.views.pro;
  const hasBeginner = hasViews && result.views.beginner;

  if (hasPro && hasBeginner) {
    return { label: "Valid AI Output", type: "ok", details: "Structured output generated successfully." };
  }

  return {
    label: "Fallback View",
    type: "warn",
    details: "Backend did not provide both views; app is generating safe fallback.",
  };
}

/**
 * Beginner fallback: convert pro output into beginner-friendly guidance
 */
function deriveBeginnerFromPro(proView) {
  const si = proView?.scene_intelligence || {};
  const beats = Array.isArray(proView?.key_beats) ? proView.key_beats : [];
  const shots = Array.isArray(proView?.shot_list) ? proView.shot_list : [];

  return {
    scene_overview: proView?.scene_overview || "—",
    key_beats: beats,
    mentor_explanation:
      proView?.mentor_explanation ||
      `Beginner breakdown:
1) What to show (beats)
2) Which shots to capture (minimum coverage)
3) Why it works (emotion + mood)
4) How to shoot it with simple lighting + simple camera moves.`,
    beginner_guidance: {
      "What is happening?": proView?.scene_overview || "—",
      "What emotion should audience feel?": si.emotion || "—",
      "What is the visual mood?": si.visual_mood || "—",
      "Simple lighting tip": si.visual_mood
        ? `Match the mood: ${si.visual_mood}. Use one key light + practicals; avoid flat overhead lighting.`
        : "Use one key light + practicals; avoid flat overhead lighting.",
      "How to shoot simply (student level)": {
        "Camera plan": si.camera_style || "Use wide shots for location + close-ups for emotion.",
        "Shots to capture (minimum)": shots.slice(0, 5).map((s, i) => ({
          step: i + 1,
          shot_type: s.shot_type || "—",
          purpose: s.purpose || "—",
        })),
      },
    },
    scene_analysis: proView?.scene_analysis || {},
    confidence_breakdown:
      proView?.confidence_breakdown || { emotion_clarity: 0.65, visual_clarity: 0.6, narrative_clarity: 0.65 },
    ai_confidence: proView?.ai_confidence ?? 0.75,
  };
}

/**
 * Budget fallback heuristic (to avoid “same budget every time”).
 * This does NOT replace AI; it’s a safety net if AI is generic.
 */
function estimateBudgetFromText(sceneText = "") {
  const t = sceneText.toLowerCase();

  let score = 0;
  const add = (cond, pts) => {
    if (cond) score += pts;
  };

  add(/crowd|thousands|hundreds|extras|jathara|festival/.test(t), 3);
  add(/rain|storm|flood|water|puddle/.test(t), 2);
  add(/fight|action|gun|blast|explosion|stunt/.test(t), 3);
  add(/vfx|cgi|bullet-time|slow motion|wire/.test(t), 3);
  add(/night|neon|low light/.test(t), 1);
  add(/shipyard|factory|warehouse|containers/.test(t), 2);
  add(/temple|jathara|procession/.test(t), 2);
  add(/hostel|corridor|room|indoor/.test(t), 0);
  add(/bus stop|street|outdoor/.test(t), 1);

  let tier = "Low";
  let range = "₹30,000 – ₹1,50,000";

  if (score >= 8) {
    tier = "High";
    range = "₹8,00,000 – ₹30,00,000+";
  } else if (score >= 5) {
    tier = "Medium";
    range = "₹2,00,000 – ₹8,00,000";
  } else if (score >= 2) {
    tier = "Low–Medium";
    range = "₹80,000 – ₹3,00,000";
  }

  return {
    tier,
    estimate_range_inr: range,
    drivers: [
      score >= 8 ? "Large extras / major set / VFX" : null,
      /rain|storm|water/.test(t) ? "Weather/Water logistics" : null,
      /fight|stunt|action/.test(t) ? "Stunts / choreography" : null,
      /night|low light|neon/.test(t) ? "Lighting package" : null,
      /temple|festival|jathara/.test(t) ? "Permissions + crowd control" : null,
    ].filter(Boolean),
  };
}

/**
 * Storyboard / Previz signals (frontend-safe)
 */
function buildStoryboardSignals({ scene, mode, active, result }) {
  const si = active?.scene_intelligence || {};
  const beats = Array.isArray(active?.key_beats) ? active.key_beats : [];
  const shots = Array.isArray(active?.shot_list) ? active.shot_list : [];

  const frames = beats.map((beat, idx) => {
    const shot = shots[idx] || {};
    return {
      frame_number: idx + 1,
      beat: beat || "—",
      recommended_shot_type: shot?.shot_type || "—",
      camera_movement: shot?.camera_movement || "—",
      director_intent: shot?.purpose || "—",
    };
  });

  return {
    meta: { product: "SceneCraft", view_mode: mode, generated_at: new Date().toISOString() },
    creative_intent: {
      intent: si?.intent ?? "—",
      emotion: si?.emotion ?? (result?.organizer_json?.emotion ?? "—"),
      visual_mood: si?.visual_mood ?? (result?.organizer_json?.visual_mood ?? "—"),
      camera_style: si?.camera_style ?? (result?.organizer_json?.camera_style ?? "—"),
    },
    storyboard_frames: frames.length
      ? frames
      : [{ frame_number: 1, beat: "—", recommended_shot_type: "—", camera_movement: "—", director_intent: "—" }],
    downstream_ready: {
      storyboard_generator: "Use storyboard_frames as frame prompts",
      directors_assistant: "Use creative_intent + frames for continuity/coverage decisions",
      previz_system: "Use camera_style + shot_type + movement per frame",
    },
    original_scene_text: scene || "—",
  };
}

/* -------------------------------------------
   Templates
------------------------------------------- */

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

/* -------------------------------------------
   UI Components
------------------------------------------- */

function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.04)",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: 999,
        cursor: "pointer",
        fontWeight: 800,
        opacity: active ? 1 : 0.85,
        transition: "all 120ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Card({ title, icon, children, right }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 18 }}>{icon}</div>
        <div style={{ fontWeight: 1000, letterSpacing: 0.2 }}>{title}</div>
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
      {children}
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = true, forceOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen ? true : open;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => {
          if (!forceOpen) setOpen(!open);
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.03)",
          border: "none",
          color: "#fff",
          cursor: forceOpen ? "default" : "pointer",
          opacity: forceOpen ? 0.95 : 1,
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 1000 }}>{title}</span>

        {!forceOpen && (
          <span style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 1000 }}>
            {isOpen ? "—" : "+"}
          </span>
        )}
      </button>

      {isOpen && <div style={{ padding: 14, lineHeight: 1.65 }}>{children}</div>}
    </div>
  );
}

/* -------------------------------------------
   Versions + Compare (LocalStorage)
------------------------------------------- */

const LS_KEY_A = "scenecraft_version_A";
const LS_KEY_B = "scenecraft_version_B";

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function saveToSlot(slotKey, payload) {
  localStorage.setItem(slotKey, JSON.stringify(payload));
}

function loadFromSlot(slotKey) {
  return safeParse(localStorage.getItem(slotKey));
}

function diffTag(a, b) {
  if ((a ?? "—") === (b ?? "—")) return "Same";
  return "Changed";
}

export default function App() {
  const [scene, setScene] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("pro"); // pro | beginner
  const [tab, setTab] = useState("report"); // report | shots | budget | intentpack | storyboard | compare

  const [pdfLoading, setPdfLoading] = useState(false);
  const [fullPdfLoading, setFullPdfLoading] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [fullPdfMode, setFullPdfMode] = useState(false);

  const [copied, setCopied] = useState(false);
  const [storyCopied, setStoryCopied] = useState(false);

  // Versions UI state
  const [versionNote, setVersionNote] = useState("");

  const pdfRef = useRef(null);

  const quality = useMemo(() => computeQuality(result), [result]);

  const badgeStyle = useMemo(() => {
    if (quality.type === "ok") return { background: "rgba(34,197,94,0.90)", color: "#08140b" };
    if (quality.type === "warn") return { background: "rgba(245,158,11,0.95)", color: "#130a00" };
    return { background: "rgba(255,255,255,0.25)", color: "#fff" };
  }, [quality]);

  // Pick active view safely
  const active = useMemo(() => {
    if (!result) return null;

    const proView = result?.views?.pro || result;
    const beginnerViewFromBackend = result?.views?.beginner;

    if (mode === "pro") return proView;
    return beginnerViewFromBackend || deriveBeginnerFromPro(proView);
  }, [result, mode]);

  const storyboardSignals = useMemo(() => {
    if (!result || !active) return null;
    return buildStoryboardSignals({ scene, mode, active, result });
  }, [result, scene, mode, active]);

  // Budget display: use AI if present, else fallback heuristic
  const budgetFallback = useMemo(() => estimateBudgetFromText(scene), [scene]);

  const budgetTierAI =
    active?.production_notes?.budget_details?.tier ||
    active?.production_notes?.budget_details?.Tier ||
    active?.production_notes?.budget_tier ||
    null;

  const budgetRangeAI =
    active?.production_notes?.budget_details?.estimate_range_inr ||
    active?.production_notes?.budget_details?.Estimate_Range_Inr ||
    active?.production_notes?.estimate_range_inr ||
    null;

  const budgetTierFinal = budgetTierAI || budgetFallback.tier;
  const budgetRangeFinal = budgetRangeAI || budgetFallback.estimate_range_inr;

  // ✅ Generate A/B variants from the SAME scene text
  const generateAnalysis = async (variant = "A") => {
    if (!isMeaningfulScene(scene)) {
      alert("⚠️ Please paste a real scene (not dots). Add title/setting/beats, then click Generate.");
      return;
    }

    setLoading(true);
    setResult(null);
    setVersionNote("");

    try {
      const seed = variant === "A" ? "A" : `B_${Date.now()}`;

      const prompt =
        scene +
        `\n\n[VARIATION_SEED:${seed}]\n` +
        (variant === "B"
          ? "Generate an alternative creative take (different shot choices + budget drivers) while keeping the same story."
          : "Generate the best first-draft analysis.");

      const data = await analyzeScene(prompt);
      setResult(data);
      setTab("report");
    } catch (err) {
      console.error(err);
      alert("Failed to analyze scene");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    try {
      if (!result) return alert("Generate an analysis first.");

      setPdfLoading(true);
      setExportMode(true);

      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 250));

      await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_${tab}_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExportMode(false);
      setPdfLoading(false);
    }
  };

  const exportFullPdf = async () => {
    try {
      if (!result) return alert("Generate an analysis first.");

      setFullPdfLoading(true);
      setExportMode(true);
      setFullPdfMode(true);

      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 350));

      await exportNodeToPdf(pdfRef.current, `SceneCraft_${mode}_FULL_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert("Full PDF export failed. Please try again.");
    } finally {
      setFullPdfMode(false);
      setExportMode(false);
      setFullPdfLoading(false);
    }
  };

  const copyIntentPackJson = async () => {
    try {
      if (!result?.organizer_json) return alert("Intent Pack JSON not available yet. Generate analysis first.");
      const text = JSON.stringify(result.organizer_json, null, 2);

      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else window.prompt("Copy this JSON:", text);

      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.error(e);
      alert("Copy failed. Try again.");
    }
  };

  const copyStoryboardJson = async () => {
    try {
      if (!storyboardSignals) return alert("Storyboard signals not available yet. Generate analysis first.");
      const text = JSON.stringify(storyboardSignals, null, 2);

      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else window.prompt("Copy this JSON:", text);

      setStoryCopied(true);
      setTimeout(() => setStoryCopied(false), 1400);
    } catch (e) {
      console.error(e);
      alert("Copy failed. Try again.");
    }
  };

  // Versions: Save A/B (scene + result + mode + tab)
  const saveVersion = (slot) => {
    if (!result) return alert("Generate analysis first, then save a version.");
    if (!isMeaningfulScene(scene)) return alert("Scene is empty/invalid. Paste a real scene before saving.");

    const payload = {
      label: slot,
      saved_at: new Date().toISOString(),
      scene,
      mode,
      tab,
      result,
    };

    saveToSlot(slot === "A" ? LS_KEY_A : LS_KEY_B, payload);
    setVersionNote(`✅ Saved Version ${slot}`);
    setTimeout(() => setVersionNote(""), 1400);
  };

  const loadVersion = (slot) => {
    const payload = loadFromSlot(slot === "A" ? LS_KEY_A : LS_KEY_B);
    if (!payload) return alert(`Version ${slot} not found. Save it first.`);

    // ✅ When loading a version, we restore the saved scene + analysis exactly
    setScene(payload.scene || "");
    setMode(payload.mode || "pro");
    setTab(payload.tab || "report");
    setResult(payload.result || null);

    setVersionNote(`📥 Loaded Version ${slot}`);
    setTimeout(() => setVersionNote(""), 1400);
  };

  const versionA = useMemo(() => loadFromSlot(LS_KEY_A), [versionNote]);
  const versionB = useMemo(() => loadFromSlot(LS_KEY_B), [versionNote]);

  const compareData = useMemo(() => {
    if (!versionA || !versionB) return null;

    const viewA = versionA?.result?.views?.pro || versionA?.result;
    const viewB = versionB?.result?.views?.pro || versionB?.result;

    const siA = viewA?.scene_intelligence || {};
    const siB = viewB?.scene_intelligence || {};

    const budgetA =
      viewA?.production_notes?.budget_details?.tier ||
      viewA?.production_notes?.budget_tier ||
      estimateBudgetFromText(versionA.scene).tier;

    const budgetB =
      viewB?.production_notes?.budget_details?.tier ||
      viewB?.production_notes?.budget_tier ||
      estimateBudgetFromText(versionB.scene).tier;

    return {
      a: { time: versionA.saved_at, len: (versionA.scene || "").length, si: siA, budget: budgetA },
      b: { time: versionB.saved_at, len: (versionB.scene || "").length, si: siB, budget: budgetB },
    };
  }, [versionA, versionB]);

  // AI confidence display fix
  const aiConfidenceFixed =
    active?.ai_confidence != null
      ? active.ai_confidence <= 1
        ? Math.round(active.ai_confidence * 100)
        : Math.round(active.ai_confidence)
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#fff",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(168,85,247,0.20), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34,197,94,0.13), transparent 55%), #0b0b0f",
        padding: 24,
      }}
    >
      {/* Top Brand Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 34 }}>🎬</div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: 0.2 }}>SceneCraft</div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>AI Scene Analysis for Filmmakers</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Pill active={mode === "beginner"} onClick={() => setMode("beginner")}>
            🧑‍🎓 Beginner
          </Pill>
          <Pill active={mode === "pro"} onClick={() => setMode("pro")}>
            🎬 Pro
          </Pill>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
        {/* LEFT PANEL */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card icon="🧩" title="Scene Presets" right={<span style={{ opacity: 0.75, fontSize: 12 }}>Click to load</span>}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setScene(t.text)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    padding: "8px 10px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontWeight: 800,
                    opacity: 0.92,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Card>

          <Card icon="✍️" title="Your Scene Input">
            <textarea
              rows={14}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="Paste your scene here… (Title / Setting / Vibe / timeline beats)"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.35)",
                color: "#fff",
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                outline: "none",
                lineHeight: 1.6,
                resize: "vertical",
              }}
            />

            {/* Cleaner Versions UI */}
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1000 }}>🧪 Versions</div>
                <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>
                  {versionNote || "Save A = Draft • Save B = Improved"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => saveVersion("A")}
                  disabled={!result}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: !result ? "rgba(255,255,255,0.05)" : "rgba(168,85,247,0.22)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: !result ? "not-allowed" : "pointer",
                    opacity: !result ? 0.6 : 1,
                  }}
                >
                  Save A
                </button>

                <button
                  onClick={() => saveVersion("B")}
                  disabled={!result}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: !result ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.22)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: !result ? "not-allowed" : "pointer",
                    opacity: !result ? 0.6 : 1,
                  }}
                >
                  Save B
                </button>

                <button
                  onClick={() => loadVersion("A")}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Load A
                </button>

                <button
                  onClick={() => loadVersion("B")}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Load B
                </button>
              </div>

              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12, lineHeight: 1.5 }}>
                Judge-magnet logic: “We don’t just generate output — we support iteration and compare creative decisions.”
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              {/* ✅ Draft / A */}
              <button
                onClick={() => generateAnalysis("A")}
                disabled={loading}
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: loading ? "rgba(255,255,255,0.08)" : "rgba(168,85,247,0.35)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Analyzing…" : "Generate Analysis (A)"}
              </button>

              {/* ✅ Improved / B */}
              <button
                onClick={() => generateAnalysis("B")}
                disabled={loading}
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: loading ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.30)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Analyzing…" : "Generate Variant (B)"}
              </button>

              <button
                onClick={exportPdf}
                disabled={!result || pdfLoading}
                style={{
                  gridColumn: "1 / -1",
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: !result ? "rgba(255,255,255,0.05)" : "rgba(34,197,94,0.24)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: !result || pdfLoading ? "not-allowed" : "pointer",
                  opacity: !result ? 0.6 : 1,
                }}
              >
                {pdfLoading ? "Exporting…" : "⬇️ Export This Tab PDF"}
              </button>

              <button
                onClick={exportFullPdf}
                disabled={!result || fullPdfLoading}
                style={{
                  gridColumn: "1 / -1",
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: !result ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.22)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: !result || fullPdfLoading ? "not-allowed" : "pointer",
                  opacity: !result ? 0.6 : 1,
                }}
              >
                {fullPdfLoading ? "Exporting Full PDF…" : "📘 Export FULL PDF (All Tabs)"}
              </button>

              <button
                onClick={copyIntentPackJson}
                disabled={!result?.organizer_json}
                style={{
                  gridColumn: "1 / -1",
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: !result?.organizer_json ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: !result?.organizer_json ? "not-allowed" : "pointer",
                  opacity: !result?.organizer_json ? 0.6 : 1,
                }}
              >
                {copied ? "✅ Copied Intent Pack JSON" : "📦 Copy Intent Pack JSON"}
              </button>

              <button
                onClick={copyStoryboardJson}
                disabled={!storyboardSignals}
                style={{
                  gridColumn: "1 / -1",
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: !storyboardSignals ? "rgba(255,255,255,0.05)" : "rgba(168,85,247,0.18)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: !storyboardSignals ? "not-allowed" : "pointer",
                  opacity: !storyboardSignals ? 0.6 : 1,
                }}
              >
                {storyCopied ? "✅ Copied Storyboard Signals JSON" : "🧠 Copy Storyboard Signals JSON"}
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12, lineHeight: 1.5 }}>
              Pro tip: Generate (A), Save A → Generate Variant (B), Save B → Compare becomes powerful.
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card
            icon="📄"
            title="Analysis Workspace"
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill active={tab === "report"} onClick={() => setTab("report")}>
                  Report
                </Pill>
                <Pill active={tab === "shots"} onClick={() => setTab("shots")}>
                  Shots
                </Pill>
                <Pill active={tab === "budget"} onClick={() => setTab("budget")}>
                  Budget
                </Pill>
                <Pill active={tab === "intentpack"} onClick={() => setTab("intentpack")}>
                  Intent Pack
                </Pill>
                <Pill active={tab === "storyboard"} onClick={() => setTab("storyboard")}>
                  Storyboard
                </Pill>
                <Pill active={tab === "compare"} onClick={() => setTab("compare")}>
                  Compare
                </Pill>
              </div>
            }
          >
            <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
              Product-style workspace: shows filmmaker logic + AI logic, not raw text.
            </div>
          </Card>

          {/* PDF Root */}
          <div
            ref={pdfRef}
            id="pdf-export-root"
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 18,
              overflow: exportMode ? "visible" : "hidden",
              background: "rgba(255,255,255,0.02)",
              boxShadow: exportMode ? "none" : "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            {/* Header */}
            <div
              style={{
                position: exportMode ? "relative" : "sticky",
                top: 0,
                zIndex: 5,
                padding: 14,
                background: "rgba(10,10,14,0.92)",
                backdropFilter: exportMode ? "none" : "blur(10px)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>🎬 SceneCraft Report</div>
                <div style={{ opacity: 0.8 }}>{formatNow()}</div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ opacity: 0.8, fontWeight: 800 }}>View:</span>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      fontWeight: 900,
                    }}
                  >
                    {mode === "pro" ? "Pro" : "Beginner"}
                  </span>

                  <span
                    title={quality.details}
                    style={{
                      ...badgeStyle,
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontWeight: 1000,
                    }}
                  >
                    {quality.label}
                  </span>
                </div>
              </div>

              {exportMode && (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  Export mode: all sections expanded for complete PDF capture.
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: 14 }}>
              {!active ? (
                <div
                  style={{
                    border: "1px dashed rgba(255,255,255,0.18)",
                    borderRadius: 16,
                    padding: 18,
                    background: "rgba(255,255,255,0.02)",
                    opacity: 0.9,
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ fontWeight: 1000, fontSize: 18 }}>👋 Ready when you are</div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    Load a preset or paste a scene → hit <b>Generate Analysis (A)</b> or <b>Generate Variant (B)</b>.
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                    Tip: A = draft, B = alternative take (different creative choices).
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {/* REPORT */}
                  {(tab === "report" || fullPdfMode) && (
                    <>
                      <Section title="Input Scene" icon="📝" defaultOpen={false} forceOpen={exportMode}>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            background: "rgba(0,0,0,0.35)",
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            lineHeight: 1.6,
                          }}
                        >
                          {scene || "—"}
                        </pre>
                      </Section>

                      <Section title="Scene Overview" icon="🧾" forceOpen={exportMode}>
                        <div style={{ fontSize: 16, opacity: 0.95 }}>{active.scene_overview || "—"}</div>
                      </Section>

                      <Section title="Key Beats" icon="🧩" forceOpen={exportMode}>
                        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.75 }}>
                          {(active.key_beats || []).map((b, i) => (
                            <li key={i} style={{ marginBottom: 8 }}>
                              {b}
                            </li>
                          ))}
                        </ol>
                      </Section>

                      <Section title="Mentor Explanation" icon="🎓" forceOpen={exportMode}>
                        <div style={{ opacity: 0.95, lineHeight: 1.75 }}>{active.mentor_explanation || "—"}</div>
                      </Section>

                      {mode === "pro" ? (
                        <Section title="Pro Quick Notes" icon="⚡" forceOpen={exportMode}>
                          <KeyValueList data={active.scene_intelligence} />
                        </Section>
                      ) : (
                        <Section title="Beginner Guidance" icon="🧑‍🎓" forceOpen={exportMode}>
                          <KeyValueList data={active.beginner_guidance} />
                        </Section>
                      )}

                      <Section title="Scene Analysis" icon="🧠" forceOpen={exportMode}>
                        <KeyValueList data={active.scene_analysis} />
                      </Section>

                      <Section title="Confidence" icon="📊" forceOpen={exportMode}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Emotion</div>
                            <div style={{ marginTop: 6 }}>
                              {Math.round((active.confidence_breakdown?.emotion_clarity ?? 0.6) * 100)}%
                            </div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Visual</div>
                            <div style={{ marginTop: 6 }}>
                              {Math.round((active.confidence_breakdown?.visual_clarity ?? 0.6) * 100)}%
                            </div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Narrative</div>
                            <div style={{ marginTop: 6 }}>
                              {Math.round((active.confidence_breakdown?.narrative_clarity ?? 0.6) * 100)}%
                            </div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>AI Confidence</div>
                            <div style={{ marginTop: 6 }}>{aiConfidenceFixed}%</div>
                          </div>
                        </div>
                      </Section>
                    </>
                  )}

                  {/* SHOTS */}
                  {(tab === "shots" || fullPdfMode) && (
                    <>
                      <Section title="Scene Intelligence" icon="🎯" forceOpen={exportMode}>
                        <KeyValueList data={active.scene_intelligence} />
                      </Section>

                      <Section title="Shot List" icon="📸" forceOpen={exportMode}>
                        <div style={{ display: "grid", gap: 10 }}>
                          {(active.shot_list || []).map((s, i) => (
                            <div
                              key={i}
                              style={{
                                padding: 12,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,0.10)",
                                background: "rgba(255,255,255,0.03)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 12,
                                    background: "rgba(168,85,247,0.25)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 1000,
                                  }}
                                >
                                  {s.shot_number ?? i + 1}
                                </div>
                                <div style={{ fontWeight: 1000 }}>{s.shot_type}</div>
                                <div style={{ marginLeft: "auto", opacity: 0.85 }}>🎥 {s.camera_movement}</div>
                              </div>
                              <div style={{ marginTop: 10, opacity: 0.92, lineHeight: 1.6 }}>{s.purpose}</div>
                            </div>
                          ))}
                        </div>
                      </Section>

                      <Section title="Director Plan" icon="🎥" forceOpen={exportMode}>
                        <KeyValueList data={active.director_plan} />
                      </Section>
                    </>
                  )}

                  {/* BUDGET */}
                  {(tab === "budget" || fullPdfMode) && (
                    <>
                      <Section title="AI Production Notes (Budget + Risks)" icon="💸" forceOpen={exportMode}>
                        <div style={{ display: "grid", gap: 10 }}>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Budget Tier</div>
                            <div style={{ marginTop: 6 }}>{budgetTierFinal}</div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Estimated Range (INR)</div>
                            <div style={{ marginTop: 6 }}>{budgetRangeFinal}</div>
                          </div>

                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Cost Drivers</div>
                            <div style={{ marginTop: 6 }}>
                              {(budgetFallback.drivers || []).length ? budgetFallback.drivers.join(", ") : "—"}
                            </div>
                          </div>

                          {/* If backend has production_notes, show them too */}
                          <div style={{ marginTop: 6 }}>
                            <KeyValueList data={active.production_notes} />
                          </div>
                        </div>
                      </Section>
                    </>
                  )}

                  {/* INTENT PACK */}
                  {(tab === "intentpack" || fullPdfMode) && (
                    <>
                      <Section title="Intent Pack Summary" icon="📦" forceOpen={exportMode}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Emotion</div>
                            <div style={{ marginTop: 6 }}>{result?.organizer_json?.emotion ?? "—"}</div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Visual Mood</div>
                            <div style={{ marginTop: 6 }}>{result?.organizer_json?.visual_mood ?? "—"}</div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Camera Style</div>
                            <div style={{ marginTop: 6 }}>{result?.organizer_json?.camera_style ?? "—"}</div>
                          </div>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ opacity: 0.8, fontWeight: 900 }}>Confidence</div>
                            <div style={{ marginTop: 6 }}>
                              {result?.organizer_json?.confidence != null
                                ? `${Math.round(
                                    result.organizer_json.confidence <= 1
                                      ? result.organizer_json.confidence * 100
                                      : result.organizer_json.confidence
                                  )}%`
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, opacity: 0.82, fontSize: 12, lineHeight: 1.5 }}>
                          Why “Intent Pack”? Because it’s the <b>handoff bundle</b> that downstream tools consume: storyboarding, director’s assistant, and previz.
                        </div>
                      </Section>

                      <Section title="Intent Pack JSON Output" icon="🧾" defaultOpen={false} forceOpen={exportMode}>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            background: "rgba(0,0,0,0.35)",
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            lineHeight: 1.55,
                          }}
                        >
                          {result?.organizer_json ? JSON.stringify(result.organizer_json, null, 2) : "—"}
                        </pre>
                      </Section>
                    </>
                  )}

                  {/* STORYBOARD */}
                  {(tab === "storyboard" || fullPdfMode) && (
                    <>
                      <Section title="Multimodal Scene Intent" icon="🧠" forceOpen={exportMode}>
                        <KeyValueList data={storyboardSignals?.creative_intent} />
                        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12, lineHeight: 1.55 }}>
                          These signals plug into storyboard generators, director assistants, and previz systems.
                        </div>
                      </Section>

                      <Section title="Storyboard Frames (Beat → Shot Mapping)" icon="🎞️" forceOpen={exportMode}>
                        <div style={{ display: "grid", gap: 10 }}>
                          {(storyboardSignals?.storyboard_frames || []).map((f, i) => (
                            <div
                              key={i}
                              style={{
                                padding: 12,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,0.10)",
                                background: "rgba(255,255,255,0.03)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    background: "rgba(59,130,246,0.25)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 1000,
                                  }}
                                >
                                  {f.frame_number ?? i + 1}
                                </div>
                                <div style={{ fontWeight: 1000, opacity: 0.95 }}>Frame Prompt</div>
                                <div style={{ marginLeft: "auto", opacity: 0.85 }}>
                                  📷 {f.recommended_shot_type} • 🎥 {f.camera_movement}
                                </div>
                              </div>

                              <div style={{ marginTop: 10, opacity: 0.95, lineHeight: 1.6 }}>
                                <b>Beat:</b> {f.beat}
                              </div>

                              <div style={{ marginTop: 8, opacity: 0.88, lineHeight: 1.6 }}>
                                <b>Director Intent:</b> {f.director_intent}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>

                      <Section title="Previz / Tool-Ready JSON (Downstream)" icon="📦" defaultOpen={false} forceOpen={exportMode}>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            background: "rgba(0,0,0,0.35)",
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            lineHeight: 1.55,
                          }}
                        >
                          {storyboardSignals ? JSON.stringify(storyboardSignals, null, 2) : "—"}
                        </pre>
                      </Section>
                    </>
                  )}

                  {/* COMPARE */}
                  {(tab === "compare" || fullPdfMode) && (
                    <>
                      <Section title="A vs B Snapshot" icon="🆚" forceOpen={exportMode}>
                        {!compareData ? (
                          <div style={{ opacity: 0.85, lineHeight: 1.6 }}>
                            Save Version A and Version B first. Then Compare becomes your “proof of iteration”.
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div
                                style={{
                                  padding: 12,
                                  borderRadius: 14,
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  background: "rgba(255,255,255,0.03)",
                                }}
                              >
                                <div style={{ fontWeight: 1000 }}>Version A</div>
                                <div style={{ opacity: 0.8, marginTop: 6 }}>
                                  {new Date(compareData.a.time).toLocaleString()}
                                </div>
                                <div style={{ opacity: 0.8, marginTop: 6 }}>Scene length: {compareData.a.len} chars</div>
                              </div>
                              <div
                                style={{
                                  padding: 12,
                                  borderRadius: 14,
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  background: "rgba(255,255,255,0.03)",
                                }}
                              >
                                <div style={{ fontWeight: 1000 }}>Version B</div>
                                <div style={{ opacity: 0.8, marginTop: 6 }}>
                                  {new Date(compareData.b.time).toLocaleString()}
                                </div>
                                <div style={{ opacity: 0.8, marginTop: 6 }}>Scene length: {compareData.b.len} chars</div>
                              </div>
                            </div>

                            <div style={{ marginTop: 12, fontWeight: 1000, fontSize: 18 }}>
                              Key Creative Intent Differences
                            </div>

                            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                              {[
                                ["Intent", compareData.a.si.intent, compareData.b.si.intent],
                                ["Emotion", compareData.a.si.emotion, compareData.b.si.emotion],
                                ["Visual Mood", compareData.a.si.visual_mood, compareData.b.si.visual_mood],
                                ["Camera Style", compareData.a.si.camera_style, compareData.b.si.camera_style],
                                ["Budget Tier", compareData.a.budget, compareData.b.budget],
                              ].map(([label, aVal, bVal]) => (
                                <div
                                  key={label}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "180px 1fr 1fr 100px",
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 14,
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    background: "rgba(255,255,255,0.03)",
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ fontWeight: 1000 }}>{label}</div>
                                  <div style={{ opacity: 0.92 }}>{aVal ?? "—"}</div>
                                  <div style={{ opacity: 0.92 }}>{bVal ?? "—"}</div>
                                  <div
                                    style={{
                                      justifySelf: "end",
                                      fontWeight: 1000,
                                      opacity: 0.9,
                                      color:
                                        diffTag(aVal, bVal) === "Same"
                                          ? "rgba(255,255,255,0.75)"
                                          : "rgba(34,197,94,0.95)",
                                    }}
                                  >
                                    {diffTag(aVal, bVal)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ marginTop: 12, opacity: 0.85 }}>
                              Jury punchline: “We don’t just generate output — we support iteration. A/B comparison proves creative decision changes.”
                            </div>
                          </>
                        )}
                      </Section>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
            Studio vibe: tabs reduce clutter; PDF slicing prevents clipped exports; versions + compare show product maturity.
          </div>
        </div>
      </div>
    </div>
  );
}
