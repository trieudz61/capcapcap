import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Mail,
    Lock,
    ArrowRight,
    UserPlus,
    LogIn,
    AlertCircle,
    CheckCircle2,
    User,
    ShieldCheck,
    ChevronLeft,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Globe
} from 'lucide-react';
import api from '../utils/api.js';
import { useTheme } from '../context/ThemeContext.jsx';
import logo from '../assets/logo.png';
import logoLight from '../assets/logo_light.png';

const Auth = ({ onLoginSuccess, onBack, initialMode = 'login' }) => {
    const { t, isDark, toggleTheme, language, toggleLanguage } = useTheme();
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        terms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Basic Validation
        if (!isLogin) {
            if (formData.password !== formData.confirmPassword) {
                setError(t('passwordsNotMatch'));
                setLoading(false);
                return;
            }
            if (!formData.terms) {
                setError(t('mustAcceptTerms'));
                setLoading(false);
                return;
            }
        }

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const payload = isLogin
                ? { username: formData.email, password: formData.password }
                : {
                    username: formData.username || formData.email,
                    password: formData.password,
                    fullName: formData.fullName
                };

            const { data } = await api.post(endpoint, payload);

            if (isLogin) {
                localStorage.setItem('token', data.token);
                onLoginSuccess(data.user);
            } else {
                setSuccess(t('accountCreated'));
                setIsLogin(true);
                setFormData(prev => ({ ...prev, email: prev.username, password: '', confirmPassword: '' }));
            }
        } catch (err) {
            setError(err.response?.data?.error || t('authFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#030712]' : 'bg-slate-100'} text-white flex items-center justify-center p-4 lg:p-8 relative overflow-hidden`}>
            {/* Cosmic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>

            {/* Theme/Language Toggle - Top Right */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                <button
                    onClick={toggleTheme}
                    className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-200 text-slate-600 shadow-md'}`}
                    title={isDark ? t('lightMode') : t('darkMode')}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                    onClick={toggleLanguage}
                    className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-200 text-slate-600 shadow-md'}`}
                >
                    {language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                </button>
            </div>

            <div className={`w-full max-w-[1000px] flex flex-col lg:flex-row ${isDark ? 'bg-[#080c17]/80' : 'bg-white/90'} backdrop-blur-xl border ${isDark ? 'border-slate-800/50' : 'border-slate-200'} rounded-[32px] overflow-hidden shadow-2xl relative z-10`}>

                {/* Visual Side Panel */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 to-indigo-950 p-12 flex-col justify-between border-r border-slate-800/50">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors mr-2"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 flex items-center justify-center">
                                <img
                                    src={logo}
                                    alt="Recap1s Icon"
                                    className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(56,189,248,0.4)] mix-blend-screen"
                                />
                            </div>
                            <span className="text-3xl font-black tracking-tight text-white">Recap<span className="text-sky-400">1s</span></span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-4xl font-extrabold leading-tight mb-6 text-white">
                            ReCaptcha <br />
                            <span className="text-sky-400">Solver 1s</span>
                        </h2>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <ShieldCheck className="text-sky-400" size={18} /> {t('enterpriseSecurity')}
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <Zap className="text-sky-400" size={18} /> {t('distributedWorker')}
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                </motion.div>
                                {t('successRateAll')}
                            </li>
                        </ul>
                    </div>

                    <div className="pt-8 border-t border-slate-800/50 flex items-center justify-between">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('joinedByDevs')}</p>
                    </div>
                </div>

                {/* Form Side Panel */}
                <div className={`w-full lg:w-1/2 p-8 lg:p-14 overflow-y-auto max-h-[90vh] ${!isDark ? 'text-slate-800' : ''}`}>
                    <div className="mb-8">
                        {/* Mobile/Light Mode Logo inside Form Panel */}
                        <div className="lg:hidden flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 flex items-center justify-center">
                                <img
                                    src={isDark ? logo : logoLight}
                                    alt="Recap1s Icon"
                                    className={`w-full h-full object-contain ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]' : 'mix-blend-multiply'}`}
                                />
                            </div>
                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Recap<span className="text-sky-500">1s</span>
                            </span>
                        </div>

                        {(!isLogin) && (
                            <button
                                onClick={() => { setIsLogin(true); setFormData(prev => ({ ...prev, email: prev.username })); }}
                                className={`flex items-center gap-2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors text-xs font-bold uppercase tracking-widest mb-6`}
                            >
                                <ChevronLeft size={14} /> {t('backToSignIn')}
                            </button>
                        )}
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                            {isLogin ? t('welcomeBack') : t('createAccount')}
                        </h1>
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-sm font-medium`}>
                            {isLogin ? t('loginDesc') : t('registerDesc')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? 'login-fields' : 'reg-fields'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                {!isLogin && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('fullName')}</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3 text-slate-500" size={16} />
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleInputChange}
                                                    placeholder="Nguyen Van A"
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('username')}</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-slate-500 text-sm font-bold">@</span>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    placeholder="username"
                                                    required={!isLogin}
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{isLogin ? t('username') : 'Email'}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3 text-slate-500" size={16} />
                                        <input
                                            type={isLogin ? 'text' : 'email'}
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder={isLogin ? 'username' : 'email@example.com'}
                                            required
                                            className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('password')}</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-3 text-slate-500" size={16} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                required
                                                className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-12 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isLogin && (
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('confirmPassword')}</label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-4 top-3 text-slate-500" size={16} />
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    required={!isLogin}
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {isLogin && (
                            <div className="flex justify-end">
                                <button type="button" className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline">{t('forgotPassword')}</button>
                            </div>
                        )}

                        {!isLogin && (
                            <div className="flex items-start gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    name="terms"
                                    checked={formData.terms}
                                    onChange={handleInputChange}
                                    className="mt-1 w-4 h-4 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                                />
                                <label htmlFor="terms" className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'} leading-normal cursor-pointer select-none`}>
                                    {t('agreeTerms')} <span className={`${isDark ? 'text-slate-300' : 'text-slate-800'} font-bold hover:underline`}>{t('termsOfService')}</span> {t('and')} <span className={`${isDark ? 'text-slate-300' : 'text-slate-800'} font-bold hover:underline`}>{t('privacyPolicy')}</span>.
                                </label>
                            </div>
                        )}

                        <div className="space-y-3 pt-4">
                            {error && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                                    <AlertCircle size={14} className="shrink-0" /> {error}
                                </motion.div>
                            )}

                            {success && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                    <CheckCircle2 size={14} className="shrink-0" /> {success}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? t('checking') : (
                                    <>
                                        {isLogin ? t('signInToConsole') : t('completeRegistration')}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-sm font-medium`}>
                            {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}{' '}
                            <button
                                onClick={() => { const goingToLogin = !isLogin; setIsLogin(goingToLogin); if (goingToLogin) setFormData(prev => ({ ...prev, email: prev.username })); setError(''); setSuccess(''); }}
                                className={`${isDark ? 'text-white hover:text-sky-400' : 'text-sky-600 hover:text-sky-500'} font-bold underline decoration-sky-500/30 underline-offset-4 transition-colors`}
                            >
                                {isLogin ? t('signUp') : t('signIn')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
