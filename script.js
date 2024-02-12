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

async function fetchHistoricWeatherForMultipleYears(latitude, longitude, startDate, endDate) {
    const years = [startDate.getFullYear(), startDate.getFullYear() - 1, startDate.getFullYear() - 2, startDate.getFullYear() - 3, startDate.getFullYear() - 4];
    const promises = years.map(year => {
        const startOfYear = new Date(year, startDate.getMonth(), startDate.getDate());
        const endOfYear = new Date(year, endDate.getMonth(), endDate.getDate());
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startOfYear.toISOString().split('T')[0]}&end_date=${endOfYear.toISOString().split('T')[0]}&daily=temperature_2m_max,precipitation_hours`;
        console.log(url)
        return fetch(url)
            .then(response => response.json())
            .then(data => ({ year, data }));
    });

    return Promise.all(promises);
}

// Function to categorize rainfall duration
function categorizeRainfallDuration(rainfallHours) {
    if (rainfallHours < 2) {
        return 'Dry';
    } else if (rainfallHours < 6) {
        return 'Shower';
    } else {
        return 'Rainy';
    }
}

// Function to calculate the average number of days falling into each category
function calculateAverageRainfallCategories(historicWeatherData) {
    const totalYears = historicWeatherData.length;
    const rainfallCategories = {
        Dry: 0,
        Shower: 0,
        Rainy: 0
    };

    historicWeatherData.forEach(({ data }) => {
        data.daily.precipitation_hours.forEach(rainfallHours => {
            const category = categorizeRainfallDuration(rainfallHours);
            rainfallCategories[category]++;
        });
    });

    // Calculate averages
    const averageRainfallCategories = {};
    Object.keys(rainfallCategories).forEach(category => {
        averageRainfallCategories[category] = rainfallCategories[category] / totalYears;
    });

    return averageRainfallCategories;
}

// Function to calculate expected daily max temperature range
function calculateExpectedTemperatureRange(dailyMaxTemperatures) {
    // Calculate median daily max temperature
    const sortedTemperatures = dailyMaxTemperatures.flat().sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedTemperatures.length / 2);
    const medianTemperature = sortedTemperatures.length % 2 === 0 ?
        (sortedTemperatures[medianIndex - 1] + sortedTemperatures[medianIndex]) / 2 :
        sortedTemperatures[medianIndex];

    // Calculate standard deviation of daily max temperatures
    const meanTemperature = dailyMaxTemperatures.flat().reduce((acc, val) => acc + val, 0) / dailyMaxTemperatures.flat().length;
    const squaredDifferences = dailyMaxTemperatures.flat().map(temp => Math.pow(temp - meanTemperature, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / squaredDifferences.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate expected range
    const lowerRange = Math.round(medianTemperature - standardDeviation);
    const upperRange = Math.round(medianTemperature + standardDeviation);

    return { lowerRange, upperRange };
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

        // Calculate average number of days falling into each rainfall category
        const averageRainfallCategories = calculateAverageRainfallCategories(historicWeatherData);
        console.log('Average Rainfall Categories:', averageRainfallCategories);



        // Extract all dates for all years
        const allDates = historicWeatherData.map(({ year, data }) => data.daily.time);

        // Extract data for charts
        const allMaxTemperatures = historicWeatherData.map(({ year, data }) => data.daily.temperature_2m_max);
        const allRainfalls = historicWeatherData.map(({ year, data }) => data.daily.precipitation_hours);

        // Calculate expected daily max temperature range
        const expectedTemperatureRange = calculateExpectedTemperatureRange(allMaxTemperatures);
        console.log('Expected Daily Max Temperature Range:', expectedTemperatureRange);


        // Render temperature chart
        renderTemperatureChartForMultipleYears(allDates, allMaxTemperatures);

        // Render rainfall chart
        renderRainfallChartForMultipleYears(allDates, allRainfalls);

        renderPieChart(averageRainfallCategories);

        displayTripInfo(expectedTemperatureRange, averageRainfallCategories);

    } catch (error) {
        console.error('Error fetching historic weather data:', error);
    }
});
// Function to display trip information
function displayTripInfo(temperatureRange, rainfallCategories) {
    const tripInfoElement = document.getElementById('tripInfo');
    const dailyHigh = `${temperatureRange.lowerRange.toFixed(0)}-${temperatureRange.upperRange.toFixed(0)}°C`;
    const dryDays = rainfallCategories.Dry;
    const showerDays = rainfallCategories.Shower;
    const rainyDays = rainfallCategories.Rainy;

    tripInfoElement.textContent = `At that time of year, you can expect a daily high of between ${dailyHigh}. There would typically be ${dryDays} dry days, ${showerDays} days with showers, and ${rainyDays} days that are rainy.`;
}

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
        type: 'line',
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
                        text: 'precipitation_hours',
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

// Function to render pie chart for average rainfall categories
function renderPieChart(averageRainfallCategories) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    const labels = Object.keys(averageRainfallCategories);
    const data = Object.values(averageRainfallCategories);

    const pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Average Rainfall Categories',
                    fontSize: 16,
                },
                legend: {
                    position: 'right',
                }
            },
        }
    });
}
