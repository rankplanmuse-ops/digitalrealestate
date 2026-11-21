function cycleQuotes() {
    const quoteElement = document.getElementById("loadingText");
    if (!quoteElement) return;
    
    // Check if translation system is available
    if (!window.i18n || !window.i18n.translations || !window.i18n.translations[window.i18n.currentLang]) {
        // Fallback: try again after a short delay
        setTimeout(cycleQuotes, 100);
        return;
    }
    
    // Get quotes from the translation system
    const quotes = window.i18n.t('quotes', []);
    if (quotes.length === 0) {
        // Fallback to loading text if no quotes available
        quoteElement.textContent = window.i18n.t('loadingText', 'Loading...');
        return;
    }
    
    // Get a random quote from the quotes array
    const randomIndex = Math.floor(Math.random() * quotes.length);
    quoteElement.textContent = quotes[randomIndex];
}

function toggleContent() {
  const content = document.getElementById("simulationData");
  const toggleButton = document.getElementById("toggleButton");    
  content.style.display = content.style.display === "none" ? "block" : "none";
  
  // Toggle active class for button rotation
  toggleButton.classList.toggle("active");
}


function toggleInflationRateField() {
  const inflationRateField = document.getElementById("inflationRateField");
  inflationRateField.style.display = inflationRateField.style.display === "none" ? "block" : "none";
}

