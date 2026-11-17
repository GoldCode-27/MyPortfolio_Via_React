import nodemailer from 'nodemailer'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

export function createEmailService(config, transport = null) {
  const transporter =
    transport ||
    (config.smtpConfigured
      ? nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPassword,
          },
        })
      : null)

  async function sendContactNotification(submission) {
    if (!transporter) return { status: 'not_configured', error: null }

    try {
      const name = escapeHtml(submission.name)
      const email = escapeHtml(submission.email)
      const subject = escapeHtml(submission.subject)
      const message = escapeHtml(submission.message)
      await transporter.sendMail({
        from: config.contactEmailFrom,
        to: config.contactEmailTo,
        replyTo: submission.email,
        subject: `Portfolio inquiry: ${submission.subject}`,
        text: [
          `Name: ${submission.name}`,
          `Email: ${submission.email}`,
          `Subject: ${submission.subject}`,
          '',
          submission.message,
        ].join('\n'),
        html: `<h2>New portfolio inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\r?\n/g, '<br>')}</p>`,
      })
      return { status: 'sent', error: null }
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed.',
      }
    }
  }

  return { sendContactNotification }
}
