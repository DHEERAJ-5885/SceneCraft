export async function analyzeScene(sceneText) {
  try {
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scene: sceneText
      })
    });

    const data = await response.json();

    if (!data.analysis) {
      throw new Error("Invalid AI response");
    }

    return data.analysis;
  } catch (error) {
    console.error("Scene analysis error:", error);
    return "AI response was invalid. Try refining the scene.";
  }
}
