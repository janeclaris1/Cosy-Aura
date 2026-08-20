/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostinger / Node hosting: self-contained server build
  output: "standalone",
  // Expose publishable key to the browser even if only STRIPE_PUBLISHABLE_KEY is set
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      "",
  },
  async redirects() {
    return [
      { source: "/watches", destination: "/fragrances", permanent: true },
      {
        source: "/watches/:path*",
        destination: "/fragrances/:path*",
        permanent: true,
      },
      { source: "/admin/watches", destination: "/admin/fragrances", permanent: true },
      {
        source: "/admin/watches/:path*",
        destination: "/admin/fragrances/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "www.watchfinder.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Keep native DB drivers out of the Next webpack bundle
  experimental: {
    serverComponentsExternalPackages: [
      "pg",
      "@prisma/adapter-pg",
      "@neondatabase/serverless",
      "ws",
    ],
  },
};

export default nextConfig;
