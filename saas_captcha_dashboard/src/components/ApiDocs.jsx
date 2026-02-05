import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Book,
    Copy,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Zap,
    Key,
    Shield,
    Clock,
    ArrowLeft,
    ExternalLink,
    Code2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';

const ApiDocs = ({ onBack, user }) => {
    const { t, isDark } = useTheme();
    const [copiedCode, setCopiedCode] = useState(null);
    const [expandedSections, setExpandedSections] = useState(['getting-started', 'create-task']);
    const [selectedLang, setSelectedLang] = useState('nodejs');

    const apiKey = user?.api_key || 'YOUR_API_KEY';
    const apiBaseUrl = api.defaults.baseURL || 'https://makeup-brake-ids-functioning.trycloudflare.com';

    const codeExamples = {
        nodejs: `const axios = require('axios');

async function solveCaptcha() {
    // 1. Create Task
    const { data } = await axios.post('${apiBaseUrl}/captcha/createTask', {
        clientKey: '${apiKey}',
        task: {
            type: 'ReCaptchaV2TaskProxyless',
            websiteURL: 'https://example.com',
            websiteKey: '6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-'
        }
    });

    console.log('Task Created:', data.taskId);
    
    // 2. Poll for Result
    // (Implement polling logic here)
}`,
        python: `import requests
import time

API_KEY = '${apiKey}'
API_URL = '${apiBaseUrl}'

def solve_captcha():
    # 1. Create Task
    payload = {
        "clientKey": API_KEY,
        "task": {
            "type": "ReCaptchaV2TaskProxyless",
            "websiteURL": "https://example.com",
            "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-"
        }
    }
    
    resp = requests.post(f"{API_URL}/captcha/createTask", json=payload).json()
    task_id = resp['taskId']
    print(f"Task Created: {task_id}")

    # 2. Get Result
    while True:
        result = requests.post(f"{API_URL}/captcha/getTaskResult", json={
            "clientKey": API_KEY,
            "taskId": task_id
        }).json()
        
        if result['status'] == 'ready':
            print("Solved:", result['solution']['gRecaptchaResponse'])
            break
        time.sleep(2)

solve_captcha()`,

        php: `<?php
$apiKey = '${apiKey}';
$apiUrl = '${apiBaseUrl}';

// 1. Create Task
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$apiUrl/captcha/createTask");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "clientKey" => $apiKey,
    "task" => [
        "type" => "ReCaptchaV2TaskProxyless",
        "websiteURL" => "https://example.com",
        "websiteKey" => "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-"
    ]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);

$response = json_decode(curl_exec($ch), true);
$taskId = $response['taskId'];
echo "Task Created: " . $taskId . "\\n";

// 2. Poll for Result (Loop implementation needed)
?>`,
        java: `import okhttp3.*;
import org.json.JSONObject;

public class CaptchaSolver {
    public static void main(String[] args) throws Exception {
        OkHttpClient client = new OkHttpClient();
        String apiKey = "${apiKey}";

        // 1. Create Task
        JSONObject json = new JSONObject();
        json.put("clientKey", apiKey);
        JSONObject task = new JSONObject();
        task.put("type", "ReCaptchaV2TaskProxyless");
        task.put("websiteURL", "https://example.com");
        task.put("websiteKey", "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-");
        json.put("task", task);

        RequestBody body = RequestBody.create(json.toString(), MediaType.get("application/json"));
        Request request = new Request.Builder()
            .url("${apiBaseUrl}/captcha/createTask")
            .post(body)
            .build();
            
        Response response = client.newCall(request).execute();
        System.out.println(response.body().string());
    }
}`,
        go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    apiKey := "${apiKey}"
    
    // Payload
    values := map[string]interface{}{
        "clientKey": apiKey,
        "task": map[string]string{
            "type":       "ReCaptchaV2TaskProxyless",
            "websiteURL": "https://example.com",
            "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
        },
    }
    jsonData, _ := json.Marshal(values)

    // Request
    resp, _ := http.Post("${apiBaseUrl}/captcha/createTask", "application/json", bytes.NewBuffer(jsonData))
    
    fmt.Println("Response Status:", resp.Status)
}`,
        csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        var client = new HttpClient();
        var apiKey = "${apiKey}";
        
        var json = "{\\"clientKey\\":\\"" + apiKey + "\\", \\"task\\": {\\"type\\":\\"ReCaptchaV2TaskProxyless\\", \\"websiteURL\\":\\"https://example.com\\", \\"websiteKey\\":\\"6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-\\"}}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync("${apiBaseUrl}/captcha/createTask", content);
        var responseString = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine(responseString);
    }
}`
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const toggleSection = (id) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const endpoints = [
        {
            id: 'create-task',
            method: 'POST',
            path: '/captcha/createTask',
            title: 'Create Task',
            description: 'Submit a new captcha solving task to the queue. Returns a taskId that you will use to retrieve the result.',
            request: `{
  "clientKey": "YOUR_API_KEY",
  "task": {
    "type": "ReCaptchaV2TaskProxyless",
    "websiteURL": "https://example.com",
    "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-"
  }
}`,
            response: `{
  "errorId": 0,
  "taskId": "uuid-task-id-here"
}`,
            params: [
                { name: 'clientKey', type: 'string', required: true, desc: 'Your API key from the dashboard' },
                { name: 'task.type', type: 'string', required: true, desc: 'Task type (see Pricing table below)' },
                { name: 'task.websiteURL', type: 'string', required: true, desc: 'Full URL of the target page with captcha' },
                { name: 'task.websiteKey', type: 'string', required: true, desc: 'reCAPTCHA/hCaptcha site key (found in page source)' }
            ]
        },
        {
            id: 'get-result',
            method: 'POST',
            path: '/captcha/getTaskResult',
            title: 'Get Task Result',
            description: 'Poll this endpoint to get the result of your task. Keep polling until status is "ready" or you get an error.',
            request: `{
  "clientKey": "YOUR_API_KEY",
  "taskId": "uuid-task-id-here"
}`,
            response: `{
  "errorId": 0,
  "status": "ready",
  "solution": {
    "gRecaptchaResponse": "03AGdBq25SxXT..."
  }
}`,
            params: [
                { name: 'clientKey', type: 'string', required: true, desc: 'Your API key' },
                { name: 'taskId', type: 'string', required: true, desc: 'Task ID received from createTask' }
            ],
            notes: [
                'Poll every 3-5 seconds until status is "ready"',
                'If status is "processing", the task is still being solved',
                'Solution contains the captcha token to submit to the target site'
            ]
        },
        {
            id: 'get-balance',
            method: 'POST',
            path: '/captcha/getBalance',
            title: 'Get Balance',
            description: 'Check your current account balance.',
            request: `{
  "clientKey": "YOUR_API_KEY"
}`,
            response: `{
  "errorId": 0,
  "balance": 99.50
}`,
            params: [
                { name: 'clientKey', type: 'string', required: true, desc: 'Your API key' }
            ]
        }
    ];



    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>{t('apiDocsTitle') || 'Recap1s Documentation'}</h2>
                    <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-sm font-medium`}>{t('apiDocsDesc') || 'API Documentation for high-speed captcha solving'}</p>
                </div>
                <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded font-bold">v1.0</span>
                    <span>Base URL: {apiBaseUrl}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Sidebar Navigation */}
                <nav className="lg:col-span-3 space-y-6">
                    <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-xs font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-4 px-4`}>{t('navigation')}</h3>
                        <ul className="space-y-1">
                            <li><a href="#getting-started" className={`block px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-sky-600'}`}>{t('gettingStarted')}</a></li>
                            <li><a href="#endpoints" className={`block px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-sky-600'}`}>{t('endpoints')}</a></li>

                            <li><a href="#error-codes" className={`block px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-sky-600'}`}>{t('errorCodes')}</a></li>
                        </ul>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="lg:col-span-9 space-y-16">
                    {/* Getting Started */}
                    <section id="getting-started">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-sky-500/10 rounded-xl">
                                    <Book className="text-sky-500" size={24} />
                                </div>
                                <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('gettingStarted')}</h2>
                            </div>

                            <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-8 leading-relaxed font-medium`}>
                                Recap1s API allows you to solve various types of CAPTCHAs programmatically.
                                This documentation covers all available endpoints and their usage.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40'}`}>
                                    <Key className="text-sky-500 mb-4" size={28} />
                                    <h4 className={`font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('apiKey')}</h4>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>{t('apiKeyDocsDesc') || 'Get your key from the dashboard'}</p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40'}`}>
                                    <Shield className="text-emerald-500 mb-4" size={28} />
                                    <h4 className={`font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Secure</h4>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>All requests over HTTPS</p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40'}`}>
                                    <Clock className="text-amber-500 mb-4" size={28} />
                                    <h4 className={`font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Fast</h4>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>Average 1-3s solve time</p>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Quick Example */}
                    <section>
                        <h3 className={`text-lg font-black mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Code2 className="text-sky-500" size={22} />
                            Integration Examples
                        </h3>

                        <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#0f172a] border-slate-800 shadow-2xl'}`}>
                            {/* Language Tabs */}
                            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/50">
                                {[
                                    { id: 'nodejs', label: 'Node.js', icon: 'JS' },
                                    { id: 'python', label: 'Python', icon: 'PY' },
                                    { id: 'php', label: 'PHP', icon: 'PHP' },
                                    { id: 'java', label: 'Java', icon: 'JV' },
                                    { id: 'go', label: 'Go', icon: 'GO' },
                                    { id: 'csharp', label: 'C#', icon: 'C#' },
                                ].map(lang => (
                                    <button
                                        key={lang.id}
                                        onClick={() => setSelectedLang(lang.id)}
                                        className={`px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${selectedLang === lang.id
                                            ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                                            : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>

                            {/* Code Area */}
                            <div className="p-6 relative">
                                <div className="absolute top-6 right-6 z-10">
                                    <button
                                        onClick={() => copyCode(codeExamples[selectedLang], selectedLang)}
                                        className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title="Copy Code"
                                    >
                                        {copiedCode === selectedLang ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                                    </button>
                                </div>
                                <pre className="text-sm font-mono overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 pb-2">
                                    <code className={selectedLang === 'python' ? 'text-emerald-300' : selectedLang === 'php' ? 'text-purple-300' : 'text-sky-300'}>
                                        {codeExamples[selectedLang]}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    </section>

                    {/* Endpoints */}
                    <section id="endpoints">
                        <h2 className={`text-2xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>API Endpoints</h2>
                        <div className="space-y-6">
                            {endpoints.map(ep => (
                                <div key={ep.id} className={`rounded-3xl border overflow-hidden transition-all ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 hover:shadow-xl hover:shadow-slate-200/50'}`}>
                                    <button
                                        onClick={() => toggleSection(ep.id)}
                                        className={`w-full p-6 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <span className={`px-3.5 py-1 rounded-lg text-[10px] font-black tracking-widest ${ep.method === 'POST' ? 'bg-sky-500/10 text-sky-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {ep.method}
                                            </span>
                                            <code className={`text-sm font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{ep.path}</code>
                                            <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-xs font-bold hidden md:inline uppercase tracking-widest`}>— {ep.title}</span>
                                        </div>
                                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                                            {expandedSections.includes(ep.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </div>
                                    </button>

                                    {expandedSections.includes(ep.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className={`border-t p-8 space-y-8 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
                                        >
                                            <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ep.description}</p>

                                            {/* Parameters */}
                                            <div>
                                                <h4 className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em] mb-4`}>Body Parameters</h4>
                                                <div className="space-y-2.5">
                                                    {ep.params.map(p => (
                                                        <div key={p.name} className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <code className="text-sky-500 text-sm font-black font-mono">{p.name}</code>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/50 text-slate-500'} uppercase`}>{p.type}</span>
                                                            </div>
                                                            {p.required && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Required</span>}
                                                            <span className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'} md:ml-auto`}>{p.desc}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Request/Response */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>Request Body</h4>
                                                        <button onClick={() => copyCode(ep.request, `req-${ep.id}`)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                                            {copiedCode === `req-${ep.id}` ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                                                        </button>
                                                    </div>
                                                    <pre className={`p-5 rounded-3xl text-xs font-mono overflow-x-auto leading-relaxed ${isDark ? 'bg-slate-950 text-emerald-400 border border-slate-800' : 'bg-[#1e293b] text-emerald-400 shadow-2xl shadow-indigo-500/10'}`}>{ep.request}</pre>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>Example Response</h4>
                                                        <button onClick={() => copyCode(ep.response, `res-${ep.id}`)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                                            {copiedCode === `res-${ep.id}` ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                                                        </button>
                                                    </div>
                                                    <pre className={`p-5 rounded-3xl text-xs font-mono overflow-x-auto leading-relaxed ${isDark ? 'bg-slate-950 text-amber-400 border border-slate-800' : 'bg-[#1e293b] text-amber-400 shadow-2xl shadow-indigo-500/10'}`}>{ep.response}</pre>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>



                    {/* Error Codes */}
                    <section id="error-codes">
                        <h2 className={`text-2xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('errorCodes')}</h2>
                        <div className={`p-8 rounded-[32px] border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'} space-y-4`}>
                            {[
                                { code: 0, msg: 'Success - No error' },
                                { code: 1, msg: 'ERROR_KEY_DOES_NOT_EXIST - Invalid API key' },
                                { code: 2, msg: 'ERROR_ZERO_BALANCE - Insufficient balance' },
                                { code: 3, msg: 'ERROR_CAPTCHA_UNSOLVABLE - Failed to solve' },
                                { code: 12, msg: 'ERROR_TASKID_DOES_NOT_EXIST - Invalid task ID' }
                            ].map(e => (
                                <div key={e.code} className={`flex items-center gap-5 p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800 hover:bg-slate-900/50' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40'}`}>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${e.code === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {e.code}
                                    </span>
                                    <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{e.msg}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default ApiDocs;
