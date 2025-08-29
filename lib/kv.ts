import { MiniAppNotificationDetails } from '@farcaster/miniapp-sdk';
import { APP_NAME } from './constants';

// Simple KV helper with fallback to in-memory map
const redis = (global as any).redis || null;
const localStore = new Map<string, any>();

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    return redis ? await redis.get<T>(key) : (localStore.get(key) as any) ?? null;
  },
  async set(key: string, value: any): Promise<void> {
    if (redis) await redis.set(key, value);
    else localStore.set(key, value);
  },
  async del(key: string): Promise<void> {
    if (redis) await redis.del(key);
    else localStore.delete(key);
  },
};

// ---- Notification helpers (keep as is) ----
function getUserNotificationDetailsKey(fid: number): string {
  return `${APP_NAME}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number
): Promise<MiniAppNotificationDetails | null> {
  const key = getUserNotificationDetailsKey(fid);
  return kv.get<MiniAppNotificationDetails>(key);
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: MiniAppNotificationDetails
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  return kv.set(key, notificationDetails);
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  return kv.del(key);
}