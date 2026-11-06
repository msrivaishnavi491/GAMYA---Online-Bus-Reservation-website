CREATE DATABASE IF NOT EXISTS gamya;
USE gamya;

CREATE TABLE IF NOT EXISTS passengers (
  passenger_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS buses (
  bus_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_no VARCHAR(30) NOT NULL UNIQUE,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time TIME NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  CHECK (total_seats >= 1),
  CHECK (available_seats >= 0 AND available_seats <= total_seats)
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  passenger_id INT NOT NULL,
  bus_id INT NOT NULL,
  booking_date DATE NOT NULL,
  seat_no VARCHAR(10) NOT NULL,
  fare DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
  CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id)
    REFERENCES passengers(passenger_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_booking_bus FOREIGN KEY (bus_id)
    REFERENCES buses(bus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_bus_seat_date UNIQUE (bus_id, booking_date, seat_no)
);

-- Optional sample buses (run once; remove these INSERT statements if not needed)
INSERT IGNORE INTO buses (bus_no, source, destination, departure_time, total_seats, available_seats)
VALUES
('GAMYA-101','Hyderabad','Bengaluru','21:30:00',40,40),
('GAMYA-202','Kurnool','Hyderabad','08:00:00',36,36),
('GAMYA-303','Bengaluru','Chennai','22:15:00',40,40);
