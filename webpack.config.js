import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
// console.log('webpack.config.js');
// console.log(process.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);  
 

export default (env, argv) => {
  console.log('Env:', env);   // Custom environment variables passed with --env
  console.log('Argv:', argv); // Built-in Webpack flags like --mode
  const mode = argv.mode || 'development'; // Default to development mode
  return {
    entry: {
      popup: './client/components/App_Index.js', 
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: [
            'thread-loader', // This runs the loaders in parallel
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.txt$/,
          use: 'raw-loader',
        },
        {
          test: /\.(png|jpe?g|gif|ico)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[path][name].[ext]',
                outputPath: 'images/',
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
            to: path.resolve(__dirname, 'dist')
          }
        ]
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, './client/components/app/content_popup.js'),
            to: path.resolve(__dirname, 'dist')
          }
        ]
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        templateContent: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <!-- easyjobapps.ico -->
              <link rel="icon" type="image/x-icon" href="./easyjobapps.ico">
              <title>Easy Job Apps</title>
              <script src='content_popup.js'></script>
              <meta title="Easy Job Apps" />
          </head>
          <body>
              <div id="root"></div>
          </body>
          </html>
        `,
      }),  
      new webpack.DefinePlugin({
        process: { 
          env: {
            WEBPACK_ENV: JSON.stringify(mode)
          } 
        } 
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /server\/index_middleware\.js$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /server\/misc\.js$/, 
      }),   
    ],
    devtool: 'source-map',  // Enable source maps for better debugging
    devServer: { 
      watchFiles: ['client/**/*'],
      static: { 
        directory: './',
        watch: false
      }, 
      compress: true,
      port: 3001,
      hot: true,
      proxy: [
        {
          context: ['/login', '/'],
          target: 'http://localhost:3002',
          changeOrigin: true,
          pathRewrite: { '^/': '' },
        },
      ],
      devMiddleware: {
        writeToDisk: true, // This ensures assets are written to disk
      },
    },
    cache: false,
    optimization: {
      splitChunks: false,  // Disable code splitting
      runtimeChunk: false,  // Ensure a single output file
    }, 
  }
};
