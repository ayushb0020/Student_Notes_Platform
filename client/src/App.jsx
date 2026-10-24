import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Upload, Bookmark, LogOut, UserRound, Download, Trash2, X, FileText, LibraryBig, GraduationCap, Menu } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const subjects = ["All subjects", "Operating System", "DBMS", "Computer Networks", "DSA", "DAA", "Automata", "Mathematics", "Other"];

function readSession() {
  try { return JSON.parse(localStorage.getItem("studyshelf-session") || "null"); } catch { return null; }
}
function formatSize(bytes) {
  if (!bytes) return "PDF";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [page, setPage] = useState("Explore");
  const [modal, setModal] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : {};
    if (!response.ok)  {
  const message = data.message || "Something went wrong.";
  const reason = data.reason ? ` Reason: ${data.reason}` : "";
  throw new Error(`${message}${reason}`);
  }
    return data;
  }

  async function loadNotes() {
    try {
      let path = "/api/notes";
      if (page === "My uploads") path = "/api/notes/mine/list";
      if (page === "Bookmarks") path = "/api/notes/bookmarks/list";
      if (page === "Explore") {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (subject !== "All subjects") params.set("subject", subject);
        path += `?${params.toString()}`;
      }
      const data = await request(path);
      setNotes(data.notes || []);
      setError("");
    } catch (e) {
      setNotes([]);
      if (page !== "Explore" || session) setError(e.message);
    }
  }

  useEffect(() => { loadNotes(); }, [page, session?.token, query, subject]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(id);
  }, [notice]);

  async function submitAuth(formData) {
    setBusy(true); setError("");
    try {
      const data = await request(`/api/auth/${authMode === "login" ? "login" : "register"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
      });
      const next = { token: data.token, user: data.user };
      localStorage.setItem("studyshelf-session", JSON.stringify(next));
      setSession(next); setModal(""); setNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem("studyshelf-session");
    setSession(null); setPage("Explore"); setNotice("You have logged out.");
  }

  async function toggleBookmark(note) {
    if (!session) { setAuthMode("login"); setModal("auth"); return; }
    try {
      await request(`/api/notes/${note.id}/bookmark`, { method: "POST" });
      await loadNotes();
    } catch (e) { setError(e.message); }
  }

  async function deleteNote(note) {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    try { await request(`/api/notes/${note.id}`, { method: "DELETE" }); setNotice("Note deleted."); await loadNotes(); }
    catch (e) { setError(e.message); }
  }

  async function uploadNote(formData) {
    setBusy(true); setError("");
    try {
      await request("/api/notes", { method: "POST", body: formData });
      setModal(""); setPage("My uploads"); setNotice("Your notes are uploaded!");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const visibleNotes = notes;
  const totalCount = visibleNotes.length;
  const isExplore = page === "Explore";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><BookOpen size={21}/></span><span>Study<span className="brand-accent">Shelf</span></span></div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav">
          {[["Explore", Search], ["My uploads", Upload], ["Bookmarks", Bookmark]].map(([label, Icon]) => (
            <button key={label} className={`nav-item ${page === label ? "active" : ""}`} onClick={() => { setPage(label); setMobileNav(false); setError(""); }}>
              <Icon size={18}/><span>{label}</span>{label === "Bookmarks" && <span className="nav-dot"/>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card"><span className="tip-icon"><GraduationCap size={20}/></span><strong>Learning is better together.</strong><p>Share your notes and help another student ace their exams.</p><button onClick={() => { if (!session) { setModal("auth"); return; } setModal("upload"); }}>Share notes <span>↗</span></button></div>
          {session ? <div className="profile-row"><div className="avatar">{session.user.name?.slice(0,1).toUpperCase() || "S"}</div><div className="profile-text"><strong>{session.user.name}</strong><span>{session.user.email}</span></div><button className="icon-button" title="Log out" onClick={logout}><LogOut size={17}/></button></div> :
          <button className="login-side" onClick={() => { setAuthMode("login"); setModal("auth"); }}><UserRound size={18}/> Log in / Sign up</button>}
        </div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Close menu" onClick={() => setMobileNav(false)}/>}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu"><Menu size={20}/></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{page}</strong></div>
          <div className="top-actions">
            <span className="status-pill"><span/> Community library</span>
            {!session && <button className="button button-dark small-button" onClick={() => { setAuthMode("login"); setModal("auth"); }}>Get started <span>↗</span></button>}
            {session && <button className="button button-primary small-button" onClick={() => setModal("upload")}><Upload size={15}/> Upload notes</button>}
          </div>
        </header>

        <section className="content">
          <div className="hero-row">
            <div><div className="eyebrow"><span className="eyebrow-line"/> THE STUDENT COMMUNITY</div>
              <h1>{page === "Explore" ? <>Your next <em>“aha!”</em><br className="desktop-break"/> moment starts here.</> : page === "My uploads" ? <>Your knowledge,<br/><em>all in one place.</em></> : <>Keep your best<br/><em>resources close.</em></>}</h1>
              <p className="hero-subtitle">{page === "Explore" ? "Discover notes, simplify tough topics, and learn a little better every day." : page === "My uploads" ? "Manage the study materials you've shared with the community." : "Your bookmarked notes, ready whenever you need them."}</p>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-paper"><div className="paper-label">STUDY NOTES</div><div className="paper-title">Make it<br/>make sense.</div><div className="paper-line"/><div className="paper-line short"/><div className="paper-scribble">✳</div></div><div className="floating-badge badge-book"><BookOpen size={19}/></div><div className="floating-badge badge-star">✦</div></div>
          </div>

          {isExplore && <div className="search-panel">
            <div className="search-input-wrap"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a topic, subject, or keyword..." aria-label="Search notes"/></div>
            <div className="select-wrap"><select value={subject} onChange={e => setSubject(e.target.value)} aria-label="Filter by subject">{subjects.map(s => <option key={s}>{s}</option>)}</select><span>⌄</span></div>
            <button className="button button-primary search-button" onClick={loadNotes}>Find notes <span>→</span></button>
          </div>}

          <div className="section-heading"><div><div className="section-kicker">{isExplore ? "THE LIBRARY" : "YOUR COLLECTION"}</div><h2>{isExplore ? "Explore study notes" : page}</h2><p>{isExplore ? "Handpicked knowledge from students like you." : "Everything you've saved and shared."}</p></div>
            <div className="result-count"><LibraryBig size={16}/><span>{totalCount} {totalCount === 1 ? "resource" : "resources"}</span></div>
          </div>

          {notice && <div className="notice success-notice">{notice}</div>}
          {error && <div className="notice error-notice">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={15}/></button></div>}

          {visibleNotes.length ? <div className="notes-grid">{visibleNotes.map((note, index) => (
            <article className="note-card" key={note.id}>
              <div className={`note-cover cover-${index % 5}`}><div className="cover-top"><span className="subject-chip">{note.subject}</span><button className={`bookmark-button ${note.isBookmarked ? "bookmarked" : ""}`} title={note.isBookmarked ? "Remove bookmark" : "Bookmark note"} onClick={() => toggleBookmark(note)}><Bookmark size={17} fill={note.isBookmarked ? "currentColor" : "none"}/></button></div><div className="cover-illustration"><FileText size={43} strokeWidth={1.15}/><span className="cover-spark">✳</span></div><div className="cover-footer"><span>STUDYSHELF / RESOURCE</span><span>{String(index + 1).padStart(2,"0")}</span></div></div>
              <div className="note-body"><h3>{note.title}</h3><p className="note-description">{note.description || "A student-shared resource to help you understand the topic and prepare for your exams."}</p><div className="note-meta"><div className="mini-avatar">{String(note.uploadedBy || "S").slice(0,1).toUpperCase()}</div><div className="meta-person"><strong>{note.uploadedBy || "Student"}</strong><span>{timeAgo(note.createdAt)}</span></div><span className="file-size">{formatSize(note.fileSize)}</span></div><div className="card-actions"><a className="button button-outline download-button" href={`${API}${note.downloadUrl}`} onClick={e => { if (!note.downloadUrl) e.preventDefault(); }}><Download size={15}/> Download PDF</a>{session && String(note.uploadedById) === String(session.user.id) && <button className="icon-button delete-button" title="Delete your note" onClick={() => deleteNote(note)}><Trash2 size={16}/></button>}</div></div>
            </article>
          ))}</div> : <div className="empty-state"><div className="empty-icon"><FileText size={27}/></div><h3>{page === "Explore" ? "Your next great resource is waiting." : "Nothing here just yet."}</h3><p>{page === "Explore" ? "No notes match this search. Try another keyword or be the first to share a resource." : page === "Bookmarks" ? "Bookmark a note while exploring and it will appear here." : "Upload your first set of notes to get started."}</p>{session && <button className="button button-primary" onClick={() => setModal("upload")}><Upload size={16}/> Upload notes</button>}</div>}

          <footer className="footer"><span>© 2026 StudyShelf</span><span>Made for students, by students <span className="footer-heart">♥</span></span></footer>
        </section>
      </main>

      {modal === "auth" && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => { setModal(""); setError(""); }} onSubmit={submitAuth} busy={busy} error={error}/>}
      {modal === "upload" && <UploadModal onClose={() => { setModal(""); setError(""); }} onSubmit={uploadNote} busy={busy} error={error}/>}
    </div>
  );
}

function AuthModal({ mode, setMode, onClose, onSubmit, busy, error }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-card">
    <button className="modal-close icon-button" onClick={onClose}><X size={19}/></button><div className="modal-logo"><BookOpen size={23}/></div><div className="modal-eyebrow">WELCOME TO STUDYSHELF</div><h2>{mode === "login" ? "Good to see you again." : "Join the community."}</h2><p className="modal-subtitle">{mode === "login" ? "Log in to save notes and share your knowledge." : "Create an account to start sharing study resources."}</p>
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, email, password }); }}>
      {mode === "register" && <label>Full name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength="80"/></label>}
      <label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu"/></label>
      <label>Password<input required type="password" minLength="8" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
      {error && <div className="form-error">{error}</div>}
      <button className="button button-primary modal-submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"} <span>→</span></button>
    </form><div className="modal-switch">{mode === "login" ? "New to StudyShelf?" : "Already have an account?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Log in"}</button></div>
  </div></div>;
}

function UploadModal({ onClose, onSubmit, busy, error }) {
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState("Operating System"); const [description, setDescription] = useState(""); const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  function chooseFile(next) { if (next && next.type !== "application/pdf") { alert("Please select a PDF file."); return; } if (next && next.size > 10 * 1024 * 1024) { alert("PDF must be 10 MB or smaller."); return; } setFile(next); }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-card upload-modal">
    <button className="modal-close icon-button" onClick={onClose}><X size={19}/></button><div className="modal-logo"><Upload size={22}/></div><div className="modal-eyebrow">GIVE KNOWLEDGE A HOME</div><h2>Share your notes.</h2><p className="modal-subtitle">Help someone understand a topic a little better.</p>
    <form onSubmit={e => { e.preventDefault(); if (!file) return; const data = new FormData(); data.append("title", title); data.append("subject", subject); data.append("description", description); data.append("file", file); onSubmit(data); }}>
      <label>Note title<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Process Scheduling — Unit 2" maxLength="120"/></label>
      <label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}>{subjects.filter(s => s !== "All subjects").map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn from these notes?" rows="3" maxLength="1000"/></label>
      <label className={`file-drop ${dragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}>
        <input type="file" accept="application/pdf,.pdf" onChange={e => chooseFile(e.target.files[0])} hidden/>
        <span className="file-drop-icon"><FileText size={23}/></span><strong>{file ? file.name : "Choose a PDF or drag it here"}</strong><span>{file ? formatSize(file.size) : "PDF only · Maximum file size 10 MB"}</span>
      </label>
      {error && <div className="form-error">{error}</div>}
      <button className="button button-primary modal-submit" disabled={busy || !file}>{busy ? "Uploading..." : "Upload resource"} <Upload size={16}/></button>
    </form>
  </div></div>;
}
