

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
  Terminal,
  AlertCircle,
  LayoutDashboard,
  Trash2,
  Search,
  X,
  Check,
  Lock,
  User,
  TrainFront,
  LogOut,
  Share2,
  History,
  Building2,
  Mail,
  MessageSquare,
  Repeat,
  Pencil
} from "lucide-react";

import "./App.css";
import "./Login.css";

/* =========================================
   CONSTANTS & CONFIG
   ========================================= */

const DEPARTMENT_EMAILS = {
  Mangalore: "Mangalorerailwaystation@gmail.com",
  Bangalore: "bangalorerailway@gmail.com",
  Delhi: "delhirailwaystationdel@gmail.com",
  Mumbai: "mumbairailway@gmail.com"
};

const DEPARTMENTS = Object.keys(DEPARTMENT_EMAILS);

const CATEGORY_MAP = {
  Cleanliness: ["clean", "dirty", "washroom", "seat dirty", "stinks", "dustbin"],
  Safety: ["danger", "unsafe", "door", "fight", "theft", "harassment"],
  "Staff behavior": ["rude", "misbehaved", "staff", "tc", "tte", "ticket collector"],
  Food: ["food", "pantry", "meal", "water", "tea", "coffee", "lunch"],
  "Train Delay": ["late", "delay", "slow", "stopped", "waiting"],
  Medical: ["medical", "doctor", "emergency", "sick", "ill", "heart"]
};

const STATION_MAP = {
  Bangalore: ["bangalore", "blr", "bengaluru", "yesvantpur", "krantivira"],
  Mangalore: ["mangalore", "mngl", "udupi", "surathkal"],
  Delhi: ["delhi", "ndls", "new delhi", "hazrat", "anand vihar"],
  Mumbai: ["mumbai", "bct", "mumbai cst", "mumbai central", "bandra"]
};

/* =========================================
   HELPERS
   ========================================= */

const autoDetectCategory = (text) => {
  if (!text) return "Unclassified";
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Unclassified";
};

const autoDetectStation = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [station, keywords] of Object.entries(STATION_MAP)) {
    if (keywords.some((k) => lower.includes(k))) return station;
  }
  return null;
};

