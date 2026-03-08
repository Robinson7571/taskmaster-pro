import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const mapUser = (u, index) => ({
  ...u,
  id: u._id,
  avatar: u.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U",
  color: MEMBER_COLORS[index % MEMBER_COLORS.length],
});

const mapProject = (p) => ({
  ...p,
  id: p._id,
  members: (p.members || []).map(m => (typeof m === "object" && m !== null) ? (m._id || m.id) : m),
  deadline: p.deadline ? new Date(p.deadline).toISOString().split("T")[0] : null,
  budget: p.budget || 0,
  spent: p.spent || 0,
});

const mapTask = (t) => ({
  ...t,
  id: t._id,
  project: t.project || "General",
  assignee: null,
  tags: t.tags || [],
  dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
  subtasks: (t.subtasks || []).map(s => ({ ...s, id: s._id || s.id })),
  comments: (t.comments || []).map(c => ({ id: c._id || c.id, user: 1, text: c.text, time: c.time })),
  checklist: t.subtasks?.length ? Math.round((t.subtasks.filter(s => s.done).length / t.subtasks.length) * 100) : 0,
  created: t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  hoursLogged: t.hoursLogged || 0,
});

const PRIORITIES = { urgent: { label: "Urgente", color: "#ef4444", bg: "#fef2f2" }, high: { label: "Alta", color: "#f59e0b", bg: "#fffbeb" }, medium: { label: "Media", color: "#3b82f6", bg: "#eff6ff" }, low: { label: "Baja", color: "#22c55e", bg: "#f0fdf4" } };
const STATUSES = { backlog: "Backlog", todo: "Por hacer", progress: "En progreso", review: "En revisión", done: "Completado" };
const STATUS_COLORS = { backlog: "#94a3b8", todo: "#6366f1", progress: "#f59e0b", review: "#8b5cf6", done: "#22c55e" };
const TAGS = ["Frontend", "Backend", "Diseño", "QA", "DevOps", "Documentación", "Bug", "Feature", "Mejora"];
const MEMBER_COLORS = ["#6366f1","#ec4899","#f59e0b","#22c55e","#8b5cf6","#14b8a6","#f97316","#06b6d4","#ef4444"];
const PROJECT_COLORS = ["#6366f1","#ec4899","#f59e0b","#22c55e","#8b5cf6","#14b8a6","#f97316","#06b6d4"];

// Caché del equipo para que getUser() funcione en todos los componentes
let TEAM = [];

const INITIAL_PROJECTS = [];

const genId = () => Date.now() + Math.random();

const INITIAL_TASKS = [
  { id: 1, title: "Diseñar sistema de autenticación", desc: "Implementar login con MFA, OAuth2 y JWT tokens", status: "done", priority: "urgent", project: 1, assignee: 1, tags: ["Backend", "Feature"], dueDate: "2026-02-20", created: "2026-01-15", subtasks: [{ id: 1, text: "Diseñar esquema DB", done: true }, { id: 2, text: "Implementar JWT", done: true }, { id: 3, text: "Agregar OAuth2", done: true }], comments: [{ id: 1, user: 2, text: "Excelente implementación del MFA 👏", time: "2026-02-18T10:30:00" }], checklist: 100, hoursLogged: 24 },
  { id: 2, title: "Dashboard de analítica", desc: "Crear dashboard con KPIs, gráficos de productividad y reportes exportables", status: "progress", priority: "high", project: 1, assignee: 2, tags: ["Frontend", "Feature"], dueDate: "2026-03-01", created: "2026-02-01", subtasks: [{ id: 1, text: "Diseñar mockups", done: true }, { id: 2, text: "Implementar gráficos", done: true }, { id: 3, text: "Conectar API datos", done: false }, { id: 4, text: "Tests E2E", done: false }], comments: [{ id: 1, user: 1, text: "Priorizar los gráficos de Gantt", time: "2026-02-10T14:00:00" }], checklist: 50, hoursLogged: 16 },
  { id: 3, title: "Integración Slack & Teams", desc: "Conectar notificaciones con Slack y Microsoft Teams via webhooks", status: "todo", priority: "medium", project: 1, assignee: 3, tags: ["Backend", "Feature"], dueDate: "2026-03-15", created: "2026-02-05", subtasks: [{ id: 1, text: "Investigar APIs", done: true }, { id: 2, text: "Implementar webhooks", done: false }], comments: [], checklist: 33, hoursLogged: 6 },
  { id: 4, title: "Optimizar queries de búsqueda", desc: "Mejorar rendimiento de búsquedas con índices y cache Redis", status: "review", priority: "high", project: 3, assignee: 5, tags: ["Backend", "Mejora"], dueDate: "2026-02-25", created: "2026-02-10", subtasks: [{ id: 1, text: "Analizar queries lentas", done: true }, { id: 2, text: "Crear índices", done: true }, { id: 3, text: "Implementar Redis cache", done: true }], comments: [{ id: 1, user: 3, text: "Las queries bajaron de 2s a 200ms 🚀", time: "2026-02-22T09:15:00" }], checklist: 90, hoursLogged: 12 },
  { id: 5, title: "UI Kit componentes reutilizables", desc: "Crear librería de componentes: botones, modals, forms, tables, cards", status: "progress", priority: "medium", project: 2, assignee: 4, tags: ["Frontend", "Diseño"], dueDate: "2026-03-10", created: "2026-02-08", subtasks: [{ id: 1, text: "Botones y inputs", done: true }, { id: 2, text: "Modals y dialogs", done: true }, { id: 3, text: "Tables y data grids", done: false }, { id: 4, text: "Documentación Storybook", done: false }], comments: [], checklist: 50, hoursLogged: 20 },
  { id: 6, title: "Testing E2E con Cypress", desc: "Configurar y escribir tests E2E para flujos críticos del usuario", status: "backlog", priority: "low", project: 1, assignee: null, tags: ["QA"], dueDate: "2026-04-01", created: "2026-02-12", subtasks: [], comments: [], checklist: 0, hoursLogged: 0 },
  { id: 7, title: "Pipeline CI/CD", desc: "Configurar GitHub Actions con deploy automático a AWS ECS", status: "todo", priority: "urgent", project: 3, assignee: 3, tags: ["DevOps"], dueDate: "2026-02-28", created: "2026-02-14", subtasks: [{ id: 1, text: "Configurar GitHub Actions", done: false }, { id: 2, text: "Docker compose prod", done: false }, { id: 3, text: "Deploy a ECS", done: false }], comments: [], checklist: 0, hoursLogged: 2 },
  { id: 8, title: "Documentación API REST", desc: "Generar documentación Swagger/OpenAPI para todos los endpoints", status: "todo", priority: "medium", project: 3, assignee: 5, tags: ["Documentación", "Backend"], dueDate: "2026-03-05", created: "2026-02-15", subtasks: [], comments: [], checklist: 0, hoursLogged: 0 },
  { id: 9, title: "Fix: Notificaciones duplicadas", desc: "Bug crítico: los usuarios reciben notificaciones duplicadas por email", status: "progress", priority: "urgent", project: 1, assignee: 1, tags: ["Bug", "Backend"], dueDate: "2026-02-23", created: "2026-02-20", subtasks: [{ id: 1, text: "Reproducir bug", done: true }, { id: 2, text: "Identificar causa raíz", done: true }, { id: 3, text: "Aplicar fix", done: false }], comments: [{ id: 1, user: 2, text: "Confirmado: es un race condition en el event handler", time: "2026-02-21T16:45:00" }], checklist: 66, hoursLogged: 4 },
  { id: 10, title: "Diseño responsive móvil", desc: "Adaptar toda la interfaz para tablets y smartphones", status: "backlog", priority: "high", project: 2, assignee: 4, tags: ["Frontend", "Diseño"], dueDate: "2026-03-20", created: "2026-02-18", subtasks: [], comments: [], checklist: 0, hoursLogged: 0 },
  { id: 11, title: "Sistema de roles y permisos", desc: "Implementar RBAC con roles: admin, editor, observador y permisos granulares", status: "review", priority: "high", project: 1, assignee: 1, tags: ["Backend", "Feature"], dueDate: "2026-02-26", created: "2026-02-05", subtasks: [{ id: 1, text: "Modelo de datos RBAC", done: true }, { id: 2, text: "Middleware de permisos", done: true }, { id: 3, text: "UI gestión roles", done: true }, { id: 4, text: "Tests unitarios", done: false }], comments: [], checklist: 75, hoursLogged: 18 },
  { id: 12, title: "Migración base de datos", desc: "Migrar de MongoDB a PostgreSQL para mejor consistencia transaccional", status: "backlog", priority: "medium", project: 3, assignee: null, tags: ["Backend", "DevOps"], dueDate: "2026-04-15", created: "2026-02-19", subtasks: [], comments: [], checklist: 0, hoursLogged: 0 },
];

