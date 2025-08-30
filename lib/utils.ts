import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Farcaster domain manifest for miniapp verification
export function getFarcasterDomainManifest() {
  return {
    accountAssociation: {
      header: "eyJmaWQiOjMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg0RkIzN0Q4RTMxMkE5RkVFMTEzODE3RTRCNzI2RUVBMDQxNTc0RDU4In0",
      payload: "eyJkb21haW4iOiJibGluay5hcHAifQ",
      signature: "MHhCQjQxMjk3NTFEQjVGRERGRkY0RjEwNjFCMjU5QzE2OUFDMzMyNzQwRDYxMDE5QzU5NEMyOTRDNTZEMzFDMjczRjE2NDMyMTMwRkYzNTZGNjgyNzc4NDYwMjE3RjkzRjM0MkE1QkM0OTJDQUVBOEFENEM4NDBGNkY1N0E5MzMxQzFD"
    }
  };
}

// Mini app embed metadata for social sharing
export function getMiniAppEmbedMetadata(fid: string) {
  return {
    title: `Blink - Social Predictions for @${fid}`,
    description: "Join the prediction market revolution on Farcaster",
    image: `https://blink.app/api/og?fid=${fid}`,
    "fc:frame": "vNext",
    "fc:frame:image": `https://blink.app/api/og?fid=${fid}`,
    "fc:frame:button:1": "Place Bet",
    "fc:frame:button:2": "View Profile",
    "fc:frame:post_url": `https://blink.app/api/frame/bet?fid=${fid}`
  };
}
