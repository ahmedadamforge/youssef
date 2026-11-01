# CMC Robotics Lab TODO

## Circuit Tester first slice — in progress
- [x] Establish the robotics.ma-inspired dark, cyan, teal, orange, glassmorphism design tokens.
- [x] Create the Next.js + Tailwind CSS + Framer Motion project structure.
- [x] Add a dedicated Circuit Tester route as the initial web-only experience.
- [x] Use `navigator.serial` to request, connect, read from, and disconnect an Arduino or ESP32 USB serial port.
- [x] Provide a real-time terminal for received serial lines and sending AT commands or arbitrary commands.
- [x] Provide readable live sensor values and component test cards for servo, ultrasonic sensor, and LED workflows.
- [x] Show clear `Working`, `Faulty`, and `Awaiting signal` states derived from serial responses and test actions.
- [x] Create the Expo + NativeWind mobile source structure with inventory and member profile screens.

## Shared club platform — planned
- [ ] Build the responsive Home/Dashboard with the club logo, stats, upcoming events, and recent robotics projects.
- [ ] Build the Projects Showcase gallery with technical details, galleries, and detail views.
- [ ] Build the Events & Workshops calendar for training sessions, hackathons, and national competitions with registration.
- [ ] Add authenticated member sessions with Supabase or Firebase.
- [ ] Build the Inventory catalog for sensors, motors, microcontrollers, and other electronics, including availability and borrowing.
- [ ] Build Member Profile and Leaderboard screens with points, activity, and borrowing history.
- [ ] Initialize the managed Expo runtime and connect the mobile client to authentication and database services.
