import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Zap, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const PricingPage = () => {
    const { t, isDark } = useTheme();
    const [taskTypes, setTaskTypes] = React.useState([]);

    React.useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch('http://127.0.0.1:5050/api/pricing');
                const data = await res.json();
                if (data.pricing && data.pricing.length > 0) {
                    setTaskTypes(data.pricing.map(p => ({
                        type: p.name,
                        price: `$${Number(p.price).toFixed(4)}`, // Format as decimal
                        desc: p.description,
                        features: [p.speed, p.unit, 'High Priority'] // Use real fields
                    })));
                }
            } catch (err) {
                console.error('Failed to load pricing', err);
            }
        };
        fetchPricing();
    }, []);

    const defaultTypes = [
        {
            type: 'ReCaptcha V2',
            price: '$0.0010',
            desc: 'Standard ReCaptcha V2 solving.',
            features: ['1-3s Speed', 'Proxyless', 'High Success']
        },
        {
            type: 'ReCaptcha V3',
            price: '$0.0020',
            desc: 'Invisible ReCaptcha V3 solving.',
            features: ['1-2s Speed', 'Proxyless', ' Enterprise Ready']
        }
    ];

    const displayTypes = taskTypes.length > 0 ? taskTypes : defaultTypes;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                    <DollarSign className="text-emerald-500" size={32} />
                </div>
                <div>
                    <h2 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('pricingTitle')}</h2>
                    <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-base font-medium mt-2 flex items-center gap-2`}>
                        <Zap size={16} className="text-amber-400" fill="currentColor" />
                        {t('premiumRates')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {displayTypes.map((task, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`group relative p-8 rounded-[32px] border transition-all duration-300 ${isDark
                            ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-sky-500/30'
                            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50 hover:border-sky-500/30 hover:shadow-sky-500/10'
                            }`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
                            <Shield size={120} className={isDark ? 'text-white' : 'text-slate-900'} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {t('reCaptchaService')}
                            </div>

                            <h3 className={`text-lg font-black font-mono mb-2 break-all ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                                {task.type}
                            </h3>

                            <p className={`text-sm font-medium mb-8 min-h-[40px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {task.desc}
                            </p>

                            <div className="flex items-baseline gap-1 mb-8">
                                <span className={`text-4xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {task.price}
                                </span>
                                <span className={`text-xs font-bold uppercase ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                    / Task
                                </span>
                            </div>

                            <div className="space-y-3 mt-auto">
                                {task.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full mt-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${isDark
                                ? 'bg-slate-800 hover:bg-sky-600 text-white hover:shadow-lg hover:shadow-sky-500/20'
                                : 'bg-slate-100 hover:bg-sky-500 hover:text-white text-slate-900'
                                }`}>
                                {t('getStarted')}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default PricingPage;
