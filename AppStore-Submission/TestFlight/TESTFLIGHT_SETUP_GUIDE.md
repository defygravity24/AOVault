# TestFlight Setup Guide for AO Vault

## 📱 TestFlight Overview

TestFlight is Apple's official beta testing platform that allows you to:
- Test your app with up to 10,000 external testers
- Get feedback before App Store launch
- Test on real devices without App Store approval
- Distribute builds automatically through App Store Connect

## 🚀 Prerequisites

### Developer Account Requirements
- [ ] Apple Developer Program membership ($99/year)
- [ ] App Store Connect access
- [ ] Certificates & Provisioning Profiles configured
- [ ] App ID created in Developer Portal

### Technical Requirements
- [ ] Xcode 15+ installed
- [ ] Valid signing certificate
- [ ] App icon in all required sizes
- [ ] Launch screen configured
- [ ] Info.plist properly configured

## 📋 Step-by-Step Setup

### Step 1: Prepare Your Build

1. **Update Version & Build Number**
   ```
   Version: 1.0.0
   Build: 1
   ```
   - Version for major releases (1.0.0, 1.1.0, etc.)
   - Build increments for each TestFlight upload (1, 2, 3, etc.)

2. **Configure Signing**
   - Select your team in Xcode
   - Enable "Automatically manage signing"
   - Or manually select provisioning profiles

3. **Archive Your App**
   - Select "Any iOS Device" as build target
   - Product → Archive
   - Wait for archive to complete

### Step 2: Upload to App Store Connect

1. **From Xcode Organizer**
   - Window → Organizer
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Select "Upload"
   - Wait for processing (5-30 minutes)

2. **Alternative: Using Transporter**
   - Export .ipa from Xcode
   - Open Transporter app
   - Drag .ipa file
   - Click "Deliver"

### Step 3: Configure in App Store Connect

1. **Navigate to TestFlight Tab**
   - Log into App Store Connect
   - Select "AO Vault"
   - Click "TestFlight" tab

2. **Complete Test Information**
   ```
   Beta App Description:
   AO Vault is your personal fanfiction library for Archive of Our Own.
   Save stories with one tap, organize your collection, and read offline.

   What to Test:
   - Save fanfics from AO3 using the Share Extension
   - Organize stories with tags and collections
   - Test offline reading mode
   - Try the reaction features
   - Search and filter functionality
   ```

3. **Add Test Notes for This Build**
   ```
   What's New in Build [X]:
   - Initial beta release
   - Core saving functionality
   - Offline reading support
   - Share Extension for one-tap saving
   - Basic organization features

   Known Issues:
   - [List any known bugs]

   Focus Areas:
   - Please test saving from different AO3 story types
   - Check if offline mode properly caches content
   - Report any crashes when using Share Extension
   ```

### Step 4: Manage Testers

#### Internal Testing (Up to 100 testers)
- Add App Store Connect users
- Automatic distribution
- No review required
- Best for: Team members, close beta testers

**Add Internal Testers:**
1. TestFlight → Internal Testing
2. Create group (e.g., "Core Team")
3. Add testers by email
4. Select builds to test

#### External Testing (Up to 10,000 testers)
- Requires beta app review (24-48 hours)
- Can use public TestFlight links
- Email invitations
- Best for: Community beta, wider testing

**Add External Testers:**
1. TestFlight → External Testing
2. Create group (e.g., "Beta Testers", "Fanfic Community")
3. Add testers manually or use public link
4. Submit for Beta App Review

### Step 5: Beta App Review Submission

**Required Information:**
- [ ] Contact Information
- [ ] Beta App Description
- [ ] Does app access any paid content? No
- [ ] Does app have export compliance? No
- [ ] Screenshots (if UI changed significantly)

**Review Guidelines:**
- Usually approved within 24-48 hours
- Less strict than full App Store review
- Focus on crashes and major bugs
- Can be rejected for offensive content

## 🧪 Testing Groups Strategy

### Recommended Groups

1. **Internal - Core Team** (5-10 testers)
   - You and co-developers
   - Most trusted users
   - Get every build immediately

2. **External - Alpha Testers** (20-50 testers)
   - Enthusiastic early adopters
   - Willing to deal with bugs
   - Provide detailed feedback

3. **External - Beta Community** (100-500 testers)
   - Broader fanfic community
   - Test diverse use cases
   - General feedback

4. **External - Public Beta** (Open)
   - Public TestFlight link
   - Anyone can join
   - Maximum exposure

## 📊 TestFlight Analytics

### Metrics to Track
- **Crashes:** Monitor crash reports
- **Sessions:** How often testers use the app
- **Installations:** Track adoption rate
- **Feedback:** In-app feedback submissions

### Crash Reporting
1. View in App Store Connect → TestFlight → Crashes
2. Symbolicate crash logs in Xcode
3. Prioritize by frequency and severity
4. Fix critical crashes before App Store submission

## 💬 Collecting Feedback

### Built-in Feedback
- Testers can shake device to send feedback
- Screenshots automatically included
- Goes to App Store Connect → TestFlight → Feedback

### External Feedback Channels
- Discord server for beta testers
- Google Form for structured feedback
- Email: beta@aovault.net
- GitHub Issues (if open source)

### Feedback Template
```
Device: [iPhone model]
iOS Version: [version]
Build Number: [from TestFlight]

Issue Description:
[What happened?]

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [What went wrong]

Expected Behavior:
[What should have happened]

Attachments:
[Screenshots/Videos]
```

