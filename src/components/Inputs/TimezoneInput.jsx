import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Common aliases mapping to IANA zones
const CITY_ALIASES = {
    'beijing': 'Asia/Shanghai',
    'bj': 'Asia/Shanghai',
    'shanghai': 'Asia/Shanghai',
    'guangzhou': 'Asia/Shanghai',
    'shenzhen': 'Asia/Shanghai',
    'tokyo': 'Asia/Tokyo',
    'seoul': 'Asia/Seoul',
    'london': 'Europe/London',
    'new york': 'America/New_York',
    'nyc': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'sf': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'moscow': 'Europe/Moscow',
    'sydney': 'Australia/Sydney',
    'dubai': 'Asia/Dubai',
    'singapore': 'Asia/Singapore',
    'hong kong': 'Asia/Hong_Kong',
    'hk': 'Asia/Hong_Kong',
    'taipei': 'Asia/Taipei',
    'mumbai': 'Asia/Kolkata',
    'delhi': 'Asia/Kolkata'
};

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone');

const TimezoneInput = ({ value, onChange }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Initial load: parse the current value to a friendly city name if possible
    useEffect(() => {
        if (value) {
            const parts = value.split('/');
            const city = parts[parts.length - 1].replace(/_/g, ' ');
            setQuery(city);
        }
    }, []); // Only runs on mount/if external value changes significantly? 
    // Actually we don't want to over-overwrite if user is typing.
    // Let's just sync once or if value changes externally and query is empty.

    const filteredOptions = React.useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return [];

        const matches = [];
        const seen = new Set();

        // 1. Check aliases
        Object.entries(CITY_ALIASES).forEach(([alias, tz]) => {
            if (alias.includes(q)) {
                if (!seen.has(tz)) {
                    matches.push({ label: `${alias} (${tz})`, value: tz, isAlias: true });
                    seen.add(tz);
                }
            }
        });

        // 2. Check all timezones
        ALL_TIMEZONES.forEach(tz => {
            if (seen.has(tz)) return;
            const parts = tz.split('/');
            const city = parts[parts.length - 1].toLowerCase().replace(/_/g, ' ');

            if (city.includes(q) || tz.toLowerCase().includes(q)) {
                const pretty = parts[parts.length - 1].replace(/_/g, ' ');
                matches.push({ label: pretty, value: tz, isAlias: false });
                seen.add(tz);
            }
        });

        return matches.slice(0, 10); // Limit results
    }, [query]);

    const handleSelect = (tzValue, displayLabel) => {
        onChange(tzValue);
        // Extract city for display
        const parts = tzValue.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        setQuery(city);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative z-20">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 transition-colors focus-within:bg-white dark:focus-within:bg-[#3A3A3C] shadow-sm focus-within:shadow-md ring-1 ring-transparent focus-within:ring-blue-500/20">
                <Globe size={20} className="text-gray-400 shrink-0" />
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="输入城市 (如: 北京, 纽约, London)..."
                        className="w-full bg-transparent text-[16px] text-gray-900 dark:text-white focus:outline-none font-medium placeholder-gray-400"
                    />
                </div>
                {query && (
                    <button onClick={() => { setQuery(''); onChange(''); setIsOpen(true); }} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300">
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Current Value Display (if it matches a valid zone but query is different or just as confirmation) */}
            {value && (
                <div className="text-[11px] text-gray-400 mt-1.5 px-1 flex items-center gap-1">
                    <Check size={10} className="text-green-500" />
                    已自动定位到: <span className="font-mono text-gray-500 dark:text-gray-300">{value}</span>
                </div>
            )}

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && filteredOptions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden max-h-60 overflow-y-auto"
                    >
                        {filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value, opt.label)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between group transition-colors"
                            >
                                <div>
                                    <div className="text-[14px] font-bold text-gray-900 dark:text-white">
                                        {opt.label}
                                        {opt.isAlias && <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">ALIAS</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono">{opt.value}</div>
                                </div>
                                {value === opt.value && <Check size={16} className="text-[#5B7FFF]" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TimezoneInput;
