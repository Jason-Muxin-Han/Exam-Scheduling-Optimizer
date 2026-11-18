/**
 * Conflict graph construction.
 *
 * Nodes are exam subjects. An undirected edge joins two subjects when at least
 * one student is enrolled in both. The graph is derived from the enrollment
 * table, never stored independently, so imported data and synthetic data take
 * exactly the same path through the solver.
 */

export function buildConflictGraph(subjects, students) {
  const ids = subjects.map((s) => s.id).sort((a, b) => a - b);
  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  const studentCountBySubject = new Map(ids.map((id) => [id, 0]));
  const edges = [];
  const seen = new Set();

  for (const student of students) {
    const list = student.subjectIds;
    for (const id of list) {
      if (studentCountBySubject.has(id)) {
        studentCountBySubject.set(id, studentCountBySubject.get(id) + 1);
      }
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = Math.min(list[i], list[j]);
        const b = Math.max(list[i], list[j]);
        if (!adjacency.has(a) || !adjacency.has(b)) continue;
        const key = `${a}-${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        adjacency.get(a).add(b);
        adjacency.get(b).add(a);
        edges.push([a, b]);
      }
    }
  }

  edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const degree = new Map(ids.map((id) => [id, adjacency.get(id).size]));
  const maxEdges = ids.length > 1 ? (ids.length * (ids.length - 1)) / 2 : 1;
  return {
    ids,
    adjacency,
    edges,
    degree,
    studentCountBySubject,
    density: edges.length / maxEdges,
  };
}

export function areAdjacent(graph, a, b) {
  return graph.adjacency.get(a)?.has(b) ?? false;
}

/** Serialisable representation used by the graph exporter. */
export function graphToJSON(graph, subjects) {
  return {
    nodes: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      degree: graph.degree.get(s.id) ?? 0,
      students: graph.studentCountBySubject.get(s.id) ?? 0,
    })),
    edges: graph.edges.map(([a, b]) => ({ source: a, target: b })),
    density: Number(graph.density.toFixed(4)),
  };
}
