export function readConfig(env = process.env) {
  const port = Number(env.PORT || 4000)
  const mysqlPort = Number(env.MYSQL_PORT || 3306)
  const bootstrapAdminPassword = env.ADMIN_PASSWORD || ''
  const appOrigin = env.APP_ORIGIN || 'http://localhost:5173'
  const isProduction = env.NODE_ENV === 'production'
  const smtpHost = env.SMTP_HOST || ''
  const smtpPort = Number(env.SMTP_PORT || 587)
  const smtpUser = env.SMTP_USER || ''
  const smtpPassword = env.SMTP_PASSWORD || ''
  const contactEmailTo = env.CONTACT_EMAIL_TO || '1.workinehwor@gmail.com'

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }
  if (!Number.isInteger(mysqlPort) || mysqlPort < 1 || mysqlPort > 65535) {
    throw new Error('MYSQL_PORT must be an integer between 1 and 65535.')
  }
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535.')
  }
  const missingSettings = []
  if (!env.MYSQL_DATABASE) missingSettings.push('MYSQL_DATABASE is required')
  if (!env.MYSQL_USER) missingSettings.push('MYSQL_USER is required')
  if (missingSettings.length > 0) {
    throw new Error(
      `Backend configuration is incomplete in backend/.env: ${missingSettings.join('; ')}.`,
    )
  }

  let normalizedOrigin
  try {
    const parsedOrigin = new URL(appOrigin)
    if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
      throw new Error()
    }
    normalizedOrigin = parsedOrigin.origin
  } catch {
    throw new Error('APP_ORIGIN must be a valid HTTP or HTTPS URL.')
  }
  if (isProduction && (!env.APP_ORIGIN || normalizedOrigin.startsWith('http:'))) {
    throw new Error('Production requires APP_ORIGIN to be configured with HTTPS.')
  }
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPassword)
  if (
    [smtpHost, smtpUser, smtpPassword].some(Boolean) &&
    !smtpConfigured
  ) {
    throw new Error('Configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD together.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailTo)) {
    throw new Error('CONTACT_EMAIL_TO must be a valid email address.')
  }

  return {
    port,
    mysqlHost: env.MYSQL_HOST || 'localhost',
    mysqlPort,
    mysqlDatabase: env.MYSQL_DATABASE,
    mysqlUser: env.MYSQL_USER,
    mysqlPassword: env.MYSQL_PASSWORD || '',
    bootstrapAdminPassword,
    appOrigin: normalizedOrigin,
    isProduction,
    smtpHost,
    smtpPort,
    smtpSecure: env.SMTP_SECURE === 'true' || smtpPort === 465,
    smtpUser,
    smtpPassword,
    smtpConfigured,
    contactEmailTo,
    contactEmailFrom: env.CONTACT_EMAIL_FROM || smtpUser,
  }
}
