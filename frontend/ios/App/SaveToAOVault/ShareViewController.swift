//
//  ShareViewController.swift
//  SaveToAOVault
//
//  Created by Christina Cooper on 2/22/26.
//

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private let appGroupID = "group.app.aovault.vault"
    private let pendingURLsKey = "pendingImportURLs"

    private var containerView: UIView!
    private var statusLabel: UILabel!
    private var activityIndicator: UIActivityIndicatorView!
    private var checkmarkView: UIImageView!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractAndSaveURL()
    }

    // MARK: - UI Setup

    private func setupUI() {
        view.backgroundColor = UIColor.black.withAlphaComponent(0.4)

        // Card container
        containerView = UIView()
        containerView.backgroundColor = UIColor.systemBackground
        containerView.layer.cornerRadius = 16
        containerView.layer.shadowColor = UIColor.black.cgColor
        containerView.layer.shadowOpacity = 0.2
        containerView.layer.shadowOffset = CGSize(width: 0, height: 4)
        containerView.layer.shadowRadius = 12
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)

        // App icon / title area
        let titleLabel = UILabel()
        titleLabel.text = "AOVault"
        titleLabel.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = UIColor.label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(titleLabel)

        // Activity indicator
        activityIndicator = UIActivityIndicatorView(style: .medium)
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.startAnimating()
        containerView.addSubview(activityIndicator)

        // Checkmark (hidden initially)
        let checkConfig = UIImage.SymbolConfiguration(pointSize: 24, weight: .bold)
        checkmarkView = UIImageView(image: UIImage(systemName: "checkmark.circle.fill", withConfiguration: checkConfig))
        checkmarkView.tintColor = UIColor.systemGreen
        checkmarkView.translatesAutoresizingMaskIntoConstraints = false
        checkmarkView.isHidden = true
        containerView.addSubview(checkmarkView)

        // Status label
        statusLabel = UILabel()
        statusLabel.text = "Saving to AOVault..."
        statusLabel.font = UIFont.systemFont(ofSize: 15, weight: .medium)
        statusLabel.textColor = UIColor.secondaryLabel
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalToConstant: 260),
            containerView.heightAnchor.constraint(equalToConstant: 120),

            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 20),
            titleLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            activityIndicator.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            activityIndicator.centerXAnchor.constraint(equalTo: containerView.centerXAnchor, constant: -50),

            checkmarkView.centerXAnchor.constraint(equalTo: activityIndicator.centerXAnchor),
            checkmarkView.centerYAnchor.constraint(equalTo: activityIndicator.centerYAnchor),

            statusLabel.centerYAnchor.constraint(equalTo: activityIndicator.centerYAnchor),
            statusLabel.leadingAnchor.constraint(equalTo: activityIndicator.trailingAnchor, constant: 10),
        ])
    }

    // MARK: - URL Extraction

    private func extractAndSaveURL() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            showError("No content shared")
            return
        }

        var foundURL = false

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }

            for provider in attachments {
                // Check for URL type
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    foundURL = true
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                        DispatchQueue.main.async {
                            if let error = error {
                                self?.showError("Error: \(error.localizedDescription)")
                                return
                            }

                            var urlString: String?

                            if let url = data as? URL {
                                urlString = url.absoluteString
                            } else if let data = data as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                                urlString = url.absoluteString
                            }

                            if let urlString = urlString {
                                self?.saveURL(urlString)
                            } else {
                                self?.showError("Could not read URL")
                            }
                        }
                    }
                    return // Only process first URL found
                }

                // Fallback: check for plain text that might be a URL
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    foundURL = true
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                        DispatchQueue.main.async {
                            if let error = error {
                                self?.showError("Error: \(error.localizedDescription)")
                                return
                            }

                            if let text = data as? String,
                               let url = URL(string: text),
                               url.scheme?.hasPrefix("http") == true {
                                self?.saveURL(text)
                            } else {
                                self?.showError("No valid URL found")
                            }
                        }
                    }
                    return
                }
            }
        }

        if !foundURL {
            showError("No URL to save")
        }
    }

    // MARK: - Save URL to App Group

    private func saveURL(_ urlString: String) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            showError("App group error")
            return
        }

        // Append to pending URLs array
        var pendingURLs = defaults.stringArray(forKey: pendingURLsKey) ?? []
        pendingURLs.append(urlString)
        defaults.set(pendingURLs, forKey: pendingURLsKey)
        defaults.synchronize()

        showSuccess(urlString)
    }

    // MARK: - UI Feedback

    private func showSuccess(_ url: String) {
        activityIndicator.stopAnimating()
        activityIndicator.isHidden = true
        checkmarkView.isHidden = false
        statusLabel.text = "Saved!"
        statusLabel.textColor = UIColor.systemGreen

        // Auto-dismiss after brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    private func showError(_ message: String) {
        activityIndicator.stopAnimating()
        activityIndicator.isHidden = true

        let errorConfig = UIImage.SymbolConfiguration(pointSize: 24, weight: .bold)
        checkmarkView.image = UIImage(systemName: "xmark.circle.fill", withConfiguration: errorConfig)
        checkmarkView.tintColor = UIColor.systemRed
        checkmarkView.isHidden = false

        statusLabel.text = message
        statusLabel.textColor = UIColor.systemRed

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}
