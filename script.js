// The API key is loaded from config.js
const apiKey = CONFIG.WEATHER_API_KEY;
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const weatherIcon = document.getElementById("weather-icon");

// SVG Definitions for different weather conditions
const svgs = {
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    clouds: '<svg viewBox="0 0 24 24" fill="none" stroke="#E0E0E0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="none" stroke="#4DA8DA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13v8"/><path d="M8 13v8"/><path d="M12 15v8"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="8" y1="20" x2="8" y2="20.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="12" y1="22" x2="12" y2="22.01"/><line x1="16" y1="16" x2="16" y2="16.01"/><line x1="16" y1="20" x2="16" y2="20.01"/></svg>',
    mist: '<svg viewBox="0 0 24 24" fill="none" stroke="#B0C4DE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
};

async function checkWeather(city) {
    if (!city) return;

    try {
        const response = await fetch(apiUrl + city + `&appid=${apiKey}`);
        
        if (response.status == 404) {
            document.getElementById("error-msg").style.display = "block";
            document.getElementById("weather-container").style.display = "none";
        } else {
            const data = await response.json();

            document.getElementById("city").innerHTML = data.name;
            document.getElementById("temp").innerHTML = Math.round(data.main.temp) + "°C";
            document.getElementById("humidity").innerHTML = data.main.humidity + "%";
            document.getElementById("wind").innerHTML = data.wind.speed + " km/h";

            // Update weather icon based on condition
            const condition = data.weather[0].main.toLowerCase();
            if (condition.includes("clouds")) {
                weatherIcon.innerHTML = svgs.clouds;
            } else if (condition.includes("clear")) {
                weatherIcon.innerHTML = svgs.clear;
            } else if (condition.includes("rain") || condition.includes("drizzle")) {
                weatherIcon.innerHTML = svgs.rain;
            } else if (condition.includes("mist") || condition.includes("haze") || condition.includes("fog")) {
                weatherIcon.innerHTML = svgs.mist;
            } else if (condition.includes("snow")) {
                weatherIcon.innerHTML = svgs.snow;
            } else {
                weatherIcon.innerHTML = svgs.clear; // fallback
            }

            document.getElementById("weather-container").style.display = "block";
            document.getElementById("error-msg").style.display = "none";
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
    }
}

searchBtn.addEventListener("click", () => {
    checkWeather(searchInput.value);
});

searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        checkWeather(searchInput.value);
    }
});
