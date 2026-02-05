import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    History,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Wallet,
    CreditCard,
    MessageCircle,
    CheckCircle2,
    XCircle,
    X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const BillingPage = ({ user, stats, onBalanceUpdate }) => {
    const { t } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);

    // Popup State
    const [popup, setPopup] = useState({ show: false, type: 'success', message: '' });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/transactions');
            if (res.data.transactions) {
                setTransactions(res.data.transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type, // 'credit' or 'debit'
                    amount: tx.amount,
                    description: tx.description,
                    date: tx.created_at,
                    status: 'completed'
                })));
            }
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!redeemCode.trim()) return;
        setRedeemLoading(true);
        try {
            const res = await api.post('/user/redeem', { code: redeemCode.trim() });
            setPopup({
                show: true,
                type: 'success',
                message: `Nạp thành công $${res.data.amount}!`
            });
            setRedeemCode('');
            if (onBalanceUpdate) onBalanceUpdate();
            fetchTransactions();
        } catch (err) {
            setPopup({
                show: true,
                type: 'error',
                message: err.response?.data?.error || 'Mã code không hợp lệ hoặc đã sử dụng.'
            });
        } finally {
            setRedeemLoading(false);
        }
    };

    return (
        <div className="space-y-8 min-h-screen pb-20 relative">
            <div>
                <h2 className="text-3xl font-extrabold text-white mb-2">{t('billingTitle')}</h2>
                <p className="text-slate-500">{t('billingDesc')}</p>
            </div>

            {/* Notification Popup */}
            <AnimatePresence>
                {popup.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full border ${popup.type === 'success'
                                ? 'bg-[#0f1f18] border-emerald-500/30'
                                : 'bg-[#1f0f0f] border-rose-500/30'
                                }`}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className={`p-4 rounded-full mb-4 ${popup.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                    {popup.type === 'success' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                </div>
                                <h3 className={`text-2xl font-black mb-2 ${popup.type === 'success' ? 'text-white' : 'text-white'
                                    }`}>
                                    {popup.type === 'success' ? 'Thành Công!' : 'Thất Bại!'}
                                </h3>
                                <p className="text-slate-400 font-medium mb-6">
                                    {popup.message}
                                </p>
                                <button
                                    onClick={() => setPopup({ ...popup, show: false })}
                                    className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${popup.type === 'success'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                                        }`}
                                >
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Balance & Redemption Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-6 sm:p-8 md:col-span-2 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={120} className="text-emerald-500" />
                    </div>

                    <div className="relative z-10">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">{t('currentBalance')}</p>
                        <h3 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-8">
                            ${Number(user.balance || 0).toFixed(4)}
                        </h3>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">{t('totalSpentBilling')}</p>
                                <p className="text-lg sm:text-xl font-bold text-rose-400">-${Number(stats?.totalSpent || 0).toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">{t('totalSolvesBilling')}</p>
                                <p className="text-lg sm:text-xl font-bold text-sky-400">{stats?.totalSolves || 0}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Redeem Code Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass p-6 sm:p-8 flex flex-col justify-center"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-3 bg-pink-500/10 rounded-xl">
                            <Gift className="text-pink-500" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white">Nạp Gift Code</h3>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nhập mã code của bạn..."
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white font-mono font-bold outline-none focus:border-pink-500 transition-colors uppercase placeholder:normal-case"
                        />

                        <button
                            onClick={handleRedeem}
                            disabled={!redeemCode || redeemLoading}
                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {redeemLoading ? <Loader2 size={20} className="animate-spin" /> : 'Nạp Ngay'}
                        </button>

                        <div className="pt-4 border-t border-slate-800/50 text-center">
                            <p className="text-sm text-slate-400 font-medium mb-2">Chưa có Code?</p>
                            <a
                                href="https://t.me/cotrimicha"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-bold text-sm transition-colors"
                            >
                                <MessageCircle size={16} /> Liên hệ Hỗ Trợ
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass overflow-hidden"
            >
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <History size={20} className="text-slate-400" />
                        {t('transactionHistory')}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-sky-400" size={28} />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/50">
                        {transactions.map((tx, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                        {tx.type === 'credit' ? (
                                            <ArrowDownRight className="text-emerald-400" size={20} />
                                        ) : (
                                            <ArrowUpRight className="text-rose-400" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{tx.description}</p>
                                        <p className="text-xs text-slate-500">{new Date(tx.date || Date.now()).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-lg ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(4)} $
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default BillingPage;
