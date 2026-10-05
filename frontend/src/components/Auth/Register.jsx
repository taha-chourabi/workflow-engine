import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiAlertCircle, FiBriefcase, FiChevronDown, FiInfo } from 'react-icons/fi';
import AuthShell from './AuthShell';

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

  return (
    <AuthShell
      title="Créer votre compte"
      footer={
        <>
          Déjà un compte ?{' '}
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
            Se connecter
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </>
      }
    >
      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700 animate-scale-in dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <FiCheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>Inscription réussie ! Redirection...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700 animate-scale-in dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
          <div className="relative">
            <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="ui-input h-11 pl-10"
              placeholder="Prénom Nom"
              required
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse e-mail</label>
          <div className="relative">
            <FiMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="ui-input h-11 pl-10"
              placeholder="votre@email.com"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Password Field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="ui-input h-11 pl-10 pr-11"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Department Field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Département</label>
            <div className="relative">
              <FiBriefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="ui-input h-11 appearance-none pl-10 pr-9"
                required
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-brand-50/70 p-3 text-xs leading-relaxed text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>Après inscription, l’administrateur attribue votre rôle et votre niveau hiérarchique, puis active votre compte.</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || success}
          className="ui-btn ui-btn-primary h-11 w-full text-base"
        >
          {isLoading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Inscription...
            </>
          ) : success ? (
            <>
              <FiCheckCircle className="h-5 w-5" />
              Inscription réussie !
            </>
          ) : (
            <>
              S'inscrire
              <FiArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
