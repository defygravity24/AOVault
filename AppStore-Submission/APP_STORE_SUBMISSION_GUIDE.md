# AO Vault - App Store Submission Guide

## 📱 App Store Requirements Checklist

### 1. Apple Developer Account
- [ ] Apple Developer Program membership ($99/year)
- [ ] Account verified and active
- [ ] Tax and banking information completed

### 2. App Information
**App Name:** AO Vault
**Bundle ID:** com.yourdomain.aovault
**Category:** Books or Entertainment
**Age Rating:** 12+ (due to fanfiction content)

### 3. Required Assets

#### App Icons (Required Sizes)
- [ ] 1024x1024px - App Store icon (no transparency, no rounded corners)
- [ ] 180x180px - iPhone App icon @3x
- [ ] 120x120px - iPhone App icon @2x
- [ ] 152x152px - iPad App icon @2x
- [ ] 167x167px - iPad Pro App icon
- [ ] 60x60px - Notification icon @3x
- [ ] 40x40px - Settings icon @3x
- [ ] 29x29px - Settings icon @2x

#### Screenshots (Required)
- [ ] 6.7" iPhone (1290 × 2796 px) - iPhone 15 Pro Max
- [ ] 6.5" iPhone (1242 × 2688 px) - iPhone 14 Plus
- [ ] 5.5" iPhone (1242 × 2208 px) - iPhone 8 Plus
- [ ] 12.9" iPad Pro (2048 × 2732 px)

**Screenshot Ideas:**
1. Library view with saved fanfics
2. Reading view with "Give Thanks" button
3. Add new fanfic screen
4. Tags and organization view
5. Search and filter capabilities

### 4. App Store Listing Content

#### App Description (4000 characters max)
```
AO Vault - Your Personal Fanfiction Library

Save, organize, and cherish your favorite AO3 fanfiction in one beautiful, private space. Built by fans, for fans, AO Vault makes it easy to build your personal library of beloved stories.

KEY FEATURES:

📚 Personal Library
• Save fanfics from Archive of Our Own with one tap
• Automatic metadata extraction (title, author, tags, summary)
• Never lose a fic again - your own private archive

❤️ Express Your Love
• "Give Thanks" button to track stories that touched your heart
• "Mark as Outrageously Horny" for those special fics (we don't judge!)
• Add personal notes and custom tags

🏷️ Smart Organization
• Filter by fandom, pairing, tags, or custom categories
• Powerful search across your entire collection
• Track reading progress and favorites

🔒 Privacy First
• Your library is completely private
• No social features - this space is just for you
• Secure backup of your collection

📖 Beautiful Reading Experience
• Clean, distraction-free reading interface
• Dark mode for late-night reading sessions
• Customizable reading preferences

AO Vault is free and always will be. No ads, no subscriptions, no data selling. Just a safe space for your fanfiction.

Built with love by the fanfiction community, for the fanfiction community.
```

#### Keywords (100 characters)
```
ao3,fanfiction,archive,library,fandom,reader,stories,bookmarks,organize,private
```

#### What's New (Version Notes)
```
Version 1.0
- Initial release
- Save fanfics from AO3
- Personal library management
- Give Thanks and marking features
- Custom tags and organization
```

### 5. Technical Requirements

#### iOS App Configuration
- [ ] Minimum iOS version: 14.0
- [ ] Supported devices: iPhone and iPad
- [ ] Orientation: Portrait and Landscape
- [ ] Build with WKWebView wrapper
- [ ] Enable App Transport Security exceptions for API

#### Privacy & Permissions
- [ ] Network access (for saving fanfics)
- [ ] No location services needed
- [ ] No camera/microphone access
- [ ] Basic analytics only (optional)

### 6. Privacy Policy & Terms
- [ ] Privacy Policy URL (required)
- [ ] Terms of Service URL (optional but recommended)
- [ ] Content moderation policy (for user-generated content)

### 7. App Review Guidelines Compliance

**Important Considerations:**
1. **Content**: Fanfiction may contain mature themes
   - Set appropriate age rating (12+ or 17+)
   - Implement content warnings/filters
   - No explicit content in screenshots

2. **Copyright**:
   - Clearly state this is for personal use only
   - Respect AO3's Terms of Service
   - Don't claim ownership of fanfiction content

3. **User Safety**:
   - No social features initially (reduces moderation needs)
   - Private library only
   - Clear reporting mechanism if adding social features later

### 8. Submission Process

1. **Build the iOS App**
   ```bash
   cd ~/Desktop/ao-vault/ios-app
   xcodebuild -scheme AOVault -configuration Release
   ```

2. **Archive in Xcode**
   - Product → Archive
   - Validate archive
   - Distribute to App Store Connect

3. **App Store Connect Setup**
   - Create new app
   - Fill in all metadata
   - Upload screenshots
   - Submit for review

### 9. Pre-Submission Testing

- [ ] Test on multiple devices (iPhone, iPad)
- [ ] Test on different iOS versions
- [ ] Check all links work
- [ ] Verify offline functionality
- [ ] Test with slow/no internet
- [ ] Ensure no crashes or major bugs

### 10. Review Response Preparation

Common rejection reasons and solutions:
- **Content concerns**: Emphasize personal library, not sharing
- **Copyright**: Show respect for original content
- **Functionality**: Ensure app works without web dependency
- **Design**: Follow iOS Human Interface Guidelines

## 📅 Timeline

**Week 1**: Prepare assets and content
**Week 2**: Build and test iOS wrapper
**Week 3**: Submit to App Store
**Week 4**: Respond to any review feedback

## 💡 Pro Tips

1. Submit early in the week (Monday-Wednesday)
2. Include detailed review notes explaining the app
3. Have TestFlight beta ready first
4. Prepare for 1-2 rejection cycles (normal)
5. Join Apple Developer Forums for support

## 🚀 Next Steps

1. Set up Apple Developer account
2. Create app icons and screenshots
3. Build iOS wrapper app
4. Test thoroughly
5. Submit to TestFlight first
6. Then submit to App Store

---

*Remember: AO Vault is built by fans, for fans. Keep the community spirit in all communications with Apple.*