## 🔄 Build Update Process

### Version Strategy
- **1.0.0 (Build 1-10):** Initial TestFlight beta
- **1.0.0 (Build 11-20):** Bug fixes from beta feedback
- **1.0.0 (Build 21):** Release Candidate
- **1.0.0:** App Store release

### Update Frequency
- **Alpha Phase:** Daily builds OK
- **Beta Phase:** 2-3 builds per week
- **RC Phase:** Only critical fixes
- **Post-Launch:** Monthly updates

### Release Notes Template
```
Build X - [Date]

NEW FEATURES:
• [Feature 1]
• [Feature 2]

IMPROVEMENTS:
• [Improvement 1]
• [Improvement 2]

BUG FIXES:
• Fixed [issue 1]
• Fixed [issue 2]

KNOWN ISSUES:
• [Current limitation 1]
• [Current limitation 2]

Thank you for testing! Please report any issues through TestFlight feedback.
```

## ⏱️ Timeline

### Week 1-2: Internal Testing
- Core team only
- Iron out major bugs
- Verify core features work

### Week 3-4: Limited External Beta
- 50-100 invited testers
- Gather initial feedback
- Fix critical issues

### Week 5-6: Public Beta
- Open TestFlight link
- Marketing push for testers
- Stress test with more users

### Week 7-8: Release Candidate
- Final bug fixes only
- Prepare App Store submission
- Lock feature set

## 🚨 Common Issues & Solutions

### Build Processing Stuck
- Wait up to 24 hours
- Check email for rejection notices
- Ensure all certificates are valid
- Try re-uploading with incremented build number

### TestFlight Not Updating
- Testers may need to refresh TestFlight app
- Check if build is actually enabled for testing group
- Verify tester's email is correct
- Send manual reminder to update

### Beta Review Rejection
- Check rejection reason email
- Common: Missing test account credentials
- Fix issue and resubmit same build number
- Usually re-reviewed within hours

### Testers Can't Install
- Verify device compatibility (iOS version)
- Check if tester accepted invitation
- Ensure build is not expired (90 days limit)
- Tester may need to sign out/in to TestFlight

## 📝 Pre-Launch Checklist

### Before Going to TestFlight
- [ ] App runs without crashes
- [ ] Share Extension tested
- [ ] Offline mode verified
- [ ] All placeholder content removed
- [ ] Error messages are user-friendly
- [ ] Loading states implemented
- [ ] Empty states designed

### Before App Store Submission
- [ ] 100+ hours of testing completed
- [ ] Major bugs fixed
- [ ] Performance optimized
- [ ] Crash rate < 1%
- [ ] 10+ positive feedback responses
- [ ] Release notes written
- [ ] App Store listing finalized

## 📧 TestFlight Invitation Email Template

### For Close Friends/Community
```
Subject: You're Invited to Beta Test AO Vault! 📚

Hey [Name]!

I'm excited to invite you to beta test AO Vault - the app I've been building for the AO3 fanfiction community!

With AO Vault, you can:
• Save fanfics from AO3 with one tap (no more copying URLs!)
• Organize your library with tags and collections
• Read offline when AO3 is down
• Track your favorite stories and authors

How to Join:
1. Click this TestFlight link: [link]
2. Install TestFlight if you don't have it
3. Install AO Vault beta
4. Start saving your favorite fics!

Please test the app and send feedback through TestFlight's built-in tool (shake your phone while in the app). I'm especially interested in:
- Does the Share Extension work smoothly?
- Any crashes or bugs?
- Features you'd love to see?

The beta period runs for 30 days, and you'll get automatic updates as I fix bugs and add features.

Thanks so much for helping make AO Vault better for the whole community!

[Your name]
```

### For Public Beta
```
Subject: AO Vault Beta Now Open - Test the Fanfic Library App!

The AO Vault beta is now open to everyone!

Join here: [TestFlight link]

AO Vault is a new iOS app that lets you save and organize AO3 fanfiction with one tap. No ads, no tracking, just your personal fanfic library.

Beta testers get:
✓ Early access to all features
✓ Direct line to the developer
✓ Influence on the app's direction
✓ Credit in the final release notes

Limited to first 500 testers. Join now!
```

## 🎯 Success Metrics

### TestFlight Goals
- **Week 1:** 50+ testers
- **Week 2:** 100+ testers, <5% crash rate
- **Week 3:** 250+ testers, 20+ feedback submissions
- **Week 4:** 500+ testers, core features stable
- **Launch Ready:** 1000+ beta hours, <1% crash rate

### Ready for App Store When
- Crash-free sessions > 98%
- No critical bugs for 7 days
- Positive feedback > negative
- Core features thoroughly tested
- Performance metrics acceptable

## 🔗 Useful Links

- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight for Testers](https://testflight.apple.com)
- [Transporter App](https://apps.apple.com/app/transporter/id1450874784)

## 💡 Pro Tips

1. **Start with small group** - Don't go to 1000 testers on day one
2. **Set expectations** - Be clear it's beta software
3. **Respond to feedback** - Acknowledge testers' reports
4. **Build frequently** - Keep momentum with regular updates
5. **Track everything** - Document bugs, feedback, and fixes
6. **Celebrate milestones** - Thank testers publicly
7. **Have backup plan** - Know how to rollback if needed

---

*Ready to launch your TestFlight beta? This guide will help you navigate the entire process from first build to App Store submission. Remember: TestFlight is your chance to perfect the app before the world sees it!*