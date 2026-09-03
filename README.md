# 🔍 FindMe - Reuniting Families


**FindMe** is a secure, community-driven web platform dedicated to reuniting Kenyan families with missing loved ones. Born from a personal experience, the platform connects reporters directly with community members, providing a centralized, verified, and efficient way to share missing person reports and submit tips.

> *"No family should have to face the trauma of a missing loved one alone. With technology and community spirit, we can bring people home."* – **Brian Njuguna, Founder & CEO**

---

## 🌟 Key Features

### 👥 For Community Members
- **Secure Reporting:** Post missing person details with photos, location, and urgency levels.
- **Anti-Spam Protection:** Simulated M-Pesa payment gateway (KES 50) ensures all reports are genuine and prevents platform abuse.
- **Advanced Filtering:** Search and filter reports by status (Urgent, Missing, Found, Pending) and Kenyan County.
- **Anonymous Tips:** Submit crucial information to reporters securely and optionally anonymously.
- **Printable Flyers:** Generate and print professional, status-aware (Missing/Found) PDF flyers instantly.
- **One-Click Sharing:** Optimized sharing to WhatsApp and other social platforms to maximize reach.

### 🛡️ For Administrators
- **Verification Workflow:** All "Found" reports require admin approval before going public, maintaining platform trust.
- **Analytics Dashboard:** Visual representation of reports by status.
- **User & Content Management:** Promote/revoke admin roles, manage testimonials, and view a complete audit log of admin actions.
- **Tip Moderation:** View and manage tips submitted for specific cases.

### 🎨 UI/UX Enhancements
- Fully responsive design (Mobile, Tablet, Desktop).
- Smooth scroll-reveal animations and micro-interactions.
- Glassmorphism effects and modern gradient theming.
- Accessible focus states and reduced-motion support.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+)
- **Backend & Database:** (PostgreSQL, Authentication, Row Level Security)
- **Storage:** Supabase Storage (for profile, missing person, and testimonial images)
- **Icons & Fonts:** Font Awesome 6, Google Fonts (Inter)
- **Deployment Ready:** Static hosting compatible (Netlify, )

---

## 📂 Project Structure

```text
find-them/
├── index.html                 # Main landing page and dashboard
├── login.html                 # User authentication (Login)
├── register.html              # User registration
├── env.js                     # Supabase environment variables (URL & Anon Key)
├── css/
│   └── styles.css             # Complete styling, animations, and responsive rules
├── js/
│   ├── app.js                 # Core application logic, UI rendering, and Supabase queries
│   ├── auth.js                # Authentication helper functions
│   └── env.js                 # client initialization
└── public/
    └── brian.jpeg             # Founder's image for the About page