/**
 * Algolia Crawler → Configuration → actions → recordExtractor
 *
 * DocSearch-style hierarchy mapped to Cosy Aura markup
 * (this site has no <article> / header h1 structure).
 *
 * Recommended:
 *   pathsToMatch:
 *     - https://cosyaura.com/
 *     - https://cosyaura.com/watches/**
 *     - https://cosyaura.com/about
 *     - https://cosyaura.com/contact
 *     - https://cosyaura.com/privacy
 *     - https://cosyaura.com/sustainability
 *     - https://cosyaura.com/careers
 *   pathsToExclude:
 *     - https://cosyaura.com/admin/**
 *     - https://cosyaura.com/cart
 *     - https://cosyaura.com/checkout/**
 *     - https://cosyaura.com/account/**
 *     - https://cosyaura.com/wishlist
 *   sitemap: https://cosyaura.com/sitemap.xml
 */

recordExtractor: ({ url, $, helpers }) => {
  // Keep main content; drop cookie UI and scripts
  $('[role="dialog"], script, style, noscript').remove();

  return helpers.docsearch({
    aggregateContent: true,
    indexHeadings: true,
    recordVersion: 'v3',
    recordProps: {
      // Brand on PDPs, otherwise page H1 / site name
      lvl0: {
        selectors: [
          '[data-watch-brand]',
          'main h1',
          'head title',
        ],
        defaultValue: 'COSY AURA',
      },
      // Model name on PDPs, section titles elsewhere
      lvl1: [
        '[data-watch-model]',
        'main h1',
        'main h2',
      ],
      // Reference / secondary headings
      lvl2: [
        '[data-watch-reference]',
        'main h2',
        'main h3',
      ],
      lvl3: 'main h3, main h4',
      lvl4: 'main h5',
      lvl5: 'main h6',
      // Body copy + spec table cells (PDPs store specs in <td>)
      content: 'main p, main li, main td',
    },
  });
},
