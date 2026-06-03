/**
 * MyWeather - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const bodyTheme = document.getElementById('body-theme');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const searchForm = document.getElementById('weather-search-form');
  const cityInput = document.getElementById('city-search-input');
  
  const loadingState = document.getElementById('weather-loading');
  const errorState = document.getElementById('weather-error');
  const errorDesc = document.getElementById('error-desc');
  const errorRetryBtn = document.getElementById('error-retry-btn');
  const weatherContent = document.getElementById('weather-info-content');

  // Weather Display Elements
  const cityNameEl = document.getElementById('weather-city-name');
  const dateEl = document.getElementById('weather-date');
  const tempEl = document.getElementById('weather-temp');
  const statusIconEl = document.getElementById('weather-status-icon');
  const descriptionEl = document.getElementById('weather-description');
  
  // Stat Card Elements
  const humidityEl = document.getElementById('stat-humidity');
  const windEl = document.getElementById('stat-wind');
  const feelsLikeEl = document.getElementById('stat-feels-like');
  const pressureEl = document.getElementById('stat-pressure');
  const aqiEl = document.getElementById('stat-aqi');
  const aqiIconWrapper = document.getElementById('aqi-icon-wrapper');
  const visibilityEl = document.getElementById('stat-visibility');

  // Default city on first load
  const DEFAULT_CITY = 'London';

  // --- Theme Toggle Logic ---
  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'light') {
    enableLightMode();
  } else if (savedTheme === 'dark') {
    enableDarkMode();
  } else {
    // Follow system preference
    if (systemPrefersDark) {
      enableDarkMode();
    } else {
      enableLightMode();
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    if (bodyTheme.classList.contains('dark-mode')) {
      enableLightMode();
    } else {
      enableDarkMode();
    }
  });

  function enableLightMode() {
    bodyTheme.classList.remove('dark-mode');
    bodyTheme.classList.add('light-mode');
    localStorage.setItem('theme', 'light');
  }

  function enableDarkMode() {
    bodyTheme.classList.remove('light-mode');
    bodyTheme.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }

  // --- Fetch Weather Logic ---
  async function fetchWeather(city) {
    showLoading();

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not fetch weather data. Please try again.');
      }

      updateWeatherUI(data);
    } catch (error) {
      showError(error.message, city);
    }
  }

  // --- UI State Management ---
  function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    weatherContent.classList.add('hidden');
  }

  function showError(message, queryCity) {
    loadingState.classList.add('hidden');
    weatherContent.classList.add('hidden');
    errorState.classList.remove('hidden');
    
    // Capitalize the first letter of the error message for premium display
    const formattedMessage = message.charAt(0).toUpperCase() + message.slice(1);
    errorDesc.textContent = formattedMessage;
    // Update retry button to fetch a working city
    errorRetryBtn.onclick = () => {
      cityInput.value = DEFAULT_CITY;
      fetchWeather(DEFAULT_CITY);
    };
  }

  function showWeatherContent() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    weatherContent.classList.remove('hidden');
  }

  // --- Update UI with Weather Data ---
  function updateWeatherUI(data) {
    // City & Country
    cityNameEl.textContent = `${data.name}, ${data.sys?.country || ''}`;

    // Nicely formatted date (using user's locale)
    const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString(undefined, dateOptions);

    // Temp & Description
    const tempCelsius = Math.round(data.main.temp);
    tempEl.textContent = tempCelsius;

    const weatherObj = data.weather[0];
    descriptionEl.textContent = weatherObj.description;

    // OpenWeatherMap High-Res Icon
    const iconCode = weatherObj.icon;
    statusIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    statusIconEl.alt = weatherObj.description;

    // Stat Cards
    humidityEl.textContent = `${data.main.humidity}%`;
    
    // Wind Speed - convert m/s to km/h
    const windSpeedKmh = Math.round(data.wind.speed * 3.6);
    windEl.textContent = `${windSpeedKmh} km/h`;

    // Feels Like
    const feelsLikeCelsius = Math.round(data.main.feels_like);
    feelsLikeEl.textContent = `${feelsLikeCelsius}°C`;

    // Pressure
    pressureEl.textContent = `${data.main.pressure} hPa`;

    // Air Quality Index (AQI)
    if (data.aqi !== undefined) {
      const aqiLevels = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor'
      };
      const aqiText = aqiLevels[data.aqi] || 'Unknown';
      aqiEl.textContent = aqiText;

      // Clean old AQI color classes
      aqiIconWrapper.classList.remove('aqi-1', 'aqi-2', 'aqi-3', 'aqi-4', 'aqi-5');
      // Add matching color class
      aqiIconWrapper.classList.add(`aqi-${data.aqi}`);
    } else {
      aqiEl.textContent = 'N/A';
      aqiIconWrapper.classList.remove('aqi-1', 'aqi-2', 'aqi-3', 'aqi-4', 'aqi-5');
    }

    // Visibility (meters to km)
    if (data.visibility !== undefined) {
      const visibilityKm = (data.visibility / 1000).toFixed(1);
      // Remove trailing .0 if present for cleaner aesthetics
      visibilityEl.textContent = `${parseFloat(visibilityKm)} km`;
    } else {
      visibilityEl.textContent = 'N/A';
    }

    // Apply atmospheric theme overlay based on weather main status
    updateAtmosphericOverlay(weatherObj.main);

    // Finally, display contents
    showWeatherContent();
  }

  // --- Dynamic Atmospheric Background Overlay ---
  function updateAtmosphericOverlay(weatherCondition) {
    // Clean old overlays
    bodyTheme.classList.remove(
      'weather-clear-sky',
      'weather-clouds',
      'weather-rainy',
      'weather-thunderstorm',
      'weather-snowy'
    );

    const condition = weatherCondition.toLowerCase();

    if (condition.includes('clear')) {
      bodyTheme.classList.add('weather-clear-sky');
    } else if (condition.includes('cloud')) {
      bodyTheme.classList.add('weather-clouds');
    } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('mist')) {
      bodyTheme.classList.add('weather-rainy');
    } else if (condition.includes('thunderstorm')) {
      bodyTheme.classList.add('weather-thunderstorm');
    } else if (condition.includes('snow')) {
      bodyTheme.classList.add('weather-snowy');
    } else {
      // Default fallback
      bodyTheme.classList.add('weather-clouds');
    }
  }

  // --- Form & Interaction Event Listeners ---
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cityQuery = cityInput.value.trim();
    if (cityQuery) {
      fetchWeather(cityQuery);
    }
  });

  // Load default city on startup
  fetchWeather(DEFAULT_CITY);
});