// Extract train numbers (4-6 digits)
const extractTrainNumbers = (text) => {
  if (!text) return [];
  const matches = text.match(/\b\d{4,6}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
};

// New PNR extractor: prefer exact 10-digit, else take last 10 digits from large groups (11-13)
const extractPNR = (text = "", trainNumber = null) => {
  if (!text) return null;

  // 1) exact 10-digit matches
  const exact10 = text.match(/\b\d{10}\b/g);
  if (exact10 && exact10.length > 0) {
    // prefer PNR not equal to trainNumber
    const found = exact10.find(p => String(p) !== String(trainNumber));
    return found || exact10[0];
  }

  // 2) find large numeric groups (11-13 digits) and take last 10 digits
  const large = text.match(/\b\d{11,13}\b/g);
  if (large && large.length > 0) {
    const converted = large.map(n => n.slice(-10));
    const found = converted.find(p => String(p) !== String(trainNumber));
    return found || converted[0];
  }

  // 3) fallback: 6-digit numbers (sometimes PNRs stored as 6 digits) - rare; avoid conflicting with train numbers
  const sixDigit = text.match(/\b\d{6}\b/g);
  if (sixDigit && sixDigit.length > 0) {
    const found = sixDigit.find(p => String(p) !== String(trainNumber));
    return found || sixDigit[0];
  }

  return null;
};

const sanitizeClass = (str) => (str || "").replace(/\s/g, "").toLowerCase();

const getIcon = (category) => {
  switch (category) {
    case "Safety": return <Shield className="icon safety" size={18} />;
    case "Train Delay": return <Clock className="icon delay" size={18} />;
    case "Food": return <Utensils className="icon food" size={18} />;
    case "Medical": return <Activity className="icon medical" size={18} />;
    case "Cleanliness": return <span className="icon-emoji">✨</span>;
    case "Staff behavior": return <span className="icon-emoji">👮‍♂️</span>;
    default: return <span className="icon-emoji">🚂</span>;
  }
};

const safeDateFromTimestamp = (ts) => {
  if (!ts) return null;
  if (typeof ts === "object" && ts.seconds) return new Date(ts.seconds * 1000);
  try { return new Date(ts); } catch { return null; }
};


const getDisplayName = (record) => {
  if (record?.user) return `@${record.user}`;
  const name = record?.name?.trim();
  return name && name.length > 0 ? name : "User";
};

/* =========================================
   LOGIN COMPONENT
   ========================================= */
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === "adminrailway@gmail.com" && password === "admin") {
      localStorage.setItem("railway_admin_session", "true");
      onLogin(true);
    } else {
      setError("Invalid credentials.");
    }
  };

  return (
    <div className="login-root">
      <div className="login-overlay"></div>
      <div className="govt-header">
        <div className="govt-content">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
            alt="Emblem"
            className="emblem"
          />
          <div className="govt-text">
            <span>Ministry of Railways</span>
            <strong>Government of India</strong>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="rail-logo-circle">
            <TrainFront size={32} />
          </div>
          <h2>RailSeva Admin</h2>
          <p>Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group-login">
            <User size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group-login">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-login-submit">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   UI COMPONENTS (Modal, Toast, History)
   ========================================= */

const Toast = ({ show, message, type = "success", onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-content">
        {type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="toast-close"><X size={16}/></button>
    </div>
  );
};

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function HistoryModal({ open, onClose, historyItems }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="history-sheet slide-in">
        <div className="history-header">
          <h2><History size={20}/> Forwarding History</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div className="history-list">
          {historyItems.length === 0 ? (
            <div className="empty-state">No records found.</div>
          ) : (
            historyItems.map((item) => {
              const email = item.forward_email || DEPARTMENT_EMAILS[item.forward_dept] || "N/A";
              return (
                <div key={item.id} className="history-item">
                  <div className="h-item-header">
                    <span className="h-dept-badge">{item.forward_dept} Div</span>
                    <span className="h-time">
                      {item.replied_at ? safeDateFromTimestamp(item.replied_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>

                  <div className="h-email-row">
                    <Mail size={12}/> Sent to: <span>{email}</span>
                  </div>

                  <div className="h-note">
                    <strong>Note:</strong> {item.admin_reply_text}
                  </div>
                  <div className="h-ref">Ref Ticket: @{item.user}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   DASHBOARD MAIN
   ========================================= */

function AdminDashboard({ onLogout }) {
  // data & UI state
  const [complaints, setComplaints] = useState([]);
  const [botLogs, setBotLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("Pending");
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [trainFilter, setTrainFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  // Modals & Action State
  const [composeModal, setComposeModal] = useState({ open: false, item: null });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0]);
  const [isSending, setIsSending] = useState(false);

  // Action Types: 'reply', 'forward', 'both'
  const [actionType, setActionType] = useState("reply");

  // Feedback
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // logs ref for autoscroll
  const consoleEndRef = useRef(null);

  // Should auto-update firestore when missing fields? (Option B: only when missing)
  const AUTO_UPDATE_FIRESTORE = true;

  /* ---------------------------
     Firestore: logs listener
     --------------------------- */
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




  /* ---------------------------
     Firestore: complaints listener (prefer Firestore fields)
     --------------------------- */
  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() || {};

        // Prefer Firestore fields; fallback to detection only when missing
        const category = (data.category && String(data.category).trim()) || autoDetectCategory(data.text);
        const station = (data.location && String(data.location).trim()) || autoDetectStation(data.text) || "Unknown";

        // Train detection (prefer Firestore trainNo)
        const trainCandidates = extractTrainNumbers(data.text);
        const trainNumber = (data.trainNo && String(data.trainNo).trim()) || (data.trainNumber && String(data.trainNumber).trim()) || (trainCandidates.length > 0 ? trainCandidates[0] : null);

        // PNR detection: prefer DB pnr/PNR, else use extractPNR (last-10-digits strategy)
        const dbPnr = (data.pnr && String(data.pnr).trim()) || (data.PNR && String(data.PNR).trim()) || null;
        const detectedPnr = extractPNR(data.text, trainNumber);
        const pnr = dbPnr || detectedPnr || null;

        return {
          id: d.id,
          raw: data,
          ...data,
          category,
          station,
          trainNumber,
          pnr
        };
      });

      setComplaints(list);
      setLoading(false);

      // Non-blocking write-back: only set missing DB fields (do not overwrite)
      if (AUTO_UPDATE_FIRESTORE) {
        list.forEach((item) => {
          const dbRaw = item.raw || {};
          const updates = {};

          if ((!dbRaw.location || String(dbRaw.location).trim() === "") && item.station && item.station !== "Unknown") {
            updates.location = item.station;
          }
          if ((!dbRaw.trainNo || String(dbRaw.trainNo).trim() === "") && item.trainNumber) {
            updates.trainNo = item.trainNumber;
          }
          if ((!dbRaw.pnr && !dbRaw.PNR) && item.pnr) {
            updates.pnr = item.pnr;
          }
          if ((!dbRaw.category || String(dbRaw.category).trim() === "") && item.category && item.category !== "Unclassified") {
            updates.category = item.category;
          }

          if (Object.keys(updates).length > 0) {
            updateDoc(doc(db, "complaints", item.id), updates).catch((err) => {
              console.error("Auto-update failed for", item.id, err);
            });
          }
        });
      }
    });

    return () => unsub();
  }, []); // eslint-disable-line

  /* ---------------------------
     Action handlers
     --------------------------- */

  const handleOpenCompose = (item) => {
    setComposeModal({ open: true, item });
    setMessageText(item.admin_reply_text || "");
    setActionType(item.replyType || "reply");

    if (item.forward_dept) {
      setSelectedDept(item.forward_dept);
    } else if (item.station && DEPARTMENT_EMAILS[item.station]) {
      setSelectedDept(item.station);
    } else {
      setSelectedDept("Mangalore");
    }
  };

  const handleCloseCompose = () => {
    setComposeModal({ open: false, item: null });
    setIsSending(false);
  };

  const sendEmail = async (dept, msg, ticketId, user, targetEmail) => {
    const stationKey = dept.toLowerCase();
    try {
      const resp = await fetch("http://localhost:5000/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station: stationKey,
          message: msg,
          ticketId: ticketId,
          ticketRefUser: user || null
        })
      });

      const payload = await resp.json();

      if (resp.ok && payload.success) {
        setToast({ show: true, message: `Email sent to ${targetEmail}`, type: "success" });
      } else {
        const errMsg = payload?.error || payload?.message || "Email failed";
        setToast({ show: true, message: `Action saved but email failed: ${errMsg}`, type: "error" });
      }
    } catch (err) {
      setToast({ show: true, message: `Action saved but server error: ${err.message}`, type: "error" });
    }
  };

  const handleSendAction = async () => {
    if (!messageText.trim()) return alert("Please enter a message or instruction.");

    setIsSending(true);
    const { id } = composeModal.item;

    try {
      if (actionType === "reply") {
        await updateDoc(doc(db, "complaints", id), {
          status: "needs_reply",
          admin_reply_text: messageText,
          replyType: "reply",
          replied_at: serverTimestamp()
        });

        setToast({ show: true, message: "Queued for Reply on X (Twitter)", type: "success" });
        handleCloseCompose();

      } else if (actionType === "forward") {
        const targetEmail = DEPARTMENT_EMAILS[selectedDept];

        await updateDoc(doc(db, "complaints", id), {
          status: "Forwarded",
          admin_reply_text: messageText,
          forward_dept: selectedDept,
          forward_email: targetEmail,
          replyType: "forward",
          replied_at: serverTimestamp()
        });

        await sendEmail(selectedDept, messageText, id, composeModal.item?.user, targetEmail);
        handleCloseCompose();

      } else if (actionType === "both") {
        const targetEmail = DEPARTMENT_EMAILS[selectedDept];

        await updateDoc(doc(db, "complaints", id), {
          status: "needs_reply",
          admin_reply_text: messageText,
          replyType: "both",
          forward_dept: selectedDept,
          forward_email: targetEmail,
          replied_at: serverTimestamp()
        });

        await sendEmail(selectedDept, messageText, id, composeModal.item?.user, targetEmail);
        
        setToast({ show: true, message: "Queued for Twitter Reply & Email Sent", type: "success" });
        handleCloseCompose();
      }

    } catch (err) {
      console.error(err);
      setToast({ show: true, message: "Failed to process action.", type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Permanently delete this ticket?")) return;
    try {
      await deleteDoc(doc(db, "complaints", id));
      setToast({ show: true, message: "Ticket deleted", type: "success" });
    } catch(e) {
      console.error(e);
      setToast({ show: true, message: "Delete failed", type: "error" });
    }
  };

  /* ---------------------------
     Filtering & derived values
     --------------------------- */

  const uniqueTrainNumbers = Array.from(new Set(complaints.map(c => c.trainNumber).filter(Boolean))).sort();
  const uniqueSources = Array.from(new Set(complaints.map(c => c.source || "Unknown"))).sort();

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = !searchQ ||
      c.text?.toLowerCase().includes(searchQ.toLowerCase()) ||
      (c.user && c.user.toLowerCase().includes(searchQ.toLowerCase())) ||
      (c.name && c.name.toLowerCase().includes(searchQ.toLowerCase()));

    const matchesCat = categoryFilter === "All" || c.category === categoryFilter;
    const matchesDept = departmentFilter === "All" || (c.station || "Unknown") === departmentFilter;
    const matchesTrain = trainFilter === "All" || String(c.trainNumber) === String(trainFilter);
    const matchesSource = sourceFilter === "All" || (c.source || "Unknown") === sourceFilter;

    if (activeTab === "Pending") {
      return (c.status === "Pending" || c.status === "needs_reply" || c.status === "Unclassified" || c.status === "new") && matchesSearch && matchesCat && matchesDept && matchesTrain && matchesSource;
    }
    if (activeTab === "Already Replied") {
      return (c.status === "Replied" || c.status === "Forwarded") && matchesSearch && matchesCat && matchesDept && matchesTrain && matchesSource;
    }
    return matchesSearch && matchesCat && matchesDept && matchesTrain && matchesSource;
  });

  const historyList = complaints.filter(c => c.status === "Forwarded" || c.status === "Replied");

  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === "Pending" || c.status === "needs_reply" || c.status === "Unclassified" || c.status === "new").length;
  const resolvedCount = complaints.filter(c => c.status === "Replied" || c.status === "Forwarded").length;

  /* ---------------------------
     RENDER
     --------------------------- */

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
           <select
             className="nav-select"
             onChange={(e) => setCategoryFilter(e.target.value)}
             value={categoryFilter}
           >
              <option value="All">All Categories</option>
              {Object.keys(CATEGORY_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
           </select>

           <select
             className="nav-select"
             onChange={(e) => setDepartmentFilter(e.target.value)}
             value={departmentFilter}
           >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
           </select>

           <select
             className="nav-select"
             onChange={(e) => setTrainFilter(e.target.value)}
             value={trainFilter}
           >
             <option value="All">All Trains</option>
             {uniqueTrainNumbers.map(tn => <option key={tn} value={tn}>{tn}</option>)}
           </select>

        

           <div className="search-bar">
             <Search size={16} className="search-icon"/>
             <input
               placeholder="Search..."
               value={searchQ}
               onChange={e => setSearchQ(e.target.value)}
             />
           </div>

           <button className="btn outline" onClick={() => setHistoryOpen(true)} title="History">
             <History size={16} />
           </button>

         <button
  className="btn outline logout"
  onClick={() => {
    localStorage.removeItem("railway_admin_session");
    onLogout(false);
  }}
  title="Logout"
>
  <LogOut size={16} />
</button>

        </div>
      </nav>

      <div className="dashboard-grid">
        <main className="main-content">

          {/* STATS CARDS */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper bg-blue-light text-blue">
                <MessageSquare size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Total Tickets</span>
                <span className="stat-value">{totalCount}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper bg-orange-light text-orange">
                <Clock size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{pendingCount}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper bg-green-light text-green">
                <CheckCircle size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Resolved</span>
                <span className="stat-value">{resolvedCount}</span>
              </div>
            </div>
          </div>

          {/* QUEUE HEADER */}
          <div className="section-header-row">
            <div className="section-title">
              <LayoutDashboard size={20} />
              <h2>Priority Queue</h2>
            </div>

            <div className="tabs-pill">
               <button
                 className={`pill-tab ${activeTab === 'All' ? 'active' : ''}`}
                 onClick={() => setActiveTab('All')}
               >
                 All
               </button>
               <button
                 className={`pill-tab ${activeTab === 'Pending' ? 'active' : ''}`}
                 onClick={() => setActiveTab('Pending')}
               >
                 Pending
               </button>
               <button
                 className={`pill-tab ${activeTab === 'Already Replied' ? 'active' : ''}`}
                 onClick={() => setActiveTab('Already Replied')}
               >
                 Already Replied
               </button>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="table-card">
            {loading ? <div className="p-4">Loading...</div> : (
              <div className="table-scroll-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th width="130">Category</th>
                      <th>Issue Details</th>
                      <th width="160">Train No / PNR</th>
                      <th width="140">Location</th>
                      <th width="120">Status</th>
                      <th width="160" align="right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign:"center", padding: 40}}>No records found.</td></tr>
                    ) : (
                      filteredComplaints.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div className={`chip ${sanitizeClass(c.category)}`}>
                              {getIcon(c.category)} {c.category}
                            </div>
                          </td>
                          <td>
                             <div className="ticket-info">
                               <div className="ticket-header">
                                 <span className="u-handle">{getDisplayName(c)}</span>
                                 <span className="u-time">{c.timestamp ? safeDateFromTimestamp(c.timestamp).toLocaleString() : ''}</span>
                               </div>
                               <p className="ticket-text">{c.text}</p>
                             </div>
                          </td>

                          {/* TRAIN NO / PNR */}
                          <td style={{textAlign: "center", fontWeight: 600}}>
                            {c.trainNumber ? String(c.trainNumber) : "N/A"}
                            {c.pnr ? ` / ${c.pnr}` : ""}
                          </td>

                          {/* LOCATION */}
                          <td>
                            <div className="location-cell">
                              <strong>{c.station}</strong>
                            </div>
                          </td>

                          <td>
                            <span className={`status-badge ${c.status === 'Pending' || c.status === 'needs_reply' ? 'warn' : 'good'}`}>
                               {c.status === 'needs_reply' ? 'Sending...' : c.status}
                               {c.status === 'Forwarded' && <small> to {c.forward_dept}</small>}
                            </span>
                          </td>
                          <td align="right">
                             <div className="action-cell">
                               {c.status === 'Pending' || c.status === 'needs_reply' || c.status === 'Unclassified' || c.status === 'new' ? (
                                 <button className="btn primary small" onClick={() => handleOpenCompose(c)}>
                                   <Share2 size={14}/> Take Action
                                 </button>
                               ) : (
                                 <div className="replied-check">
                                   <Check size={16}/> Done
                                 </div>
                               )}
                               
                               <button 
                                 className="btn icon-only" 
                                 onClick={() => handleOpenCompose(c)} 
                                 title="Edit / Retry"
                               >
                                 <Pencil size={14}/>
                               </button>

                               <button className="btn icon-only" onClick={() => handleDelete(c.id)} title="Delete">
                                 <Trash2 size={14}/>
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* SYSTEM LOGS SIDEBAR */}
        <aside className="sidebar">
          <div className="console-wrapper">
            <div className="console-head">
              <Terminal size={14}/> System Logs
            </div>
            <div className="console-logs">
              {botLogs.slice(-200).map((l, i) => (
                <div key={i} className="log-row"><span>{`>`}</span> {l}</div>
              ))}
              <div ref={consoleEndRef}/>
            </div>
          </div>
        </aside>
      </div>

      {/* --- MODALS --- */}
      <Modal
        open={composeModal.open}
        onClose={handleCloseCompose}
        title={composeModal.item?.status === 'Replied' || composeModal.item?.status === 'Forwarded' ? "Edit / Retry Action" : "Take Action"}
        footer={
          <div className="compose-footer dual-buttons" style={{display: "flex", gap: "8px", alignItems: "center"}}>
             <button
               className={`btn ${actionType === "reply" ? "primary" : "ghost"}`}
               onClick={() => setActionType("reply")}
               type="button"
             >
               Reply
             </button>

             <button
               className={`btn ${actionType === "forward" ? "primary" : "ghost"}`}
               onClick={() => setActionType("forward")}
               type="button"
             >
               Email
             </button>

             <button
               className={`btn ${actionType === "both" ? "primary" : "ghost"}`}
               onClick={() => setActionType("both")}
               type="button"
               style={{border: "1px solid #6366f1", color: actionType === "both" ? "white" : "#6366f1"}}
             >
               Reply + Email
             </button>

             <div style={{flex: 1}}></div>

             <button className="btn ghost" onClick={handleCloseCompose} type="button">Cancel</button>

             <button
               className="btn success"
               onClick={handleSendAction}
               disabled={isSending}
               type="button"
             >
               {isSending ? "Processing..." : "Confirm"} <Send size={16} />
             </button>
          </div>
        }
      >
        <div className="compose-form">
           <label>Passenger Complaint</label>
           <div className="quote-box">
             "{composeModal.item?.text}"
           </div>

           <label>Action Type</label>
           <div style={{display:"flex", gap:8, marginBottom:12}}>
             <div className={`action-pill ${actionType === "reply" ? "active" : ""}`} onClick={() => setActionType("reply")}>
               <strong>Reply</strong>
               <div className="muted">Reply on X Only</div>
             </div>

             <div className={`action-pill ${actionType === "forward" ? "active" : ""}`} onClick={() => setActionType("forward")}>
               <strong>Email</strong>
               <div className="muted">Email Dept Only</div>
             </div>

             <div className={`action-pill ${actionType === "both" ? "active" : ""}`} onClick={() => setActionType("both")}>
               <strong>Both Actions</strong>
               <div className="muted">Reply on X AND Email</div>
             </div>
           </div>

           <label>Select Department (Recipient)</label>
           <div className="select-wrapper">
             <Building2 size={16} className="sel-icon"/>
             <select
               value={selectedDept}
               onChange={(e) => setSelectedDept(e.target.value)}
             >
               {DEPARTMENTS.map(d => (
                 <option key={d} value={d}>
                   {d} Division ({DEPARTMENT_EMAILS[d]})
                 </option>
               ))}
             </select>
           </div>

           <label>Action Note / Message</label>
           <textarea
             className="form-textarea"
             rows="4"
             placeholder={actionType === "reply" ? "Enter reply for passenger..." : "Enter instruction for department..."}
             value={messageText}
             onChange={(e) => setMessageText(e.target.value)}
           />
        </div>
      </Modal>

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historyItems={historyList}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}

/* =========================================
   APP EXPORT
========================================= */

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("railway_admin_session") === "true");
  if (!isAuthenticated) return <LoginPage onLogin={setIsAuthenticated} />;
  return <AdminDashboard onLogout={setIsAuthenticated} />;
}
