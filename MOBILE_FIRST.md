# Mobile-First Implementation Guide

This document describes the mobile-first architecture and design approach implemented in My Skool Club v2.

## Overview

Both the mobile app (React Native/Expo) and web frontend (React/Vite) have been designed with a **mobile-first approach**, prioritizing touch-friendly interfaces, responsive layouts, and optimal performance on mobile devices.

## Mobile App (React Native/Expo)

### Location
`/mobile/`

### Key Features

#### 1. **Native Mobile Experience**
- Built with React Native 0.74.5 and Expo 51
- Material Design components via react-native-paper
- Native navigation with expo-router
- Optimized for iOS and Android

#### 2. **Authentication Flow**
- **Login Screen** (`app/(auth)/login.js`): Clean, touch-friendly login form
- **Register Screen** (`app/(auth)/register.js`): Multi-step registration with validation
- Secure token storage with AsyncStorage
- Auto-redirect based on auth state

#### 3. **Main Navigation**
- **Tab-based navigation** for primary screens:
  - Home: Welcome dashboard with quick actions
  - Schools: Browse and join schools
  - Clubs: Manage club memberships
  - Profile: User settings and logout
- Bottom tab bar (iOS/Android standard)
- Icon-based navigation for better mobile UX

#### 4. **Mobile-Optimized Components**
- **Touch targets**: Minimum 44x44pt (iOS), 48x48dp (Android)
- **Gesture support**: Pull-to-refresh, swipe gestures
- **Keyboard handling**: KeyboardAvoidingView for form inputs
- **Safe areas**: respects notches and home indicators
- **Loading states**: Spinners and skeleton screens
- **Error handling**: Snackbar notifications

#### 5. **API Integration**
- Centralized API service (`services/api.js`)
- JWT authentication with automatic token injection
- Development mode: `http://localhost:8080/api`
- Production mode: configurable API URL
- Axios interceptors for error handling

### Running the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Web Frontend (React/Vite)

### Location
`/frontend/`

### Key Features

#### 1. **Mobile-First Responsive Design**
- Built with Tailwind CSS utility-first framework
- Breakpoint hierarchy:
  - Mobile: < 640px (default)
  - Tablet: 640px - 1024px (`sm:`, `md:`)
  - Desktop: > 1024px (`lg:`, `xl:`)
- Fluid typography and spacing
- Touch-friendly interactive elements

#### 2. **Responsive Navigation**
- **Desktop**: Horizontal nav bar in header
- **Mobile**:
  - Hamburger menu in header
  - Fixed bottom navigation bar (iOS/Android pattern)
- Adaptive layout based on viewport size

#### 3. **Authentication Pages**
- **Login** (`src/pages/Login.jsx`):
  - Centered card layout
  - Gradient background
  - Mobile-optimized form inputs
  - Show/hide password toggle
- **Register** (`src/pages/Register.jsx`):
  - Multi-field registration
  - Responsive grid layout (1 col mobile, 2 col desktop)
  - Client-side validation

#### 4. **Main Application Pages**
- **Home** (`src/pages/Home.jsx`):
  - Welcome card with hero message
  - Quick action grid (2 cols mobile, 4 cols desktop)
  - Recent activity feed
- **Schools** (`src/pages/Schools.jsx`):
  - Responsive card grid
  - Empty state with clear CTA
  - Pull-to-refresh equivalent
- **Clubs** (`src/pages/Clubs.jsx`):
  - Similar layout to Schools
  - Contextual empty states
- **Profile** (`src/pages/Profile.jsx`):
  - Centered layout (max-width constraint)
  - Settings menu with touch-friendly buttons
  - Logout functionality

#### 5. **Mobile-First CSS Utilities**
```css
/* Tailwind utility examples */
.px-4 sm:px-6 lg:px-8  /* Progressive padding */
.text-sm sm:text-base lg:text-lg  /* Responsive font sizes */
.grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4  /* Responsive grids */
.flex-col sm:flex-row  /* Adaptive flex direction */
.w-full sm:w-auto  /* Full width on mobile, auto on desktop */
```

