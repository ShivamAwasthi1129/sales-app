/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack, isServer }) => {
    // Ignore optional dependency @yaacovcr/transform for Apollo Server
    // This is an optional dependency for incremental delivery features
    // that requires GraphQL 17, but we're using GraphQL 16
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@yaacovcr\/transform$/,
      })
    );
    
    // Also configure resolve to ignore it
    config.resolve.alias = {
      ...config.resolve.alias,
      '@yaacovcr/transform': false,
    };
    
    return config;
  },
};

export default nextConfig;
