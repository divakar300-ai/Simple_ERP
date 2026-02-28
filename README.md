# SimpleERP - Enterprise Resource Planning System

A modern, full-featured ERP web application built as a capstone project demonstrating proficiency across multiple technologies.

## Live Demo

🔗 **[View Live Application](https://YOUR_GITHUB_USERNAME.github.io/Simple_ERP/)**

### Demo Credentials
After setting up Firebase, register a new account or use the "Load Demo Data" button on the Dashboard to populate sample data.

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | Frontend UI framework with hooks and context API |
| **React Router v6** | Client-side routing with nested layouts |
| **Firebase Auth** | User authentication with role-based access control |
| **Firebase Firestore** | NoSQL cloud database for all ERP data |
| **Recharts** | Data visualization (area charts, pie charts) |
| **Tailwind CSS** | Utility-first CSS framework for responsive design |
| **Vite** | Next-generation frontend build tool |
| **GitHub Actions** | CI/CD pipeline for automated deployment |
| **GitHub Pages** | Static site hosting |

## Features

### Authentication & Authorization
- Email/password registration and login
- Role-based access control (Admin / Employee)
- Admins: full CRUD access across all modules
- Employees: read-only access with restricted actions
- Persistent sessions via Firebase Auth

### Dashboard
- Real-time KPI cards (Revenue, Orders, Products, Customers)
- Revenue trend area chart (7-month view)
- Order status distribution pie chart
- Recent orders table
- Low stock alerts
- One-click demo data seeding

### Inventory Management
- Product catalog with SKU tracking
- Category-based organization
- Stock level monitoring with visual indicators
- Low stock alerts (highlighted in red)
- Active/Inactive status management

### Sales & Orders
- Order creation with auto-generated order numbers
- Order status tracking (Pending → Processing → Shipped → Delivered)
- Payment status management (Paid / Unpaid / Partial)
- Customer-linked orders

### Customer Management
- Customer directory with contact details
- Company association
- Order history tracking
- Total spend analytics

### Supplier Management
- Supplier directory with contact information
- Product supply tracking
- 5-star rating system
- Company profiles

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** and follow the wizard
3. Once created, go to **Project Settings > General**
4. Scroll to **"Your apps"** and click the Web icon (`</>`)
5. Register your app and copy the config values

### 2. Enable Firebase Services

**Authentication:**
1. In Firebase Console, go to **Authentication > Sign-in method**
2. Enable **Email/Password** provider

**Firestore Database:**
1. Go to **Firestore Database > Create database**
2. Start in **test mode** (for development)
3. Choose a location closest to you

**Firestore Security Rules** (for production, update rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in your Firebase config values:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. Install & Run Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 5. Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings > Pages > Source** and select **GitHub Actions**
3. Add your Firebase config as **Repository Secrets**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Push to `main` branch — GitHub Actions will build and deploy automatically

## Project Structure

```
Simple_ERP/
├── .github/workflows/    # CI/CD pipeline
│   └── deploy.yml
├── src/
│   ├── components/
│   │   ├── Auth/         # Login & Registration
│   │   ├── Dashboard/    # KPI cards & charts
│   │   ├── Inventory/    # Product management
│   │   ├── Sales/        # Order management
│   │   ├── Customers/    # Customer directory
│   │   ├── Suppliers/    # Supplier directory
│   │   └── Layout/       # Sidebar, Header, AppLayout
│   ├── contexts/
│   │   └── AuthContext.jsx  # Auth state management
│   ├── firebase/
│   │   ├── config.js     # Firebase initialization
│   │   └── seed.js       # Demo data seeder
│   ├── App.jsx           # Routes & protected routes
│   ├── main.jsx          # Entry point
│   └── index.css         # Tailwind & custom styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Architecture

- **Frontend**: React SPA with component-based architecture
- **State Management**: React Context API for auth, local state for modules
- **Database**: Firebase Firestore (NoSQL document database)
- **Authentication**: Firebase Auth with custom role claims stored in Firestore
- **Routing**: React Router v6 with nested layouts and route protection
- **Styling**: Tailwind CSS utility classes with custom component classes
- **Build**: Vite with HMR for development, optimized production builds
- **Deployment**: GitHub Actions CI/CD → GitHub Pages

## License

This project was created as a capstone project for educational purposes.
