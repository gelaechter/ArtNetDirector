var path = require('path');
var webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: {
        "admin/admin_script": path.resolve(__dirname, 'src/main/ts/admin/admin_script.ts'),
        "user/user_script": path.resolve(__dirname, 'src/main/ts/user/user_script.ts'),
        "fallback/utils": path.resolve(__dirname, 'src/main/ts/lib/utils.ts')
    },
    output: {
        path: path.resolve(__dirname, 'src/main/resources/web'),
        filename: '[name].js'
    },
    module: {
        rules: [{
                test: /\.css$/,
                use: 'css-loader'
            },
            {
                test: /\.ts$/,
                use: 'ts-loader'
            }
        ],
    },
    watch: true
};
