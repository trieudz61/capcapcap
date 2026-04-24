import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Settings,
    User,
    Lock,
    Bell,
    Shield,
    Save,
    Loader2,
    CheckCircle2,
    Eye,
    EyeOff,
    Moon,
    Sun,
    Globe,
    Trash2,
    Languages
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const SettingsPage = ({ user, onUserUpdate }) => {
    const { theme, setTheme, language, setLanguage, t, isDark } = useTheme();
    const [activeSection, setActiveSection] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

    // Profile state
    const [profile, setProfile] = useState({
        fullName: user.fullName || '',
        email: user.email || ''
    });

    // Password state
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Preferences state
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        apiAlerts: true
    });

    const handleSaveProfile = async () => {
        setProfileMsg({ type: '', text: '' });
        setSaving(true);
        try {
            const res = await api.put('/auth/update-profile', {
                fullName: profile.fullName,
                email: profile.email
            });
            if (res.data.user && onUserUpdate) {
                onUserUpdate(res.data.user);
            }
            setSaved(true);
            setProfileMsg({ type: 'success', text: res.data.message || 'Cập nhật thành công!' });
            setTimeout(() => {
                setSaved(false);
                setProfileMsg({ type: '', text: '' });
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.error || 'Lỗi khi lưu thông tin';
            setProfileMsg({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMsg({ type: '', text: '' });

        if (passwords.new !== passwords.confirm) {
            setPasswordMsg({ type: 'error', text: language === 'vi' ? 'Mật khẩu xác nhận không khớp!' : 'Passwords do not match!' });
            return;
        }
        if (passwords.new.length < 6) {
            setPasswordMsg({ type: 'error', text: language === 'vi' ? 'Mật khẩu mới phải có ít nhất 6 ký tự!' : 'Password must be at least 6 characters!' });
            return;
        }

        setSaving(true);
        try {
            const res = await api.put('/auth/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            setPasswordMsg({ type: 'success', text: res.data.message || '✅ Đổi mật khẩu thành công!' });
            setPasswords({ current: '', new: '', confirm: '' });
            setTimeout(() => setPasswordMsg({ type: '', text: '' }), 3000);
        } catch (err) {
            const msg = err.response?.data?.error || 'Lỗi khi đổi mật khẩu';
            setPasswordMsg({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { id: 'profile', label: t('profile'), icon: User },
        { id: 'security', label: t('security'), icon: Lock },
        { id: 'notifications', label: t('notifications'), icon: Bell },
        { id: 'preferences', label: t('preferences'), icon: Settings }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{t('settingsTitle')}</h2>
                <p className="text-slate-500">{t('settingsDesc')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide -mx-2 px-2 mask-linear-right lg:mask-none"
                >
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm font-bold transition-all whitespace-nowrap min-w-fit ${activeSection === section.id
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'text-slate-500 hover:bg-slate-900'
                                }`}
                        >
                            <section.icon size={18} />
                            {section.label}
                        </button>
                    ))}
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-3 glass p-8"
                >
                    {/* Profile Section */}
                    {activeSection === 'profile' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-3xl font-black text-white uppercase">
                                    {(user.fullName || user.username)?.[0] || 'U'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{user.fullName || user.username}</h3>
                                    <p className="text-slate-500">@{user.username}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('fullName')}</label>
                                    <input
                                        type="text"
                                        value={profile.fullName}
                                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-sky-500/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('username')}</label>
                                    <input
                                        type="text"
                                        value={user.username}
                                        disabled
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {profileMsg.text && (
                                <div className={`p-3 rounded-xl text-sm font-bold ${profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                    {profileMsg.text}
                                </div>
                            )}

                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                                {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
                            </button>
                        </div>
                    )}

                    {/* Security Section */}
                    {activeSection === 'security' && (
                        <div className="space-y-6">
                            <div className="pb-6 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="text-sky-400" size={24} />
                                    {t('changePassword')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{t('updatePasswordDesc')}</p>
                            </div>

                            <div className="space-y-4 max-w-md">
                                {[
                                    { key: 'current', label: t('currentPassword'), placeholder: t('currentPassword') },
                                    { key: 'new', label: t('newPassword'), placeholder: t('newPassword') },
                                    { key: 'confirm', label: t('confirmPassword'), placeholder: t('confirmPassword') }
                                ].map(field => (
                                    <div key={field.key} className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                value={passwords[field.key]}
                                                onChange={(e) => setPasswords({ ...passwords, [field.key]: e.target.value })}
                                                placeholder={field.placeholder}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-12 text-sm outline-none focus:border-sky-500/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(!showPasswords)}
                                                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-white"
                                            >
                                                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {passwordMsg.text && (
                                <div className={`p-3 rounded-xl text-sm font-bold ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                    {passwordMsg.text}
                                </div>
                            )}

                            <button
                                onClick={handleChangePassword}
                                disabled={saving || !passwords.current || !passwords.new}
                                className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                {t('changePassword')}
                            </button>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeSection === 'notifications' && (
                        <div className="space-y-6">
                            <div className="pb-6 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Bell className="text-sky-400" size={24} />
                                    {t('notifications')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{t('settingsDesc')}</p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { key: 'emailNotifications', label: t('emailNotifications'), desc: t('emailNotificationsDesc') },
                                    { key: 'apiAlerts', label: t('apiAlerts'), desc: t('apiAlertsDesc') }
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-white">{item.label}</p>
                                            <p className="text-sm text-slate-500">{item.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => setPreferences({ ...preferences, [item.key]: !preferences[item.key] })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${preferences[item.key] ? 'bg-sky-500' : 'bg-slate-700'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preferences[item.key] ? 'left-7' : 'left-1'
                                                }`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preferences Section */}
                    {activeSection === 'preferences' && (
                        <div className="space-y-6">
                            <div className="pb-6 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings className="text-sky-400" size={24} />
                                    {t('preferences')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{t('settingsDesc')}</p>
                            </div>

                            <div className="space-y-4">
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {isDark ? <Moon className="text-sky-400" size={20} /> : <Sun className="text-amber-400" size={20} />}
                                        <div>
                                            <p className="font-bold text-white">{isDark ? t('darkMode') : t('lightMode')}</p>
                                            <p className="text-sm text-slate-500">{isDark ? t('darkModeDesc') : t('lightModeDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                        className={`w-12 h-6 rounded-full transition-all relative ${isDark ? 'bg-sky-500' : 'bg-amber-500'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDark ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>

                                {/* Language Toggle */}
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Languages className="text-sky-400" size={20} />
                                        <p className="font-bold text-white">{t('language')}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setLanguage('vi')}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${language === 'vi'
                                                ? 'bg-sky-500 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            🇻🇳 Tiếng Việt
                                        </button>
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${language === 'en'
                                                ? 'bg-sky-500 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            🇬🇧 English
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-6 border-t border-slate-800">
                                <h4 className="text-rose-400 font-bold mb-4 flex items-center gap-2">
                                    <Trash2 size={18} />
                                    {t('dangerZone')}
                                </h4>
                                <button className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-sm border border-rose-500/20 transition-all">
                                    {t('deleteAccount')}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default SettingsPage;
