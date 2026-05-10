# Sales Monitoring Mobile App

Mobile application for salesmen to log visits, register stores, and track sales performance. Built with React Native and Expo.

## Features

- **Store Registration**: Capture store location and photo.
- **Visit Logging**: Track check-in/out, orders, returns, and collections.
- **Stock Tracking**: View real-time stock levels.
- **Offline Support**: (Initial support) Local storage and synchronization.

## Setup

1. **Installation**:
   ```bash
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - `EXPO_PUBLIC_API_URL`: Your backend URL (e.g., `http://192.168.1.5:9000`).
   - `EXPO_PUBLIC_CHECKIN_RADIUS`: Maximum distance for check-in (in meters).

3. **Running**:
   ```bash
   npx expo start
   ```
   Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

## Tech Stack

- **Framework**: React Native / Expo
- **Router**: Expo Router
- **State Management**: React Context
- **Storage**: AsyncStorage
