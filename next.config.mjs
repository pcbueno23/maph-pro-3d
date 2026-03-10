/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes desativado para evitar erro de tipo em Link (href string) no build.
  // typedRoutes: true,
};

export default nextConfig;

