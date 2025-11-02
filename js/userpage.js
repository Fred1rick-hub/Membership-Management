const STORAGE_KEYS = {
    USERS: 'membership_users',
    CURRENT_USER: 'membership_current_user',
    THEME: 'membership_theme',
    REGISTRATIONS: 'membership_registrations',
    LAST_STATUS: 'membership_last_status'
};

let uploadedPhotoBase64 = null;
let statusCheckInterval;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeEventListeners();
    checkRegistrationStatus();
    updateCurrentDate();
    
    // Check for status changes every 5 seconds
    statusCheckInterval = setInterval(checkForStatusChanges, 5000);
});

// Check if user is logged in
function checkAuthentication() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        window.location.href = '../Loginpage/loginpage.html';
        return;
    }
    
    // Update username display
    const usernameElements = document.querySelectorAll('#currentUsername, #displaySubmittedBy');
    usernameElements.forEach(el => {
        if (el) el.textContent = currentUser.username;
    });
}

// Set up event listeners
function initializeEventListeners() {
    const registrationForm = document.getElementById('registrationForm');
    const photoUpload = document.getElementById('photoUpload');
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const clearBtn = document.getElementById('clearBtn');
    const reregisterBtn = document.getElementById('reregisterBtn');
    const logoutBtnForm = document.getElementById('logoutBtnForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const toastClose = document.getElementById('toastClose');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }
    
    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoUpload);
    }
    
    if (addPhotoBtn) {
        addPhotoBtn.addEventListener('click', () => photoUpload.click());
    }
    
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearForm);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }
    
    if (reregisterBtn) {
        reregisterBtn.addEventListener('click', showRegistrationForm);
    }
    
    if (logoutBtnForm) {
        logoutBtnForm.addEventListener('click', logout);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (toastClose) {
        toastClose.addEventListener('click', hideNotificationToast);
    }
}

// Update current date display
function updateCurrentDate() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    
    const dateElements = document.querySelectorAll('#currentDate, #displaySubmittedDate');
    dateElements.forEach(el => {
        if (el) el.textContent = formattedDate;
    });
}

// Check registration status and display appropriate view
function checkRegistrationStatus() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const registrations = getRegistrations();
    const userRegistration = registrations.find(reg => reg.userId === currentUser.id);
    
    const statusSection = document.getElementById('statusSection');
    const registrationSection = document.getElementById('registrationSection');
    
    if (userRegistration) {
        displayStatusCard(userRegistration);
        statusSection.style.display = 'block';
        registrationSection.style.display = 'none';
        
        // Save current status
        saveLastStatus(userRegistration.status);
    } else {
        statusSection.style.display = 'none';
        registrationSection.style.display = 'block';
    }
}

// Display status card with registration details
function displayStatusCard(registration) {
    const statusBadgeHeader = document.getElementById('statusBadgeHeader');
    if (statusBadgeHeader) {
        statusBadgeHeader.textContent = registration.status.toUpperCase();
        statusBadgeHeader.className = 'status-badge-header ' + registration.status;
    }
    
    document.getElementById('displayName').textContent = registration.studentName;
    document.getElementById('displayNumber').textContent = registration.studentNumber;
    document.getElementById('displayYear').textContent = registration.schoolYear;
    document.getElementById('displayFee').textContent = `₱${registration.membershipFee}`;
    
    const proofDisplay = document.getElementById('proofDisplay');
    if (proofDisplay && registration.proofOfPayment) {
        proofDisplay.innerHTML = `<img src="${registration.proofOfPayment}" alt="Proof of Payment">`;
    }
    
    document.getElementById('displaySubmittedBy').textContent = registration.submittedBy || 'Unknown';
    
    const submittedDate = new Date(registration.submittedAt);
    document.getElementById('displaySubmittedDate').textContent = submittedDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    
    const footerStatus = document.getElementById('footerStatus');
    const statusLabel = footerStatus.querySelector('.status-label');
    const statusIcon = footerStatus.querySelector('.status-icon');
    
    if (registration.status === 'approved') {
        statusLabel.textContent = 'REQUEST APPROVED';
        statusLabel.className = 'status-label approved';
        statusIcon.textContent = '✓';
        footerStatus.className = 'footer-status approved';
        footerStatus.style.background = '#90ee90';
        footerStatus.style.borderColor = '#32cd32';
    } else if (registration.status === 'denied') {
        statusLabel.textContent = 'REQUEST DENIED';
        statusLabel.className = 'status-label denied';
        statusIcon.textContent = '✕';
        footerStatus.className = 'footer-status denied';
        footerStatus.style.background = 'linear-gradient(135deg, #ffb6c1, #ffc0cb)';
        footerStatus.style.borderColor = '#ff69b4';
    } else {
        statusLabel.textContent = 'REQUEST PENDING';
        statusLabel.className = 'status-label pending';
        statusIcon.textContent = '⏳';
        footerStatus.className = 'footer-status pending';
        footerStatus.style.background = '#ffb6d9';
        footerStatus.style.borderColor = '#ff69b4';
    }
}

// Check for status changes periodically
function checkForStatusChanges() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const registrations = getRegistrations();
    const userRegistration = registrations.find(reg => reg.userId === currentUser.id);
    
    if (!userRegistration) return;
    
    const lastStatus = getLastStatus();
    
    if (lastStatus && lastStatus !== userRegistration.status) {
        showNotificationToast(userRegistration.status);
        displayStatusCard(userRegistration);
    }
    
    saveLastStatus(userRegistration.status);
}

