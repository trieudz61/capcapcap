import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Mail,
    Lock,
    ArrowRight,
    UserPlus,
    LogIn,
    AlertCircle,
    CheckCircle2,
    User,
    ShieldCheck,
    ChevronLeft,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Globe,
    RefreshCw,
    KeyRound
} from 'lucide-react';
import api from '../utils/api.js';
import { useTheme } from '../context/ThemeContext.jsx';
import logo from '../assets/logo.png';
import logoLight from '../assets/logo_light.png';

const Auth = ({ onLoginSuccess, onBack, initialMode = 'login' }) => {
    const { t, isDark, toggleTheme, language, toggleLanguage } = useTheme();
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        terms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Email verification state
    const [showVerification, setShowVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const otpRefs = useRef([]);
    const googleContainerRef = useRef(null);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=code, 3=new password
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const forgotOtpRefs = useRef([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Google Identity Services callback
    const handleGoogleCredential = async (response) => {
        setGoogleLoading(true);
        setError('');
        setSuccess('');

        try {
            const { data } = await api.post('/auth/google', {
                credential: response.credential
            });
            localStorage.setItem('token', data.token);
            onLoginSuccess(data.user);
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
            setError(errMsg);
        } finally {
            setGoogleLoading(false);
        }
    };

    // Initialize Google Sign-In
    useEffect(() => {
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;
        if (!isLogin) return;

        const tryInit = () => {
            if (window.google?.accounts?.id && googleContainerRef.current) {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: handleGoogleCredential,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                // Clear previous render
                googleContainerRef.current.innerHTML = '';
                window.google.accounts.id.renderButton(googleContainerRef.current, {
                    type: 'standard',
                    theme: isDark ? 'filled_black' : 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'pill',
                    width: googleContainerRef.current.offsetWidth || 340
                });
                setGoogleReady(true);
                return true;
            }
            return false;
        };

        // Retry until both Google SDK and DOM element are ready
        if (!tryInit()) {
            const checkInterval = setInterval(() => {
                if (tryInit()) {
                    clearInterval(checkInterval);
                }
            }, 200);
            return () => clearInterval(checkInterval);
        }
    }, [isLogin, isDark]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // ============================================
    // OTP Input Handlers
    // ============================================
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Only numbers
        const newOtp = [...otpCode];
        newOtp[index] = value.slice(-1); // Only last digit
        setOtpCode(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otpCode];
        for (let i = 0; i < 6; i++) {
            newOtp[i] = pasted[i] || '';
        }
        setOtpCode(newOtp);
        if (pasted.length >= 6) {
            otpRefs.current[5]?.focus();
        }
    };

    // ============================================
    // Submit Registration / Login
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validation for registration
        if (!isLogin) {
            if (!formData.email) {
                setError('Email là bắt buộc');
                setLoading(false);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError(t('passwordsNotMatch'));
                setLoading(false);
                return;
            }
            if (!formData.terms) {
                setError(t('mustAcceptTerms'));
                setLoading(false);
                return;
            }
        }

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const payload = isLogin
                ? { username: formData.email, password: formData.password }
                : {
                    username: formData.username || formData.email.split('@')[0],
                    password: formData.password,
                    fullName: formData.fullName,
                    email: formData.email
                };

            const { data } = await api.post(endpoint, payload);

            if (isLogin) {
                localStorage.setItem('token', data.token);
                onLoginSuccess(data.user);
            } else {
                // Show verification screen
                setVerificationEmail(formData.email);
                setShowVerification(true);
                setResendCooldown(60);
                setSuccess('');
            }
        } catch (err) {
            const errData = err.response?.data;
            // If login blocked due to unverified email
            if (errData?.requireVerification && errData?.email) {
                setVerificationEmail(errData.email);
                setShowVerification(true);
                setResendCooldown(0);
                setError('');
                return;
            }
            setError(errData?.error || t('authFailed'));
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Verify OTP Code
    // ============================================
    const handleVerifyOTP = async () => {
        const code = otpCode.join('');
        if (code.length !== 6) {
            setError('Vui lòng nhập đủ 6 số');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/auth/verify-email', { email: verificationEmail, code });
            setSuccess('Xác thực email thành công! Đang đăng nhập...');

            // Auto-login after verification
            setTimeout(async () => {
                try {
                    const { data } = await api.post('/auth/login', {
                        username: verificationEmail,
                        password: formData.password
                    });
                    localStorage.setItem('token', data.token);
                    onLoginSuccess(data.user);
                } catch {
                    setShowVerification(false);
                    setIsLogin(true);
                    setSuccess('Xác thực thành công! Vui lòng đăng nhập.');
                }
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Xác thực thất bại');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Resend verification code
    // ============================================
    const handleResendCode = async () => {
        if (resendCooldown > 0) return;

        try {
            await api.post('/auth/resend-code', { email: verificationEmail });
            setResendCooldown(60);
            setOtpCode(['', '', '', '', '', '']);
            setSuccess('Đã gửi lại mã xác thực!');
            setError('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể gửi lại mã');
        }
    };

    // ============================================
    // Forgot Password Handlers
    // ============================================
    const handleForgotOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...forgotOtp];
        newOtp[index] = value.slice(-1);
        setForgotOtp(newOtp);
        if (value && index < 5) {
            forgotOtpRefs.current[index + 1]?.focus();
        }
    };

    const handleForgotOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) {
            forgotOtpRefs.current[index - 1]?.focus();
        }
    };

    const handleForgotOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...forgotOtp];
        for (let i = 0; i < 6; i++) {
            newOtp[i] = pasted[i] || '';
        }
        setForgotOtp(newOtp);
        if (pasted.length >= 6) forgotOtpRefs.current[5]?.focus();
    };

    const handleForgotSendCode = async () => {
        if (!forgotEmail) {
            setError('Vui lòng nhập email');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
            setSuccess(data.message || 'Mã đặt lại đã được gửi đến email của bạn.');
            setForgotStep(2);
            setResendCooldown(60);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể gửi mã. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotVerifyCode = async () => {
        const code = forgotOtp.join('');
        if (code.length !== 6) {
            setError('Vui lòng nhập đủ 6 số');
            return;
        }
        // Move to step 3 (enter new password), we verify the code when submitting the new password
        setError('');
        setSuccess('');
        setForgotStep(3);
    };

    const handleForgotResetPassword = async () => {
        if (!forgotNewPassword || !forgotConfirmPassword) {
            setError('Vui lòng nhập mật khẩu mới');
            return;
        }
        if (forgotNewPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const code = forgotOtp.join('');
            const { data } = await api.post('/auth/reset-password', {
                email: forgotEmail,
                code,
                newPassword: forgotNewPassword
            });
            setSuccess(data.message || 'Đặt lại mật khẩu thành công!');
            // Auto go back to login after 2s
            setTimeout(() => {
                setShowForgotPassword(false);
                setForgotStep(1);
                setForgotEmail('');
                setForgotOtp(['', '', '', '', '', '']);
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setIsLogin(true);
                setError('');
                setSuccess('Đặt lại mật khẩu thành công! Hãy đăng nhập.');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Đặt lại mật khẩu thất bại');
            // If code is wrong/expired, go back to step 2
            if (err.response?.data?.error?.includes('Mã') || err.response?.data?.error?.includes('hết hạn')) {
                setForgotStep(2);
                setForgotOtp(['', '', '', '', '', '']);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResendCode = async () => {
        if (resendCooldown > 0) return;
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            setResendCooldown(60);
            setForgotOtp(['', '', '', '', '', '']);
            setSuccess('Đã gửi lại mã đặt lại mật khẩu!');
            setError('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể gửi lại mã');
        }
    };

    const closeForgotPassword = () => {
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotOtp(['', '', '', '', '', '']);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setError('');
        setSuccess('');
    };

    // ============================================
    // Forgot Password Screen
    // ============================================
    if (showForgotPassword) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-[#030712]' : 'bg-slate-100'} flex items-center justify-center p-4 relative overflow-hidden`}>
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]"></div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-8 sm:p-10 rounded-[32px] border relative z-10 ${isDark
                        ? 'bg-[#080c17]/80 border-slate-800/50 backdrop-blur-xl'
                        : 'bg-white/90 border-slate-200 backdrop-blur-xl shadow-2xl'
                        }`}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <img
                            src={isDark ? logo : logoLight}
                            alt="Recap1s"
                            className={`w-10 h-10 object-contain ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]' : 'mix-blend-multiply'}`}
                        />
                        <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Recap<span className="text-sky-500">1s</span>
                        </span>
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center"
                        >
                            <KeyRound size={36} className="text-amber-400" />
                        </motion.div>
                    </div>

                    <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {forgotStep === 1 ? 'Quên Mật Khẩu' : forgotStep === 2 ? 'Nhập Mã Xác Thực' : 'Đặt Mật Khẩu Mới'}
                    </h2>
                    <p className={`text-sm text-center mb-8 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        {forgotStep === 1
                            ? 'Nhập email để nhận mã đặt lại mật khẩu'
                            : forgotStep === 2
                                ? <>Chúng tôi đã gửi mã 6 số đến{' '}<strong className={isDark ? 'text-amber-400' : 'text-amber-600'}>{forgotEmail}</strong></>
                                : 'Nhập mật khẩu mới cho tài khoản của bạn'
                        }
                    </p>

                    {/* Step 1: Enter Email */}
                    {forgotStep === 1 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div>
                                <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>EMAIL</label>
                                <div className="relative mt-1">
                                    <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleForgotSendCode()}
                                        placeholder="your@email.com"
                                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all border ${isDark
                                            ? 'bg-slate-900/50 text-white border-slate-800 focus:border-amber-500 placeholder-slate-700'
                                            : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-500 placeholder-slate-400'
                                            } focus:ring-4 focus:ring-amber-500/10`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Enter OTP Code */}
                    {forgotStep === 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                                {forgotOtp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => forgotOtpRefs.current[index] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleForgotOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleForgotOtpKeyDown(index, e)}
                                        onPaste={index === 0 ? handleForgotOtpPaste : undefined}
                                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-xl outline-none transition-all border-2 ${isDark
                                            ? `bg-slate-900/50 text-white ${digit ? 'border-amber-500' : 'border-slate-800'} focus:border-amber-400`
                                            : `bg-slate-50 text-slate-900 ${digit ? 'border-amber-500' : 'border-slate-300'} focus:border-amber-500`
                                            } focus:ring-4 focus:ring-amber-500/10`}
                                    />
                                ))}
                            </div>

                            {/* Resend */}
                            <div className="text-center mb-4">
                                <button
                                    onClick={handleForgotResendCode}
                                    disabled={resendCooldown > 0}
                                    className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${resendCooldown > 0
                                        ? isDark ? 'text-slate-600' : 'text-slate-400'
                                        : 'text-amber-400 hover:text-amber-300'
                                        }`}
                                >
                                    <RefreshCw size={12} />
                                    {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi Lại Mã'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: New Password */}
                    {forgotStep === 3 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div>
                                <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>MẬT KHẨU MỚI</label>
                                <div className="relative mt-1">
                                    <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                                    <input
                                        type={showForgotNewPassword ? 'text' : 'password'}
                                        value={forgotNewPassword}
                                        onChange={(e) => setForgotNewPassword(e.target.value)}
                                        placeholder="Ít nhất 6 ký tự"
                                        className={`w-full pl-11 pr-12 py-3.5 rounded-xl text-sm font-medium outline-none transition-all border ${isDark
                                            ? 'bg-slate-900/50 text-white border-slate-800 focus:border-amber-500 placeholder-slate-700'
                                            : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-500 placeholder-slate-400'
                                            } focus:ring-4 focus:ring-amber-500/10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>XÁC NHẬN MẬT KHẨU</label>
                                <div className="relative mt-1">
                                    <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                                    <input
                                        type="password"
                                        value={forgotConfirmPassword}
                                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleForgotResetPassword()}
                                        placeholder="Nhập lại mật khẩu mới"
                                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all border ${isDark
                                            ? 'bg-slate-900/50 text-white border-slate-800 focus:border-amber-500 placeholder-slate-700'
                                            : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-500 placeholder-slate-400'
                                            } focus:ring-4 focus:ring-amber-500/10`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Error / Success */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 mt-4">
                                <AlertCircle size={14} className="shrink-0" /> {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 mt-4">
                                <CheckCircle2 size={14} className="shrink-0" /> {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action Button */}
                    <button
                        onClick={
                            forgotStep === 1 ? handleForgotSendCode
                            : forgotStep === 2 ? handleForgotVerifyCode
                            : handleForgotResetPassword
                        }
                        disabled={loading || (forgotStep === 2 && forgotOtp.join('').length !== 6)}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Đang xử lý...' : (
                            <>
                                {forgotStep === 1 && <><Mail size={18} /> Gửi Mã Xác Thực</>}
                                {forgotStep === 2 && <><ShieldCheck size={18} /> Xác Nhận Mã</>}
                                {forgotStep === 3 && <><KeyRound size={18} /> Đặt Lại Mật Khẩu</>}
                            </>
                        )}
                    </button>

                    {/* Step indicator */}
                    <div className="flex justify-center gap-2 mt-6">
                        {[1, 2, 3].map(step => (
                            <div
                                key={step}
                                className={`w-8 h-1 rounded-full transition-all ${step <= forgotStep
                                    ? 'bg-amber-500'
                                    : isDark ? 'bg-slate-800' : 'bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Back */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={forgotStep > 1 ? () => { setForgotStep(forgotStep - 1); setError(''); setSuccess(''); } : closeForgotPassword}
                            className={`text-xs font-bold ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors`}
                        >
                            ← {forgotStep > 1 ? 'Quay lại bước trước' : 'Quay lại đăng nhập'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ============================================
    // Verification Screen (OTP Input)
    // ============================================
    if (showVerification) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-[#030712]' : 'bg-slate-100'} flex items-center justify-center p-4 relative overflow-hidden`}>
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-full max-w-md p-8 sm:p-10 rounded-[32px] border relative z-10 ${isDark
                        ? 'bg-[#080c17]/80 border-slate-800/50 backdrop-blur-xl'
                        : 'bg-white/90 border-slate-200 backdrop-blur-xl shadow-2xl'
                        }`}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <img
                            src={isDark ? logo : logoLight}
                            alt="Recap1s"
                            className={`w-10 h-10 object-contain ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]' : 'mix-blend-multiply'}`}
                        />
                        <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Recap<span className="text-sky-500">1s</span>
                        </span>
                    </div>

                    {/* Mail Icon */}
                    <div className="flex justify-center mb-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className="w-20 h-20 rounded-full bg-sky-500/10 flex items-center justify-center"
                        >
                            <Mail size={36} className="text-sky-400" />
                        </motion.div>
                    </div>

                    <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Xác Thực Email
                    </h2>
                    <p className={`text-sm text-center mb-8 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        Chúng tôi đã gửi mã 6 số đến{' '}
                        <strong className={isDark ? 'text-sky-400' : 'text-sky-600'}>{verificationEmail}</strong>
                    </p>

                    {/* OTP Inputs */}
                    <div className="flex justify-center gap-2 sm:gap-3 mb-8">
                        {otpCode.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => otpRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                onPaste={index === 0 ? handleOtpPaste : undefined}
                                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-xl outline-none transition-all border-2 ${isDark
                                    ? `bg-slate-900/50 text-white ${digit ? 'border-sky-500' : 'border-slate-800'} focus:border-sky-400`
                                    : `bg-slate-50 text-slate-900 ${digit ? 'border-sky-500' : 'border-slate-300'} focus:border-sky-500`
                                    } focus:ring-4 focus:ring-sky-500/10`}
                            />
                        ))}
                    </div>

                    {/* Error / Success */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 mb-4">
                                <AlertCircle size={14} className="shrink-0" /> {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 mb-4">
                                <CheckCircle2 size={14} className="shrink-0" /> {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerifyOTP}
                        disabled={loading || otpCode.join('').length !== 6}
                        className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Đang xác thực...' : (
                            <>
                                <ShieldCheck size={18} />
                                Xác Thực
                            </>
                        )}
                    </button>

                    {/* Resend */}
                    <div className="mt-6 text-center">
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} mb-2`}>
                            Không nhận được mã?
                        </p>
                        <button
                            onClick={handleResendCode}
                            disabled={resendCooldown > 0}
                            className={`inline-flex items-center gap-1.5 text-sm font-bold transition-colors ${resendCooldown > 0
                                ? isDark ? 'text-slate-600' : 'text-slate-400'
                                : 'text-sky-400 hover:text-sky-300'
                                }`}
                        >
                            <RefreshCw size={14} />
                            {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi Lại Mã'}
                        </button>
                    </div>

                    {/* Back to login */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setShowVerification(false); setIsLogin(true); setError(''); setSuccess(''); }}
                            className={`text-xs font-bold ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors`}
                        >
                            ← Quay lại đăng nhập
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ============================================
    // Main Login / Register Form
    // ============================================
    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#030712]' : 'bg-slate-100'} text-white flex items-center justify-center p-4 lg:p-8 relative overflow-hidden`}>
            {/* Cosmic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>

            {/* Theme/Language Toggle - Top Right */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                <button
                    onClick={toggleTheme}
                    className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-200 text-slate-600 shadow-md'}`}
                    title={isDark ? t('lightMode') : t('darkMode')}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                    onClick={toggleLanguage}
                    className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-200 text-slate-600 shadow-md'}`}
                >
                    {language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                </button>
            </div>

            <div className={`w-full max-w-[1000px] flex flex-col lg:flex-row ${isDark ? 'bg-[#080c17]/80' : 'bg-white/90'} backdrop-blur-xl border ${isDark ? 'border-slate-800/50' : 'border-slate-200'} rounded-[32px] overflow-hidden shadow-2xl relative z-10`}>

                {/* Visual Side Panel */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 to-indigo-950 p-12 flex-col justify-between border-r border-slate-800/50">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors mr-2"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 flex items-center justify-center">
                                <img
                                    src={logo}
                                    alt="Recap1s Icon"
                                    className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(56,189,248,0.4)] mix-blend-screen"
                                />
                            </div>
                            <span className="text-3xl font-black tracking-tight text-white">Recap<span className="text-sky-400">1s</span></span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-4xl font-extrabold leading-tight mb-6 text-white">
                            ReCaptcha <br />
                            <span className="text-sky-400">Solver 1s</span>
                        </h2>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <ShieldCheck className="text-sky-400" size={18} /> {t('enterpriseSecurity')}
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <Zap className="text-sky-400" size={18} /> {t('distributedWorker')}
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                </motion.div>
                                {t('successRateAll')}
                            </li>
                        </ul>
                    </div>

                    <div className="pt-8 border-t border-slate-800/50 flex items-center justify-between">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('joinedByDevs')}</p>
                    </div>
                </div>

                {/* Form Side Panel */}
                <div className={`w-full lg:w-1/2 p-8 lg:p-14 overflow-y-auto max-h-[90vh] ${!isDark ? 'text-slate-800' : ''}`}>
                    <div className="mb-8">
                        {/* Mobile/Light Mode Logo inside Form Panel */}
                        <div className="lg:hidden flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 flex items-center justify-center">
                                <img
                                    src={isDark ? logo : logoLight}
                                    alt="Recap1s Icon"
                                    className={`w-full h-full object-contain ${isDark ? 'mix-blend-screen filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]' : 'mix-blend-multiply'}`}
                                />
                            </div>
                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Recap<span className="text-sky-500">1s</span>
                            </span>
                        </div>

                        {(!isLogin) && (
                            <button
                                onClick={() => { setIsLogin(true); setFormData(prev => ({ ...prev, email: prev.username })); }}
                                className={`flex items-center gap-2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors text-xs font-bold uppercase tracking-widest mb-6`}
                            >
                                <ChevronLeft size={14} /> {t('backToSignIn')}
                            </button>
                        )}
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                            {isLogin ? t('welcomeBack') : t('createAccount')}
                        </h1>
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-sm font-medium`}>
                            {isLogin ? t('loginDesc') : t('registerDesc')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? 'login-fields' : 'reg-fields'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                {!isLogin && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('fullName')}</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3 text-slate-500" size={16} />
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleInputChange}
                                                    placeholder="Nguyen Van A"
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('username')}</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-slate-500 text-sm font-bold">@</span>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    placeholder="username"
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{isLogin ? t('username') + ' / Email' : 'Email'}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3 text-slate-500" size={16} />
                                        <input
                                            type={isLogin ? 'text' : 'email'}
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder={isLogin ? 'username hoặc email' : 'email@example.com'}
                                            required
                                            className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('password')}</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-3 text-slate-500" size={16} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                required
                                                className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-12 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isLogin && (
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest`}>{t('confirmPassword')}</label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-4 top-3 text-slate-500" size={16} />
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    required={!isLogin}
                                                    className={`w-full ${isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {isLogin && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => { setShowForgotPassword(true); setError(''); setSuccess(''); }} className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline">{t('forgotPassword')}</button>
                            </div>
                        )}

                        {!isLogin && (
                            <div className="flex items-start gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    name="terms"
                                    checked={formData.terms}
                                    onChange={handleInputChange}
                                    className="mt-1 w-4 h-4 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                                />
                                <label htmlFor="terms" className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'} leading-normal cursor-pointer select-none`}>
                                    {t('agreeTerms')} <span className={`${isDark ? 'text-slate-300' : 'text-slate-800'} font-bold hover:underline`}>{t('termsOfService')}</span> {t('and')} <span className={`${isDark ? 'text-slate-300' : 'text-slate-800'} font-bold hover:underline`}>{t('privacyPolicy')}</span>.
                                </label>
                            </div>
                        )}

                        <div className="space-y-3 pt-4">
                            {error && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                                    <AlertCircle size={14} className="shrink-0" /> {error}
                                </motion.div>
                            )}

                            {success && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                    <CheckCircle2 size={14} className="shrink-0" /> {success}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || googleLoading}
                                className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? t('checking') : (
                                    <>
                                        {isLogin ? t('signInToConsole') : t('completeRegistration')}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            {/* Google Sign-In Divider & Button */}
                            {isLogin && (
                                <>
                                    <div className="flex items-center gap-4 my-2">
                                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                        <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>hoặc</span>
                                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                    </div>

                                    <div
                                        ref={googleContainerRef}
                                        className="w-full flex items-center justify-center"
                                        style={{ minHeight: '44px' }}
                                    ></div>

                                    {googleLoading && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            Đang xác thực...
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-sm font-medium`}>
                            {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}{' '}
                            <button
                                onClick={() => { const goingToLogin = !isLogin; setIsLogin(goingToLogin); if (goingToLogin) setFormData(prev => ({ ...prev, email: prev.username })); setError(''); setSuccess(''); }}
                                className={`${isDark ? 'text-white hover:text-sky-400' : 'text-sky-600 hover:text-sky-500'} font-bold underline decoration-sky-500/30 underline-offset-4 transition-colors`}
                            >
                                {isLogin ? t('signUp') : t('signIn')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
