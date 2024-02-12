const cityInput = document.getElementById('cityInput');
let cityOptions = document.getElementById('cityOptions');
const plannedStartDateInput = document.getElementById('plannedStartDate');
const numberOfDaysInput = document.getElementById('numberOfDays');
const getWeatherBtn = document.getElementById('getWeatherBtn');

let selectedCityLatitude;
let selectedCityLongitude;

// Function to fetch data from the API and populate city options
async function fetchCities(cityName) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=5&language=en&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const cities = data.results;

        // Clear previous options
        cityOptions.innerHTML = '';

        // Populate city options
        cities.forEach(city => {
            const option = document.createElement('a');
            option.textContent = `${city.name}, ${city.country}`;
            option.classList.add('list-group-item', 'list-group-item-action');
            option.href = '#';
            option.addEventListener('click', (event) => {
                event.preventDefault();
                selectCity(city);
            });
            cityOptions.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Function to handle city selection
function selectCity(city) {
    console.log('Selected city:', city);
    // Store latitude and longitude as variables
    selectedCityLatitude = city.latitude;
    selectedCityLongitude = city.longitude;

    // You can perform any actions here with the selected city

    // Remove city options from the DOM
    cityOptions.parentNode.removeChild(cityOptions);
}

// Event listener for input changes
cityInput.addEventListener('input', (event) => {
    const cityName = event.target.value.trim();
    if (cityName.length >= 3) {
        fetchCities(cityName);
    }

});

// Function to format date as YYYY-MM-DD for API call
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to fetch historic weather data for multiple years
async function fetchHistoricWeatherForMultipleYears(latitude, longitude, startDate, endDate) {
    const years = [startDate.getFullYear(), startDate.getFullYear() - 1, startDate.getFullYear() - 2, startDate.getFullYear() - 3, startDate.getFullYear() - 4];
    const promises = years.map(year => {
        const startOfYear = new Date(year, startDate.getMonth(), startDate.getDate());
        const endOfYear = new Date(year, endDate.getMonth(), endDate.getDate());
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startOfYear.toISOString().split('T')[0]}&end_date=${endOfYear.toISOString().split('T')[0]}&daily=temperature_2m_max,rain_sum`;
        console.log(url)
        return fetch(url)
            .then(response => response.json())
            .then(data => ({ year, data }));
    });

    return Promise.all(promises);
}
// Event listener for "Get Historic Weather" button click
getWeatherBtn1.addEventListener('click', async () => {
    const plannedStartDate = plannedStartDateInput.value;
    const numberOfDays = parseInt(numberOfDaysInput.value, 10);

    // Calculate API start date (1 year before planned start date)
    const plannedStartDateObj = new Date(plannedStartDate);
    const APIStartDate = new Date(plannedStartDateObj.getFullYear() - 1, plannedStartDateObj.getMonth(), plannedStartDateObj.getDate());

    // Calculate API end date (API start date + number of days)
    const APIEndDate = new Date(APIStartDate);
    APIEndDate.setDate(APIEndDate.getDate() + numberOfDays);

    // Format dates for API call
    const formattedAPIStartDate = formatDate(APIStartDate);
    const formattedAPIEndDate = formatDate(APIEndDate);

    // Make API call using the calculated dates and selected city's latitude/longitude
    try {
        const historicWeatherData = await fetchHistoricWeatherForMultipleYears(selectedCityLatitude, selectedCityLongitude, APIStartDate, APIEndDate);
        console.log('Historic weather data:', historicWeatherData);

        // Extract all dates for all years
        const allDates = historicWeatherData.map(({ year, data }) => data.daily.time);

        // Extract data for charts
        const allMaxTemperatures = historicWeatherData.map(({ year, data }) => data.daily.temperature_2m_max);
        const allRainfalls = historicWeatherData.map(({ year, data }) => data.daily.rain_sum);

        // Render temperature chart
        renderTemperatureChartForMultipleYears(allDates, allMaxTemperatures);

        // Render rainfall chart
        renderRainfallChartForMultipleYears(allDates, allRainfalls);
    } catch (error) {
        console.error('Error fetching historic weather data:', error);
    }
});


// Function to generate a gradient of colors based on a single color
function generateColorGradient(baseColor, numSteps) {
    const colors = [];
    const colorStep = 1 / (numSteps - 1);
    for (let i = 0; i < numSteps; i++) {
        const opacity = 1 - (i * colorStep);
        const rgbaColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
        colors.push(rgbaColor);
    }
    return colors;
}

// Function to render temperature chart with data for multiple years
// Function to render temperature chart with data for multiple years
function renderTemperatureChartForMultipleYears(dates, temperatures) {
    const combinedDates = dates.flat().map(date => new Date(date)); // Combine dates from all years
    const parsedDates = [...new Set(combinedDates)]; // Use set to remove duplicates and convert back to array
    const numDataPoints = parsedDates.length; // Number of data points across all years
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    const numYears = temperatures.length;
    const baseColor = { r: 255, g: 99, b: 132 }; // Base color for the gradient
    const gradientColors = generateColorGradient(baseColor, numYears);
    const temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: numDataPoints }, (_, index) => index), // Use indices as labels
            datasets: temperatures.map((temps, index) => ({
                label: `${new Date(dates[index][0]).getFullYear()}`,
                data: temps,
                borderColor: gradientColors[index],
                backgroundColor: `rgba(255, 255, 255, 0)`,
            }))
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Max Temperature (°C)',
                    },
                },
                x: {
                    title: {
                        display: false,
                    },
                    ticks: {
                        display: false, // Set display to false to remove x-axis labels
                    },
                    min: 0, // Set the minimum value of x-axis to 0
                    max: temperatures[0].length - 1, // Set the maximum value of x-axis to the last index
                }
            },
        },
    });
}


// Function to render rainfall chart with data for multiple years
function renderRainfallChartForMultipleYears(dates, rainfalls) {
    const combinedDates = dates.flat().map(date => new Date(date)); // Combine dates from all years
    const parsedDates = [...new Set(combinedDates)]; // Use set to remove duplicates and convert back to array
    const numDataPoints = parsedDates.length; // Number of data points across all years
    const ctx = document.getElementById('rainfallChart').getContext('2d');
    const numYears = rainfalls.length;
    const baseColor = { r: 54, g: 162, b: 235 }; // Base color for the gradient
    const gradientColors = generateColorGradient(baseColor, numYears);
    const rainfallChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: numDataPoints }, (_, index) => index), // Use indices as labels
            datasets: rainfalls.map((rain, index) => ({
                label: `${new Date(dates[index][0]).getFullYear()}`,
                data: rain,
                backgroundColor: gradientColors[index],
                borderColor: `rgba(54, 162, 235, 1)`,
            }))
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Daily Rainfall (mm)',
                    },
                },
                x: {
                    title: {
                        display: false,
                    },
                    ticks: {
                        display: false, // Set display to false to remove x-axis labels
                    },
                    min: 0, // Set the minimum value of x-axis to 0
                    max: rainfalls[0].length - 1, // Set the maximum value of x-axis to the last index
                }
            },
        },
    });
}

