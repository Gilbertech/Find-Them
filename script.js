// Global state
let currentUser = null
let currentPage = "landing"
let currentTab = "home"
let notifications = []
let isNotificationsEnabled = false
let currentLocation = null
let chatMessages = []
let currentStoryIndex = 0

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in from localStorage
  const storedUser = localStorage.getItem("currentUser")
  if (storedUser) {
    currentUser = JSON.parse(storedUser)
    showDashboard()
  } else {
    showPage("landing-page")
  }

  // Initialize all features
  initializeEnhancedFeatures()
  initializeLandingAnimations()
  initializePhotoUpload()
  initializeRealTimeLocation()
  initializeChatSystem()

  // Set up search functionality
  const searchInput = document.querySelector(".search-input")
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300))
  }

  // Close modals when clicking outside
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.classList.add("hidden")
    }
  })

  // Close hamburger menu when clicking outside
  document.addEventListener("click", (event) => {
    const menu = document.getElementById("hamburger-menu")
    const profileDropdown = document.querySelector(".profile-dropdown")

    if (menu && !menu.contains(event.target) && !profileDropdown?.contains(event.target)) {
      menu.classList.add("hidden")
    }
  })

  // Start real-time updates simulation
  simulateRealTimeUpdates()
  initializeNotifications()
})

// Landing Page Interactive Animations
function initializeLandingAnimations() {
  // Animate counters when they come into view
  const counters = document.querySelectorAll(".stat-number[data-target]")

  const animateCounter = (counter) => {
    const target = Number.parseInt(counter.getAttribute("data-target"))
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0

    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        counter.textContent = target.toLocaleString()
        clearInterval(timer)
      } else {
        counter.textContent = Math.floor(current).toLocaleString()
      }
    }, 16)
  }

  // Intersection Observer for animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (entry.target.hasAttribute("data-target")) {
          animateCounter(entry.target)
        }
        entry.target.classList.add("animate")
        observer.unobserve(entry.target)
      }
    })
  })

  counters.forEach((counter) => observer.observe(counter))

  // Auto-rotate success stories
  setInterval(() => {
    rotateStories()
  }, 5000)
}

// Interactive Landing Page Functions
function animateLogo() {
  const logo = document.querySelector(".nav-brand")
  logo.style.transform = "scale(1.1) rotate(5deg)"
  setTimeout(() => {
    logo.style.transform = "scale(1) rotate(0deg)"
  }, 300)
}

function animateStatCard(card) {
  card.style.transform = "scale(1.1) rotateY(10deg)"
  setTimeout(() => {
    card.style.transform = "scale(1) rotateY(0deg)"
  }, 300)
}

function animateFloatingCard(card) {
  card.style.transform = "scale(1.2) rotate(10deg)"
  card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)"
  setTimeout(() => {
    card.style.transform = "scale(1) rotate(0deg)"
    card.style.boxShadow = ""
  }, 500)
}

function highlightStep(step) {
  // Remove active class from all steps
  document.querySelectorAll(".feature-step").forEach((s) => s.classList.remove("active"))

  // Add active class to clicked step
  step.classList.add("active")

  // Animate step number
  const stepNumber = step.querySelector(".step-number")
  stepNumber.style.transform = "scale(1.2)"
  setTimeout(() => {
    stepNumber.style.transform = "scale(1)"
  }, 300)
}

function selectStory(card, index) {
  // Remove active class from all stories
  document.querySelectorAll(".story-card").forEach((s) => s.classList.remove("active"))
  document.querySelectorAll(".indicator").forEach((i) => i.classList.remove("active"))

  // Add active class to selected story
  card.classList.add("active")
  document.querySelectorAll(".indicator")[index].classList.add("active")

  currentStoryIndex = index
}

function goToStory(index) {
  const stories = document.querySelectorAll(".story-card")
  const indicators = document.querySelectorAll(".indicator")

  // Remove active classes
  stories.forEach((s) => s.classList.remove("active"))
  indicators.forEach((i) => i.classList.remove("active"))

  // Add active to selected
  stories[index].classList.add("active")
  indicators[index].classList.add("active")

  currentStoryIndex = index
}

function rotateStories() {
  const totalStories = document.querySelectorAll(".story-card").length
  currentStoryIndex = (currentStoryIndex + 1) % totalStories
  goToStory(currentStoryIndex)
}

// Page Management
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active")
  })
  const targetPage = document.getElementById(pageId)
  if (targetPage) {
    targetPage.classList.add("active")
  }
  currentPage = pageId
}

function showDashboard() {
  showPage("dashboard")
  if (currentUser) {
    updateDashboardForUser(currentUser)
  }
}

function enterDashboard() {
  // Demo user for quick access
  currentUser = {
    id: "demo",
    name: "Demo User",
    email: "demo@findthem.com",
    role: "user",
    avatar: "/placeholder.svg?height=40&width=40",
  }
  localStorage.setItem("currentUser", JSON.stringify(currentUser))
  showDashboard()
  showEmotionalNotification("Welcome to FindThem! You're now using the platform.", "success")
}

// Tab Management
function showTab(tabId) {
  // Update navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active")
  })

  // Find the clicked nav item
  const clickedItem = event?.target?.closest(".nav-item")
  if (clickedItem) {
    clickedItem.classList.add("active")
  }

  // Update content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })
  const targetTab = document.getElementById(tabId + "-tab")
  if (targetTab) {
    targetTab.classList.add("active")
  }

  currentTab = tabId

  // Load tab-specific content
  if (tabId === "notifications") {
    loadNotifications()
  }
}

// Search and Filters
function toggleSearchFilters() {
  const filters = document.getElementById("search-filters")
  if (filters) {
    filters.classList.toggle("hidden")
  }
}

// Real-time Location System
function initializeRealTimeLocation() {
  if ("geolocation" in navigator) {
    // Get initial location
    getCurrentLocation()

    // Update location every 30 seconds
    setInterval(() => {
      if (currentUser) {
        updateLocationSilently()
      }
    }, 30000)
  }
}

function getCurrentLocation() {
  if ("geolocation" in navigator) {
    showEmotionalNotification("Getting your location...", "info")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)

        currentLocation = {
          latitude: lat,
          longitude: lng,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy,
        }

        localStorage.setItem("userLocation", JSON.stringify(currentLocation))

        // Reverse geocode to get address
        reverseGeocode(lat, lng).then((address) => {
          showEmotionalNotification(`Location detected: ${address}`, "success")
        })
      },
      (error) => {
        let errorMessage = "Unable to get your location. "
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access in your browser settings."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable."
            break
          case error.TIMEOUT:
            errorMessage += "Location request timed out."
            break
          default:
            errorMessage += "An unknown error occurred."
            break
        }
        showEmotionalNotification(errorMessage, "error")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )
  } else {
    showEmotionalNotification("Geolocation is not supported by this browser.", "error")
  }
}

function updateLocationSilently() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)

        currentLocation = {
          latitude: lat,
          longitude: lng,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy,
        }

        localStorage.setItem("userLocation", JSON.stringify(currentLocation))
      },
      () => {}, // Silent error handling
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000, // 10 minutes
      },
    )
  }
}

function detectCurrentLocation() {
  const locationInput = document.querySelector('input[name="lastLocation"]')
  if (!locationInput) return

  if (currentLocation) {
    reverseGeocode(currentLocation.latitude, currentLocation.longitude).then((address) => {
      locationInput.value = address
      showEmotionalNotification("Current location added to form", "success")
    })
  } else {
    getCurrentLocation()
  }
}

