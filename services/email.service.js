'use strict';

const { Resend } = require('resend');
const logger = require('../utils/logger');

let _resend = null;

function getClient() {
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

function buildHtml(campaignName, customerName, message, logId, unsubscribeUrl) {
    const safeMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

    const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const trackingPixel = logId
        ? `<img src="${BASE_URL}/api/email/track/${logId}" width="1" height="1" alt="" style="display:block;border:0;" />`
        : '';

    const unsubLink = unsubscribeUrl || '#';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${campaignName}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Brand header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2C7A7B 0%,#285E61 100%);padding:28px 36px;border-radius:10px 10px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                    &#9889; Flayx
                  </span>
                </td>
                <td align="right">
                  <span style="color:rgba(255,255,255,0.65);font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">
                    Campaign Message
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 8px 0;color:#718096;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">
              Personal message
            </p>
            <p style="margin:0 0 20px 0;color:#1a202c;font-size:20px;font-weight:700;">
              Hi ${customerName} &#128075;
            </p>
            <div style="background:#f7fafc;border-left:3px solid #2C7A7B;padding:20px 24px;border-radius:0 6px 6px 0;margin-bottom:28px;">
              <p style="margin:0;color:#2d3748;font-size:15px;line-height:1.75;">${safeMessage}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
                  <p style="margin:0;color:#718096;font-size:13px;">
                    This message was sent as part of the
                    <strong style="color:#2d3748;">${campaignName}</strong> campaign.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;padding:20px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="margin:0;color:#a0aec0;font-size:12px;text-align:center;line-height:1.6;">
              &copy; Flayx CRM &nbsp;&middot;&nbsp; You're receiving this as a valued customer.<br/>
              <a href="${unsubLink}" style="color:#2C7A7B;text-decoration:none;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
  ${trackingPixel}
</body>
</html>`;
}

const emailService = {
    async sendCampaignEmail({ to, customerName, campaignName, message, logId, unsubscribeUrl }) {
        const resend = getClient();

        const { data, error } = await resend.emails.send({
            from:    process.env.EMAIL_FROM || 'Flayx <onboarding@resend.dev>',
            to:      [to],
            subject: `${campaignName} — a message just for you`,
            text:    `Hi ${customerName},\n\n${message}\n\n— Flayx CRM`,
            html:    buildHtml(campaignName, customerName, message, logId, unsubscribeUrl),
        });

        if (error) {
            logger.error({ err: error.message, to }, 'Resend delivery error');
            throw new Error(error.message);
        }

        logger.info({ to, messageId: data.id }, 'Email sent via Resend');
        return { messageId: data.id, previewUrl: null };
    },

    // Resend is always real delivery — no test mode
    get isTestMode() { return false; },
};

module.exports = emailService;
