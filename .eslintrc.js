const defaultEslintrc = require('10up-toolkit/config/.eslintrc');

module.exports = {
	...defaultEslintrc,
	extends: '@10up/eslint-config',
	plugins: ['react'],
	globals: {
		wp: true,
		jQuery: true,
	},
	rules: {
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',
		'no-console': [1],
		'no-alert': [1],
		camelcase: [1],
		'no-debugger': [1],
		'no-unused-vars': [1],
		'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
		'no-plusplus': [0],
		'import/prefer-default-export': [0],
		'no-lonely-if': [0],
		'func-names': [0],
	},
	env: {
		browser: true,
	},
};
