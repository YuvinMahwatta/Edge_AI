import { useState, useEffect } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { T } from "../../constants/theme";
import { api } from "../../api";
import { usersData as mockUsers } from "../../utils/mockData";
import Btn from "../../components/common/Btn";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";

const UserManagementPage = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0 });

  const fetchUsers = async (search = "") => {
    try {
      const data = await api.users(search);
      setUsers(data.users);
      setStats({ total: data.total, active: data.active, admins: data.admins });
    } catch {
      // keep mock data on failure
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    try {
      await api.addUser(newUser);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    }
  };

  const removeUser = async (id) => {
    try {
      await api.deleteUser(id);
      fetchUsers();
    } catch {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const toggleStatus = async (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const newActive = user.status !== "active";
    try {
      await api.updateUser(id, { is_active: newActive });
      fetchUsers();
    } catch {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>User Management</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Manage system users and access control.</p>
        </div>
        <Btn variant="primary" onClick={() => { setShowModal(true); setError(""); }}><Plus size={16} /> Add User</Btn>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Input icon={Search} placeholder="Search users by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: 0 }} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: T.card, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Users</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginTop: 4 }}>{stats.total || users.length}</div>
        </div>
        <div style={{ background: T.card, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginTop: 4, color: T.green }}>{stats.active || users.filter(u => u.status === "active").length}</div>
        </div>
        <div style={{ background: T.card, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Admins</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginTop: 4, color: T.accent }}>{stats.admins || users.filter(u => u.role === "admin").length}</div>
        </div>
      </div>

      {/* User Table */}
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 800 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px", padding: "14px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
              {["Name", "Email", "Role", "Status", "Last Login", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</span>
              ))}
            </div>
            {filtered.map((u, i) => (
              <div key={u.id} className="fade-in" style={{
                animationDelay: `${i * 0.04}s`, opacity: 0,
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px", padding: "14px 24px",
                borderBottom: `1px solid ${T.border}`, alignItems: "center", transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}30, ${T.green}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: T.accent }}>
                    {u.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{u.name}</span>
                </div>
                <span style={{ fontSize: 13, color: T.textMuted }}>{u.email}</span>
                <Badge color={u.role === "admin" ? T.accent : T.blue}>{u.role}</Badge>
                <div onClick={() => toggleStatus(u.id)} style={{ cursor: "pointer" }}>
                  <Badge color={u.status === "active" ? T.green : T.red}>{u.status}</Badge>
                </div>
                <span style={{ fontSize: 12, color: T.textDim }}>{u.lastLogin || u.last_login}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => removeUser(u.id)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={14} color={T.red} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowModal(false)}>
          <div className="fade-in" onClick={e => e.stopPropagation()} style={{
            background: T.card, borderRadius: 20, padding: 32, border: `1px solid ${T.border}`,
            width: "90%", maxWidth: 420, boxShadow: "0 32px 64px rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Add New User</h2>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Create a new user account for the system.</p>

            {error && (
              <div style={{ padding: "10px 14px", background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: T.red }}>
                {error}
              </div>
            )}

            <Input label="Full Name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name" />
            <Input label="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="Enter email" />
            <Input label="Password" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Enter password" />
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>Role</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["user", "admin"].map(r => (
                  <button key={r} onClick={() => setNewUser(p => ({ ...p, role: r }))} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${newUser.role === r ? T.accent : T.border}`,
                    background: newUser.role === r ? T.accentGlow : "transparent", color: newUser.role === r ? T.accent : T.textMuted,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                  }}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <Btn variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</Btn>
              <Btn variant="primary" onClick={addUser} style={{ flex: 1 }}>Create User</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
