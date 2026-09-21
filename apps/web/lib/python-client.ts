/**
 * Server-side axios client for the Python AI service.
 * Used only in Next.js route handlers (not in browser code).
 *
 * Configure the service URL via the PYTHON_SERVICE_URL environment variable.
 * Default: http://localhost:3006
 */
import axios from 'axios';

const pythonClient = axios.create({
  baseURL: process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export default pythonClient;
