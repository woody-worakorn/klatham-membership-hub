# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript web application for Kla Tham Party (พรรคกล้าธรรม) membership registration system. The app allows public users to register for party membership and provides an admin panel to manage registrations.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Routing**: React Router DOM
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Database**: Firebase Realtime Database
- **File Storage**: Firebase Storage
- **Date Handling**: date-fns library
- **Package Manager**: pnpm (preferred)

## Architecture

### Core Structure
- `/src/pages/` - Main route components (Index, Admin, NotFound)
- `/src/components/` - Reusable components including MembershipForm and AdminPanel
- `/src/components/ui/` - shadcn/ui component library
- `/src/types/member.ts` - TypeScript interfaces for membership data
- `/src/lib/firebase.ts` - Firebase configuration and initialization
- `/src/hooks/` - Custom React hooks including useThaiAddress

### Key Features
1. **Public Registration Form** (`MembershipForm.tsx`)
   - Complex multi-step form with validation
   - Thai address lookup integration
   - Image upload for ID card and selfie with document
   - Age validation (18+ required)
   - ID card format validation (13 digits with dashes)

2. **Admin Panel** (`AdminPanel.tsx`)
   - Real-time member data management
   - Member status updates (pending/approved/rejected)
   - Export capabilities

### Firebase Integration
- Real-time database for member data storage
- Cloud storage for image uploads
- Configuration located in `src/lib/firebase.ts`

### Thai Address System
- Uses external APIs for provinces, districts, and sub-districts
- Auto-populates postal codes based on sub-district selection
- Custom hook `useThaiAddress` handles address data fetching

### Form Validation
- Zod schemas for type-safe validation
- Custom validation rules for Thai ID card format
- Date validations for age requirements and card expiry

### Styling Theme
- Primary color: #63D777 (green)
- Secondary color: #061C73 (navy blue)  
- Highlight color: #D7A43B (gold)
- Uses CSS custom properties and Tailwind classes

## Important Notes

- The project uses Thai language extensively in UI and validation messages
- All date inputs use react-date-picker with Thai locale support
- Image uploads are handled through custom ImageUpload component
- Real-time data synchronization with Firebase
- Package manager preference: pnpm > npm