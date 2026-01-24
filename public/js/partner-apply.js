// Partner Application Form Handler
const API_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('partnerApplicationForm');
    
    if (form) {
        form.addEventListener('submit', handleApplicationSubmit);
    }
});

async function handleApplicationSubmit(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Get form data
    const formData = {
        full_name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        license_type: document.getElementById('licenseType').value,
        license_number: document.getElementById('licenseNumber').value.trim(),
        specialty: document.getElementById('specialty').value.trim(),
        facility_name: document.getElementById('facilityName').value.trim(),
        facility_address: document.getElementById('facilityAddress').value.trim(),
        years_experience: parseInt(document.getElementById('yearsExperience').value)
    };

    // Validation
    if (!formData.full_name || !formData.email || !formData.phone || 
        !formData.license_type || !formData.license_number || 
        !formData.facility_name || !formData.facility_address) {
        
        showMessage('Please fill in all required fields', 'error');
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/partner/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit application');
        }

        console.log('Application submitted successfully:', data);

        // Show success message
        showMessage(
            'Application submitted successfully! Our team will review your application and contact you within 3-5 business days.',
            'success'
        );

        // Reset form
        e.target.reset();

        // Scroll to success message
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error submitting application:', error);
        showMessage(
            error.message || 'Failed to submit application. Please try again.',
            'error'
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

function showMessage(message, type = 'success') {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.cssText = `
        padding: 1rem;
        margin-bottom: 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        ${type === 'success' 
            ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' 
            : 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
        }
    `;
    messageDiv.textContent = message;

    // Insert at the top of the form
    const form = document.getElementById('partnerApplicationForm');
    form.insertBefore(messageDiv, form.firstChild);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 10000);
}

console.log('Partner application form handler loaded');
