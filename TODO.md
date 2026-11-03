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
- [x] Add authenticated member sessions with local/MySQL storage and server-enforced admin/user roles.
- [ ] Integrate a managed identity provider if required for future deployment.
- [x] Build the Inventory catalog for sensors, motors, microcontrollers, and other electronics, including availability and borrowing.
- [ ] Build Member Profile and Leaderboard screens with points, activity, and borrowing history.
- [ ] Initialize the managed Expo runtime and connect the mobile client to authentication and database services.

## Inventory usability completion
- [x] Apply the selected dark catalog with horizontal navigation and responsive product grid.
- [x] Keep QR labels and stock controls in each item's action menu.
- [x] Remove fictional member and project shortcuts from borrowing.
- [x] Default loan equipment to untested until the operator confirms its condition.
- [x] Show failed returns and clipboard errors in the interface.
- [x] Prevent older refresh responses from overwriting newer inventory changes.
- [x] Support keyboard navigation between catalog and loans.
- [x] Fit loan and QR dialogs on small screens.

## Add material form completion
- [x] In « Ajouter du matériel », provide a descending list of robotics and electronics material types, including sensors, motors, boards, drivers, power, prototyping, communication, displays, actuators, mechanics, connectors, tools, hardware, and ESD protection.
- [x] In « Ajouter du matériel », provide a named descending illustration list covering the 16 inventory visuals already available in `public/inventory`, with a preview and an optional custom image URL.
