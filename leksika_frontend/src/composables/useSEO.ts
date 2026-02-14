import { useHead } from '@vueuse/head';
import { computed, unref, type MaybeRef } from 'vue';

/**
 * Composable untuk mengelola SEO meta tags
 */
export interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

export function useSEO(options: MaybeRef<SEOOptions>) {
  const headConfig = computed(() => {
    const opts = unref(options);
    const {
      title,
      description,
      image = 'https://leksika.id/og-image.avif',
      url,
      type = 'website',
      jsonLd,
    } = opts;

    const fullTitle = title
      ? `${title} | Leksika`
      : 'Leksika - Platform Pembelajaran Bahasa';

    const meta: any[] = [
      { name: 'description', content: description },
      // Open Graph
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:type', content: type },
      // Twitter
      { property: 'twitter:title', content: fullTitle },
      { property: 'twitter:description', content: description },
      { property: 'twitter:image', content: image },
    ];

    if (url) {
      meta.push({ property: 'og:url', content: url });
      meta.push({ property: 'twitter:url', content: url });
    }

    const config: any = {
      title: fullTitle,
      meta,
    };

    // Add canonical link if URL provided
    if (url) {
      config.link = [{ rel: 'canonical', href: url }];
    }

    // Add JSON-LD structured data if provided
    if (jsonLd) {
      config.script = [
        {
          type: 'application/ld+json',
          children: JSON.stringify(jsonLd),
        },
      ];
    }

    return config;
  });

  useHead(headConfig);
}

/**
 * Generate Organization JSON-LD schema
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Leksika',
    url: 'https://leksika.id',
    logo: 'https://leksika.id/Leksika_icon.svg',
    description:
      'Platform pembelajaran bahasa yang membantu Anda mempelajari kosakata, tata bahasa, dan percakapan.',
    sameAs: [],
  };
}

/**
 * Generate FAQPage JSON-LD schema
 * @param {Array} faqs - Array of {question, answer} objects
 */
export function getFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Article JSON-LD schema
 * @param {Object} article - Article data
 */
export function getArticleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.image || 'https://leksika.id/og-image.png',
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Leksika',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Leksika',
      logo: {
        '@type': 'ImageObject',
        url: 'https://leksika.id/Leksika_icon.svg',
      },
    },
  };
}
