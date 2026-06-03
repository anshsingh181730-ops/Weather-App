const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHERMAP_API_KEY;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mock data generator for testing or fallback
function getMockWeatherData(city) {
  const normalizedCity = city.toLowerCase().trim();
  const mockCities = {
    london: { temp: 15, condition: 'Cloudy', humidity: 82, wind: 5.5, icon: '04d', main: 'Clouds', aqi: 2 },
    paris: { temp: 18, condition: 'Partly Cloudy', humidity: 75, wind: 4.1, icon: '03d', main: 'Clouds', aqi: 1 },
    tokyo: { temp: 22, condition: 'Sunny', humidity: 60, wind: 3.2, icon: '01d', main: 'Clear', aqi: 3 },
    'new york': { temp: 25, condition: 'Rainy', humidity: 90, wind: 6.8, icon: '10d', main: 'Rain', aqi: 2 },
    sydney: { temp: 20, condition: 'Clear', humidity: 55, wind: 7.2, icon: '01d', main: 'Clear', aqi: 1 },
    mumbai: { temp: 32, condition: 'Thunderstorm', humidity: 85, wind: 12.5, icon: '11d', main: 'Thunderstorm', aqi: 5 }
  };

  if (mockCities[normalizedCity]) {
    return {
      name: city.charAt(0).toUpperCase() + city.slice(1),
      main: { 
        temp: mockCities[normalizedCity].temp, 
        humidity: mockCities[normalizedCity].humidity,
        feels_like: mockCities[normalizedCity].temp + 1,
        pressure: 1013
      },
      weather: [{ main: mockCities[normalizedCity].main, description: mockCities[normalizedCity].condition, icon: mockCities[normalizedCity].icon }],
      wind: { speed: mockCities[normalizedCity].wind },
      sys: { country: normalizedCity === 'london' ? 'GB' : normalizedCity === 'paris' ? 'FR' : normalizedCity === 'tokyo' ? 'JP' : normalizedCity === 'sydney' ? 'AU' : normalizedCity === 'mumbai' ? 'IN' : 'US' },
      visibility: 10000,
      aqi: mockCities[normalizedCity].aqi,
      cod: 200
    };
  }

  // Random fallback for other cities in mock mode
  const randomTemps = [10, 14, 21, 28, 30, 5, -2];
  const conditions = [
    { main: 'Clear', description: 'clear sky', icon: '01d' },
    { main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    { main: 'Rain', description: 'moderate rain', icon: '10d' },
    { main: 'Snow', description: 'light snow', icon: '13d' }
  ];
  const selectedCond = conditions[Math.floor(Math.random() * conditions.length)];
  return {
    name: city.charAt(0).toUpperCase() + city.slice(1),
    main: { 
      temp: randomTemps[Math.floor(Math.random() * randomTemps.length)], 
      humidity: Math.floor(Math.random() * 50) + 40,
      feels_like: 22,
      pressure: 1012
    },
    weather: [selectedCond],
    wind: { speed: parseFloat((Math.random() * 10).toFixed(1)) },
    sys: { country: 'US' },
    visibility: 9500,
    aqi: Math.floor(Math.random() * 5) + 1,
    cod: 200
  };
}

// Proxy endpoint for Weather API
app.get('/api/weather', async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: 'City name is required' });
  }

  // Check if API Key is configured or is a placeholder
  const isApiKeyMissing = !API_KEY || API_KEY === 'your_openweathermap_api_key_here';

  if (isApiKeyMissing) {
    console.log(`[WeatherApp] API key missing. Serving mock data for: ${city}`);
    return res.json(getMockWeatherData(city));
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      // Pass through OpenWeatherMap's error message (e.g. 404: city not found)
      return res.status(response.status).json({
        error: data.message || 'Failed to fetch weather data'
      });
    }

    // Attempt to fetch Air Quality Index (AQI) using coordinates
    if (data.coord && data.coord.lat !== undefined && data.coord.lon !== undefined) {
      try {
        const { lat, lon } = data.coord;
        const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const pollutionResponse = await fetch(pollutionUrl);
        if (pollutionResponse.ok) {
          const pollutionData = await pollutionResponse.json();
          if (pollutionData.list && pollutionData.list.length > 0) {
            data.aqi = pollutionData.list[0].main.aqi;
          }
        }
      } catch (err) {
        console.error('Error fetching air pollution data:', err);
        // Do not crash the entire request if AQI fails
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching from OpenWeatherMap API:', error);
    // If external fetch fails, we fall back to mock data as a grace measure or return standard 500 error
    res.status(500).json({ error: 'Internal server error while retrieving weather data' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`[WeatherApp] Server is running on http://localhost:${PORT}`);
  if (!API_KEY || API_KEY === 'your_openweathermap_api_key_here') {
    console.log('[WeatherApp] RUNNING IN MOCK MODE: OpenWeatherMap API key is not configured.');
  } else {
    console.log('[WeatherApp] RUNNING IN API PROXY MODE: OpenWeatherMap API key is active.');
  }
});
