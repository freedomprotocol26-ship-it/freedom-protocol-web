// Dashboard JavaScript with Fixed localStorage Keys and Element IDs

const API_URL = window.location.origin;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in using the CORRECT key
    const userId = localStorage.getItem('freedom_protocol_user_id');
    const userEmail = localStorage.getItem('freedom_protocol_user_email');
    const userName = localStorage.getItem('freedom_protocol_user_name');

    if (!userId || !userEmail) {
        console.log('No user found in localStorage, redirecting to login');
        window.location.href = '/';
        return;
    }

    console.log('User authenticated:', { userId, userEmail, userName });

    // Display user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userName || userEmail.split('@')[0];
    }

    // Load dashboard data
    await loadDashboardData(userId);
});

async function loadDashboardData(userId) {
    try {
        console.log('Loading dashboard data for user:', userId);

        // Load glucose readings
        const response = await fetch(`${API_URL}/api/glucose/${userId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load glucose data: ${response.status}`);
        }

        const readings = await response.json();
        console.log('Glucose readings loaded:', readings);

        // Update statistics
        updateStatistics(readings);

        // Display recent readings
        displayRecentReadings(readings);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load your data. Please try refreshing the page.');
    }
}

function updateStatistics(readings) {
    if (!readings || readings.length === 0) {
        console.log('No readings to display');
        document.getElementById('latestGlucose').textContent = '--';
        document.getElementById('averageGlucose').textContent = '--';
        document.getElementById('totalReadings').textContent = '0';
        document.getElementById('daysOnProtocol').textContent = '0';
        return;
    }

    // Latest glucose
    const latestReading = readings[0];
    const latestGlucoseElement = document.getElementById('latestGlucose');
    if (latestGlucoseElement) {
        latestGlucoseElement.textContent = latestReading.glucose_value.toFixed(1);
    }

    // 7-day average
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentReadings = readings.filter(r => 
        new Date(r.reading_time) >= sevenDaysAgo
    );

    if (recentReadings.length > 0) {
        const average = recentReadings.reduce((sum, r) => sum + r.glucose_value, 0) / recentReadings.length;
        const averageGlucoseElement = document.getElementById('averageGlucose');
        if (averageGlucoseElement) {
            averageGlucoseElement.textContent = average.toFixed(1);
        }
    }

    // Total readings
    const totalReadingsElement = document.getElementById('totalReadings');
    if (totalReadingsElement) {
        totalReadingsElement.textContent = readings.length;
    }

    // Days on protocol (from first reading to today)
    const firstReading = readings[readings.length - 1];
    const firstDate = new Date(firstReading.reading_time);
    const today = new Date();
    const daysDiff = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
    
    const daysOnProtocolElement = document.getElementById('daysOnProtocol');
    if (daysOnProtocolElement) {
        daysOnProtocolElement.textContent = daysDiff;
    }
}

function displayRecentReadings(readings) {
    const readingsList = document.getElementById('readingsList');
    
    if (!readingsList) {
        console.error('Readings list element not found');
        return;
    }

    if (!readings || readings.length === 0) {
        readingsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No glucose readings yet</p>
                <p style="font-size: 14px; margin-top: 10px;">Click "Log Glucose Reading" to add your first reading</p>
            </div>
        `;
        return;
    }

    // Show last 10 readings
    const recentReadings = readings.slice(0, 10);
    
    readingsList.innerHTML = recentReadings.map(reading => {
        const date = new Date(reading.reading_time);
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="reading-item">
                <div>
                    <div class="reading-value">${reading.glucose_value.toFixed(1)} mmol/L</div>
                    <div class="reading-time">${formattedDate} at ${formattedTime}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #999;">${reading.meal_context || 'No context'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

function handleLogout() {
    // Clear ALL localStorage items with the correct keys
    localStorage.removeItem('freedom_protocol_user_id');
    localStorage.removeItem('freedom_protocol_user_email');
    localStorage.removeItem('freedom_protocol_user_name');
    
    console.log('User logged out, localStorage cleared');
    
    // Redirect to login page
    window.location.href = '/';
}
