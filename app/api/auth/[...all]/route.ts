import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// This file defines the API routes for authentication using better-auth for the path /api/auth/*
export const { GET, POST } = toNextJsHandler(auth);
