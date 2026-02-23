import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Check for pending URLs from Share Extension
        processPendingShareURLs()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Share Extension URL Processing

    private func processPendingShareURLs() {
        guard let defaults = UserDefaults(suiteName: "group.app.aovault.vault"),
              let pendingURLs = defaults.stringArray(forKey: "pendingImportURLs"),
              !pendingURLs.isEmpty else {
            return
        }

        // Clear the pending list immediately to avoid re-processing
        defaults.removeObject(forKey: "pendingImportURLs")
        defaults.synchronize()

        // Send each URL to the web app via JavaScript
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            guard let bridge = (self.window?.rootViewController as? CAPBridgeViewController)?.bridge else {
                return
            }

            for url in pendingURLs {
                let escapedURL = url.replacingOccurrences(of: "'", with: "\\'")
                let js = """
                    if (window.__aovaultShareImport) {
                        window.__aovaultShareImport('\(escapedURL)');
                    } else {
                        window.__aovaultPendingImports = window.__aovaultPendingImports || [];
                        window.__aovaultPendingImports.push('\(escapedURL)');
                    }
                """
                bridge.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }
}
