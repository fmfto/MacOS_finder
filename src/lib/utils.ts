import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UTF-8 Safe Base64 Encoder
// Compatible with server-side Buffer.from(str).toString('base64') logic for UTF-8 strings
export const toBase64 = (str: string) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('Base64 encode failed', e);
    return '';
  }
};
