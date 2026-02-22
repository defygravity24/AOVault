# iOS Share Extension for AO Vault

## 🎯 What This Does

Adds "Save to AO Vault" directly to the iOS share menu when viewing AO3 fanfiction, allowing one-tap saving without copying URLs!

## 📱 How It Works

When users are on archiveofourown.org in Safari (or any browser):
1. Tap the Share button
2. See "Save to AO Vault" in the share menu
3. Tap it to instantly save the fanfic to their library
4. Optional: Add tags/notes before saving
5. Done! No URL copying needed

## 🛠️ Implementation in Xcode

### Step 1: Add Share Extension Target

1. In Xcode, go to File → New → Target
2. Choose "Share Extension"
3. Name it "SaveToAOVault"
4. Bundle ID: `com.aovault.app.share-extension`

### Step 2: Configure Info.plist

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>NSExtensionActivationRule</key>
        <dict>
            <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
            <integer>1</integer>
        </dict>
        <key>NSExtensionActivationDomain</key>
        <array>
            <string>archiveofourown.org</string>
            <string>www.archiveofourown.org</string>
        </array>
    </dict>
    <key>NSExtensionMainStoryboard</key>
    <string>MainInterface</string>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
</dict>
```

### Step 3: Share Extension Code

Create `ShareViewController.swift`:

```swift
import UIKit
import Social
import MobileCoreServices

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractURL()
    }

    private func setupUI() {
        view.backgroundColor = UIColor(named: "AOVaultBackground")

        // Add AO Vault branding
        let logoImageView = UIImageView(image: UIImage(named: "AOVaultIcon"))
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logoImageView)

        // Add "Saving to AO Vault..." label
        let label = UILabel()
        label.text = "Saving to AO Vault..."
        label.textColor = .white
        label.font = .systemFont(ofSize: 18, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        // Add loading indicator
        let activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.color = .white
        activityIndicator.startAnimating()
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(activityIndicator)

        // Layout constraints
        NSLayoutConstraint.activate([
            logoImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),
            logoImageView.widthAnchor.constraint(equalToConstant: 80),
            logoImageView.heightAnchor.constraint(equalToConstant: 80),

            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.topAnchor.constraint(equalTo: logoImageView.bottomAnchor, constant: 20),

            activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            activityIndicator.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 20)
        ])
    }

    private func extractURL() {
        let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem
        let itemProvider = extensionItem?.attachments?.first

        if itemProvider?.hasItemConformingToTypeIdentifier(kUTTypeURL as String) == true {
            itemProvider?.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.saveFanfiction(from: url)
                }
            }
        }
    }

    private func saveFanfiction(from url: URL) {
        // Check if it's an AO3 URL
        guard url.host?.contains("archiveofourown.org") == true else {
            showError("This doesn't appear to be an AO3 link")
            return
        }

        // Extract work ID from URL
        let workId = extractWorkId(from: url)

        // Save to app group shared container
        if let sharedDefaults = UserDefaults(suiteName: "group.com.aovault.app") {
            var savedWorks = sharedDefaults.array(forKey: "pendingWorks") as? [String] ?? []
            savedWorks.append(workId)
            sharedDefaults.set(savedWorks, forKey: "pendingWorks")
            sharedDefaults.synchronize()
        }

        // Open main app to complete the save
        let appURL = URL(string: "aovault://save?workId=\(workId)")!

        DispatchQueue.main.async {
            self.showSuccess()
        }
    }

    private func extractWorkId(from url: URL) -> String {
        // Extract work ID from URL like: https://archiveofourown.org/works/12345678
        let components = url.pathComponents
        if let worksIndex = components.firstIndex(of: "works"),
           worksIndex + 1 < components.count {
            return components[worksIndex + 1]
        }
        return url.absoluteString
    }

    private func showSuccess() {
        // Update UI to show success
        let successLabel = UILabel()
        successLabel.text = "✓ Saved to AO Vault!"
        successLabel.textColor = .systemGreen
        successLabel.font = .systemFont(ofSize: 20, weight: .semibold)
        successLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(successLabel)

        NSLayoutConstraint.activate([
            successLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            successLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])

        // Dismiss after 1 second
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            self.extensionContext?.cancelRequest(withError: NSError(domain: "AOVault", code: 0, userInfo: nil))
        })
        present(alert, animated: true)
    }
}
```

## 🎨 User Experience Flow

1. **On AO3 in Safari:**
   - User reads a fanfic they love
   - Taps Share button
   - Sees "Save to AO Vault" with our icon

2. **Quick Save Mode:**
   - Tap "Save to AO Vault"
   - Brief loading animation
   - "✓ Saved!" confirmation
   - Returns to reading

3. **Advanced Save (Optional):**
   - Long-press "Save to AO Vault"
   - Opens mini-interface to:
     - Add custom tags
     - Write a note
     - Mark as "Give Thanks"
   - Tap "Save"

## 🔒 App Groups for Data Sharing

To share data between main app and extension:

1. Enable App Groups in both targets
2. Use group ID: `group.com.aovault.app`
3. Share data via:
   - UserDefaults(suiteName: "group.com.aovault.app")
   - Shared CoreData container
   - Shared file directory

## 📋 App Store Benefits

This feature is a **HUGE** selling point:

### Marketing Copy:
"Save fanfics with one tap! Our exclusive Share Extension lets you save directly from AO3 - no URL copying needed. Just tap Share and select AO Vault. It's that simple!"

### Screenshots to Include:
1. Safari showing AO3 with Share menu open
2. "Save to AO Vault" highlighted in share menu
3. Success confirmation screen

## 🚀 Implementation Priority

**Phase 1 (MVP):** Basic URL saving
- Extract URL from share sheet
- Save to pending queue
- Open app to complete import

**Phase 2:** In-extension saving
- Full metadata extraction
- Save without opening app
- Quick tags/notes

**Phase 3:** Advanced features
- Batch saving
- Reading list creation
- Auto-categorization

## 💡 Technical Notes

- Extension size limit: 16MB
- Must be sandboxed
- Cannot directly access main app's database
- Use App Groups for data sharing
- Keep UI minimal and fast

## 🎯 Why Users Will Love This

1. **Convenience:** Save in 2 taps instead of copy-paste-switch-paste
2. **Speed:** 3 seconds vs 30 seconds
3. **Context:** Never leave your reading flow
4. **Discovery:** Save while browsing without interruption
5. **iOS Integration:** Feels native and polished

This makes AO Vault feel like a first-class iOS citizen, not just a web wrapper!