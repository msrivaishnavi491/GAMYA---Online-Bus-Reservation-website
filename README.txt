GAMYA — ONLINE BUS RESERVATION SYSTEM

FEATURES
• Professional multi-page responsive website. Every page includes a travel image.
• MySQL database named gamya with passengers, buses and bookings tables.
• Passenger CRUD: add, view, edit and delete.
• Bus CRUD: add, view, edit and delete schedules.
• Booking CRUD: reserve, view, cancel/reconfirm and delete.
• Dropdowns for passenger, bus, seat and booking status filters.
• Foreign keys connect bookings to passengers and buses.
• Seat availability is updated automatically when bookings are created/cancelled.
• No login/sign-in page, as requested.

REQUIREMENTS
1. Install Node.js (LTS).
2. Install MySQL Server and MySQL Workbench.
3. Open this GAMYA folder in VS Code.

DATABASE SETUP
1. Open MySQL Workbench and connect to your local MySQL server.
2. Open database.sql from this folder.
3. Execute the whole script (lightning icon).
4. In the SCHEMAS panel, refresh. You should see gamya with passengers, buses and bookings.

CONNECT YOUR MYSQL PASSWORD
1. In the project folder, copy .env.example and rename the copy to .env.
2. Open .env and set DB_PASSWORD to your actual MySQL root password.
   Example: DB_PASSWORD=YourPassword
   If your root account has no password, leave DB_PASSWORD= empty.
3. Do not type quotes around the password.

RUN THE WEBSITE
Open Terminal in the GAMYA folder and run:
   npm install
   npm start
Then open:
   http://localhost:4000

IMPORTANT
• Do not open the HTML file directly. Run the Node server and visit localhost:4000.
• Database name must be exactly gamya.
• If you see Access denied, verify DB_USER and DB_PASSWORD in .env.
• If port 4000 is busy, change PORT=4001 in .env and visit localhost:4001.
• Images are loaded from Unsplash, so internet is needed for images.
• This is an academic/demo application without authentication. The password field is stored as supplied for schema/demo compatibility. Do not use real passwords or deploy publicly without adding secure password hashing, authentication, authorization and validation.
• Passenger/bus rows referenced by bookings cannot be deleted because foreign keys use ON DELETE RESTRICT. Cancel or delete related bookings first.
