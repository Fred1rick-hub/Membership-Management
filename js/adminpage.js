let students = [];
let deletedControlNumbers = [];
let currentFilter = {
    search: '',
    year: ''
};
let isSubmitting = false;
let currentSection = 'home';
let pieChart = null;

const STORAGE_KEYS = {
    STUDENTS: 'membership_students',
    DELETED_CONTROL_NUMBERS: 'membership_deleted_control_numbers',
    THEME: 'membership_theme',
    CURRENT_USER: 'membership_current_user',
    REGISTRATIONS: 'membership_registrations'
};

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    loadStudentsFromStorage();
    initializeEventListeners();
    showSection('home');
    updateDisplay();
    initializePieChart();
    loadRequests();
});

function initializeEventListeners() {
    const registrationForm = document.getElementById('registrationForm');
    const editForm = document.getElementById('editForm');
    
    registrationForm.removeEventListener('submit', registerStudent);
    registrationForm.addEventListener('submit', registerStudent);
    
    editForm.removeEventListener('submit', updateStudent);
    editForm.addEventListener('submit', updateStudent);
    
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchStudents();
        }
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        } catch (e) {
            console.warn('Could not clear user session:', e);
        }
        window.location.href = 'index.html';
    }
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const targetLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }
    
    currentSection = sectionName;
    
    if (['home', 'statistics', 'members'].includes(sectionName)) {
        updateDisplay();
    }
    
    if (sectionName === 'statistics') {
        setTimeout(() => updatePieChart(), 100);
    }

    if (sectionName === 'Requests') {
        loadRequests();
    }

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainWrapper = document.querySelector('.main-wrapper');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('expanded');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    
    const themeButton = document.querySelector('.theme-toggle');
    themeButton.textContent = newTheme === 'dark' ? '⋆.˚🌷༘⋆' : '⋆.˚🪻༘⋆';
}

function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeButton = document.querySelector('.theme-toggle');
    themeButton.textContent = savedTheme === 'dark' ? '⋆.˚🌷༘⋆' : '⋆.˚🪻༘⋆';
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        localStorage.setItem(STORAGE_KEYS.DELETED_CONTROL_NUMBERS, JSON.stringify(deletedControlNumbers));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

function loadStudentsFromStorage() {
    try {
        const studentsData = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        const deletedData = localStorage.getItem(STORAGE_KEYS.DELETED_CONTROL_NUMBERS);
        
        if (studentsData) {
            students = JSON.parse(studentsData);
        }
        if (deletedData) {
            deletedControlNumbers = JSON.parse(deletedData);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return false;
    }
}

function generateControlNumber() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    if (deletedControlNumbers.length > 0) {
        return deletedControlNumbers.shift();
    }
    
    let number = 1;
    let controlNumber;
    
    do {
        const numberStr = String(number).padStart(3, '0');
        controlNumber = `CN-${month}-${day}-${numberStr}`;
        number++;
    } while (students.some(student => student.controlNumber === controlNumber));
    
    return controlNumber;
}

async function registerStudent(e) {
    e.preventDefault();
    
    if (isSubmitting) {
        return;
    }
    
    isSubmitting = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
    
    try {
        const studentNumber = document.getElementById('studentNumber').value.trim();
        
        if (!studentNumber) {
            showAlert('Student number is required!', 'error');
            return;
        }
        
        if (students.some(student => student.studentNumber === studentNumber)) {
            showAlert('Student number already exists!', 'error');
            return;
        }
        
        const studentData = {
            id: Date.now() + Math.random(),
            name: document.getElementById('studentName').value.trim(),
            studentNumber: studentNumber,
            schoolYear: document.getElementById('schoolYear').value,
            membershipFee: parseFloat(document.getElementById('membershipFee').value),
            controlNumber: generateControlNumber(),
            registrationDate: new Date().toISOString().split('T')[0]
        };
        
        if (!studentData.name || !studentData.schoolYear || !studentData.membershipFee) {
            showAlert('Please fill in all required fields!', 'error');
            return;
        }
        
        students.push(studentData);
        saveToLocalStorage();
        updateDisplay();
        updatePieChart();
        
        document.getElementById('registrationForm').reset();
        document.getElementById('membershipFee').value = '20';
        
        showAlert(`Student registered successfully! Control Number: ${studentData.controlNumber}`, 'success');
        
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Registration failed. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Register Student';
    }
}

function searchStudents() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    currentFilter.search = searchTerm;
    updateDisplay();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentFilter.search = '';
    updateDisplay();
}

