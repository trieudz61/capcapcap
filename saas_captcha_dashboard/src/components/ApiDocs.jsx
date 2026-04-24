import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Book, Copy, CheckCircle2, Zap, Key, Clock, Code2, ArrowRight,
    Send, RotateCw, Wallet, AlertTriangle, Hash, Globe, Shield
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

// ============================================
// Code Block Component — with copy button
// ============================================
const CodeBlock = ({ code, lang = 'json', isDark }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className={`relative rounded-2xl overflow-hidden border ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-900 border-slate-700'}`}>
            <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-slate-800/50' : 'border-slate-700'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{lang}</span>
                <button onClick={copy} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-700'}`}>
                    {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />}
                </button>
            </div>
            <pre className={`p-4 text-[13px] font-mono overflow-x-auto leading-relaxed scrollbar-thin ${isDark ? 'text-slate-300' : 'text-slate-200'}`}>
                {code}
            </pre>
        </div>
    );
};

// ============================================
// Step Component
// ============================================
const Step = ({ number, title, children, isDark }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-black shrink-0">{number}</div>
            <div className={`flex-1 w-px mt-2 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        </div>
        <div className="pb-8 flex-1">
            <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
            {children}
        </div>
    </div>
);

const ApiDocs = ({ onBack, user }) => {
    const { t, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('quickstart');
    const [selectedLang, setSelectedLang] = useState('python');

    const apiKey = user?.api_key || 'YOUR_API_KEY';
    const apiBaseUrl = api.defaults.baseURL || 'https://api.recap1s.com';

    // ============================================
    // Navigation Tabs
    // ============================================
    const tabs = [
        { id: 'quickstart', label: 'Bắt Đầu', icon: <Zap size={16} /> },
        { id: 'endpoints', label: 'API Endpoints', icon: <Send size={16} /> },
        { id: 'examples', label: 'Code Mẫu', icon: <Code2 size={16} /> },
        { id: 'errors', label: 'Mã Lỗi', icon: <AlertTriangle size={16} /> },
    ];

    // ============================================
    // Code Examples
    // ============================================
    const codeExamples = {
        python: `import requests
import time

API_KEY = "${apiKey}"
API_URL = "${apiBaseUrl}"

def solve(task_type, website_url, website_key):
    """Giải captcha và trả về token"""

    # Bước 1: Tạo task
    res = requests.post(f"{API_URL}/captcha/createTask", json={
        "clientKey": API_KEY,
        "task": {
            "type": task_type,
            "websiteURL": website_url,
            "websiteKey": website_key
        }
    }).json()

    task_id = res["taskId"]
    print(f"✅ Task created: {task_id}")

    # Bước 2: Chờ kết quả
    while True:
        time.sleep(3)
        result = requests.post(f"{API_URL}/captcha/getTaskResult", json={
            "clientKey": API_KEY,
            "taskId": task_id
        }).json()

        if result["status"] == "ready":
            token = result["solution"].get("gRecaptchaResponse") \\
                    or result["solution"].get("token")
            print(f"🎉 Solved!")
            return token

# === Ví dụ sử dụng ===

# ReCaptcha V2
token = solve(
    "ReCaptchaV2TaskProxyless",
    "https://example.com/login",
    "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
)

# ReCaptcha V3 (invisible, score-based)
res = requests.post(f"{API_URL}/captcha/createTask", json={
    "clientKey": API_KEY,
    "task": {
        "type": "ReCaptchaV3TaskProxyless",
        "websiteURL": "https://example.com/login",
        "websiteKey": "6Le9HlYq...",
        "pageAction": "login"  # optional
    }
}).json()

# Cloudflare Turnstile
token = solve(
    "TurnstileTaskProxyless",
    "https://example.com",
    "0x4AAAAAAA..."
)`,
        nodejs: `const axios = require('axios');

const API_KEY = '${apiKey}';
const API_URL = '${apiBaseUrl}';

async function solve(taskType, websiteURL, websiteKey) {
    // Bước 1: Tạo task
    const { data } = await axios.post(\`\${API_URL}/captcha/createTask\`, {
        clientKey: API_KEY,
        task: { type: taskType, websiteURL, websiteKey }
    });

    console.log('✅ Task created:', data.taskId);

    // Bước 2: Chờ kết quả
    while (true) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: result } = await axios.post(
            \`\${API_URL}/captcha/getTaskResult\`,
            { clientKey: API_KEY, taskId: data.taskId }
        );

        if (result.status === 'ready') {
            const token = result.solution.gRecaptchaResponse
                       || result.solution.token;
            console.log('🎉 Solved!');
            return token;
        }
    }
}

// ReCaptcha V2
solve('ReCaptchaV2TaskProxyless', 'https://example.com', '6Le...');

// ReCaptcha V3 (pass pageAction in task)
await axios.post(\`\${API_URL}/captcha/createTask\`, {
    clientKey: API_KEY,
    task: { type: 'ReCaptchaV3TaskProxyless', websiteURL: 'https://example.com', websiteKey: '6Le...', pageAction: 'login' }
});

// Turnstile
solve('TurnstileTaskProxyless', 'https://example.com', '0x4AAA...');`,

        php: `<?php
$API_KEY = '${apiKey}';
$API_URL = '${apiBaseUrl}';

function solve($type, $url, $siteKey) {
    global $API_KEY, $API_URL;

    // Bước 1: Tạo task
    $ch = curl_init("$API_URL/captcha/createTask");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'clientKey' => $API_KEY,
            'task' => ['type' => $type, 'websiteURL' => $url, 'websiteKey' => $siteKey]
        ])
    ]);
    $res = json_decode(curl_exec($ch), true);
    echo "✅ Task: " . $res['taskId'] . "\\n";

    // Bước 2: Chờ kết quả
    while (true) {
        sleep(3);
        $ch = curl_init("$API_URL/captcha/getTaskResult");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode([
                'clientKey' => $API_KEY,
                'taskId' => $res['taskId']
            ])
        ]);
        $result = json_decode(curl_exec($ch), true);
        if ($result['status'] === 'ready') {
            return $result['solution']['gRecaptchaResponse']
                ?? $result['solution']['token'];
        }
    }
}

// Turnstile
$token = solve('TurnstileTaskProxyless', 'https://example.com', '0x4...');
?>`,

        curl: `# Bước 1: Tạo task
curl -X POST ${apiBaseUrl}/captcha/createTask \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientKey": "${apiKey}",
    "task": {
      "type": "TurnstileTaskProxyless",
      "websiteURL": "https://example.com",
      "websiteKey": "0x4AAAAAAA..."
    }
  }'

# Response: {"errorId":0,"taskId":"abc-123-def"}

# Bước 2: Lấy kết quả (lặp lại mỗi 3 giây)
curl -X POST ${apiBaseUrl}/captcha/getTaskResult \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientKey": "${apiKey}",
    "taskId": "abc-123-def"
  }'

# Response khi đang xử lý:
# {"errorId":0,"status":"processing"}

# Response khi hoàn thành:
# {"errorId":0,"status":"ready","solution":{"token":"0.xxx..."}}`,
    };

    return (
        <div className="space-y-6 min-h-screen pb-20">
            {/* Header */}
            <div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    📚 Tài Liệu API
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Hướng dẫn tích hợp Recap1s API vào dự án của bạn
                </p>
            </div>

            {/* Your API Key */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border ${isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200'}`}
            >
                <div className="flex items-center gap-2">
                    <Key size={18} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                    <span className={`text-sm font-bold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>API Key của bạn:</span>
                </div>
                <code className={`text-xs sm:text-sm font-mono font-bold px-3 py-1.5 rounded-lg truncate max-w-[180px] sm:max-w-none ${isDark ? 'bg-slate-900 text-sky-400' : 'bg-white text-sky-700 border border-sky-300 shadow-sm'}`}>
                    {apiKey}
                </code>
                <span className={`text-xs break-all ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                    Base URL: <code className={`font-mono break-all ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{apiBaseUrl}</code>
                </span>
            </motion.div>

            {/* Tab Navigation */}
            <div className={`flex gap-1 p-1 rounded-2xl overflow-x-auto ${isDark ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                            : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ============================================ */}
            {/* TAB: Quickstart */}
            {/* ============================================ */}
            {activeTab === 'quickstart' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    {/* How it works */}
                    <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <h3 className={`text-xl font-black mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Zap className="text-sky-500" size={22} />
                            Cách Hoạt Động
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[
                                { icon: <Send size={24} className="text-sky-500" />, title: 'Tạo Task', desc: 'Gửi request tạo task giải captcha với siteKey và URL', bg: 'bg-sky-500/10' },
                                { icon: <RotateCw size={24} className="text-amber-500" />, title: 'Chờ Kết Quả', desc: 'Poll API mỗi 3 giây để kiểm tra trạng thái', bg: 'bg-amber-500/10' },
                                { icon: <CheckCircle2 size={24} className="text-emerald-500" />, title: 'Nhận Token', desc: 'Nhận token captcha đã giải, sử dụng cho form submit', bg: 'bg-emerald-500/10' },
                            ].map((step, i) => (
                                <div key={i} className={`text-center p-6 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center mx-auto mb-4`}>
                                        {step.icon}
                                    </div>
                                    <div className={`text-xs font-black mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>BƯỚC {i + 1}</div>
                                    <h4 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{step.title}</h4>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{step.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Quick Example */}
                        <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>🚀 Ví dụ nhanh (3 bước):</h4>

                        <Step number="1" title="Tạo task giải captcha" isDark={isDark}>
                            <CodeBlock isDark={isDark} lang="POST /captcha/createTask" code={`{
  "clientKey": "${apiKey}",
  "task": {
    "type": "TurnstileTaskProxyless",
    "websiteURL": "https://example.com",
    "websiteKey": "0x4AAAAAAA..."
  }
}`} />
                            <div className={`mt-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                → Trả về: <code className={isDark ? 'text-emerald-400' : 'text-emerald-600 font-bold'}>{`{"errorId": 0, "taskId": "abc-123"}`}</code>
                            </div>
                        </Step>

                        <Step number="2" title="Lấy kết quả (poll mỗi 3 giây)" isDark={isDark}>
                            <CodeBlock isDark={isDark} lang="POST /captcha/getTaskResult" code={`{
  "clientKey": "${apiKey}",
  "taskId": "abc-123"
}`} />
                            <div className={`mt-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                → Đang xử lý: <code className={isDark ? 'text-amber-400' : 'text-amber-600 font-bold'}>{`{"status": "processing"}`}</code><br/>
                                → Hoàn thành: <code className={isDark ? 'text-emerald-400' : 'text-emerald-600 font-bold'}>{`{"status": "ready", "solution": {"token": "0.xxx..."}}`}</code>
                            </div>
                        </Step>

                        <Step number="3" title="Sử dụng token" isDark={isDark}>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Dùng token nhận được để submit form hoặc gửi request đến trang web mục tiêu.
                            </p>
                        </Step>
                    </div>

                    {/* Supported Types */}
                    <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <h3 className={`text-xl font-black mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Shield className="text-emerald-500" size={22} />
                            Loại Captcha Hỗ Trợ
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                {
                                    name: 'ReCaptcha V2',
                                    type: 'ReCaptchaV2TaskProxyless',
                                    solutionKey: 'solution.gRecaptchaResponse',
                                    speed: '2-3s',
                                    price: '$0.0005/solve',
                                    icon: '🔵',
                                },
                                {
                                    name: 'ReCaptcha V3',
                                    type: 'ReCaptchaV3TaskProxyless',
                                    solutionKey: 'solution.gRecaptchaResponse',
                                    speed: '< 1s',
                                    price: '$0.001/solve',
                                    icon: '🟢',
                                    isNew: true
                                },
                                {
                                    name: 'Turnstile (Cloudflare)',
                                    type: 'TurnstileTaskProxyless',
                                    solutionKey: 'solution.token',
                                    speed: '2-4s',
                                    price: '$0.0008/solve',
                                    icon: '🟠',
                                },
                            ].map((item, i) => (
                                <div key={i} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">{item.icon}</span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</h4>
                                                {item.isNew && <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full">NEW</span>}
                                            </div>
                                            <code className={`text-xs font-mono ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{item.type}</code>
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-3 gap-3 text-xs pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <div>
                                            <span className={`block font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tốc độ</span>
                                            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>⚡ {item.speed}</span>
                                        </div>
                                        <div>
                                            <span className={`block font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Giá</span>
                                            <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{item.price}</span>
                                        </div>
                                        <div>
                                            <span className={`block font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Trả về</span>
                                            <code className={`text-[10px] ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{item.solutionKey}</code>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ============================================ */}
            {/* TAB: Endpoints */}
            {/* ============================================ */}
            {activeTab === 'endpoints' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* createTask */}
                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${isDark ? 'bg-sky-500/10 text-sky-500' : 'bg-sky-100 text-sky-700'}`}>POST</span>
                                <code className={`text-base font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>/captcha/createTask</code>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Tạo task giải captcha mới. Trả về <code className={isDark ? 'text-sky-400' : 'text-sky-600 font-bold'}>taskId</code> để poll kết quả.
                            </p>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Parameters Table */}
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Parameters</h4>
                                <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={isDark ? 'bg-slate-950' : 'bg-slate-100'}>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tham số</th>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kiểu</th>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mô tả</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                            {[
                                                { name: 'clientKey', type: 'string', desc: 'API Key của bạn', req: true },
                                                { name: 'task.type', type: 'string', desc: '"ReCaptchaV2TaskProxyless", "ReCaptchaV3TaskProxyless" hoặc "TurnstileTaskProxyless"', req: true },
                                                { name: 'task.websiteURL', type: 'string', desc: 'URL trang web chứa captcha', req: true },
                                                { name: 'task.websiteKey', type: 'string', desc: 'Sitekey của captcha trên trang web', req: true },
                                                { name: 'task.pageAction', type: 'string', desc: 'Action name cho ReCaptcha V3 (ví dụ: "login", "submit")', req: false },
                                            ].map(p => (
                                                <tr key={p.name} className={isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                                                    <td className="px-4 py-3">
                                                        <code className={`font-bold font-mono text-xs ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{p.name}</code>
                                                        {p.req && <span className="ml-2 text-rose-500 text-[10px] font-bold">*</span>}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{p.type}</td>
                                                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.desc}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Request / Response side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📤 Request</h4>
                                    <CodeBlock isDark={isDark} code={`{
  "clientKey": "YOUR_API_KEY",
  "task": {
    "type": "TurnstileTaskProxyless",
    "websiteURL": "https://example.com",
    "websiteKey": "0x4AAAAAAA..."
  }
}`} />
                                </div>
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📥 Response</h4>
                                    <CodeBlock isDark={isDark} code={`{
  "errorId": 0,
  "taskId": "550e8400-e29b-41d4-a716-446655440000"
}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* getTaskResult */}
                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${isDark ? 'bg-sky-500/10 text-sky-500' : 'bg-sky-100 text-sky-700'}`}>POST</span>
                                <code className={`text-base font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>/captcha/getTaskResult</code>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Lấy kết quả giải captcha. Poll mỗi <strong>3-5 giây</strong> cho đến khi <code className={isDark ? 'text-emerald-400' : 'text-emerald-600 font-bold'}>status = "ready"</code>.
                            </p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Parameters</h4>
                                <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={isDark ? 'bg-slate-950' : 'bg-slate-100'}>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tham số</th>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kiểu</th>
                                                <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mô tả</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                            <tr className={isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                                                <td className="px-4 py-3"><code className={`font-bold font-mono text-xs ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>clientKey</code><span className="ml-2 text-rose-500 text-[10px] font-bold">*</span></td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>string</td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>API Key của bạn</td>
                                            </tr>
                                            <tr className={isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                                                <td className="px-4 py-3"><code className={`font-bold font-mono text-xs ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>taskId</code><span className="ml-2 text-rose-500 text-[10px] font-bold">*</span></td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>string</td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Task ID nhận từ createTask</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📤 Request</h4>
                                    <CodeBlock isDark={isDark} code={`{
  "clientKey": "YOUR_API_KEY",
  "taskId": "550e8400-e29b-41d4..."
}`} />
                                </div>
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📥 Response (hoàn thành)</h4>
                                    <CodeBlock isDark={isDark} code={`// ReCaptcha
{
  "errorId": 0,
  "status": "ready",
  "solution": {
    "gRecaptchaResponse": "03AGdBq25..."
  }
}

// Turnstile
{
  "errorId": 0,
  "status": "ready",
  "solution": {
    "token": "0.M7QiEr9N..."
  }
}`} />
                                </div>
                            </div>

                            {/* Important Note */}
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-300'}`}>
                                <p className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>💡 Lưu ý quan trọng:</p>
                                <ul className={`text-xs mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                                    <li>• <strong>ReCaptcha</strong> → token nằm trong <code className={isDark ? 'text-amber-400' : 'text-amber-700 font-bold'}>solution.gRecaptchaResponse</code></li>
                                    <li>• <strong>Turnstile</strong> → token nằm trong <code className={isDark ? 'text-amber-400' : 'text-amber-700 font-bold'}>solution.token</code></li>
                                    <li>• Nếu <code className={isDark ? 'text-sky-400' : 'text-sky-600 font-bold'}>status = "processing"</code> → đợi 3s rồi poll lại</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* getBalance */}
                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-black ${isDark ? 'bg-sky-500/10 text-sky-500' : 'bg-sky-100 text-sky-700'}`}>POST</span>
                                <code className={`text-base font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>/captcha/getBalance</code>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Kiểm tra số dư tài khoản hiện tại.
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📤 Request</h4>
                                    <CodeBlock isDark={isDark} code={`{
  "clientKey": "YOUR_API_KEY"
}`} />
                                </div>
                                <div>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>📥 Response</h4>
                                    <CodeBlock isDark={isDark} code={`{
  "errorId": 0,
  "balance": 99.5000
}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ============================================ */}
            {/* TAB: Code Examples */}
            {/* ============================================ */}
            {activeTab === 'examples' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        {/* Language Tabs */}
                        <div className={`flex overflow-x-auto border-b ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                            {[
                                { id: 'python', label: '🐍 Python' },
                                { id: 'nodejs', label: '🟢 Node.js' },
                                { id: 'php', label: '🐘 PHP' },
                                { id: 'curl', label: '🔧 cURL' },
                            ].map(lang => (
                                <button
                                    key={lang.id}
                                    onClick={() => setSelectedLang(lang.id)}
                                    className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${selectedLang === lang.id
                                        ? isDark ? 'border-sky-500 text-sky-400 bg-sky-500/5' : 'border-sky-500 text-sky-600 bg-sky-50'
                                        : isDark ? 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>

                        {/* Code */}
                        <div className="p-6">
                            <CodeBlock isDark={isDark} lang={selectedLang} code={codeExamples[selectedLang]} />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ============================================ */}
            {/* TAB: Error Codes */}
            {/* ============================================ */}
            {activeTab === 'errors' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'}`}>
                        <h3 className={`text-xl font-black mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <AlertTriangle className="text-amber-500" size={22} />
                            Bảng Mã Lỗi
                        </h3>

                        <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={isDark ? 'bg-slate-950' : 'bg-slate-100'}>
                                        <th className={`text-left px-4 py-3 text-xs font-bold w-20 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mã</th>
                                        <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tên</th>
                                        <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Mô tả</th>
                                        <th className={`text-left px-4 py-3 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cách xử lý</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {[
                                        { code: 0, name: 'SUCCESS', desc: 'Thành công, không có lỗi', fix: 'Không cần xử lý', ok: true },
                                        { code: 1, name: 'ERROR_KEY_DOES_NOT_EXIST', desc: 'API Key không hợp lệ', fix: 'Kiểm tra lại API Key trong Dashboard' },
                                        { code: 2, name: 'ERROR_ZERO_BALANCE', desc: 'Số dư không đủ', fix: 'Nạp thêm tiền vào tài khoản' },
                                        { code: 3, name: 'ERROR_CAPTCHA_UNSOLVABLE', desc: 'Không thể giải captcha', fix: 'Thử lại sau hoặc kiểm tra siteKey/URL' },
                                        { code: 10, name: 'ERROR_BAD_REQUEST', desc: 'Request không hợp lệ', fix: 'Kiểm tra format JSON và các tham số bắt buộc' },
                                        { code: 12, name: 'ERROR_TASK_NOT_FOUND', desc: 'Task ID không tồn tại', fix: 'Kiểm tra taskId, task có thể đã hết hạn' },
                                        { code: 21, name: 'ERROR_TASK_EXPIRED', desc: 'Task đã hết thời gian', fix: 'Tạo task mới và thử lại' },
                                    ].map(e => (
                                        <tr key={e.code} className={isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${e.ok
                                                    ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                                    : isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                                                    {e.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{e.name}</code>
                                            </td>
                                            <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{e.desc}</td>
                                            <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{e.fix}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Tip */}
                        <div className={`mt-6 p-4 rounded-xl border ${isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200'}`}>
                            <p className={`text-xs font-bold ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                                💡 Mẹo: Luôn kiểm tra <code className={isDark ? 'text-sky-400' : 'text-sky-700'}>errorId</code> trong response. Nếu <code className={isDark ? 'text-sky-400' : 'text-sky-700'}>errorId = 0</code> → request thành công. Nếu khác 0 → xem <code className={isDark ? 'text-sky-400' : 'text-sky-700'}>errorDescription</code> để biết chi tiết.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ApiDocs;
