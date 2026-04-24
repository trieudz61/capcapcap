import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Globe, Key, Send, Copy, CheckCircle2, Loader2, Sparkles, Shield, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const TrialPage = ({ user, onUserUpdate }) => {
    const { t, isDark } = useTheme();
    const [captchaType, setCaptchaType] = useState('recaptcha');
    const [formData, setFormData] = useState({
        siteKey: '',
        pageUrl: '',
        pageAction: ''
    });
    const [isEnterprise, setIsEnterprise] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [solveTime, setSolveTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    const handleSolve = async (e) => {
        e.preventDefault();
        if (!formData.siteKey || !formData.pageUrl) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        setResult('');
        setSolveTime(null);
        setElapsedTime(0);
        startTimeRef.current = Date.now();

        // Start live timer
        timerRef.current = setInterval(() => {
            setElapsedTime(((Date.now() - startTimeRef.current) / 1000));
        }, 100);

        try {
            // Step 1: Create Trial Task
            const taskTypeMap = {
                'recaptcha': 'ReCaptchaV2TaskProxyless',
                'recaptchav3': 'ReCaptchaV3TaskProxyless',
                'turnstile': 'TurnstileTaskProxyless'
            };
            const taskType = taskTypeMap[captchaType];
            const createTaskParams = {
                clientKey: user.api_key,
                task: {
                    type: taskType,
                    websiteURL: formData.pageUrl,
                    websiteKey: formData.siteKey,
                    ...(captchaType === 'recaptchav3' && formData.pageAction ? { pageAction: formData.pageAction } : {}),
                    ...(captchaType === 'recaptchav3' ? { isEnterprise } : {})
                }
            };

            const { data: createData } = await api.post('/captcha/createTrialTask', createTaskParams);

            if (createData.errorId !== 0) {
                throw new Error(createData.errorDescription || 'Failed to create task');
            }

            const taskId = createData.taskId;

            // Step 2: Poll for Result
            let solved = false;
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds timeout

            while (!solved && attempts < maxAttempts) {
                const { data: resultData } = await api.post('/captcha/getTaskResult', {
                    clientKey: user.api_key,
                    taskId: taskId
                });

                if (resultData.status === 'ready') {
                    const token = captchaType === 'turnstile'
                        ? resultData.solution.token
                        : resultData.solution.gRecaptchaResponse;
                    setResult(token || '');
                    setSolveTime(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
                    solved = true;
                    // Trigger refresh of user data to show updated trial_balance
                    if (onUserUpdate) onUserUpdate();
                } else if (resultData.errorId !== 0) {
                    throw new Error(resultData.errorDescription || 'Solving failed');
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                }
            }

            if (!solved) {
                throw new Error('Solving timeout');
            }
        } catch (err) {
            setError(err.response?.data?.errorDescription || err.message || 'An error occurred');
        } finally {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setLoading(false);
        }
    };

    const copyResult = () => {
        if (!result) return;
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t('trial')}</h2>
                            <p className="text-slate-500">{t('trialDesc')}</p>
                        </div>
                    </div>

                    <div className={`px-6 py-4 rounded-3xl border border-dashed flex flex-col items-end ${user.trial_balance > 0
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-rose-500/5 border-rose-500/20'
                        }`}>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Thời gian trải nghiệm</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${user.trial_balance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {user.trial_balance || 0}
                            </span>
                            <span className="text-slate-500 font-bold">lần giải còn lại</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className={`p-8 rounded-[32px] border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                        <form onSubmit={handleSolve} className="space-y-6">
                            {/* Captcha Type Selector */}
                            <div className="space-y-2">
                                <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Shield size={16} /> Captcha Type
                                </label>
                                <div className={`p-1.5 rounded-2xl flex gap-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                                    <button
                                        type="button"
                                        onClick={() => { setCaptchaType('recaptcha'); setResult(''); setError(''); }}
                                        className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                                            captchaType === 'recaptcha'
                                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                                                : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="" className="w-4 h-4 shrink-0" />
                                        ReCaptcha V2
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setCaptchaType('recaptchav3'); setResult(''); setError(''); }}
                                        className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                                            captchaType === 'recaptchav3'
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                                                : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="" className="w-4 h-4 shrink-0" />
                                        V3
                                        <span className="px-1 py-0.5 bg-white/20 text-[8px] font-black uppercase rounded-full leading-none">NEW</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setCaptchaType('turnstile'); setResult(''); setError(''); }}
                                        className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                                            captchaType === 'turnstile'
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                                                : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                        Turnstile
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Key size={16} /> {t('siteKey')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.siteKey}
                                    onChange={(e) => setFormData({ ...formData, siteKey: e.target.value })}
                                    className={`w-full px-5 py-4 rounded-2xl outline-none transition-all font-mono text-sm ${isDark
                                        ? 'bg-slate-950 border-slate-800 focus:border-sky-500 text-white'
                                        : 'bg-slate-50 border-slate-200 focus:border-sky-500 text-slate-900'
                                        } border-2`}
                                    placeholder={captchaType === 'turnstile' ? '0x4AAAAAAA...' : captchaType === 'recaptchav3' ? '6Le9HlYqAAAAA...' : '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Globe size={16} /> {t('pageUrl')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.pageUrl}
                                    onChange={(e) => setFormData({ ...formData, pageUrl: e.target.value })}
                                    className={`w-full px-5 py-4 rounded-2xl outline-none transition-all text-sm ${isDark
                                        ? 'bg-slate-950 border-slate-800 focus:border-sky-500 text-white'
                                        : 'bg-slate-50 border-slate-200 focus:border-sky-500 text-slate-900'
                                        } border-2`}
                                    placeholder="https://example.com/login"
                                />
                            </div>

                            {/* Page Action - only for ReCaptcha V3 */}
                            {captchaType === 'recaptchav3' && (
                                <div className="space-y-2">
                                    <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        <Zap size={16} /> Page Action
                                        <span className={`text-xs font-normal ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.pageAction}
                                        onChange={(e) => setFormData({ ...formData, pageAction: e.target.value })}
                                        className={`w-full px-5 py-4 rounded-2xl outline-none transition-all text-sm ${isDark
                                            ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white'
                                            : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                                            } border-2`}
                                        placeholder="login, submit, verify, homepage..."
                                    />
                                </div>
                            )}

                            {/* Enterprise Toggle - only for ReCaptcha V3 */}
                            {captchaType === 'recaptchav3' && (
                                <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🏢</span>
                                        <div>
                                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Enterprise</span>
                                            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Bật nếu trang dùng reCAPTCHA Enterprise</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEnterprise(!isEnterprise)}
                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isEnterprise
                                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${isEnterprise ? 'left-[26px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        {t('solving')} ({elapsedTime.toFixed(1)}s)
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        {t('getToken')}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-8 rounded-[32px] border h-full ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Zap size={20} className="text-sky-500" />
                            {t('resultToken')}
                        </h3>

                        {result ? (
                            <div className="space-y-4">
                                {solveTime && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}
                                    >
                                        <Clock size={16} className="text-amber-400" />
                                        <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                            Thời gian xử lý: {solveTime}s
                                        </span>
                                    </motion.div>
                                )}
                                <div className={`p-5 rounded-2xl font-mono text-xs break-all max-h-[300px] overflow-y-auto leading-relaxed border ${isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-slate-50 border-slate-200 text-sky-600'
                                    }`}>
                                    {result}
                                </div>
                                <button
                                    onClick={copyResult}
                                    className={`w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all ${copied
                                        ? 'bg-emerald-500 text-white'
                                        : isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={18} />
                                            Copy Response
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center space-y-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed ${isDark ? 'border-slate-800 text-slate-700' : 'border-slate-200 text-slate-400'}`}>
                                    <Send size={24} />
                                </div>
                                <p className="text-sm text-slate-500 max-w-[150px]">
                                    Enter details and click Get Token to see result
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrialPage;
