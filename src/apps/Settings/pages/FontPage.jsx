import React, { useState } from 'react';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { useTheme } from '../../../context/ThemeContext';

const FontPage = ({ onBack }) => {
    const { currentFont, applyFont, savedFonts, addSavedFont, deleteSavedFont, fontSize, setFontSize, saveFontSize } = useTheme();
    const [customUrl, setCustomUrl] = useState('');
    const [importName, setImportName] = useState(''); // Name for saving
    const [customCode, setCustomCode] = useState('');
    const [familyName, setFamilyName] = useState('');

    const presetFonts = [
        { name: 'System Default', value: 'Inter, system-ui, sans-serif' },
        { name: 'Serif Elegant', value: 'Georgia, Cambria, "Times New Roman", serif' },
        { name: 'Mono Code', value: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
        { name: 'Rounded', value: '"Varela Round", "Arial Rounded MT Bold", sans-serif' },
    ];

    // Combine Presets + Saved Fonts
    // Saved fonts from DB have { id, name, source, type }
    // We map them to config format expected by applyFont
    const allFonts = [
        ...presetFonts,
        ...(savedFonts || []).map(f => ({
            id: f.id,
            name: f.name,
            value: f.type === 'code' ? `"${f.familyName}", sans-serif` : "'CustomSysFont', sans-serif",
            source: f.source,
            type: f.type,
            code: f.code,
            familyName: f.familyName,
            isSaved: true
        }))
    ];

    const autoExtractFamily = (code) => {
        if (!code) return;
        // Search for font-family: "Name" or font-family: Name
        // Updated regex to be more robust across multi-lines
        const regex = /font-family\s*:\s*["']?([^"';\r\n{]+)["']?/i;
        const match = code.match(regex);
        if (match && match[1]) {
            const detected = match[1].trim();
            // Basic cleanup: remove common fallbacks like , sans-serif
            const primaryName = detected.split(',')[0].replace(/["']/g, '').trim();
            setFamilyName(primaryName);
            // Also try to guess a font name if importName is empty
            if (!importName) setImportName(primaryName);
        }
    };

    const handleApplyAndSave = async (source, type) => {
        if (!source) return;
        const nameToSave = importName.trim() || `Custom Font ${savedFonts.length + 1}`;

        // 1. Save to DB
        const fontToSave = {
            name: nameToSave,
            source: source,
            type: type,
            code: type === 'code' ? source : undefined,
            familyName: type === 'code' ? familyName : undefined
        };
        await addSavedFont(fontToSave);

        // 2. Apply immediately
        const newFont = {
            name: nameToSave,
            value: type === 'code' ? `"${familyName}", sans-serif` : "'CustomSysFont', sans-serif",
            source: source,
            type: type,
            code: type === 'code' ? source : undefined,
            familyName: type === 'code' ? familyName : undefined
        };
        applyFont(newFont);

        alert(`已保存并应用字体: ${nameToSave}`);
        setImportName('');
        setCustomUrl('');
        setCustomCode('');
        setFamilyName('');
    };

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        handleApplyAndSave(customUrl, 'web');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target.result;
            // result is data:font/ttf;base64,....
            handleApplyAndSave(result, 'local');
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('确定要删除这个字体吗？')) {
            await deleteSavedFont(id);
            // If current font was deleted, reverting logic not enforced for simplicity
        }
    };

    return (
        <IOSPage title="字体管理" onBack={onBack}>
            <div className="p-4 space-y-6 pb-20">

                {/* Current Font Preview */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm text-center">
                    <div className="text-4xl font-bold dark:text-white mb-2" style={{ fontFamily: currentFont.value }}>
                        直到幸福触手可及
                    </div>
                    <p className="text-gray-500 text-sm">当前: {currentFont.name}</p>
                </div>

                {/* Font List */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase ml-2">字体库</h3>
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
                        {allFonts.map((font, idx) => (
                            <button
                                key={font.id || font.name}
                                onClick={() => applyFont(font)}
                                className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors group"
                            >
                                <div className="flex flex-col">
                                    <span className="dark:text-white font-medium">{font.name}</span>
                                    {font.isSaved && <span className="text-[10px] text-gray-400">用户导入</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    {currentFont.name === font.name ? (
                                        <span className="text-blue-500 font-bold">✓</span>
                                    ) : null}

                                    {font.isSaved && (
                                        <div
                                            onClick={(e) => handleDelete(e, font.id)}
                                            className="p-1.5 rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font Size Slider */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold dark:text-white">全局字号</h3>
                        <span className="text-blue-500 font-bold">{fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400">A</span>
                        <input
                            type="range"
                            min="12"
                            max="24"
                            step="1"
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            onMouseUp={() => saveFontSize(fontSize)} // Save on release
                            onTouchEnd={() => saveFontSize(fontSize)}
                            className="flex-1 accent-blue-500 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-lg text-gray-900 dark:text-white">A</span>
                    </div>
                    <p className="text-xs text-gray-400">调整后将实时应用到所有页面。</p>
                </div>

                {/* Import Area */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold dark:text-white">导入新字体</h3>

                    {/* Name Input */}
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">字体名称 (选填)</label>
                        <input
                            type="text"
                            placeholder="给字体起个名字 (e.g. 优雅宋体)"
                            className="w-full bg-gray-100 dark:bg-black rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white"
                            value={importName}
                            onChange={e => setImportName(e.target.value)}
                        />
                    </div>

                    {/* Method 1: URL */}
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">方式 A: 网络链接 (URL)</label>
                        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="https://..."
                                className="w-full bg-gray-100 dark:bg-black rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white"
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                            />
                            <button type="submit" disabled={!customUrl} className="w-full bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
                                保存并应用
                            </button>
                        </form>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-300">
                        <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
                        OR
                        <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
                    </div>

                    {/* Method 2: Code Injection (Swapped to B) */}
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">方式 B: 代码注入 (HTML/CSS)</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="字体家族名称 自动注入 禁止修改"
                                className="w-full bg-gray-100 dark:bg-black rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white"
                                value={familyName}
                                onChange={e => setFamilyName(e.target.value)}
                            />
                            <textarea
                                placeholder='示例: <link rel="stylesheet" href="..." /> <style>body{ font-family: "..." }</style>'
                                className="w-full h-32 bg-gray-100 dark:bg-black rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white resize-none"
                                value={customCode}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCustomCode(val);
                                    autoExtractFamily(val);
                                }}
                            />
                            <button
                                onClick={() => handleApplyAndSave(customCode, 'code')}
                                disabled={!customCode || !familyName}
                                className="w-full bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                            >
                                注入并应用
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-300">
                        <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
                        OR
                        <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
                    </div>

                    {/* Method 3: Local File (Swapped to C) */}
                    <div className="pb-4">
                        <label className="text-xs text-gray-400 mb-1 block">方式 C: 本地文件 (ttf/otf/woff)</label>
                        <label className="flex w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-3 items-center gap-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors">
                            <div className="bg-white dark:bg-[#2C2C2E] p-2 rounded-lg text-gray-500">
                                📁
                            </div>
                            <span className="text-sm text-gray-500">选择文件...</span>
                            <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

            </div>
        </IOSPage>
    );
};

export default FontPage;