async function reverseGeocode(lat, lng) {
  try {
    // Using a free geocoding service (in production, use Google Maps API or similar)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    )
    const data = await response.json()

    if (data.locality && data.countryName) {
      return `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`
    } else {
      return `${lat}, ${lng}`
    }
  } catch (error) {
    return `${lat}, ${lng}`
  }
}

// Photo Upload System
function initializePhotoUpload() {
  const photoInput = document.getElementById("photo-upload")
  if (photoInput) {
    photoInput.addEventListener("change", handlePhotoUpload)
  }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showEmotionalNotification("Please select a valid image file", "error")
    return
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    showEmotionalNotification("Image size must be less than 5MB", "error")
    return
  }

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    const uploadArea = document.getElementById("photo-upload-area")
    const uploadLabel = uploadArea.querySelector(".upload-label")
    const preview = document.getElementById("photo-preview")
    const previewImage = document.getElementById("preview-image")

    // Hide upload label and show preview
    uploadLabel.classList.add("hidden")
    preview.classList.remove("hidden")
    previewImage.src = e.target.result

    showEmotionalNotification("Photo uploaded successfully", "success")
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  const uploadArea = document.getElementById("photo-upload-area")
  const uploadLabel = uploadArea.querySelector(".upload-label")
  const preview = document.getElementById("photo-preview")
  const photoInput = document.getElementById("photo-upload")

  // Reset form
  photoInput.value = ""
  uploadLabel.classList.remove("hidden")
  preview.classList.add("hidden")

  showEmotionalNotification("Photo removed", "info")
}

// Enhanced Chat System
function initializeChatSystem() {
  // Initialize chat messages array
  chatMessages = [
    {
      id: 1,
      user: "System",
      message: "Welcome to the community chat. Share tips and coordinate search efforts responsibly.",
      timestamp: Date.now(),
      type: "system",
    },
  ]

  // Load chat messages
  loadChatMessages()
}

function toggleChat() {
  const chatSystem = document.getElementById("chat-system")
  if (chatSystem) {
    chatSystem.classList.toggle("hidden")

    if (!chatSystem.classList.contains("hidden")) {
      // Focus on input when chat opens
      const chatInput = document.getElementById("chat-input")
      if (chatInput) {
        setTimeout(() => chatInput.focus(), 100)
      }

      // Mark as online
      updateChatStatus("online")

      // Scroll to bottom
      scrollChatToBottom()
    }
  }
}

function loadChatMessages() {
  const messagesContainer = document.getElementById("chat-messages")
  if (!messagesContainer) return

  messagesContainer.innerHTML = ""

  chatMessages.forEach((message) => {
    const messageElement = createChatMessage(message)
    messagesContainer.appendChild(messageElement)
  })

  scrollChatToBottom()
}

function createChatMessage(message) {
  const messageElement = document.createElement("div")
  messageElement.className = `chat-message ${message.type}`

  if (message.type === "system") {
    messageElement.innerHTML = `<span>${message.message}</span>`
  } else {
    messageElement.innerHTML = `
      <div class="message-header">
        <strong>${message.user}</strong>
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
      <div class="message-content">${escapeHtml(message.message)}</div>
    `
  }

  return messageElement
}

function handleChatKeyPress(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    sendChatMessage()
  }
}

function sendChatMessage() {
  const input = document.getElementById("chat-input")
  const sendBtn = document.getElementById("send-btn")

  if (!input || !sendBtn) return

  const message = input.value.trim()
  if (!message) return

  // Disable send button temporarily
  sendBtn.disabled = true
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

  // Create user message
  const userMessage = {
    id: Date.now(),
    user: currentUser?.name || "You",
    message: message,
    timestamp: Date.now(),
    type: "user",
  }

  // Add to messages array
  chatMessages.push(userMessage)

  // Add to DOM
  const messagesContainer = document.getElementById("chat-messages")
  if (messagesContainer) {
    const messageElement = createChatMessage(userMessage)
    messagesContainer.appendChild(messageElement)
    scrollChatToBottom()
  }

  // Clear input
  input.value = ""

  // Re-enable send button
  setTimeout(() => {
    sendBtn.disabled = false
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'
  }, 1000)

  // Simulate response after delay
  setTimeout(
    () => {
      simulateChatResponse()
    },
    2000 + Math.random() * 3000,
  )
}

function simulateChatResponse() {
  const responses = [
    "I saw someone matching that description near the mall earlier today",
    "Shared this with my local WhatsApp group - spreading the word",
    "Police have been notified about this case, they're investigating",
    "Let me check with my neighbors and get back to you",
    "I'll keep an eye out in my area during my evening walk",
    "Have you tried posting on social media as well?",
    "Praying for a safe return 🙏",
    "The community is here to help - don't lose hope",
    "I've contacted local security guards about this",
    "Sharing with my church group right now",
  ]

  const names = ["Sarah K.", "Mike O.", "Officer Johnson", "Grace M.", "David L.", "Faith W.", "Peter N.", "Mary A."]

  const responseMessage = {
    id: Date.now(),
    user: names[Math.floor(Math.random() * names.length)],
    message: responses[Math.floor(Math.random() * responses.length)],
    timestamp: Date.now(),
    type: "other",
  }

  chatMessages.push(responseMessage)

  const messagesContainer = document.getElementById("chat-messages")
  if (messagesContainer) {
    const messageElement = createChatMessage(responseMessage)
    messagesContainer.appendChild(messageElement)
    scrollChatToBottom()
  }
}

function scrollChatToBottom() {
  const messagesContainer = document.getElementById("chat-messages")
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

function updateChatStatus(status) {
  const statusIndicator = document.querySelector(".status-indicator")
  const statusText = document.querySelector(".chat-status span")

  if (statusIndicator && statusText) {
    statusIndicator.className = `status-indicator ${status}`
    statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Notifications System
function initializeNotifications() {
  // Initialize with demo notifications
  notifications = [
    {
      id: 1,
      type: "success",
      title: "Person Found",
      message: "Great news! Sarah from your post has been found safe.",
      time: new Date(Date.now() - 2 * 60 * 1000),
      read: false,
    },
    {
      id: 2,
      type: "info",
      title: "New Comment",
      message: "Someone commented on your missing person post",
      time: new Date(Date.now() - 60 * 60 * 1000),
      read: true,
    },
    {
      id: 3,
      type: "warning",
      title: "Post Expiring",
      message: "Your post for Brian Kariuki expires in 2 days",
      time: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: false,
    },
  ]

  updateNotificationBadge()

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        isNotificationsEnabled = true
        showEmotionalNotification(
          "🔔 Push notifications enabled! You'll receive alerts about important updates.",
          "success",
        )
      }
    })
  }
}

function loadNotifications() {
  const notificationsList = document.getElementById("notifications-list")
  if (!notificationsList) return

  notificationsList.innerHTML = ""

  notifications.forEach((notification) => {
    const notificationElement = createNotificationElement(notification)
    notificationsList.appendChild(notificationElement)
  })
}

function createNotificationElement(notification) {
  const div = document.createElement("div")
  div.className = `notification-item ${!notification.read ? "unread" : ""}`
  div.setAttribute("data-id", notification.id)

  const iconClass =
    {
      success: "fas fa-check-circle",
      info: "fas fa-info-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }[notification.type] || "fas fa-bell"

  div.innerHTML = `
    <div class="notification-icon">
      <i class="${iconClass}"></i>
    </div>
    <div class="notification-content">
      <p><strong>${notification.title}</strong> ${notification.message}</p>
      <span class="notification-time">${formatTimeAgo(notification.time)}</span>
    </div>
    <button class="notification-close" onclick="removeNotification(${notification.id})">×</button>
  `

  return div
}

function formatTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}

