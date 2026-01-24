// Dashboard JavaScript - Fixed for Real Data Display
const API_URL = window.location.origin;

// Authentication check on page load
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('freedom_protocol_user_id');
    const userEmail = localStorage.getItem('freedom_protocol_user_email');
    const userName = localStorage.getItem('freedom_protocol_user_name');

    if (!userId || !userEmail) {
        console.log('No authenticated user, redirecting to login');
        window.location.href = '/';
        return;
    }

    console.log('User authenticated:', { userId, userEmail, userName });

    // Display user info
    updateUserInfo(userName, userEmail);

    // Load all dashboard data
    await loadDashboardData(userId);
});

function updateUserInfo(name, email) {
    const userNameElements = document.querySelectorAll('#userName, .user-name');
    userNameElements.forEach(el => {
        if (el) el.textContent = name || email.split('@')[0];
    });
}

async function loadDashboardData(userId) {
    try {
        console.log('Loading dashboard data for user:', userId);

        // Load glucose readings
        const glucoseResponse = await fetch(`${API_URL}/api/glucose/${userId}`);
        
        if (!glucoseResponse.ok) {
            throw new Error(`Failed to load glucose data: ${glucoseResponse.status}`);
        }

        const readings = await glucoseResponse.json();
        console.log('Glucose readings loaded:', readings.length, 'readings');

        // Update all dashboard statistics
        updateStatistics(readings, userId);

        // Display recent readings table
        displayRecentReadings(readings);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load your data. Please try refreshing the page.');
    }
}

function updateStatistics(readings, userId) {
    // Days Active - calculate from user creation date or first reading
    const createdAt = localStorage.getItem('freedom_protocol_user_created');
    let daysActive = 0;
    
    if (createdAt) {
        const startDate = new Date(createdAt);
        const today = new Date();
        daysActive = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    } else if (readings.length > 0) {
        // Fallback: use first reading date
        const firstReading = new Date(readings[readings.length - 1].timestamp);
        const today = new Date();
        daysActive = Math.floor((today - firstReading) / (1000 * 60 * 60 * 24));
    }

    // Total Readings
    const totalReadings = readings.length;

    // Average Glucose (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentReadings = readings.filter(r => new Date(r.timestamp) >= sevenDaysAgo);
    const averageGlucose = recentReadings.length > 0
        ? (recentReadings.reduce((sum, r) => sum + parseFloat(r.glucose_level), 0) / recentReadings.length).toFixed(1)
        : '--';

    // AI Conversations - we'll load this separately
    loadConversationCount(userId);

    // Update DOM elements
    const daysActiveEl = document.getElementById('daysActive');
    const totalReadingsEl = document.getElementById('totalReadings');
    const averageGlucoseEl = document.getElementById('averageGlucose');

    if (daysActiveEl) daysActiveEl.textContent = daysActive;
    if (totalReadingsEl) totalReadingsEl.textContent = totalReadings;
    if (averageGlucoseEl) averageGlucoseEl.textContent = averageGlucose;

    console.log('Statistics updated:', { daysActive, totalReadings, averageGlucose });
}

async function loadConversationCount(userId) {
    try {
        const response = await fetch(`${API_URL}/api/chat/history/${userId}`);
        
        if (response.ok) {
            const conversations = await response.json();
            const totalChats = Array.isArray(conversations) ? conversations.length : 0;
            
            const totalChatsEl = document.getElementById('totalChats');
            if (totalChatsEl) totalChatsEl.textContent = totalChats;
            
            console.log('Conversation count loaded:', totalChats);
        }
    } catch (error) {
        console.error('Error loading conversation count:', error);
        // Don't show error - just leave as 0
    }
}

function displayRecentReadings(readings) {
    const readingsListEl = document.getElementById('recentReadingsList');
    if (!readingsListEl) {
        console.warn('Recent readings list element not found');
        return;
    }

    if (readings.length === 0) {
        readingsListEl.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No glucose readings yet.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">
                    Click "Log Glucose" to add your first reading!
                </p>
            </div>
        `;
        return;
    }

    // Sort by timestamp descending (most recent first)
    const sortedReadings = [...readings].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Take only the 5 most recent
    const recentReadings = sortedReadings.slice(0, 5);

    const readingsHTML = recentReadings.map(reading => {
        const date = new Date(reading.timestamp);
        const formattedDate = date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        const formattedTime = date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });

        return `
            <tr>
                <td>${formattedDate} at ${formattedTime}</td>
                <td><strong>${reading.glucose_level} mmol/L</strong></td>
                <td>${reading.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    readingsListEl.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid #e0e0e0; text-align: left;">
                    <th style="padding: 0.75rem; font-weight: 600;">Date & Time</th>
                    <th style="padding: 0.75rem; font-weight: 600;">Glucose Level</th>
                    <th style="padding: 0.75rem; font-weight: 600;">Notes</th>
                </tr>
            </thead>
            <tbody>
                ${readingsHTML}
            </tbody>
        </table>
    `;

    console.log('Recent readings displayed:', recentReadings.length);
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('freedom_protocol_user_id');
    localStorage.removeItem('freedom_protocol_user_email');
    localStorage.removeItem('freedom_protocol_user_name');
    localStorage.removeItem('freedom_protocol_user_created');
    window.location.href = '/';
}

// Make logout available globally
window.logout = logout;

console.log('Dashboard.js loaded successfully');
