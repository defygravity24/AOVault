# AO Vault - App Store Submission Checklist

## 📱 Project Overview

**App Name:** AO Vault - Fanfiction Library
**Bundle ID:** com.aovault.app
**Category:** Books
**Age Rating:** 12+
**Price:** Free (No IAP)
**Website:** https://aovault.net

## ✅ Pre-Submission Checklist

### Development Requirements
- [ ] iOS app builds without errors in Xcode
- [ ] Capacitor configuration complete
- [ ] App runs on physical device
- [ ] Share Extension implemented and tested
- [ ] Offline storage working with IndexedDB
- [ ] Authentication removed (direct access to vault)
- [ ] All placeholder content replaced

### App Store Assets Ready

#### Legal Documents ✅
- [x] Terms of Service - `/Documents/AOVault/AppStore-Submission/Legal/TERMS_OF_SERVICE.md`
- [x] Privacy Policy - `/Documents/AOVault/AppStore-Submission/Legal/PRIVACY_POLICY.md`
- [x] Cookie Policy - `/Documents/AOVault/AppStore-Submission/Legal/COOKIE_POLICY.md`

#### Marketing Materials ✅
- [x] App Store Listing - `/Documents/AOVault/AppStore-Submission/Marketing/APP_STORE_LISTING.md`
  - App description (4000 characters)
  - Promotional text (170 characters)
  - Keywords (100 characters)
  - What's New section

#### Screenshots
- [x] Specifications documented - `/Documents/AOVault/AppStore-Submission/Screenshots/SCREENSHOT_SPECIFICATIONS.md`
- [x] HTML Mockups created:
  - Library View (Hero Shot)
  - Share Extension Demo
- [ ] Generate actual screenshots (1320 x 2868 for 6.9" display)
- [ ] Upload to App Store Connect

#### App Icons
- [x] Icon design finalized (white gradient with "AO" text)
- [x] Generation script ready - `/Documents/AOVault/AppStore-Submission/Icons/generate_icons.sh`
- [ ] Generate all icon sizes
- [ ] Add to Xcode Assets.xcassets

#### Share Extension ✅
- [x] Implementation guide - `/Documents/AOVault/AppStore-Submission/iOS-SHARE-EXTENSION.md`
- [ ] Add Share Extension target in Xcode
- [ ] Configure Info.plist for AO3 domain
- [ ] Test on real device

### TestFlight Beta Testing
- [x] Setup guide created - `/Documents/AOVault/AppStore-Submission/TestFlight/TESTFLIGHT_SETUP_GUIDE.md`
- [ ] Archive and upload build
- [ ] Configure TestFlight in App Store Connect
- [ ] Add beta testers
- [ ] Submit for Beta App Review

## 🚀 Submission Process

### Step 1: Prepare Build
```bash
# Navigate to iOS project
cd ~/Documents/AOVault

# Sync Capacitor
npx cap sync

# Open in Xcode
npx cap open ios
```

### Step 2: Configure in Xcode
- [ ] Set version to 1.0.0
- [ ] Set build number to 1
- [ ] Select development team
- [ ] Configure app capabilities
- [ ] Add app icons
- [ ] Set launch screen

### Step 3: Create Archive
- [ ] Select "Any iOS Device (arm64)"
- [ ] Product → Archive
- [ ] Wait for completion

### Step 4: Upload to App Store Connect
- [ ] Window → Organizer
- [ ] Select archive
- [ ] Distribute App
- [ ] App Store Connect → Upload

### Step 5: Configure in App Store Connect
- [ ] Add app information
- [ ] Upload screenshots
- [ ] Add description and keywords
- [ ] Set pricing (Free)
- [ ] Configure territories (Worldwide)

### Step 6: Submit for Review
- [ ] Answer export compliance questions
- [ ] Provide demo account (if needed)
- [ ] Add review notes
- [ ] Submit for review

## 📊 Key Features to Highlight

1. **One-Tap Saving** - Share Extension saves directly from AO3
2. **Offline Reading** - Download stories for reading anywhere
3. **Privacy First** - All data stored locally, no tracking
4. **Beautiful Organization** - Tags, collections, personal notes
5. **Emotional Reactions** - "Give Thanks", emoji reactions
6. **Free Forever** - No ads, no subscriptions, no data selling

## 🎯 Review Optimization Tips

### To Speed Up Review:
- Clearly explain the Share Extension functionality
- Emphasize that content is user-generated (fanfiction)
- Note that app doesn't host content, only saves links/metadata
- Explain age rating (12+) due to potential mature fanfiction

### Common Rejection Reasons to Avoid:
- ❌ Copyright issues → Clarify fanfiction is transformative work
- ❌ Inappropriate content → Age rating covers this
- ❌ Crashes or bugs → Test thoroughly on TestFlight first
- ❌ Incomplete functionality → Ensure all features work

## 📝 App Store Review Notes Template

```
Thank you for reviewing AO Vault!

WHAT THIS APP DOES:
AO Vault helps users organize fanfiction from Archive of Our Own (AO3).
Users can save story metadata and read offline. The app does NOT host
any content - it only saves links and metadata that users choose to save.

KEY FEATURES TO TEST:
1. Share Extension - Open Safari, go to any AO3 story, tap Share,
   select "Save to AO Vault"
2. Library organization with tags and collections
3. Offline reading mode
4. Search and filter functionality

ABOUT FANFICTION:
Fanfiction is user-generated creative writing based on existing works.
AO3 is a nonprofit fanfiction archive. Our app helps readers organize
their reading lists, similar to how Goodreads helps with books.

AGE RATING:
12+ rating selected due to potential mature themes in fanfiction.
The app itself contains no inappropriate content.

Please let us know if you need any clarification. Thank you!
```

## 🎉 Post-Launch Plan

### Week 1
- Monitor crash reports
- Respond to user reviews
- Fix critical bugs
- Push update if needed

### Week 2-4
- Gather feature requests
- Plan version 1.1
- Engage with community
- Marketing push

### Future Features (v1.1+)
- Desktop sync
- EPUB export
- Custom themes
- Statistics dashboard
- Recommendation engine

## 📞 Support Setup

- **Email:** support@aovault.net
- **Website:** https://aovault.net/support
- **Privacy:** https://aovault.net/privacy
- **Terms:** https://aovault.net/terms

## 🔗 Important Links

- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com)
- [TestFlight](https://testflight.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## ✨ Final Notes

Remember: The one-tap Share Extension is your **killer feature**. Make sure it's prominently displayed in:
- First screenshot
- App description opening
- Promotional text
- App preview video (if created)

Good luck with your submission! The fanfiction community is going to love having a dedicated, privacy-focused library app! 📚💜

---

*Last updated: February 21, 2026*
*Status: Ready for Xcode implementation and TestFlight*