// ─── Icon Components ────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    kanban: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></svg>,
    list: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>,
    gantt: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="12" height="3" rx="1"/><rect x="7" y="10" width="14" height="3" rx="1"/><rect x="5" y="16" width="10" height="3" rx="1"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    team: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    folder: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    chat: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    attachment: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    drag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    target: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    trophy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>,
  };
  return icons[name] || null;
};

// ─── Utility Functions ─────────────────────────────────────
const formatDate = (d) => { if (!d) return "—"; const date = new Date(d); return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" }); };
const daysUntil = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); };
const getUser = (id) => TEAM.find(u => u.id === id);

// ─── Main App ──────────────────────────────────────────────
function TaskMasterPro() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null); // null = personal workspace

  // Load users, projects, teams once on mount
  useEffect(() => {
    axios.get(`${API}/users`).then(({ data }) => { const mapped = data.users.map(mapUser); setTeam(mapped); TEAM = mapped; }).catch(console.error);
    axios.get(`${API}/projects`).then(({ data }) => setProjects(data.projects.map(mapProject))).catch(console.error);
    axios.get(`${API}/teams`).then(({ data }) => setTeams(data.teams)).catch(console.error);
  }, []);

  // Reload tasks when workspace (activeTeam) changes
  useEffect(() => {
    const url = activeTeam ? `${API}/tasks?team=${activeTeam._id}` : `${API}/tasks`;
    axios.get(url).then(({ data }) => setTasks(data.tasks.map(mapTask))).catch(console.error);
  }, [activeTeam]);

  // Mantener caché global sincronizada
  useEffect(() => { TEAM = team; }, [team]);

  // ── Project CRUD ──────────────────────────────────────────
  const addProject = async (projectData) => {
    try {
      const { data } = await axios.post(`${API}/projects`, projectData);
      setProjects(prev => [...prev, mapProject(data.project)]);
    } catch (err) { console.error(err); throw err; }
  };

  const deleteProject = async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try { await axios.delete(`${API}/projects/${id}`); } catch (err) { console.error(err); }
  };

  const updateProject = async (id, updates) => {
    try {
      const { data } = await axios.put(`${API}/projects/${id}`, updates);
      setProjects(prev => prev.map(p => p.id === id ? mapProject(data.project) : p));
    } catch (err) { console.error(err); }
  };

  // ── Team / Project Members CRUD ───────────────────────────
  const addProjectMember = async (projectId, email) => {
    const { data } = await axios.post(`${API}/projects/${projectId}/members`, { email });
    setProjects(prev => prev.map(p => p.id === projectId ? mapProject(data.project) : p));
    const usersRes = await axios.get(`${API}/users`);
    const mapped = usersRes.data.users.map(mapUser);
    setTeam(mapped); TEAM = mapped;
  };

  const removeProjectMember = async (projectId, userId) => {
    try {
      const { data } = await axios.delete(`${API}/projects/${projectId}/members/${userId}`);
      setProjects(prev => prev.map(p => p.id === projectId ? mapProject(data.project) : p));
    } catch (err) { console.error(err); }
  };

  const deleteTeamMember = async (userId) => {
    setTeam(prev => { const updated = prev.filter(u => u.id !== userId); TEAM = updated; return updated; });
    try { await axios.delete(`${API}/users/${userId}`); } catch (err) { console.error(err); }
  };

  const updateMemberRole = async (userId, role) => {
    try {
      await axios.put(`${API}/users/${userId}`, { role });
      setTeam(prev => { const updated = prev.map(u => u.id === userId ? { ...u, role } : u); TEAM = updated; return updated; });
    } catch (err) { console.error(err); }
  };

  // ── Teams CRUD ────────────────────────────────────────────
  const createTeam = async (data) => {
    const { data: res } = await axios.post(`${API}/teams`, data);
    setTeams(prev => [...prev, res.team]);
    return res.team;
  };

  const deleteTeam = async (id) => {
    await axios.delete(`${API}/teams/${id}`);
    setTeams(prev => prev.filter(t => t._id !== id));
    if (activeTeam?._id === id) setActiveTeam(null);
  };

  const addTeamMember = async (teamId, email) => {
    const { data: res } = await axios.post(`${API}/teams/${teamId}/members`, { email });
    setTeams(prev => prev.map(t => t._id === teamId ? res.team : t));
    return res.team;
  };

  const removeTeamMember = async (teamId, userId) => {
    const { data: res } = await axios.delete(`${API}/teams/${teamId}/members/${userId}`);
    setTeams(prev => prev.map(t => t._id === teamId ? res.team : t));
    return res.team;
  };

  const theme = darkMode ? {
    bg: "#0b0f1a", bgCard: "#111827", bgHover: "#1e293b", bgSidebar: "#0f1629",
    border: "#1e293b", borderLight: "#2a3654", text: "#e2e8f0", textMuted: "#94a3b8",
    textDim: "#64748b", accent: "#6366f1", accentHover: "#818cf8", accentGlow: "rgba(99,102,241,0.15)",
    surface: "#151d32", surfaceHover: "#1a2540", danger: "#ef4444", success: "#22c55e",
    warning: "#f59e0b", shadow: "0 4px 24px rgba(0,0,0,0.4)", shadowLg: "0 8px 40px rgba(0,0,0,0.5)",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)"
  } : {
    bg: "#f0f2f5", bgCard: "#ffffff", bgHover: "#f8fafc", bgSidebar: "#ffffff",
    border: "#e2e8f0", borderLight: "#f1f5f9", text: "#1e293b", textMuted: "#64748b",
    textDim: "#94a3b8", accent: "#6366f1", accentHover: "#4f46e5", accentGlow: "rgba(99,102,241,0.1)",
    surface: "#f8fafc", surfaceHover: "#f1f5f9", danger: "#ef4444", success: "#22c55e",
    warning: "#f59e0b", shadow: "0 4px 24px rgba(0,0,0,0.06)", shadowLg: "0 8px 40px rgba(0,0,0,0.1)",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)"
  };

  const filteredTasks = (() => {
    let f = tasks;
    if (selectedProject) f = f.filter(t => t.project === selectedProject);
    if (searchQuery) f = f.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterPriority) f = f.filter(t => t.priority === filterPriority);
    if (filterTag) f = f.filter(t => t.tags.includes(filterTag));
    return f;
  })();

  const stats = (() => {
    const all = selectedProject ? tasks.filter(t => t.project === selectedProject) : tasks;
    return {
      total: all.length,
      done: all.filter(t => t.status === "done").length,
      progress: all.filter(t => t.status === "progress").length,
      overdue: all.filter(t => daysUntil(t.dueDate) < 0 && t.status !== "done").length,
      urgent: all.filter(t => t.priority === "urgent" && t.status !== "done").length,
      totalHours: all.reduce((s, t) => s + t.hoursLogged, 0),
    };
  })();

  const updateTask = async (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (selectedTask?.id === id) setSelectedTask(prev => ({ ...prev, ...updates }));
    const { comments, checklist, created, ...apiUpdates } = updates;
    if (Object.keys(apiUpdates).length > 0) {
      try { await axios.put(`${API}/tasks/${id}`, apiUpdates); }
      catch (err) { console.error("Error actualizando tarea:", err); }
    }
  };

  const addTask = async (task) => {
    try {
      const projectName = task.project || "General";
      const payload = {
        title: task.title, desc: task.desc || "", status: task.status || "todo",
        priority: task.priority || "medium", project: projectName,
        tags: task.tags || [],
      };
      if (task.dueDate) payload.dueDate = task.dueDate;
      if (task.assignee) payload.assignee = task.assignee;
      if (task.subtasks?.length) payload.subtasks = task.subtasks.map(s => ({ text: s.text, done: s.done || false }));
      if (activeTeam) payload.team = activeTeam._id;
      const { data } = await axios.post(`${API}/tasks`, payload);
      setTasks(prev => [...prev, mapTask(data.task)]);
      setShowNewTask(false);
    } catch (err) {
      console.error("Error creando tarea:", err.response?.data?.message || err.message);
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
    try { await axios.delete(`${API}/tasks/${id}`); }
    catch (err) { console.error("Error eliminando tarea:", err); }
  };

  // Drag & Drop handlers
  const handleDragStart = (task) => setDragItem(task);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (status) => {
    if (dragItem) { updateTask(dragItem.id, { status }); setDragItem(null); }
  };

  // ─── Styles ──────────────────────────────────────────
  const styles = {
    app: { display: "flex", height: "100vh", width: "100%", fontFamily: "'DM Sans', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif", background: theme.bg, color: theme.text, overflow: "hidden", fontSize: 14, transition: "all 0.3s ease" },
    sidebar: { width: sidebarCollapsed ? 68 : 260, minWidth: sidebarCollapsed ? 68 : 260, background: theme.bgSidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden", zIndex: 10 },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
    header: { height: 64, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, background: theme.bgCard, flexShrink: 0 },
    content: { flex: 1, overflow: "auto", padding: 24 },
  };

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.borderLight}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textDim}; }
        input, textarea, select { font-family: inherit; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        .slide-in { animation: slideIn 0.35s ease forwards; }
        .scale-in { animation: scaleIn 0.2s ease forwards; }
      `}</style>

      {/* ── Sidebar ─── */}
      <aside style={styles.sidebar}>
        <div style={{ padding: sidebarCollapsed ? "20px 12px" : "20px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="zap" size={20} />
          </div>
          {!sidebarCollapsed && <div><div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>TaskMaster</div><div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, letterSpacing: "0.05em" }}>PRO</div></div>}
        </div>

        {/* Workspace Switcher */}
        <div style={{ padding: sidebarCollapsed ? "0 8px 8px" : "0 12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {!sidebarCollapsed && <div style={{ padding: "0 4px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: theme.textDim }}>Workspace</div>}
          {/* Personal */}
          <button onClick={() => setActiveTeam(null)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: sidebarCollapsed ? "6px 8px" : "6px 10px",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: activeTeam === null ? 600 : 400,
            background: activeTeam === null ? theme.accentGlow : "transparent",
            color: activeTeam === null ? theme.accent : theme.textMuted, transition: "all 0.2s",
            justifyContent: sidebarCollapsed ? "center" : "flex-start", width: "100%",
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: theme.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>P</div>
            {!sidebarCollapsed && "Personal"}
          </button>
          {/* Teams */}
          {teams.map(t => {
            const initials = t.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            const isActive = activeTeam?._id === t._id;
            return (
              <button key={t._id} onClick={() => setActiveTeam(t)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: sidebarCollapsed ? "6px 8px" : "6px 10px",
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: isActive ? 600 : 400,
                background: isActive ? theme.accentGlow : "transparent",
                color: isActive ? theme.accent : theme.textMuted, transition: "all 0.2s",
                justifyContent: sidebarCollapsed ? "center" : "flex-start", width: "100%",
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: t.color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                {!sidebarCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>}
              </button>
            );
          })}
        </div>

        <nav style={{ flex: 1, padding: sidebarCollapsed ? "8px 8px" : "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "dashboard", icon: "home", label: "Dashboard" },
            { id: "kanban", icon: "kanban", label: "Kanban" },
            { id: "list", icon: "list", label: "Lista" },
            { id: "gantt", icon: "gantt", label: "Timeline" },
            { id: "analytics", icon: "chart", label: "Analítica" },
            { id: "team", icon: "team", label: "Equipo" },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: sidebarCollapsed ? "10px 12px" : "10px 14px",
              border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: activeView === item.id ? 600 : 400,
              background: activeView === item.id ? theme.accentGlow : "transparent",
              color: activeView === item.id ? theme.accent : theme.textMuted,
              transition: "all 0.2s", justifyContent: sidebarCollapsed ? "center" : "flex-start",
              width: "100%",
            }}>
              <Icon name={item.icon} size={18} />{!sidebarCollapsed && item.label}
            </button>
          ))}

          {!sidebarCollapsed && <>
            <div style={{ margin: "16px 0 8px", padding: "0 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: theme.textDim }}>Proyectos</div>
            {projects.map(p => (
              <button key={p.id} onClick={() => setSelectedProject(selectedProject === p.name ? null : p.name)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", border: "none", borderRadius: 8,
                cursor: "pointer", fontSize: 13, background: selectedProject === p.name ? theme.accentGlow : "transparent",
                color: selectedProject === p.name ? theme.text : theme.textMuted, transition: "all 0.2s", width: "100%",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            ))}
          </>}
        </nav>

        {!sidebarCollapsed && (
          <div style={{ padding: "16px 16px", borderTop: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {user?.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name?.split(" ")[0] || "Usuario"}</div>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "capitalize" }}>{user?.role || "editor"}</div>
              </div>
              <button onClick={logout} title="Cerrar sesión" style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ─── */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
              <Icon name="search" size={16} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar tareas, proyectos..."
                style={{ position: "absolute", inset: 0, paddingLeft: 32, width: "100%", height: 38, border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
              <div style={{ width: "100%", height: 38 }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Filters */}
            <select value={filterPriority || ""} onChange={e => setFilterPriority(e.target.value || null)}
              style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="">Prioridad</option>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <select value={filterTag || ""} onChange={e => setFilterTag(e.target.value || null)}
              style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="">Etiqueta</option>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button onClick={() => setShowNotifications(!showNotifications)} style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={16} />
              <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: theme.danger }} />
            </button>

            <button onClick={() => setDarkMode(!darkMode)} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={darkMode ? "sun" : "moon"} size={16} />
            </button>

            <button onClick={() => setShowNewTask(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 12px rgba(99,102,241,0.3)" }}>
              <Icon name="plus" size={16} />Nueva Tarea
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={styles.content}>
          {activeView === "dashboard" && <DashboardView stats={stats} tasks={filteredTasks} projects={projects} theme={theme} setSelectedTask={setSelectedTask} updateTask={updateTask} setActiveView={setActiveView} team={team} user={user} />}
          {activeView === "kanban" && <KanbanView tasks={filteredTasks} theme={theme} setSelectedTask={setSelectedTask} handleDragStart={handleDragStart} handleDragOver={handleDragOver} handleDrop={handleDrop} team={team} />}
          {activeView === "list" && <ListView tasks={filteredTasks} theme={theme} setSelectedTask={setSelectedTask} updateTask={updateTask} deleteTask={deleteTask} team={team} />}
          {activeView === "gantt" && <GanttView tasks={filteredTasks} theme={theme} projects={projects} />}
          {activeView === "analytics" && <AnalyticsView tasks={tasks} projects={projects} theme={theme} stats={stats} team={team} />}
          {activeView === "team" && <TeamView tasks={tasks} theme={theme} projects={projects} team={team} currentUser={user} onDeleteMember={deleteTeamMember} onUpdateRole={updateMemberRole} onCreateProject={addProject} onDeleteProject={deleteProject} onAddProjectMember={addProjectMember} onRemoveProjectMember={removeProjectMember} teams={teams} activeTeam={activeTeam} onCreateTeam={createTeam} onDeleteTeam={deleteTeam} onAddTeamMember={addTeamMember} onRemoveTeamMember={removeTeamMember} onSwitchTeam={setActiveTeam} />}
        </div>
      </main>

      {/* ── Task Detail Modal ─── */}
      {selectedTask && <TaskDetailModal task={selectedTask} theme={theme} onClose={() => setSelectedTask(null)} onUpdate={updateTask} onDelete={deleteTask} projects={projects} team={team} />}

      {/* ── New Task Modal ─── */}
      {showNewTask && <NewTaskModal theme={theme} onClose={() => setShowNewTask(false)} onAdd={addTask} projects={projects} team={team} />}

      {/* ── Notifications Panel ─── */}
      {showNotifications && <NotificationsPanel theme={theme} onClose={() => setShowNotifications(false)} tasks={tasks} />}
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────
function DashboardView({ stats, tasks, projects, theme, setSelectedTask, updateTask, setActiveView, user }) {
  const recentTasks = tasks.filter(t => t.status !== "done").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
  const overdueTasks = tasks.filter(t => daysUntil(t.dueDate) < 0 && t.status !== "done");
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches"; })();

  const statCards = [
    { label: "Total Tareas", value: stats.total, icon: "target", color: theme.accent, bg: theme.accentGlow },
    { label: "En Progreso", value: stats.progress, icon: "zap", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    { label: "Completadas", value: stats.done, icon: "check", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    { label: "Vencidas", value: stats.overdue, icon: "clock", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>{greeting}, {user?.name?.split(" ")[0] || "Usuario"} 👋</h1>
        <p style={{ color: theme.textMuted, fontSize: 14 }}>Tienes {stats.urgent} tarea{stats.urgent !== 1 ? "s" : ""} urgente{stats.urgent !== 1 ? "s" : ""} y {stats.overdue} vencida{stats.overdue !== 1 ? "s" : ""}. {stats.totalHours}h registradas en total.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="fade-in" style={{ animationDelay: `${i * 0.05}s`, padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 16, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}><Icon name={s.icon} size={20} /></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Upcoming Tasks */}
        <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Próximas tareas</h3>
            <button onClick={() => setActiveView("list")} style={{ background: "none", border: "none", color: theme.accent, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Ver todas →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentTasks.map(t => {
              const days = daysUntil(t.dueDate);
              const isOverdue = days < 0;
              return (
                <div key={t.id} onClick={() => setSelectedTask(t)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: theme.surface, cursor: "pointer", transition: "background 0.15s" }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: PRIORITIES[t.priority].color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: isOverdue ? theme.danger : theme.textDim, marginTop: 2 }}>
                      {isOverdue ? `Vencida hace ${Math.abs(days)} día${Math.abs(days) > 1 ? "s" : ""}` : `${days} día${days > 1 ? "s" : ""} restante${days > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  {t.assignee && <div style={{ width: 26, height: 26, borderRadius: "50%", background: getUser(t.assignee)?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{getUser(t.assignee)?.avatar}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Progress */}
        <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Progreso de Proyectos</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {projects.map(p => {
              const pTasks = tasks.filter(t => t.project === p.name);
              const done = pTasks.filter(t => t.status === "done").length;
              const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
              const budgetPct = Math.round((p.spent / p.budget) * 100);
              return (
                <div key={p.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: theme.surface, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: p.color, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textDim }}>
                    <span>{done}/{pTasks.length} tareas</span>
                    <span>Presupuesto: {budgetPct}% (${p.spent.toLocaleString()} / ${p.budget.toLocaleString()})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: theme.danger, flexShrink: 0 }}>
            <Icon name="clock" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.danger }}>⚠ {overdueTasks.length} tarea{overdueTasks.length > 1 ? "s" : ""} vencida{overdueTasks.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{overdueTasks.map(t => t.title).join(", ")}</div>
          </div>
        </div>
      )}

      {/* Activity by Status */}
      <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Distribución por Estado</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
          {Object.entries(STATUSES).map(([k, v]) => {
            const count = tasks.filter(t => t.status === k).length;
            const maxCount = Math.max(...Object.keys(STATUSES).map(s => tasks.filter(t => t.status === s).length), 1);
            const height = (count / maxCount) * 120;
            return (
              <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{count}</span>
                <div style={{ width: "100%", maxWidth: 60, height, borderRadius: 8, background: STATUS_COLORS[k], transition: "height 0.5s ease", opacity: 0.85 }} />
                <span style={{ fontSize: 10, color: theme.textMuted, textAlign: "center" }}>{v}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN VIEW ───────────────────────────────────────────
function KanbanView({ tasks, theme, setSelectedTask, handleDragStart, handleDragOver, handleDrop }) {
  return (
    <div className="fade-in" style={{ display: "flex", gap: 16, height: "100%", overflow: "auto", paddingBottom: 20 }}>
      {Object.entries(STATUSES).map(([status, label]) => {
        const columnTasks = tasks.filter(t => t.status === status);
        return (
          <div key={status} onDragOver={handleDragOver} onDrop={() => handleDrop(status)}
            style={{ minWidth: 280, width: 280, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[status] }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 11, color: theme.textDim, background: theme.surface, padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>{columnTasks.length}</span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: 4 }}>
              {columnTasks.map(task => (
                <KanbanCard key={task.id} task={task} theme={theme} onClick={() => setSelectedTask(task)} onDragStart={() => handleDragStart(task)} />
              ))}
              {columnTasks.length === 0 && (
                <div style={{ padding: 24, borderRadius: 12, border: `2px dashed ${theme.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textDim, fontSize: 12 }}>
                  Arrastra tareas aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, theme, onClick, onDragStart }) {
  const days = daysUntil(task.dueDate);
  const isOverdue = days !== null && days < 0 && task.status !== "done";
  const subtasksDone = task.subtasks.filter(s => s.done).length;

  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      style={{ padding: 14, borderRadius: 12, background: theme.bgCard, border: `1px solid ${theme.border}`, cursor: "grab", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = theme.shadow; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {task.tags.map(tag => (
          <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: theme.accentGlow, color: theme.accent, fontWeight: 500 }}>{tag}</span>
        ))}
      </div>
      <h4 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6, lineHeight: 1.4, letterSpacing: "-0.01em" }}>{task.title}</h4>
      <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.desc}</p>

      {task.subtasks.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textDim, marginBottom: 4 }}>
            <span>Subtareas</span><span>{subtasksDone}/{task.subtasks.length}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: theme.surface, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${task.subtasks.length ? (subtasksDone / task.subtasks.length) * 100 : 0}%`, borderRadius: 2, background: theme.success, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: PRIORITIES[task.priority].color + "20", color: PRIORITIES[task.priority].color, fontWeight: 600 }}>{PRIORITIES[task.priority].label}</span>
          {isOverdue && <span style={{ fontSize: 10, color: theme.danger, fontWeight: 500 }}>Vencida</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.comments.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: theme.textDim }}><Icon name="chat" size={12} />{task.comments.length}</span>}
          {task.dueDate && <span style={{ fontSize: 11, color: isOverdue ? theme.danger : theme.textDim }}>{formatDate(task.dueDate)}</span>}
          {task.assignee && <div style={{ width: 22, height: 22, borderRadius: "50%", background: getUser(task.assignee)?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{getUser(task.assignee)?.avatar}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── LIST VIEW ─────────────────────────────────────────────
function ListView({ tasks, theme, setSelectedTask, updateTask, deleteTask }) {
  const grouped = {};
  Object.keys(STATUSES).forEach(s => { grouped[s] = tasks.filter(t => t.status === s); });

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {Object.entries(grouped).map(([status, items]) => items.length > 0 && (
        <div key={status}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 4px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[status] }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{STATUSES[status]}</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>({items.length})</span>
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.border}` }}>
            {items.map((task, i) => {
              const days = daysUntil(task.dueDate);
              const isOverdue = days !== null && days < 0 && task.status !== "done";
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 80px 100px 40px", alignItems: "center", padding: "12px 16px", background: theme.bgCard, borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : "none", cursor: "pointer", transition: "background 0.15s", gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = theme.bgCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: PRIORITIES[task.priority].color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{task.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: theme.surface, color: theme.textDim }}>{t}</span>)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>{task.assignee ? getUser(task.assignee)?.name.split(" ")[0] : "Sin asignar"}</div>
                  <div style={{ fontSize: 12, color: isOverdue ? theme.danger : theme.textMuted }}>{formatDate(task.dueDate)} {isOverdue && "⚠"}</div>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: PRIORITIES[task.priority].color + "20", color: PRIORITIES[task.priority].color, fontWeight: 600, textAlign: "center", justifySelf: "center" }}>{PRIORITIES[task.priority].label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: theme.surface, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${task.checklist}%`, borderRadius: 2, background: task.checklist === 100 ? theme.success : theme.accent }} />
                    </div>
                    <span style={{ fontSize: 10, color: theme.textDim, whiteSpace: "nowrap" }}>{task.checklist}%</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = theme.danger; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textDim; }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GANTT VIEW ────────────────────────────────────────────
function GanttView({ tasks, theme, projects }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  const totalDays = 60;
  const dayWidth = 28;

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getPosition = (date) => {
    const diff = (new Date(date) - startDate) / 86400000;
    return Math.max(0, diff * dayWidth);
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.created) - new Date(b.created));

  return (
    <div className="fade-in" style={{ overflow: "auto", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.bgCard }}>
      <div style={{ minWidth: totalDays * dayWidth + 280 }}>
        {/* Header */}
        <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, position: "sticky", top: 0, zIndex: 2, background: theme.bgCard }}>
          <div style={{ width: 280, flexShrink: 0, padding: "10px 16px", fontSize: 12, fontWeight: 600, borderRight: `1px solid ${theme.border}` }}>Tarea</div>
          <div style={{ display: "flex" }}>
            {days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} style={{ width: dayWidth, flexShrink: 0, textAlign: "center", padding: "6px 0", fontSize: 9, color: isToday ? theme.accent : isWeekend ? theme.textDim : theme.textMuted, fontWeight: isToday ? 700 : 400, borderRight: `1px solid ${theme.border}`, background: isToday ? theme.accentGlow : isWeekend ? theme.surface + "40" : "transparent" }}>
                  <div>{d.getDate()}</div>
                  <div style={{ fontSize: 8, marginTop: 1 }}>{d.toLocaleDateString("es", { month: "short" })}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Rows */}
        {sortedTasks.map(task => {
          const project = projects.find(p => p.name === task.project);
          const left = getPosition(task.created);
          const width = Math.max(dayWidth * 2, getPosition(task.dueDate) - left);
          return (
            <div key={task.id} style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, height: 40 }}>
              <div style={{ width: 280, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRight: `1px solid ${theme.border}`, overflow: "hidden" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITIES[task.priority].color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ position: "absolute", left, top: 8, width, height: 24, borderRadius: 6, background: project?.color || theme.accent, opacity: task.status === "done" ? 0.4 : 0.75, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, color: "#fff", fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap" }}>
                  {task.title}
                  {task.status === "done" && <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)` }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYTICS VIEW ────────────────────────────────────────
function AnalyticsView({ tasks, projects, theme, stats }) {
  const byPriority = Object.entries(PRIORITIES).map(([k, v]) => ({ key: k, label: v.label, count: tasks.filter(t => t.priority === k).length, color: v.color }));
  const maxPriority = Math.max(...byPriority.map(b => b.count), 1);

  const teamStats = TEAM.map(member => {
    const memberTasks = tasks.filter(t => t.assignee === member.id);
    return { ...member, total: memberTasks.length, done: memberTasks.filter(t => t.status === "done").length, hours: memberTasks.reduce((s, t) => s + t.hoursLogged, 0) };
  }).sort((a, b) => b.done - a.done);

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return { day: d.toLocaleDateString("es", { weekday: "short" }), created: Math.floor(Math.random() * 5) + 1, completed: Math.floor(Math.random() * 4) };
  });
  const maxWeekly = Math.max(...weeklyData.map(d => Math.max(d.created, d.completed)), 1);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>Analítica y Reportes</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Priority Distribution */}
        <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Distribución por Prioridad</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byPriority.map(p => (
              <div key={p.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: p.color, fontWeight: 500 }}>{p.label}</span><span style={{ color: theme.textDim }}>{p.count} tareas</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: theme.surface, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(p.count / maxPriority) * 100}%`, borderRadius: 4, background: p.color, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity */}
        <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Actividad Semanal</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {weeklyData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 100 }}>
                  <div style={{ width: 14, height: (d.created / maxWeekly) * 100, borderRadius: 4, background: theme.accent, opacity: 0.7 }} />
                  <div style={{ width: 14, height: (d.completed / maxWeekly) * 100, borderRadius: 4, background: theme.success, opacity: 0.7 }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textDim, textTransform: "capitalize" }}>{d.day}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: theme.textMuted }}><div style={{ width: 8, height: 8, borderRadius: 2, background: theme.accent }} />Creadas</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: theme.textMuted }}><div style={{ width: 8, height: 8, borderRadius: 2, background: theme.success }} />Completadas</div>
          </div>
        </div>

        {/* Team Productivity */}
        <div style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}`, gridColumn: "span 2" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Productividad del Equipo</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {teamStats.map((m, i) => (
              <div key={m.id} style={{ padding: 16, borderRadius: 12, background: theme.surface, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>{m.avatar}</div>
                  {i === 0 && <div style={{ position: "absolute", top: -6, right: -6, color: "#f59e0b" }}><Icon name="trophy" size={16} /></div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name.split(" ")[0]}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ color: theme.textMuted }}>{m.total} tareas</span>
                  <span style={{ color: theme.success }}>{m.done} ✓</span>
                  <span style={{ color: theme.accent }}>{m.hours}h</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: theme.bgCard, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: m.total ? `${(m.done / m.total) * 100}%` : "0%", borderRadius: 2, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEAM VIEW ─────────────────────────────────────────────
function TeamView({ tasks, theme, projects, team, currentUser, onDeleteMember, onUpdateRole, onCreateProject, onDeleteProject, onAddProjectMember, onRemoveProjectMember, teams, activeTeam, onCreateTeam, onDeleteTeam, onAddTeamMember, onRemoveTeamMember, onSwitchTeam }) {
  const [tab, setTab] = useState("equipos");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "#6366f1", description: "", budget: 0, deadline: "" });
  const [addMemberProjectId, setAddMemberProjectId] = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Equipos tab state
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "", color: "#6366f1" });
  const [newTeamLoading, setNewTeamLoading] = useState(false);
  const [addTeamMemberInputs, setAddTeamMemberInputs] = useState({}); // teamId -> email
  const [addTeamMemberErrors, setAddTeamMemberErrors] = useState({});
  const [addTeamMemberLoading, setAddTeamMemberLoading] = useState({});
  const [showTeamMemberInput, setShowTeamMemberInput] = useState({}); // teamId -> bool

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      await onCreateProject({ ...newProject, budget: Number(newProject.budget) || 0 });
      setNewProject({ name: "", color: "#6366f1", description: "", budget: 0, deadline: "" });
      setShowNewProject(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;
    setNewTeamLoading(true);
    try {
      await onCreateTeam({ name: newTeam.name.trim(), description: newTeam.description, color: newTeam.color });
      setNewTeam({ name: "", description: "", color: "#6366f1" });
      setShowNewTeam(false);
    } catch (err) { console.error(err); }
    finally { setNewTeamLoading(false); }
  };

  const handleAddTeamMember = async (teamId) => {
    const email = addTeamMemberInputs[teamId]?.trim();
    if (!email) return;
    setAddTeamMemberLoading(prev => ({ ...prev, [teamId]: true }));
    setAddTeamMemberErrors(prev => ({ ...prev, [teamId]: "" }));
    try {
      await onAddTeamMember(teamId, email);
      setAddTeamMemberInputs(prev => ({ ...prev, [teamId]: "" }));
      setShowTeamMemberInput(prev => ({ ...prev, [teamId]: false }));
    } catch (err) {
      setAddTeamMemberErrors(prev => ({ ...prev, [teamId]: err.response?.data?.message || "Error al agregar miembro" }));
    } finally { setAddTeamMemberLoading(prev => ({ ...prev, [teamId]: false })); }
  };

  const handleAddMember = async (projectId) => {
    if (!addMemberEmail.trim()) return;
    setAddMemberLoading(true); setAddMemberError("");
    try {
      await onAddProjectMember(projectId, addMemberEmail.trim());
      setAddMemberEmail(""); setAddMemberProjectId(null);
    } catch (err) {
      setAddMemberError(err.response?.data?.message || "Error al agregar miembro");
    } finally { setAddMemberLoading(false); }
  };

  const btnStyle = (active) => ({
    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: active ? theme.accentGlow : "transparent", color: active ? theme.accent : theme.textMuted, transition: "all 0.2s",
  });

  return (
    <>
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>Equipo & Proyectos</h2>
        {tab === "projects" && (
          <button onClick={() => setShowNewProject(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="plus" size={14} /> Nuevo Proyecto
          </button>
        )}
        {tab === "equipos" && (
          <button onClick={() => setShowNewTeam(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="plus" size={14} /> Nuevo Equipo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: theme.surface, borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("equipos")} style={btnStyle(tab === "equipos")}>Equipos ({teams.length})</button>
        <button onClick={() => setTab("team")} style={btnStyle(tab === "team")}>Equipo ({team.length})</button>
        <button onClick={() => setTab("projects")} style={btnStyle(tab === "projects")}>Proyectos ({projects.length})</button>
      </div>

      {/* ── EQUIPOS TAB ── */}
      {tab === "equipos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {teams.length === 0 && (
            <div style={{ color: theme.textDim, fontSize: 14, padding: 24, textAlign: "center", borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              No perteneces a ningún equipo. Crea uno o pide a un administrador que te invite.
            </div>
          )}
          {teams.map(t => {
            const myMember = t.members?.find(m => String(m.user?._id || m.user) === String(currentUser?._id || currentUser?.id));
            const isAdmin = myMember?.role === 'admin';
            const isActive = activeTeam?._id === t._id;
            const initials = t.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            const showInput = showTeamMemberInput[t._id];
            return (
              <div key={t._id} style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${isActive ? t.color || theme.accent : theme.border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: t.color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        {t.name}
                        {isActive && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: (t.color || theme.accent) + "22", color: t.color || theme.accent, fontWeight: 600 }}>Activo</span>}
                        {isAdmin && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: theme.accentGlow, color: theme.accent, fontWeight: 600 }}>Admin</span>}
                      </div>
                      {t.description && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{t.description}</div>}
                      <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{t.members?.length || 0} miembro{t.members?.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { onSwitchTeam(isActive ? null : t); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${t.color || theme.border}`, background: isActive ? (t.color || theme.accent) : "transparent", color: isActive ? "#fff" : t.color || theme.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {isActive ? "Activo" : "Cambiar"}
                    </button>
                    {isAdmin && (
                      <button onClick={() => onDeleteTeam(t._id)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Members */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Miembros</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {(t.members || []).map(m => {
                      const u = m.user;
                      if (!u) return null;
                      const uId = u._id || u;
                      const uName = u.name || "?";
                      const uAvatar = uName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                      const uColor = MEMBER_COLORS[Math.abs(uName.charCodeAt(0) - 65) % MEMBER_COLORS.length];
                      const isMe = String(uId) === String(currentUser?._id || currentUser?.id);
                      return (
                        <div key={String(uId)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: theme.surface, border: `1px solid ${theme.border}` }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: uColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{uAvatar}</div>
                          <span style={{ fontSize: 12 }}>{uName.split(" ")[0]}</span>
                          {m.role === 'admin' && <span style={{ fontSize: 9, color: theme.accent }}>★</span>}
                          {isAdmin && !isMe && (
                            <button onClick={() => onRemoveTeamMember(t._id, String(uId))} style={{ width: 14, height: 14, borderRadius: "50%", border: "none", background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                              <Icon name="close" size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {isAdmin && (
                      <button onClick={() => setShowTeamMemberInput(prev => ({ ...prev, [t._id]: !prev[t._id] }))}
                        style={{ width: 28, height: 28, borderRadius: "50%", border: `1px dashed ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="plus" size={14} />
                      </button>
                    )}
                  </div>
                  {showInput && isAdmin && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={addTeamMemberInputs[t._id] || ""} onChange={e => setAddTeamMemberInputs(prev => ({ ...prev, [t._id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleAddTeamMember(t._id)}
                          placeholder="email del usuario registrado"
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
                        <button onClick={() => handleAddTeamMember(t._id)} disabled={addTeamMemberLoading[t._id]}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: addTeamMemberLoading[t._id] ? 0.7 : 1 }}>
                          {addTeamMemberLoading[t._id] ? "..." : "Agregar"}
                        </button>
                      </div>
                      {addTeamMemberErrors[t._id] && <div style={{ fontSize: 12, color: theme.danger, marginTop: 6 }}>{addTeamMemberErrors[t._id]}</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {team.map(member => {
            const memberTasks = tasks.filter(t => String(t.assignee) === String(member.id));
            const doneTasks = memberTasks.filter(t => t.status === "done").length;
            const hours = memberTasks.reduce((s, t) => s + (t.hoursLogged || 0), 0);
            const isMe = String(member.id) === String(currentUser?._id || currentUser?.id);
            return (
              <div key={member.id} style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{member.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {member.name} {isMe && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: theme.accentGlow, color: theme.accent }}>Tú</span>}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textDim }}>{member.email}</div>
                  </div>
                  {!isMe && (
                    <button onClick={() => setConfirmDelete(member)} title="Eliminar miembro" style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: theme.textDim }}>Rol:</span>
                  {isMe ? (
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: theme.accentGlow, color: theme.accent }}>{member.role}</span>
                  ) : (
                    <select value={member.role} onChange={e => onUpdateRole(member.id, e.target.value)}
                      style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, cursor: "pointer", outline: "none" }}>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="observador">observador</option>
                    </select>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {[["Tareas", memberTasks.length, theme.text], ["Hechas", doneTasks, theme.success], ["Horas", `${hours}h`, theme.accent]].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center", padding: 8, borderRadius: 8, background: theme.surface }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {team.length === 0 && <div style={{ color: theme.textDim, fontSize: 14 }}>No hay miembros. Crea un proyecto y agrega miembros por email.</div>}
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === "projects" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.project === project.name);
            const memberUsers = project.members.map(mid => team.find(u => String(u.id) === String(mid))).filter(Boolean);
            const isAddingMember = addMemberProjectId === project.id;
            return (
              <div key={project.id} style={{ padding: 20, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: project.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{project.name}</div>
                      {project.description && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{project.description}</div>}
                    </div>
                  </div>
                  <button onClick={() => onDeleteProject(project.id)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                  {[["Tareas", projectTasks.length], ["Hechas", projectTasks.filter(t=>t.status==="done").length], ["Miembros", memberUsers.length]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "center", padding: 8, borderRadius: 8, background: theme.surface }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
                      <div style={{ fontSize: 10, color: theme.textDim }}>{l}</div>
                    </div>
                  ))}
                </div>

                {project.budget > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.textDim, marginBottom: 4 }}>
                      <span>Presupuesto</span><span>${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: theme.surface, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (project.spent/project.budget)*100)}%`, background: project.color, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Miembros</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {memberUsers.map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: theme.surface, border: `1px solid ${theme.border}` }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{m.avatar}</div>
                        <span style={{ fontSize: 12 }}>{m.name.split(" ")[0]}</span>
                        <button onClick={() => onRemoveProjectMember(project.id, m.id)} style={{ width: 14, height: 14, borderRadius: "50%", border: "none", background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <Icon name="close" size={10} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => { setAddMemberProjectId(isAddingMember ? null : project.id); setAddMemberEmail(""); setAddMemberError(""); }}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: `1px dashed ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  {isAddingMember && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddMember(project.id)}
                          placeholder="email del usuario registrado"
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
                        <button onClick={() => handleAddMember(project.id)} disabled={addMemberLoading}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: theme.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: addMemberLoading ? 0.7 : 1 }}>
                          {addMemberLoading ? "..." : "Agregar"}
                        </button>
                      </div>
                      {addMemberError && <div style={{ fontSize: 12, color: theme.danger, marginTop: 6 }}>{addMemberError}</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {projects.length === 0 && <div style={{ color: theme.textDim, fontSize: 14 }}>No hay proyectos. Crea el primero.</div>}
        </div>
      )}

    </div>

      {/* ── Modal: Nuevo Proyecto ── */}
      {showNewProject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNewProject(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div className="scale-in" onClick={e => e.stopPropagation()} style={{ width: 440, maxHeight: "90vh", overflowY: "auto", background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 24, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nuevo Proyecto</h3>
              <button onClick={() => setShowNewProject(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: theme.surface, color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre *</label>
                <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del proyecto"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PROJECT_COLORS.map(c => (
                    <div key={c} onClick={() => setNewProject(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: newProject.color === c ? "3px solid #fff" : "3px solid transparent", boxShadow: newProject.color === c ? `0 0 0 2px ${c}` : "none" }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descripción</label>
                <input value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder="Descripción opcional"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Presupuesto</label>
                  <input type="number" value={newProject.budget} onChange={e => setNewProject(p => ({ ...p, budget: e.target.value }))} placeholder="0"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha límite</label>
                  <input type="date" value={newProject.deadline} onChange={e => setNewProject(p => ({ ...p, deadline: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
                </div>
              </div>
              <button onClick={handleCreateProject} disabled={!newProject.name.trim()}
                style={{ padding: "12px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4, opacity: newProject.name.trim() ? 1 : 0.5 }}>
                Crear Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo Equipo ── */}
      {showNewTeam && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNewTeam(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div className="scale-in" onClick={e => e.stopPropagation()} style={{ width: 420, background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 24, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nuevo Equipo</h3>
              <button onClick={() => setShowNewTeam(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: theme.surface, color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre *</label>
                <input value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del equipo"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PROJECT_COLORS.map(c => (
                    <div key={c} onClick={() => setNewTeam(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: newTeam.color === c ? "3px solid #fff" : "3px solid transparent", boxShadow: newTeam.color === c ? `0 0 0 2px ${c}` : "none" }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descripción</label>
                <input value={newTeam.description} onChange={e => setNewTeam(p => ({ ...p, description: e.target.value }))} placeholder="Descripción opcional"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
              </div>
              <button onClick={handleCreateTeam} disabled={!newTeam.name.trim() || newTeamLoading}
                style={{ padding: "12px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4, opacity: newTeam.name.trim() && !newTeamLoading ? 1 : 0.5 }}>
                {newTeamLoading ? "Creando..." : "Crear Equipo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminar miembro ── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setConfirmDelete(null)} />
          <div className="scale-in" style={{ width: 360, background: theme.bgCard, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 24, position: "relative", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Eliminar miembro?</h3>
            <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 20 }}>Se eliminará a <strong>{confirmDelete.name}</strong> permanentemente del sistema.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancelar</button>
              <button onClick={() => { onDeleteMember(confirmDelete.id); setConfirmDelete(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: theme.danger, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TASK DETAIL MODAL ─────────────────────────────────────
function TaskDetailModal({ task, theme, onClose, onUpdate, onDelete, projects, team }) {
  const [activeTab, setActiveTab] = useState("detail");
  const [commentText, setCommentText] = useState("");
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(task.title);

  useEffect(() => { setTitle(task.title); setActiveTab("detail"); }, [task]);

  const project = projects.find(p => p.name === task.project);
  const days = daysUntil(task.dueDate);
  const isOverdue = days !== null && days < 0 && task.status !== "done";

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment = { id: genId(), user: 1, text: commentText, time: new Date().toISOString() };
    onUpdate(task.id, { comments: [...task.comments, newComment] });
    setCommentText("");
  };

  const toggleSubtask = (stId) => {
    const updated = task.subtasks.map(s => s.id === stId ? { ...s, done: !s.done } : s);
    const checklist = updated.length ? Math.round((updated.filter(s => s.done).length / updated.length) * 100) : 0;
    onUpdate(task.id, { subtasks: updated, checklist });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div className="slide-in" onClick={e => e.stopPropagation()}
        style={{ width: 520, maxWidth: "100%", height: "100%", background: theme.bgCard, borderLeft: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {project && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: project.color + "20", color: project.color, fontWeight: 500 }}>{project.name}</span>}
            <span style={{ fontSize: 11, color: theme.textDim }}>#{task.id}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onDelete(task.id)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={14} /></button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={16} /></button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* Title */}
          {editTitle ? (
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onBlur={() => { onUpdate(task.id, { title }); setEditTitle(false); }}
              onKeyDown={e => { if (e.key === "Enter") { onUpdate(task.id, { title }); setEditTitle(false); } }}
              style={{ width: "100%", fontSize: 20, fontWeight: 700, background: "transparent", border: `1px solid ${theme.accent}`, borderRadius: 8, padding: "6px 10px", color: theme.text, outline: "none" }} />
          ) : (
            <h2 onClick={() => setEditTitle(true)} style={{ fontSize: 20, fontWeight: 700, cursor: "pointer", marginBottom: 4, letterSpacing: "-0.02em" }}>{task.title}</h2>
          )}
          <p style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.6, marginBottom: 20 }}>{task.desc}</p>

          {/* Meta Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ padding: 12, borderRadius: 10, background: theme.surface }}>
              <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado</div>
              <select value={task.status} onChange={e => onUpdate(task.id, { status: e.target.value })}
                style={{ width: "100%", background: "transparent", border: "none", color: STATUS_COLORS[task.status], fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k} style={{ color: "#000" }}>{v}</option>)}
              </select>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: theme.surface }}>
              <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prioridad</div>
              <select value={task.priority} onChange={e => onUpdate(task.id, { priority: e.target.value })}
                style={{ width: "100%", background: "transparent", border: "none", color: PRIORITIES[task.priority].color, fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k} style={{ color: "#000" }}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: theme.surface }}>
              <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Asignado a</div>
              <select value={task.assignee || ""} onChange={e => onUpdate(task.id, { assignee: e.target.value || null })}
                style={{ width: "100%", background: "transparent", border: "none", color: theme.text, fontSize: 13, fontWeight: 500, cursor: "pointer", outline: "none" }}>
                <option value="">Sin asignar</option>
                {(team || TEAM).map(m => <option key={m.id} value={m.id} style={{ color: "#000" }}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: isOverdue ? "rgba(239,68,68,0.08)" : theme.surface }}>
              <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha límite</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? theme.danger : theme.text }}>
                {formatDate(task.dueDate)} {isOverdue ? `(Vencida)` : days !== null ? `(${days}d)` : ""}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Etiquetas</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {task.tags.map(tag => <span key={tag} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: theme.accentGlow, color: theme.accent, fontWeight: 500 }}>{tag}</span>)}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${theme.border}`, paddingBottom: 1 }}>
            {[{ id: "detail", label: "Subtareas" }, { id: "comments", label: `Chat (${task.comments.length})` }, { id: "activity", label: "Actividad" }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ padding: "8px 14px", border: "none", background: "transparent", color: activeTab === tab.id ? theme.accent : theme.textMuted, fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${theme.accent}` : "2px solid transparent", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subtasks Tab */}
          {activeTab === "detail" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.length > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textDim, marginBottom: 4 }}>
                    <span>Progreso</span><span>{task.subtasks.filter(s => s.done).length}/{task.subtasks.length}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: theme.surface, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${task.checklist}%`, borderRadius: 3, background: task.checklist === 100 ? theme.success : theme.accent, transition: "width 0.3s" }} />
                  </div>
                  {task.subtasks.map(st => (
                    <div key={st.id} onClick={() => toggleSubtask(st.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: theme.surface, transition: "background 0.15s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: st.done ? "none" : `2px solid ${theme.borderLight}`, background: st.done ? theme.success : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                        {st.done && <Icon name="check" size={12} />}
                      </div>
                      <span style={{ fontSize: 13, textDecoration: st.done ? "line-through" : "none", color: st.done ? theme.textDim : theme.text }}>{st.text}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: theme.textDim, fontSize: 13 }}>Sin subtareas definidas</div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {task.comments.map(c => {
                const user = getUser(c.user);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: user?.color || theme.textDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{user?.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</span>
                        <span style={{ fontSize: 10, color: theme.textDim }}>{new Date(c.time).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.5, padding: "8px 12px", borderRadius: 10, background: theme.surface }}>{c.text}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Escribe un comentario..."
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none" }} />
                <button onClick={addComment} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="send" size={16} /></button>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, marginTop: 6, flexShrink: 0 }} />
                <div><div style={{ fontSize: 12, fontWeight: 500 }}>Tarea creada</div><div style={{ fontSize: 11, color: theme.textDim }}>{formatDate(task.created)}</div></div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[task.status], marginTop: 6, flexShrink: 0 }} />
                <div><div style={{ fontSize: 12, fontWeight: 500 }}>Estado: {STATUSES[task.status]}</div><div style={{ fontSize: 11, color: theme.textDim }}>{task.hoursLogged}h registradas</div></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NEW TASK MODAL ────────────────────────────────────────
function NewTaskModal({ theme, onClose, onAdd, projects, team }) {
  const [form, setForm] = useState({ title: "", desc: "", status: "todo", priority: "medium", project: "", assignee: null, tags: [], dueDate: "", subtasks: [], checklist: 0 });
  const [subtaskText, setSubtaskText] = useState("");

  const addSubtask = () => {
    if (!subtaskText.trim()) return;
    setForm(f => ({ ...f, subtasks: [...f.subtasks, { id: genId(), text: subtaskText, done: false }] }));
    setSubtaskText("");
  };

  const toggleTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd(form);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div className="scale-in" onClick={e => e.stopPropagation()}
        style={{ width: 540, maxHeight: "85vh", background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, overflow: "auto", position: "relative" }}>

        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: theme.bgCard, zIndex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nueva Tarea</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: theme.surface, color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={16} /></button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Título *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre de la tarea"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 14, outline: "none" }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descripción</label>
            <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Descripción detallada..." rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none", resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Proyecto</label>
              <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Asignar a</label>
              <select value={form.assignee || ""} onChange={e => setForm(f => ({ ...f, assignee: e.target.value || null }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="">Sin asignar</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha límite</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, outline: "none", cursor: "pointer" }} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Etiquetas</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", fontWeight: 500,
                  background: form.tags.includes(tag) ? theme.accentGlow : theme.surface,
                  color: form.tags.includes(tag) ? theme.accent : theme.textMuted,
                  border: `1px solid ${form.tags.includes(tag) ? theme.accent + "40" : theme.border}`,
                }}>{tag}</button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subtareas</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={subtaskText} onChange={e => setSubtaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubtask()} placeholder="Añadir subtarea..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 12, outline: "none" }} />
              <button onClick={addSubtask} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: theme.accent, color: "#fff", fontSize: 12, cursor: "pointer" }}>Añadir</button>
            </div>
            {form.subtasks.map(st => (
              <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: theme.surface, marginBottom: 4, fontSize: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${theme.borderLight}` }} />
                <span>{st.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: theme.bgCard }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textMuted, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: theme.gradient, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 12px rgba(99,102,241,0.3)" }}>Crear Tarea</button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS PANEL ───────────────────────────────────
function NotificationsPanel({ theme, onClose, tasks }) {
  const overdue = tasks.filter(t => daysUntil(t.dueDate) < 0 && t.status !== "done");
  const upcoming = tasks.filter(t => { const d = daysUntil(t.dueDate); return d !== null && d >= 0 && d <= 3 && t.status !== "done"; });

  const notifications = [
    ...overdue.map(t => ({ type: "danger", icon: "clock", text: `"${t.title}" está vencida`, time: "Ahora" })),
    ...upcoming.map(t => ({ type: "warning", icon: "bell", text: `"${t.title}" vence en ${daysUntil(t.dueDate)} día(s)`, time: "Próximamente" })),
    { type: "info", icon: "chat", text: "María comentó en 'Dashboard de analítica'", time: "Hace 2h" },
    { type: "info", icon: "check", text: "Carlos completó 'Optimizar queries'", time: "Hace 5h" },
  ];

  return (
    <div style={{ position: "fixed", top: 64, right: 80, zIndex: 50, width: 360, maxHeight: 420, borderRadius: 14, background: theme.bgCard, border: `1px solid ${theme.border}`, boxShadow: theme.shadowLg, overflow: "auto" }} className="scale-in">
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Notificaciones</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textDim, cursor: "pointer" }}><Icon name="close" size={14} /></button>
      </div>
      <div style={{ padding: 8 }}>
        {notifications.map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "10px 10px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surface}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: n.type === "danger" ? "rgba(239,68,68,0.12)" : n.type === "warning" ? "rgba(245,158,11,0.12)" : theme.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: n.type === "danger" ? theme.danger : n.type === "warning" ? theme.warning : theme.accent }}>
              <Icon name={n.icon} size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.text}</div>
              <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Auth Gate ─────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f172a", color: "#94a3b8", fontSize: 15, gap: 12 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        Cargando...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return showRegister
      ? <Register onSwitch={() => setShowRegister(false)} />
      : <Login onSwitch={() => setShowRegister(true)} />;
  }

  return <TaskMasterPro />;
}
