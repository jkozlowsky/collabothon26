// `react-native-reanimated` in tests. A separate file from the mock itself, because
// expo-router/testing-library mocks this module with `require('react-native-reanimated/mock')`,
// and mapping both names to one file would make that require circular.
module.exports = require('./reanimated');
