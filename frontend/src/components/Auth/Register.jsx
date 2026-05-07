import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/sotacib-logo.jpg';

const DEPARTMENT_OPTIONS = [
  'Finance',
  'Commercial',
  'Ressources Humaines',
  'Systèmes d Information',
  'Investissement',
  'Recouvrement',
  'Fiscal',
  'Direction Générale',
];

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    department: 'Finance',
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(formData);
    if (success) navigate('/login');
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
    maxWidth: '520px',
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
        <h2 style={{ fontSize: '30px', marginBottom: '24px', color: '#0f172a' }}>Inscription</h2>
        <p style={{ marginBottom: '28px', color: '#475569' }}>
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 600, color: '#334155' }}>Nom complet</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <label style={{ fontWeight: 600, color: '#334155' }}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <label style={{ fontWeight: 600, color: '#334155' }}>Mot de passe</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <label style={{ fontWeight: 600, color: '#334155' }}>Département</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            style={inputStyle}
          >
            {DEPARTMENT_OPTIONS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <button type="submit" style={buttonStyle}>
            S'inscrire
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '22px', color: '#64748b', fontSize: '14px' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;