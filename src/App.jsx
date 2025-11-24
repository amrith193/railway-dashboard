
// // src/App.jsx
// import React, { useEffect, useState, useRef } from "react";
// import { db } from "./firebase";
// import {
//   collection,
//   onSnapshot,
//   query,
//   orderBy,
//   doc,
//   updateDoc,
//   getDocs,
//   deleteDoc
// } from "firebase/firestore";

// import {
//   Clock,
//   Utensils,
//   Shield,
//   Activity,
//   Send,
//   CheckCircle,
//   RefreshCw,
//   Terminal,
//   MessageSquare,
//   AlertCircle,
//   LayoutDashboard,
//   Trash2
// } from "lucide-react";

// import "./App.css";

// /* -----------------------------
// 🚀 CATEGORY AUTO-DETECT LOGIC
// ------------------------------*/
// const CATEGORY_MAP = {
//   Cleanliness: ["clean", "dirty", "washroom", "seat dirty"],
//   Safety: ["danger", "unsafe", "door", "fight"],
//   "Staff behavior": ["rude", "misbehaved", "staff", "tc", "tte"],
//   Food: ["food", "pantry", "meal", "water"],
//   "Train Delay": ["late", "delay", "slow"],
//   Medical: ["medical", "doctor", "emergency"]
// };

// const autoDetectCategory = (text) => {
//   if (!text) return "Unclassified";
//   const lower = text.toLowerCase();

//   for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
//     if (keywords.some((k) => lower.includes(k))) {
//       return category;
//     }
//   }
//   return "Unclassified";
// };

// const sanitizeClass = (str) => str.replace(/\s/g, "").toLowerCase();

// // ICONS
// const getIcon = (category) => {
//   switch (category) {
//     case "Safety":
//       return <Shield className="icon safety" size={18} />;
//     case "Train Delay":
//       return <Clock className="icon delay" size={18} />;
//     case "Food":
//       return <Utensils className="icon food" size={18} />;
//     case "Medical":
//       return <Activity className="icon medical" size={18} />;
//     case "Cleanliness":
//       return <span className="icon-emoji">✨</span>;
//     case "Staff behavior":
//       return <span className="icon-emoji">👮‍♂️</span>;
//     default:
//       return <span className="icon-emoji">🚂</span>;
//   }
// };

// export default function App() {
//   const [complaints, setComplaints] = useState([]);
//   const [replyInput, setReplyInput] = useState({});
//   const [replyType, setReplyType] = useState({});
//   const [botLogs, setBotLogs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("All"); // All | Pending | Resolved

//   const consoleEndRef = useRef(null);

//   /* -----------------------------
//   🔥 LIVE LOG LISTENER
//   ------------------------------*/
//   useEffect(() => {
//     const logDoc = doc(db, "logs", "bot");
//     const unsub = onSnapshot(logDoc, (snap) => {
//       if (snap.exists()) setBotLogs(snap.data().messages || []);
//     });
//     return unsub;
//   }, []);

//   useEffect(() => {
//     consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [botLogs]);

//   /* -----------------------------
//   🔥 LIVE COMPLAINT LISTENER 
//   Auto-updates category on the fly (batched)
//   ------------------------------*/
//   useEffect(() => {
//     const ref = collection(db, "complaints");
//     const q = query(ref, orderBy("timestamp", "desc"));

//     const unsub = onSnapshot(
//       q,
//       async (snap) => {
//         try {
//           const arr = [];
//           const updates = [];

//           for (const d of snap.docs) {
//             const data = d.data();
//             const detectedCategory = autoDetectCategory(data.text);

//             // if firestore category differs, queue update (don't block rendering)
//             if (detectedCategory !== data.category) {
//               updates.push(
//                 updateDoc(doc(db, "complaints", d.id), {
//                   category: detectedCategory
//                 })
//               );
//             }

//             arr.push({
//               id: d.id,
//               user: data.user || "unknown",
//               text: data.text || "",
//               category: detectedCategory,
//               confidence: data.confidence ?? 0,
//               status: data.status || "Pending",
//               replyType: data.replyType || "quote",
//               timestamp: data.timestamp || null
//             });
//           }

