import React, { useState, useEffect } from 'react';
import { db } from '../../../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import IOSPage from '../../../components/AppWindow/IOSPage';

const APIPage = ({ onBack }) => {
    // 状态管理
    const [name, setName] = useState('My API'); // 预设名称
    const [config, setConfig] = useState({
        endpoint: '',
        apiKey: '',
        model: 'gpt-4-turbo',
        temperature: 0.7 // 默认 0.7
    });

    const [modelList, setModelList] = useState([]); // 从 API 获取的模型列表
    const [fetchingModels, setFetchingModels] = useState(false);
    const [saving, setSaving] = useState(false);

    // 读取所有已保存的预设
    const presets = useLiveQuery(() => db.apiConfigs.toArray()) || [];
    // 读取当前激活的 API ID
    const activeApiId = useLiveQuery(() => db.settings.get('active_api_id'));

    // 初始化：自动加载当前激活的配置
    useEffect(() => {
        const init = async () => {
            const activeId = await db.settings.get('active_api_id');
            if (activeId?.value) {
                const preset = await db.apiConfigs.get(activeId.value);
                if (preset) {
                    loadPreset(preset);
                    现
                }
            }
        };
        init();
    }, []); // 仅挂载时执行一次

    // 加载某个预设
    const loadPreset = (preset) => {
        setName(preset.name);
        setConfig({
            endpoint: preset.endpoint,
            apiKey: preset.apiKey,
            model: preset.model || 'gpt-3.5-turbo',
            temperature: preset.temperature ?? 0.7,
        });
    };

    // 获取模型列表
    const fetchModels = async () => {
        if (!config.endpoint || !config.apiKey) {
            alert('请先填写 Endpoint 和 API Key');
            return;
        }
        setFetchingModels(true);
        try {
            // 构造请求，适配大部分 OpenAI 兼容接口
            const url = config.endpoint.replace(/\/+$/, '') + '/models'; // 确保没有多余斜杠并拼接 /models
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();

            if (data.data && Array.isArray(data.data)) {
                // OpenAI 格式: { data: [{id: '...'}, ...] }
                const models = data.data.map(m => m.id).sort();
                setModelList(models);
                if (models.length > 0 && !models.includes(config.model)) {
                    // 如果当前填的模型不在列表里，提示一下，但不强制覆盖，防止用户用微调模型
                    // setConfig(prev => ({ ...prev, model: models[0] })); 
                }
                alert(`成功读取 ${models.length} 个模型！请点击下拉框选择。`);
            } else {
                throw new Error('格式不兼容或无数据');
            }
        } catch (e) {
            alert('读取失败: ' + e.message + '\n请检查 Endpoint/Key 是否正确，或手动填写模型名称。');
        } finally {
            setFetchingModels(false);
        }
    };

    // 激活当前预设
    const handleActivate = async () => {
        if (!config.endpoint || !config.apiKey) {
            alert('请先填写 Endpoint 和 API Key 才能激活哦');
            return;
        }
        // 先保存当前配置确保是最新的
        const id = await handleSave(true); // 让 handleSave 返回 ID
        if (id) {
            await db.settings.put({ key: 'active_api_id', value: id });
            alert(`已激活预设: ${name} 🟢`);
        }
    };

    // 保存当前配置 (silent: 是否静默保存不弹窗)
    const handleSave = async (silent = false) => {
        if (!name.trim()) return alert('请给预设起个名字');

        setSaving(true);
        try {
            // 使用 name 作为唯一标识的一种简单方式，或者生成 uuid
            // 这里为了简单，如果 name 相同就覆盖
            const existing = presets.find(p => p.name === name);
            const id = existing ? existing.id : Date.now().toString();

            await db.apiConfigs.put({
                id,
                name,
                ...config
            });
            if (!silent) setTimeout(() => setSaving(false), 500);
            return id;
        } catch (e) {
            console.error(e);
            setSaving(false);
            return null;
        }
    };

    // 测试连接
    const handleTest = async () => {
        if (!config.endpoint || !config.apiKey) return alert('请先完善配置');

        const btn = document.getElementById('test-btn');
        const originalText = btn.innerText;
        btn.innerText = '连接中...';

        try {
            // 尝试发送一个极简的 Chat 请求
            const url = config.endpoint.replace(/\/+$/, '') + '/chat/completions';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                })
            });

            if (res.ok) {
                alert('连接成功！API 工作正常。💚');
            } else {
                const err = await res.text();
                throw new Error(err);
            }
        } catch (e) {
            alert('连接失败: ' + e.message);
        } finally {
            btn.innerText = originalText;
        }
    };

    // 删除当前选中的预设
    const handleDelete = async () => {
        const existing = presets.find(p => p.name === name);
        if (existing) {
            if (confirm(`确定删除预设 "${name}" 吗？`)) {
                await db.apiConfigs.delete(existing.id);
                // 如果删除的是当前激活的，清除激活状态
                if (activeApiId?.value === existing.id) {
                    await db.settings.delete('active_api_id');
                }
                // 重置
                setName('New Preset');
                setConfig({ endpoint: '', apiKey: '', model: '', temperature: 0.7 });
            }
        }
    };

    // 检查是否是当前激活的有效配置
    const isActive = presets.find(p => p.name === name)?.id === activeApiId?.value && config.endpoint && config.apiKey;

    return (
        <IOSPage title="大脑连接" onBack={onBack}>
            <div className="p-5 pb-24 space-y-6">

                {/* 预设切换区 */}
                {presets.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                        {presets.map(p => {
                            const isThisActive = activeApiId?.value === p.id;
                            const isSelected = name === p.name;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => loadPreset(p)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-transparent'}`}
                                >
                                    {isThisActive && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                    {p.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm border border-gray-50/50 dark:border-white/5 space-y-5 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">连接配置</h3>
                            {/* 如果当前配置对应的预设是激活状态，显示标记 */}
                            {isActive && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">已激活使用中</span>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button id="test-btn" onClick={handleTest} className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
                                ⚡️ 测试连接
                            </button>
                            {presets.find(p => p.name === name) && (
                                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-500 transition-colors">删除</button>
                            )}
                        </div>
                    </div>

                    {/* 预设名称 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">预设名称 (Preset Name)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-500"
                            placeholder="例如: GPT-4 Official"
                        />
                    </div>

                    {/* Endpoint */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">API Endpoint</label>
                        <input
                            type="text"
                            value={config.endpoint}
                            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-mono text-sm"
                            placeholder="https://api.openai.com/v1 (请粘贴地址)"
                        />
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">API Key</label>
                        <input
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-mono text-sm"
                            placeholder="sk-..."
                        />
                    </div>

                    <div className="w-full h-px bg-gray-100 dark:bg-[#2C2C2E] my-2"></div>

                    {/* Model Selector & Fetcher */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">模型 (Model)</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setModelList([])}
                                    disabled={modelList.length === 0}
                                    className={`text-xs transition-colors ${modelList.length === 0 ? 'text-gray-300 dark:text-gray-600 cursor-default' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                >
                                    {modelList.length === 0 ? '当前为手动' : '切换回手动'}
                                </button>
                                <button
                                    onClick={fetchModels}
                                    disabled={fetchingModels}
                                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 active:scale-95 transition-transform flex items-center gap-1"
                                >
                                    {fetchingModels ? '读取中...' : '📡 读取模型列表'}
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full">
                            {/* 只有当成功获取到模型列表时，才显示下拉框，否则显示输入框 */}
                            {modelList.length > 0 ? (
                                <div className="relative w-full">
                                    <select
                                        value={config.model}
                                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                        className="w-full block bg-gray-50 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all font-mono text-sm appearance-none"
                                    >
                                        <option value="" disabled>请选择模型...</option>
                                        {modelList.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={config.model}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-500 font-mono text-sm"
                                    placeholder="例如: gpt-4-turbo"
                                />
                            )}
                        </div>
                    </div>

                    {/* Temperature Slider */}
                    <div>
                        <div className="flex items-center justify-between mb-2 ml-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">随机性 (Temperature): {config.temperature}</label>
                            <span className="text-xs text-gray-400">{config.temperature < 0.3 ? '严谨' : config.temperature > 1.0 ? '狂野' : '平衡'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={config.temperature}
                            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 px-1 mt-1">
                            <span>0.0 (精准)</span>
                            <span>1.0 (创意)</span>
                            <span>2.0 (癫狂)</span>
                        </div>
                    </div>

                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        className={`flex-1 py-3.5 rounded-xl font-semibold shadow-sm transition-all border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-200 active:scale-95`}
                    >
                        {saving ? '保存中...' : '仅保存'}
                    </button>
                    <button
                        onClick={handleActivate}
                        className={`flex-1 py-3.5 rounded-xl font-semibold shadow-sm transition-all bg-gray-900 dark:bg-blue-600 text-white active:scale-95`}
                    >
                        保存并激活
                    </button>
                </div>

                <div className="px-4 text-center">
                    {isActive ? (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            当前系统正在使用此配置连接大脑
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            点击“保存并激活”以应用此大脑。
                        </p>
                    )}
                </div>
            </div>
        </IOSPage>
    );
};

export default APIPage;
