module.exports = function(wallaby) {
  return {
    files: ['src/**/*.ts', '!src/test/**/*.test.ts'],
    tests: ['src/test/**/*.test.ts'],
    env: {
      type: 'node',
    },
  };
};
