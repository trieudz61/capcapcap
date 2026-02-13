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
    Copy,
    QrCode,
    Banknote,
    Sparkles,
    ChevronRight,
    X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

// ============================================
// Bank Configuration
// ============================================
const BANK_CONFIG = {
    bankId: '970407',       // Techcombank bank ID for VietQR
    bankName: 'Techcombank',
    accountNo: '6588797979',
    accountName: 'TRAN CONG TRIEU',
    bankLogo: 'https://img.vietqr.io/image/970407-6588797979-compact2.png?addInfo=recap1s',
};

// Deposit packages
const DEPOSIT_PACKAGES = [
    { amount: 50000, usd: 2, label: '$2', popular: false },
    { amount: 100000, usd: 5, label: '$5', popular: false },
    { amount: 200000, usd: 10, label: '$10', popular: true },
    { amount: 500000, usd: 20, label: '$20', popular: false },
    { amount: 1000000, usd: 50, label: '$50', popular: false },
    { amount: 2000000, usd: 100, label: '$100', popular: false },
];

const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

const BillingPage = ({ user, stats, onBalanceUpdate }) => {
    const { t, isDark } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedField, setCopiedField] = useState('');

    // Deposit states
    const [showDeposit, setShowDeposit] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [customAmount, setCustomAmount] = useState('');

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
                    type: tx.type,
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

    const copyText = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
    };

    // Generate VietQR URL
    const getQRUrl = () => {
        const amount = selectedPackage ? selectedPackage.amount : (parseInt(customAmount) || 0);
        const transferContent = `RECAP1S ${user?.username || 'user'}`;
        return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
    };

    const getTransferContent = () => {
        return `RECAP1S ${user?.username || 'user'}`;
    };

    const getCurrentAmount = () => {
        return selectedPackage ? selectedPackage.amount : (parseInt(customAmount) || 0);
    };

    const getCurrentUSD = () => {
        if (selectedPackage) return selectedPackage.usd;
        const vnd = parseInt(customAmount) || 0;
        return (vnd / 25000).toFixed(2);
    };

    return (
        <div className="space-y-8 min-h-screen pb-20 relative">
            <div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('billingTitle')}</h2>
                <p className={`text-sm sm:text-base ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('billingDesc')}</p>
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
                                <div className={`p-4 rounded-full mb-4 ${popup.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {popup.type === 'success' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                                </div>
                                <h3 className="text-2xl font-black mb-2 text-white">
                                    {popup.type === 'success' ? 'Thành Công!' : 'Thất Bại!'}
                                </h3>
                                <p className="text-slate-400 font-medium mb-6">{popup.message}</p>
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

            {/* Balance & Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${isDark ? 'glass' : 'bg-white border border-slate-200 rounded-2xl shadow-sm'} p-6 sm:p-8 lg:col-span-2 relative overflow-hidden group`}
                >
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={120} className="text-emerald-500" />
                    </div>

                    <div className="relative z-10">
                        <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('currentBalance')}</p>
                        <h3 className={`text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight mb-6 sm:mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ${Number(user.balance || 0).toFixed(4)}
                        </h3>

                        <div className={`grid grid-cols-2 gap-4 border-t pt-6 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div>
                                <p className={`text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('totalSpentBilling')}</p>
                                <p className="text-lg sm:text-xl font-bold text-rose-400">-${Number(stats?.totalSpent || 0).toFixed(4)}</p>
                            </div>
                            <div>
                                <p className={`text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('totalSolvesBilling')}</p>
                                <p className="text-lg sm:text-xl font-bold text-sky-400">{stats?.totalSolves || 0}</p>
                            </div>
                        </div>

                        {/* Deposit Button */}
                        <button
                            onClick={() => setShowDeposit(true)}
                            className="mt-6 w-full px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                        >
                            <Banknote size={20} />
                            Nạp Tiền Qua Chuyển Khoản
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </motion.div>

                {/* Redeem Code Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${isDark ? 'glass' : 'bg-white border border-slate-200 rounded-2xl shadow-sm'} p-6 sm:p-8 flex flex-col justify-center`}
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-3 bg-pink-500/10 rounded-xl">
                            <Gift className="text-pink-500" size={24} />
                        </div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Nạp Gift Code</h3>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nhập mã code của bạn..."
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                            className={`w-full rounded-xl py-3 px-4 font-mono font-bold outline-none transition-colors uppercase placeholder:normal-case ${isDark
                                ? 'bg-slate-950 border border-slate-800 text-white focus:border-pink-500'
                                : 'bg-slate-100 border border-slate-300 text-slate-900 focus:border-pink-500'
                                }`}
                        />

                        <button
                            onClick={handleRedeem}
                            disabled={!redeemCode || redeemLoading}
                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {redeemLoading ? <Loader2 size={20} className="animate-spin" /> : 'Nạp Ngay'}
                        </button>

                        <div className={`pt-4 border-t text-center ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                            <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chưa có Code?</p>
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

            {/* ============================================ */}
            {/* 🏦 DEPOSIT MODAL - Bank Transfer + VietQR    */}
            {/* ============================================ */}
            <AnimatePresence>
                {showDeposit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${isDark
                                ? 'bg-[#0a0f1e] border-slate-800'
                                : 'bg-white border-slate-200'
                                }`}
                        >
                            {/* Header */}
                            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${isDark ? 'bg-[#0a0f1e]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-xl`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                        <Banknote className="text-emerald-400" size={22} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Nạp Tiền</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Chuyển khoản ngân hàng</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowDeposit(false); setSelectedPackage(null); setCustomAmount(''); }}
                                    className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Step 1: Choose Amount */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-black">1</div>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Chọn số tiền nạp</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {DEPOSIT_PACKAGES.map((pkg) => (
                                            <button
                                                key={pkg.amount}
                                                onClick={() => { setSelectedPackage(pkg); setCustomAmount(''); }}
                                                className={`relative p-4 rounded-2xl border-2 transition-all text-center ${selectedPackage?.amount === pkg.amount
                                                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                                                    : isDark
                                                        ? 'border-slate-800 hover:border-slate-600 bg-slate-900/50'
                                                        : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                                                    }`}
                                            >
                                                {pkg.popular && (
                                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                                                        <Sparkles size={10} /> Phổ biến
                                                    </div>
                                                )}
                                                <div className={`text-2xl font-black mb-1 ${selectedPackage?.amount === pkg.amount
                                                    ? 'text-emerald-400'
                                                    : isDark ? 'text-white' : 'text-slate-900'
                                                    }`}>
                                                    {pkg.label}
                                                </div>
                                                <div className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                    {formatVND(pkg.amount)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Amount */}
                                    <div className="mt-4">
                                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                            Hoặc nhập số tiền tùy chọn (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="VD: 250000"
                                            value={customAmount}
                                            onChange={(e) => { setCustomAmount(e.target.value); setSelectedPackage(null); }}
                                            className={`w-full rounded-xl py-3 px-4 font-bold outline-none transition-colors ${isDark
                                                ? 'bg-slate-900 border border-slate-800 text-white focus:border-emerald-500'
                                                : 'bg-slate-100 border border-slate-300 text-slate-900 focus:border-emerald-500'
                                                }`}
                                        />
                                        {customAmount && (
                                            <p className="text-xs text-emerald-400 font-bold mt-1">
                                                ≈ ${getCurrentUSD()} USD
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Step 2: Bank Transfer Info + QR */}
                                {(selectedPackage || customAmount) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-black">2</div>
                                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Quét mã QR hoặc chuyển khoản</span>
                                        </div>

                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl border ${isDark
                                            ? 'bg-slate-900/50 border-slate-800'
                                            : 'bg-slate-50 border-slate-200'
                                            }`}>
                                            {/* QR Code */}
                                            <div className="flex flex-col items-center">
                                                <div className={`p-2 sm:p-3 rounded-2xl mb-3 ${isDark ? 'bg-white' : 'bg-white border border-slate-200'}`}>
                                                    <img
                                                        src={getQRUrl()}
                                                        alt="VietQR"
                                                        className="w-44 sm:w-56 h-auto rounded-lg"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                                <p className={`text-xs font-medium text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                    Quét bằng app ngân hàng bất kỳ
                                                </p>
                                            </div>

                                            {/* Bank Info */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Ngân hàng
                                                    </label>
                                                    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                                                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{BANK_CONFIG.bankName}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Số tài khoản
                                                    </label>
                                                    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                                                        <span className={`font-bold text-sm font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{BANK_CONFIG.accountNo}</span>
                                                        <button onClick={() => copyText(BANK_CONFIG.accountNo, 'account')} className="text-sky-400 hover:text-sky-300 p-1">
                                                            {copiedField === 'account' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Chủ tài khoản
                                                    </label>
                                                    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                                                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{BANK_CONFIG.accountName}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Số tiền
                                                    </label>
                                                    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                                                        <span className="font-black text-emerald-400 text-sm">{formatVND(getCurrentAmount())}</span>
                                                        <button onClick={() => copyText(getCurrentAmount().toString(), 'amount')} className="text-sky-400 hover:text-sky-300 p-1">
                                                            {copiedField === 'amount' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Nội dung chuyển khoản
                                                    </label>
                                                    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl border-2 border-dashed ${isDark ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50 border-amber-300'}`}>
                                                        <span className="font-black text-amber-400 text-sm">{getTransferContent()}</span>
                                                        <button onClick={() => copyText(getTransferContent(), 'content')} className="text-sky-400 hover:text-sky-300 p-1">
                                                            {copiedField === 'content' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Important Note */}
                                        <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200'}`}>
                                            <p className={`text-xs font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                                                ⚡ Lưu ý quan trọng:
                                            </p>
                                            <ul className={`text-xs mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <li>• Ghi đúng <strong className="text-amber-400">nội dung chuyển khoản</strong> để được cộng tiền nhanh nhất</li>
                                                <li>• Tiền sẽ được cộng trong vòng <strong className={isDark ? 'text-white' : 'text-slate-900'}>5-30 phút</strong> sau khi chuyển khoản</li>
                                                <li>• Liên hệ <a href="https://t.me/cotrimicha" target="_blank" rel="noreferrer" className="text-sky-400 font-bold hover:underline">Telegram</a> nếu cần hỗ trợ</li>
                                            </ul>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${isDark ? 'glass' : 'bg-white border border-slate-200 rounded-2xl shadow-sm'} overflow-hidden`}
            >
                <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <History size={20} className="text-slate-400" />
                        {t('transactionHistory')}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-sky-400" size={28} />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className={`text-center py-16 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                        {transactions.map((tx, idx) => (
                            <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                        {tx.type === 'credit' ? (
                                            <ArrowDownRight className="text-emerald-400" size={20} />
                                        ) : (
                                            <ArrowUpRight className="text-rose-400" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{tx.description}</p>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(tx.date || Date.now()).toLocaleString('vi-VN')}</p>
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
