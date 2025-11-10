# WCAG 2.1 Level AA Compliance

## Overview

Steam Marketplace is committed to providing an accessible experience for all users, including those with disabilities. This document outlines our compliance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.

## Table of Contents

1. [Accessibility Commitment](#-accessibility-commitment)
2. [WCAG 2.1 AA Standards](#-wcag-201-aa-standards)
3. [Implementation Details](#-implementation-details)
4. [Testing & Validation](#-testing--validation)
5. [Assistive Technology Support](#-assistive-technology-support)
6. [Known Issues & Roadmap](#-known-issues--roadmap)
7. [Reporting Accessibility Issues](#-reporting-accessibility-issues)
8. [Resources](#-resources)

## ♿ Accessibility Commitment

We believe that everyone should be able to use Steam Marketplace, regardless of their abilities or disabilities. Our commitment includes:

- **Inclusive Design**: Building accessibility into every feature from the start
- **Continuous Improvement**: Regularly testing and improving accessibility
- **User Feedback**: Listening to and addressing accessibility concerns
- **Industry Standards**: Following WCAG 2.1 Level AA guidelines
- **Legal Compliance**: Meeting ADA, Section 508, and EN 301 549 requirements

## 🎯 WCAG 2.1 AA Standards

WCAG 2.1 is organized around four principles (POUR):

### 1. Perceivable
Information and UI must be presented to users in ways they can perceive.

### 2. Operable
UI components and navigation must be operable by all users.

### 3. Understandable
Information and operation of the UI must be understandable.

### 4. Robust
Content must be robust enough to work with a wide range of assistive technologies.

## ✅ Implementation Details

### Perceivable

#### 1.1 Text Alternatives

**1.1.1 Non-text Content (Level A)**
- ✅ All images have descriptive alt attributes
- ✅ Icons are accompanied by text labels
- ✅ Decorative images use empty alt attributes (`alt=""`)
- ✅ Complex images have detailed descriptions nearby

**Example:**
```html
<!-- Good -->
<img src="ak47-redline.jpg" alt="AK-47 | Redline (Field-Tested) skin for $45.99">

<!-- Complex image -->
<figure>
  <img src="skin-zoom.jpg" alt="Close-up of AK-47 Redline pattern showing red line design">
  <figcaption>Figure 1: The characteristic red diagonal line pattern on the AK-47 Redline</figcaption>
</figure>
```

#### 1.2 Time-based Media

**1.2.1 Audio-only and Video-only (Level A)**
- N/A (No audio/video content at this time)

**1.2.2 Captions (Level A)**
- N/A (No multimedia content requiring captions)

#### 1.3 Adaptable

**1.3.1 Info and Relationships (Level A)**
- ✅ Semantic HTML5 elements used correctly
- ✅ Form fields have associated labels
- ✅ Headings follow logical hierarchy (h1, h2, h3...)
- ✅ Lists are marked up with `<ul>` and `<ol>`
- ✅ Tables have proper headers and scope attributes

**Implementation:**
```html
<!-- Semantic HTML -->
<header>
  <h1>Steam Marketplace</h1>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/marketplace">Marketplace</a></li>
      <li><a href="/account">My Account</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h2>Featured Listings</h2>
    <!-- Content -->
  </article>
</main>
```

**1.3.2 Meaningful Sequence (Level A)**
- ✅ Content follows logical reading order
- ✅ CSS doesn't disrupt content flow
- ✅ No use of `tabindex` > 0

**1.3.3 Sensory Characteristics (Level A)**
- ✅ Instructions don't rely solely on sensory characteristics
- Example: "Click the blue button" includes text like "Click Submit"
- ✅ Visual cues are accompanied by text

**1.3.4 Orientation (Level AA)**
- ✅ Content works in both portrait and landscape
- ✅ No restriction on device orientation
- Responsive design supports all screen sizes

**1.3.5 Identify Input Purpose (Level AA)**
- ✅ Autocomplete attributes for form fields
- Example: `autocomplete="email"` for email fields

#### 1.4 Distinguishable

**1.4.1 Use of Color (Level A)**
- ✅ Color is not the only means of conveying information
- ✅ Links have text labels or visual indicators
- ✅ Error states have icons AND text

**1.4.2 Audio Control (Level A)**
- N/A (No auto-playing audio)

**1.4.3 Minimum Contrast (Level AA)**
- ✅ Text has contrast ratio of at least 4.5:1
- ✅ Large text has contrast ratio of at least 3:1
- ✅ UI components have contrast ratio of 3:1

**Contrast Testing:**
```css
/* Primary text - 4.5:1 ratio */
.text-primary {
  color: #1a1a1a; /* Dark gray on white */
}

/* Secondary text - 7:1 ratio */
.text-secondary {
  color: #4a5568; /* Medium gray on white */
}

/* Success text - 4.5:1 ratio */
.text-success {
  color: #0f5132; /* Dark green on light background */
}
```

**1.4.4 Resize Text (Level AA)**
- ✅ Text can be resized up to 200% without loss of functionality
- ✅ Layout doesn't break when text is enlarged
- ✅ No horizontal scrolling at 200% zoom

**1.4.5 Images of Text (Level AA)**
- ✅ No images of text (except for logos)
- ✅ All text is actual text HTML

### Operable

#### 2.1 Keyboard Accessible

**2.1.1 Keyboard (Level A)**
- ✅ All functionality available via keyboard
- ✅ Custom components support keyboard navigation
- ✅ Tab order is logical

**Keyboard Navigation Pattern:**
```javascript
// Example: Custom dropdown with keyboard support
const Dropdown = {
  init() {
    this.trigger = document.querySelector('[role="button"]');
    this.menu = document.querySelector('[role="menu"]');
    this.items = this.menu.querySelectorAll('[role="menuitem"]');

    // Keyboard handlers
    this.trigger.addEventListener('keydown', this.onKeyDown.bind(this));
  },

  onKeyDown(e) {
    switch(e.key) {
      case 'Enter':
      case ' ':
        this.openMenu();
        break;
      case 'Escape':
        this.closeMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusNext();
        break;
    }
  }
};
```

**2.1.2 No Keyboard Trap (Level A)**
- ✅ Users can navigate out of modals
- ✅ Focus can be removed from components
- ✅ Escape key closes dialogs

**2.1.4 Character Key Shortcuts (Level A)**
- ✅ No single character shortcuts (except in text inputs)
- ✅ Multi-character shortcuts available

#### 2.2 Enough Time

**2.2.1 Timing Adjustable (Level A)**
- ✅ No time limits on critical interactions
- ✅ Session timeout warnings provided
- ✅ Users can extend time limits

**2.2.2 Pause, Stop, Hide (Level A)**
- ✅ No auto-updating content
- N/A (No carousels or animations at this time)

#### 2.3 Seizures and Physical Reactions

**2.3.1 Three Flashes or Below Threshold (Level A)**
- ✅ No flashing content
- ✅ Animations are subtle and don't cause seizures

#### 2.4 Navigable

**2.4.1 Bypass Blocks (Level A)**
- ✅ "Skip to main content" link at top of page
- ✅ Landmark regions (header, nav, main, footer)

**Implementation:**
```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Landmarks -->
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main role="main" id="main-content">
<footer role="contentinfo">
```

**2.4.2 Page Titled (Level A)**
- ✅ All pages have descriptive titles
- ✅ Title follows format: "Page Name - Steam Marketplace"

**2.4.3 Focus Order (Level A)**
- ✅ Focus order follows logical reading order
- ✅ Modal focus goes to first focusable element
- ✅ Focus returns to trigger when modal closes

**2.4.4 Link Purpose (In Context) (Level A)**
- ✅ Link text clearly describes destination
- ✅ Icon-only links have aria-labels
- ✅ Context provided for ambiguous links

**Example:**
```html
<!-- Good - clear link text -->
<a href="/listings/ak47-redline">View AK-47 | Redline listing</a>

<!-- Good - context provided -->
<p>Looking for a great AK-47 skin? <a href="/listings/ak47">Check out our AK-47 listings</a></p>

<!-- Good - aria-label for icon -->
<button aria-label="Add to cart">
  <svg><!-- cart icon --></svg>
</button>
```

**2.4.5 Multiple Ways (Level AA)**
- ✅ Multiple ways to reach pages (navigation, search, links)
- ✅ Breadcrumb navigation
- ✅ Sitemap available

**2.4.6 Headings and Labels (Level AA)**
- ✅ Headings describe topic/purpose
- ✅ Form labels clearly describe purpose
- ✅ Headings and labels are concise

**2.4.7 Focus Visible (Level AA)**
- ✅ Keyboard focus is clearly visible
- ✅ Custom focus indicators provided
- ✅ Default browser focus preserved where appropriate

**CSS Focus Styles:**
```css
/* Custom focus indicator */
button:focus,
a:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.2);
}
```

### Understandable

#### 3.1 Readable

**3.1.1 Language of Page (Level A)**
- ✅ HTML lang attribute set to "en"
- ✅ Changes in language indicated

**3.1.2 Language of Parts (Level AA)**
- ✅ Language changes within page are marked
- ✅ N/A (Content in English only)

#### 3.2 Predictable

**3.2.1 On Focus (Level A)**
- ✅ Focus changes don't trigger context changes
- ✅ Opening menus on focus is avoided

**3.2.2 On Input (Level A)**
- ✅ Input changes don't cause unexpected context changes
- ✅ Form submission requires explicit action

**3.2.3 Consistent Navigation (Level AA)**
- ✅ Navigation appears in same location
- ✅ Navigation elements in same order
- ✅ Navigation doesn't change unexpectedly

**3.2.4 Consistent Identification (Level AA)**
- ✅ Icons and buttons serve same function have same labels
- ✅ UI components with same purpose look and behave consistently

#### 3.3 Input Assistance

**3.3.1 Error Identification (Level A)**
- ✅ Form errors clearly identified
- ✅ Error messages specific and helpful
- ✅ Errors highlighted visually

**Error Message Example:**
```html
<label for="email">Email Address</label>
<input type="email" id="email" aria-describedby="email-error" required>
<div id="email-error" class="error" role="alert">
  Please enter a valid email address
</div>
```

**3.3.2 Labels or Instructions (Level A)**
- ✅ Form fields have labels
- ✅ Input requirements clearly indicated
- ✅ Examples provided where helpful

**3.3.3 Error Suggestion (Level AA)**
- ✅ Suggestions for fixing errors provided
- ✅ Specific guidance for each field

**3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)**
- ✅ Users can review data before submission
- ✅ Confirmation dialogs for important actions
- ✅ Data can be corrected after submission

### Robust

#### 4.1 Compatible

**4.1.1 Parsing (Level A)**
- ✅ Valid HTML5
- ✅ Proper nesting of elements
- ✅ Unique IDs where required
- ✅ No duplicate attributes

**4.1.2 Name, Role, Value (Level A)**
- ✅ UI components have proper ARIA roles
- ✅ State and properties exposed via ARIA
- ✅ Name and purpose can be determined

**Custom Component Example:**
```html
<!-- Custom dropdown -->
<div role="button"
     aria-haspopup="listbox"
     aria-expanded="false"
     aria-labelledby="dropdown-label">
  <span id="dropdown-label">Select a game</span>
  <svg aria-hidden="true"><!-- arrow icon --></svg>
</div>

<ul role="listbox" aria-labelledby="dropdown-label">
  <li role="option" aria-selected="true">CS:GO</li>
  <li role="option" aria-selected="false">CS2</li>
</ul>
```

**4.1.3 Status Messages (Level AA)**
- ✅ Status messages announced to assistive technology
- ✅ `role="alert"` for errors
- ✅ `aria-live` for dynamic updates

**Status Message Examples:**
```html
<!-- Success message -->
<div class="success" role="status" aria-live="polite">
  Your item has been listed successfully
</div>

<!-- Error message -->
<div class="error" role="alert">
  Unable to process payment. Please try again.
</div>

<!-- Loading state -->
<div aria-live="polite" aria-busy="true">
  Loading your listings...
</div>
```

## 🧪 Testing & Validation

### Automated Testing

**Tools Used:**
- **axe-core**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Accessibility audit in Chrome DevTools

**Testing Commands:**
```bash
# Run accessibility tests
npm run test:a11y

# Generate accessibility report
npm run a11y:audit

# Check with axe
npm run a11y:axe
```

### Manual Testing

**Keyboard Navigation:**
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate within components
- [ ] Escape closes modals/dropdowns
- [ ] Focus is always visible

**Screen Reader Testing:**
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS)
- [ ] TalkBack (Android)

**Visual Testing:**
- [ ] High contrast mode
- [ ] Zoom to 200%
- [ ] Color blindness simulators
- [ ] Different screen sizes

### Accessibility Checklist

- [ ] All images have alt text
- [ ] Form fields have labels
- [ ] Headings follow hierarchy
- [ ] Color is not the only indicator
- [ ] Contrast ratios meet standards
- [ ] Keyboard navigation works
- [ ] Focus is visible
- [ ] ARIA attributes used correctly
- [ ] Error messages are clear
- [ ] Status messages announced
- [ ] Skip links present
- [ ] No keyboard traps
- [ ] Semantic HTML used
- [ ] Language identified
- [ ] Titles are descriptive

## 🔧 Assistive Technology Support

### Screen Readers

**Supported Screen Readers:**
- ✅ NVDA (Windows)
- ✅ JAWS (Windows)
- ✅ VoiceOver (macOS)
- ✅ TalkBack (Android)
- ✅ Orca (Linux)

**Testing Examples:**

**NVDA Commands:**
- `Insert + F7`: Element list
- `Insert + F5`: Active field
- `H`: Navigate by headings
- `B`: Navigate by buttons
- `Link`: Navigate by links

**VoiceOver Commands (macOS):**
- `VO + A`: Start/stop speech
- `VO + Command + H`: Headings menu
- `VO + Command + B`: Buttons menu
- `VO + U`: Web rotor
- `VO + Space`: Activate element

### Other Assistive Technologies

**Supported Technologies:**
- ✅ Voice control software (Dragon)
- ✅ Eye-tracking devices
- ✅ Switch navigation
- ✅ Magnification tools
- ✅ High contrast mode
- ✅ Keyboard-only navigation

## 🚧 Known Issues & Roadmap

### Current Limitations

1. **Third-party Integrations**
   - Steam's login page accessibility varies
   - Payment processor UI may not meet all standards
   - Mitigation: Working with vendors to improve accessibility

2. **Dynamic Content**
   - Some real-time updates may not be announced
   - Mitigation: Adding ARIA live regions

3. **Complex Visualizations**
   - Price graphs may be difficult to interpret
   - Mitigation: Providing data tables alongside graphs

### Roadmap

**Q1 2024:**
- [ ] Complete WCAG 2.1 AA audit
- [ ] Fix all Priority 1 issues
- [ ] Improve screen reader support

**Q2 2024:**
- [ ] Add keyboard shortcuts for power users
- [ ] Implement high contrast theme
- [ ] Add more ARIA live regions

**Q3 2024:**
- [ ] Mobile accessibility improvements
- [ ] Video captions (when video content added)
- [ ] Sign language interpretation (future)

**Q4 2024:**
- [ ] WCAG 2.2 compliance
- [ ] User testing with people with disabilities
- [ ] Accessibility training for all team members

## 📢 Reporting Accessibility Issues

We take accessibility seriously and welcome feedback from users.

### How to Report

**Email:** accessibility@sgomarket.com
**Subject:** Accessibility Issue - [Brief Description]

**Include:**
1. Description of the issue
2. Steps to reproduce
3. Your assistive technology (if applicable)
4. Browser and version
5. Screenshot or screen recording (if possible)

**Response Time:**
- Acknowledgment: Within 24 hours
- Initial response: Within 3 business days
- Fix timeline: Based on severity

### Issue Prioritization

**Priority 1 (Critical):**
- Blocks essential functionality
- Affects multiple users
- Violates WCAG 2.1 A or AA

**Priority 2 (High):**
- Affects usability
- Could be worked around
- Future compliance issue

**Priority 3 (Medium):**
- Minor inconvenience
- Enhancement opportunity
- Future improvement

### Bug Bounty

We offer a bug bounty for accessibility issues:
- **Critical**: $200-$500
- **High**: $100-$200
- **Medium**: $50-$100

## 📚 Resources

### Internal Resources

- [Accessibility Design Guidelines](https://design.sgomarket.com/accessibility)
- [Component Library](https://components.sgomarket.com)
- [Accessibility Test Suite](https://github.com/sgomarket/a11y-tests)

### External Resources

**WCAG Standards:**
- [WCAG 2.1 Specification](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)

**Best Practices:**
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

**Standards & Laws:**
- [ADA (Americans with Disabilities Act)](https://www.ada.gov/)
- [Section 508](https://www.section508.gov/)
- [EN 301 549](https://www.etsi.org/standards/en-301-549)

## 📋 Accessibility Statement

Steam Marketplace is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards.

**Conformance Status:**
- WCAG 2.1 Level AA: In Progress (Target: Q2 2024)
- Section 508: In Progress
- EN 301 549: In Progress

**Last Assessment:** January 15, 2024

**Assessment Methods:**
- Manual testing with screen readers
- Automated testing with axe-core
- User testing with people with disabilities
- Expert review

**Feedback:**
We welcome your feedback on the accessibility of Steam Marketplace. Please contact us at accessibility@sgomarket.com

## 🎓 Team Training

All team members receive accessibility training:

**Developers:**
- WCAG 2.1 principles
- Semantic HTML
- ARIA best practices
- Keyboard navigation
- Testing techniques

**Designers:**
- Color contrast
- Focus indicators
- Touch targets
- Information hierarchy
- Alternative text

**Product Managers:**
- Accessibility requirements
- User needs
- Legal compliance
- Testing processes

**Content Writers:**
- Plain language
- Alt text guidelines
- Link text
- Form labels
- Error messages

## 📊 Monitoring & Reporting

### Metrics We Track

- Accessibility violations (automated)
- User-reported issues
- Screen reader usage
- Keyboard navigation completion rates
- Time to fix accessibility bugs

### Monthly Reports

- Number of accessibility issues found
- Issues resolved
- New features with accessibility features
- Training completed
- User feedback summary

### Annual Review

- Full WCAG 2.1 AA audit
- Third-party accessibility assessment
- User testing with people with disabilities
- Accessibility roadmap for next year
- Team training needs assessment

## 🤝 Partnerships

We work with accessibility organizations:

- **WebAIM**: Training and resources
- **Deque Systems**: Testing tools
- **National Federation of the Blind**: User testing
- **Disability advocacy groups**: Consultation

## ✅ Compliance Checklist

### Level A Requirements
- [ ] 1.1.1 Non-text Content
- [ ] 1.2.1 Audio-only and Video-only
- [ ] 1.2.2 Captions
- [ ] 1.3.1 Info and Relationships
- [ ] 1.3.2 Meaningful Sequence
- [ ] 1.3.3 Sensory Characteristics
- [ ] 1.4.1 Use of Color
- [ ] 1.4.2 Audio Control
- [ ] 2.1.1 Keyboard
- [ ] 2.1.2 No Keyboard Trap
- [ ] 2.1.4 Character Key Shortcuts
- [ ] 2.2.1 Timing Adjustable
- [ ] 2.2.2 Pause, Stop, Hide
- [ ] 2.3.1 Three Flashes or Below Threshold
- [ ] 2.4.1 Bypass Blocks
- [ ] 2.4.2 Page Titled
- [ ] 2.4.3 Focus Order
- [ ] 2.4.4 Link Purpose (In Context)
- [ ] 3.1.1 Language of Page
- [ ] 3.2.1 On Focus
- [ ] 3.2.2 On Input
- [ ] 3.3.1 Error Identification
- [ ] 3.3.2 Labels or Instructions
- [ ] 4.1.1 Parsing
- [ ] 4.1.2 Name, Role, Value

### Level AA Requirements
- [ ] 1.3.4 Orientation
- [ ] 1.3.5 Identify Input Purpose
- [ ] 1.4.3 Minimum Contrast
- [ ] 1.4.4 Resize Text
- [ ] 1.4.5 Images of Text
- [ ] 2.4.5 Multiple Ways
- [ ] 2.4.6 Headings and Labels
- [ ] 2.4.7 Focus Visible
- [ ] 3.1.2 Language of Parts
- [ ] 3.2.3 Consistent Navigation
- [ ] 3.2.4 Consistent Identification
- [ ] 3.3.3 Error Suggestion
- [ ] 3.3.4 Error Prevention (Legal, Financial, Data)
- [ ] 4.1.3 Status Messages

## 🎯 Contact

For questions about accessibility:

**Email:** accessibility@sgomarket.com
**Slack:** #accessibility
**Documentation:** [https://docs.sgomarket.com/accessibility](https://docs.sgomarket.com/accessibility)

---

**Document Version:** 2.0.0
**Last Updated:** January 15, 2024
**Next Review:** April 15, 2024
**Approved By:** Accessibility Team, Product Team, Engineering Team
