import React, { useState, useEffect } from 'react';

const App = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // あなたのOpenWeatherMap APIキーをここに挿入してください。
  const apiKey = 'c556ce593ded57907fc9d222e6f0abf5';

  // 競馬場名と緯度・経度のマッピング（表示対象をフィルタリング）
  const allRacecourseLocations = [
    { name: '札幌', lat: 43.0563, lon: 141.3503 },
    { name: '函館', lat: 41.7772, lon: 140.7589 },
    { name: '福島', lat: 37.7592, lon: 140.4856 },
    { name: '新潟', lat: 37.8922, lon: 139.1171 },
    { name: '東京', lat: 35.6669, lon: 139.5298 },
    { name: '中山', lat: 35.7369, lon: 139.9647 },
    { name: '中京', lat: 35.1090, lon: 136.8525 },
    { name: '京都', lat: 34.9126, lon: 135.7601 },
    { name: '阪神', lat: 34.7397, lon: 135.3429 },
    { name: '小倉', lat: 33.8767, lon: 130.8845 },
  ];

  // 表示したい競馬場をフィルタリング
  const racecourseLocations = allRacecourseLocations.filter(location => 
    ['札幌', '中京', '新潟'].includes(location.name)
  );

  // OpenWeatherMapの天気コードと説明の変換
  const weatherCodeMap = {
    '01d': '晴れ', '01n': '晴れ',
    '02d': '晴れ時々曇り', '02n': '晴れ時々曇り',
    '03d': '曇り', '03n': '曇り',
    '04d': '曇り', '04n': '曇り',
    '09d': '小雨', '09n': '小雨',
    '10d': '雨', '10n': '雨',
    '11d': '雷雨', '11n': '雷雨',
    '13d': '雪', '13n': '雪',
    '50d': '霧', '50n': '霧',
  };

  const weatherIconMap = {
    '晴れ': '☀️', '晴れ時々曇り': '🌤️', '曇り': '☁️',
    '小雨': '🌧️', '雨': '☔️', '雷雨': '⛈️', '雪': '❄️', '霧': '🌫️',
    'default': '🌈',
  };

  // 天気予報データを取得する関数
  const fetchWeather = async () => {
    if (apiKey === 'YOUR_API_KEY' || !apiKey) {
      setError('APIキーが設定されていません。');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0:日, 1:月, ..., 6:土

      // 当週の金・土・日曜日の日付を計算
      const getTargetDates = () => {
        const dates = [];
        const baseDate = new Date(today);
        let daysToAdd = (5 - dayOfWeek + 7) % 7; // 今週の金曜日までの日数
        baseDate.setDate(today.getDate() + daysToAdd);

        // 月曜日になったら翌週に切り替える
        if (dayOfWeek === 1) {
          baseDate.setDate(baseDate.getDate() + 7);
        }

        for (let i = 0; i < 3; i++) {
          const date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
          dates.push(date);
        }
        return dates;
      };

      const dates = getTargetDates();

      const promises = racecourseLocations.map(async (location) => {
        // OpenWeatherMapのAPIは、フリープランだと5日先まで
        const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&lang=ja&appid=${apiKey}`;
        
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorData.message}`);
          }
          const apiData = await response.json();
          
          const dailyForecasts = dates.map(targetDate => {
            // 当日の日付と予報の日付を比較し、「実績」か「予報」かを判断
            const targetDateStr = targetDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            const status = (targetDateStr < todayStr) ? '実績' : '予報';

            // APIデータから対象日時の予報を取得
            const forecastForDay = apiData.list.find(item => {
              const itemDate = new Date(item.dt * 1000);
              return itemDate.getFullYear() === targetDate.getFullYear() &&
                     itemDate.getMonth() === targetDate.getMonth() &&
                     itemDate.getDate() === targetDate.getDate() &&
                     itemDate.getHours() >= 12; // 昼間の予報を採用
            });

            if (!forecastForDay) {
              return {
                date: targetDate.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
                dayOfWeek: targetDate.toLocaleDateString('ja-JP', { weekday: 'short' }),
                status,
                weather: 'データなし',
                weatherIcon: '❓',
                precipProb: 'N/A',
                tempHigh: 'N/A',
                tempLow: 'N/A',
              };
            }

            const weatherMain = weatherCodeMap[forecastForDay.weather[0].icon] || '不明';
            
            // 対象日の最高気温と最低気温を計算（簡易的な方法）
            const dayTemps = apiData.list.filter(item => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate.getFullYear() === targetDate.getFullYear() &&
                       itemDate.getMonth() === targetDate.getMonth() &&
                       itemDate.getDate() === targetDate.getDate();
            }).map(item => item.main.temp);
            const tempHigh = Math.max(...dayTemps).toFixed(0);
            const tempLow = Math.min(...dayTemps).toFixed(0);
            
            return {
              date: targetDate.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
              dayOfWeek: targetDate.toLocaleDateString('ja-JP', { weekday: 'short' }),
              status,
              weather: weatherMain,
              weatherIcon: weatherIconMap[weatherMain] || weatherIconMap['default'],
              precipProb: (forecastForDay.pop * 100).toFixed(0),
              tempHigh,
              tempLow,
            };
          });
          
          return { racecourse: location.name, forecasts: dailyForecasts };

        } catch (e) {
          console.error(`Failed to fetch weather for ${location.name}:`, e);
          return { racecourse: location.name, forecasts: dates.map(date => ({
              date: date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
              dayOfWeek: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
              status: 'エラー',
              weather: `取得失敗: ${e.message}`,
              weatherIcon: '⚠️',
              precipProb: 'N/A',
              tempHigh: 'N/A',
              tempLow: 'N/A',
            }))
          };
        }
      });
      
      const results = await Promise.all(promises);
      setWeatherData(results);

    } catch (e) {
      console.error('An unexpected error occurred:', e);
      setError('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  // 個別の天気予報を表示するコンポーネント
  const DayForecast = ({ forecast }) => (
    <div className="flex flex-col items-center p-3 sm:p-4 bg-white/50 rounded-lg shadow-sm border border-gray-200">
      <p className="text-sm font-semibold">{forecast.dayOfWeek}</p>
      <p className="text-xs mb-1 text-gray-500">{forecast.date}</p>
      <div className="text-3xl mb-2">{forecast.weatherIcon}</div>
      <p className="text-sm font-bold text-blue-800 mb-1">{forecast.status}</p>
      <p className="text-xs">{forecast.weather}</p>
      <p className="text-xs text-gray-700">降水確率: {forecast.precipProb}%</p>
      <p className="text-sm font-bold mt-2">
        {forecast.tempHigh}° / {forecast.tempLow}°
      </p>
    </div>
  );

  // 各競馬場のカードを表示するコンポーネント
  const WeatherCard = ({ data }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform hover:scale-105">
      <div className="p-4 bg-gray-100 border-b border-gray-200 flex items-center justify-center sm:justify-start">
        <span className="text-2xl mr-2">🐎</span>
        <h3 className="text-xl font-extrabold text-gray-800">{data.racecourse}競馬場</h3>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.forecasts.map((forecast, index) => (
          <DayForecast key={index} forecast={forecast} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-green-100 font-sans text-gray-800">
      <header className="py-6 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 drop-shadow-md">
          <span className="mr-2">🐎</span> 日本中央競馬 天気予報アプリ
        </h1>
        <p className="mt-2 text-lg text-gray-600">今週の金・土・日の天気予報をお届けします</p>
      </header>

      <main className="container mx-auto p-4 max-w-7xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-xl text-gray-600">データを取得中...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md">
            <p className="text-xl font-bold">エラーが発生しました</p>
            <p className="mt-2">{error}</p>
            <p className="mt-4">APIキーが有効化されていないか、間違っている可能性があります。再度ご確認ください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weatherData.map((data, index) => (
              <WeatherCard key={index} data={data} />
            ))}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>※ OpenWeatherMap APIのデータを使用しています。</p>
      </footer>
    </div>
  );
};

export default App;
