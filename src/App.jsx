// src/App.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";

import {
  Clock,
  Utensils,
  Shield,
  Activity,
  Send,
  CheckCircle,
  Repeat,
  Quote,
  Terminal
} from "lucide-react";

import "./App.css";

const getIcon = (category) => {
  switch (category) {
    case "Safety": return <Shield className="icon safety" />;
    case "Train Delay": return <Clock className="icon delay" />;
    case "Food": return <Utensils className="icon food" />;
    case "Medical emergency": return <Activity className="icon medical" />;
    case "Cleanliness": return <span className="icon sparkle">✨</span>;
    default: return <span className="icon train">🚂</span>;
  }
};

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [replyInput, setReplyInput] = useState({});
  const [replyType, setReplyType] = useState({});
  const [botLogs, setBotLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 LIVE LOG LISTENER
  useEffect(() => {
    const logDoc = doc(db, "logs", "bot");
    const unsub = onSnapshot(logDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBotLogs(data.messages || []);
      }
    });
    return () => unsub();
  }, []);

  // 🚀 LIVE COMPLAINT LISTENER
  useEffect(() => {
    const ref = collection(db, "complaints");
    const q = query(ref, orderBy("timestamp", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            user: data.user || "unknown",
            text: data.text || "",
            category: data.category || "Unclassified",
            confidence: data.confidence ?? 0,
            status: data.status || "Pending",
            replyType: data.replyType || "quote",
            timestamp: data.timestamp || null,
            created_at: data.created_at || null
          };
        });

        setComplaints(arr);
        setLoading(false);
      },
      (err) => {
        console.error("🔥 Firestore listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 🔁 MANUAL REFRESH
  const handleManualRefresh = async () => {
    setLoading(true);
    const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const arr = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      replyType: d.data().replyType || "quote"
    }));

    setComplaints(arr);
    setLoading(false);
  };

  // ✍️ SEND REPLY
  const handleSendReply = async (id, user) => {
    const text = (replyInput[id] || "").trim();
    const type = replyType[id] || "quote";
    if (!text) return alert("Enter a reply message.");

    try {
      await updateDoc(doc(db, "complaints", id), {
        status: "needs_reply",
        admin_reply_text: text,
        replyType: type
      });
      setReplyInput((p) => ({ ...p, [id]: "" }));
    } catch (err) {
      console.error(err);
      alert("Failed to queue reply.");
    }
  };

  return (
    <div className="app-root">
      <header className="header-card">
        <div>
          <h1 className="title">🚆 Railway Admin Dashboard</h1>
          <p className="subtitle">
            Monitor & Reply — <strong>@RailSeva_PRO</strong>
          </p>
        </div>

        <button className="btn ghost" onClick={handleManualRefresh}>
          <Repeat size={16} /> Refresh
        </button>
      </header>

      {/* STATS */}
      <section className="stats-grid">
        <div className="card stat">
          <div className="label">Total Complaints</div>
          <div className="value">{complaints.length}</div>
        </div>

        <div className="card stat">
          <div className="label">Pending Replies</div>
          <div className="value warning">
            {complaints.filter((c) => c.status === "needs_reply").length}
          </div>
        </div>

        <div className="card stat">
          <div className="label">Replied</div>
          <div className="value success">
            {complaints.filter((c) => c.status === "Replied").length}
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="table-card">
        <div className="table-header">
          <h2>Incoming Complaints</h2>
          <p className="tiny-note">Auto-updates in real time</p>
        </div>

        {loading ? (
          <div className="loader">Loading...</div>
        ) : complaints.length === 0 ? (
          <div className="empty">No complaints found.</div>
        ) : (
          <div className="table-wrap">
            <table className="complaint-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Reply Type</th>
                  <th>Admin Reply</th>
                </tr>
              </thead>

              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    {/* category */}
                    <td className="cat-col">
                      <div className="cat-inner">
                        {getIcon(c.category)}
                        <span className="cat-text">{c.category}</span>
                      </div>
                    </td>

                    {/* tweet */}
                    <td className="tweet-col">
                      <div className="tweet-user">@{c.user}</div>
                      <div className="tweet-text">{c.text}</div>
                      <div className="tweet-meta">
                        Confidence: {(c.confidence * 100).toFixed(0)}%
                      </div>
                    </td>

                    {/* status */}
                    <td className="status-col">
                      <span
                        className={`badge ${
                          c.status === "Replied"
                            ? "green"
                            : c.status === "needs_reply"
                            ? "amber"
                            : "blue"
                        }`}
                      >
                        {c.status === "needs_reply" ? "Sending…" : c.status}
                      </span>
                    </td>

                    {/* reply type */}
                    <td className="reply-type">
                      {c.replyType === "quote" ? (
                        <span className="badge blue">
                          <Quote size={14} /> Quote
                        </span>
                      ) : (
                        <span className="badge green">Reply</span>
                      )}
                    </td>

                    {/* Reply box */}
                    <td className="action-col">
                      {c.status === "Replied" ? (
                        <div className="sent">
                          <CheckCircle size={16} /> Sent
                        </div>
                      ) : (
                        <div className="reply-row">
                          <select
                            className="reply-type-select"
                            value={replyType[c.id] || "quote"}
                            onChange={(e) =>
                              setReplyType({
                                ...replyType,
                                [c.id]: e.target.value
                              })
                            }
                          >
                            <option value="quote">Quote Tweet</option>
                            <option value="reply">Reply</option>
                          </select>

                          <input
                            placeholder="Type reply…"
                            value={replyInput[c.id] || ""}
                            onChange={(e) =>
                              setReplyInput({
                                ...replyInput,
                                [c.id]: e.target.value
                              })
                            }
                            disabled={c.status === "needs_reply"}
                          />

                          <button
                            className="btn primary"
                            onClick={() => handleSendReply(c.id, c.user)}
                            disabled={c.status === "needs_reply"}
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BOT LOG CONSOLE */}
      <section className="log-console-card">
        <div className="console-header">
          <Terminal size={18} />
          <h2>Bot Console</h2>
        </div>

        <div className="console-window">
          {botLogs.slice(-200).map((log, i) => (
            <div key={i} className="console-line">
              {log}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