function addNotification(type, title, message) {
  const notification = {
    id: Date.now(),
    type,
    title,
    message,
    time: new Date(),
    read: false,
  }

  notifications.unshift(notification)
  updateNotificationBadge()

  // Show toast notification
  showEmotionalNotification(`${title}: ${message}`, type)

  // Send push notification
  if (isNotificationsEnabled) {
    sendPushNotification(title, message)
  }

  // Update notifications tab if it's active
  if (currentTab === "notifications") {
    loadNotifications()
  }
}

function removeNotification(id) {
  notifications = notifications.filter((n) => n.id !== id)
  updateNotificationBadge()

  const element = document.querySelector(`[data-id="${id}"]`)
  if (element) {
    element.style.animation = "slideOutRight 0.3s ease-out"
    setTimeout(() => element.remove(), 300)
  }
}

function markAllNotificationsRead() {
  notifications.forEach((n) => (n.read = true))
  updateNotificationBadge()
  loadNotifications()
  showEmotionalNotification("All notifications marked as read", "success")
}

function updateNotificationBadge() {
  const badge = document.querySelector(".notification-badge")
  const unreadCount = notifications.filter((n) => !n.read).length

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount
      badge.style.display = "flex"
    } else {
      badge.style.display = "none"
    }
  }
}

function showNotifications() {
  showTab("notifications")
}

function sendPushNotification(title, body, icon = "/placeholder.svg?height=64&width=64&text=FindThem") {
  if ("Notification" in window && Notification.permission === "granted" && isNotificationsEnabled) {
    const notification = new Notification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: "findthem-notification",
      requireInteraction: false,
      silent: false,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    setTimeout(() => notification.close(), 5000)
  }
}

// Settings System
function showProfileSettings() {
  hideHamburgerMenu()
  showSettingsModal("Profile Settings", createProfileSettingsContent())
}

function showAccountSettings() {
  hideHamburgerMenu()
  showSettingsModal("Account Settings", createAccountSettingsContent())
}

function showNotificationSettings() {
  hideHamburgerMenu()
  showSettingsModal("Notification Settings", createNotificationSettingsContent())
}

function showPrivacySettings() {
  hideHamburgerMenu()
  showSettingsModal("Privacy & Security", createPrivacySettingsContent())
}

function showHelpSupport() {
  hideHamburgerMenu()
  showSettingsModal("Help & Support", createHelpSupportContent())
}

function showAbout() {
  hideHamburgerMenu()
  showSettingsModal("About FindThem", createAboutContent())
}

function showSettingsModal(title, content) {
  const modal = document.getElementById("settings-modal")
  const titleElement = document.getElementById("settings-title")
  const contentElement = document.getElementById("settings-content")

  if (modal && titleElement && contentElement) {
    titleElement.textContent = title
    contentElement.innerHTML = content
    modal.classList.remove("hidden")
  }
}

