import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(formData);
    if (success) navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="text-2xl font-bold text-center mb-6">Inscription</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom complet</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Département</label>
            <select name="department" value={formData.department} onChange={handleChange} required>
              {DEPARTMENT_OPTIONS.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Le role et le niveau hierarchique sont attribues automatiquement lors de l activation par un administrateur.
          </p>
          <button type="submit" className="btn btn-primary w-full">S'inscrire</button>
        </form>
        <p className="text-center mt-4 text-sm">
          Déjà inscrit ? <Link to="/login" className="text-blue-600">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;