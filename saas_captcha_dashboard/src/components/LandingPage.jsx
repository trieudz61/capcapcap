import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Shield,
    Clock,
    Code2,
    CheckCircle2,
    ArrowRight,
    Globe,
    Cpu,
    TrendingUp,
    Star,
    Users,
    Timer,
    DollarSign,
    Sun,
    Moon,
    Menu,
    X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import logo from '../assets/logo.png';
import logoLight from '../assets/logo_light.png';

const LandingPage = ({ onLogin, onRegister }) => {
    const { t, isDark, toggleTheme, language, toggleLanguage } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [pricing, setPricing] = useState([
        { id: 1, name: 'ReCaptcha V2', price: 0.001, unit: 'solve', description: 'Google reCaptcha v2 checkbox', speed: '1-3s' },
        { id: 2, name: 'ReCaptcha V3', price: 0.002, unit: 'solve', description: 'Google reCaptcha v3 invisible', speed: '1-2s' }
    ]);

    useEffect(() => {
        fetch('http://127.0.0.1:5050/api/pricing') // Correct port
            .then(res => res.json())
            .then(data => {
                if (data.pricing && data.pricing.length > 0) {
                    setPricing(data.pricing);
                }
            })
            .catch(err => console.error('Failed to fetch pricing:', err));
    }, []);

    const features = [
        { icon: <Timer size={28} />, title: 'Siêu tốc 1 giây', desc: 'Giải ReCaptcha nhanh nhất thị trường, trung bình chỉ 1-3 giây' },
        { icon: <Shield size={28} />, title: 'Độ chính xác 99.9%', desc: 'Đảm bảo tỷ lệ thành công cao nhất với công nghệ AI tiên tiến' },
        { icon: <Globe size={28} />, title: 'Hỗ trợ ReCaptcha V2/V3', desc: 'Giải quyết mọi loại ReCaptcha của Google một cách dễ dàng' },
        { icon: <Code2 size={28} />, title: 'API dễ tích hợp', desc: 'Tài liệu chi tiết, SDK đa ngôn ngữ, hỗ trợ 24/7' },
        { icon: <DollarSign size={28} />, title: 'Giá cạnh tranh', desc: 'Chi phí thấp nhất thị trường, thanh toán linh hoạt' },
        { icon: <Cpu size={28} />, title: 'Uptime 99.99%', desc: 'Hệ thống ổn định, chạy liên tục không gián đoạn' }
    ];

    const stats = [
        { value: '1B+', label: 'Captcha đã giải' },
        { value: '< 1s', label: 'Thời gian trung bình' },
        { value: '99.9%', label: 'Tỷ lệ thành công' },
        { value: '10K+', label: 'Khách hàng tin dùng' }
    ];

    return (
        <div className={`min-h-screen overflow-x-hidden ${isDark
            ? 'bg-[#030712] text-slate-200'
            : 'bg-gradient-to-b from-white via-sky-50/30 to-indigo-50/30 text-slate-800'}`}>

            {/* Hero Section */}
            <header className="relative overflow-hidden">
                {/* Background effects */}
                {isDark ? (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sky-500/20 rounded-full blur-[120px] -translate-y-1/2"></div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-100/50 via-transparent to-indigo-100/50"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sky-400/10 rounded-full blur-[120px] -translate-y-1/2"></div>
                    </>
                )}

                <nav className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img
                                src={isDark ? logo : logoLight}
                                alt="Recap1s Icon"
                                className={`w-full h-full object-contain transition-transform group-hover:scale-110 ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]' : 'mix-blend-multiply'}`}
                            />
                        </div>
                        <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Recap<span className="text-sky-500">1s</span>
                        </h1>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl transition-all ${isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                                : 'bg-white hover:bg-slate-100 text-slate-600 shadow-md border border-slate-200'}`}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={toggleLanguage}
                            className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                                : 'bg-white hover:bg-slate-100 text-slate-600 shadow-md border border-slate-200'}`}
                        >
                            {language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                        </button>

                        <button
                            onClick={onLogin}
                            className={`px-5 py-2.5 text-sm font-semibold transition-colors ${isDark
                                ? 'text-slate-300 hover:text-white'
                                : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            {t('login')}
                        </button>
                        <button
                            onClick={onRegister}
                            className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-sky-500/30"
                        >
                            {t('register')}
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 shadow-sm border border-slate-200'}`}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm border border-slate-200'}`}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu Drawer */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`md:hidden relative z-20 border-b ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-xl overflow-hidden`}
                        >
                            <div className="px-6 py-8 flex flex-col gap-4">
                                <button
                                    onClick={toggleLanguage}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                                >
                                    Ngôn ngữ / Language
                                    <span>{language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</span>
                                </button>
                                <button
                                    onClick={() => { onLogin(); setIsMenuOpen(false); }}
                                    className={`w-full py-4 rounded-xl text-lg font-bold ${isDark ? 'text-white border border-slate-700' : 'text-slate-900 border border-slate-200 shadow-sm'}`}
                                >
                                    {t('login')}
                                </button>
                                <button
                                    onClick={() => { onRegister(); setIsMenuOpen(false); }}
                                    className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-sky-500/20"
                                >
                                    {t('register')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 ${isDark
                            ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                            : 'bg-sky-100 border border-sky-200 text-sky-600'}`}>
                            <Zap size={16} className={isDark ? 'fill-sky-400' : 'fill-sky-600'} />
                            Giải captcha siêu tốc chỉ 1 giây
                        </div>

                        <h2
                            className={`text-4xl sm:text-5xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}
                            style={{ lineHeight: 1.25 }}
                        >
                            Giải Captcha <br />
                            <span className="text-sky-500">
                                Nhanh
                            </span>
                            {' • '}
                            <span className="text-cyan-400">
                                Chính xác
                            </span>
                            {' • '}
                            <span className="text-indigo-500">
                                Rẻ
                            </span>
                        </h2>

                        <p className={`text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            API giải ReCaptcha tự động hàng đầu Việt Nam. Hỗ trợ ReCaptcha V2, V3
                            với tốc độ nhanh nhất thị trường và tỷ lệ thành công 99.9%.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={onRegister}
                                className="group px-8 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-sky-500/30 flex items-center gap-2"
                            >
                                Bắt đầu miễn phí
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                            <button
                                onClick={onLogin}
                                className={`px-8 py-4 rounded-2xl text-lg font-semibold transition-all ${isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white'
                                    : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 shadow-lg'}`}
                            >
                                Xem tài liệu API
                            </button>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Stats Section */}
            <section className={`relative py-16 ${isDark
                ? 'border-y border-slate-800/50 bg-slate-900/30'
                : 'bg-white border-y border-slate-200/80 shadow-sm'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="text-center"
                            >
                                <div className={`text-4xl md:text-5xl font-black mb-2 ${isDark
                                    ? 'text-white'
                                    : 'bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent'}`}>
                                    {stat.value}
                                </div>
                                <div className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h3 className={`text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Tại sao chọn Recap1s?
                        </h3>
                        <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Giải pháp giải captcha toàn diện với công nghệ AI tiên tiến nhất
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className={`group p-8 rounded-2xl transition-all duration-300 ${isDark
                                    ? 'bg-slate-900/50 border border-slate-800 hover:border-sky-500/30 hover:bg-slate-800/50'
                                    : 'bg-white border border-slate-200 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10'}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors ${isDark
                                    ? 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20'
                                    : 'bg-gradient-to-br from-sky-50 to-indigo-50 text-sky-600 group-hover:from-sky-100 group-hover:to-indigo-100'}`}>
                                    {feature.icon}
                                </div>
                                <h4 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {feature.title}
                                </h4>
                                <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={`py-24 ${isDark
                ? 'bg-gradient-to-b from-transparent via-slate-900/50 to-transparent'
                : 'bg-gradient-to-b from-sky-50/50 via-white to-indigo-50/50'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h3 className={`text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Bảng giá dịch vụ
                        </h3>
                        <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Giá cạnh tranh nhất thị trường, thanh toán theo lượt sử dụng
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {pricing.map((plan, idx) => (
                            <motion.div
                                key={plan.id || idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className={`relative p-8 rounded-2xl transition-all ${isDark
                                    ? `bg-slate-900/80 border hover:border-sky-500/50 ${idx === 0 ? 'border-sky-500/50 ring-2 ring-sky-500/20' : 'border-slate-800'}`
                                    : `bg-white border-2 hover:shadow-xl hover:shadow-sky-500/10 ${idx === 0 ? 'border-sky-500 shadow-lg shadow-sky-500/10' : 'border-slate-200'}`}`}
                            >
                                {idx === 0 && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-black uppercase rounded-full shadow-lg">
                                        Phổ biến
                                    </div>
                                )}
                                <h4 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {plan.name}
                                </h4>
                                <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    {plan.description}
                                </p>
                                <div className="mb-4">
                                    <span className={`text-5xl font-black ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                                        ${plan.price}
                                    </span>
                                    <span className={`text-sm ml-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                        /{plan.unit}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-emerald-500 mb-6 font-semibold">
                                    <Clock size={14} />
                                    <span>Tốc độ: {plan.speed}</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    <li className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        API không giới hạn
                                    </li>
                                    <li className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        Hỗ trợ 24/7
                                    </li>
                                    <li className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        Hoàn tiền nếu lỗi
                                    </li>
                                </ul>
                                <button
                                    onClick={onRegister}
                                    className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${idx === 0
                                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25'
                                        : isDark
                                            ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                        }`}
                                >
                                    Bắt đầu ngay
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`text-center p-12 rounded-3xl ${isDark
                            ? 'bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20'
                            : 'bg-gradient-to-br from-sky-500 to-indigo-600 shadow-2xl shadow-sky-500/30'}`}
                    >
                        <Zap className={`mx-auto mb-6 ${isDark ? 'text-sky-400' : 'text-white/90'}`} size={48} />
                        <h3 className={`text-3xl font-black mb-4 ${isDark ? 'text-white' : 'text-white'}`}>
                            Sẵn sàng tự động hóa?
                        </h3>
                        <p className={`mb-8 max-w-xl mx-auto ${isDark ? 'text-slate-400' : 'text-white/80'}`}>
                            Đăng ký ngay hôm nay và nhận $1 credit miễn phí để trải nghiệm dịch vụ.
                            Không cần thẻ tín dụng.
                        </p>
                        <button
                            onClick={onRegister}
                            className={`px-8 py-4 rounded-2xl text-lg font-bold transition-all ${isDark
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-2xl shadow-sky-500/30'
                                : 'bg-white hover:bg-slate-100 text-sky-600 shadow-xl'}`}
                        >
                            Đăng ký miễn phí ngay
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className={`py-12 ${isDark ? 'border-t border-slate-800/50' : 'border-t border-slate-200 bg-white'}`}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 group">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img
                                src={isDark ? logo : logoLight}
                                alt="Recap1s Icon"
                                className={`w-full h-full object-contain transition-opacity ${isDark ? 'mix-blend-screen opacity-70 group-hover:opacity-100' : 'mix-blend-multiply opacity-80 group-hover:opacity-100'}`}
                            />
                        </div>
                        <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Recap1s.com</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        © 2026 Recap1s.com. All rights reserved.
                    </p>
                </div>
            </footer>
        </div >
    );
};

export default LandingPage;
