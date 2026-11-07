// Real database integration tests must never connect to the development database.
const testURL = process.env.AUTH_TEST_DATABASE_URL
if (!testURL || new URL(testURL).pathname !== '/resume_copilot_test') {
  throw new Error('API tests require AUTH_TEST_DATABASE_URL pointing at resume_copilot_test')
}

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = testURL
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.BETTER_AUTH_SECRET = 'test-only-secret-at-least-thirty-two-characters'
process.env.GOOGLE_CLIENT_ID = 'test-google-client'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret'
