module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		es2020: true,
	},
	parserOptions: {
		ecmaVersion: 2020,
		project: ["./tsconfig.json", "./tsconfig.eslint.json"],
	},
	extends: [
		// JS defaults
		"airbnb-base",
		// TS defaults
		"airbnb-typescript/base",
		// Prettier defaults
		"plugin:prettier/recommended",
		// Turns off rules that conflict with Prettier
		// This should be listed last to overwrite any earlier `extends`.
		// Note: The `rules` section will overwrite `extends`.
		// https://github.com/prettier/eslint-config-prettier
		"prettier",
	],
	plugins: ["prettier"],
	settings: {
		// https://github.com/import-js/eslint-plugin-import#resolvers
		"import/resolver": {
			// `node` must be listed first!
			node: {},
		},
	},
	ignorePatterns: [
		// Ignore generated directories
		"node_modules/",
		"dist/",

		// Don't ignore JS and TS dotfiles in this folder
		"!.*.js",
		"!.*.ts",
	],
	rules: {
		// Standard ESLint config
		indent: "off",
		quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: false }],
		camelcase: ["error", { properties: "always" }],
		"max-len": ["error", { code: 200, tabWidth: 4 }],
		"prefer-destructuring": "off",
		"no-console": "warn",
		"no-debugger": "warn",
		"no-param-reassign": ["error", { props: false }],
		"no-bitwise": "off",
		"no-shadow": "off",
		"no-use-before-define": "off",

		// TypeScript plugin config
		"@typescript-eslint/indent": "off",
		"@typescript-eslint/camelcase": "off",
		"@typescript-eslint/no-use-before-define": "off",
		"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
		"@typescript-eslint/explicit-function-return-type": "error",
		"@typescript-eslint/consistent-type-imports": "error",
		"@typescript-eslint/consistent-type-definitions": ["error", "type"],
		"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "never" }],
		"@typescript-eslint/consistent-indexed-object-style": ["error", "record"],
		"@typescript-eslint/consistent-generic-constructors": ["error", "constructor"],
		"@typescript-eslint/ban-types": ["error", { types: { null: "Use `undefined` instead." } }],

		// Import plugin config (used to intelligently validate module import statements)
		"import/prefer-default-export": "off",
		"import/no-relative-packages": "error",
		"import/order": [
			"error",
			{
				alphabetize: {
					order: "asc",
					caseInsensitive: true,
				},
				warnOnUnassignedImports: true,
			},
		],

		// Prettier plugin config (used to enforce HTML, CSS, and JS formatting styles as an ESLint plugin, where fixes are reported to ESLint to be applied when linting)
		"prettier/prettier": [
			"error",
			{
				tabWidth: 4,
				tabs: true,
				printWidth: 200,
				singleQuote: false,
			},
		],
	},
	overrides: [
		{
			files: ["*.js"],
			rules: {
				"@typescript-eslint/explicit-function-return-type": ["off"],
				"@typescript-eslint/consistent-generic-constructors": ["off"],
			},
		},
	],
};
