/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // 出力モードをスタンドアロンに設定
    output: 'standalone',
    // ホスト設定を追加
    experimental: {
      // ホスト設定を追加
      outputStandalone: true,
    },
    // API呼び出しの制限を緩和
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
  };
  
  export default nextConfig;