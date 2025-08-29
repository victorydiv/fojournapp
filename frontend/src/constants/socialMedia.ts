// Social Media Links Configuration
export const SOCIAL_MEDIA_LINKS = {
  facebook: 'https://www.facebook.com/profile.php?id=61579768918228',
  linkedin: 'https://www.linkedin.com/company/fojourn',
  // Add more platforms as needed
  // twitter: 'https://twitter.com/fojourn',
  // instagram: 'https://www.instagram.com/fojourn',
} as const;

export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_LINKS;