### Running the Web Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to :8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Mobile-First Design Principles Applied

### 1. **Touch-Friendly Interactions**
- Minimum 44px touch targets
- Ample spacing between interactive elements
- Large, clear buttons and links
- No hover-dependent UI elements

### 2. **Progressive Enhancement**
- Core functionality works on smallest screens
- Enhanced layouts for larger viewports
- Graceful degradation for older devices

### 3. **Performance Optimization**
- Mobile-sized assets by default
- Lazy loading for off-screen content
- Minimal JavaScript for initial render
- Efficient re-renders with React best practices

### 4. **Content Prioritization**
- Most important content visible first
- Progressive disclosure of complex features
- Simplified navigation on small screens
- Clear visual hierarchy

### 5. **Responsive Typography**
```css
/* Mobile-first scale */
h1: text-2xl sm:text-3xl lg:text-4xl
h2: text-xl sm:text-2xl lg:text-3xl
body: text-sm sm:text-base
```

### 6. **Adaptive Layouts**
```css
/* Stack on mobile, grid on desktop */
.grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

/* Full width on mobile, constrained on desktop */
.w-full max-w-md mx-auto

/* Vertical on mobile, horizontal on desktop */
.flex flex-col sm:flex-row
```

## API Integration

Both mobile and web share the same backend API endpoints:

### Base URL
- **Development**: `http://localhost:8080/api`
- **Production**: `https://api.myskoolclub.com/api` (configurable)

### Authentication
- JWT tokens stored in:
  - Mobile: AsyncStorage
  - Web: localStorage
- Automatic token injection via interceptors
- 401 response triggers logout and redirect

### Key Endpoints
```
POST /api/auth/register
POST /api/auth/login
GET  /api/schools
GET  /api/schools/{id}
POST /api/schools/{id}/memberships/request
GET  /api/schools/{schoolId}/clubs
POST /api/schools/{schoolId}/clubs
GET  /api/clubs/{clubId}
POST /api/clubs/{clubId}/memberships/request
GET  /api/notifications
```

## Testing Mobile-First Design

### Mobile App Testing
1. **iOS Simulator**: Use Xcode Simulator
2. **Android Emulator**: Use Android Studio AVD
3. **Physical devices**: Scan QR code from Expo dev server
4. **Different screen sizes**: Test on various simulators

### Web Frontend Testing
1. **Chrome DevTools**:
   - Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
   - Test responsive breakpoints
   - Throttle network to simulate 3G/4G
2. **Browser testing**:
   - Resize browser window
   - Test at 375px (iPhone), 768px (iPad), 1024px+ (desktop)
3. **Real devices**:
   - Access via network IP (e.g., http://192.168.1.100:3000)
   - Test touch interactions

## Development Workflow

### 1. Start Backend
```bash
./scripts/dev.sh
```

### 2. Start Mobile App
```bash
cd mobile && npm start
```

### 3. Start Web Frontend
```bash
cd frontend && npm run dev
```

### 4. Test Full Stack
- Mobile app connects to `http://localhost:8080/api`
- Web frontend proxies `/api` to `http://localhost:8080`
- Both use same JWT authentication

## Next Steps

### Mobile App Enhancements
- [ ] Add push notifications
- [ ] Implement deep linking
- [ ] Add offline support
- [ ] Optimize images and assets
- [ ] Add haptic feedback
- [ ] Implement pull-to-refresh
- [ ] Add loading skeletons

### Web Frontend Enhancements
- [ ] Add PWA support
- [ ] Implement service worker
- [ ] Add offline indicators
- [ ] Optimize bundle size
- [ ] Add accessibility features
- [ ] Implement dark mode
- [ ] Add animations and transitions

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Mobile-First Design](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
