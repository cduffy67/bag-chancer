// Lightweight profile: an optional user-uploadable avatar stored locally.

import { dbClearAvatar, dbGetAvatar, dbSetAvatar } from "./db";

export const PROFILE_EVENT = "bag-chancer:profile";

export type Profile = {
  // Optional display name used sparingly in verdict copy ("{name}, you're grand.").
  name?: string;
  avatarDataUrl?: string;
};

export async function loadProfile(): Promise<Profile> {
  const avatarDataUrl = await dbGetAvatar();
  return { avatarDataUrl };
}

export async function saveAvatar(dataUrl: string): Promise<void> {
  await dbSetAvatar(dataUrl);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }
}

export async function clearAvatar(): Promise<void> {
  await dbClearAvatar();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }
}
