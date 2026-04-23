import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDb() {
  const ctx = getRequestContext();
  return (ctx.env as any).DB;
}

export function getBucket() {
  const ctx = getRequestContext();
  return (ctx.env as any).IMAGES;
}
