const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
    webpack: {
        plugins: {
            add: [new NodePolyfillPlugin()]
        },
        /*configure: {
            resolve:{
                fallback: {
                    "fs": false,
                    "path": require.resolve("path-browserify")
                }
            }
        }*/
    }
}
