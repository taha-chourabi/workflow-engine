import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/sotacib-logo.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/');
  };

  const pageStyle = {
    minHeight: '100vh',
    padding: '32px',
    background: 'radial-gradient(circle at top left, rgba(59,130,246,0.2), transparent 25%), linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    color: '#0f172a',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '480px',
    background: 'rgba(255,255,255,0.98)',
    borderRadius: '28px',
    boxShadow: '0 24px 60px rgba(15,23,42,0.16)',
    padding: '40px 36px',
    position: 'relative',
    zIndex: 1,
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    marginTop: '8px',
    marginBottom: '18px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    fontSize: '15px',
    color: '#0f172a',
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const logoContainer = {
    position: 'absolute',
    top: '24px',
    left: '24px',
  };

  return (
    <div style={pageStyle}>
      <div style={logoContainer}>
        <img src={logo} alt="SOTACIB" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '30px', marginBottom: '24px', color: '#0f172a' }}>Connexion</h2>
        <p style={{ marginBottom: '28px', color: '#475569' }}>
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 600, color: '#334155' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <label style={{ fontWeight: 600, color: '#334155' }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Se connecter
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '22px', color: '#64748b', fontSize: '14px' }}>
          Pas de compte ?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;