import type { IncomingMessage, ServerResponse } from 'node:http'

export const COOKIE: string
export function loadKey(file?: string): string
export function mediaKey(key: string): string
export function judge(
  req: { url?: string; method?: string; headers: Record<string, unknown> },
  key: string,
  opts?: { upgrade?: boolean },
): { allow: boolean; grant?: boolean }
export function gateMiddleware(
  key: string,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void
export function lanAddresses(): string[]
