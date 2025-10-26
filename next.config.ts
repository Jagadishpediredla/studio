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
    // Expose the compilation URL to the server-side
    COMPILATION_API_URL: process.env.COMPILATION_API_URL,
    COMPILATION_API_KEY: process.env.COMPILATION_API_KEY,
    // Expose the compilation URL to the client-side
    NEXT_PUBLIC_COMPILATION_API_URL: process.env.COMPILATION_API_URL,
  },
};

export default nextConfig;
