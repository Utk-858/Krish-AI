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
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
   devIndicators: {
    buildActivity: true
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  allowedDevOrigins: [
      "https://6000-firebase-studio-1753306794836.cluster-73qgvk7hjjadkrjeyexca5ivva.cloudworkstations.dev",
  ]
};

export default nextConfig;
