/**
 * Slack Notification Service
 * Handles sending alerts and notifications to Slack channels
 */

const axios = require('axios');
const logger = require('../utils/logger');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      logger.warn('Slack notifications disabled - no webhook URL configured', {
        type: 'slack',
        action: 'init'
      });
    } else {
      logger.info('Slack notifications enabled', {
        type: 'slack',
        action: 'init'
      });
    }
  }

  /**
   * Send a message to Slack
   * @param {string} text - The message text
   * @param {object} options - Additional options
   */
  async sendMessage(text, options = {}) {
    if (!this.enabled) {
      logger.warn('Attempted to send Slack message but service is disabled', {
        type: 'slack',
        action: 'send_message_disabled'
      });
      return { success: false, error: 'Slack service disabled' };
    }

    try {
      const payload = {
        text,
        ...options
      };

      logger.debug('Sending Slack message', {
        type: 'slack',
        action: 'send_message',
        text: text.substring(0, 100),
        channel: options.channel || 'default'
      });

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      logger.info('Slack message sent successfully', {
        type: 'slack',
        action: 'send_message_success',
        status: response.status
      });

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send Slack message', {
        type: 'slack',
        action: 'send_message_error',
        error: error.message,
        stack: error.stack
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send an alert with rich formatting
   */
  async sendAlert(alert) {
    const {
      title,
      message,
      severity = 'info',
      color = '#36a64f',
      fields = [],
      channel,
      timestamp = new Date()
    } = alert;

    const severityConfig = {
      critical: { color: '#ff0000', emoji: '🚨', channel: '#alerts-critical' },
      warning: { color: '#ffff00', emoji: '⚠️', channel: '#alerts-warning' },
      info: { color: '#36a64f', emoji: 'ℹ️', channel: '#alerts' },
      success: { color: '#36a64f', emoji: '✅', channel: '#alerts' }
    };

    const config = severityConfig[severity] || severityConfig.info;
    const targetChannel = channel || config.channel;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${config.emoji} ${title}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ];

    // Add fields if provided
    if (fields && fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: fields.map(field => ({
          type: 'mrkdwn',
          text: `*${field.title}:*\n${field.value}`
        }))
      });
    }

    // Add timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Time:* ${timestamp.toISOString()}`
        }
      ]
    });

    return this.sendMessage('', {
      channel: targetChannel,
      attachments: [
        {
          color: color || config.color,
          blocks
        }
      ]
    });
  }

  /**
   * Send a security alert
   */
  async sendSecurityAlert(data) {
    const {
      event,
      description,
      severity = 'high',
      source,
      userId,
      ip,
      additionalInfo = {}
    } = data;

    const fields = [
      {
        title: 'Event',
        value: event
      },
      {
        title: 'Severity',
        value: severity.toUpperCase()
      }
    ];

    if (userId) {
      fields.push({
        title: 'User ID',
        value: userId
      });
    }

    if (source) {
      fields.push({
        title: 'Source',
        value: source
      });
    }

    if (ip) {
      fields.push({
        title: 'IP Address',
        value: ip
      });
    }

    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      fields.push({
        title: 'Additional Info',
        value: JSON.stringify(additionalInfo, null, 2)
      });
    }

    return this.sendAlert({
      title: 'Security Alert',
      message: description,
      severity: severity === 'critical' ? 'critical' : 'warning',
      color: '#ff0000',
      fields,
      channel: '#security'
    });
  }

  /**
   * Send a business alert
   */
  async sendBusinessAlert(data) {
    const {
      event,
      description,
      metric,
      value,
      threshold,
      trend,
      url
    } = data;

    const fields = [
      {
        title: 'Event',
        value: event
      }
    ];

    if (metric) {
      fields.push({
        title: 'Metric',
        value: metric
      });
    }

    if (value !== undefined) {
      fields.push({
        title: 'Value',
        value: value.toString()
      });
    }

    if (threshold !== undefined) {
      fields.push({
        title: 'Threshold',
        value: threshold.toString()
      });
    }

    if (trend) {
      fields.push({
        title: 'Trend',
        value: trend
      });
    }

    if (url) {
      fields.push({
        title: 'Dashboard',
        value: url
      });
    }

    return this.sendAlert({
      title: 'Business Alert',
      message: description,
      severity: 'info',
      color: '#36a64f',
      fields,
      channel: '#product'
    });
  }

  /**
   * Send a system alert
   */
  async sendSystemAlert(data) {
    const {
      component,
      status,
      message,
      metrics = {},
      url
    } = data;

    const fields = [
      {
        title: 'Component',
        value: component
      },
      {
        title: 'Status',
        value: status
      },
      {
        title: 'Message',
        value: message
      }
    ];

    // Add metrics
    if (Object.keys(metrics).length > 0) {
      fields.push({
        title: 'Metrics',
        value: Object.entries(metrics)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      });
    }

    if (url) {
      fields.push({
        title: 'Dashboard',
        value: url
      });
    }

    const severity = status === 'down' || status === 'critical' ? 'critical' : 'warning';

    return this.sendAlert({
      title: 'System Alert',
      message: `Component: *${component}*`,
      severity,
      color: status === 'down' || status === 'critical' ? '#ff0000' : '#ffff00',
      fields,
      channel: '#devops'
    });
  }

  /**
   * Send a performance alert
   */
  async sendPerformanceAlert(data) {
    const {
      operation,
      duration,
      threshold,
      percentiles = {},
      url
    } = data;

    const fields = [
      {
        title: 'Operation',
        value: operation
      },
      {
        title: 'Duration',
        value: `${duration}ms`
      },
      {
        title: 'Threshold',
        value: `${threshold}ms`
      }
    ];

    // Add percentiles
    if (Object.keys(percentiles).length > 0) {
      fields.push({
        title: 'Percentiles',
        value: Object.entries(percentiles)
          .map(([p, value]) => `P${p}: ${value}ms`)
          .join('\n')
      });
    }

    if (url) {
      fields.push({
        title: 'Dashboard',
        value: url
      });
    }

    const severity = duration > threshold * 1.5 ? 'critical' : 'warning';

    return this.sendAlert({
      title: 'Performance Alert',
      message: `Operation *${operation}* is taking too long`,
      severity,
      fields,
      channel: '#devops'
    });
  }

  /**
   * Send deployment notification
   */
  async sendDeploymentNotification(data) {
    const {
      environment,
      version,
      author,
      commit,
      url
    } = data;

    const fields = [
      {
        title: 'Environment',
        value: environment
      },
      {
        title: 'Version',
        value: version
      },
      {
        title: 'Author',
        value: author
      }
    ];

    if (commit) {
      fields.push({
        title: 'Commit',
        value: commit
      });
    }

    if (url) {
      fields.push({
        title: 'Deployment URL',
        value: url
      });
    }

    return this.sendAlert({
      title: 'Deployment Successful',
      message: `New version *${version}* deployed to *${environment}*`,
      severity: 'success',
      color: '#36a64f',
      fields,
      channel: '#deployments'
    });
  }

  /**
   * Send custom notification
   */
  async sendCustom(data) {
    const {
      title,
      message,
      color,
      fields,
      channel,
      severity = 'info'
    } = data;

    return this.sendAlert({
      title,
      message,
      color,
      fields,
      channel,
      severity
    });
  }

  /**
   * Test Slack integration
   */
  async test() {
    logger.info('Testing Slack integration', {
      type: 'slack',
      action: 'test'
    });

    return this.sendAlert({
      title: 'Test Notification',
      message: 'This is a test message from Steam Marketplace monitoring system',
      severity: 'success',
      color: '#36a64f',
      fields: [
        {
          title: 'Status',
          value: '✅ All systems operational'
        },
        {
          title: 'Time',
          value: new Date().toISOString()
        }
      ]
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      webhookConfigured: !!this.webhookUrl,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const slackService = new SlackService();

module.exports = slackService;
