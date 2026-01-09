// Weather and fishing conditions utilities

export async function getWeather(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return getMockWeather();
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!response.ok) {
      return getMockWeather();
    }

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: Math.round(data.wind.speed),
      wind_direction: getWindDirection(data.wind.deg),
      wind_deg: data.wind.deg,
      weather: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      clouds: data.clouds.all,
      visibility: Math.round(data.visibility / 1609.34), // Convert to miles
      sunrise: formatTime(data.sys.sunrise),
      sunset: formatTime(data.sys.sunset),
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return getMockWeather();
  }
}

function getMockWeather() {
  return {
    temperature: 62,
    feels_like: 60,
    humidity: 55,
    pressure: 1018,
    wind_speed: 8,
    wind_direction: 'SW',
    wind_deg: 225,
    weather: 'Partly Cloudy',
    description: 'scattered clouds',
    icon: '03d',
    clouds: 35,
    visibility: 10,
    sunrise: '6:45 AM',
    sunset: '7:30 PM',
  };
}

function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Moon phase calculation
export function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e;
  if (month < 3) {
    c = year - 1;
    e = month + 12;
  } else {
    c = year;
    e = month;
  }

  let jd = Math.floor(365.25 * c) + Math.floor(30.6001 * (e + 1)) + day - 694039.09;
  jd /= 29.53059;
  let phase = Math.round((jd - Math.floor(jd)) * 8) % 8;

  const phases = [
    { name: 'New Moon', emoji: '🌑', icon: 'new', fishing: 'Excellent - Peak feeding activity', score: 95 },
    { name: 'Waxing Crescent', emoji: '🌒', icon: 'waxing-crescent', fishing: 'Good - Building activity', score: 70 },
    { name: 'First Quarter', emoji: '🌓', icon: 'first-quarter', fishing: 'Good - Moderate activity', score: 65 },
    { name: 'Waxing Gibbous', emoji: '🌔', icon: 'waxing-gibbous', fishing: 'Fair - Activity declining', score: 55 },
    { name: 'Full Moon', emoji: '🌕', icon: 'full', fishing: 'Excellent - Night feeding heavy', score: 90 },
    { name: 'Waning Gibbous', emoji: '🌖', icon: 'waning-gibbous', fishing: 'Fair - Try early AM', score: 55 },
    { name: 'Last Quarter', emoji: '🌗', icon: 'last-quarter', fishing: 'Good - Activity returning', score: 65 },
    { name: 'Waning Crescent', emoji: '🌘', icon: 'waning-crescent', fishing: 'Good - Building to new moon', score: 75 }
  ];

  return phases[phase];
}