function applyFilters() {
    currentFilter.year = document.getElementById('yearFilter').value;
    updateDisplay();
}

function getFilteredStudents() {
    return students.filter(student => {
        if (currentFilter.search) {
            const searchTerm = currentFilter.search;
            if (!student.name.toLowerCase().includes(searchTerm) && 
                !student.studentNumber.toLowerCase().includes(searchTerm) && 
                !student.controlNumber.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }
        
        if (currentFilter.year && student.schoolYear !== currentFilter.year) {
            return false;
        }
        
        return true;
    });
}

function calculateStats(studentsData) {
    const totalMembers = studentsData.length;
    const totalRevenue = studentsData.reduce((sum, student) => sum + (student.membershipFee || 0), 0);
    
    const yearCounts = {
        '1st Year': 0,
        '2nd Year': 0,
        '3rd Year': 0,
        '4th Year': 0
    };
    
    studentsData.forEach(student => {
        if (yearCounts.hasOwnProperty(student.schoolYear)) {
            yearCounts[student.schoolYear]++;
        }
    });
    
    return {
        totalMembers,
        totalRevenue,
        yearCounts
    };
}

function initializePieChart() {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;
    
    pieChart = {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        centerX: 200,
        centerY: 200,
        radius: 150,
        colors: {
            '1st Year': '#28a745',
            '2nd Year': '#ffc107',
            '3rd Year': '#dc3545',
            '4th Year': '#007bff'
        }
    };
    
    updatePieChart();
}

function updatePieChart() {
    if (!pieChart || !pieChart.ctx) return;
    
    const stats = calculateStats(students);
    const yearCounts = stats.yearCounts;
    const total = stats.totalMembers;
    
    document.getElementById('legend1stYear').textContent = yearCounts['1st Year'];
    document.getElementById('legend2ndYear').textContent = yearCounts['2nd Year'];
    document.getElementById('legend3rdYear').textContent = yearCounts['3rd Year'];
    document.getElementById('legend4thYear').textContent = yearCounts['4th Year'];

    pieChart.ctx.clearRect(0, 0, pieChart.canvas.width, pieChart.canvas.height);
    
    if (total === 0) {
        pieChart.ctx.fillStyle = '#e0e0e0';
        pieChart.ctx.beginPath();
        pieChart.ctx.arc(pieChart.centerX, pieChart.centerY, pieChart.radius, 0, 2 * Math.PI);
        pieChart.ctx.fill();
        
        pieChart.ctx.fillStyle = '#666';
        pieChart.ctx.font = '16px Arial';
        pieChart.ctx.textAlign = 'center';
        pieChart.ctx.fillText('No Data Available', pieChart.centerX, pieChart.centerY);
        return;
    }
    
    let currentAngle = -Math.PI / 2;
    const angles = {};
    
    Object.keys(yearCounts).forEach(year => {
        const count = yearCounts[year];
        const percentage = count / total;
        const angle = percentage * 2 * Math.PI;
        
        if (count > 0) {
            angles[year] = {
                start: currentAngle,
                end: currentAngle + angle,
                percentage: percentage
            };
            currentAngle += angle;
        }
    });
    
    Object.keys(angles).forEach(year => {
        const angle = angles[year];
        const color = pieChart.colors[year];
        
        pieChart.ctx.fillStyle = color;
        pieChart.ctx.beginPath();
        pieChart.ctx.moveTo(pieChart.centerX, pieChart.centerY);
        pieChart.ctx.arc(pieChart.centerX, pieChart.centerY, pieChart.radius, angle.start, angle.end);
        pieChart.ctx.closePath();
        pieChart.ctx.fill();
        
        pieChart.ctx.strokeStyle = '#ffffff';
        pieChart.ctx.lineWidth = 2;
        pieChart.ctx.stroke();
        
        if (angle.percentage > 0.05) {
            const labelAngle = angle.start + (angle.end - angle.start) / 2;
            const labelX = pieChart.centerX + Math.cos(labelAngle) * (pieChart.radius * 0.7);
            const labelY = pieChart.centerY + Math.sin(labelAngle) * (pieChart.radius * 0.7);
            
            pieChart.ctx.fillStyle = '#ffffff';
            pieChart.ctx.font = 'bold 14px Arial';
            pieChart.ctx.textAlign = 'center';
            pieChart.ctx.textBaseline = 'middle';
            
            pieChart.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            pieChart.ctx.shadowBlur = 2;
            pieChart.ctx.shadowOffsetX = 1;
            pieChart.ctx.shadowOffsetY = 1;
            
            const percentage = Math.round(angle.percentage * 100);
            pieChart.ctx.fillText(`${percentage}%`, labelX, labelY);
            
            pieChart.ctx.shadowColor = 'transparent';
            pieChart.ctx.shadowBlur = 0;
            pieChart.ctx.shadowOffsetX = 0;
            pieChart.ctx.shadowOffsetY = 0;
        }
    });
}

function updateDisplay() {
    const filteredStudents = getFilteredStudents();
    updateTable(filteredStudents);
    updateStatistics(filteredStudents);
    updateQuickStats();
    
    if (currentSection === 'statistics') {
        updatePieChart();
    }
}

function updateStatistics(filteredStudents = students) {
    const stats = calculateStats(filteredStudents);
    
    const elements = {
        totalMembers: document.getElementById('totalMembers'),
        totalRevenue: document.getElementById('totalRevenue')
    };
    
    if (elements.totalMembers) elements.totalMembers.textContent = stats.totalMembers;
    if (elements.totalRevenue) elements.totalRevenue.textContent = `₱${stats.totalRevenue.toLocaleString()}`;
}

function updateQuickStats() {
    const stats = calculateStats(students);
    
    const quickTotalMembers = document.getElementById('quickTotalMembers');
    const quickTotalRevenue = document.getElementById('quickTotalRevenue');
    
    if (quickTotalMembers) quickTotalMembers.textContent = stats.totalMembers;
    if (quickTotalRevenue) quickTotalRevenue.textContent = `₱${stats.totalRevenue.toLocaleString()}`;
}

function updateTable(filteredStudents = students) {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;
    
    const filteredCountElement = document.getElementById('filteredCount');
    if (filteredCountElement) {
        filteredCountElement.textContent = filteredStudents.length;
    }
    
    tbody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="empty-state">
                <h3>No students found</h3>
                <p>No students match your current filters.</p>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.controlNumber || 'N/A'}</td>
            <td>${student.name || 'N/A'}</td>
            <td>${student.studentNumber || 'N/A'}</td>
            <td>${student.schoolYear || 'N/A'}</td>
            <td>₱${(student.membershipFee || 0).toLocaleString()}</td>
            <td>${student.registrationDate || 'N/A'}</td>
            <td class="actions">
                <button class="btn btn-warning btn-small" onclick="editStudent('${student.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editStudent(id) {
    const student = students.find(s => s.id == id);
    if (!student) {
        showAlert('Student not found!', 'error');
        return;
    }
    
    document.getElementById('editId').value = student.id;
    document.getElementById('editName').value = student.name || '';
    document.getElementById('editNumber').value = student.studentNumber || '';
    document.getElementById('editYear').value = student.schoolYear || '';
    document.getElementById('editFee').value = student.membershipFee || 0;
    
    document.getElementById('editModal').style.display = 'block';
}

