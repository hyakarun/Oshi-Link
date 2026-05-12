import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'], // APIや管理画面はクロールさせない
    },
    sitemap: 'https://oshi-link.com/sitemap.xml',
  };
}