// Calculate overall fishing conditions score
export function calculateFishingScore(weather, moonPhase, riverData) {
  let score = 50;
  const factors = [];

  // Barometric pressure (very important for fly fishing)
  if (weather.pressure >= 1010 && weather.pressure <= 1020) {
    score += 12;
    factors.push({ name: 'Pressure', value: `${weather.pressure} mb`, impact: '+12', good: true, note: 'Stable - ideal for surface activity' });
  } else if (weather.pressure < 1005 || weather.pressure > 1025) {
    score -= 8;
    factors.push({ name: 'Pressure', value: `${weather.pressure} mb`, impact: '-8', good: false, note: weather.pressure < 1005 ? 'Low - fish may be sluggish' : 'High - fish holding deep' });
  } else {
    factors.push({ name: 'Pressure', value: `${weather.pressure} mb`, impact: '0', good: null, note: 'Neutral conditions' });
  }

  // Wind (light wind good for fly fishing)
  if (weather.wind_speed >= 3 && weather.wind_speed <= 12) {
    score += 8;
    factors.push({ name: 'Wind', value: `${weather.wind_speed} mph ${weather.wind_direction}`, impact: '+8', good: true, note: 'Light wind breaks surface, helps presentations' });
  } else if (weather.wind_speed > 20) {
    score -= 15;
    factors.push({ name: 'Wind', value: `${weather.wind_speed} mph ${weather.wind_direction}`, impact: '-15', good: false, note: 'Too windy for good casting' });
  } else if (weather.wind_speed < 3) {
    score -= 3;
    factors.push({ name: 'Wind', value: `${weather.wind_speed} mph`, impact: '-3', good: null, note: 'Very calm - fish more line-shy' });
  }

  // Cloud cover (overcast often best)
  if (weather.clouds >= 50 && weather.clouds <= 90) {
    score += 10;
    factors.push({ name: 'Clouds', value: `${weather.clouds}%`, impact: '+10', good: true, note: 'Overcast - fish feel safer feeding' });
  } else if (weather.clouds < 20) {
    score -= 5;
    factors.push({ name: 'Clouds', value: `${weather.clouds}%`, impact: '-5', good: false, note: 'Clear skies - fish in shade' });
  }

  // Temperature (ideal range for trout)
  if (weather.temperature >= 45 && weather.temperature <= 68) {
    score += 10;
    factors.push({ name: 'Air Temp', value: `${weather.temperature}°F`, impact: '+10', good: true, note: 'Comfortable range for hatches' });
  } else if (weather.temperature > 85 || weather.temperature < 35) {
    score -= 12;
    factors.push({ name: 'Air Temp', value: `${weather.temperature}°F`, impact: '-12', good: false, note: 'Extreme temps reduce activity' });
  }

  // Moon phase
  const moonScore = Math.round((moonPhase.score - 50) / 5);
  score += moonScore;
  factors.push({
    name: 'Moon',
    value: moonPhase.name,
    impact: moonScore >= 0 ? `+${moonScore}` : `${moonScore}`,
    good: moonScore > 0,
    note: moonPhase.fishing
  });

  // River conditions (if available)
  if (riverData) {
    if (riverData.flow_status === 'normal') {
      score += 8;
      factors.push({ name: 'Flow', value: riverData.flow_display, impact: '+8', good: true, note: 'Normal flow - ideal wading' });
    } else if (riverData.flow_status === 'high') {
      score -= 10;
      factors.push({ name: 'Flow', value: riverData.flow_display, impact: '-10', good: false, note: 'High water - fish streamers deep' });
    } else if (riverData.flow_status === 'low') {
      score -= 5;
      factors.push({ name: 'Flow', value: riverData.flow_display, impact: '-5', good: false, note: 'Low flow - fish early/late, long leaders' });
    }
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  let rating, color;
  if (score >= 80) { rating = 'Excellent'; color = 'forest'; }
  else if (score >= 65) { rating = 'Good'; color = 'river'; }
  else if (score >= 45) { rating = 'Fair'; color = 'amber'; }
  else { rating = 'Poor'; color = 'red'; }

  return {
    score,
    rating,
    color,
    factors,
    summary: getSummary(score, weather, moonPhase)
  };
}

function getSummary(score, weather, moonPhase) {
  if (score >= 80) {
    return "Outstanding conditions! Hatches likely, fish should be active and looking up. Get on the water!";
  } else if (score >= 65) {
    return "Good fishing expected. Watch for hatch activity and be ready to match what's on the water.";
  } else if (score >= 45) {
    return "Fair conditions. Focus on nymphing or try streamers. Fish deeper structure and slower presentations.";
  } else {
    return "Challenging day ahead. Consider subsurface patterns, fish early/late, or try a different location.";
  }
}

// Best fishing times based on conditions
export function getBestTimes(weather, moonPhase) {
  const times = [];

  // Dawn is almost always good
  times.push({
    period: 'Dawn',
    time: weather.sunrise,
    quality: 'excellent',
    note: 'Prime time - morning hatches and feeding'
  });

  // Mid-morning depends on conditions
  if (weather.clouds > 50 || weather.temperature < 70) {
    times.push({
      period: 'Mid-Morning',
      time: '9:00 - 11:00 AM',
      quality: 'good',
      note: 'Extended morning activity likely'
    });
  }

  // Midday (usually slow unless overcast)
  if (weather.clouds > 70) {
    times.push({
      period: 'Midday',
      time: '11:00 AM - 2:00 PM',
      quality: 'fair',
      note: 'Overcast helps keep fish active'
    });
  }

  // Afternoon
  if (weather.temperature >= 50 && weather.temperature <= 75) {
    times.push({
      period: 'Afternoon',
      time: '3:00 - 5:00 PM',
      quality: 'good',
      note: 'Building toward evening hatch'
    });
  }

  // Evening is usually excellent
  times.push({
    period: 'Evening',
    time: `5:00 PM - ${weather.sunset}`,
    quality: 'excellent',
    note: 'Prime time - spinner falls and evening risers'
  });

  // Night fishing on full moon
  if (moonPhase.name === 'Full Moon') {
    times.push({
      period: 'Night',
      time: '9:00 PM - 12:00 AM',
      quality: 'good',
      note: 'Big fish feed under full moon'
    });
  }

  return times;
}
