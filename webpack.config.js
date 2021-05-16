var path = require('path');
var webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: {
        "admin/admins": path.resolve(__dirname, 'src/main/ts/admin/admins.ts'),
        "user/users": path.resolve(__dirname, 'src/main/ts/user/users.ts'),
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