function updateBitcoinPercentage(totalMin, totalMax, btcMin, btcMax) {
  // Calculate percentage of Bitcoin in total portfolio
  const btcPercentageMin = ((btcMin / totalMin) * 100).toFixed(1);
  const btcPercentageMax = ((btcMax / totalMax) * 100).toFixed(1);

  // Update HTML content
  document.getElementById('btcPercentageMin').innerText = btcPercentageMin;
  document.getElementById('btcPercentageMax').innerText = btcPercentageMax;
}




  // Store the current Bitcoin price globally for language switching
  let currentBtcPrice = null;
  let btcPriceError = false;

  // Function to update Bitcoin price display based on current language
  function updateBitcoinPriceDisplay() {
      const priceElement = document.getElementById("currentPrice");
      
      if (btcPriceError) {
          const errorText = window.i18n.t('btcPriceError', 'Could not load BTC price.');
          priceElement.textContent = errorText;
      } else if (currentBtcPrice !== null) {
          const pricePrefix = window.i18n.t('currentBTCPrice', 'Current Bitcoin Price: $');
          priceElement.textContent = `${pricePrefix}${currentBtcPrice.toLocaleString()}`;
      } else {
          const loadingText = window.i18n.t('loadingBTCPrice', 'Loading BTC price...');
          priceElement.textContent = loadingText;
      }
  }

  // Listen for language changes to update Bitcoin price display
  window.addEventListener('languageChanged', function() {
      updateBitcoinPriceDisplay();
  });

  // Fetch Bitcoin price from CoinGecko
  document.addEventListener('DOMContentLoaded', function() {
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
          .then(response => response.json())
          .then(data => {
              currentBtcPrice = data.bitcoin.usd;
              btcPriceError = false;
              updateBitcoinPriceDisplay();
          })
          .catch(error => {
              console.error("Error fetching Bitcoin price:", error);
              currentBtcPrice = null;
              btcPriceError = true;
              updateBitcoinPriceDisplay();
          });
  });

  $(document).ready(function () {
      $('#configForm').submit(function (e) {
          e.preventDefault();
  
          // Hide the form container
          document.querySelector('.form-container').style.display = 'none';
  
          // Show the loading screen
          document.getElementById('loadingWindow').style.display = 'block';
  
          // Show a single random quote
          cycleQuotes();
  
          // Show the button that re-opens the form only after the form is hidden
          if (document.querySelector('.form-container').style.display === 'none') {
              showReopenButton();
          }
  
          // If validation passes, submit the form via AJAX
          if (validateForm()) {
              submitWithRetry({
                  url: 'https://dre.fits.money/api/run-script-realvalue',
                  method: 'POST',
                  data: $('#configForm').serialize(),
                  maxRetries: 5,
                  baseDelay: 2000, // Initial retry delay in milliseconds
                  timeout: 300000, // Timeout: 5 minutes
                  onSuccess: function (data) {
                      console.log('Task submitted successfully:', data);
  
                      // Start polling to check task status
                      pollTaskStatus(data.task_id);
                  },
                  onError: function (error) {
                      console.error('Error submitting task:', error);
  
                      // Hide the loading screen
                      document.getElementById('loadingWindow').style.display = 'none';
  
                      // Show the form container again
                      document.querySelector('.form-container').style.display = 'block';
  
                      alert('An error occurred while submitting your request. Please try again.');
                  }
              });
          } 
          else {
              // Hide the loading screen if validation fails
              document.getElementById('loadingWindow').style.display = 'none';
  
              // Show the form container again if validation fails
              document.querySelector('.form-container').style.display = 'block';
          }
      });
  });
  
  /**
   * Function to submit a form with retry logic
   */
  function submitWithRetry(options) {
      let retries = 0;
  
      function attempt() {
          $.ajax({
              url: options.url,
              method: options.method,
              data: options.data,
              timeout: options.timeout,
              success: function (data) {
                  if (options.onSuccess) options.onSuccess(data);
              },
              error: function (xhr, status, error) {
                  const retryableStatusCodes = [429, 503]; // Retry for these status codes
                  const delay = options.baseDelay * Math.pow(2, retries); // Exponential backoff
  
                  if (retries < options.maxRetries && retryableStatusCodes.includes(xhr.status)) {
                      retries++;
                      console.warn(`Retrying request (Attempt ${retries}/${options.maxRetries}) after ${delay} ms due to status: ${xhr.status}`);
                      setTimeout(attempt, delay); // Retry after delay
                  } else {
                      if (options.onError) options.onError(error || `HTTP ${xhr.status}`);
                  }
              }
          });
      }
  
      attempt(); // Initial attempt
  }

  function pollTaskStatus(taskId) {
      let pollInterval = 1700; // Start with 1.7s interval
      const maxPollInterval = 7700; // Max interval of 7.7s
      const maxPollingTime = 300000; // Stop polling after 5 minutes (300,000 ms)
      const growthFactor = 1.18; // Increase interval on pending responses
      const backoffFactor = 1.5; // Increase interval on errors
      const decayFactor = 0.85; // Reduce interval on successful polls
  
      const pollStartTime = Date.now(); // Track when polling started
  
      function toggleLoadingScreen(show) {
          document.getElementById('loadingWindow').style.display = show ? 'block' : 'none';
          if (show) {
              // Show a random quote when loading screen appears
              cycleQuotes();
          }
        //   document.querySelector('.form-container').style.display = show ? 'none' : 'block';
      }
  
      function handleSuccess(response) {
          console.log('Task completed successfully:', response.result);
  
          // Clear the quote cycling interval
          if (window.currentLoadingInterval) {
              clearInterval(window.currentLoadingInterval);
          }

          toggleLoadingScreen(false); // Hide loading screen
          document.getElementById('plotContainer').style.display = 'block'; // Show results
  
          updateTextualOutput(response.result);
          updatePlots(response.result);
          populateDataTable(response.result);
      }
  
      function handleFailure(message) {
          console.error(message);
          toggleLoadingScreen(false);
          alert(message);
      }
  
      function hasExceededMaxPollingTime() {
          return Date.now() - pollStartTime > maxPollingTime;
      }
  
      function poll() {
          if (hasExceededMaxPollingTime()) {
              handleFailure('Task polling exceeded maximum allowed time. Please try again later.');
              return;
          }
  
          $.ajax({
              url: `https://dre.fits.money/api/task-status/${taskId}`,
              method: 'GET',
              success: function (response) {
                  console.log('Polling response:', response);
  
                  switch (response.state) {
                      case 'PENDING':
                          console.log(
                              `Task ${taskId} is still processing. Increasing poll interval to ${(pollInterval / 1000).toFixed(2)}s.`
                          );
                          pollInterval = Math.min(pollInterval * growthFactor, maxPollInterval);
                          setTimeout(poll, pollInterval);
                          break;
  
                      case 'RETRY':
                          handleFailure(`Task ${taskId} encountered an issue and requires a retry. Please try again later.`);
                          break;
  
                      case 'SUCCESS':
                          handleSuccess(response);
                          break;
  
                      case 'FAILURE':
                          handleFailure(`Task ${taskId} failed: ${response.status}`);
                          break;
  
                      case 'TIMEOUT':
                          handleFailure(`Task ${taskId} timed out: The operation took too long to complete. Please try again later.`);
                          break;
  
                      default:
                          handleFailure(`Unknown task state: ${response.state}`);
                          break;
                  }
              },
              error: function (xhr, status, error) {
                  console.error(`Error while polling task ${taskId}:`, error);
  
                  if (hasExceededMaxPollingTime()) {
                      handleFailure('Polling stopped due to repeated errors. Please try again later.');
                      return;
                  }
  
                  console.log(
                      `Retrying polling for Task ${taskId} after error. Increasing interval to ${(pollInterval / 1000).toFixed(2)}s.`
                  );
                  pollInterval = Math.min(pollInterval * backoffFactor, maxPollInterval);
                  setTimeout(poll, pollInterval);
              },
          });
      }
  
      // Start polling immediately
      toggleLoadingScreen(true);
      poll();
  }





  // Dedicated function to update the textual output fields with the projected Bitcoin and portfolio values
  function updateTextualOutput(output_results) {
      console.log("updateTextualOutput - output_results:", output_results); // Debugging: Check data structure

      // Constants
      const datasetStartDate = new Date('2013-05-01');
      const run_dimensions = Object.keys(output_results.btc_prices);
      const exampleRun = run_dimensions[0];
      const exampleCR = Object.keys(output_results.btc_prices[exampleRun])[0];
      const numberOfMonths = output_results.btc_prices[exampleRun][exampleCR].length;
      const today = new Date();

      // Function to add months to a date
      function addMonths(date, months) {
          const d = new Date(date);
          d.setMonth(d.getMonth() + months);
          return d;
      }

      // Retrieve yearsAhead from the HTML input field
      const yearsAhead = parseInt(document.getElementById("projectDuration").value, 10);
      const addVolatility = document.getElementById("add_programmed_volatility").checked;
      
      const targetMonthsAhead = yearsAhead * 12;

      // Calculate the target index based on the dataset start date
      const monthsSinceStart = (today.getFullYear() - datasetStartDate.getFullYear()) * 12 +
                               today.getMonth() - datasetStartDate.getMonth();
      const targetIndex = monthsSinceStart + targetMonthsAhead;

      // Find the minimum length across all btc_portfolio_values arrays
      let minArrayLength = Infinity;
      run_dimensions.forEach((run_no) => {
          Object.keys(output_results.btc_portfolio_values[run_no]).forEach((cr) => {
              const portfolioValues = output_results.btc_portfolio_values[run_no][cr];
              minArrayLength = Math.min(minArrayLength, portfolioValues.length);
          });
      });

      const finalIndex = Math.min(targetIndex, minArrayLength);
      const PortfolioValueAtTargetYear = [];
      const RealEstateValuesAtTargetYear = [];

      run_dimensions.forEach((run_no) => {
          Object.keys(output_results.btc_portfolio_values[run_no]).forEach((cr) => {
              const portfolioAmount = output_results.btc_portfolio_values[run_no][cr];
              const btcPrices = output_results.btc_prices[run_no][cr];
              
              const portfolioValue = portfolioAmount[finalIndex - 1] * btcPrices[finalIndex - 1];
              PortfolioValueAtTargetYear.push(portfolioValue);
          });
      });

      const minValue = Math.min(...PortfolioValueAtTargetYear);
      const maxValue = Math.max(...PortfolioValueAtTargetYear);

      const formattedMinValue = minValue.toLocaleString(undefined, { 
          minimumFractionDigits: minValue < 10 ? 2 : 1, 
          maximumFractionDigits: minValue < 10 ? 2 : 1 
      });
      
      const formattedMaxValue = maxValue.toLocaleString(undefined, { 
          minimumFractionDigits: maxValue < 10 ? 2 : 1, 
          maximumFractionDigits: maxValue < 10 ? 2 : 1 
      });

      const dates = Array.from({ length: numberOfMonths }, (_, k) => addMonths(new Date(datasetStartDate), k));
      const formattedDates = dates.map(date => date.toISOString().split('T')[0]);

      const DateAtTargetIndex = new Date(formattedDates[finalIndex - 1]);
      const futureYear = DateAtTargetIndex.getFullYear();

      document.getElementById("futureYear").innerText = futureYear;
      document.getElementById("valueA").innerText = formattedMinValue;
      document.getElementById("valueB").innerText = addVolatility ? formattedMaxValue : '';

      // Real Estate Value at target date
      const realEstateValue = output_results.real_estate_values[finalIndex - 1] / 1_000_000;  // Assuming values are in millions
      document.getElementById("realEstateValue").innerText = realEstateValue.toLocaleString(undefined, { maximumFractionDigits: 1 });

      // Combined Portfolio Value at target date (assume btc + real estate)
      const combinedValueMin = minValue + realEstateValue;
      const combinedValueMax = maxValue + realEstateValue;
      document.getElementById("combinedValueMin").innerText = combinedValueMin.toLocaleString(undefined, { maximumFractionDigits: 1 });
      document.getElementById("combinedValueMax").innerText = addVolatility ? combinedValueMax.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '';

      // Bitcoin percentage in portfolio
      const btcPercentageMin = (minValue / combinedValueMin * 100).toFixed(1);
      const btcPercentageMax = (maxValue / combinedValueMax * 100).toFixed(1);
      document.getElementById("btcPercentageMin").innerText = btcPercentageMin;
      document.getElementById("btcPercentageMax").innerText = addVolatility ? btcPercentageMax : '';

      // Inflation-adjusted values
      const inflationAdjustedOutput = document.getElementById("inflationAdjustedOutput");
      const adjustForInflation = document.getElementById("adjustForInflation").checked;

      if (adjustForInflation) {
          const inflationRate = parseFloat(document.getElementById("inflationRate").value) / 100;
          const inflationFactor = Math.pow(1 + inflationRate, yearsAhead);
          const inflationAdjustedMin = combinedValueMin / inflationFactor;
          const inflationAdjustedMax = combinedValueMax / inflationFactor;

          document.getElementById("inflationAdjustedValueA").textContent = inflationAdjustedMin.toLocaleString(undefined, { maximumFractionDigits: 1 });
          document.getElementById("inflationAdjustedValueB").textContent = inflationAdjustedMax.toLocaleString(undefined, { maximumFractionDigits: 1 });
          
          inflationAdjustedOutput.style.display = "block";
      } else {
          inflationAdjustedOutput.style.display = "none";
      }
      
      if (addVolatility) {
          const avgFlag1 = document.getElementById("avgFlag1");
          const avgFlag2 = document.getElementById("avgFlag2");
          const avgFlag3 = document.getElementById("avgFlag3");
          const avgFlag4 = document.getElementById("avgFlag4");
          
          if (avgFlag1) avgFlag1.style.display = 'inline';
          if (avgFlag2) avgFlag2.style.display = 'inline';
          if (avgFlag3) avgFlag3.style.display = 'inline';
          if (avgFlag4) avgFlag4.style.display = 'inline';
      } else {
          const avgFlag1 = document.getElementById("avgFlag1");
          const avgFlag2 = document.getElementById("avgFlag2");
          const avgFlag3 = document.getElementById("avgFlag3");
          const avgFlag4 = document.getElementById("avgFlag4");
          
          if (avgFlag1) avgFlag1.style.display = 'none';
          if (avgFlag2) avgFlag2.style.display = 'none';
          if (avgFlag3) avgFlag3.style.display = 'none';
          if (avgFlag4) avgFlag4.style.display = 'none';
      }
      
      // Update portfolio summary with translations
      if (window.i18n && typeof window.i18n.updatePortfolioSummary === 'function') {
          window.i18n.updatePortfolioSummary();
      }
  }
  
  // Function to process yearly data for the stacked bar chart
  function generateYearlyPortfolioData(output_results) {
      var run_dimensions = Object.keys(output_results.btc_prices);  // Get run dimensions
      
      const today = new Date();
      const currentYear = today.getFullYear();
      const DataStartDate = new Date('2013-05-01'); // Start date
      const startingMonthIndex = (today.getFullYear() - DataStartDate.getFullYear()) * 12 + (today.getMonth() - DataStartDate.getMonth());
      
      const projectValueUSD = parseFloat(document.getElementById("projectValue").value) * 1e6; // Real estate project value in USD
      const yearsAhead = parseInt(document.getElementById("projectDuration").value, 10); // Number of years to simulate
      
      const run_numbers = Object.keys(output_results.btc_portfolio_values);  // Select the last run
      const lastRunNo = run_numbers[run_numbers.length - 1];
      const firstCR = Object.keys(output_results.btc_portfolio_values[lastRunNo])[0];
      
      // Prepare arrays for years, BTC values, and Real Estate values
      const years = [];
      const btcPortfolios = []; // Min BTC values
      const btcPortfolioMax = []; // Max BTC values
      const realEstateValues = [];
      
      // Populate data for the initial year
      const initialBTCValueBTC = output_results.btc_portfolio_values[lastRunNo][firstCR][startingMonthIndex] || 0;
      const btcStartPriceMUSD = output_results.btc_prices[lastRunNo][firstCR][startingMonthIndex] || 0;
      const initialBTCValueMUSD = initialBTCValueBTC * btcStartPriceMUSD;
      const initialRealEstateValueUSD = projectValueUSD; // Initial Real Estate value

      years.push(currentYear);
      btcPortfolios.push(initialBTCValueMUSD);
      btcPortfolioMax.push(initialBTCValueMUSD);
      realEstateValues.push(initialRealEstateValueUSD / 1e6);
  
      // Process future years
      for (let year = 1; year <= yearsAhead; year++) {
          const formattedYear = currentYear + year;
          const monthIndex = year * 12 + startingMonthIndex;
  
          // Check if data is available
          // if (!output_results.btc_portfolio_values[lastRunNo][firstCR][monthIndex]) continue; // OLD
          if (!(monthIndex in output_results.btc_portfolio_values[lastRunNo][firstCR])) continue; // NEW
  
          let btcPortfolioValues = [];
          run_dimensions.forEach((run_no) => {
              const btcPortfolioBTC = output_results.btc_portfolio_values[run_no][firstCR][monthIndex] || 0;
              const btcPriceMUSD = output_results.btc_prices[run_no][firstCR][monthIndex] || 0;
              btcPortfolioValues.push(btcPortfolioBTC * btcPriceMUSD);
          });
          
          const minBTCValue = Math.min(...btcPortfolioValues);
          const maxBTCValue = Math.max(...btcPortfolioValues);
                         
          // Store data
          years.push(formattedYear);
          btcPortfolios.push(minBTCValue);  // Min BTC value
          btcPortfolioMax.push(maxBTCValue);  // Max BTC value
          realEstateValues.push(output_results.real_estate_values[monthIndex] / 1e6);
      }
          
      return { years, btcPortfolios, btcPortfolioMax, realEstateValues };
  }
  
  // Dedicated function to update the plots.
  function updatePlots(output_results) {
      var run_dimensions = Object.keys(output_results.btc_prices);  // Get run dimensions
      var colors = ["#FFA500", "#FF8C00", "#FFD700", "#FF4500", "#FFD700"];  // Example color list
  
      // Get the starting date for the plots
      var startDate = '2013-05-01';

      // Function to add months to a date
      function addMonths(date, months) {
          var d = new Date(date);
          d.setMonth(d.getMonth() + months);
          return d;
      }
      
      // Assume that all runs have the same length; you can adjust if they differ
      var exampleRun = run_dimensions[0];
      var exampleCR = Object.keys(output_results.btc_prices[exampleRun])[0];
      var numberOfMonths = output_results.btc_prices[exampleRun][exampleCR].length;
      
      var startDateObj = new Date(startDate);  // Ensure startDate is a valid Date object
      // Generate the array of dates starting from startDate
      var dates = Array.from({length: numberOfMonths}, (_, k) => addMonths(new Date(startDate), k));
      
      // Convert dates to YYYY-MM-DD format for Plotly
      var formattedDates = dates.map(date => date.toISOString().split('T')[0]);     
  
      // Generate traces for BTC Price Over Time
      var btcPricesTraces = [];
      run_dimensions.forEach((run_no, i) => {
          Object.keys(output_results.btc_prices[run_no]).forEach((cr, j) => {
              var isLast = i === run_dimensions.length - 1; // Check if it's the last run
              var trace = {
                  x: formattedDates,
                  y: output_results.btc_prices[run_no][cr],
                  mode: 'lines',
                  line: { 
                      width: isLast ? 2 : 1.5, // If it's the last line, make it slightly thicker
                      color: colors[(i * Object.keys(output_results.btc_prices[run_no]).length + j) % colors.length],
                      dash: isLast ? 'dot' : 'none', // Makes the line dotted if it's the last one
                  },
                  name: isLast ? 'Price model' : `Generated price # ${run_no}`
              };
              btcPricesTraces.push(trace);
          });
      });

      // Generate traces for Portfolio in USD
      var usdPortfolioTraces = [];
      run_dimensions.forEach((run_no, i) => {
          Object.keys(output_results.combined_portfolio_values[run_no]).forEach((cr, j) => {
       
              // Safely transform to MUSD and skip zero values
              const combinedData = output_results.combined_portfolio_values[run_no][cr]
                  .map((v, idx) => ({
                      date: formattedDates[idx],
                      value: v !== null && v !== undefined && !isNaN(v) ? v / 1e6 : null
                  }))
                  .filter(item => item.value > 0); // Filter out zero or invalid values
              
              // Safely transform to MUSD
              var usdPortfolioValues = output_results.combined_portfolio_values[run_no][cr]
                  .filter(v => v !== null && v !== undefined && !isNaN(v)) // Handle bad data
                  .map(v => v / 1e6);
              
              // Separate filtered x and y values
              const filteredDates = combinedData.map(item => item.date);
              const filteredValues = combinedData.map(item => item.value);
              
              var isLast = i === run_dimensions.length - 1; // Check if it's the last run
              
              var trace = {
                  x: filteredDates, //formattedDates,
                  y: filteredValues, //usdPortfolioValues,
                  mode: 'lines',
                  line: { 
                      width: isLast ? 2 : 1.5, // If it's the last line, make it slightly thicker
                      color: colors[(i * Object.keys(output_results.btc_prices[run_no]).length + j) % colors.length],
                      dash: isLast ? 'dot' : 'none', // Makes the line dotted if it's the last one
                  },
                  name: isLast ? 'Price model' : `Generated price # ${run_no}`
              };
              usdPortfolioTraces.push(trace);
          });
      });
          
      // Function to create a plot and show it after rendering
      function createPlot(plotId, traces, layout) {
        const plotlyConfig = {
                displayModeBar: false,
                displaylogo: false,
                responsive: true,
                staticPlot: true
        };
        Plotly.newPlot(plotId, traces, layout, plotlyConfig).then(() => {
                document.getElementById(plotId).style.display = 'block';
        });
      }
      
      // Constants to estimate the index where to draw the indicator line
      const datasetStartDate = new Date('2013-05-01');
      const today = new Date();
      
      // Retrieve yearsAhead from the HTML input field
      const yearsAhead = parseInt(document.getElementById("projectDuration").value, 10);  // Convert the value to an integer
      const targetMonthsAhead = yearsAhead * 12;  // Project into the future by this many months
      
      // Calculate the target index based on the dataset start date
      const monthsSinceStart = (today.getFullYear() - datasetStartDate.getFullYear()) * 12 +
                               today.getMonth() - datasetStartDate.getMonth();

      // Calculate the target date based on the dataset start date
      const targetDate = new Date(datasetStartDate);
      targetDate.setMonth(targetDate.getMonth() + targetMonthsAhead + monthsSinceStart);
      
      // Format targetDate to match the x-axis date format (YYYY-MM-DD)
      const targetDateString = targetDate.toISOString().split('T')[0];  // Only take the date part (YYYY-MM-DD)
      
      // Common layout options
      var layoutOptions = {
          xaxis: { 
              title: 'Year', // 'Months passed since current date',
              showgrid: false,
              zeroline: true,
              showline: true,
              tickformat: '%Y',  // Ensure the date format is "YYYY"
              tickmode: 'array',    // Optional: Specify if you want to customize tick values
          },
          annotations: [
            {
                text: 'digitalrealestate.org',
                x: 0.01,
                y: 0.99,
                xref: 'paper',
                yref: 'paper',
                showarrow: false,
                font: {
                    size: 12,
                    color: 'rgba(100, 100, 100, 0.8)'
                },
                xanchor: 'left',
                yanchor: 'top',
                opacity: 0.9
            }
          ],
          margin: {
              l: 80,  // left margin, increased for labels
              r: 50,  // right margin
              b: 110,  // bottom margin - Extra for legend below
              t: 50,  // top margin
              pad: 4  // padding
          },
          showlegend: true,
          legend: {
              orientation: 'h',  // Make the legend horizontal
              x: 0.5,            // Center horizontally
              y: -0.7,           // Move legend below the chart
              xanchor: 'center', // Align legend's center horizontally
              yanchor: 'top'     // Align the top of the legend to the y-coordinate
          },            
          shapes: [
              {
                  type: 'line',
                  x0: targetDateString,
                  y0: 0,
                  x1: targetDateString,
                  y1: 1,
                  xref: 'x',
                  yref: 'paper',
                  line: {
                      color: 'rgba(0, 0, 0, 0.6)', // Adjust color as needed
                      width: 2,
                      dash: 'dot' // Makes the line dotted
                  }
              }
          ],
          responsive: false // Flexible sizing based on window size.
      };
      
      // Plot BTC Price Over Time
      createPlot('plot1', btcPricesTraces, {
          yaxis: { 
              title: 'BTC Price ($m)', 
              type: 'log',
              showgrid: true,
              zeroline: true,
              showline: true
          },
          ...layoutOptions
      });
      
      // Plot USD Portfolio
      createPlot('plot2', usdPortfolioTraces, {
          yaxis: { 
              title: 'Portfolio value ($m)',
              showgrid: true,
              zeroline: true,
              showline: true
          },
          ...layoutOptions
      });       


      // Generate yearly data for the stacked bar chart
      const { years, btcPortfolios, btcPortfolioMax, realEstateValues } = generateYearlyPortfolioData(output_results);

      // Determine if the checkbox is checked
      const addVolatility = document.getElementById('add_programmed_volatility').checked;
      
      const threshold = 5; // Minimum bar height to fit the label inside
      
      // Real Estate Base Trace
      const realEstateTrace = {
          x: years,
          y: realEstateValues,
          name: 'Real Estate',
          type: 'bar',
          marker: {
              color: '#C0C0C0',
              line: { width: 2, color: '#C0C0C0' } // Outline
          },
          text: realEstateValues.map(value => value.toFixed(1)),
          textposition: realEstateValues.map(value => value > threshold ? 'inside' : 'outside'),
          insidetextanchor: 'middle',
          texttemplate: '%{text}',
          textfont: { size: 12, family: 'Arial, sans-serif' },
          cliponaxis: false,
      };
      
      // BTC Portfolio Minimum Trace
      const btcMinTrace = {
          x: years,
          y: btcPortfolios,
          name: addVolatility ? 'BTC Portfolio (Min)' : 'BTC Portfolio (Average)',
          type: 'bar',
          marker: {
              color: '#FFA500',
              line: { width: 2, color: '#FFA500' } // Outline
          },
          text: btcPortfolios.map((value, i) => (value === 0 ? '' : value.toFixed(1))), // Hide 0 values
          textposition: btcPortfolios.map(value => value > threshold ? 'inside' : 'none'),
          insidetextanchor: 'middle',
          texttemplate: '%{text}',
          textfont: { size: 12, family: 'Arial, sans-serif' },
          cliponaxis: false,
      };
      
      // BTC Portfolio Potential (Max - Min) as a "dotted-line" bar
      const btcPotentialTrace = {
          x: years,
          y: btcPortfolioMax.map((max, i) => max - btcPortfolios[i]), // Potential = Max - Min
          name: 'BTC Portfolio (Potential)',
          type: 'bar',
          marker: {
              color: 'rgba(0,0,0,0)', // No background fill (transparent)
              line: { 
                  width: 2, 
                  dash: 'dot',
                  color: getComputedStyle(document.documentElement)
                      .getPropertyValue('--bitcoin-orange').trim()
              }
          },
          text: btcPortfolioMax.map((max, i) => {
              const potential = max - btcPortfolios[i];
              return potential === 0 ? '' : `+${potential.toFixed(1)}`; // Hide label if 0
          }),
          textposition: 'outside',
          texttemplate: '%{text}',
          textfont: { size: 12, family: 'Arial, sans-serif' },
          cliponaxis: false,
          opacity: 0.7, // Slight transparency for visual distinction
      };

      // Combine traces into a data array dynamically
      const barChartData = addVolatility
          ? [realEstateTrace, btcMinTrace, btcPotentialTrace]
          : [realEstateTrace, btcMinTrace];
      
      // Create a layout for the bar chart
      const barChartLayout = {
          barmode: 'stack',
          xaxis: { 
              title: 'Year',
              tickmode: 'linear', // Show all years
              automargin: true,
          },
          annotations: [
            {
                text: 'digitalrealestate.org',
                x: 0.01,
                y: 0.99,
                xref: 'paper',
                yref: 'paper',
                showarrow: false,
                font: {
                    size: 12,
                    color: 'rgba(100, 100, 100, 0.8)'
                },
                xanchor: 'left',
                yanchor: 'top',
                opacity: 0.9
            }
          ],
          yaxis: { 
              title: '$m',
              automargin: true,
          },
          margin: {
              l: 80,
              r: 50,
              b: 50,
              t: 50,
              pad: 4
          },
          showlegend: true,
          responsive: true,
          legend: {
              x: 0,
              y: 0.9,
              xanchor: 'left',
              yanchor: 'top',
          },
          hovermode: false,
      };

      // Plot the stacked bar chart
      const plotlyConfig = {
        displayModeBar: false,
        displaylogo: false,
        responsive: true,
        staticPlot: true
    };
    Plotly.newPlot('plot3', barChartData, barChartLayout, plotlyConfig);
    

      // Apply dark mode if applicable
      var layout = {
          paper_bgcolor: '#333333',
          plot_bgcolor: '#333333',
          font: { color: '#FFFFFF' }
      };
      
      if (isDarkMode) {
          Plotly.relayout('plot1', layout);
          Plotly.relayout('plot2', layout);
          Plotly.relayout('plot3', layout);
      }
      
      // Show the individual plots and their descriptions
      document.getElementById('plot1-description').style.display = 'block';
      document.getElementById('plot2-description').style.display = 'block';
      document.getElementById('plot3-description').style.display = 'block';
  
      // Add window resize event listener to relayout plots
      window.addEventListener('resize', function() {
          Plotly.Plots.resize('plot1');
          Plotly.Plots.resize('plot2');
          Plotly.Plots.resize('plot3');
      });
  }

