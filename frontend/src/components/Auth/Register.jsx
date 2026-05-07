import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiShield, FiActivity, FiTrendingUp, FiArrowRight, FiCheckCircle, FiAlertCircle, FiUsers, FiBriefcase } from 'react-icons/fi';
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const success = await register(formData);
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Une erreur est survenue lors de l\'inscription');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 z-10">
        <img src={logo} alt="SOTACIB" className="w-40 h-40 object-contain opacity-95 shadow-2xl rounded-2xl bg-white/10 backdrop-blur-sm p-3 transform hover:scale-105 transition-transform duration-300" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FiUsers className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Créer votre compte</h1>
            <p className="text-blue-200 text-lg">Rejoignez notre plateforme</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
              <FiCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-200 text-sm">Inscription réussie ! Redirection...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label className="block text-white font-medium mb-2 flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                Nom complet
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Nom Complet"
                  required
                />
                <FiUser className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white font-medium mb-2 flex items-center gap-2">
                <FiMail className="w-4 h-4" />
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="votre@email.com"
                  required
                />
                <FiMail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white font-medium mb-2 flex items-center gap-2">
                <FiLock className="w-4 h-4" />
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Department Field */}
            <div>
              <label className="block text-white font-medium mb-2 flex items-center gap-2">
                <FiBriefcase className="w-4 h-4" />
                Département
              </label>
              <div className="relative">
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none pr-12"
                  required
                >
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-800 text-white">
                      {dept}
                    </option>
                  ))}
                </select>
                <FiBriefcase className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Inscription...
                </>
              ) : success ? (
                <>
                  <FiCheckCircle className="w-5 h-5" />
                  Inscription réussie !
                </>
              ) : (
                <>
                  S'inscrire
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-blue-200">
              Déjà un compte ?{' '}
              <Link
                to="/login"
                className="text-white font-semibold hover:text-blue-300 transition-colors inline-flex items-center gap-1"
              >
                Connectez-vous
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 text-blue-300 text-sm">
              <FiShield className="w-4 h-4" />
              <span>Inscription sécurisée</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/20">
            <FiUsers className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">500+</div>
            <div className="text-xs text-blue-300">Utilisateurs</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/20">
            <FiBriefcase className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">9</div>
            <div className="text-xs text-blue-300">Départements</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/20">
            <FiTrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">98%</div>
            <div className="text-xs text-blue-300">Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;