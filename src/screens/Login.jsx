import { useState } from 'react';
import { api, login } from '../api/client.js';
import logo from '../assets/logo.webp';

export default function Login({ onLogin }) {
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const j = await login(f.identifier, f.password);
    if (!j.success) return setError(j.error.message);
    try { await api('/admin/overview'); } catch { return setError('This account is not an admin'); } // 403 → logout()
    onLogin();
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <img src={logo} alt="Skylyf" />
        <h1>Admin sign in</h1>
        <label>Email <input name="identifier" type="email" required autoComplete="username" /></label>
        <label>Password <input name="password" type="password" required autoComplete="current-password" /></label>
        <p className="err">{error}</p>
        <button>Sign in</button>
      </form>
    </div>
  );
}