// Show notification toast
function showNotificationToast(status) {
    const toast = document.getElementById('notificationToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast) return;
    
    if (status === 'approved') {
        toastIcon.textContent = '✓';
        toastTitle.textContent = 'Request Approved!';
        toastMessage.textContent = 'Congratulations! Your membership request has been approved.';
    } else if (status === 'denied') {
        toastIcon.textContent = '✕';
        toastTitle.textContent = 'Request Denied';
        toastMessage.textContent = 'Your membership request has been denied. Please contact admin for more information.';
    } else if (status === 'pending') {
        toastIcon.textContent = '⏳';
        toastTitle.textContent = 'Request Pending';
        toastMessage.textContent = 'Your membership request is being reviewed.';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        hideNotificationToast();
    }, 7000);
}

// Hide notification toast
function hideNotificationToast() {
    const toast = document.getElementById('notificationToast');
    if (toast) {
        toast.classList.remove('show');
    }
}

// Handle photo upload
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedPhotoBase64 = event.target.result;
            const photoPreview = document.getElementById('photoPreview');
            const addPhotoBtn = document.getElementById('addPhotoBtn');
            
            if (photoPreview) {
                photoPreview.innerHTML = `<img src="${event.target.result}" alt="Payment Receipt">`;
                if (addPhotoBtn) addPhotoBtn.style.display = 'none';
            }
            showAlert('Photo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        showAlert('Please select a valid image file!', 'error');
    }
}

// Handle registration form submission
function handleRegistration(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('studentName').value.trim();
    const studentNumber = document.getElementById('studentNumber').value.trim();
    const schoolYear = document.getElementById('schoolYear').value;
    const membershipFee = document.getElementById('membershipFee').value;
    
    if (!studentName || !studentNumber || !schoolYear || !membershipFee) {
        showAlert('Please fill in all fields!', 'error');
        return;
    }
    
    if (!uploadedPhotoBase64) {
        showAlert('Please upload proof of payment!', 'error');
        return;
    }
    
    const currentUser = getCurrentUser();
    
    const registration = {
        id: Date.now(),
        userId: currentUser.id,
        studentName: studentName,
        studentNumber: studentNumber,
        schoolYear: schoolYear,
        membershipFee: parseFloat(membershipFee),
        proofOfPayment: uploadedPhotoBase64,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submittedBy: currentUser.username
    };
    
    const registrations = getRegistrations();
    const filteredRegistrations = registrations.filter(reg => reg.userId !== currentUser.id);
    filteredRegistrations.push(registration);
    
    if (saveRegistrations(filteredRegistrations)) {
        showAlert('Registration submitted successfully! Waiting for admin approval.', 'success');
        clearForm();
        saveLastStatus('pending');
        
        setTimeout(() => {
            checkRegistrationStatus();
        }, 1500);
    } else {
        showAlert('Failed to submit registration. Please try again.', 'error');
    }
}

// Clear form
function clearForm() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        document.getElementById('membershipFee').value = '20';
    }
    
    const photoPreview = document.getElementById('photoPreview');
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    
    if (photoPreview) {
        photoPreview.innerHTML = '';
    }
    if (addPhotoBtn) {
        addPhotoBtn.style.display = 'flex';
    }
    
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.value = '';
    }
    
    uploadedPhotoBase64 = null;
    showAlert('Form cleared successfully!', 'success');
}

// Show registration form (for re-registration)
function showRegistrationForm() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const registrations = getRegistrations();
    const filteredRegistrations = registrations.filter(reg => reg.userId !== currentUser.id);
    
    if (saveRegistrations(filteredRegistrations)) {
        const statusSection = document.getElementById('statusSection');
        const registrationSection = document.getElementById('registrationSection');
        
        if (statusSection) statusSection.style.display = 'none';
        if (registrationSection) registrationSection.style.display = 'block';
        
        clearForm();
        showAlert('You can now submit a new registration request.', 'success');
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
        }
        
        try {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            localStorage.removeItem(STORAGE_KEYS.LAST_STATUS);
        } catch (e) {
            console.warn('Could not clear user session:', e);
        }
        window.location.href = '/index.html';
    }
}

// Get registrations from storage
function getRegistrations() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading registrations:', error);
        return [];
    }
}

// Save registrations to storage
function saveRegistrations(registrations) {
    try {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
        return true;
    } catch (error) {
        console.error('Error saving registrations:', error);
        showAlert('Could not save registration data. Please check browser settings.', 'error');
        return false;
    }
}

// Get current user from storage
function getCurrentUser() {
    try {
        const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error loading current user:', error);
        return null;
    }
}

// Get last status from storage
function getLastStatus() {
    try {
        return localStorage.getItem(STORAGE_KEYS.LAST_STATUS);
    } catch (error) {
        console.error('Error getting last status:', error);
        return null;
    }
}

// Save last status to storage
function saveLastStatus(status) {
    try {
        localStorage.setItem(STORAGE_KEYS.LAST_STATUS, status);
    } catch (error) {
        console.error('Error saving last status:', error);
    }
}

// Show alert message
function showAlert(message, type) {
    const alertId = type === 'success' ? 'successAlert' : 'errorAlert';
    const alertElement = document.getElementById(alertId);
    
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        
        if (alertElement.timeoutId) {
            clearTimeout(alertElement.timeoutId);
        }
        
        alertElement.timeoutId = setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

console.log('User page initialized successfully!');