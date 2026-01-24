// Admin Partner Dashboard Handler
const API_URL = window.location.origin;

let allPartners = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await loadPartnerStatistics();
    await loadPartners();
    
    // Set up filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            filterPartners(filter);
        });
    });
});

async function loadPartnerStatistics() {
    try {
        const response = await fetch(`${API_URL}/api/admin/partners/stats`);
        
        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }

        const stats = await response.json();
        
        // Update statistics display
        document.getElementById('pendingCount').textContent = stats.pending || 0;
        document.getElementById('approvedCount').textContent = stats.approved || 0;
        document.getElementById('totalCount').textContent = stats.total || 0;

        console.log('Partner statistics loaded:', stats);

    } catch (error) {
        console.error('Error loading partner statistics:', error);
        showError('Failed to load statistics');
    }
}

async function loadPartners(status = null) {
    try {
        let url = `${API_URL}/api/admin/partners`;
        if (status && status !== 'all') {
            url += `?status=${status}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to load partners');
        }

        const data = await response.json();
        allPartners = data.partners;

        console.log('Partners loaded:', allPartners.length);

        displayPartners(allPartners);

    } catch (error) {
        console.error('Error loading partners:', error);
        showError('Failed to load partner applications');
    }
}

function displayPartners(partners) {
    const container = document.getElementById('partnersContainer');
    
    if (!container) {
        console.error('Partners container not found');
        return;
    }

    if (partners.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.1rem; font-weight: 500;">No ${currentFilter === 'all' ? '' : currentFilter} applications found</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Applications will appear here as they are submitted.</p>
            </div>
        `;
        return;
    }

    const partnersHTML = partners.map(partner => {
        const statusBadge = getStatusBadge(partner.status);
        const dateFormatted = new Date(partner.application_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return `
            <div class="partner-card" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem;">${partner.full_name}</h3>
                        <p style="margin: 0; color: #666; font-size: 0.9rem;">${partner.license_type}</p>
                    </div>
                    ${statusBadge}
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">Email</p>
                        <p style="margin: 0; font-size: 0.9rem;">${partner.email}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">Phone</p>
                        <p style="margin: 0; font-size: 0.9rem;">${partner.phone}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">License Number</p>
                        <p style="margin: 0; font-size: 0.9rem;">${partner.license_number}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">Experience</p>
                        <p style="margin: 0; font-size: 0.9rem;">${partner.years_experience} years</p>
                    </div>
                </div>

                <div style="margin-bottom: 1rem;">
                    <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">Facility</p>
                    <p style="margin: 0; font-size: 0.9rem;">${partner.facility_name}</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #888;">${partner.facility_address}</p>
                </div>

                ${partner.specialty ? `
                    <div style="margin-bottom: 1rem;">
                        <p style="margin: 0 0 0.25rem; font-size: 0.8rem; color: #666; font-weight: 500;">Specialty</p>
                        <p style="margin: 0; font-size: 0.9rem;">${partner.specialty}</p>
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; font-size: 0.85rem; color: #888;">Applied: ${dateFormatted}</p>
                    
                    ${partner.status === 'pending' ? `
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="approvePartner('${partner.id}')" 
                                    style="padding: 0.5rem 1rem; background-color: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                ✓ Approve
                            </button>
                            <button onclick="rejectPartner('${partner.id}')" 
                                    style="padding: 0.5rem 1rem; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                ✗ Reject
                            </button>
                        </div>
                    ` : partner.status === 'approved' ? `
                        <span style="color: #10b981; font-weight: 500;">Approved ${partner.reviewed_date ? 'on ' + new Date(partner.reviewed_date).toLocaleDateString('en-GB') : ''}</span>
                    ` : `
                        <span style="color: #ef4444; font-weight: 500;">Rejected ${partner.reviewed_date ? 'on ' + new Date(partner.reviewed_date).toLocaleDateString('en-GB') : ''}</span>
                        ${partner.rejection_reason ? `<br><span style="font-size: 0.85rem; color: #888;">Reason: ${partner.rejection_reason}</span>` : ''}
                    `}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = partnersHTML;
}

function getStatusBadge(status) {
    const badges = {
        pending: '<span style="background-color: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">Pending Review</span>',
        approved: '<span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">Approved</span>',
        rejected: '<span style="background-color: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">Rejected</span>'
    };
    return badges[status] || '';
}

function filterPartners(filter) {
    currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    // Filter and display
    if (filter === 'all') {
        displayPartners(allPartners);
    } else {
        const filtered = allPartners.filter(p => p.status === filter);
        displayPartners(filtered);
    }
}

async function approvePartner(partnerId) {
    if (!confirm('Are you sure you want to approve this partner application?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/partners/approve/${partnerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewed_by: 'Admin' // TODO: Get actual admin user info
            })
        });

        if (!response.ok) {
            throw new Error('Failed to approve partner');
        }

        console.log('Partner approved');
        showSuccess('Partner approved successfully!');

        // Reload data
        await loadPartnerStatistics();
        await loadPartners();

    } catch (error) {
        console.error('Error approving partner:', error);
        showError('Failed to approve partner. Please try again.');
    }
}

async function rejectPartner(partnerId) {
    const reason = prompt('Please provide a reason for rejection:');
    
    if (!reason || reason.trim() === '') {
        alert('Rejection reason is required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/partners/reject/${partnerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewed_by: 'Admin', // TODO: Get actual admin user info
                rejection_reason: reason.trim()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to reject partner');
        }

        console.log('Partner rejected');
        showSuccess('Partner application rejected');

        // Reload data
        await loadPartnerStatistics();
        await loadPartners();

    } catch (error) {
        console.error('Error rejecting partner:', error);
        showError('Failed to reject partner. Please try again.');
    }
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ${type === 'success' 
            ? 'background-color: #10b981; color: white;' 
            : 'background-color: #ef4444; color: white;'
        }
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Make functions globally available
window.approvePartner = approvePartner;
window.rejectPartner = rejectPartner;

console.log('Admin partner dashboard loaded');
