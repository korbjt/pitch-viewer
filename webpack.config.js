import ESLintPlugin from 'eslint-webpack-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: './src/js/main.ts',
    plugins: [
        new ESLintPlugin({
            configType: 'flat'
        })
    ],
    output: {
        path: __dirname + '/dist',
        filename: 'bundle.js'
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: {
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                }
            }
        }]
    }
}