//           // fire-and-forget updates (still await to catch errors)
//           if (updates.length > 0) {
//             try {
//               await Promise.all(updates);
//             } catch (e) {
//               console.warn("Category update errors:", e);
//             }
//           }

//           setComplaints(arr);
//           setLoading(false);
//         } catch (err) {
//           console.error("🔥 Listener error:", err);
//           setLoading(false);
//         }
//       },
//       (err) => {
//         console.error("🔥 Listener subscription error:", err);
//         setLoading(false);
//       }
//     );

//     return unsub;
//   }, []);

//   /* -----------------------------
//   🔁 MANUAL REFRESH
//   ------------------------------*/
//   const handleManualRefresh = async () => {
//     setLoading(true);
//     try {
//       const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
//       const snap = await getDocs(q);
//       const arr = snap.docs.map((d) => {
//         const data = d.data();
//         return {
//           id: d.id,
//           user: data.user || "unknown",
//           text: data.text || "",
//           category: data.category || autoDetectCategory(data.text || ""),
//           confidence: data.confidence ?? 0,
//           status: data.status || "Pending",
//           replyType: data.replyType || "quote",
//           timestamp: data.timestamp || null
//         };
//       });
//       setComplaints(arr);
//     } catch (err) {
//       console.error("Refresh failed:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* -----------------------------
//   ✉️ SEND REPLY
//   ------------------------------*/
//   const handleSendReply = async (id) => {
//     const text = (replyInput[id] || "").trim();
//     const type = replyType[id] || "quote";
//     if (!text) return alert("Enter a reply message.");

//     try {
//       await updateDoc(doc(db, "complaints", id), {
//         status: "needs_reply",
//         admin_reply_text: text,
//         replyType: type
//       });
//       setReplyInput((p) => ({ ...p, [id]: "" }));
//     } catch (err) {
//       console.error(err);
//       alert("Failed to queue reply.");
//     }
//   };

//   /* -----------------------------
//   🗑 Delete complaint
//   ------------------------------*/
//   const handleDelete = async (id) => {
//     const confirmed = window.confirm("Delete this complaint permanently?");
//     if (!confirmed) return;

//     try {
//       await deleteDoc(doc(db, "complaints", id));
//       // Optimistic UI update:
//       setComplaints((prev) => prev.filter((c) => c.id !== id));
//     } catch (err) {
//       console.error("Delete failed:", err);
//       alert("Failed to delete item.");
//     }
//   };

//   /* -----------------------------
//   Filters / derived data
//   ------------------------------*/
//   const filteredComplaints = complaints.filter((c) => {
//     if (activeTab === "All") return true;
//     if (activeTab === "Pending") return c.status === "Pending" || c.status === "needs_reply";
//     if (activeTab === "Resolved") return c.status === "Replied";
//     return true;
//   });

//   const pendingCount = complaints.filter(
//     (c) => c.status === "needs_reply" || c.status === "Pending"
//   ).length;
//   const repliedCount = complaints.filter((c) => c.status === "Replied").length;
//   const totalCount = complaints.length;

//   /* -----------------------------
//   UI
//   ------------------------------*/
//   return (
//     <div className="app-root">
//       {/* NAVBAR */}
//       <nav className="navbar">
//         <div className="nav-brand">
//           <div className="brand-logo">🚆</div>
//           <div>
//             <h1>RailSeva Pro</h1>
//             <span className="badge-pro">ADMIN</span>
//           </div>
//         </div>

//         <div className="nav-actions">
//           <div className="live-indicator">
//             <span className="blink">●</span> Live Connection
//           </div>
//           <button className="btn ghost" onClick={handleManualRefresh}>
//             <RefreshCw size={16} /> Sync
//           </button>
//         </div>
//       </nav>

//       <div className="dashboard-grid">
//         <main className="main-content">
//           {/* STATS */}
//           <div className="stats-row">
//             <div
//               className="stat-card"
//               style={{ cursor: "pointer" }}
//               onClick={() => setActiveTab("All")}
//             >
//               <div className="stat-icon bg-blue">
//                 <MessageSquare size={20} />
//               </div>
//               <div>
//                 <div className="stat-label">Total Tickets</div>
//                 <div className="stat-value">{totalCount}</div>
//               </div>
//             </div>

