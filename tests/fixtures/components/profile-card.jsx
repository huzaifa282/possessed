import React from "react";

export default function ProfileCard({ name = "Ada Lovelace", role = "Analyst", bio = "First programmer. Loves poetry and engines." }) {
  return (
    <div style={{ width: 280, padding: 24, borderRadius: 16, background: "#ffffff", boxShadow: "0 4px 14px rgba(0,0,0,0.12)", fontFamily: "sans-serif", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, margin: "0 auto 12px", borderRadius: "50%", background: "#c7d2fe", lineHeight: "72px", fontSize: 28 }}>
        {name[0]}
      </div>
      <h3 style={{ margin: 0, color: "#111827" }}>{name}</h3>
      <p style={{ margin: "4px 0 12px", color: "#6b7280", fontSize: 14 }}>{role}</p>
      <p style={{ margin: 0, color: "#374151", fontSize: 14 }}>{bio}</p>
      <button style={{ marginTop: 16, padding: "8px 16px", border: "none", borderRadius: 8, background: "#4f46e5", color: "#fff", cursor: "pointer" }}>
        Follow
      </button>
    </div>
  );
}
