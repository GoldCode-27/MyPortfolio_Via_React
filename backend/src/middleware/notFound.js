export function apiNotFoundHandler(_request, response) {
  response.status(404).json({ error: 'API route was not found.' })
}
