import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Key,
    Copy,
    CheckCircle2,
    RefreshCw,
    Eye,
    EyeOff,
    Shield,
    Clock,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const ApiKeysPage = ({ user, onKeyUpdate }) => {
    const { t } = useTheme();
    const [showKey, setShowKey] = useState(false);
    const apiBaseUrl = api.defaults.baseURL || 'https://makeup-brake-ids-functioning.trycloudflare.com';
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const copyKey = () => {
        navigator.clipboard.writeText(user.api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const regenerateKey = async () => {
        if (!confirm('⚠️ Bạn có chắc muốn tạo API Key mới? Key cũ sẽ ngừng hoạt động ngay lập tức!')) return;

        setRegenerating(true);
        try {
            const { data } = await api.post('/user/regenerate-key');
            onKeyUpdate(data.apiKey);
            alert('✅ API Key mới đã được tạo thành công!');
        } catch (err) {
            alert('❌ Không thể tạo key mới. Vui lòng thử lại.');
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-extrabold text-white mb-2">{t('apiKeysTitle')}</h2>
                <p className="text-slate-500">{t('apiKeysDesc')}</p>
            </div>

            {/* Main API Key Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 sm:p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-sky-500/10 rounded-xl">
                        <Key className="text-sky-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{t('productionApiKey')}</h3>
                        <p className="text-sm text-slate-500">{t('keyForProduction')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Key Display */}
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">{t('yourApiKey')}</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={user.api_key || ''}
                                readOnly
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-sm font-mono outline-none pr-28"
                            />
                            <div className="absolute right-2 top-2 flex gap-1">
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button
                                    onClick={copyKey}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button
                            onClick={regenerateKey}
                            disabled={regenerating}
                            className="flex-1 px-6 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {regenerating ? <Loader2 size={18} className="animate-spin text-sky-400" /> : <RefreshCw size={18} />}
                            {t('regenerateKey')}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Security Tips */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass p-6"
            >
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="text-amber-400" size={20} />
                    {t('securityTips')}
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start gap-3">
                        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <span>{t('securityTip1')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Clock size={16} className="text-sky-400 mt-0.5 shrink-0" />
                        <span>{t('securityTip2')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{t('securityTip3')}</span>
                    </li>
                </ul>
            </motion.div>

            {/* API Usage Example */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass p-6"
            >
                <h4 className="font-bold text-white mb-4">{t('usageExample')}</h4>
                <pre className="bg-slate-950 p-4 rounded-xl text-xs text-sky-300 font-mono overflow-x-auto">
                    {`curl -X POST ${apiBaseUrl}/captcha/createTask \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientKey": "${user.api_key || 'YOUR_API_KEY'}",
    "task": {
      "type": "ReCaptchaV2TaskProxyless",
      "websiteURL": "https://example.com",
      "websiteKey": "SITE_KEY"
    }
  }'`}
                </pre>
            </motion.div>
        </div>
    );
};

export default ApiKeysPage;
