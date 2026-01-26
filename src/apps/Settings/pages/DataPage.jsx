import React, { useState, useEffect } from 'react';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';
import { BackIcon, DataIcon } from '../icons';

const DataPage = ({ onBack }) => {
    const [usage, setUsage] = useState('计算中...');
    const [debugInfo, setDebugInfo] = useState(''); // 新增调试信息
    const [importing, setImporting] = useState(false);

    const [lastUpdated, setLastUpdated] = useState(new Date());

    const calculateUsage = async () => {
        let usedBytes = 0;
        let logs = [];
        logs.push(`Time: ${new Date().toLocaleTimeString()}`);

        // 1. Native API Check
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                logs.push(`Native: ${(estimate.usage / 1024).toFixed(1)}KB`);
                if (estimate.usage > 0) usedBytes = estimate.usage;
            } catch (e) {
                logs.push(`NativeErr: ${e.name}`);
            }
        } else {
            logs.push('Native: N/A');
        }

        // 2. Manual Calculation (Always run to correct iOS under-reporting)
        try {
            // A. Dexie
            let dbSize = 0;
            let fileCount = 0;
            if (!db.tables || db.tables.length === 0) {
                logs.push('DB: No Tables Found');
            } else {
                for (const table of db.tables) {
                    try {
                        const count = await table.count();
                        if (count > 0) {
                            const allItems = await table.toArray();
                            let tableBytes = 0;
                            // Helper to calc size
                            const calcSize = (item) => {
                                if (!item) return 0;
                                if (item instanceof Blob) return item.size;
                                if (typeof item === 'string') return item.length * 2;
                                if (typeof item === 'object') {
                                    let s = 0;
                                    for (let k in item) {
                                        if (Object.prototype.hasOwnProperty.call(item, k)) {
                                            s += k.length * 2;
                                            s += calcSize(item[k]);
                                        }
                                    }
                                    return s;
                                }
                                return 8; // number/bool
                            };

                            for (const item of allItems) tableBytes += calcSize(item);

                            dbSize += tableBytes;
                            fileCount += count;
                            logs.push(`T[${table.name}]:${count}|${(tableBytes / 1024).toFixed(0)}KB`);
                        }
                    } catch (te) {
                        logs.push(`TErr[${table.name}]: ${te.message}`);
                    }
                }
            }

            // B. LocalStorage
            let lsSize = 0;
            let lsKeys = [];
            for (let x in localStorage) {
                if (localStorage.hasOwnProperty(x)) {
                    const size = ((localStorage[x].length + x.length) * 2);
                    lsSize += size;
                    lsKeys.push(x);
                }
            }
            if (lsSize > 0) {
                logs.push(`LS: ${(lsSize / 1024).toFixed(1)}KB`);
            }

            // TOTAL MANUAL
            const manualTotal = dbSize + lsSize;
            logs.push(`ManualTotal: ${(manualTotal / 1024).toFixed(1)}KB`);

            // CRITICAL FIX: Use the larger of the two
            // iOS often reports ~4KB native while DB has 100KB+. 
            if (manualTotal > usedBytes) {
                usedBytes = manualTotal;
                logs.push('Used Manual (Native was smaller)');
            } else {
                logs.push('Used Native');
            }

        } catch (e) {
            logs.push(`ManualErr: ${e.message}`);
        }

        const usedMB = (usedBytes / 1024 / 1024).toFixed(2);
        setUsage(`${usedMB} MB`);
        setDebugInfo(logs.join('\n'));
        setLastUpdated(new Date());
    };

    useEffect(() => {
        calculateUsage();
    }, []);

    // Helper: Blob to Base64
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                resolve({
                    __type: 'blob',
                    data: base64,
                    mime: blob.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Helper: Base64 to Blob
    const base64ToBlob = (base64, mime) => {
        const arr = base64.split(',');
        const bstr = atob(arr[1]); // Decode base64
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    // Serialize: Data -> JSON-ready Object (Convert Blobs to Base64)
    const serializeData = async (data) => {
        if (data instanceof Blob) {
            return await blobToBase64(data);
        } else if (Array.isArray(data)) {
            return Promise.all(data.map(item => serializeData(item)));
        } else if (typeof data === 'object' && data !== null) {
            const result = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    result[key] = await serializeData(data[key]);
                }
            }
            return result;
        }
        return data; // Primitive types pass through
    };

    // Deserialize: JSON Object -> Data (Convert Base64 objects back to Blobs)
    const deserializeData = (data) => {
        if (Array.isArray(data)) {
            return data.map(item => deserializeData(item));
        } else if (typeof data === 'object' && data !== null) {
            if (data.__type === 'blob') {
                return base64ToBlob(data.data, data.mime);
            }
            const result = {};
            for (const key in data) {
                result[key] = deserializeData(data[key]);
            }
            return result;
        }
        return data;
    };

    const handleExport = async () => {
        try {
            const data = {};
            for (const table of db.tables) {
                const rawData = await table.toArray();
                data[table.name] = await serializeData(rawData);
            }

            // Format JSON with indentation for readability (optional, but nice)
            const jsonString = JSON.stringify(data, null, 2);
            const blobData = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blobData);

            const a = document.createElement('a');
            a.href = url;
            a.download = `hoshino_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出失败: ' + e.message);
            console.error('Export Error:', e);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('警告：导入将覆盖当前所有数据！建议先导出当前数据备份。是否继续？')) {
            e.target.value = ''; // Reset input to allow re-selection of same file
            return;
        }

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonText = event.target.result;
                const rawData = JSON.parse(jsonText);
                const restoredData = deserializeData(rawData);

                await db.transaction('rw', db.tables, async () => {
                    // Smart Restoration: Only import tables that exist in current DB schema
                    // This prevents errors if importing from a backup with unknown tables
                    for (const table of db.tables) {
                        if (restoredData[table.name]) {
                            await table.clear();
                            await table.bulkAdd(restoredData[table.name]);
                        }
                    }
                });
                alert('数据恢复成功！请刷新页面以加载新数据。');
                setImporting(false);
                window.location.reload(); // Auto-reload to apply changes safely
            } catch (err) {
                console.error('Import Error:', err);
                alert('导入失败：文件格式错误或数据损坏');
                setImporting(false);
            }
        };
        reader.onerror = () => {
            alert('读取文件失败');
            setImporting(false);
        };
        reader.readAsText(file);

        // Reset input value
        e.target.value = '';
    };

    const [showDebug, setShowDebug] = useState(false);

    return (
        <IOSPage title="数据存储" onBack={onBack} backIcon={<BackIcon size={20} />}>
            <div className="p-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50/50 text-center">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DataIcon size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{usage}</h2>
                    <p className="text-gray-500 text-sm mt-1">本地存储已占用</p>

                    {/* Debug Info Display (Collapsible) */}
                    <div className="mt-4">
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className="text-xs text-blue-500/80 mb-2 flex items-center justify-center gap-1 mx-auto active:opacity-50"
                        >
                            <span>{showDebug ? '隐藏详细诊断' : '显示详细诊断'}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transform transition-transform ${showDebug ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>

                        {showDebug && (
                            <div className="p-2 bg-gray-50 rounded text-[10px] text-gray-400 font-mono break-all leading-tight text-left">
                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-gray-200/50">
                                    <span className="font-bold">诊断日志</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(debugInfo);
                                                alert('已复制到剪贴板');
                                            }}
                                            className="text-green-500"
                                        >
                                            复制
                                        </button>
                                        <button onClick={calculateUsage} className="text-blue-500">刷新</button>
                                    </div>
                                </div>
                                {debugInfo.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleExport}
                        className="w-full py-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between px-6 shadow-sm active:scale-98 transition-transform"
                    >
                        <span className="font-semibold text-gray-800">导出全量备份 (JSON)</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>

                    <label className="w-full py-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between px-6 shadow-sm active:scale-98 transition-transform cursor-pointer">
                        <span className={`font-semibold ${importing ? 'text-gray-400' : 'text-gray-800'}`}>
                            {importing ? '恢复中...' : '从备份恢复'}
                        </span>
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </label>
                </div>

                <div className="px-4">
                    <p className="text-xs text-gray-400 leading-relaxed text-center">
                        所有数据均存储在您的浏览器本地 (IndexedDB)。
                        清除浏览器缓存会导致数据丢失，请定期备份。
                    </p>
                </div>
            </div>
        </IOSPage>
    );
};

export default DataPage;
