import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    History,
    RefreshCw,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const UsageLogsPage = () => {
    const { t } = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const itemsPerPage = 15;

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/user/logs?limit=100');
            setLogs(data.logs || []);
        } catch (err) {
            console.error('Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'success':
            case 'ready':
                return (
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                        <CheckCircle2 size={12} strokeWidth={3} />
                        <span>{t('success')}</span>
                    </div>
                );
            case 'failed':
            case 'error':
                return (
                    <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                        <XCircle size={12} strokeWidth={3} />
                        <span>{t('failed')}</span>
                    </div>
                );
            case 'pending':
            case 'processing':
                return (
                    <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                        <Clock size={12} strokeWidth={3} />
                        <span>{t('pending')}</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-500/20">
                        <span>{status || 'Unknown'}</span>
                    </div>
                );
        }
    };

    const filteredLogs = logs.filter(log => {
        const s = log.status?.toLowerCase();
        let matchesFilter = filter === 'all';
        if (filter === 'success') matchesFilter = (s === 'success' || s === 'ready');
        if (filter === 'failed') matchesFilter = (s === 'failed' || s === 'error');
        if (filter === 'pending') matchesFilter = (s === 'pending' || s === 'processing');

        const matchesSearch = !searchTerm ||
            log.task_id?.includes(searchTerm) ||
            log.task_type?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const getFilterLabel = (f) => {
        switch (f) {
            case 'all': return t('all');
            case 'success': return t('success');
            case 'failed': return t('failed');
            case 'pending': return t('pending');
            default: return f;
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{t('usageLogsTitle')}</h2>
                <p className="text-slate-500">{t('usageLogsDesc')}</p>
            </div>

            {/* Filters & Search */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between"
            >
                <div className="flex gap-2 flex-wrap">
                    {['all', 'success', 'failed', 'pending'].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === f
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                        >
                            {getFilterLabel(f)}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            placeholder={t('searchTaskId')}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-500/50"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </motion.div>

            {/* Logs Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass overflow-hidden"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-sky-400" size={32} />
                    </div>
                ) : paginatedLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <History size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">{t('noActivityYet')}</p>
                        <p className="text-sm mt-1">{t('requestsWillAppear')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-900/50">
                                    <th className="text-left p-2 sm:p-4 whitespace-nowrap">Task ID</th>
                                    <th className="text-left p-2 sm:p-4 whitespace-nowrap">Type</th>
                                    <th className="text-left p-2 sm:p-4 whitespace-nowrap">Status</th>
                                    <th className="text-left p-2 sm:p-4 whitespace-nowrap">Cost</th>
                                    <th className="text-left p-2 sm:p-4 whitespace-nowrap">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.map((log, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="p-2 sm:p-4">
                                            <code className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-1 rounded whitespace-nowrap">
                                                {log.task_id?.substring(0, 8)}...
                                            </code>
                                        </td>
                                        <td className="p-2 sm:p-4 text-xs sm:text-sm text-slate-300 whitespace-nowrap">{log.task_type}</td>
                                        <td className="p-2 sm:p-4">{getStatusBadge(log.status)}</td>
                                        <td className="p-2 sm:p-4 text-xs sm:text-sm font-mono text-rose-400 whitespace-nowrap">-${Number(log.cost).toFixed(4)}</td>
                                        <td className="p-2 sm:p-4 text-xs sm:text-sm text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            {t('showing')} {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredLogs.length)} / {filteredLogs.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-bold">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default UsageLogsPage;
