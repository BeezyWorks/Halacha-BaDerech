/** Unit tests for pure logic (text shaping, calendar, parsers). */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/packages/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // @hebcal/core ships ESM only (the design system's Hebrew date uses it); point at the ESM entry.
    '^@hebcal/core$': '<rootDir>/node_modules/@hebcal/core/dist/esm/index.js',
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|@hebcal|quick-lru|temporal-[a-z-]+|lucide-react-native))',
  ],
}
