const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

// Middleware to check role and set filter
function logsAccessFilter(req, res, next) {
  const user = req.user; // Assume req.user is set by auth middleware
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  req.logsFilter = {}; // Allow all users to see all logs
  next();
}

// GET /api/logs
router.get('/', logsAccessFilter, async (req, res) => {
  try {
    const { actionType, entity, jobId, candidateId, roundId, startDate, endDate } = req.query;
    const filter = { ...req.logsFilter };
    if (actionType) filter.actionType = actionType;
    if (entity) filter.entity = entity;
    if (jobId) filter.jobId = jobId;
    if (candidateId) filter.candidateId = candidateId;
    if (roundId) filter.roundId = roundId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(filter).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message, stack: err.stack });
  }
});

// GET /api/logs/export?format=csv|excel
router.get('/export', logsAccessFilter, async (req, res) => {
  try {
    const { format } = req.query;
    const logs = await ActivityLog.find(req.logsFilter).sort({ timestamp: -1 });
    if (format === 'csv') {
      const fields = ['logId','timestamp','userId','userRole','actionType','entity','entityId','description','jobId','candidateId','roundId','extraMeta'];
      const parser = new Parser({ fields });
      const csv = parser.parse(logs.map(log => log.toObject()));
      res.header('Content-Type', 'text/csv');
      res.attachment('activity_logs.csv');
      return res.send(csv);
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Activity Logs');
      worksheet.columns = [
        { header: 'Log ID', key: 'logId' },
        { header: 'Timestamp', key: 'timestamp' },
        { header: 'User ID', key: 'userId' },
        { header: 'User Role', key: 'userRole' },
        { header: 'Action Type', key: 'actionType' },
        { header: 'Entity', key: 'entity' },
        { header: 'Entity ID', key: 'entityId' },
        { header: 'Description', key: 'description' },
        { header: 'Job ID', key: 'jobId' },
        { header: 'Candidate ID', key: 'candidateId' },
        { header: 'Round ID', key: 'roundId' },
        { header: 'Extra Meta', key: 'extraMeta' },
      ];
      logs.forEach(log => {
        worksheet.addRow({ ...log.toObject(), extraMeta: JSON.stringify(log.extraMeta || {}) });
      });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('activity_logs.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ message: 'Invalid format' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to export logs', error: err.message });
  }
});

module.exports = router; 