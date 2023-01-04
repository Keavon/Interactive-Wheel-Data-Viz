const path = require("path");

module.exports = {
	entry: "./src/main.ts",
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist"),
		clean: true,
	},
	devServer: {
		hot: true,
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: ["ts-loader"],
				exclude: /node_modules/,
			},
			{
				test: /\.s[ac]ss$/i,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: "asset/resource",
			},
		],
	},
	resolve: {
		extensions: [".js", ".ts"],
		alias: {
			"@": path.resolve(__dirname, "src/"),
		},
	},
	mode: "development",
	devtool: "inline-source-map",
	watchOptions: {
		ignored: /node_modules/,
	},
};
