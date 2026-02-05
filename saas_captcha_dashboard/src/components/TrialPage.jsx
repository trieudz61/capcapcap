import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Globe, Key, Send, Copy, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const TrialPage = ({ user, onUserUpdate }) => {
    const { t, isDark } = useTheme();
    const [formData, setFormData] = useState({
        siteKey: '',
        pageUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const handleSolve = async (e) => {
        e.preventDefault();
        if (!formData.siteKey || !formData.pageUrl) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        setResult('');

        try {
            // Step 1: Create Trial Task
            const createTaskParams = {
                clientKey: user.api_key,
                task: {
                    type: "ReCaptchaV2TaskProxyless",
                    websiteURL: formData.pageUrl,
                    websiteKey: formData.siteKey
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
                    setResult(resultData.solution.gRecaptchaResponse);
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
                            <h2 className="text-3xl font-extrabold text-white tracking-tight">{t('trial')}</h2>
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
                                    placeholder="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
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
                                        {t('solving')}
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
