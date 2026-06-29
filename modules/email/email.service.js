'use strict';

const { Resend } = require('resend');
const logger = require('../../utils/logger');

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

function buildInviteHtml(inviterName, teamRole, inviteLink) {
    const roleLabel = teamRole.charAt(0).toUpperCase() + teamRole.slice(1);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You've been invited to Flayx</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2C7A7B 0%,#285E61 100%);padding:28px 36px;border-radius:10px 10px 0 0;text-align:center;">
            <p style="margin:0 0 8px 0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">&#9889; Flayx</p>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">Team Invitation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 24px 0;color:#1a202c;font-size:22px;font-weight:700;">You're invited to join a workspace</p>
            <p style="margin:0 0 20px 0;color:#4a5568;font-size:15px;line-height:1.7;">
              <strong style="color:#2d3748;">${inviterName}</strong> has invited you to join their
              <strong style="color:#2d3748;">Flayx CRM</strong> workspace as an
              <span style="display:inline-block;background:#ebf8ff;color:#2b6cb0;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;vertical-align:middle;">${roleLabel}</span>.
            </p>
            <p style="margin:0 0 32px 0;color:#718096;font-size:14px;line-height:1.6;">
              Click the button below to set up your account and get started. This invitation expires in <strong>7 days</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px auto;">
              <tr>
                <td style="background:#2C7A7B;border-radius:8px;">
                  <a href="${inviteLink}"
                     style="display:block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                    Accept Invitation &#8594;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Fallback link -->
            <p style="margin:0;color:#a0aec0;font-size:12px;text-align:center;line-height:1.8;">
              Or copy this link into your browser:<br/>
              <a href="${inviteLink}" style="color:#2C7A7B;word-break:break-all;">${inviteLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;padding:20px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="margin:0;color:#a0aec0;font-size:12px;text-align:center;line-height:1.6;">
              &copy; Flayx CRM &nbsp;&middot;&nbsp; If you did not expect this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const emailService = {
    async sendInviteEmail({ to, inviterName, teamRole, inviteLink }) {
        const resend = getClient();

        const { data, error } = await resend.emails.send({
            from:    process.env.EMAIL_FROM || 'Flayx <onboarding@resend.dev>',
            to:      [to],
            subject: `${inviterName} invited you to join their Flayx workspace`,
            text:    `Hi!\n\n${inviterName} has invited you to join their Flayx CRM workspace as a ${teamRole}.\n\nAccept your invitation here (expires in 7 days):\n${inviteLink}\n\n— Flayx CRM`,
            html:    buildInviteHtml(inviterName, teamRole, inviteLink),
        });

        if (error) {
            logger.error({ err: error.message, to }, 'Resend delivery error (invite)');
            throw new Error(error.message);
        }

        logger.info({ to, messageId: data.id }, 'Invite email sent via Resend');
        return { messageId: data.id };
    },

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

    async sendTaskReminderEmail({ to, userName, taskTitle, taskDescription, dueDate, customerName, priority }) {
        const resend = getClient();
        const dueDateStr = new Date(dueDate).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
        const priorityColor = priority === 'high' ? '#E53E3E' : priority === 'medium' ? '#DD6B20' : '#38A169';
        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Task Reminder</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#2C7A7B 0%,#285E61 100%);padding:28px 36px;border-radius:10px 10px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="color:#fff;font-size:22px;font-weight:700;">&#9889; Flayx</span></td>
              <td align="right"><span style="color:rgba(255,255,255,0.65);font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Task Reminder</span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 20px 0;color:#1a202c;font-size:20px;font-weight:700;">Hi ${userName} &#128075;</p>
            <p style="margin:0 0 20px 0;color:#4a5568;font-size:15px;line-height:1.7;">
              You have a task due in less than 24 hours:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border-left:3px solid ${priorityColor};border-radius:0 6px 6px 0;padding:20px 24px;margin-bottom:24px;">
              <tr><td>
                <p style="margin:0 0 6px 0;color:#1a202c;font-size:17px;font-weight:700;">${taskTitle}</p>
                ${taskDescription ? `<p style="margin:0 0 12px 0;color:#4a5568;font-size:14px;line-height:1.6;">${taskDescription}</p>` : ''}
                <p style="margin:0 0 4px 0;color:#718096;font-size:13px;">&#128197; Due: <strong style="color:#2d3748;">${dueDateStr}</strong></p>
                ${customerName ? `<p style="margin:0;color:#718096;font-size:13px;">&#128100; Customer: <strong style="color:#2d3748;">${customerName}</strong></p>` : ''}
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px auto;">
              <tr><td style="background:#2C7A7B;border-radius:8px;">
                <a href="${process.env.FRONTEND_URL || 'https://flayx-crm.vercel.app'}"
                   style="display:block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                  Open Flayx CRM &#8594;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:20px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="margin:0;color:#a0aec0;font-size:12px;text-align:center;">&copy; Flayx CRM &nbsp;&middot;&nbsp; Task reminder notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const { data, error } = await resend.emails.send({
            from:    process.env.EMAIL_FROM || 'Flayx <onboarding@resend.dev>',
            to:      [to],
            subject: `Reminder: "${taskTitle}" is due soon`,
            text:    `Hi ${userName},\n\nThis is a reminder that your task "${taskTitle}" is due at ${dueDateStr}.\n\n— Flayx CRM`,
            html,
        });

        if (error) {
            logger.error({ err: error.message, to }, 'Resend delivery error (task reminder)');
            throw new Error(error.message);
        }

        logger.info({ to, messageId: data.id }, 'Task reminder email sent via Resend');
        return { messageId: data.id };
    },

    // Resend is always real delivery — no test mode
    get isTestMode() { return false; },
};

module.exports = emailService;
