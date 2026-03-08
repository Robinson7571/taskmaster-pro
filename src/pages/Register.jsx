import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onSwitch }) {
  const { register } = useAuth();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/>
          </svg>
        </div>
        <h1 style={styles.title}>Crear cuenta</h1>
        <p style={styles.subtitle}>Únete a TaskMaster Pro gratis</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nombre completo</label>
            <input
              name="name" type="text" required autoFocus
              value={form.name} onChange={handle}
              placeholder="Robinson Anaya"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              name="email" type="email" required
              value={form.email} onChange={handle}
              placeholder="tu@email.com"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              name="password" type="password" required
              value={form.password} onChange={handle}
              placeholder="Mínimo 6 caracteres"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirmar contraseña</label>
            <input
              name="confirm" type="password" required
              value={form.confirm} onChange={handle}
              placeholder="Repite tu contraseña"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={styles.switch}>
          ¿Ya tienes cuenta?{' '}
          <span onClick={onSwitch} style={styles.link}>Inicia sesión</span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f172a', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 400, background: '#1e293b',
    borderRadius: 16, padding: '40px 36px',
    border: '1px solid #334155',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logo: {
    width: 52, height: 52, borderRadius: 14,
    background: 'rgba(99,102,241,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: '#94a3b8', margin: '0 0 28px' },
  error: {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', fontSize: 13, marginBottom: 16, textAlign: 'center',
  },
  form: { width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#cbd5e1' },
  input: {
    padding: '10px 14px', borderRadius: 8, fontSize: 14, outline: 'none',
    background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
    transition: 'border-color 0.15s',
  },
  btn: {
    marginTop: 4, padding: '12px', borderRadius: 8, border: 'none',
    background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'opacity 0.15s',
  },
  switch: { marginTop: 24, fontSize: 13, color: '#94a3b8' },
  link: { color: '#818cf8', cursor: 'pointer', fontWeight: 500 },
};
