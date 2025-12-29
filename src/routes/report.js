/**
 * Report Routes
 * 
 * Handles viewing of shared reports
 */

const express = require('express');
const router = express.Router();
const { getReportByToken, logReportShare } = require('../services/report');

/**
 * GET /report/:token
 * 
 * View a shared report (for caregivers/doctors)
 */
router.get('/report/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const report = await getReportByToken(token);
    
    if (!report) {
      return res.status(404).send(getErrorPage('Report Not Found', 
        'This report does not exist or the link is invalid.'));
    }
    
    if (report.expired) {
      return res.status(410).send(getErrorPage('Report Expired', 
        'This report link has expired. Please ask the patient to generate a new report.'));
    }
    
    // Log the view
    await logReportShare(report.id, 'viewed', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Return the report HTML
    res.send(report.report_content);
    
  } catch (error) {
    console.error('Report view error:', error);
    res.status(500).send(getErrorPage('Error', 
      'Could not load the report. Please try again later.'));
  }
});

/**
 * Generate error page HTML
 */
function getErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Freedom Protocol</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1d283d;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 60px;
      margin-bottom: 20px;
    }
    h1 { margin-bottom: 15px; }
    p { opacity: 0.9; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
}

module.exports = router;
