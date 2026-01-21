import React, { useState, useEffect } from 'react';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';

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

    const handleExport = async () => {
        try {
            // Manual simplified export
            const data = {};
            for (const table of db.tables) {
                data[table.name] = await table.toArray();
            }
            const blobData = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blobData);

            const a = document.createElement('a');
            a.href = url;
            a.download = `hoshino_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        } catch (e) {
            alert('导出失败: ' + e.message);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('警告：导入将覆盖当前所有数据！是否继续？')) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                await db.transaction('rw', db.tables, async () => {
                    for (const table of db.tables) {
                        if (data[table.name]) {
                            await table.clear();
                            await table.bulkAdd(data[table.name]);
                        }
                    }
                });
                alert('数据恢复成功！');
                setImporting(false);
            } catch (err) {
                alert('导入失败，文件格式可能错误');
                setImporting(false);
            }
        };
        reader.readAsText(file);
    };

    const [showDebug, setShowDebug] = useState(false);

    return (
        <IOSPage title="数据存储" onBack={onBack}>
            <div className="p-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50/50 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
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
                                    <button onClick={calculateUsage} className="text-blue-500">刷新</button>
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
