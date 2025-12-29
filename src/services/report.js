/**
 * Report Service
 * 
 * Generates progress reports for sharing with caregivers/doctors.
 * Reports are:
 * - Generated as secure HTML (can be printed/saved as PDF)
 * - Accessible via time-limited secure links
 * - Logged for audit purposes
 */

const crypto = require('crypto');
const { query } = require('../db');
const config = require('../config');

/**
 * Generate a secure report token
 * @returns {string} - Unique token
 */
function generateReportToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a shareable report for a user
 * 
 * @param {Object} user - User object
 * @param {Object} progressData - User's progress data
 * @param {Object} options - Report options
 * @returns {Promise<Object>} - Report details including secure URL
 */
async function createReport(user, progressData, options = {}) {
  const {
    recipientPhone,
    recipientName,
    recipientRole = 'caregiver', // 'doctor', 'caregiver', 'family'
    expiresInHours = 72
  } = options;
  
  // Generate unique token
  const token = generateReportToken();
  
  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  // Generate report content
  const reportContent = generateReportHTML(user, progressData);
  
  // Save report to database
  const result = await query(`
    INSERT INTO shared_reports (
      user_id, token, recipient_phone, recipient_name, recipient_role,
      report_content, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    user.id, token, recipientPhone, recipientName, recipientRole,
    reportContent, expiresAt
  ]);
  
  const report = result.rows[0];
  
  // Generate secure URL
  const reportUrl = `${config.app.baseUrl}/report/${token}`;
  
  return {
    id: report.id,
    token,
    url: reportUrl,
    expiresAt,
    recipientName,
    recipientPhone
  };
}

/**
 * Get report by token (for viewing)
 */
async function getReportByToken(token) {
  const result = await query(`
    SELECT sr.*, u.name as patient_name
    FROM shared_reports sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.token = $1
  `, [token]);
  
  const report = result.rows[0];
  
  if (!report) {
    return null;
  }
  
  // Check if expired
  if (new Date(report.expires_at) < new Date()) {
    return { expired: true };
  }
  
  // Log the view
  await query(`
    UPDATE shared_reports 
    SET view_count = view_count + 1, last_viewed_at = NOW()
    WHERE id = $1
  `, [report.id]);
  
  return report;
}

/**
 * Generate the HTML report content
 */
function generateReportHTML(user, progressData) {
  const {
    current_day,
    current_phase,
    current_week,
    recentLogs = [],
    measurements = [],
    fastingCompliance,
    exerciseCompliance
  } = progressData;
  
  // Calculate averages from recent logs
  const avgGlucose = calculateAverage(recentLogs, 'glucose_reading');
  const avgFastingHours = calculateAverage(recentLogs, 'fasting_hours');
  
  // Get latest and starting measurements
  const latestMeasurement = measurements[measurements.length - 1] || {};
  
  const weightChange = latestMeasurement.weight && user.starting_weight
    ? (latestMeasurement.weight - user.starting_weight).toFixed(1)
    : 'N/A';
  
  const waistChange = latestMeasurement.waist && user.starting_waist
    ? (latestMeasurement.waist - user.starting_waist).toFixed(1)
    : 'N/A';
  
  const glucoseChange = latestMeasurement.glucose && user.starting_glucose
    ? (latestMeasurement.glucose - user.starting_glucose).toFixed(1)
    : 'N/A';
  
  const phaseName = { 1: 'Adapt', 2: 'Intensify', 3: 'Lock In' }[current_phase] || 'Unknown';
  
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freedom Protocol Progress Report - ${user.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1d283d 0%, #2d3a4f 100%);
      color: #fff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 1.8rem;
      margin-bottom: 5px;
    }
    .header .subtitle {
      opacity: 0.9;
      font-size: 1rem;
    }
    .header .date {
      margin-top: 15px;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .patient-info {
      background: #4db5ff;
      color: #fff;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
    }
    .patient-info .item {
      text-align: center;
    }
    .patient-info .label {
      font-size: 0.8rem;
      opacity: 0.9;
      text-transform: uppercase;
    }
    .patient-info .value {
      font-size: 1.3rem;
      font-weight: 600;
    }
    .section {
      padding: 25px 30px;
      border-bottom: 1px solid #eee;
    }
    .section h2 {
      font-size: 1.2rem;
      color: #1d283d;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #4db5ff;
      display: inline-block;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .metric-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
    }
    .metric-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #1d283d;
    }
    .metric-card .label {
      font-size: 0.85rem;
      color: #666;
      margin-top: 5px;
    }
    .metric-card .change {
      font-size: 0.9rem;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 20px;
      display: inline-block;
    }
    .metric-card .change.positive {
      background: #d4edda;
      color: #155724;
    }
    .metric-card .change.negative {
      background: #f8d7da;
      color: #721c24;
    }
    .metric-card .change.neutral {
      background: #e2e3e5;
      color: #383d41;
    }
    .compliance-bar {
      height: 10px;
      background: #e9ecef;
      border-radius: 5px;
      overflow: hidden;
      margin-top: 10px;
    }
    .compliance-bar .fill {
      height: 100%;
      background: #4db5ff;
      border-radius: 5px;
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 0.9rem;
    }
    .log-table th, .log-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .log-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #1d283d;
    }
    .log-table tr:hover {
      background: #f8f9fa;
    }
    .status-badge {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
    }
    .status-badge.success { background: #d4edda; color: #155724; }
    .status-badge.warning { background: #fff3cd; color: #856404; }
    .status-badge.danger { background: #f8d7da; color: #721c24; }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 0.85rem;
      color: #666;
    }
    .footer .logo {
      font-weight: 600;
      color: #1d283d;
      margin-bottom: 5px;
    }
    .disclaimer {
      background: #fff3cd;
      padding: 15px;
      margin: 20px 30px;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #856404;
    }
    @media print {
      body { background: #fff; }
      .container { box-shadow: none; }
    }
    @media (max-width: 600px) {
      .patient-info { flex-direction: column; }
      .metrics-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Freedom Protocol</h1>
      <div class="subtitle">Progress Report</div>
      <div class="date">Generated: ${reportDate}</div>
    </div>
    
    <div class="patient-info">
      <div class="item">
        <div class="label">Patient</div>
        <div class="value">${user.name}</div>
      </div>
      <div class="item">
        <div class="label">Day</div>
        <div class="value">${current_day} of 90</div>
      </div>
      <div class="item">
        <div class="label">Phase</div>
        <div class="value">${current_phase} - ${phaseName}</div>
      </div>
      <div class="item">
        <div class="label">Week</div>
        <div class="value">${current_week} of 12</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 Key Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="value">${latestMeasurement.weight || user.starting_weight || '—'}</div>
          <div class="label">Weight (kg)</div>
          <div class="change ${getChangeClass(weightChange, true)}">${formatChange(weightChange)} kg</div>
        </div>
        <div class="metric-card">
          <div class="value">${latestMeasurement.waist || user.starting_waist || '—'}</div>
          <div class="label">Waist (cm)</div>
          <div class="change ${getChangeClass(waistChange, true)}">${formatChange(waistChange)} cm</div>
        </div>
        <div class="metric-card">
          <div class="value">${latestMeasurement.glucose || user.starting_glucose || '—'}</div>
          <div class="label">Fasting Glucose (mmol/L)</div>
          <div class="change ${getChangeClass(glucoseChange, true)}">${formatChange(glucoseChange)} mmol/L</div>
        </div>
        <div class="metric-card">
          <div class="value">${avgFastingHours || '—'}</div>
          <div class="label">Avg Fasting Hours (7 days)</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>✅ Compliance (Last 7 Days)</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="value">${fastingCompliance || 0}%</div>
          <div class="label">Fasting Compliance</div>
          <div class="compliance-bar">
            <div class="fill" style="width: ${fastingCompliance || 0}%"></div>
          </div>
        </div>
        <div class="metric-card">
          <div class="value">${exerciseCompliance || 0}%</div>
          <div class="label">Exercise Compliance</div>
          <div class="compliance-bar">
            <div class="fill" style="width: ${exerciseCompliance || 0}%"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>📅 Recent Activity Log</h2>
      <table class="log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Fasting</th>
            <th>Exercise</th>
            <th>Glucose</th>
            <th>Energy</th>
          </tr>
        </thead>
        <tbody>
          ${generateLogRows(recentLogs)}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>📋 Baseline Information</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="value">${user.starting_weight || '—'}</div>
          <div class="label">Starting Weight (kg)</div>
        </div>
        <div class="metric-card">
          <div class="value">${user.starting_waist || '—'}</div>
          <div class="label">Starting Waist (cm)</div>
        </div>
        <div class="metric-card">
          <div class="value">${user.starting_glucose || '—'}</div>
          <div class="label">Starting Glucose (mmol/L)</div>
        </div>
      </div>
      <p style="margin-top: 15px; font-size: 0.9rem; color: #666;">
        <strong>Condition:</strong> ${user.diabetes_type === 'type2' ? 'Type 2 Diabetes' : user.diabetes_type === 'prediabetes' ? 'Prediabetes' : 'At Risk'}<br>
        <strong>On Medication:</strong> ${user.on_medication ? 'Yes — ' + (user.medications || 'Unspecified') : 'No'}<br>
        <strong>Protocol Start:</strong> ${user.start_date ? new Date(user.start_date).toLocaleDateString('en-GB') : 'Not started'}
      </p>
    </div>
    
    <div class="disclaimer">
      <strong>⚠️ Disclaimer:</strong> This report is generated by the Freedom Protocol app for informational purposes. 
      It is not a substitute for professional medical advice. Please consult with a healthcare provider 
      before making any changes to medication or treatment plans.
    </div>
    
    <div class="footer">
      <div class="logo">Freedom Protocol</div>
      <div>90-Day Diabetes Reversal Program</div>
      <div style="margin-top: 10px;">This report expires 72 hours after generation.</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate log table rows
 */
function generateLogRows(logs) {
  if (!logs || logs.length === 0) {
    return '<tr><td colspan="6" style="text-align: center; color: #666;">No recent logs available</td></tr>';
  }
  
  return logs.slice(0, 7).map(log => {
    const date = new Date(log.log_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fastingStatus = log.fasting_hours >= 16 ? 'success' : log.fasting_hours >= 14 ? 'warning' : 'danger';
    const exerciseStatus = log.exercised ? 'success' : 'warning';
    
    return `
      <tr>
        <td>${date}</td>
        <td>Day ${log.protocol_day || '—'}</td>
        <td><span class="status-badge ${fastingStatus}">${log.fasting_hours || '—'}h</span></td>
        <td><span class="status-badge ${exerciseStatus}">${log.exercised ? 'Yes' : 'No'}</span></td>
        <td>${log.glucose_reading || '—'}</td>
        <td>${log.energy_level ? '⭐'.repeat(log.energy_level) : '—'}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Helper: Calculate average from array of objects
 */
function calculateAverage(items, field) {
  const values = items.filter(item => item[field]).map(item => parseFloat(item[field]));
  if (values.length === 0) return null;
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

/**
 * Helper: Get CSS class for change value
 */
function getChangeClass(change, lowerIsBetter = true) {
  if (change === 'N/A' || change === null) return 'neutral';
  const num = parseFloat(change);
  if (num === 0) return 'neutral';
  if (lowerIsBetter) {
    return num < 0 ? 'positive' : 'negative';
  } else {
    return num > 0 ? 'positive' : 'negative';
  }
}

/**
 * Helper: Format change value with +/- sign
 */
function formatChange(change) {
  if (change === 'N/A' || change === null) return 'N/A';
  const num = parseFloat(change);
  if (num > 0) return `+${change}`;
  return change;
}

/**
 * Get user's caregivers
 */
async function getUserCaregivers(userId) {
  const result = await query(`
    SELECT * FROM caregivers
    WHERE user_id = $1 AND is_active = true
    ORDER BY created_at ASC
  `, [userId]);
  
  return result.rows;
}

/**
 * Add a caregiver for a user
 */
async function addCaregiver(userId, caregiverData) {
  const { phone, name, role = 'caregiver', relationship } = caregiverData;
  
  const result = await query(`
    INSERT INTO caregivers (user_id, phone, name, role, relationship)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, phone) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      relationship = EXCLUDED.relationship,
      is_active = true
    RETURNING *
  `, [userId, phone, name, role, relationship]);
  
  return result.rows[0];
}

/**
 * Remove a caregiver
 */
async function removeCaregiver(userId, caregiverId) {
  await query(`
    UPDATE caregivers SET is_active = false
    WHERE id = $1 AND user_id = $2
  `, [caregiverId, userId]);
}

/**
 * Log a report share (for audit)
 */
async function logReportShare(reportId, action, details = {}) {
  await query(`
    INSERT INTO report_audit_log (report_id, action, details)
    VALUES ($1, $2, $3)
  `, [reportId, action, JSON.stringify(details)]);
}

module.exports = {
  createReport,
  getReportByToken,
  generateReportHTML,
  getUserCaregivers,
  addCaregiver,
  removeCaregiver,
  logReportShare
};
