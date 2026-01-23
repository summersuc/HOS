// Standard 24 Timezones covering the globe with Chinese labels
export const STANDARD_TIMEZONES = [
    { label: '(UTC-12:00) 国际日期变更线西', value: 'Etc/GMT+12' },
    { label: '(UTC-11:00) 中途岛，萨摩亚', value: 'Pacific/Midway' },
    { label: '(UTC-10:00) 夏威夷', value: 'Pacific/Honolulu' },
    { label: '(UTC-09:00) 阿拉斯加', value: 'America/Anchorage' },
    { label: '(UTC-08:00) 太平洋时间 (美国和加拿大)', value: 'America/Los_Angeles' },
    { label: '(UTC-07:00) 山地时间 (美国和加拿大)', value: 'America/Denver' },
    { label: '(UTC-06:00) 中部时间 (美国和加拿大)', value: 'America/Chicago' },
    { label: '(UTC-05:00) 东部时间 (美国和加拿大)', value: 'America/New_York' },
    { label: '(UTC-04:00) 大西洋时间 (加拿大)', value: 'America/Halifax' },
    { label: '(UTC-03:00) 布宜诺斯艾利斯', value: 'America/Argentina/Buenos_Aires' },
    { label: '(UTC-02:00) 中大西洋', value: 'Atlantic/South_Georgia' },
    { label: '(UTC-01:00) 亚速尔群岛', value: 'Atlantic/Azores' },
    { label: '(UTC+00:00) 伦敦，格林威治标准时间', value: 'Europe/London' },
    { label: '(UTC+01:00) 柏林，巴黎，罗马', value: 'Europe/Paris' },
    { label: '(UTC+02:00) 雅典，耶路撒冷', value: 'Europe/Istanbul' },
    { label: '(UTC+03:00) 莫斯科，内罗毕', value: 'Europe/Moscow' },
    { label: '(UTC+04:00) 迪拜，阿布扎比', value: 'Asia/Dubai' },
    { label: '(UTC+05:00) 伊斯兰堡，卡拉奇', value: 'Asia/Karachi' },
    { label: '(UTC+06:00) 阿拉木图，达卡', value: 'Asia/Dhaka' },
    { label: '(UTC+07:00) 曼谷，河内', value: 'Asia/Bangkok' },
    { label: '(UTC+08:00) 北京，上海，香港，新加坡', value: 'Asia/Shanghai' },
    { label: '(UTC+09:00) 东京，首尔', value: 'Asia/Tokyo' },
    { label: '(UTC+10:00) 悉尼，墨尔本', value: 'Australia/Sydney' },
    { label: '(UTC+11:00) 所罗门群岛', value: 'Pacific/Guadalcanal' },
    { label: '(UTC+12:00) 奥克兰，惠灵顿', value: 'Pacific/Auckland' },
];

export const FRIENDLY_TIMEZONES = STANDARD_TIMEZONES;

export const getTimezoneLabel = (tzValue) => {
    const found = STANDARD_TIMEZONES.find(t => t.value === tzValue);
    return found ? found.label : tzValue;
};
