// routes/notification-router.ts
import { Router } from 'express';
import { notificationController } from '../controllers/notification-controller.js';
import authenticate from '../middlewares/authenticate.js';

const router = Router();

router.use(authenticate); // 전부 로그인 필요

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getMyUnreadCount);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