async function updateStudent(e) {
    e.preventDefault();
    
    if (isSubmitting) {
        return;
    }
    
    isSubmitting = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    try {
        const id = document.getElementById('editId').value;
        const newStudentNumber = document.getElementById('editNumber').value.trim();
        
        if (!newStudentNumber) {
            showAlert('Student number is required!', 'error');
            return;
        }
        
        if (students.some(student => student.studentNumber === newStudentNumber && student.id != id)) {
            showAlert('Student number already exists!', 'error');
            return;
        }
        
        const updatedData = {
            name: document.getElementById('editName').value.trim(),
            studentNumber: newStudentNumber,
            schoolYear: document.getElementById('editYear').value,
            membershipFee: parseFloat(document.getElementById('editFee').value) || 0
        };
        
        if (!updatedData.name || !updatedData.schoolYear) {
            showAlert('Please fill in all required fields!', 'error');
            return;
        }
        
        const studentIndex = students.findIndex(s => s.id == id);
        if (studentIndex !== -1) {
            students[studentIndex] = { ...students[studentIndex], ...updatedData };
            
            saveToLocalStorage();
            updateDisplay();
            updatePieChart();
            closeEditModal();
            showAlert('Student updated successfully!', 'success');
        } else {
            showAlert('Student not found!', 'error');
        }
        
    } catch (error) {
        console.error('Update error:', error);
        showAlert('Update failed. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Update Student';
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        const studentIndex = students.findIndex(s => s.id == id);
        if (studentIndex !== -1) {
            const deletedStudent = students[studentIndex];
            
            if (deletedStudent.controlNumber) {
                deletedControlNumbers.push(deletedStudent.controlNumber);
                deletedControlNumbers.sort();
            }
            
            students.splice(studentIndex, 1);
            saveToLocalStorage();
            updateDisplay();
            updatePieChart();
            showAlert('Student deleted successfully!', 'success');
        } else {
            showAlert('Student not found!', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Delete failed. Please try again.', 'error');
    }
}

function deleteAllMembers() {
    if (!confirm('Are you sure you want to delete ALL students? This action cannot be undone!')) return;
    
    try {
        students = [];
        deletedControlNumbers = [];
        saveToLocalStorage();
        updateDisplay();
        updatePieChart();
        showAlert('All students deleted successfully!', 'success');
    } catch (error) {
        console.error('Delete all error:', error);
        showAlert('Delete all failed. Please try again.', 'error');
    }
}

function escapeCSVField(field) {
    if (field == null || field === undefined) {
        return '';
    }
    
    const fieldStr = String(field);
    
    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
        return '"' + fieldStr.replace(/"/g, '""') + '"';
    }
    
    return fieldStr;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    result.push(current.trim());
    
    return result;
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length > 0 && fields.some(field => field !== '')) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = fields[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

function saveDataFile() {
    const filteredStudents = getFilteredStudents();
    
    if (filteredStudents.length === 0) {
        showAlert('No data to save!', 'error');
        return;
    }
    
    try {
        const headers = ['Control Number', 'Name', 'Student Number', 'Year Level', 'Fee', 'Date'];
        const csvRows = [headers.join(',')];
        
        filteredStudents.forEach(student => {
            const row = [
                escapeCSVField(student.controlNumber || ''),
                escapeCSVField(student.name || ''),
                escapeCSVField(student.studentNumber || ''),
                escapeCSVField(student.schoolYear || ''),
                escapeCSVField(student.membershipFee || 0),
                escapeCSVField(student.registrationDate || '')
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(dataBlob);
        link.href = url;
        link.download = `membership_data.csv`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert(`File saved successfully! ${filteredStudents.length} records exported.`, 'success');
    } catch (error) {
        console.error('Save file error:', error);
        showAlert('Failed to save file. Please try again.', 'error');
    }
}

function loadDataFile() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        showAlert('Please select a valid file!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const csvData = parseCSV(csvText);
            
            if (csvData.length === 0) {
                showAlert('The file appears to be empty or invalid!', 'error');
                return;
            }
            
            const requiredColumns = ['Control Number', 'Name', 'Student Number', 'Year Level', 'Fee', 'Date'];
            const firstRow = csvData[0];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            
            if (missingColumns.length > 0) {
                showAlert(`File is missing required columns: ${missingColumns.join(', ')}`, 'error');
                return;
            }
            
            if (confirm(`This will replace all current data with ${csvData.length} records. Would you like to continue?`)) {
                const newStudents = csvData.map((row, index) => ({
                    id: Date.now() + index,
                    name: row['Name'] || '',
                    studentNumber: row['Student Number'] || '',
                    schoolYear: row['Year Level'] || '',
                    membershipFee: parseFloat(row['Fee']) || 0,
                    controlNumber: row['Control Number'] || '',
                    registrationDate: row['Date'] || ''
                })).filter(student => student.name && student.studentNumber);
                
                const studentNumbers = new Set();
                const duplicates = [];
                newStudents.forEach(student => {
                    if (studentNumbers.has(student.studentNumber)) {
                        duplicates.push(student.studentNumber);
                    } else {
                        studentNumbers.add(student.studentNumber);
                    }
                });
                
                if (duplicates.length > 0) {
                    showAlert(`Found duplicate student numbers in CSV: ${duplicates.join(', ')}. Please fix the CSV file and try again.`, 'error');
                    return;
                }
                
                students = newStudents;
                deletedControlNumbers = [];
                
                saveToLocalStorage();
                updateDisplay();
                updatePieChart();
                showAlert(`Successfully loaded ${newStudents.length} students from file`, 'success');
            }
        } catch (error) {
            console.error('CSV load error:', error);
            showAlert('Failed to load CSV file. Please check the file format and try again.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// REQUEST MANAGEMENT FUNCTIONS
function getRegistrations() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading registrations:', error);
        return [];
    }
}

function saveRegistrations(registrations) {
    try {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
        return true;
    } catch (error) {
        console.error('Error saving registrations:', error);
        return false;
    }
}

function loadRequests() {
    const registrations = getRegistrations();
    const pendingRequests = registrations.filter(reg => reg.status === 'pending');
    
    const tbody = document.getElementById('requestsTableBody');
    const requestCount = document.getElementById('requestCount');
    
    if (!tbody) return;
    
    if (requestCount) {
        requestCount.textContent = pendingRequests.length;
    }
    
    tbody.innerHTML = '';
    
    if (pendingRequests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>No pending requests</h3>
                    <p>All membership requests have been processed.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    pendingRequests.forEach(request => {
        const date = new Date(request.submittedAt).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Pending</td>
            <td>${request.studentName || 'N/A'}</td>
            <td>${request.studentNumber || 'N/A'}</td>
            <td>${request.schoolYear || 'N/A'}</td>
            <td>₱${(request.membershipFee || 0).toLocaleString()}</td>
            <td>${date}</td>
            <td class="actions">
                <button class="btn btn-info btn-small" onclick="viewRequest('${request.id}')">View</button>
                <button class="btn btn-success btn-small" onclick="approveRequest('${request.id}')">Approve</button>
                <button class="btn btn-danger btn-small" onclick="rejectRequest('${request.id}')">Reject</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewRequest(id) {
    const registrations = getRegistrations();
    const request = registrations.find(reg => reg.id == id);
    
    if (!request) {
        showAlert('Request not found!', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Membership Request Details</h2>
            <div style="margin: 2rem 0;">
                <div class="form-group">
                    <label>Full Name:</label>
                    <p style="font-weight: 600; color: var(--text-secondary);">${request.studentName}</p>
                </div>
                <div class="form-group">
                    <label>Student Number:</label>
                    <p style="font-weight: 600; color: var(--text-secondary);">${request.studentNumber}</p>
                </div>
                <div class="form-group">
                    <label>School Year:</label>
                    <p style="font-weight: 600; color: var(--text-secondary);">${request.schoolYear}</p>
                </div>
                <div class="form-group">
                    <label>Membership Fee:</label>
                    <p style="font-weight: 600; color: var(--text-secondary);">₱${request.membershipFee.toLocaleString()}</p>
                </div>
                <div class="form-group">
                    <label>Proof of Payment:</label>
                    <div style="margin-top: 1rem; text-align: center;">
                        <img src="${request.proofOfPayment}" alt="Proof of Payment" 
                             style="max-width: 100%; max-height: 400px; border-radius: 15px; border: 3px solid var(--border-color); box-shadow: var(--shadow);">
                    </div>
                </div>
                <div class="form-group">
                    <label>Submitted:</label>
                    <p style="font-weight: 600; color: var(--text-secondary);">${new Date(request.submittedAt).toLocaleString()}</p>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-success" onclick="approveRequest('${request.id}'); this.closest('.modal').remove();">Approve</button>
                    <button class="btn btn-danger" onclick="rejectRequest('${request.id}'); this.closest('.modal').remove();">Reject</button>
                    <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function approveRequest(id) {
    const registrations = getRegistrations();
    const requestIndex = registrations.findIndex(reg => reg.id == id);
    
    if (requestIndex === -1) {
        showAlert('Request not found!', 'error');
        return;
    }
    
    const request = registrations[requestIndex];
    
    if (students.some(student => student.studentNumber === request.studentNumber)) {
        showAlert('Student number already exists in database!', 'error');
        return;
    }
    
    const studentData = {
        id: Date.now() + Math.random(),
        name: request.studentName,
        studentNumber: request.studentNumber,
        schoolYear: request.schoolYear,
        membershipFee: request.membershipFee,
        controlNumber: generateControlNumber(),
        registrationDate: new Date().toISOString().split('T')[0]
    };
    
    students.push(studentData);
    registrations[requestIndex].status = 'approved';
    
    saveToLocalStorage();
    saveRegistrations(registrations);
    updateDisplay();
    updatePieChart();
    loadRequests();
    
    showAlert(`Request approved! Control Number: ${studentData.controlNumber}`, 'success');
}

function rejectRequest(id) {
    if (!confirm('Are you sure you want to reject this request?')) return;
    
    const registrations = getRegistrations();
    const requestIndex = registrations.findIndex(reg => reg.id == id);
    
    if (requestIndex === -1) {
        showAlert('Request not found!', 'error');
        return;
    }
    
    registrations[requestIndex].status = 'rejected';
    
    saveRegistrations(registrations);
    loadRequests();
    
    showAlert('Request rejected successfully!', 'success');
}

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

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditModal();
        closeSidebar();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDataFile();
    }
});

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
    
    if (currentSection === 'statistics') {
        setTimeout(() => updatePieChart(), 100);
    }
});

console.log('Admin page with request management initialized!');