document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const searchForm = document.getElementById("search-form")
  const locationInput = document.getElementById("location")
  const wifiFilterSelect = document.getElementById("wifi-filter")
  const searchButton = document.getElementById("search-button")
  const errorMessage = document.getElementById("error-message")
  const loadingIndicator = document.getElementById("loading")
  const resultsContainer = document.getElementById("results-container")
  const resultsCount = document.getElementById("results-count")
  const hotelResults = document.getElementById("hotel-results")

  // Event listeners
  searchForm.addEventListener("submit", handleSearch)

  // Handle search form submission
  async function handleSearch(e) {
    e.preventDefault()

    const location = locationInput.value.trim()
    const wifiFilter = wifiFilterSelect.value

    if (!location) {
      showError("Please enter a location")
      return
    }

    // Reset UI
    hideError()
    showLoading()
    hideResults()

    try {
      // Fetch hotel data from API
      const response = await fetch(`/api/hotels?location=${encodeURIComponent(location)}&wifiFilter=${wifiFilter}`)

      if (!response.ok) {
        throw new Error("Failed to fetch hotel data")
      }

      const hotels = await response.json()
      displayResults(hotels)
    } catch (error) {
      showError("Error fetching hotel data. Please try again.")
      console.error(error)
    } finally {
      hideLoading()
    }
  }

  // Display hotel results
  function displayResults(hotels) {
    // Clear previous results
    hotelResults.innerHTML = ""

    if (hotels.length === 0) {
      resultsCount.textContent = "No hotels found matching your criteria."
      showResults()
      return
    }

    resultsCount.textContent = `Results (${hotels.length})`

    // Create hotel cards
    hotels.forEach((hotel) => {
      const hotelCard = document.createElement("div")
      hotelCard.className = "hotel-card"

      const isGoodWifi =
        hotel.wifiQuality.toLowerCase().includes("good") ||
        hotel.wifiQuality.toLowerCase().includes("excellent") ||
        hotel.wifiQuality.toLowerCase().includes("fast")

      hotelCard.innerHTML = `
        <div class="hotel-header">
          <h3 class="hotel-name">${hotel.name}</h3>
          <span class="wifi-icon ${isGoodWifi ? "wifi-good" : "wifi-poor"}">
            <i class="fas fa-${isGoodWifi ? "wifi" : "wifi-slash"}"></i>
          </span>
        </div>
        <p class="hotel-location">${hotel.location}</p>
        <div class="hotel-footer">
          <span class="review-count">${hotel.reviewCount} reviews</span>
          <span class="wifi-quality">${hotel.wifiQuality}</span>
        </div>
      `

      hotelResults.appendChild(hotelCard)
    })

    showResults()
  }

  // UI helper functions
  function showError(message) {
    errorMessage.textContent = message
    errorMessage.style.display = "block"
  }

  function hideError() {
    errorMessage.style.display = "none"
  }

  function showLoading() {
    loadingIndicator.style.display = "flex"
    searchButton.disabled = true
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Searching...</span>'
  }

  function hideLoading() {
    loadingIndicator.style.display = "none"
    searchButton.disabled = false
    searchButton.innerHTML = '<i class="fas fa-search"></i><span>Search Hotels</span>'
  }

  function showResults() {
    resultsContainer.style.display = "block"
  }

  function hideResults() {
    resultsContainer.style.display = "none"
  }
})
