import React, { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    DollarSign,
    Search,
    ArrowLeft,
    Edit2,
    Save,
    Trash2,
    Gift,
    Lock,
    Unlock,
    CheckCircle2,
    X,
    Tag,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    Activity,
    ExternalLink,
    CreditCard,
    Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api.js';

const AdminPanel = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);

    // Data States
    const [adminStats, setAdminStats] = useState({});
    const [users, setUsers] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [giftCodes, setGiftCodes] = useState([]);
    const [notification, setNotification] = useState('');

    // Sorting & Filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // Modals & Edits
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [editingBalanceId, setEditingBalanceId] = useState(null);
    const [tempBalance, setTempBalance] = useState('');

    // Forms
    const [editForm, setEditForm] = useState({ password: '', role: 'user', is_locked: false });
    const [giftForm, setGiftForm] = useState({ amount: 1, quantity: 1 });

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [generatedCodes, setGeneratedCodes] = useState([]);
    const [showGeneratedModal, setShowGeneratedModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab, refreshTrigger]);

    const fetchData = async () => {
        setLoading(true);
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            if (activeTab === 'overview') {
                const res = await api.get('/admin/stats', config);
                setAdminStats(res.data.stats || {});
            }
            else if (activeTab === 'users') {
                const res = await api.get('/admin/users', config);
                setUsers(res.data.users || []);
            }
            else if (activeTab === 'pricing') {
                const res = await api.get('/admin/pricing', config);
                setPricing(res.data.pricing || []);
            }
            else if (activeTab === 'gift-codes') {
                const res = await api.get('/admin/gift-codes', config);
                setGiftCodes(res.data.codes || []);
            }
            else if (activeTab === 'system') {
                const res = await api.get('/admin/notification', config);
                let raw = res.data.notification || '';
                try {
                    // Try parsing as JSON array
                    let parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        setNotification(parsed);
                    } else {
                        setNotification([raw]);
                    }
                } catch (e) {
                    // If not JSON, treat as single string
                    setNotification(raw ? [raw] : ['']);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...users].filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleQuickBalanceUpdate = async (userId, newBalance) => {
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            await api.post('/admin/users/update', {
                userId,
                balance: newBalance
            }, config);
            setEditingBalanceId(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert('Lỗi cập nhật số dư');
        }
    };

    const handleSaveUser = async () => {
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            await api.post('/admin/users/update', {
                userId: selectedUser.id,
                ...editForm
            }, config);
            setIsUserModalOpen(false);
            setRefreshTrigger(prev => prev + 1);
            alert('Cập nhật thành công!');
        } catch (err) {
            alert('Lỗi cập nhật user');
        }
    };

    const handleGenerateGift = async () => {
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            const res = await api.post('/admin/gift-codes/generate', giftForm, config);
            console.log('Gift code response:', res.data);

            setIsGiftModalOpen(false);
            setRefreshTrigger(prev => prev + 1);

            // Show generated codes popup
            if (res.data && res.data.codes && res.data.codes.length > 0) {
                setGeneratedCodes(res.data.codes);
                setShowGeneratedModal(true);
            } else {
                alert('Tạo mã thành công! (Không có codes trả về)');
            }
        } catch (err) {
            console.error('Gift generation error:', err);
            alert('Lỗi tạo mã: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteGift = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa code này?')) return;
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            await api.delete(`/admin/gift-codes/${id}`, config);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert('Lỗi xóa code');
        }
    };

    const [selectedUserDetail, setSelectedUserDetail] = useState(null);

    // Fetch detail when selected
    useEffect(() => {
        if (selectedUserDetail && !selectedUserDetail.stats) { // Only fetch if stats are not already loaded
            fetchUserDetail(selectedUserDetail.id);
        }
    }, [selectedUserDetail]);

    const fetchUserDetail = async (userId) => {
        const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
        try {
            // Parallel fetch for speed
            const [statsRes, logsRes, transRes] = await Promise.all([
                api.get(`/admin/users/${userId}/stats`, config),
                api.get(`/admin/users/${userId}/logs`, config),
                api.get(`/admin/users/${userId}/transactions`, config)
            ]);

            setSelectedUserDetail(prev => ({
                ...prev,
                stats: statsRes.data.stats,
                logs: logsRes.data.logs,
                transactions: transRes.data.transactions
            }));
        } catch (err) {
            console.error(err);
        }
    };

    const UserDetailModal = ({ user, onClose }) => {
        if (!user) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0b1120] border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                >
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                                {(user.fullName || user.username)[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{user.fullName || user.username}</h3>
                                <p className="text-slate-400 text-sm">@{user.username} • ID: {user.id}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Số dư hiện tại</div>
                                <div className="text-2xl font-bold text-emerald-400">${Number(user.stats?.balance || user.balance || 0).toFixed(4)}</div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Tổng đã chi tiêu</div>
                                <div className="text-2xl font-bold text-sky-400">${Number(user.stats?.totalSpent || 0).toFixed(4)}</div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Tổng Solves</div>
                                <div className="text-2xl font-bold text-purple-400">{user.stats?.totalSolves || 0}</div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div>
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <CreditCard size={18} className="text-emerald-400" /> Lịch sử giao dịch
                            </h4>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Thời gian</th>
                                            <th className="p-3">Loại</th>
                                            <th className="p-3">Số tiền</th>
                                            <th className="p-3">Mô tả</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {user.transactions?.map((tx, i) => (
                                            <tr key={i} className="hover:bg-slate-800/50">
                                                <td className="p-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString('vi-VN')}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className={`p-3 font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {tx.type === 'credit' ? '+' : '-'}${Number(tx.amount).toFixed(4)}
                                                </td>
                                                <td className="p-3 text-slate-400">{tx.description}</td>
                                            </tr>
                                        ))}
                                        {(!user.transactions || user.transactions.length === 0) && (
                                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">Chưa có giao dịch nào</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Logs */}
                        <div>
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-sky-400" /> Logs Gần Đây
                            </h4>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Task ID</th>
                                            <th className="p-3">Loại</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Chi phí</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {user.logs?.map((log, i) => (
                                            <tr key={i} className="hover:bg-slate-800/50">
                                                <td className="p-3 font-mono text-xs text-slate-500">{log.task_id?.substring(0, 8)}...</td>
                                                <td className="p-3 text-slate-300">{log.task_type}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'success' || log.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        log.status === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono text-rose-400">-${Number(log.cost).toFixed(5)}</td>
                                            </tr>
                                        ))}
                                        {(!user.logs || user.logs.length === 0) && (
                                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">Chưa có log hoạt động</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-800 backdrop-blur-xl gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={onBack} className="p-2 sm:p-3 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                        <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">Quản Trị Hệ Thống</h1>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Super Admin Access</p>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-2 px-2 mask-linear-right lg:mask-none">
                    {[
                        { id: 'overview', label: 'Tổng Quan' },
                        { id: 'users', label: 'Người Dùng' },
                        { id: 'pricing', label: 'Bảng Giá' },
                        { id: 'gift-codes', label: 'Gift Codes' },
                        { id: 'system', label: 'Hệ Thống' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="glass min-h-[600px] p-8 rounded-3xl border border-slate-800">
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Tổng User"
                                value={adminStats.totalUsers}
                                icon={<Users size={24} />}
                                color="blue"
                                sub="Toàn hệ thống"
                            />
                            <StatCard
                                title="Doanh Thu Tổng"
                                value={`$${Number(adminStats.totalRevenue || 0).toFixed(2)}`}
                                icon={<DollarSign size={24} />}
                                color="emerald"
                                sub={`Hôm nay: $${Number(adminStats.todayRevenue || 0).toFixed(2)}`}
                            />
                            <StatCard
                                title="Tổng Solves"
                                value={adminStats.totalSolves}
                                icon={<CheckCircle2 size={24} />}
                                color="purple"
                                sub={`Hôm nay: ${adminStats.todaySolves || 0}`}
                            />
                            <StatCard
                                title="Đang Xử Lý"
                                value={adminStats.activeRequests}
                                icon={<Activity size={24} />}
                                color="orange"
                                sub="Real-time requests"
                            />
                        </div>

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40">
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Activity className="text-sky-400" /> Trạng Thái Hệ Thống
                                </h4>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                                            <span>Tỉ Lệ Giải Thành Công (Success Rate)</span>
                                            <span className="text-emerald-400">{Number(adminStats.successRate || 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                style={{ width: `${adminStats.successRate || 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                            <div className="text-slate-500 text-xs font-bold uppercase">Uptime</div>
                                            <div className="text-white font-mono font-bold text-lg">99.9%</div>
                                        </div>
                                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                            <div className="text-slate-500 text-xs font-bold uppercase">Avg Response</div>
                                            <div className="text-white font-mono font-bold text-lg">~1.2s</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <DollarSign size={100} />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-4">Doanh Thu Hôm Nay</h4>
                                <div className="text-5xl font-black text-emerald-400 tracking-tighter mb-2">
                                    ${Number(adminStats.todayRevenue || 0).toFixed(3)}
                                </div>
                                <p className="text-slate-500 font-medium">
                                    Đang tăng trưởng so với hôm qua
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-white">Quản Lý Người Dùng</h3>
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm user..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-6 py-3 text-sm w-full focus:border-sky-500 outline-none text-white shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl scrollbar-hide">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-900 text-sm uppercase font-extrabold text-slate-400 tracking-wider">
                                    <tr>
                                        {[
                                            { key: 'username', label: 'Tài Khoản', width: '15%' },
                                            { key: 'created_at', label: 'Ngày Tạo', width: '15%' },
                                            { key: 'last_login', label: 'Đăng Nhập', width: '20%' },
                                            { key: 'balance', label: 'Số Dư ($)', width: '15%' },
                                            { key: 'role', label: 'Quyền', width: '10%' },
                                            { key: 'is_locked', label: 'Trạng Thái', width: '10%' },
                                            { key: 'action', label: 'Hành Động', width: '15%', align: 'right' }
                                        ].map(col => (
                                            <th
                                                key={col.key}
                                                className={`px-8 py-5 cursor-pointer hover:text-white transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                                                onClick={() => col.key !== 'action' && handleSort(col.key)}
                                                width={col.width}
                                            >
                                                <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                                    {col.label}
                                                    {sortConfig.key === col.key && (
                                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                    )}
                                                    {sortConfig.key !== col.key && col.key !== 'action' && <ArrowUpDown size={14} className="opacity-30" />}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                                    {sortedUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div
                                                    onClick={() => setSelectedUserDetail(user)}
                                                    className="cursor-pointer group-hover:scale-105 transition-transform origin-left"
                                                >
                                                    <div className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-2">
                                                        {user.username}
                                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono mt-1">ID: {user.id}</div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-300">
                                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {user.created_at ? new Date(user.created_at).toLocaleTimeString('vi-VN') : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                {user.last_login_at ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-sm font-bold text-sky-400">
                                                            <Activity size={12} />
                                                            {new Date(user.last_login_at).toLocaleString('vi-VN', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            IP: {user.last_login_ip || 'N/A'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-600 italic">Chưa đăng nhập</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                {editingBalanceId === user.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={tempBalance}
                                                            onChange={e => setTempBalance(e.target.value)}
                                                            className="bg-slate-950 border border-sky-500 rounded-lg w-24 px-2 py-1 text-emerald-400 font-mono font-bold outline-none"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleQuickBalanceUpdate(user.id, tempBalance);
                                                                if (e.key === 'Escape') setEditingBalanceId(null);
                                                            }}
                                                        />
                                                        <button onClick={() => handleQuickBalanceUpdate(user.id, tempBalance)} className="text-emerald-500 hover:text-emerald-400"><CheckCircle2 size={18} /></button>
                                                        <button onClick={() => setEditingBalanceId(null)} className="text-rose-500 hover:text-rose-400"><X size={18} /></button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => { setEditingBalanceId(user.id); setTempBalance(user.balance); }}
                                                        className="text-xl font-mono font-bold text-emerald-400 cursor-pointer hover:bg-slate-800 px-2 py-1 rounded -ml-2 border border-transparent hover:border-slate-700 transition-all flex items-center gap-2 w-fit"
                                                        title="Click để sửa số dư"
                                                    >
                                                        ${Number(user.balance).toFixed(4)}
                                                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-500" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                {user.is_locked ? (
                                                    <span className="flex items-center gap-2 text-rose-400 text-sm font-bold bg-rose-500/5 py-1 px-3 rounded-lg w-fit"><Lock size={14} /> Đã Khóa</span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/5 py-1 px-3 rounded-lg w-fit"><CheckCircle2 size={14} /> Hoạt Động</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setEditForm({ password: '', role: user.role, is_locked: Boolean(user.is_locked) });
                                                        setIsUserModalOpen(true);
                                                    }}
                                                    className="p-3 bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-400 rounded-xl transition-all shadow-lg shadow-black/20"
                                                    title="Chỉnh sửa User"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'gift-codes' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Gift className="text-pink-500" size={28} /> Quản Lý Gift Codes
                            </h3>
                            <button
                                onClick={() => setIsGiftModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-base font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus size={20} /> Tạo Code Mới
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 scrollbar-hide">
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-900/80 border-b border-slate-800">
                                        <th className="text-left px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Mã Code</th>
                                        <th className="text-left px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Số Tiền</th>
                                        <th className="text-left px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Trạng Thái</th>
                                        <th className="text-left px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Người Dùng</th>
                                        <th className="text-left px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ngày Dùng</th>
                                        <th className="text-right px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Hành Động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {giftCodes.map(code => (
                                        <tr key={code.id} className={`transition-all ${code.status === 'used' ? 'opacity-50 bg-slate-900/20' : 'hover:bg-slate-800/30'}`}>
                                            <td className="px-8 py-5">
                                                <code className="text-base font-mono font-black text-white bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700">
                                                    {code.code}
                                                </code>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-2xl font-black text-emerald-400">${code.amount}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs uppercase font-extrabold tracking-wider ${code.status === 'used' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    {code.status === 'used' ? 'Đã Dùng' : 'Chưa Dùng'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                {code.used_by ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white">#{code.used_by}</span>
                                                        <span className="text-xs text-slate-500">{code.used_by_username || 'N/A'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                {code.used_at ? (
                                                    <span className="text-sm font-medium text-slate-400">
                                                        {new Date(code.used_at).toLocaleString('vi-VN', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        })}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {code.status === 'unused' && (
                                                    <button
                                                        onClick={() => handleDeleteGift(code.id)}
                                                        className="p-3 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl transition-all shadow-lg shadow-black/20"
                                                        title="Xóa Gift Code"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {giftCodes.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-12 text-slate-500 font-bold">
                                                Chưa có Gift Code nào. Tạo mới để bắt đầu!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Tag className="text-sky-400" size={28} /> Quản Lý Bảng Giá
                            </h3>
                            <button
                                onClick={() => setPricing([...pricing, { id: Date.now(), name: 'Dịch vụ mới', price: 0.001, unit: 'solve', description: 'Mô tả', speed: '1-3s' }])}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all"
                            >
                                <Plus size={20} /> Thêm Dịch Vụ
                            </button>
                        </div>
                        <div className="space-y-4">
                            {pricing.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 bg-slate-800/30 border border-slate-800 rounded-2xl items-center hover:border-slate-700 transition-colors">
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Tên Dịch Vụ</label>
                                        <input
                                            value={item.name}
                                            onChange={e => {
                                                const newPricing = [...pricing];
                                                newPricing[idx].name = e.target.value;
                                                setPricing(newPricing);
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-white outline-none focus:border-sky-500 transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Giá ($)</label>
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={e => {
                                                const newPricing = [...pricing];
                                                newPricing[idx].price = Number(e.target.value);
                                                setPricing(newPricing);
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base text-emerald-400 font-mono font-bold outline-none focus:border-sky-500 transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Mô Tả</label>
                                        <input
                                            value={item.description}
                                            onChange={e => {
                                                const newPricing = [...pricing];
                                                newPricing[idx].description = e.target.value;
                                                setPricing(newPricing);
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Tốc Độ</label>
                                        <input
                                            value={item.speed}
                                            onChange={e => {
                                                const newPricing = [...pricing];
                                                newPricing[idx].speed = e.target.value;
                                                setPricing(newPricing);
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex justify-end mt-4 md:mt-0">
                                        <button
                                            onClick={() => setPricing(pricing.filter((_, i) => i !== idx))}
                                            className="p-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {pricing.length > 0 && (
                            <div className="flex justify-end pt-6 border-t border-slate-800">
                                <button
                                    onClick={async () => {
                                        try {
                                            const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
                                            await api.post('/admin/pricing', { pricing }, config);
                                            alert('Đã lưu bảng giá!');
                                        } catch (err) {
                                            alert('Lỗi lưu bảng giá');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-lg"
                                >
                                    <Save size={24} /> Lưu Thay Đổi
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-6">Cài Đặt Hệ Thống</h3>

                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                                <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">Thông Báo Chạy (Marquee)</label>
                                <div className="space-y-3 mb-4">
                                    {(Array.isArray(notification) ? notification : [notification]).map((note, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                value={note}
                                                onChange={(e) => {
                                                    const newNotes = Array.isArray(notification) ? [...notification] : [notification];
                                                    newNotes[idx] = e.target.value;
                                                    setNotification(newNotes);
                                                }}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium outline-none focus:border-sky-500 transition-colors"
                                                placeholder={`Thông báo #${idx + 1}...`}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newNotes = (Array.isArray(notification) ? notification : [notification]).filter((_, i) => i !== idx);
                                                    setNotification(newNotes);
                                                }}
                                                className="p-3 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setNotification([...(Array.isArray(notification) ? notification : [notification]), ''])}
                                    className="text-sky-400 text-sm font-bold hover:text-sky-300 flex items-center gap-2 mb-6"
                                >
                                    <Plus size={16} /> Thêm Thông Báo
                                </button>

                                <div className="flex justify-end pt-4 border-t border-slate-700/50">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const config = { headers: { 'adminKey': 'super-admin-secret-key' } };
                                                // Save as JSON string
                                                const payload = JSON.stringify(Array.isArray(notification) ? notification : [notification]);
                                                await api.post('/admin/notification', { notification: payload }, config);
                                                alert('Đã cập nhật thông báo!');
                                            } catch (err) {
                                                alert('Lỗi cập nhật');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
                                    >
                                        <Save size={18} /> Lưu Cài Đặt
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* User Edit Modal */}
            <AnimatePresence>
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-lg p-8 rounded-3xl shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-white">Chỉnh Sửa: {selectedUser?.username}</h3>
                                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"><X size={24} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Đổi Mật Khẩu</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập mật khẩu mới (để trống nếu không đổi)"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-sky-500 transition-colors text-base"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Phân Quyền</label>
                                        <select
                                            value={editForm.role}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-sky-500 transition-colors text-base font-bold"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Trạng Thái</label>
                                        <div
                                            onClick={() => setEditForm({ ...editForm, is_locked: !editForm.is_locked })}
                                            className={`cursor-pointer w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border font-bold transition-all select-none ${editForm.is_locked
                                                ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20'
                                                : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'}`}
                                        >
                                            {editForm.is_locked ? <><Lock size={20} /> Đã Khóa</> : <><Unlock size={20} /> Hoạt Động</>}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveUser}
                                    className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold mt-6 shadow-xl shadow-sky-600/30 active:scale-95 transition-all text-lg"
                                >
                                    Lưu Thay Đổi
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Gift Gen Modal */}
            <AnimatePresence>
                {isGiftModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl"
                        >
                            <h3 className="text-2xl font-black text-white mb-8">Tạo Gift Codes</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Giá Trị ($)</label>
                                    <input
                                        type="number"
                                        value={giftForm.amount}
                                        onChange={e => setGiftForm({ ...giftForm, amount: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl font-bold outline-none focus:border-pink-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Số Lượng Code</label>
                                    <input
                                        type="number"
                                        value={giftForm.quantity}
                                        onChange={e => setGiftForm({ ...giftForm, quantity: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xl font-bold outline-none focus:border-pink-500 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateGift}
                                    className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-bold mt-6 shadow-xl shadow-pink-600/30 active:scale-95 transition-all text-lg"
                                >
                                    Tạo Ngay
                                </button>
                                <button onClick={() => setIsGiftModalOpen(false)} className="w-full text-slate-500 text-sm font-bold hover:text-white py-2">Hủy Bỏ</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Generated Codes Display Modal */}
            <AnimatePresence>
                {showGeneratedModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-pink-500/30 w-full max-w-2xl p-8 rounded-3xl shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Gift className="text-pink-500" size={28} />
                                    🎉 Tạo Thành Công {generatedCodes?.length || 0} Gift Code!
                                </h3>
                                <button
                                    onClick={() => setShowGeneratedModal(false)}
                                    className="text-slate-500 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {(generatedCodes || []).map((code, idx) => (
                                    <div key={idx} className="p-5 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-pink-500/50 transition-all group">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code #{idx + 1}</div>
                                                <code className="text-2xl font-mono font-black text-white bg-slate-950 px-4 py-2 rounded-lg border border-slate-700 block select-all">
                                                    {code}
                                                </code>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    navigator.clipboard.writeText(code);
                                                    // Visual feedback
                                                    const btn = e.target.closest('button');
                                                    const originalText = btn.innerHTML;
                                                    btn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>';
                                                    setTimeout(() => { btn.innerHTML = originalText; }, 1500);
                                                }}
                                                className="flex items-center gap-2 px-5 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95"
                                                title="Copy to clipboard"
                                            >
                                                <Copy size={20} />
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-800">
                                <button
                                    onClick={() => {
                                        const allCodes = generatedCodes.join('\n');
                                        navigator.clipboard.writeText(allCodes);
                                        alert('Đã copy toàn bộ codes!');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                >
                                    <Copy size={20} />
                                    Copy Tất Cả
                                </button>
                                <button
                                    onClick={() => setShowGeneratedModal(false)}
                                    className="flex-1 px-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-600/20 transition-all"
                                >
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* User Detail View Modal */}
            <AnimatePresence>
                {selectedUserDetail && (
                    <UserDetailModal
                        user={selectedUserDetail}
                        onClose={() => setSelectedUserDetail(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, sub }) => {
    const colors = {
        blue: 'text-sky-400 bg-sky-500/5 border-sky-500/10',
        emerald: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
        purple: 'text-purple-400 bg-purple-500/5 border-purple-500/10',
        orange: 'text-orange-400 bg-orange-500/5 border-orange-500/10'
    };
    return (
        <div className={`p-8 rounded-3xl border ${colors[color] || colors.blue}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl bg-white/5`}>{icon}</div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{value}</div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{title}</div>
            {sub && <div className="text-slate-400 text-xs font-medium mt-3 pt-3 border-t border-white/5">{sub}</div>}
        </div>
    );
};

export default AdminPanel;
