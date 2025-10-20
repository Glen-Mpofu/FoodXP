const { modelName } = require("expo-device");

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module:react-native-dotenv', {
      modelName: "@env",
      path: ".env"
    }],
    'react-native-reanimated/plugin', // must be last
  ],
};
