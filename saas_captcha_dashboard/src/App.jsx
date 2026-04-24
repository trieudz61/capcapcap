import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    Key,
    History,
    CreditCard,
    Activity,
    Copy,
    CheckCircle2,
    Zap,
    TrendingUp,
    ShieldCheck,
    RefreshCw,
    LayoutDashboard,
    Settings,
    LogOut,
    ChevronRight,
    ExternalLink,
    Globe,
    ShieldAlert,
    Loader2,
    Book,
    Moon,
    Sun,
    Languages,
    Sparkles,
    DollarSign,
    MessageCircle,
    Menu,
    X
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import AdminPanel from './components/AdminPanel.jsx';
import logo from './assets/logo.png';
import logoLight from './assets/logo_light.png';
import Auth from './components/Auth.jsx';
import ApiDocs from './components/ApiDocs.jsx';
import ApiKeysPage from './components/ApiKeysPage.jsx';
import UsageLogsPage from './components/UsageLogsPage.jsx';
import BillingPage from './components/BillingPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import LandingPage from './components/LandingPage.jsx';
import TrialPage from './components/TrialPage.jsx';
import PricingPage from './components/PricingPage.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import api from './utils/api.js';

const App = () => {
    const { theme, setTheme, language, setLanguage, t, isDark } = useTheme();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminView, setIsAdminView] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [showDocs, setShowDocs] = useState(false);
    const [notification, setNotification] = useState('');

    useEffect(() => {
        // Fetch public notification
        api.get('/api/notification').then(res => {
            let raw = res.data.notification;
            try {
                let parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setNotification(parsed.join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'));
                } else {
                    setNotification(raw);
                }
            } catch (e) {
                setNotification(raw);
            }
        });
    }, []);

    // Real data states
    const [stats, setStats] = useState({
        balance: 0,
        totalSolves: 0,
        totalSpent: 0,
        successRate: 100,
        weeklyActivity: []
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [regeneratingKey, setRegeneratingKey] = useState(false);
    const [solverHealth, setSolverHealth] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
            // Fetch stats after auth
            fetchUserData();
        } catch (err) {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserData = useCallback(async () => {
        try {
            const [statsRes, logsRes, meRes] = await Promise.all([
                api.get('/user/stats'),
                api.get('/user/logs?limit=5'),
                api.get('/auth/me')
            ]);
            setStats(statsRes.data.stats);
            setRecentLogs(logsRes.data.logs);
            if (meRes.data.user) setUser(meRes.data.user);
        } catch (err) {
            console.error('Failed to fetch user data:', err);
        }
    }, []);

    // Poll solver health every 30s
    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await api.get('/health');
                setSolverHealth(res.data);
            } catch (e) { setSolverHealth(null); }
        };
        if (user) {
            fetchHealth();
            const iv = setInterval(fetchHealth, 30000);
            return () => clearInterval(iv);
        }
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAdminView(false);
    };

    const copyToClipboard = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerateKey = async () => {
        if (!confirm('Are you sure you want to regenerate your API key? Your old key will stop working immediately.')) return;

        setRegeneratingKey(true);
        try {
            const { data } = await api.post('/user/regenerate-key');
            setUser(prev => ({ ...prev, api_key: data.apiKey }));
        } catch (err) {
            alert('Failed to regenerate key. Please try again.');
        } finally {
            setRegeneratingKey(false);
        }
    };

    // Format number with K/M suffix
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    };

    // Format chart data (last 7 days)
    const chartData = stats.weeklyActivity.length > 0
        ? stats.weeklyActivity.map(day => ({
            name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
            solves: day.solves,
            spent: day.spent
        }))
        : [
            { name: 'Mon', solves: 0 }, { name: 'Tue', solves: 0 }, { name: 'Wed', solves: 0 },
            { name: 'Thu', solves: 0 }, { name: 'Fri', solves: 0 }, { name: 'Sat', solves: 0 }, { name: 'Sun', solves: 0 }
        ];

    if (loading) {
        return <div className="min-h-screen bg-[#030712] flex items-center justify-center text-sky-400 font-bold"><Loader2 className="animate-spin mr-2" /> Loading system...</div>;
    }

    if (!user) {
        if (showAuth) {
            return <Auth
                onLoginSuccess={async (userData) => {
                    // Fetch full user data including api_key
                    try {
                        const { data } = await api.get('/auth/me');
                        setUser(data.user);
                        fetchUserData();
                    } catch (err) {
                        setUser(userData); // Fallback to login response
                    }
                    setShowAuth(false);
                }}
                onBack={() => setShowAuth(false)}
                initialMode={authMode}
            />;
        }
        return <LandingPage
            onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
            onRegister={() => { setAuthMode('register'); setShowAuth(true); }}
        />;
    }

    if (isAdminView) {
        return (
            <div className="min-h-screen bg-[#030712] text-slate-200 font-sans p-10">
                <AdminPanel onBack={() => setIsAdminView(false)} />
            </div>
        );
    }



    return (
        <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-[#030712] text-slate-200' : 'bg-gradient-to-br from-slate-50 to-slate-200 text-slate-800 light-theme'} font-sans selection:bg-sky-500/30`}>
            {/* Mobile Header */}
            <header className={`lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-[#030712]/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-xl`}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('Overview'); setIsMobileMenuOpen(false); }}>
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img
                            src={isDark ? logo : logoLight}
                            alt="Recap1s Icon"
                            className={`w-full h-full object-contain ${isDark ? 'mix-blend-screen' : 'mix-blend-multiply'}`}
                        />
                    </div>
                    <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Recap<span className="text-sky-500">1s</span>
                    </span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`p-2 rounded-lg ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`lg:hidden fixed inset-0 z-50 flex flex-col p-6 overflow-y-auto ${isDark ? 'bg-[#030712]' : 'bg-white'}`}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('Overview'); setIsMobileMenuOpen(false); }}>
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img
                                        src={isDark ? logo : logoLight}
                                        alt="Recap1s Icon"
                                        className={`w-full h-full object-contain ${isDark ? 'mix-blend-screen' : 'mix-blend-multiply'}`}
                                    />
                                </div>
                                <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Recap<span className="text-sky-500">1s</span>
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`p-2 rounded-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <nav className="space-y-1">
                            <NavItem icon={<LayoutDashboard size={20} />} label={t('overview')} active={activeTab === 'Overview'} onClick={() => { setActiveTab('Overview'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<Sparkles size={20} className="text-sky-400" />} label={t('trial')} active={activeTab === 'Trial'} onClick={() => { setActiveTab('Trial'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<Key size={20} />} label={t('apiKeys')} active={activeTab === 'API Keys'} onClick={() => { setActiveTab('API Keys'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<History size={20} />} label={t('usageLogs')} active={activeTab === 'Usage Logs'} onClick={() => { setActiveTab('Usage Logs'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<CreditCard size={20} />} label={t('billing')} active={activeTab === 'Billing'} onClick={() => { setActiveTab('Billing'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<DollarSign size={20} />} label={t('pricing')} active={activeTab === 'Pricing'} onClick={() => { setActiveTab('Pricing'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<Book size={20} />} label={t('apiDocs')} active={activeTab === 'API Docs'} onClick={() => { setActiveTab('API Docs'); setIsMobileMenuOpen(false); }} />
                            <NavItem icon={<Settings size={20} />} label={t('settings')} active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsMobileMenuOpen(false); }} />
                        </nav>

                        <div className="mt-auto pt-8 border-t border-slate-800/50 space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                                >
                                    {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-sky-400" />}
                                    {isDark ? 'Light' : 'Dark'}
                                </button>
                                <button
                                    onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                                >
                                    <Languages size={18} className="text-sky-400" />
                                    {language === 'vi' ? 'EN' : 'VI'}
                                </button>
                            </div>
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="text-xs text-slate-500 font-bold uppercase mb-2">Số dư</div>
                                <div className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>${Number(user.balance || 0).toFixed(2)}</div>
                                <button
                                    onClick={() => { setActiveTab('Billing'); setIsMobileMenuOpen(false); }}
                                    className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/20"
                                >
                                    Nạp tiền
                                </button>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3 py-4 text-rose-500 font-bold"
                            >
                                <LogOut size={20} /> {t('logout')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <aside className={`w-60 xl:w-64 hidden lg:flex flex-col h-full shrink-0 border-r ${isDark ? 'border-slate-800/50 bg-[#030712]' : 'border-slate-200 bg-white'}`}>
                {/* Logo - compact */}
                <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 cursor-pointer group" onClick={() => setActiveTab('Overview')}>
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                        <img
                            src={isDark ? logo : logoLight}
                            alt="Recap1s"
                            className={`w-full h-full object-contain transition-transform group-hover:scale-110 ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'mix-blend-multiply'}`}
                        />
                    </div>
                    <span className={`text-lg font-extrabold tracking-tight ${isDark ? 'bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-sky-400' : 'text-slate-900'}`}>
                        Recap<span className="text-sky-500">1s</span>
                    </span>
                </div>

                {/* Navigation - compact */}
                <nav className="flex-1 px-3 space-y-0.5">
                    <NavItem icon={<LayoutDashboard size={18} />} label={t('overview')} active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                    <NavItem icon={<Sparkles size={18} className="text-sky-400" />} label={t('trial')} active={activeTab === 'Trial'} onClick={() => setActiveTab('Trial')} />
                    <NavItem icon={<Key size={18} />} label={t('apiKeys')} active={activeTab === 'API Keys'} onClick={() => setActiveTab('API Keys')} />
                    <NavItem icon={<History size={18} />} label={t('usageLogs')} active={activeTab === 'Usage Logs'} onClick={() => setActiveTab('Usage Logs')} />
                    <NavItem icon={<CreditCard size={18} />} label={t('billing')} active={activeTab === 'Billing'} onClick={() => setActiveTab('Billing')} />
                    <NavItem icon={<DollarSign size={18} />} label={t('pricing')} active={activeTab === 'Pricing'} onClick={() => setActiveTab('Pricing')} />
                    <NavItem icon={<Book size={18} />} label={t('apiDocs')} active={activeTab === 'API Docs'} onClick={() => setActiveTab('API Docs')} />
                    <NavItem icon={<Settings size={18} />} label={t('settings')} active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />

                    {user.role === 'admin' && (
                        <div className="pt-3 mt-3 border-t border-slate-800/50">
                            <button
                                onClick={() => setIsAdminView(true)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark
                                    ? 'text-amber-400 bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10'
                                    : 'text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                                }`}
                            >
                                <ShieldAlert size={18} /> {t('adminConsole')}
                            </button>
                        </div>
                    )}
                </nav>

                {/* Bottom section - compact */}
                <div className="px-3 pb-4 space-y-2">
                    {/* Theme & Language toggles */}
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
                        >
                            {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-sky-400" />}
                            {isDark ? 'Light' : 'Dark'}
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                            <Languages size={14} className="text-sky-400" />
                            {language === 'vi' ? 'EN' : 'VI'}
                        </button>
                    </div>

                    {/* Balance card - compact */}
                    <div className={`p-3.5 rounded-xl border transition-all group ${isDark
                        ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-sky-500/30'
                        : 'bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:border-sky-300'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('balance') || 'Số dư'}</span>
                            <CreditCard className={`w-3.5 h-3.5 transition-colors ${isDark ? 'text-slate-600 group-hover:text-sky-400' : 'text-slate-400 group-hover:text-sky-500'}`} />
                        </div>
                        <div className={`text-2xl font-black tracking-tight mb-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ${Number(user.balance || 0).toFixed(2)}
                        </div>
                        <button
                            onClick={() => setActiveTab('Billing')}
                            className={`w-full py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${isDark
                                ? 'bg-white hover:bg-slate-200 text-black shadow-lg hover:shadow-white/10'
                                : 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                            }`}
                        >
                            {t('depositCredits')}
                        </button>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/5' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                        <LogOut size={15} /> {t('logout')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full transition-all ${isMobileMenuOpen ? 'blur-sm' : ''} pt-20 lg:pt-10 ${isDark ? '' : 'bg-transparent'}`}>
                {activeTab === 'API Keys' && (
                    <ApiKeysPage
                        user={user}
                        onKeyUpdate={(newKey) => setUser(prev => ({ ...prev, api_key: newKey }))}
                    />
                )}

                {activeTab === 'Usage Logs' && <UsageLogsPage />}

                {activeTab === 'Billing' && <BillingPage user={user} stats={stats} onBalanceUpdate={fetchUserData} />}

                {activeTab === 'Settings' && <SettingsPage user={user} onUserUpdate={setUser} />}

                {activeTab === 'API Docs' && <ApiDocs user={user} onBack={() => setActiveTab('Overview')} />}

                {activeTab === 'Pricing' && <PricingPage />}

                {activeTab === 'Trial' && <TrialPage user={user} onUserUpdate={fetchUserData} />}

                {activeTab === 'Overview' && (
                    <>
                        <header className="flex flex-col gap-6 mb-12">
                            {/* System Notification Marquee */}
                            <div className={`w-full border-y py-2 relative overflow-hidden backdrop-blur-sm ${isDark
                                ? 'bg-gradient-to-r from-sky-900/20 via-indigo-900/20 to-sky-900/20 border-sky-500/10'
                                : 'bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 border-sky-200'
                            }`}>
                                <div className={`absolute top-0 left-0 bottom-0 w-20 bg-gradient-to-r z-10 ${isDark ? 'from-[#030712] to-transparent' : 'from-white to-transparent'}`}></div>
                                <div className={`absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l z-10 ${isDark ? 'from-[#030712] to-transparent' : 'from-white to-transparent'}`}></div>
                                <div className={`animate-marquee whitespace-nowrap flex items-center gap-16 text-sm font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                                    <span className="inline-block">{notification}</span>
                                    <span className={`mx-4 ${isDark ? 'text-sky-700' : 'text-sky-300'}`}>•</span>
                                    <span className="inline-block">{notification}</span>
                                    <span className={`mx-4 ${isDark ? 'text-sky-700' : 'text-sky-300'}`}>•</span>
                                    <span className="inline-block">{notification}</span>
                                    <span className={`mx-4 ${isDark ? 'text-sky-700' : 'text-sky-300'}`}>•</span>
                                    <span className="inline-block">{notification}</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-2 tracking-tight text-white">{t('dashboard')}</h2>
                                    <div className="flex items-center gap-4 text-slate-500 text-sm">
                                        <span className="flex items-center gap-1.5"><Globe size={14} /> {t('globalRegion')}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                        <span>{t('welcome')}, {user.fullName || user.username}</span>
                                    </div>
                                </motion.div>

                                <div className="flex items-center gap-3">
                                    <StatusBadge icon={<Activity size={14} />} label={t('apiStatusOnline')} color="emerald" />
                                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 cursor-pointer hover:bg-slate-700 transition-all uppercase">
                                        {(user.fullName || user.username)[0]}
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Stats Grid - Real Data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
                            <StatCard
                                title={t('totalSolves')}
                                value={formatNumber(stats.totalSolves)}
                                trend={stats.totalSolves > 0 ? '+' + formatNumber(stats.totalSolves) : '0'}
                                sub={t('allTime')}
                                icon={<Zap className="text-sky-400" />}
                            />
                            <StatCard
                                title={t('totalSpent')}
                                value={`$${Number(stats.totalSpent || 0).toFixed(4)}`}
                                trend={stats.totalSpent > 0 ? '-' + Number(stats.totalSpent).toFixed(2) : '$0'}
                                sub={t('creditsUsed')}
                                icon={<TrendingUp className="text-emerald-400" />}
                            />
                            <StatCard
                                title={t('successRate')}
                                value={`${Number(stats.successRate || 100).toFixed(1)}%`}
                                trend={stats.successRate >= 99 ? '+High' : 'Normal'}
                                sub={t('taskCompletion')}
                                icon={<ShieldCheck className="text-indigo-400" />}
                            />
                            <StatCard
                                title={t('accountBalance')}
                                value={`$${Number(user.balance || 0).toFixed(2)}`}
                                trend={user.balance > 0 ? 'Active' : 'Top up'}
                                sub={t('availableCredit')}
                                icon={<Activity className="text-orange-400" />}
                            />
                        </div>

                        {/* Solver Status Banner */}
                        {solverHealth && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass p-5 flex flex-wrap items-center gap-6 mb-10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${solverHealth.turnstile?.workerReady ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className="text-sm font-black text-white">Turnstile Solver</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${solverHealth.turnstile?.workerReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {solverHealth.turnstile?.workerReady ? 'ACTIVE' : 'STANDBY'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-5 text-xs text-slate-500 font-bold">
                                    <span>Uptime: <span className="text-slate-300">{Math.floor(solverHealth.uptime / 60)}m</span></span>
                                    <span>Solved: <span className="text-sky-400">{solverHealth.turnstile?.totalSolves || 0}</span></span>
                                    <span>Success: <span className="text-emerald-400">{solverHealth.turnstile?.successSolves || 0}</span></span>
                                    {solverHealth.turnstile?.avgSolveTime > 0 && (
                                        <span>Avg: <span className="text-amber-400">{solverHealth.turnstile.avgSolveTime.toFixed(1)}s</span></span>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Main Sections */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="xl:col-span-2 glass p-4 sm:p-8 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <BarChart3 size={120} />
                                </div>

                                <div className="flex justify-between items-center mb-10 relative z-10">
                                    <div>
                                        <h3 className="font-bold text-xl text-white mb-1">{t('solvingPerformance')}</h3>
                                        <p className="text-slate-500 text-sm">{t('weeklyActivity')}</p>
                                    </div>
                                    <button onClick={fetchUserData} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all">
                                        <RefreshCw size={16} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="h-[250px] sm:h-[350px] w-full relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorSolves" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="name"
                                                stroke="#475569"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                stroke="#475569"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    background: '#0f172a',
                                                    border: '1px solid #334155',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                                }}
                                                cursor={{ stroke: '#334155', strokeWidth: 2 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="solves"
                                                stroke="#38bdf8"
                                                fillOpacity={1}
                                                fill="url(#colorSolves)"
                                                strokeWidth={4}
                                                animationDuration={2000}
                                                animationEasing="ease-in-out"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Quick Actions & Recent Logs */}
                            <div className="space-y-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="glass p-8"
                                >
                                    <h3 className="font-bold text-xl text-white mb-6 flex items-center gap-2">
                                        <Key size={20} className="text-sky-400" /> {t('apiAccess')}
                                    </h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 block">{t('mainApiToken')}</label>
                                            <div className="relative group/key">
                                                <input
                                                    type="password"
                                                    value={user.api_key || ''}
                                                    readOnly
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-sky-500/50 transition-all pr-12 truncate"
                                                />
                                                <button
                                                    onClick={copyToClipboard}
                                                    className="absolute right-2 top-1.5 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRegenerateKey}
                                                disabled={regeneratingKey}
                                                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {regeneratingKey ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('rotateKey')}
                                            </button>
                                            <button className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 transition-all">
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="glass p-8 flex-1"
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg text-white">{t('recentActivity')}</h3>
                                        <button onClick={fetchUserData} className="text-sky-400 text-xs font-bold hover:underline">{t('refresh')}</button>
                                    </div>

                                    <div className="space-y-4">
                                        {recentLogs.length > 0 ? (
                                            recentLogs.map((log, idx) => (
                                                <ActivityItem
                                                    key={idx}
                                                    type={log.task_type}
                                                    status={log.status}
                                                    cost={`-$${Number(log.cost).toFixed(4)}`}
                                                    time={new Date(log.created_at).toLocaleString()}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-slate-500 text-sm text-center py-8">{t('noActivity')}</div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Telegram Support Widget */}
            <a
                href="https://t.me/cotrimicha"
                target="_blank"
                rel="noreferrer"
                className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 rounded-full font-bold shadow-2xl transition-all transform hover:scale-105 active:scale-95 z-50 ${isDark
                    ? 'bg-sky-500 text-white shadow-sky-500/30 hover:bg-sky-400'
                    : 'bg-[#0088cc] text-white shadow-[#0088cc]/30 hover:bg-[#0077b5]'
                    }`}
            >
                <div className="relative">
                    <MessageCircle size={24} fill="currentColor" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-[#0088cc]"></span>
                    </span>
                </div>
                <span className="text-sm sm:text-base hidden sm:inline">{t('support')}</span>
            </a>
        </div>
    );
};

const NavItem = ({ icon, label, active = false, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${active
            ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/5'
            : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
    >
        <div className={`${active ? 'text-sky-400' : 'text-slate-600 group-hover:text-slate-400'} transition-colors shrink-0`}>
            {icon}
        </div>
        <span className="truncate">{label}</span>
        {active && <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] shrink-0" />}
    </button>
);

const StatCard = ({ title, value, trend, sub, icon }) => (
    <div className="glass p-5 sm:p-8 group hover:border-sky-500/30 transition-all duration-300 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 text-white">
            {React.cloneElement(icon, { size: 100 })}
        </div>
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="p-3 bg-slate-900 rounded-2xl group-hover:bg-sky-500/10 transition-colors shadow-inner">
                {icon}
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-lg ${trend.startsWith('+') || trend === 'Active' || trend === '+High' ? 'text-emerald-400 bg-emerald-500/10' : 'text-sky-400 bg-sky-500/10'
                }`}>
                {trend}
            </div>
        </div>
        <h4 className="text-slate-500 text-sm font-medium mb-1 relative z-10">{title}</h4>
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight relative z-10">{value}</div>
        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-bold relative z-10">{sub}</p>
    </div>
);

const StatusBadge = ({ icon, label, color }) => {
    const colors = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
    return (
        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-xs font-bold ${colors[color]} shadow-xl`}>
            <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 bg-emerald-500`}></span>
            </span>
            {label}
        </div>
    );
};

const ActivityItem = ({ type, cost, time, status }) => {
    const s = status?.toLowerCase();
    const statusColor = (s === 'ready' || s === 'success') ? 'bg-emerald-500' : (s === 'processing' || s === 'pending') ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div className="flex items-center justify-between group cursor-pointer p-1 rounded-lg">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_5px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-all`}></div>
                <div>
                    <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors line-clamp-1">{type}</p>
                    <p className="text-[10px] text-slate-600 font-medium">{time}</p>
                </div>
            </div>
            <div className={`text-xs font-mono font-bold ${s === 'ready' || s === 'success' ? 'text-rose-400' : 'text-slate-500'}`}>{cost}</div>
        </div>
    );
};

export default App;
