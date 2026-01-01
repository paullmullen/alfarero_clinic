
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  babel: {
    plugins: [
      ["import", { libraryName: "antd", libraryDirectory: "es", style: true }, "antd"],
    ],
  },
  webpack: {
    configure: (config) => {
      if (process.env.ANALYZE === 'true') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: true,
            reportFilename: 'bundle-report.html',
          })
        );
      }
      return config;
    },
  },
};