//             <div
//               className="stat-card"
//               style={{ cursor: "pointer" }}
//               onClick={() => setActiveTab("Pending")}
//             >
//               <div className="stat-icon bg-amber">
//                 <AlertCircle size={20} />
//               </div>
//               <div>
//                 <div className="stat-label">Pending</div>
//                 <div className="stat-value warning">{pendingCount}</div>
//               </div>
//             </div>

//             <div
//               className="stat-card"
//               style={{ cursor: "pointer" }}
//               onClick={() => setActiveTab("Resolved")}
//             >
//               <div className="stat-icon bg-green">
//                 <CheckCircle size={20} />
//               </div>
//               <div>
//                 <div className="stat-label">Resolved</div>
//                 <div className="stat-value success">{repliedCount}</div>
//               </div>
//             </div>
//           </div>

//           {/* TABLE */}
//           <div className="table-container">
//             <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//               <h2>
//                 <LayoutDashboard size={18} /> Priority Queue
//               </h2>

//               {/* Tabs */}
//               <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                 <button
//                   className={`btn ${activeTab === "All" ? "" : "ghost"}`}
//                   onClick={() => setActiveTab("All")}
//                 >
//                   All
//                 </button>
//                 <button
//                   className={`btn ${activeTab === "Pending" ? "" : "ghost"}`}
//                   onClick={() => setActiveTab("Pending")}
//                 >
//                   Pending
//                 </button>
//                 <button
//                   className={`btn ${activeTab === "Resolved" ? "" : "ghost"}`}
//                   onClick={() => setActiveTab("Resolved")}
//                 >
//                   Resolved
//                 </button>
//               </div>
//             </div>

//             {loading ? (
//               <div className="loader" style={{ padding: 20 }}>
//                 Fetching data...
//               </div>
//             ) : complaints.length === 0 ? (
//               <div className="empty-state" style={{ padding: 20 }}>
//                 No complaints found.
//               </div>
//             ) : (
//               <div className="table-responsive">
//                 <table className="modern-table">
//                   <thead>
//                     <tr>
//                       <th width="140">Category</th>
//                       <th>Passenger Issue</th>
//                       <th width="120">Status</th>
//                       <th width="280">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filteredComplaints.map((c) => (
//                       <tr key={c.id}>
//                         <td>
//                           <div className={`chip ${sanitizeClass(c.category)}`}>
//                             {getIcon(c.category)}
//                             {c.category}
//                           </div>
//                         </td>

//                         <td>
//                           <div className="tweet-content">
//                             <span className="user-handle">@{c.user}</span>
//                             <p>{c.text}</p>
//                             <div className="meta-info">Confidence: {(c.confidence * 100).toFixed(0)}%</div>
//                           </div>
//                         </td>

//                         <td>
//                           <span
//                             className={`status-dot ${
//                               c.status === "Replied"
//                                 ? "s-green"
//                                 : c.status === "needs_reply"
//                                 ? "s-amber"
//                                 : "s-blue"
//                             }`}
//                           >
//                             ● {c.status}
//                           </span>
//                         </td>

//                         <td>
//                           {c.status === "Replied" ? (
//                             <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                               <div className="replied-badge">
//                                 <CheckCircle size={14} /> Replied via {c.replyType}
//                               </div>
//                               <button
//                                 className="btn ghost"
//                                 onClick={() => handleDelete(c.id)}
//                                 title="Delete"
//                                 style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
//                               >
//                                 <Trash2 size={14} /> Delete
//                               </button>
//                             </div>
//                           ) : (
//                             <div className="action-box">
//                               <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                                 <select
//                                   className="type-select"
//                                   value={replyType[c.id] || "quote"}
//                                   onChange={(e) =>
//                                     setReplyType({ ...replyType, [c.id]: e.target.value })
//                                   }
//                                 >
//                                   <option value="quote">Quote</option>
//                                   <option value="reply">Reply</option>
//                                 </select>

//                                 <input
//                                   type="text"
//                                   placeholder="Write response..."
//                                   value={replyInput[c.id] || ""}
//                                   onChange={(e) =>
//                                     setReplyInput({ ...replyInput, [c.id]: e.target.value })
//                                   }
//                                 />

//                                 <button
//                                   className="btn-send"
//                                   onClick={() => handleSendReply(c.id)}
//                                   title="Send reply"
//                                 >
//                                   <Send size={14} />
//                                 </button>

