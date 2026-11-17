export function errorHandler(error, request, response, _next) {
  if (response.headersSent) return

  if (request.path.startsWith('/api/')) {
    const status = Number.isInteger(error.status) ? error.status : 500
    if (status >= 500) console.error('API request failed:', error)
    return response.status(status).json({
      error: status >= 500 ? 'The server could not complete the request.' : error.message,
    })
  }

  console.error('Request failed:', error)
  return response.status(500).send('Internal server error.')
}