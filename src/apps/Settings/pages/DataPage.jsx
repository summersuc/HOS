import React, { useState, useEffect } from 'react';
import { db } from '../../../db/schema';
import IOSPage from '../../../components/AppWindow/IOSPage';

const DataPage = ({ onBack }) => {
    const [usage, setUsage] = useState('计算中...');
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        // Estimate storage
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
                setUsage(`${usedMB} MB`);
            });
        }
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

    return (
        <IOSPage title="数据存储" onBack={onBack}>
            <div className="p-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50/50 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{usage}</h2>
                    <p className="text-gray-500 text-sm mt-1">本地存储已占用</p>
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