//                                 <button
//                                   className="btn ghost"
//                                   onClick={() => handleDelete(c.id)}
//                                   title="Delete"
//                                   style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
//                                 >
//                                   <Trash2 size={14} /> Delete
//                                 </button>
//                               </div>
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         </main>

//         {/* RIGHT LOG CONSOLE */}
//         <aside className="sidebar-console">
//           <div className="console-card">
//             <div className="console-header">
//               <Terminal size={16} />
//               <span>System Logs</span>
//               <div className="console-status online"></div>
//             </div>

//             <div className="console-body">
//               {botLogs.slice(-100).map((log, i) => (
//                 <div key={i} className="log-line">
//                   <span className="log-arrow">➜</span> {log}
//                 </div>
//               ))}
//               <div ref={consoleEndRef} />
//             </div>
//           </div>
//         </aside>
//       </div>
//     </div>
//   );
// }

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
  getDocs,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  Clock,
  Utensils,
  Shield,
  Activity,
  Send,
  CheckCircle,
  RefreshCw,
  Terminal,
  MessageSquare,
  AlertCircle,
  LayoutDashboard,
  Trash2,
  Search,
  X,
  Check
} from "lucide-react";

import "./App.css";

/* -----------------------------
  CATEGORY MAP + AUTO-DETECT
------------------------------*/
const CATEGORY_MAP = {
  Cleanliness: ["clean", "dirty", "washroom", "seat dirty"],
  Safety: ["danger", "unsafe", "door", "fight"],
  "Staff behavior": ["rude", "misbehaved", "staff", "tc", "tte"],
  Food: ["food", "pantry", "meal", "water"],
  "Train Delay": ["late", "delay", "slow"],
  Medical: ["medical", "doctor", "emergency"]
};

const autoDetectCategory = (text) => {
  if (!text) return "Unclassified";
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => lower.includes(k))) {
      return category;
    }
  }
  return "Unclassified";
};

const sanitizeClass = (str) => (str || "").replace(/\s/g, "").toLowerCase();

const getIcon = (category) => {
  switch (category) {
    case "Safety":
      return <Shield className="icon safety" size={18} />;
    case "Train Delay":
      return <Clock className="icon delay" size={18} />;
    case "Food":
      return <Utensils className="icon food" size={18} />;
    case "Medical":
      return <Activity className="icon medical" size={18} />;
    case "Cleanliness":
      return <span className="icon-emoji">✨</span>;
    case "Staff behavior":
      return <span className="icon-emoji">👮‍♂️</span>;
    default:
      return <span className="icon-emoji">🚂</span>;
  }
};

