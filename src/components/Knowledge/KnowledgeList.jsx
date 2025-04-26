import React from "react";

/**
 * KnowledgeList
 * - Lists all Knowledge entities.
 * - Allows create, rename, delete operations.
 * - Selects a Knowledge to view details.
 * 
 * TODO:
 * - Integrate with Redux for Knowledge state.
 * - Implement API calls for CRUD (stubbed below).
 * - Connect to DataStoreSelector for backend selection.
 */

const KnowledgeList = () => {
  // Placeholder state (replace with Redux or real state)
  const [knowledges, setKnowledges] = React.useState([
    // Example stub data
    { id: "1", name: "Sample Knowledge 1", dataStore: "lancedb" },
    { id: "2", name: "Sample Knowledge 2", dataStore: "postgres" },
  ]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [newName, setNewName] = React.useState("");

  // --- Stubbed API functions ---
  const fetchKnowledges = () => {
    // TODO: Fetch from backend or Redux
  };

  const createKnowledge = () => {
    // TODO: Call backend to create Knowledge
    alert("Stub: Create Knowledge");
  };

  const renameKnowledge = (id) => {
    // TODO: Call backend to rename Knowledge
    alert(`Stub: Rename Knowledge ${id}`);
  };

  const deleteKnowledge = (id) => {
    // TODO: Call backend to delete Knowledge (only if no sources)
    alert(`Stub: Delete Knowledge ${id}`);
  };

  // --- UI ---
  return (
    <div style={{ border: "1px solid #ccc", padding: 16, marginBottom: 16 }}>
      <h2>Knowledge List</h2>
      <ul>
        {knowledges.map((k) => (
          <li key={k.id} style={{ marginBottom: 8 }}>
            <span
              style={{
                fontWeight: selectedId === k.id ? "bold" : "normal",
                cursor: "pointer",
              }}
              onClick={() => setSelectedId(k.id)}
            >
              {k.name} ({k.dataStore})
            </span>
            <button style={{ marginLeft: 8 }} onClick={() => renameKnowledge(k.id)}>
              Rename
            </button>
            <button style={{ marginLeft: 4 }} onClick={() => deleteKnowledge(k.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="New Knowledge Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button style={{ marginLeft: 8 }} onClick={createKnowledge}>
          Create
        </button>
      </div>
      {/* TODO: Integrate DataStoreSelector when creating Knowledge */}
    </div>
  );
};

export default KnowledgeList;