function hideSettingsModal() {
  const modal = document.getElementById("settings-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
}

function createProfileSettingsContent() {
  return `
    <div class="settings-section">
      <h4>Personal Information</h4>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" value="${currentUser?.name || ""}" placeholder="Enter your full name">
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" value="${currentUser?.email || ""}" placeholder="Enter your email">
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel" placeholder="Enter your phone number">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" placeholder="Enter your location">
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Profile Photo</h4>
      <div class="photo-upload">
        <input type="file" id="profile-photo" accept="image/*">
        <label for="profile-photo" class="upload-label">
          <i class="fas fa-camera"></i>
          <span>Change Profile Photo</span>
        </label>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
      <button class="btn-primary" onclick="saveProfileSettings()">Save Changes</button>
    </div>
  `
}

function createAccountSettingsContent() {
  return `
    <div class="settings-section">
      <h4>Account Security</h4>
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" placeholder="Enter current password">
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" placeholder="Enter new password">
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" placeholder="Confirm new password">
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Account Preferences</h4>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Two-Factor Authentication</h5>
          <p>Add an extra layer of security to your account</p>
        </div>
        <div class="toggle-switch" onclick="toggleSetting(this)">
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Login Alerts</h5>
          <p>Get notified when someone logs into your account</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
      <button class="btn-primary" onclick="saveAccountSettings()">Save Changes</button>
    </div>
  `
}
  function showContactForm() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Contact Us</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <form onsubmit="submitContact(event)">
          <div class="form-group">
            <label>Name</label>
            <input name="name" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea name="message" rows="4" required></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Send</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function showFeedbackForm() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Feedback</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <form onsubmit="submitFeedback(event)">
          <div class="form-group">
            <label>Your Feedback</label>
            <textarea name="feedback" rows="4" required></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function submitContact(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");

    alert(`Thanks, ${name}! We received your message: "${message}"`);
    event.target.closest(".modal").remove();
  }

  function submitFeedback(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const feedback = data.get("feedback");

    alert("Thanks for your feedback!");
    event.target.closest(".modal").remove();
  }
function showTerms() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Terms of Service</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          <p>
            Welcome to our platform. By accessing or using our services, you agree to be bound by these Terms of Service.
            You must not misuse our services or attempt to access them using a method other than the interface we provide.
          </p>
          <p>
            We reserve the right to modify or terminate our service at any time, with or without notice. Continued use of the platform 
            after any updates to the terms constitutes acceptance of the changes.
          </p>
          <p>
            You agree not to use the platform for unlawful or prohibited activities. Any breach may result in suspension or termination of your account.
          </p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function showPrivacy() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Privacy Policy</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          <p>
            We value your privacy. This policy outlines how we collect, use, and protect your personal information.
          </p>
          <p>
            We collect information such as your name, email, and usage data to improve our services. We do not share your data with third parties 
            without your consent, except where required by law.
          </p>
          <p>
            You have the right to access, update, or delete your data. Contact us anytime for privacy-related concerns.
          </p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
function createNotificationSettingsContent() {
  return `
    <div class="settings-section">
      <h4>Push Notifications</h4>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Missing Person Alerts</h5>
          <p>Get notified about new missing person reports in your area</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Found Person Updates</h5>
          <p>Get notified when missing persons are found</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Community Messages</h5>
          <p>Get notified about messages in community chat</p>
        </div>
        <div class="toggle-switch" onclick="toggleSetting(this)">
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Email Notifications</h4>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Weekly Summary</h5>
          <p>Receive a weekly summary of platform activity</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Tips and Updates</h5>
          <p>Receive tips about your missing person posts</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
      <button class="btn-primary" onclick="saveNotificationSettings()">Save Changes</button>
    </div>
  `
}

function createPrivacySettingsContent() {
  return `
    <div class="settings-section">
      <h4>Privacy Controls</h4>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Profile Visibility</h5>
          <p>Control who can see your profile information</p>
        </div>
        <select class="form-control">
          <option>Everyone</option>
          <option>Community Members Only</option>
          <option>Friends Only</option>
        </select>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Location Sharing</h5>
          <p>Allow the platform to use your location for better results</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Contact Information</h5>
          <p>Show your contact information on missing person posts</p>
        </div>
        <div class="toggle-switch active" onclick="toggleSetting(this)">
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Data Management</h4>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Data Export</h5>
          <p>Download a copy of your data</p>
        </div>
        <button class="btn-secondary" onclick="exportUserData()">Export Data</button>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <h5>Delete Account</h5>
          <p>Permanently delete your account and all data</p>
        </div>
        <button class="btn-secondary" style="background: var(--error-red); color: white;" onclick="confirmDeleteAccount()">Delete Account</button>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
      <button class="btn-primary" onclick="savePrivacySettings()">Save Changes</button>
    </div>
  `
}

function createHelpSupportContent() {
  return `
    <div class="settings-section">
      <h4>Frequently Asked Questions</h4>
      <div class="faq-item">
        <h5>How do I report a missing person?</h5>
        <p>Click the "Report Missing Person" button and fill out the form with all available information including photos, last known location, and contact details.</p>
      </div>
      <div class="faq-item">
        <h5>How much does it cost to post?</h5>
        <p>Posting costs vary by duration: 7 days (KSh 500), 14 days (KSh 800), or 30 days (KSh 1,200). Payment is processed through M-Pesa.</p>
      </div>
      <div class="faq-item">
        <h5>How do I join community groups?</h5>
        <p>Go to the Groups tab and browse available groups in your area. Click "Join Group" to become a member and participate in community searches.</p>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Contact Support</h4>
      <div class="contact-options">
        <div class="contact-option">
          <i class="fas fa-envelope"></i>
          <div>
            <h5>Email Support</h5>
            <p>support@findthem.co.ke</p>
          </div>
        </div>
        <div class="contact-option">
          <i class="fas fa-phone"></i>
          <div>
            <h5>Phone Support</h5>
            <p>+254 700 123 456</p>
          </div>
        </div>
        <div class="contact-option">
          <i class="fas fa-comments"></i>
          <div>
            <h5>Live Chat</h5>
            <p>Available 24/7</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Emergency Contacts</h4>
      <div class="emergency-list">
        <div class="emergency-item">
          <strong>Police Emergency:</strong> 999 / 911
        </div>
        <div class="emergency-item">
          <strong>Missing Persons Unit:</strong> 0800-MISSING
        </div>
        <div class="emergency-item">
          <strong>Child Helpline:</strong> 116
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn-primary" onclick="hideSettingsModal()">Close</button>
    </div>
  `
}

function createAboutContent() {
  return `
    <div class="settings-section">
      <h4>About FindThem</h4>
      <div class="about-info">
        <div class="app-logo">
          <i class="fas fa-search-location"></i>
          <h3>FindThem</h3>
        </div>
        <p>FindThem is Kenya's premier community-driven platform dedicated to reuniting families with their missing loved ones. We leverage the power of community, technology, and real-time communication to help find missing persons faster and more effectively.</p>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Our Mission</h4>
      <p>To create a safer Kenya where no family has to search alone. We believe that by connecting communities, leveraging technology, and working with authorities, we can significantly improve the chances of finding missing persons and bringing them home safely.</p>
    </div>
    
    <div class="settings-section">
      <h4>Key Features</h4>
      <ul class="feature-list">
        <li><i class="fas fa-users"></i> Community-driven search network</li>
        <li><i class="fas fa-map-marker-alt"></i> Real-time location tracking</li>
        <li><i class="fas fa-mobile-alt"></i> Instant push notifications</li>
        <li><i class="fas fa-shield-alt"></i> Police coordination</li>
        <li><i class="fas fa-comments"></i> Community chat system</li>
        <li><i class="fas fa-search"></i> Advanced search filters</li>
      </ul>
    </div>
    
    <div class="settings-section">
      <h4>Statistics</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">2,847</span>
          <span class="stat-label">People Found</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">15,000+</span>
          <span class="stat-label">Active Members</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">500+</span>
          <span class="stat-label">Local Groups</span>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>Version Information</h4>
      <p><strong>Version:</strong> 2.1.0</p>
      <p><strong>Last Updated:</strong> December 2024</p>
      <p><strong>Platform:</strong> Web Application</p>
    </div>
    
    <div class="form-actions">
      <button class="btn-primary" onclick="hideSettingsModal()">Close</button>
    </div>
  `
}

// Settings Functions
function toggleSetting(toggle) {
  toggle.classList.toggle("active")
  const isActive = toggle.classList.contains("active")
  showEmotionalNotification(`Setting ${isActive ? "enabled" : "disabled"}`, "info")
}

function saveProfileSettings() {
  showEmotionalNotification("Profile settings saved successfully!", "success")
  hideSettingsModal()
}

function saveAccountSettings() {
  showEmotionalNotification("Account settings saved successfully!", "success")
  hideSettingsModal()
}

function saveNotificationSettings() {
  showEmotionalNotification("Notification settings saved successfully!", "success")
  hideSettingsModal()
}

function savePrivacySettings() {
  showEmotionalNotification("Privacy settings saved successfully!", "success")
  hideSettingsModal()
}

function exportUserData() {
  showEmotionalNotification("Data export initiated. You'll receive an email with your data shortly.", "info")
}

function confirmDeleteAccount() {
  if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
    showEmotionalNotification("Account deletion request submitted. You'll receive a confirmation email.", "warning")
    hideSettingsModal()
  }
}

// Hamburger Menu Functions
function toggleHamburgerMenu() {
  const menu = document.getElementById("hamburger-menu")
  if (menu) {
    menu.classList.toggle("hidden")
  }
}

function hideHamburgerMenu() {
  const menu = document.getElementById("hamburger-menu")
  if (menu) {
    menu.classList.add("hidden")
  }
}

function logout() {
  currentUser = null
  localStorage.removeItem("currentUser")
  localStorage.removeItem("userLocation")
  showPage("landing-page")
  hideHamburgerMenu()
  showEmotionalNotification("Logged out successfully. Thank you for helping our community!", "success")
}

// Post Modal Functions
function showPostModal() {
  const modal = document.getElementById("post-modal")
  if (modal) {
    modal.classList.remove("hidden")
  }
}

function hidePostModal() {
  const modal = document.getElementById("post-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
}

function handlePostSubmit(event) {
  event.preventDefault()

  const selectedDuration = document.querySelector('input[name="duration"]:checked')
  if (!selectedDuration) {
    showEmotionalNotification("Please select how long you want your post to stay active", "error")
    return
  }

  const formData = new FormData(event.target)
  const postData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age"),
    gender: formData.get("gender"),
    lastLocation: formData.get("lastLocation"),
    lastSeen: formData.get("lastSeen"),
    description: formData.get("description"),
    contactPhone: formData.get("contactPhone"),
    altContact: formData.get("altContact"),
    duration: selectedDuration.value,
    price: selectedDuration.dataset.price,
  }

  // Store post data for payment
  localStorage.setItem("pendingPost", JSON.stringify(postData))

  const duration = selectedDuration.value
  const price = selectedDuration.dataset.price

  const durationElement = document.getElementById("selected-duration")
  const amountElement = document.getElementById("payment-amount")

  if (durationElement) durationElement.textContent = `${duration} Days`
  if (amountElement) amountElement.textContent = `KSh ${price}`

  hidePostModal()
  showPaymentModal()
}

// Payment Modal Functions
function showPaymentModal() {
  const modal = document.getElementById("payment-modal")
  if (modal) {
    modal.classList.remove("hidden")
  }
}

function hidePaymentModal() {
  const modal = document.getElementById("payment-modal")
  if (modal) {
    modal.classList.add("hidden")
  }
}

