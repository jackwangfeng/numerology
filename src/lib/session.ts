import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/** 返回当前登录用户，未登录返回 null。 */
export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
