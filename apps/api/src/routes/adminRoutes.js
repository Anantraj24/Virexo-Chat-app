import express from 'express';
import { getUsers, updateUserStatus, getReports, updateReportStatus, getAuditLogs } from '../controllers/adminController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

router.get('/reports', getReports);
router.patch('/reports/:id/status', updateReportStatus);

router.get('/audit-logs', getAuditLogs);

export default router;