function initiateMpesaPayment() {
  const phoneNumber = document.getElementById("mpesa-number")?.value

  if (!phoneNumber) {
    showEmotionalNotification("Please enter your M-Pesa number", "error")
    return
  }

  const phoneRegex = /^254[0-9]{9}$/
  if (!phoneRegex.test(phoneNumber)) {
    showEmotionalNotification("Please enter a valid M-Pesa number (254XXXXXXXXX)", "error")
    return
  }

  const mpesaPayment = document.querySelector(".mpesa-payment")
  const paymentStatus = document.getElementById("payment-status")

  if (mpesaPayment) mpesaPayment.style.display = "none"
  if (paymentStatus) paymentStatus.classList.remove("hidden")

  startPaymentCountdown()

  // Simulate payment processing
  setTimeout(() => {
    simulatePaymentResponse()
  }, 15000)
}

function startPaymentCountdown() {
  let timeLeft = 120
  const countdownElement = document.getElementById("countdown")

  const timer = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    if (countdownElement) {
      countdownElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    if (timeLeft <= 0) {
      clearInterval(timer)
      showEmotionalNotification("Payment timeout. Please try again.", "error")
      hidePaymentModal()
    }

    timeLeft--
  }, 1000)

  // Store timer reference for cleanup
  window.paymentTimer = timer
}

function simulatePaymentResponse() {
  if (window.paymentTimer) {
    clearInterval(window.paymentTimer)
  }

  hidePaymentModal()
  showEmotionalNotification(
    "Payment confirmed! Your missing person post is now live and being shared with the community.",
    "success",
    "payment_success",
  )
  addNewPostToFeed()

  // Add notification
  addNotification("success", "Post Published", "Your missing person report is now live")
}

function addNewPostToFeed() {
  const feedPosts = document.getElementById("feed-posts")
  if (!feedPosts || !currentUser) return

  const pendingPost = JSON.parse(localStorage.getItem("pendingPost") || "{}")

  const newPost = document.createElement("article")
  newPost.className = "post-card"
  newPost.innerHTML = `
    <div class="post-header">
      <img src="${currentUser.avatar}" alt="User" class="avatar">
      <div class="post-info">
        <h4>${currentUser.name}</h4>
        <span class="post-time">Just now • ${pendingPost.lastLocation || "Your Location"}</span>
      </div>
      <div class="post-status urgent">URGENT</div>
    </div>
    <div class="post-content">
      <p>Missing: ${pendingPost.firstName} ${pendingPost.lastName}, ${pendingPost.age} years old. Last seen at ${pendingPost.lastLocation}. ${pendingPost.description}</p>
      <div class="missing-person-details">
        <img src="/placeholder.svg?height=200&width=150&text=${pendingPost.firstName}" alt="Missing person" class="missing-photo">
        <div class="details">
          <div class="detail-item">
            <strong>Name:</strong> ${pendingPost.firstName} ${pendingPost.lastName}
          </div>
          <div class="detail-item">
            <strong>Age:</strong> ${pendingPost.age} years old
          </div>
          <div class="detail-item">
            <strong>Gender:</strong> ${pendingPost.gender}
          </div>
          <div class="detail-item">
            <strong>Last Seen:</strong> ${pendingPost.lastLocation}
          </div>
          <div class="detail-item">
            <strong>Contact:</strong> ${pendingPost.contactPhone}
          </div>
          <div class="detail-item">
            <strong>Duration:</strong> ${pendingPost.duration} Days
          </div>
        </div>
      </div>
    </div>
    <div class="post-actions">
      <button class="action-btn" onclick="sharePost(this)">
        <i class="fas fa-share"></i>
        Share (<span class="share-count">0</span>)
      </button>
      <button class="action-btn" onclick="showTipsModal(this)">
        <i class="fas fa-comment"></i>
        Tips (<span class="tips-count">0</span>)
      </button>
      <button class="action-btn" onclick="contactFamily(this)">
        <i class="fas fa-phone"></i>
        Contact
      </button>
    </div>
  `

  feedPosts.insertBefore(newPost, feedPosts.firstChild)

  // Clean up stored data
  localStorage.removeItem("pendingPost")
}

// Post Interaction Functions
function sharePost(button) {
  const countElement = button.querySelector(".share-count")
  const currentCount = Number.parseInt(countElement.textContent)
  countElement.textContent = currentCount + 1

  showEmotionalNotification("Post shared successfully! Thank you for helping spread the word.", "success")

  // Simulate sharing to social media
  if (navigator.share) {
    navigator.share({
      title: "Help Find Missing Person",
      text: "Please help us find this missing person",
      url: window.location.href,
    })
  }
}

function showTipsModal(button) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Provide a Tip</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form class="post-form" onsubmit="submitTip(event)">
        <div class="form-section">
          <h4>Your Tip</h4>
          <div class="form-group">
            <label>What information do you have?</label>
            <textarea name="tipContent" placeholder="Please provide any information that might help locate this person..." required></textarea>
          </div>
          <div class="form-group">
            <label>Your Contact (Optional)</label>
            <input type="tel" name="tipContact" placeholder="Phone number if you want to be contacted">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" name="anonymous"> Submit anonymously
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn-primary">Submit Tip</button>
        </div>
      </form>
    </div>
  `
  document.body.appendChild(modal)
}

function submitTip(event) {
  event.preventDefault()
  const formData = new FormData(event.target)
  const tipContent = formData.get("tipContent")

  if (!tipContent.trim()) {
    showEmotionalNotification("Please provide some information in your tip", "error")
    return
  }

  // Update tips count
  const tipsCount = document.querySelector(".tips-count")
  if (tipsCount) {
    const currentCount = Number.parseInt(tipsCount.textContent)
    tipsCount.textContent = currentCount + 1
  }

  showEmotionalNotification("Thank you for your tip! It has been forwarded to the family and authorities.", "success")
  event.target.closest(".modal").remove()
}

function contactFamily(button) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Contact Family</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="settings-content">
        <div class="contact-options">
          <div class="contact-option" onclick="callFamily('0712345678')">
            <i class="fas fa-phone"></i>
            <div>
              <h5>Call Family</h5>
              <p>0712345678</p>
            </div>
          </div>
          <div class="contact-option" onclick="sendSMS('0712345678')">
            <i class="fas fa-sms"></i>
            <div>
              <h5>Send SMS</h5>
              <p>Send a text message</p>
            </div>
          </div>
          <div class="contact-option" onclick="sendWhatsApp('0712345678')">
            <i class="fab fa-whatsapp"></i>
            <div>
              <h5>WhatsApp</h5>
              <p>Message on WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

function callFamily(number) {
  if (confirm(`Call ${number}?`)) {
    window.location.href = `tel:${number}`
    showEmotionalNotification("Initiating call...", "info")
  }
}

function sendSMS(number) {
  window.location.href = `sms:${number}`
  showEmotionalNotification("Opening SMS app...", "info")
}

function sendWhatsApp(number) {
  window.open(`https://wa.me/${number}`, "_blank")
  showEmotionalNotification("Opening WhatsApp...", "info")
}

function celebratePost(button) {
  const countElement = button.querySelector(".celebrate-count")
  const currentCount = Number.parseInt(countElement.textContent)
  countElement.textContent = currentCount + 1

  showEmotionalNotification("🎉 Celebration shared! Great news deserves recognition.", "success")
  createConfetti()
}