/* -----------------------------
  Confirmation Modal (reusable)
------------------------------*/
function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onCancel, onConfirm, danger = false }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ marginTop: 4 }}>
            <div className={`modal-icon ${danger ? "danger" : "primary"}`}>
              {danger ? <Trash2 size={20} color="#991b1b" /> : <Check size={20} color="#1e3a8a" />}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            <p style={{ marginTop: 8, marginBottom: 16, color: "#475569" }}>{message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={onCancel} style={{ minWidth: 96 }}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={onConfirm}
                style={{
                  minWidth: 120,
                  background: danger ? "#ef4444" : "var(--primary)",
                  color: "white",
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
  Main App
------------------------------*/
export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [replyInput, setReplyInput] = useState({});
  const [replyType, setReplyType] = useState({}); // id => "quote"|"reply"
  const [sending, setSending] = useState({}); // id => boolean (for send button)
  const [botLogs, setBotLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState("All"); // All | Pending | Resolved
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [modalState, setModalState] = useState({ open: false, type: null, payload: null });
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const consoleEndRef = useRef(null);

  // Live logs
  useEffect(() => {
    const logDoc = doc(db, "logs", "bot");
    const unsub = onSnapshot(logDoc, (snap) => {
      if (snap.exists()) setBotLogs(snap.data().messages || []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botLogs]);

  // Live complaints listener with auto-category updates (batch)
  useEffect(() => {
    const ref = collection(db, "complaints");
    const q = query(ref, orderBy("timestamp", "desc"));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          const arr = [];
          const updates = [];

          for (const d of snap.docs) {
            const data = d.data();
            const detectedCategory = autoDetectCategory(data.text);
            if (detectedCategory !== data.category) {
              // queue update
              updates.push(updateDoc(doc(db, "complaints", d.id), { category: detectedCategory }));
            }

            arr.push({
              id: d.id,
              user: data.user || "unknown",
              text: data.text || "",
              category: detectedCategory,
              confidence: data.confidence ?? 0,
              status: data.status || "Pending",
              replyType: data.replyType || "quote",
              timestamp: data.timestamp || null
            });
          }

          // apply queued updates
          if (updates.length > 0) {
            try {
              await Promise.all(updates);
            } catch (e) {
              console.warn("Auto-category update errors:", e);
            }
          }

          setComplaints(arr);
          setLoading(false);
        } catch (err) {
          console.error("Listener error:", err);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Listener subscribe error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Manual refresh
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user: data.user || "unknown",
          text: data.text || "",
          category: data.category || autoDetectCategory(data.text || ""),
          confidence: data.confidence ?? 0,
          status: data.status || "Pending",
          replyType: data.replyType || "quote",
          timestamp: data.timestamp || null
        };
      });
      setComplaints(arr);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
    Filtering / Searching
  ------------------------------*/
  const filterByTab = (c) => {
    if (activeTab === "All") return true;
    if (activeTab === "Pending") return c.status === "Pending" || c.status === "needs_reply";
    if (activeTab === "Resolved") return c.status === "Replied";
    return true;
  };

  const filterByCategory = (c) => {
    if (categoryFilter === "All") return true;
    return c.category === categoryFilter;
  };

  const filterBySearch = (c) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      (c.text || "").toLowerCase().includes(q) ||
      (c.user || "").toLowerCase().includes(q) ||
      (c.category || "").toLowerCase().includes(q)
    );
  };

  const filteredComplaints = complaints.filter((c) => filterByTab(c) && filterByCategory(c) && filterBySearch(c));

  /* -----------------------------
    Selection / Bulk actions
  ------------------------------*/
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const clone = new Set(prev);
      if (clone.has(id)) clone.delete(id);
      else clone.add(id);
      setSelectAllChecked(false);
      return clone;
    });
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      // unselect all visible
      setSelectedIds(new Set());
      setSelectAllChecked(false);
    } else {
      const ids = new Set(filteredComplaints.map((c) => c.id));
      setSelectedIds(ids);
      setSelectAllChecked(true);
    }
  };

  const openModal = ({ type, payload = null }) => {
    setModalState({ open: true, type, payload });
  };

  const closeModal = () => setModalState({ open: false, type: null, payload: null });

  /* -----------------------------
    Single delete with modal
  ------------------------------*/
  const confirmDeleteSingle = (id) =>
    openModal({
      type: "delete_single",
      payload: { id }
    });

  const performDeleteSingle = async (id) => {
    try {
      await deleteDoc(doc(db, "complaints", id));
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const clone = new Set(prev);
        clone.delete(id);
        return clone;
      });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete item.");
    } finally {
      closeModal();
    }
  };

  /* -----------------------------
    Bulk delete
  ------------------------------*/
  const confirmDeleteSelected = () =>
    openModal({
      type: "delete_bulk",
      payload: { ids: Array.from(selectedIds) }
    });

  const performDeleteBulk = async (ids = []) => {
    if (ids.length === 0) {
      closeModal();
      return;
    }

    try {
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "complaints", id))));
      setComplaints((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedIds(new Set());
      setSelectAllChecked(false);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert("Bulk delete failed.");
    } finally {
      closeModal();
    }
  };

  /* -----------------------------
    Bulk mark resolved
  ------------------------------*/
  const confirmResolveSelected = () =>
    openModal({
      type: "resolve_bulk",
      payload: { ids: Array.from(selectedIds) }
    });

  const performResolveBulk = async (ids = []) => {
    if (ids.length === 0) {
      closeModal();
      return;
    }

    try {
      await Promise.all(
        ids.map((id) =>
          updateDoc(doc(db, "complaints", id), {
            status: "Replied",
            replyType: "bulk",
            admin_reply_text: "Marked resolved by admin (bulk)",
            resolvedAt: serverTimestamp()
          })
        )
      );

      setComplaints((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, status: "Replied", replyType: "bulk" } : c))
      );
      setSelectedIds(new Set());
      setSelectAllChecked(false);
    } catch (err) {
      console.error("Bulk resolve failed:", err);
      alert("Bulk resolve failed.");
    } finally {
      closeModal();
    }
  };

  /* -----------------------------
    Send reply (single send using select)
  ------------------------------*/
  const handleSend = async (id) => {
    const type = replyType[id] || "quote";
    const text = (replyInput[id] || "").trim();
    if (!text) return alert("Enter a reply message.");

    // show spinner in status column
    setSending((s) => ({ ...s, [id]: true }));

    try {
      await updateDoc(doc(db, "complaints", id), {
        status: "needs_reply",
        admin_reply_text: text,
        replyType: type
      });

      // optimistic update
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: "needs_reply", replyType: type } : c)));
      setReplyInput((p) => ({ ...p, [id]: "" }));
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send reply.");
    } finally {
      setSending((s) => ({ ...s, [id]: false }));
    }
  };

  /* -----------------------------
    Derived counts
  ------------------------------*/
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === "Pending" || c.status === "needs_reply").length;
  const resolvedCount = complaints.filter((c) => c.status === "Replied").length;

  /* -----------------------------
    Render
  ------------------------------*/
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

        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <input
                placeholder="Search by text, user, category..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                style={{
                  padding: "8px 36px 8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  outline: "none",
                  width: 320,
                  background: "#fff"
                }}
              />
              <Search style={{ position: "absolute", right: 10, top: 8, color: "#94a3b8" }} />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                borderRadius: 8,
                padding: "8px 10px",
                border: "1px solid var(--border)",
                background: "white"
              }}
            >
              <option value="All">All categories</option>
              {Object.keys(CATEGORY_MAP).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button className="btn ghost" onClick={handleManualRefresh}>
              <RefreshCw size={16} /> Sync
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-grid">
        <main className="main-content">
          {/* STATS */}
          <div className="stats-row">
            <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("All")}>
              <div className="stat-icon bg-blue">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="stat-label">Total Tickets</div>
                <div className="stat-value">{totalCount}</div>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("Pending")}>
              <div className="stat-icon bg-amber">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="stat-label">Pending</div>
                <div className="stat-value warning">{pendingCount}</div>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("Resolved")}>
              <div className="stat-icon bg-green">
                <CheckCircle size={20} />
              </div>
              <div>
                <div className="stat-label">Resolved</div>
                <div className="stat-value success">{resolvedCount}</div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-container">
            <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>
                <LayoutDashboard size={18} /> Priority Queue
              </h2>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className={`btn ${activeTab === "All" ? "" : "ghost"}`} onClick={() => setActiveTab("All")}>
                  All
                </button>
                <button className={`btn ${activeTab === "Pending" ? "" : "ghost"}`} onClick={() => setActiveTab("Pending")}>
                  Pending
                </button>
                <button className={`btn ${activeTab === "Resolved" ? "" : "ghost"}`} onClick={() => setActiveTab("Resolved")}>
                  Resolved
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20 }}>Fetching data...</div>
            ) : complaints.length === 0 ? (
              <div style={{ padding: 20 }}>No complaints found.</div>
            ) : (
              <div className="table-responsive" style={{ position: "relative" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>
                        <input type="checkbox" checked={selectAllChecked} onChange={toggleSelectAll} />
                      </th>
                      <th width="140">Category</th>
                      <th>Passenger Issue</th>
                      <th width="140">Status</th>
                      <th width="360">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredComplaints.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      const isSending = !!sending[c.id];
                      return (
                        <tr key={c.id} className={isSelected ? "selected-row" : ""}>
                          <td>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} />
                          </td>

                          <td>
                            <div className={`chip ${sanitizeClass(c.category)}`}>
                              {getIcon(c.category)}
                              {c.category}
                            </div>
                          </td>

                          <td>
                            <div className="tweet-content">
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <span className="user-handle">@{c.user}</span>
                                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                    {c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleString() : ""}
                                  </div>
                                </div>
                              </div>
                              <p>{c.text}</p>
                              <div className="meta-info">Confidence: {(c.confidence * 100).toFixed(0)}%</div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                className={`status-dot ${
                                  c.status === "Replied"
                                    ? "s-green"
                                    : c.status === "needs_reply"
                                    ? "s-amber"
                                    : "s-blue"
                                }`}
                              >
                                ● {c.status}
                              </span>

                              {/* spinner while sending */}
                              {isSending && <div className="tiny-spinner" title="Sending..." />}
                            </div>
                          </td>

                          <td>
                            {/* If already replied */}
                            {c.status === "Replied" ? (
                              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                                <div className="replied-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                  <CheckCircle size={14} /> Replied via {c.replyType}
                                </div>

                                <button className="btn ghost" onClick={() => confirmDeleteSingle(c.id)} title="Delete">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                                <input
                                  value={replyInput[c.id] || ""}
                                  onChange={(e) => setReplyInput((p) => ({ ...p, [c.id]: e.target.value }))}
                                  placeholder="Write response..."
                                  style={{
                                    flex: 1,
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    border: "1px solid var(--border)"
                                  }}
                                />

                                <select
                                  value={replyType[c.id] || "quote"}
                                  onChange={(e) => setReplyType((p) => ({ ...p, [c.id]: e.target.value }))}
                                  style={{
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    border: "1px solid var(--border)",
                                    background: "white"
                                  }}
                                >
                                  <option value="quote">Quote</option>
                                  <option value="reply">Reply</option>
                                </select>

                                <button
                                  className="btn"
                                  onClick={() => handleSend(c.id)}
                                  disabled={sending[c.id]}
                                  title="Send"
                                  style={{
                                    background: "var(--primary)",
                                    color: "white",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    display: "inline-flex",
                                    gap: 8,
                                    alignItems: "center"
                                  }}
                                >
                                  {sending[c.id] ? (
                                    <>
                                      <span className="btn-spinner" /> Sending
                                    </>
                                  ) : (
                                    <>
                                      <Send size={14} /> Send
                                    </>
                                  )}
                                </button>

                                <button className="btn ghost" onClick={() => confirmDeleteSingle(c.id)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Floating bulk action bar */}
                {selectedIds.size > 0 && (
                  <div className="bulk-action-bar">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 700 }}>{selectedIds.size} selected</div>
                      <button className="btn ghost" onClick={() => setSelectedIds(new Set())}>
                        <X size={14} /> Clear
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn"
                        onClick={confirmResolveSelected}
                        style={{ background: "var(--primary)", color: "white" }}
                      >
                        <Check size={14} /> Mark Selected Resolved
                      </button>

                      <button
                        className="btn"
                        onClick={confirmDeleteSelected}
                        style={{ background: "#ef4444", color: "white" }}
                      >
                        <Trash2 size={14} /> Delete Selected
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT LOG CONSOLE */}
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

      {/* Confirm modal */}
      <ConfirmModal
        open={modalState.open}
        title={
          modalState.type === "delete_single"
            ? "Delete complaint"
            : modalState.type === "delete_bulk"
            ? `Delete ${modalState.payload?.ids?.length || 0} complaint(s)`
            : modalState.type === "resolve_bulk"
            ? `Mark ${modalState.payload?.ids?.length || 0} complaint(s) as resolved`
            : "Confirm action"
        }
        message={
          modalState.type === "delete_single"
            ? "This will permanently delete the complaint. This action cannot be undone."
            : modalState.type === "delete_bulk"
            ? `Are you sure you want to permanently delete ${modalState.payload?.ids?.length || 0} selected complaint(s)? This action cannot be undone.`
            : modalState.type === "resolve_bulk"
            ? `Mark ${modalState.payload?.ids?.length || 0} selected complaint(s) as resolved (status set to Replied).`
            : ""
        }
        confirmLabel={
          modalState.type === "delete_single" || modalState.type === "delete_bulk" ? "Delete" : "Confirm"
        }
        danger={modalState.type === "delete_single" || modalState.type === "delete_bulk"}
        onCancel={closeModal}
        onConfirm={() => {
          if (modalState.type === "delete_single") performDeleteSingle(modalState.payload.id);
          else if (modalState.type === "delete_bulk") performDeleteBulk(modalState.payload.ids);
          else if (modalState.type === "resolve_bulk") performResolveBulk(modalState.payload.ids);
          else closeModal();
        }}
      />
    </div>
  );
}
