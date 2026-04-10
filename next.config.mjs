/** @type {import('next').NextConfig} */
let supabaseHost = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  }
} catch {
  supabaseHost = null;
}

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Report-only para não quebrar integrações/inline scripts agora.
          // Quando estabilizar, dá para migrar para CSP "enforced" com nonce/hash.
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
              "img-src 'self' data: https:; font-src 'self' data: https:; " +
              "style-src 'self' 'unsafe-inline' https:; " +
              // Next em dev usa eval; em prod não deveria precisar, mas manter em report-only evita bloqueio.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
              "connect-src 'self' https: wss:;",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/calculadora-local",
        destination: "/calculadoras/custo",
        permanent: true,
      },
      {
        source: "/calculator",
        destination: "/calculadoras/custo",
        permanent: false,
      },
      {
        source: "/margem-certa",
        destination: "/calculadoras/custo",
        permanent: false,
      },
    ];
  },
  // typedRoutes desativado para evitar erro de tipo em Link (href string) no build.
  // typedRoutes: true,
  ...(supabaseHost
    ? {
        images: {
          remotePatterns: [
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        },
      }
    : {}),
};

export default nextConfig;

