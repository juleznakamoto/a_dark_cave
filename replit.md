# A Dark Cave - Text-Based Browser Game

## Overview

A Dark Cave is a text-based incremental browser game inspired by "A Dark Room". Players begin in a minimal state (lighting a fire) and progressively unlock resources, buildings, villagers, and world exploration. The game features a narrative-driven progression system where actions unlock new content and mechanics, creating an engaging idle/incremental gameplay experience.

The application is built as a single-page React application with persistent game state, real-time game loop mechanics, and a clean, text-focused interface that emphasizes storytelling and gradual feature revelation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **State Management**: Zustand for centralized game state management with simple, hook-based API
- **UI Framework**: Tailwind CSS for utility-first styling with shadcn/ui components for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite with Hot Module Replacement for development efficiency

### Game Engine Design
- **Game Loop**: RequestAnimationFrame-based tick system running at 200ms intervals for consistent game progression
- **State Persistence**: IndexedDB via `idb` library for reliable client-side save/load functionality with automatic saves every 30 seconds
- **Rule System**: Data-driven game mechanics defined in JSON-like structures for easy content expansion
- **Progressive Unlocking**: Flag-based system that reveals new content and mechanics as players progress

### Data Architecture
- **Game State Schema**: Zod-validated TypeScript schemas ensuring type safety across the application
- **Resource System**: Numeric tracking of materials (wood, food) with overflow protection
- **Building System**: Count-based structures that provide ongoing benefits
- **Story System**: Flag tracking for narrative progression and unlocked content
- **Version Management**: Save file versioning for future migration support

### Component Structure
- **Modular Design**: Separate panels for different game areas (Cave, Village, World) with conditional rendering
- **Responsive Layout**: Sidebar navigation with resource/tool displays and main content area
- **Action System**: Button-based interactions with requirement checking and effect application
- **Real-time Updates**: Components automatically re-render on state changes via Zustand subscriptions

### Backend Architecture
- **Server Framework**: Express.js with TypeScript for API endpoints and static file serving
- **Database Integration**: Drizzle ORM configured for PostgreSQL with Neon Database serverless connection
- **Development Setup**: Vite middleware integration for seamless full-stack development
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database for user data and potentially multiplayer features
- **Drizzle ORM**: Type-safe database queries with automatic migration support

### UI and Styling
- **Radix UI**: Headless component primitives for accessible, customizable UI elements
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Consistent icon library for interface elements

### Development Tools
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### Game-Specific Libraries
- **IndexedDB (idb)**: Client-side database for persistent game saves
- **React Hook Form**: Form handling with validation for potential user inputs
- **TanStack Query**: Server state management for API interactions
- **Date-fns**: Date manipulation for time-based game mechanics

### Development Environment
- **Replit Integration**: Custom Replit plugins for enhanced development experience
- **Vite Plugins**: Runtime error overlay and development tools
- **Font Integration**: Google Fonts (Inter, Crimson Text, Courier New) for typography hierarchy

## Development Rules

### Data Management
- **No Mock Data**: Never use hardcoded or mock data in this game. All data must be dynamically generated from the actual game state, rules, and definitions. Always use real game data from the state management system.

### Event System
- **No Event Creation**: Do not create events, log messages, or narrative elements without explicit instruction from the user. Focus only on mechanical aspects (resources, buildings, villagers) unless specifically asked to work on the event system.