/**
 * Slack Notifications Test Routes
 * Endpoints for testing Slack integration and sending test notifications
 */

const express = require('express');
const slackService = require('../services/slackService');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/slack/test:
 *   post:
 *     summary: Test Slack integration
 *     description: Send a test notification to Slack
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Test notification sent
 *       500:
 *         description: Failed to send notification
 */
router.post('/test', async (req, res) => {
  try {
    const result = await slackService.test();

    if (result.success) {
      logger.info('Slack test notification sent successfully', {
        type: 'slack',
        action: 'test_success',
        userId: req.user?.id
      });

      res.json({
        success: true,
        message: 'Test notification sent successfully'
      });
    } else {
      logger.error('Failed to send Slack test notification', {
        type: 'slack',
        action: 'test_failed',
        error: result.error
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error in Slack test endpoint', {
      type: 'slack',
      action: 'test_error',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/slack/alert:
 *   post:
 *     summary: Send custom alert to Slack
 *     description: Send a custom alert notification to Slack
 *     tags: [Slack]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Alert title
 *               message:
 *                 type: string
 *                 description: Alert message
 *               severity:
 *                 type: string
 *                 enum: [critical, warning, info, success]
 *                 default: info
 *               color:
 *                 type: string
 *                 description: Hex color code
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     value:
 *                       type: string
 *               channel:
 *                 type: string
 *                 description: Slack channel
 *     responses:
 *       200:
 *         description: Alert sent successfully
 *       500:
 *         description: Failed to send alert
 */
router.post(
  '/alert',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, message, severity, color, fields, channel } = req.body;

      const result = await slackService.sendCustom({
        title,
        message,
        severity,
        color,
        fields,
        channel
      });

      if (result.success) {
        logger.info('Custom Slack alert sent', {
          type: 'slack',
          action: 'send_custom_alert',
          title,
          severity,
          userId: req.user?.id
        });

        res.json({
          success: true,
          message: 'Alert sent successfully'
        });
      } else {
        logger.error('Failed to send custom Slack alert', {
          type: 'slack',
          action: 'send_custom_alert_failed',
          title,
          error: result.error
        });

        res.status(500).json({
          success: false,
          message: 'Failed to send alert',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in Slack alert endpoint', {
        type: 'slack',
        action: 'alert_error',
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/slack/security:
 *   post:
 *     summary: Send security alert
 *     description: Send a security-related alert to Slack
 *     tags: [Slack]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 description: Security event type
 *               description:
 *                 type: string
 *                 description: Event description
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               source:
 *                 type: string
 *                 description: Event source
 *               userId:
 *                 type: string
 *                 description: User ID (if applicable)
 *               ip:
 *                 type: string
 *                 description: IP address (if applicable)
 *               additionalInfo:
 *                 type: object
 *                 description: Additional information
 *     responses:
 *       200:
 *         description: Security alert sent
 *       500:
 *         description: Failed to send alert
 */
router.post(
  '/security',
  [
    body('event').notEmpty().withMessage('Event is required'),
    body('description').notEmpty().withMessage('Description is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { event, description, severity, source, userId, ip, additionalInfo } = req.body;

      const result = await slackService.sendSecurityAlert({
        event,
        description,
        severity,
        source,
        userId,
        ip,
        additionalInfo
      });

      if (result.success) {
        logger.info('Security alert sent to Slack', {
          type: 'slack',
          action: 'send_security_alert',
          event,
          severity,
          userId: req.user?.id
        });

        res.json({
          success: true,
          message: 'Security alert sent successfully'
        });
      } else {
        logger.error('Failed to send security alert', {
          type: 'slack',
          action: 'send_security_alert_failed',
          event,
          error: result.error
        });

        res.status(500).json({
          success: false,
          message: 'Failed to send security alert',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in Slack security endpoint', {
        type: 'slack',
        action: 'security_error',
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/slack/business:
 *   post:
 *     summary: Send business alert
 *     description: Send a business-related alert to Slack
 *     tags: [Slack]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 description: Business event type
 *               description:
 *                 type: string
 *                 description: Event description
 *               metric:
 *                 type: string
 *                 description: Metric name
 *               value:
 *                 type: number
 *                 description: Metric value
 *               threshold:
 *                 type: number
 *                 description: Threshold value
 *               trend:
 *                 type: string
 *                 description: Trend direction
 *               url:
 *                 type: string
 *                 description: Dashboard URL
 *     responses:
 *       200:
 *         description: Business alert sent
 *       500:
 *         description: Failed to send alert
 */
router.post(
  '/business',
  [
    body('event').notEmpty().withMessage('Event is required'),
    body('description').notEmpty().withMessage('Description is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { event, description, metric, value, threshold, trend, url } = req.body;

      const result = await slackService.sendBusinessAlert({
        event,
        description,
        metric,
        value,
        threshold,
        trend,
        url
      });

      if (result.success) {
        logger.info('Business alert sent to Slack', {
          type: 'slack',
          action: 'send_business_alert',
          event,
          userId: req.user?.id
        });

        res.json({
          success: true,
          message: 'Business alert sent successfully'
        });
      } else {
        logger.error('Failed to send business alert', {
          type: 'slack',
          action: 'send_business_alert_failed',
          event,
          error: result.error
        });

        res.status(500).json({
          success: false,
          message: 'Failed to send business alert',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in Slack business endpoint', {
        type: 'slack',
        action: 'business_error',
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/slack/system:
 *   post:
 *     summary: Send system alert
 *     description: Send a system-related alert to Slack
 *     tags: [Slack]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               component:
 *                 type: string
 *                 description: System component name
 *               status:
 *                 type: string
 *                 enum: [up, down, degraded, critical]
 *                 description: Component status
 *               message:
 *                 type: string
 *                 description: Status message
 *               metrics:
 *                 type: object
 *                 description: Additional metrics
 *               url:
 *                 type: string
 *                 description: Dashboard URL
 *     responses:
 *       200:
 *         description: System alert sent
 *       500:
 *         description: Failed to send alert
 */
router.post(
  '/system',
  [
    body('component').notEmpty().withMessage('Component is required'),
    body('status').notEmpty().withMessage('Status is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { component, status, message, metrics, url } = req.body;

      const result = await slackService.sendSystemAlert({
        component,
        status,
        message,
        metrics,
        url
      });

      if (result.success) {
        logger.info('System alert sent to Slack', {
          type: 'slack',
          action: 'send_system_alert',
          component,
          status,
          userId: req.user?.id
        });

        res.json({
          success: true,
          message: 'System alert sent successfully'
        });
      } else {
        logger.error('Failed to send system alert', {
          type: 'slack',
          action: 'send_system_alert_failed',
          component,
          error: result.error
        });

        res.status(500).json({
          success: false,
          message: 'Failed to send system alert',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error in Slack system endpoint', {
        type: 'slack',
        action: 'system_error',
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/slack/status:
 *   get:
 *     summary: Get Slack service status
 *     description: Check if Slack integration is configured and working
 *     tags: [Slack]
 *     responses:
 *       200:
 *         description: Service status
 */
router.get('/status', (req, res) => {
  try {
    const status = slackService.getStatus();

    logger.info('Slack status checked', {
      type: 'slack',
      action: 'status_check',
      enabled: status.enabled
    });

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting Slack status', {
      type: 'slack',
      action: 'status_error',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: error.message
    });
  }
});

module.exports = router;
