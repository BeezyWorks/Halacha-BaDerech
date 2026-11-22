// iOS 27 traps at launch (___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption)
// unless the app adopts the UIScene life cycle. Expo SDK 57 ships the scene
// delegate (`EXExpoAppSceneDelegate`) but the generated project doesn't opt in,
// so this plugin does it:
//   1. Info.plist: UIApplicationSceneManifest pointing at that delegate.
//   2. AppDelegate.swift: conform to ExpoReactNativeFactoryProvider and stop
//      creating the window/starting React Native itself (the scene does it).
// Drop this once the Expo template adopts scenes by default.
const { withInfoPlist, withAppDelegate } = require('expo/config-plugins');

const withManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

const withDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: only a Swift AppDelegate is supported');
    }
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;

    const classRe = /class AppDelegate: ExpoAppDelegate \{/;
    const startRe =
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\n#endif\n/;
    if (!classRe.test(src) || !startRe.test(src)) {
      throw new Error(
        'with-scene-lifecycle: AppDelegate.swift template changed; update the plugin',
      );
    }
    src = src.replace(classRe, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    src = src.replace(startRe, '\n    // The window is created and React Native started by EXExpoAppSceneDelegate.\n');
    cfg.modResults.contents = src;
    return cfg;
  });

module.exports = (config) => withDelegate(withManifest(config));
