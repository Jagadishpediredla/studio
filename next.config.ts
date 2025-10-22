import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    COMPILATION_API_URL: process.env.COMPILATION_API_URL,
    COMPILATION_API_KEY: process.env.COMPILATION_API_KEY,
    // NEXT_PUBLIC_ variables are exposed to the browser
    NEXT_PUBLIC_COMPILATION_API_URL: process.env.COMPILATION_API_URL,
    NEXT_PUBLIC_COMPILATION_API_KEY: process.env.COMPILATION_API_KEY,
  },
};

export default nextConfig;
