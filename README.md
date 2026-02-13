# 🥭 Auto-Link Platform

**Auto-Link** is a production-grade coordination platform designed specifically for the Kenyan market. It simplifies group meetups, automates payment tracking through simulated M-Pesa flows, and ensures community accountability through unique identity rules.

## 🚀 Key Features

- **Unique Identity System**: Users register with a custom **Hcode** (e.g., `USER-77`), creating a unique fingerprint for every member.
- **Group Management**: Create communities or join them using unique `@handle` links.
- **Automated Meetups**: Initiation tools for admins to set locations (Hcodes), times, and per-head contributions.
- **Simulated M-Pesa Integration**: Mock STK Push flows to track who has paid before a meeting starts.
- **Advanced Meeting Closure**:
    - **Absentees**: Automatically track and notify members who paid but didn't show up.
    - **Goods Tracking**: Log consumption (e.g., drinks, items) during the event.
    - **AOPs (Any Other Partners)**: Invite guests who aren't on the platform yet.
- **AI-Powered Tools**: 
    - **SMS Generator**: Craft professional meeting invites using Gemini AI.
    - **Mango Assistant**: An embedded in-app helper to guide you through every feature.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Intelligence**: Google Gemini API (`gemini-3-pro-preview`)
- **Storage**: Browser LocalStorage (Persistent DB Simulation)
- **Communication**: Global Simulated Inbox (Mock Email/SMS system)

## 🚦 Getting Started

1. **Sign Up**: Register with your phone number and email. 
2. **Verify**: Check the **Mock Inbox** (top right) for your verification code.
3. **Join/Create**: Start a group and share the join link with your partners.
4. **Initiate**: Pick members, set a KES amount, and blast invites.
5. **Ask 🥭**: If you get stuck, tap the mango icon at the bottom right for instant guidance.

## 📝 Note for Reviewers
This application is a **high-fidelity prototype**. Payments and emails are simulated within the browser environment to allow for instant testing without requiring external API credits or banking certificates.

---
*Built for communities that value efficiency and accountability.*

<p align="center">
  <a href="#"><img src="https://github.com/Pantane1/nf/blob/main/public/ph.png" alt="ph-logo">
</p>

<p align="center">
  <a href="#"><img src="http://readme-typing-svg.herokuapp.com?color=ACAF50&center=true&vCenter=true&multiline=false&lines=LONG+LIVE+THE+NJAGI'S" alt="">
</p>
