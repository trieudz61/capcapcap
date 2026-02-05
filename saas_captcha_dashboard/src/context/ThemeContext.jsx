import React, { createContext, useContext, useState, useEffect } from 'react';

// Translations
const translations = {
    vi: {
        // Sidebar
        overview: 'Tổng quan',
        apiKeys: 'API Keys',
        usageLogs: 'Lịch sử',
        billing: 'Thanh toán',
        pricing: 'Bảng giá',
        apiDocs: 'Tài liệu API',
        settings: 'Cài đặt',
        adminConsole: 'Admin Console',
        balance: 'Số dư',
        depositCredits: 'Nạp tiền',
        logout: 'Đăng xuất',
        trial: 'Trải nghiệm',
        trialDesc: 'Dành cho tài khoản mới, 100 lần thử miễn phí.',
        siteKey: 'Site Key',
        pageUrl: 'URL Trang',
        getToken: 'Lấy Token',
        resultToken: 'Kết quả Token',
        solving: 'Đang giải...',
        support: 'Hỗ trợ',

        // Dashboard
        dashboard: 'Dashboard',
        globalRegion: 'Vùng toàn cầu',
        welcome: 'Xin chào',
        apiStatusOnline: 'API: Hoạt động',
        totalSolves: 'Tổng solves',
        totalSpent: 'Đã chi',
        successRate: 'Tỷ lệ thành công',
        accountBalance: 'Số dư tài khoản',
        allTime: 'Tất cả',
        creditsUsed: 'Credits đã dùng',
        taskCompletion: 'Hoàn thành task',
        availableCredit: 'Credit khả dụng',
        solvingPerformance: 'Hiệu suất giải',
        weeklyActivity: 'Hoạt động tuần',
        apiAccess: 'Truy cập API',
        mainApiToken: 'API Token chính',
        rotateKey: 'Đổi Key',
        recentActivity: 'Hoạt động gần đây',
        refresh: 'Làm mới',
        noActivity: 'Chưa có hoạt động. Bắt đầu giải thôi!',

        // API Keys Page
        apiKeysTitle: 'Quản lý API Keys',
        apiKeysDesc: 'Quản lý API Key để sử dụng dịch vụ giải captcha.',
        productionApiKey: 'Production API Key',
        keyForProduction: 'Key chính được sử dụng cho production',
        yourApiKey: 'API Key của bạn',
        generateNewKey: 'Tạo Key Mới',
        securityTips: 'Bảo mật API Key',
        securityTip1: 'Không chia sẻ API Key với bất kỳ ai. Key bị lộ có thể bị lạm dụng.',
        securityTip2: 'Rotate key định kỳ (30-90 ngày) để đảm bảo an toàn.',
        securityTip3: 'Lưu trữ key trong biến môi trường (environment variables), không hardcode.',
        usageExample: 'Ví dụ sử dụng',

        // Usage Logs Page
        usageLogsTitle: 'Lịch sử sử dụng',
        usageLogsDesc: 'Lịch sử tất cả các yêu cầu giải captcha của bạn.',
        all: 'Tất cả',
        success: 'Thành công',
        failed: 'Thất bại',
        pending: 'Đang xử lý',
        searchTaskId: 'Tìm kiếm task ID...',
        noActivityYet: 'Chưa có hoạt động nào',
        requestsWillAppear: 'Các yêu cầu giải captcha sẽ xuất hiện ở đây',
        showing: 'Hiển thị',

        // Billing Page
        billingTitle: 'Thanh toán & Giao dịch',
        billingDesc: 'Quản lý số dư và lịch sử giao dịch của bạn.',
        currentBalance: 'Số dư hiện tại',
        totalSpentBilling: 'Tổng chi tiêu',
        totalSolvesBilling: 'Tổng solves',
        topUpToContinue: 'Nạp thêm để tiếp tục sử dụng',
        topUp: 'Nạp tiền',
        quickTopUp: 'Gói nạp nhanh',
        popular: 'Phổ biến',
        bonus: 'thưởng',
        transactionHistory: 'Lịch sử giao dịch',
        noTransactions: 'Chưa có giao dịch nào',
        deposit: 'Nạp tiền',
        enterAmount: 'Nhập số tiền bạn muốn nạp',
        cancel: 'Hủy',
        confirm: 'Xác nhận',

        // Settings Page
        settingsTitle: 'Cài đặt',
        settingsDesc: 'Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn.',
        profile: 'Hồ sơ',
        security: 'Bảo mật',
        notifications: 'Thông báo',
        preferences: 'Tùy chọn',
        fullName: 'Họ tên',
        username: 'Tên đăng nhập',
        saveChanges: 'Lưu thay đổi',
        saving: 'Đang lưu...',
        saved: 'Đã lưu!',
        changePassword: 'Đổi mật khẩu',
        updatePasswordDesc: 'Cập nhật mật khẩu để bảo vệ tài khoản',
        currentPassword: 'Mật khẩu hiện tại',
        newPassword: 'Mật khẩu mới',
        confirmPassword: 'Xác nhận mật khẩu',
        emailNotifications: 'Email thông báo',
        emailNotificationsDesc: 'Nhận email về hoạt động tài khoản',
        apiAlerts: 'Cảnh báo API',
        apiAlertsDesc: 'Thông báo khi có lỗi hoặc balance thấp',
        darkMode: 'Chế độ tối',
        darkModeDesc: 'Giao diện tối',
        lightMode: 'Chế độ sáng',
        lightModeDesc: 'Giao diện sáng',
        language: 'Ngôn ngữ',
        dangerZone: 'Vùng nguy hiểm',
        deleteAccount: 'Xóa tài khoản',

        // Auth
        login: 'Đăng nhập',
        register: 'Đăng ký',
        welcomeBack: 'Chào mừng trở lại',
        loginDesc: 'Đăng nhập để tiếp tục sử dụng dịch vụ',
        createAccount: 'Tạo tài khoản',
        registerDesc: 'Bắt đầu hành trình với CapSolver Pro',
        password: 'Mật khẩu',
        termsOfService: 'Điều khoản dịch vụ',
        privacyPolicy: 'Chính sách bảo mật',
        agreeTerms: 'Tôi đồng ý với',
        and: 'và',
        alreadyHaveAccount: 'Đã có tài khoản?',
        dontHaveAccount: 'Chưa có tài khoản?',
        signUp: 'Đăng ký ngay',
        signIn: 'Đăng nhập',
        signInToConsole: 'Đăng nhập',
        completeRegistration: 'Hoàn tất đăng ký',
        checking: 'Đang xử lý...',
        backToSignIn: 'Quay lại đăng nhập',
        forgotPassword: 'Quên mật khẩu?',
        passwordsNotMatch: 'Mật khẩu không khớp',
        mustAcceptTerms: 'Bạn phải đồng ý với điều khoản dịch vụ',
        accountCreated: 'Tạo tài khoản thành công! Bạn có thể đăng nhập ngay.',
        authFailed: 'Đăng nhập thất bại. Vui lòng thử lại.',
        joinedByDevs: 'Tin dùng bởi 10k+ Devs',
        enterpriseSecurity: 'Bảo mật cấp doanh nghiệp',
        distributedWorker: 'Hệ thống phân tán (1ms latency)',
        successRateAll: 'Tỷ lệ thành công 99.9%',

        // Pricing Page
        pricingTitle: 'Bảng giá / Nhiệm vụ',
        pricingSubtitle: 'Mức giá cạnh tranh cho giải pháp giải captcha tốc độ cao',
        premiumRates: 'Giá ưu đãi cho giải pháp ReCaptcha',
        reCaptchaService: 'Dịch vụ ReCaptcha',
        getStarted: 'Bắt đầu ngay',
        rc2ProxylessDesc: 'Google reCAPTCHA v2 không cần proxy',
        rc2ProxylessFeat1: 'Tốc độ cao',
        rc2ProxylessFeat2: 'Không cần Proxy',
        rc2ProxylessFeat3: '99.9% Thành công',
        rc2ProxyDesc: 'Google reCAPTCHA v2 sử dụng proxy riêng',
        rc2ProxyFeat1: 'Hỗ trợ Proxy riêng',
        rc2ProxyFeat2: 'Tương thích Enterprise',
        rc2ProxyFeat3: 'Ổn định',
        rc3ProxylessDesc: 'Google reCAPTCHA v3 ẩn',
        rc3ProxylessFeat1: 'V3 Ẩn (Invisible)',
        rc3ProxylessFeat2: 'Điểm cao (0.7-0.9)',
        rc3ProxylessFeat3: 'Token tức thì',
    },
    en: {
        // Sidebar
        overview: 'Overview',
        apiKeys: 'API Keys',
        usageLogs: 'Usage Logs',
        billing: 'Billing',
        pricing: 'Pricing',
        apiDocs: 'API Docs',
        settings: 'Settings',
        adminConsole: 'Admin Console',
        balance: 'Balance',
        depositCredits: 'Deposit Credits',
        logout: 'Logout',
        trial: 'Trial',
        trialDesc: 'For new accounts, 100 free requests.',
        siteKey: 'Site Key',
        pageUrl: 'Page URL',
        getToken: 'Get Token',
        resultToken: 'Result Token',
        solving: 'Solving...',
        support: 'Support',

        // Dashboard
        dashboard: 'Dashboard',
        globalRegion: 'Global Region',
        welcome: 'Welcome',
        apiStatusOnline: 'API Status: Online',
        totalSolves: 'Total Solves',
        totalSpent: 'Total Spent',
        successRate: 'Success Rate',
        accountBalance: 'Account Balance',
        allTime: 'All time',
        creditsUsed: 'Credits used',
        taskCompletion: 'Task completion',
        availableCredit: 'Available credit',
        solvingPerformance: 'Solving Performance',
        weeklyActivity: 'Weekly activity breakdown',
        apiAccess: 'API Access',
        mainApiToken: 'Main API Token',
        rotateKey: 'Rotate Key',
        recentActivity: 'Recent Activity',
        refresh: 'Refresh',
        noActivity: 'No activity yet. Start solving!',

        // API Keys Page
        apiKeysTitle: 'API Keys',
        apiKeysDesc: 'Manage your API Key for Recap1s captcha solving service.',
        productionApiKey: 'Production API Key',
        keyForProduction: 'Main key used for production',
        yourApiKey: 'Your API Key',
        generateNewKey: 'Generate New Key',
        securityTips: 'API Key Security',
        securityTip1: 'Never share your API Key with anyone. Exposed keys can be abused.',
        securityTip2: 'Rotate key regularly (30-90 days) for security.',
        securityTip3: 'Store key in environment variables, never hardcode.',
        usageExample: 'Usage Example',

        // Usage Logs Page
        usageLogsTitle: 'Usage Logs',
        usageLogsDesc: 'History of all your captcha solving requests.',
        all: 'All',
        success: 'Success',
        failed: 'Failed',
        pending: 'Pending',
        searchTaskId: 'Search task ID...',
        noActivityYet: 'No activity yet',
        requestsWillAppear: 'Captcha solving requests will appear here',
        showing: 'Showing',

        // Billing Page
        billingTitle: 'Billing & Payments',
        billingDesc: 'Manage your balance and transaction history.',
        currentBalance: 'Current Balance',
        totalSpentBilling: 'Total Spent',
        totalSolvesBilling: 'Total Solves',
        topUpToContinue: 'Top up to continue using',
        topUp: 'Top Up',
        quickTopUp: 'Quick Top Up',
        popular: 'Popular',
        bonus: 'bonus',
        transactionHistory: 'Transaction History',
        noTransactions: 'No transactions yet',
        deposit: 'Deposit',
        enterAmount: 'Enter the amount you want to deposit',
        cancel: 'Cancel',
        confirm: 'Confirm',

        // Settings Page
        settingsTitle: 'Settings',
        settingsDesc: 'Manage your account and customize your experience.',
        profile: 'Profile',
        security: 'Security',
        notifications: 'Notifications',
        preferences: 'Preferences',
        fullName: 'Full Name',
        username: 'Username',
        saveChanges: 'Save Changes',
        saving: 'Saving...',
        saved: 'Saved!',
        changePassword: 'Change Password',
        updatePasswordDesc: 'Update your password to protect your account',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        emailNotifications: 'Email Notifications',
        emailNotificationsDesc: 'Receive emails about account activity',
        apiAlerts: 'API Alerts',
        apiAlertsDesc: 'Notifications when errors occur or balance is low',
        darkMode: 'Dark Mode',
        darkModeDesc: 'Dark interface',
        lightMode: 'Light Mode',
        lightModeDesc: 'Light interface',
        language: 'Language',
        dangerZone: 'Danger Zone',
        deleteAccount: 'Delete Account',

        // Auth
        login: 'Login',
        register: 'Register',
        welcomeBack: 'Welcome Back',
        loginDesc: 'Sign in to continue using the service',
        createAccount: 'Create Account',
        registerDesc: 'Start your journey with CapSolver Pro',
        password: 'Password',
        termsOfService: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        agreeTerms: 'I agree to the',
        and: 'and',
        alreadyHaveAccount: 'Already have an account?',
        dontHaveAccount: "Don't have an account?",
        signUp: 'Sign Up',
        signIn: 'Sign In',
        signInToConsole: 'Sign In to Console',
        completeRegistration: 'Complete Registration',
        checking: 'Checking...',
        backToSignIn: 'Back to Sign In',
        forgotPassword: 'Forgot password?',
        passwordsNotMatch: 'Passwords do not match',
        mustAcceptTerms: 'You must accept the terms of service',
        accountCreated: 'Account created! You can now sign in.',
        authFailed: 'Authentication failed. Please try again.',
        joinedByDevs: 'Joined by 10k+ Devs',
        enterpriseSecurity: 'Enterprise-grade security protocols',
        distributedWorker: 'Distributed worker system (1ms latency)',
        successRateAll: '99.9% Success rate across all tasks',

        // Pricing Page
        pricingTitle: 'Pricing / Task',
        pricingSubtitle: 'Competitive rates for high-speed captcha solving',
        premiumRates: 'Premium Rates for ReCaptcha Solutions',
        reCaptchaService: 'ReCaptcha Service',
        getStarted: 'Get Started',
        rc2ProxylessDesc: 'Google reCAPTCHA v2 without proxy',
        rc2ProxylessFeat1: 'High Speed',
        rc2ProxylessFeat2: 'No Proxy Needed',
        rc2ProxylessFeat3: '99.9% Success',
        rc2ProxyDesc: 'Google reCAPTCHA v2 with your proxy',
        rc2ProxyFeat1: 'Custom Proxy Support',
        rc2ProxyFeat2: 'Enterprise Compatible',
        rc2ProxyFeat3: 'Stable',
        rc3ProxylessDesc: 'Google reCAPTCHA v3 invisible',
        rc3ProxylessFeat1: 'Invisible V3',
        rc3ProxylessFeat2: 'High Score (0.7-0.9)',
        rc3ProxylessFeat3: 'Instant Token',
    }
};

// Theme Context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved || 'dark';
    });

    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('language');
        return saved || 'vi';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('light-theme', theme === 'light');
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    const toggleLanguage = () => setLanguage(l => l === 'vi' ? 'en' : 'vi');

    const t = (key) => translations[language]?.[key] || key;

    return (
        <ThemeContext.Provider value={{
            theme,
            setTheme,
            toggleTheme,
            language,
            setLanguage,
            toggleLanguage,
            t,
            isDark: theme === 'dark',
            isVietnamese: language === 'vi'
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
