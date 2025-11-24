// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
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
  RefreshCw,
  Quote,
  Terminal,
  MessageSquare,
  AlertCircle,
  LayoutDashboard
} from "lucide-react";

import "./App.css";

const getIcon = (category) => {
  switch (category) {
    case "Safety": return <Shield className="icon safety" size={18} />;
    case "Train Delay": return <Clock className="icon delay" size={18} />;
    case "Food": return <Utensils className="icon food" size={18} />;
    case "Medical emergency": return <Activity className="icon medical" size={18} />;
    case "Cleanliness": return <span className="icon-emoji">✨</span>;
    default: return <span className="icon-emoji">🚂</span>;
  }
};

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [replyInput, setReplyInput] = useState({});
  const [replyType, setReplyType] = useState({});
  const [botLogs, setBotLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Auto-scroll console
  const consoleEndRef = useRef(null);

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

  // Auto scroll to bottom of logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botLogs]);

  // 🚀 LIVE COMPLAINT LISTENER
  useEffect(() => {
    const ref = collection(db, "complaints");
    const q = query(ref, orderBy("timestamp", "desc"));

    const unsub = onSnapshot(q, (snap) => {
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
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setComplaints(arr);
    setLoading(false);
  };

  // ✍️ SEND REPLY
  const handleSendReply = async (id) => {
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

  const pendingCount = complaints.filter(c => c.status === "needs_reply" || c.status === "Pending").length;
  const repliedCount = complaints.filter(c => c.status === "Replied").length;

  return (
    <div className="app-root">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-logo">🚆</div>
          <div>
            <h1>RailSeva Pro</h1>
            <span className="badge-pro">ADMIN</span>
          </div>
        </div>
        <div className="nav-actions">
           <div className="live-indicator">
              <span className="blink">●</span> Live Connection
           </div>
           <button className="btn ghost" onClick={handleManualRefresh}>
            <RefreshCw size={16} /> Sync
          </button>
        </div>
      </nav>

      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: MAIN CONTENT */}
        <main className="main-content">
          
          {/* STATS ROW */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon bg-blue"><MessageSquare size={20}/></div>
              <div>
                <div className="stat-label">Total Tickets</div>
                <div className="stat-value">{complaints.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-amber"><AlertCircle size={20}/></div>
              <div>
                <div className="stat-label">Pending</div>
                <div className="stat-value warning">{pendingCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-green"><CheckCircle size={20}/></div>
              <div>
                <div className="stat-label">Resolved</div>
                <div className="stat-value success">{repliedCount}</div>
              </div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="table-container">
            <div className="section-header">
              <h2><LayoutDashboard size={18}/> Priority Queue</h2>
            </div>

            {loading ? (
              <div className="loader">Fetching data...</div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">No complaints found.</div>
            ) : (
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th width="140">Category</th>
                      <th>Passenger Issue</th>
                      <th width="120">Status</th>
                      <th width="280">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className={`chip ${c.category.replace(/\s/g, '').toLowerCase()}`}>
                            {getIcon(c.category)}
                            {c.category}
                          </div>
                        </td>
                        <td>
                          <div className="tweet-content">
                            <span className="user-handle">@{c.user}</span>
                            <p>{c.text}</p>
                            <span className="meta-info">Confidence: {(c.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-dot ${c.status === "Replied" ? "s-green" : c.status === "needs_reply" ? "s-amber" : "s-blue"}`}>
                             ● {c.status}
                          </span>
                        </td>
                        <td>
                          {c.status === "Replied" ? (
                             <div className="replied-badge">
                               <CheckCircle size={14} /> Replied via {c.replyType}
                             </div>
                          ) : (
                            <div className="action-box">
                               <div className="input-group">
                                  <select 
                                    className="type-select"
                                    value={replyType[c.id] || "quote"}
                                    onChange={(e) => setReplyType({...replyType, [c.id]: e.target.value})}
                                  >
                                    <option value="quote">Quote</option>
                                    <option value="reply">Reply</option>
                                  </select>
                                  <input 
                                    type="text" 
                                    placeholder="Write response..." 
                                    value={replyInput[c.id] || ""}
                                    onChange={(e) => setReplyInput({...replyInput, [c.id]: e.target.value})}
                                    disabled={c.status === "needs_reply"}
                                  />
                                  <button 
                                    className="btn-send"
                                    onClick={() => handleSendReply(c.id)}
                                    disabled={c.status === "needs_reply"}
                                  >
                                    <Send size={14} />
                                  </button>
                               </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: CONSOLE */}
        <aside className="sidebar-console">
          <div className="console-card">
            <div className="console-header">
              <Terminal size={16} />
              <span>System Logs</span>
              <div className="console-status online"></div>
            </div>
            <div className="console-body">
              {botLogs.slice(-100).map((log, i) => (
                <div key={i} className="log-line">
                  <span className="log-arrow">➜</span> {log}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

// -------------------
// CSS STYLES
// -------------------
/* Paste this into App.css */