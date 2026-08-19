import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human-readable message from a caught value without assuming
 * it's an `Error` instance — Supabase/Postgrest errors always are in
 * practice, but duck-typing here is cheap insurance against ever silently
 * swallowing the real reason behind a generic fallback string.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  console.error(err)
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return fallback
}