// Dedicated function to extract portfolio values vs yearsAhead
function extractPortfolioValues(output_results, yearsAhead, startingMonthIndex) {
  const run_numbers = Object.keys(output_results.btc_portfolio_values);
  const lastRunNo = run_numbers[run_numbers.length - 1]; // Model run (last run_no)
  const firstCR = Object.keys(output_results.btc_portfolio_values[run_numbers[0]])[0];

  const valuesPerYear = [];
  
  for (let year = 0; year <= yearsAhead; year++) {
      const monthIndex = year * 12 + startingMonthIndex;

      let btcValues = [];
      run_numbers.forEach((run_no) => {
          const btcPortfolioBTC = output_results.btc_portfolio_values[run_no][firstCR][monthIndex] || 0;
          const btcPriceMUSD = output_results.btc_prices[run_no][firstCR][monthIndex] || 0;
          btcValues.push(btcPortfolioBTC * btcPriceMUSD); // BTC value in M-USD
      });

      // Extract min, max, and model values for the year
      const min = Math.min(...btcValues);
      const max = Math.max(...btcValues);
      const model = btcValues[run_numbers.indexOf(lastRunNo)]; // Model = last run_no

      valuesPerYear.push({ min, max, model });
  }

  return valuesPerYear;
}

// Function to adjust the table header based on the checkbox
function updateTableHeader(addVolatility) {
  const btcHeader = document.getElementById('btcHeader');

  // Adjust BTC column header
  btcHeader.innerHTML = addVolatility ? 'Bitcoin<br>(Min-Max)<br>($m)' : 'Bitcoin<br>(Avg)<br>($m)';
 
  document.getElementById("btcEstimateMode").innerText = 
      addVolatility ? "Min." : "Avg.";
}

