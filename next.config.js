/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value:
                            "default-src 'self'; " +
                            "base-uri 'self'; " +
                            "object-src 'none'; " +
                            "form-action 'self'; " +
                            "frame-ancestors 'self'; " +
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
                            "style-src 'self' 'unsafe-inline' https:; " +
                            "img-src 'self' data: blob: https:; " +
                            "font-src 'self' data: https:; " +
                            "connect-src 'self' https:;",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    }
                ],
            },
        ];
    },
};

module.exports = nextConfig;