function showCommentsModal(button) {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Comments</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="settings-content">
        <div class="comments-list">
          <div class="comment-item">
            <img src="/placeholder.svg?height=40&width=40" alt="User" class="comment-avatar">
            <div class="comment-content">
              <h5>Sarah K.</h5>
              <p>So happy to hear this! Praying for more good news like this.</p>
              <span class="comment-time">2 hours ago</span>
            </div>
          </div>
          <div class="comment-item">
            <img src="/placeholder.svg?height=40&width=40" alt="User" class="comment-avatar">
            <div class="comment-content">
              <h5>Mike O.</h5>
              <p>Amazing work by the community! This is why we need to stick together.</p>
              <span class="comment-time">1 hour ago</span>
            </div>
          </div>
        </div>
        <div class="comment-form">
          <textarea placeholder="Write a comment..."></textarea>
          <button class="btn-primary">Post Comment</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

// Emergency Contact Functions
function callEmergency(number) {
  if (confirm(`Call ${number}?`)) {
    window.location.href = `tel:${number}`
    showEmotionalNotification(`Calling ${number}... Emergency services will be contacted.`, "info")

    // Log emergency call
    addNotification("info", "Emergency Call", `Called ${number} for emergency assistance`)
  }
}

// Group Management
function showCreateGroupModal() {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Create New Group</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form class="post-form" onsubmit="handleCreateGroup(event)">
        <div class="form-group">
          <label>Group Name</label>
          <input type="text" name="groupName" placeholder="e.g., Nairobi West Community" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" placeholder="Describe the purpose and area covered by this group..." required></textarea>
        </div>
        <div class="form-group">
          <label>Location/Area</label>
          <input type="text" name="location" placeholder="e.g., Nairobi West, Karen, Langata" required>
        </div>
        <div class="form-group">
          <label>Group Type</label>
          <select name="groupType" required>
            <option value="">Select Type</option>
            <option value="neighborhood">Neighborhood</option>
            <option value="county">County-wide</option>
            <option value="city">City-wide</option>
            <option value="special">Special Interest</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn-primary">Create Group</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(modal)
}

function handleCreateGroup(event) {
  event.preventDefault()
  const form = event.target
  const formData = new FormData(form)
  const groupName = formData.get("groupName")

  showEmotionalNotification(`Group "${groupName}" created successfully! You're now the admin.`, "success")
  form.closest(".modal").remove()

  addNewGroupToGrid(groupName)
  addNotification("success", "Group Created", `Your new group "${groupName}" is now active`)
}

function addNewGroupToGrid(groupName) {
  const groupsGrid = document.getElementById("groups-grid")
  if (!groupsGrid) return

  const newGroup = document.createElement("div")
  newGroup.className = "group-card"
  newGroup.innerHTML = `
    <div class="group-cover">
      <img src="/placeholder.svg?height=120&width=300&text=${encodeURIComponent(groupName)}" alt="Group cover">
    </div>
    <div class="group-info">
      <h3>${groupName}</h3>
      <p>1 member • 0 active cases</p>
      <button class="btn-secondary" onclick="viewGroup('${groupName}')">View Group</button>
    </div>
  `

  groupsGrid.appendChild(newGroup)
}

function viewGroup(groupName) {
  showEmotionalNotification(`Opening ${groupName} group...`, "info")
}

// Search functionality
function handleSearch() {
  const searchInput = document.querySelector(".search-input")
  if (!searchInput) return

  const query = searchInput.value.toLowerCase().trim()

  if (query.length < 2) {
    // Show all posts if query is too short
    const posts = document.querySelectorAll(".post-card")
    posts.forEach((post) => (post.style.display = "block"))
    return
  }

  showEmotionalNotification(`Searching for "${query}"...`, "info")

  const posts = document.querySelectorAll(".post-card")
  let foundCount = 0

  posts.forEach((post) => {
    const content = post.textContent.toLowerCase()
    if (content.includes(query)) {
      post.style.display = "block"
      foundCount++
    } else {
      post.style.display = "none"
    }
  })

  setTimeout(() => {
    showEmotionalNotification(`Found ${foundCount} matching posts for "${query}"`, "success")
  }, 1000)
}

function showAdvancedSearch() {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Advanced Search</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="advanced-search-form">
        <div class="search-section">
          <h4>Personal Details</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Name</label>
              <input type="text" placeholder="First or last name">
            </div>
            <div class="form-group">
              <label>Age Range</label>
              <select>
                <option>Any Age</option>
                <option>0-12 (Child)</option>
                <option>13-17 (Teen)</option>
                <option>18-30 (Young Adult)</option>
                <option>31-50 (Adult)</option>
                <option>51+ (Senior)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="search-section">
          <h4>Location & Time</h4>
          <div class="form-row">
            <div class="form-group">
              <label>County</label>
              <select>
                <option>All Counties</option>
                <option>Nairobi</option>
                <option>Mombasa</option>
                <option>Kisumu</option>
                <option>Nakuru</option>
                <option>Eldoret</option>
                <option>Thika</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date Range</label>
              <select>
                <option>Any Time</option>
                <option>Last 24 hours</option>
                <option>Last Week</option>
                <option>Last Month</option>
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
          </div>
        </div>

        <div class="search-section">
          <h4>Physical Description</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Height</label>
              <select>
                <option>Any Height</option>
                <option>Under 5ft</option>
                <option>5ft - 5ft 6in</option>
                <option>5ft 6in - 6ft</option>
                <option>Over 6ft</option>
              </select>
            </div>
            <div class="form-group">
              <label>Hair Color</label>
              <select>
                <option>Any Color</option>
                <option>Black</option>
                <option>Brown</option>
                <option>Blonde</option>
                <option>Gray/White</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="button" class="btn-primary" onclick="performAdvancedSearch()">Search</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

function performAdvancedSearch() {
  const modal = document.querySelector(".modal")
  if (modal) modal.remove()

  // Simulate search results
  const resultCount = Math.floor(Math.random() * 20) + 5
  showEmotionalNotification(`Advanced search completed. Found ${resultCount} matching cases.`, "success")

  // Add to activity feed
  const activityList = document.getElementById("activity-list")
  if (activityList) {
    const activityItem = document.createElement("div")
    activityItem.className = "activity-item"
    activityItem.innerHTML = `
      <i class="fas fa-search"></i>
      <span>Advanced search performed - ${resultCount} results</span>
    `
    activityList.insertBefore(activityItem, activityList.firstChild)
  }
}

// Real-time features simulation
function simulateRealTimeUpdates() {
  setInterval(() => {
    if (Math.random() > 0.95) {
      // 5% chance every 10 seconds
      const updateTypes = [
        () => addNotification("info", "New Tip", "Someone provided a tip on a missing person case"),
        () => addNotification("success", "Person Found", "Great news! Another person has been found safe"),
        () => addNotification("info", "New Member", "Someone joined your local community group"),
        () => addNotification("warning", "Post Expiring", "One of your posts will expire soon"),
      ]

      const randomUpdate = updateTypes[Math.floor(Math.random() * updateTypes.length)]
      randomUpdate()
    }

    // Update view counts and activity
    updateViewCounts()
    updateActivityFeed()
  }, 10000) // Every 10 seconds
}

function updateViewCounts() {
  const posts = document.querySelectorAll(".post-card")
  posts.forEach((post) => {
    if (Math.random() > 0.8) {
      // 20% chance
      const shareBtns = post.querySelectorAll(".share-count, .tips-count, .celebrate-count, .comments-count")
      shareBtns.forEach((btn) => {
        const currentCount = Number.parseInt(btn.textContent) || 0
        if (Math.random() > 0.7) {
          btn.textContent = currentCount + Math.floor(Math.random() * 3) + 1
        }
      })
    }
  })
}

function updateActivityFeed() {
  const activityList = document.getElementById("activity-list")
  if (!activityList || Math.random() > 0.9) return // 10% chance

  const activities = [
    { icon: "fas fa-user-plus", text: "New member joined Kisumu group" },
    { icon: "fas fa-heart", text: "Michael found safe in Nakuru" },
    { icon: "fas fa-share", text: "Post shared 50+ times in last hour" },
    { icon: "fas fa-comment", text: "New tip received on active case" },
    { icon: "fas fa-map-marker-alt", text: "Search expanded to new area" },
  ]

  const randomActivity = activities[Math.floor(Math.random() * activities.length)]

  const activityItem = document.createElement("div")
  activityItem.className = "activity-item"
  activityItem.innerHTML = `
    <i class="${randomActivity.icon}"></i>
    <span>${randomActivity.text}</span>
  `

  activityList.insertBefore(activityItem, activityList.firstChild)

  // Keep only last 5 activities
  while (activityList.children.length > 5) {
    activityList.removeChild(activityList.lastChild)
  }
}

function updateDashboardForUser(user) {
  // Update user info in hamburger menu
  const menuUserName = document.getElementById("menu-user-name")
  const menuUserEmail = document.getElementById("menu-user-email")

  if (menuUserName) menuUserName.textContent = user.name
  if (menuUserEmail) menuUserEmail.textContent = user.email

  // Update dashboard welcome
  const welcomeSection = document.querySelector(".dashboard-welcome h2")
  if (welcomeSection) {
    welcomeSection.innerHTML = `Welcome back, ${user.name}! <span class="user-role-badge role-${user.role}">${user.role.toUpperCase()}</span>`
  }

  // Update profile avatar
  const profileAvatars = document.querySelectorAll(".profile-avatar, .menu-avatar")
  profileAvatars.forEach((avatar) => {
    avatar.src = user.avatar
  })
}

// Status filtering
function filterByStatus(status) {
  document.querySelectorAll(".status-tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  const clickedTab = event?.target?.closest(".status-tab")
  if (clickedTab) {
    clickedTab.classList.add("active")
  }

  const posts = document.querySelectorAll(".post-card")
  let visibleCount = 0

  posts.forEach((post) => {
    const postStatus = post.querySelector(".post-status")

    if (status === "all") {
      post.style.display = "block"
      visibleCount++
    } else if (status === "urgent" && postStatus && postStatus.classList.contains("urgent")) {
      post.style.display = "block"
      visibleCount++
    } else if (status === "found" && postStatus && postStatus.classList.contains("found")) {
      post.style.display = "block"
      visibleCount++
    } else if (
      status === "missing" &&
      (!postStatus || (!postStatus.classList.contains("urgent") && !postStatus.classList.contains("found")))
    ) {
      post.style.display = "block"
      visibleCount++
    } else {
      post.style.display = "none"
    }
  })

  showEmotionalNotification(`Showing ${visibleCount} ${status} posts`, "info")
}

// Status story viewing
function viewStatusStory(storyId) {
  const modal = document.createElement("div")
  modal.className = "modal status-story-modal"
  modal.innerHTML = `
    <div class="story-modal-content">
      <div class="story-header">
        <button class="story-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
        <div class="story-progress">
          <div class="progress-bar"></div>
        </div>
      </div>
      <div class="story-content">
        <div class="story-user-info">
          <img src="/placeholder.svg?height=40&width=40" alt="User" class="story-user-avatar">
          <div class="story-user-details">
            <h4>Mary Wanjiku</h4>
            <span class="story-timestamp">2 hours ago</span>
          </div>
        </div>
        <div class="story-missing-info">
          <img src="/placeholder.svg?height=300&width=200&text=Sarah+Missing" alt="Missing person" class="story-missing-photo">
          <div class="story-details">
            <h3>🚨 URGENT: Sarah Missing</h3>
            <p><strong>Age:</strong> 8 years old</p>
            <p><strong>Last Seen:</strong> Uhuru Park, 3:00 PM</p>
            <p><strong>Wearing:</strong> Red dress, white shoes</p>
            <p><strong>Contact:</strong> 0712345678</p>
          </div>
        </div>
        <div class="story-actions">
          <button class="story-action-btn share-btn" onclick="shareStory()">
            <i class="fas fa-share"></i>
            Share Story
          </button>
          <button class="story-action-btn contact-btn" onclick="contactStoryFamily()">
            <i class="fas fa-phone"></i>
            Contact Family
          </button>
          <button class="story-action-btn tip-btn" onclick="provideTip()">
            <i class="fas fa-info-circle"></i>
            Provide Tip
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Auto-close after 10 seconds
  const autoCloseTimer = setTimeout(() => {
    if (modal.parentElement) {
      modal.remove()
    }
  }, 10000)

  // Animate progress bar
  const progressBar = modal.querySelector(".progress-bar")
  if (progressBar) {
    progressBar.style.animation = "progress 10s linear forwards"
  }

  modal.autoCloseTimer = autoCloseTimer
}

function shareStory() {
  showEmotionalNotification("Story shared! Thank you for helping spread awareness.", "success")
}

function contactStoryFamily() {
  showEmotionalNotification("Opening contact options...", "info")
}

function provideTip() {
  showEmotionalNotification("Opening tip submission form...", "info")
}

// Enhanced notification system
function showEmotionalNotification(message, type = "info", context = null) {
  const emotionalMessages = {
    post_created: "🙏 Your post is now live. The community is here to help.",
    payment_success: "💙 Payment confirmed. Your loved one's story is being shared across Kenya.",
    tip_received: "🌟 Someone has information! Check your notifications.",
    person_found: "🎉 AMAZING NEWS! Someone has been found safe!",
    group_joined: "🤝 Welcome to the community. Together we are stronger.",
    share_success: "💪 Thank you for sharing. Every share brings hope.",
    police_notified: "👮‍♂️ Police have been notified. Help is on the way.",
    login_success: "🔑 Welcome back! Ready to make a difference?",
  }

  const finalMessage = emotionalMessages[context] || message

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`

  if (context === "person_found") {
    notification.classList.add("celebration")
  }

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        ${getNotificationIcon(type, context)}
      </div>
      <div class="notification-text">
        <span class="notification-message">${finalMessage}</span>
        ${context === "person_found" ? '<div class="celebration-animation">🎊</div>' : ""}
      </div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `

  if (context === "person_found") {
    createConfetti()
  }

  let container = document.getElementById("notification-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "notification-container"
    container.className = "notification-container"
    document.body.appendChild(container)
  }

  container.appendChild(notification)

  // Auto remove with longer duration for emotional messages
  const duration = context === "person_found" ? 10000 : 5000
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOutRight 0.3s ease-out"
      setTimeout(() => notification.remove(), 300)
    }
  }, duration)
}

function getNotificationIcon(type, context) {
  const icons = {
    person_found: "🎉",
    post_created: "📢",
    payment_success: "✅",
    tip_received: "💡",
    group_joined: "👥",
    share_success: "🔄",
    police_notified: "🚔",
    login_success: "🔑",
  }

  return icons[context] || (type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️")
}

// Confetti animation for celebrations
function createConfetti() {
  const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#fd79a8", "#fdcb6e"]

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div")
    confetti.style.cssText = `
      position: fixed;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -10px;
      z-index: 10001;
      border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
      animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
      transform: rotate(${Math.random() * 360}deg);
    `

    document.body.appendChild(confetti)
    setTimeout(() => confetti.remove(), 5000)
  }
}

// Enhanced Features
function initializeEnhancedFeatures() {
  // Initialize push notifications
  if ("Notification" in window && Notification.permission === "granted") {
    isNotificationsEnabled = true
  }

  // Simulate periodic real-time updates
  setInterval(() => {
    if (Math.random() > 0.98) {
      // 2% chance every 10 seconds
      const notifications = [
        { title: "New Tip Received", body: "Someone has information about Sarah's case" },
        { title: "Person Found", body: "Great news! Michael has been found safe" },
        { title: "New Group Member", body: "3 new members joined your local group" },
        { title: "Search Update", body: "Search area expanded based on new information" },
      ]

      const notification = notifications[Math.floor(Math.random() * notifications.length)]
      sendPushNotification(notification.title, notification.body)
    }
  }, 10000)
}

// Utility functions
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}





// Export functions for global access
window.showPage = showPage
window.showDashboard = showDashboard
window.enterDashboard = enterDashboard
window.showTab = showTab
window.logout = logout
window.toggleSearchFilters = toggleSearchFilters
window.showNotifications = showNotifications
window.toggleHamburgerMenu = toggleHamburgerMenu
window.hideHamburgerMenu = hideHamburgerMenu
window.showPostModal = showPostModal
window.hidePostModal = hidePostModal
window.handlePostSubmit = handlePostSubmit
window.showCreateGroupModal = showCreateGroupModal
window.handleCreateGroup = handleCreateGroup
window.filterByStatus = filterByStatus
window.viewStatusStory = viewStatusStory
window.showEmotionalNotification = showEmotionalNotification
window.createConfetti = createConfetti
window.toggleChat = toggleChat
window.sendChatMessage = sendChatMessage
window.handleChatKeyPress = handleChatKeyPress
window.showAdvancedSearch = showAdvancedSearch
window.performAdvancedSearch = performAdvancedSearch
window.getCurrentLocation = getCurrentLocation
window.detectCurrentLocation = detectCurrentLocation
window.sharePost = sharePost
window.showTipsModal = showTipsModal
window.contactFamily = contactFamily
window.celebratePost = celebratePost
window.showCommentsModal = showCommentsModal
window.callEmergency = callEmergency
window.viewGroup = viewGroup
window.removeNotification = removeNotification
window.markAllNotificationsRead = markAllNotificationsRead
window.showProfileSettings = showProfileSettings
window.showAccountSettings = showAccountSettings
window.showNotificationSettings = showNotificationSettings
window.showPrivacySettings = showPrivacySettings
window.showHelpSupport = showHelpSupport
window.showAbout = showAbout
window.hideSettingsModal = hideSettingsModal
window.toggleSetting = toggleSetting
window.saveProfileSettings = saveProfileSettings
window.saveAccountSettings = saveAccountSettings
window.saveNotificationSettings = saveNotificationSettings
window.savePrivacySettings = savePrivacySettings
window.exportUserData = exportUserData
window.confirmDeleteAccount = confirmDeleteAccount
window.removePhoto = removePhoto
window.submitTip = submitTip
window.callFamily = callFamily
window.sendSMS = sendSMS
window.sendWhatsApp = sendWhatsApp
window.shareStory = shareStory
window.contactStoryFamily = contactStoryFamily
window.provideTip = provideTip

// Landing page functions
window.animateLogo = animateLogo
window.animateStatCard = animateStatCard
window.animateFloatingCard = animateFloatingCard
window.highlightStep = highlightStep
window.selectStory = selectStory
window.goToStory = goToStory

// Add CSS for confetti animation
const style = document.createElement("style")
style.textContent = `
  @keyframes confetti-fall {
    to {
      transform: translateY(100vh) rotate(720deg);
    }
  }
  
  @keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
  }
  
  .story-modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
  }
  
  .story-header {
    position: relative;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-hover));
    color: white;
  }
  
  .story-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .story-progress {
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.5rem;
  }
  
  .progress-bar {
    height: 100%;
    background: white;
    width: 0%;
    border-radius: 2px;
  }
  
  .story-content {
    padding: 1.5rem;
  }
  
  .story-user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .story-user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--border-gray);
  }
  
  .story-user-details h4 {
    margin: 0;
    color: var(--text-primary);
  }
  
  .story-timestamp {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  .story-missing-info {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .story-missing-photo {
    width: 200px;
    height: 250px;
    object-fit: cover;
    border-radius: 12px;
    margin-bottom: 1rem;
    border: 2px solid var(--border-gray);
  }
  
  .story-details h3 {
    color: var(--error-red);
    margin-bottom: 1rem;
  }
  
  .story-details p {
    margin-bottom: 0.5rem;
    text-align: left;
  }
  
  .story-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .story-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .share-btn {
    background: var(--primary-blue);
    color: white;
  }
  
  .contact-btn {
    background: var(--success-green);
    color: white;
  }
  
  .tip-btn {
    background: var(--warning-orange);
    color: white;
  }
  
  .story-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }
  
  .contact-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .contact-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--border-gray);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .contact-option:hover {
    border-color: var(--primary-blue);
    background: var(--primary-blue-light);
  }
  
  .contact-option i {
    font-size: 1.5rem;
    color: var(--primary-blue);
    width: 30px;
    text-align: center;
  }
  
  .contact-option h5 {
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
  }
  
  .contact-option p {
    margin: 0;
    color: var(--text-secondary);
  }
  
  .faq-item {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--light-gray);
  }
  
  .faq-item h5 {
    color: var(--primary-blue);
    margin-bottom: 0.5rem;
  }
  
  .faq-item p {
    color: var(--text-secondary);
    line-height: 1.6;
  }
  
  .about-info {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .app-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .app-logo i {
    font-size: 4rem;
    color: var(--primary-blue);
  }
  
  .app-logo h3 {
    font-size: 2rem;
    color: var(--primary-blue);
    margin: 0;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
  }
  
  .feature-list li {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    color: var(--text-primary);
  }
  
  .feature-list i {
    color: var(--primary-blue);
    width: 20px;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    text-align: center;
  }
  
  .stat-item {
    padding: 1rem;
    background: var(--light-gray);
    border-radius: 8px;
  }
  
  .stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--primary-blue);
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .comments-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 1rem;
  }
  
  .comment-item {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--light-gray);
  }
  
  .comment-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--border-gray);
  }
  
  .comment-content h5 {
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
  }
  
  .comment-content p {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    line-height: 1.4;
  }
  
  .comment-time {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  
  .comment-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .comment-form textarea {
    min-height: 80px;
    padding: 12px;
    border: 2px solid var(--border-gray);
    border-radius: 8px;
    resize: vertical;
  }
  
  .advanced-search-form {
    padding: 1.5rem;
  }
  
  .search-section {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-gray);
  }
  
  .search-section:last-child {
    border-bottom: none;
  }
  
  .search-section h4 {
    color: var(--primary-blue);
    margin-bottom: 1rem;
  }
  
  .emergency-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .emergency-item {
    padding: 1rem;
    background: var(--light-gray);
    border-radius: 8px;
    border-left: 4px solid var(--error-red);
  }
`

document.head.appendChild(style)
