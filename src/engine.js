// Pure functions, shared by the UI and tests. Display numbers never encode rank.
export function shuffleChoices(choices, previous = [], random = Math.random) {
  const result = [...choices];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  const same = (ids) => result.every((c, i) => c.id === ids[i]);
  // Never start with rank order, and never repeat the immediately previous layout.
  const sorted = choices.map(c => c.id);
  for (let i = 0; i < result.length && (same(sorted) || same(previous)); i++) {
    result.push(result.shift());
  }
  return result;
}

export function findChoice(scene, id) {
  const choice = scene.choices.find(c => c.id === id);
  if (!choice) throw new Error(`Unknown choice ${id} in ${scene.id}`);
  return choice;
}

export function nextScene(scenes, currentId, random = Math.random) {
  const pool = scenes.filter(s => s.id !== currentId);
  return pool[Math.floor(random() * pool.length)] || scenes[0];
}
