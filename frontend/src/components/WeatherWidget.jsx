import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Droplet, Thermometer } from 'lucide-react';

const WeatherWidget = ({ date, theme = 'neutral' }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The Gap, QLD coordinates
  const latitude = -27.4435;
  const longitude = 152.9436;

  useEffect(() => {
    const fetchWeather = async () => {
      if (!date) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Parse the date - it should be a Date object passed from parent
        let dateObj;
        if (date instanceof Date && !isNaN(date.getTime())) {
          dateObj = date;
        } else {
          setLoading(false);
          return;
        }

        // Format date as YYYY-MM-DD for API
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Open-Meteo API endpoint for daily forecast
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,precipitation_probability_max,uv_index_max&timezone=Australia/Brisbane&start_date=${dateStr}&end_date=${dateStr}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        if (data.daily && data.daily.time && data.daily.time.length > 0) {
          setWeather({
            maxTemp: data.daily.temperature_2m_max[0],
            precipitationProb: data.daily.precipitation_probability_max[0],
            uvIndex: data.daily.uv_index_max[0],
          });
        } else {
          throw new Error('No weather data available');
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [date]);

  // Generate friendly tip based on weather conditions
  const getFriendlyTip = () => {
    if (!weather) return null;

    const { maxTemp, precipitationProb, uvIndex } = weather;

    if (precipitationProb > 50) {
      return "Don't forget your umbrella! ☔️";
    } else if (uvIndex > 8) {
      return "Slip, slop, slap! High UV today. ☀️";
    } else if (maxTemp > 30) {
      return "Stay hydrated, it's a hot one! 💧";
    } else {
      return "Enjoy the lovely day! 🌤️";
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-3 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/30">
        <p className="text-xs text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const tip = getFriendlyTip();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="flex-1 px-4 py-3 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/30"
    >
      {/* Horizontal stats row */}
      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Max Temp */}
        <div className="flex items-center gap-2">
          <Thermometer size={14} className="text-gray-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 leading-none mb-0.5">Temp</p>
            <p className="text-sm font-bold text-gray-800 leading-none">
              {Math.round(weather.maxTemp)}°
            </p>
          </div>
        </div>

        {/* Rain Chance */}
        <div className="flex items-center gap-2">
          <Droplet size={14} className="text-gray-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 leading-none mb-0.5">Rain</p>
            <p className="text-sm font-bold text-gray-800 leading-none">
              {Math.round(weather.precipitationProb)}%
            </p>
          </div>
        </div>

        {/* UV Index */}
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-gray-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 leading-none mb-0.5">UV</p>
            <p className="text-sm font-bold text-gray-800 leading-none">
              {Math.round(weather.uvIndex)}
            </p>
          </div>
        </div>
      </div>

      {/* Friendly tip */}
      {tip && (
        <p className="text-xs italic text-gray-600 text-center mt-2 pt-2 border-t border-white/20">
          {tip}
        </p>
      )}
    </motion.div>
  );
};

export default WeatherWidget;