// New function to populate the table based on the addVolatility flag option
function populateDataTable(output_results) {
  const dataTableBody = document.querySelector("#dataTable tbody");
  dataTableBody.innerHTML = ""; // Clear existing rows
  
  const addVolatility = document.getElementById('add_programmed_volatility').checked;

  // Update table header based on the flag value
  updateTableHeader(addVolatility);    

  const DataStartDate = new Date('2013-05-01');
  const today = new Date();
  const currentYear = today.getFullYear();
  const startingMonthIndex = (today.getFullYear() - DataStartDate.getFullYear()) * 12 + (today.getMonth() - DataStartDate.getMonth());
  const yearsAhead = parseInt(document.getElementById("projectDuration").value, 10);
  const projectValueUSD = parseFloat(document.getElementById("projectValue").value) * 1e6;

  // Extract portfolio values for all years (Min, Max, Model)
  const portfolioValues = extractPortfolioValues(output_results, yearsAhead, startingMonthIndex);

  // Populate table for each year
  for (let year = 0; year <= yearsAhead; year++) {
      const formattedYear = currentYear + year;

      const realEstateValueMUSD = output_results.real_estate_values[year * 12 + startingMonthIndex] / 1e6;

      // Choose BTC portfolio value based on volatility flag
      const btcPortfolioMUSD = addVolatility ? portfolioValues[year].min : portfolioValues[year].model;
      const totalPortfolioMUSD = btcPortfolioMUSD + realEstateValueMUSD;
      const btcPortionPercent = ((btcPortfolioMUSD / totalPortfolioMUSD) * 100).toFixed(1);
      // Calculate potential (additional upside)
      const btcPortfolioPotentialMUSD = portfolioValues[year].max;


      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${formattedYear}</td>
          <td>${realEstateValueMUSD.toFixed(2)}</td>
          <td>${btcPortfolioMUSD.toFixed(2)}${addVolatility ? ` ~ ${btcPortfolioPotentialMUSD.toFixed(2)}` : ''}</td>
          <td>${totalPortfolioMUSD.toFixed(2)}</td>
          <td>${btcPortionPercent}</td>
      `;
      dataTableBody.appendChild(row);
  }
}




// Retrieve the state from localStorage when the page loads
window.onload = function() {
  var savedState = localStorage.getItem('isDarkMode');
  isDarkMode = (savedState === 'true');
  applyDarkModeSettings(isDarkMode);
}

// Hide form on submit
//document.getElementById('configForm').onsubmit = function() {
//    document.querySelector('.form-container').style.display = 'none';
//}

function showReopenButton() {
  document.getElementById('reopenFormButton').style.display = 'block';
}

function reopenForm() {
  document.getElementById('formContainer').style.display = 'block';
  /* document.getElementById('plotContainer').style.display = 'none'; */
  document.getElementById('reopenFormButton').style.display = 'none';
}

/* Hide some elements based on conditional checks */
document.addEventListener('DOMContentLoaded', function() {

  // Function to toggle visibility based on checkbox state
  function toggleVisibility(checkboxId, targetId) {
      document.getElementById(checkboxId).addEventListener('change', function() {
          var targetElement = document.getElementById(targetId);
          targetElement.style.display = this.checked ? 'block' : 'none';
      });

      // Initial visibility based on the default state
      var targetElement = document.getElementById(targetId);
      targetElement.style.display = document.getElementById(checkboxId).checked ? 'block' : 'none';
  }

  // Function to toggle visibility based on select option values
  function toggleVisibilityByValues(selectId, values, targetId) {
      document.getElementById(selectId).addEventListener('change', function() {
          var targetElement = document.getElementById(targetId);
          if (Array.isArray(values)) {
              targetElement.style.display = values.includes(this.value) ? 'block' : 'none';
          } else {
              targetElement.style.display = this.value === values ? 'block' : 'none';
          }
      });

      // Initial visibility based on the default state
      var targetElement = document.getElementById(targetId);
      if (Array.isArray(values)) {
          targetElement.style.display = values.includes(document.getElementById(selectId).value) ? 'block' : 'none';
      } else {
          targetElement.style.display = document.getElementById(selectId).value === values ? 'block' : 'none';
      }
  }

  // Attach toggle functionality for each condition
  //toggleVisibility('add_programmed_volatility', 'programmed-volatility-details');

  // Attach toggle functionality for BTC Price Model select
  //toggleVisibilityByValues('btc_price_model', 'linear', 'linear-price-model-details');

  // Ensure the default setting is handled correctly
  //document.getElementById('btc_price_model').dispatchEvent(new Event('change'));

  // Show loading window on form submit
  document.getElementById('configForm').onsubmit = function() {
      document.getElementById('loadingWindow').style.display = 'block';
      // Show a random quote
      cycleQuotes();
      return true; // Ensure the form is submitted
  };
});

function toggleOptionalFields() {
  const optionalFields = document.getElementById("optionalFields");
  const showOptions = document.getElementById("showOptions");
  
  // Show or hide the optional fields based on checkbox state
  optionalFields.style.display = showOptions.checked ? "block" : "none";
}




// A function to export data to CSV from any plot and a button to download the file
function exportData(gd) {
// Access data from the Plotly graph
var data = gd.data;

// Convert data to a format suitable for exporting, e.g., CSV
var csvContent = "data:text/csv;charset=utf-8,";

// Assuming each trace has the same length and x-values
csvContent += "x," + data.map(trace => trace.name).join(",") + "\n";

for (var i = 0; i < data[0].x.length; i++) {
  var row = [data[0].x[i]];
  for (var j = 0; j < data.length; j++) {
    row.push(data[j].y[i]);
  }
  csvContent += row.join(",") + "\n";
}

// Create a download link and click it
var encodedUri = encodeURI(csvContent);
var link = document.createElement("a");
link.setAttribute("href", encodedUri);
link.setAttribute("download", "data.csv");
document.body.appendChild(link);
link.click();
}




// Create an array of colors for plots
function generateColors(startColor, endColor, steps) {
var start = {
  'Red': parseInt(startColor.slice(1, 3), 16),
  'Green': parseInt(startColor.slice(3, 5), 16),
  'Blue': parseInt(startColor.slice(5, 7), 16)
};
var end = {
  'Red': parseInt(endColor.slice(1, 3), 16),
  'Green': parseInt(endColor.slice(3, 5), 16),
  'Blue': parseInt(endColor.slice(5, 7), 16)
};
var step = {
  'Red': (end['Red'] - start['Red']) / steps,
  'Green': (end['Green'] - start['Green']) / steps,
  'Blue': (end['Blue'] - start['Blue']) / steps
};

var colors = [];
for (var i = 0; i <= steps; i++) {
  var red = Math.round(start['Red'] + step['Red'] * i).toString(16).padStart(2, '0');
  var green = Math.round(start['Green'] + step['Green'] * i).toString(16).padStart(2, '0');
  var blue = Math.round(start['Blue'] + step['Blue'] * i).toString(16).padStart(2, '0');
  colors.push("#" + red + green + blue);
}
return colors;
}



  // Ensure checkboxes are unchecked on page load
  window.addEventListener('load', function() {
      document.getElementById('showOptions').checked = false;
      document.getElementById('adjustForInflation').checked = false;
  });
  
  document.addEventListener('DOMContentLoaded', function() {
      // Get references to the checkboxes
      const inflationCheckbox = document.getElementById("adjustForInflation");
      const showOptionsCheckbox = document.getElementById("showOptions");
  
      // Force checkbox to be unchecked on page load
      inflationCheckbox.checked = false;
      showOptionsCheckbox.checked = false;
  });




  const projectInput = document.getElementById("projectValue");
  const btcInput = document.getElementById("btcAllocation");
  const projectPercentageLabel = document.getElementById("projectPercentage");
  const btcPercentageLabel = document.getElementById("btcPercentage");

  function updatePercentages() {
      const projectValue = parseFloat(projectInput.value) || 0;
      const btcValue = parseFloat(btcInput.value) || 0;
      const total = projectValue + btcValue;

      if (total > 0) {
          const projectPercentage = ((projectValue / total) * 100).toFixed(1);
          const btcPercentage = ((btcValue / total) * 100).toFixed(1);

          projectPercentageLabel.textContent = `${projectPercentage}%`;
          btcPercentageLabel.textContent = `${btcPercentage}%`;

          // Optional: Check if total is 100% (for debugging/validation)
          if (Math.abs(projectPercentage + btcPercentage - 100) > 0.1) {
              console.warn("Percentages do not add up to 100%.");
          }
      } else {
          projectPercentageLabel.textContent = "0.0%";
          btcPercentageLabel.textContent = "0.0%";
      }
  }

  projectInput.addEventListener("input", updatePercentages);
  btcInput.addEventListener("input", updatePercentages);

  // Initial calculation
  updatePercentages();