// export async function analyzeScene(sceneText) {
//   const response = await fetch("http://localhost:5000/analyze", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ scene: sceneText }),
//   });

//   const data = await response.json();

//   if (!response.ok) {
//     throw new Error(data?.error || "AI analysis failed");
//   }

//   return data;
// }




export async function analyzeScene(sceneText) {
  const response = await fetch("http://localhost:5000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scene: sceneText }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "AI analysis failed");
  }

  return data;
}
