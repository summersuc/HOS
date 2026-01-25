import React, { useState, useEffect } from 'react';
import WidgetBase from '../WidgetBase';
import { WIDGET_SIZES } from '../registry';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

const WeatherWidget = ({ settings, size = WIDGET_SIZES.SMALL }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const city = settings?.city || 'Shanghai'; // Default fallback

    // Map WMO Weather Codes to Icosn
    const getWeatherIcon = (code) => {
        if (code === 0 || code === 1) return <Sun className="text-yellow-400 animate-[spin_10s_linear_infinite]" size={isSmall ? 40 : 50} />;
        if (code === 2 || code === 3) return <Cloud className="text-gray-400 animate-pulse" size={isSmall ? 40 : 50} />;
        if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400 animate-bounce" size={isSmall ? 40 : 50} />;
        if (code >= 71 && code <= 77) return <CloudSnow className="text-white animate-pulse" size={isSmall ? 40 : 50} />;
        if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-400 animate-pulse" size={isSmall ? 40 : 50} />;
        return <Sun className="text-yellow-400 animate-[spin_10s_linear_infinite]" size={isSmall ? 40 : 50} />;
    };

    const isSmall = size === WIDGET_SIZES.SMALL || size === WIDGET_SIZES.Icon;
    const isMedium = size === WIDGET_SIZES.MEDIUM;

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setLoading(true);
                // 1. Geocoding
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`);
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    throw new Error('未找到城市');
                }

                const { latitude, longitude, name } = geoData.results[0];

                // 2. Weather
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m`);
                const weatherData = await weatherRes.json();

                setWeather({
                    temp: Math.round(weatherData.current.temperature_2m),
                    code: weatherData.current.weather_code,
                    wind: weatherData.current.wind_speed_10m,
                    cityName: name // or city from settings
                });
            } catch (err) {
                console.error("Weather Fetch Error", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
        // Refresh every 30 mins
        const timer = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(timer);
    }, [city]);

    if (loading) {
        return (
            <WidgetBase variant="glass" className="bg-gradient-to-br from-blue-400 to-blue-600">
                <div className="w-full h-full flex items-center justify-center text-white">
                    <span className="animate-pulse">Loading...</span>
                </div>
            </WidgetBase>
        );
    }

    if (error) {
        return (
            <WidgetBase variant="glass" className="bg-gray-400">
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-white text-center">
                    <span className="text-xs">天气获取失败</span>
                    <span className="text-[10px] opacity-80">{city}</span>
                </div>
            </WidgetBase>
        );
    }

    return (
        <WidgetBase variant="glass" className="bg-gradient-to-br from-sky-400 to-blue-500 text-white relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 blur-2xl rounded-full pointer-events-none" />

            <div className="w-full h-full p-4 flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-lg font-bold">{settings.city || weather.cityName}</span>
                        <span className="text-3xl font-light">{weather.temp}°</span>
                    </div>
                    <div className="drop-shadow-lg">
                        {getWeatherIcon(weather.code)}
                    </div>
                </div>

                {isMedium && (
                    <div className="flex gap-4 text-xs font-medium opacity-90 mt-auto">
                        <span className="flex items-center gap-1"><Wind size={12} /> {weather.wind} km/h</span>
                        {/* We could add humidity etc if requested */}
                    </div>
                )}
            </div>
        </WidgetBase>
    );
};

export default WeatherWidget;
