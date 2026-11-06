const path = require('path');

require('dotenv').config({
    path: path.join(__dirname, '.env')
});

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'gamya',
    waitForConnections: true,
    connectionLimit: 10
});

console.log(
    'Environment file loaded:',
    !!process.env.DB_PASSWORD
);


app.get("/api/health", async (req, res) => {
  try { await pool.query("SELECT 1"); res.json({ok:true, database:"gamya"}); }
  catch (e) { res.status(500).json({ok:false, error:e.message}); }
});
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

// Dashboard
app.get("/api/stats", asyncRoute(async (req,res) => {
  const [[p]] = await pool.query("SELECT COUNT(*) total FROM passengers");
  const [[b]] = await pool.query("SELECT COUNT(*) total, COALESCE(SUM(available_seats),0) seats FROM buses");
  const [[k]] = await pool.query("SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status='Confirmed' THEN 1 ELSE 0 END),0) confirmed FROM bookings");
  res.json({passengers:p.total,buses:b.total,availableSeats:b.seats,bookings:k.total,confirmed:k.confirmed});
}));

// Passengers CRUD
app.get("/api/passengers", asyncRoute(async (req,res) => {
  const [rows] = await pool.query("SELECT passenger_id,name,email,phone FROM passengers ORDER BY passenger_id DESC");
  res.json(rows);
}));
app.post("/api/passengers", asyncRoute(async (req,res) => {
  const {name,email,phone,password} = req.body;
  if (![name,email,phone,password].every(v => String(v||"").trim())) return res.status(400).json({message:"Please complete all passenger fields."});
  const [r] = await pool.query("INSERT INTO passengers(name,email,phone,password) VALUES(?,?,?,?)",[name.trim(),email.trim(),phone.trim(),password]);
  res.status(201).json({message:"Passenger added.",id:r.insertId});
}));
app.put("/api/passengers/:id", asyncRoute(async (req,res) => {
  const {name,email,phone,password} = req.body;
  if (![name,email,phone].every(v => String(v||"").trim())) return res.status(400).json({message:"Name, email and phone are required."});
  const fields = [name.trim(),email.trim(),phone.trim()];
  let sql = "UPDATE passengers SET name=?,email=?,phone=?";
  if (password) { sql += ",password=?"; fields.push(password); }
  sql += " WHERE passenger_id=?"; fields.push(req.params.id);
  const [r] = await pool.query(sql,fields);
  if (!r.affectedRows) return res.status(404).json({message:"Passenger not found."});
  res.json({message:"Passenger updated."});
}));
app.delete("/api/passengers/:id", asyncRoute(async (req,res) => {
  const [r] = await pool.query("DELETE FROM passengers WHERE passenger_id=?",[req.params.id]);
  if (!r.affectedRows) return res.status(404).json({message:"Passenger not found."});
  res.json({message:"Passenger deleted."});
}));

// Buses CRUD
app.get("/api/buses", asyncRoute(async (req,res) => {
  const {source,destination,search} = req.query;
  let sql = "SELECT * FROM buses WHERE 1=1", vals=[];
  if(source){sql+=" AND source LIKE ?";vals.push(`%${source}%`);}
  if(destination){sql+=" AND destination LIKE ?";vals.push(`%${destination}%`);}
  if(search){sql+=" AND (bus_no LIKE ? OR source LIKE ? OR destination LIKE ?)";vals.push(`%${search}%`,`%${search}%`,`%${search}%`);}
  sql+=" ORDER BY departure_time";
  const [rows]=await pool.query(sql,vals); res.json(rows);
}));
app.post("/api/buses", asyncRoute(async (req,res) => {
  const {bus_no,source,destination,departure_time,total_seats,available_seats}=req.body;
  const total=Number(total_seats), available=available_seats===""||available_seats==null?total:Number(available_seats);
  if(![bus_no,source,destination,departure_time].every(v=>String(v||"").trim()) || !Number.isInteger(total)||total<1||!Number.isInteger(available)||available<0||available>total)
    return res.status(400).json({message:"Enter valid bus details and seat counts."});
  const [r]=await pool.query("INSERT INTO buses(bus_no,source,destination,departure_time,total_seats,available_seats) VALUES(?,?,?,?,?,?)",[bus_no.trim(),source.trim(),destination.trim(),departure_time,total,available]);
  res.status(201).json({message:"Bus added successfully.",id:r.insertId});
}));
app.put("/api/buses/:id", asyncRoute(async (req,res) => {
  const {bus_no,source,destination,departure_time,total_seats,available_seats}=req.body;
  const total=Number(total_seats), available=Number(available_seats);
  if(![bus_no,source,destination,departure_time].every(v=>String(v||"").trim()) || !Number.isInteger(total)||total<1||!Number.isInteger(available)||available<0||available>total)
    return res.status(400).json({message:"Enter valid bus details and seat counts."});
  const [r]=await pool.query("UPDATE buses SET bus_no=?,source=?,destination=?,departure_time=?,total_seats=?,available_seats=? WHERE bus_id=?",[bus_no.trim(),source.trim(),destination.trim(),departure_time,total,available,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({message:"Bus not found."});
  res.json({message:"Bus schedule updated."});
}));
app.delete("/api/buses/:id", asyncRoute(async (req,res) => {
  const [r]=await pool.query("DELETE FROM buses WHERE bus_id=?",[req.params.id]);
  if(!r.affectedRows) return res.status(404).json({message:"Bus not found."});
  res.json({message:"Bus deleted."});
}));

// Booking list/create/cancel/update/delete
app.get("/api/bookings", asyncRoute(async (req,res) => {
  const [rows]=await pool.query(`SELECT k.*,p.name passenger_name,p.phone,b.bus_no,b.source,b.destination,b.departure_time
    FROM bookings k JOIN passengers p ON p.passenger_id=k.passenger_id
    JOIN buses b ON b.bus_id=k.bus_id ORDER BY k.booking_id DESC`);
  res.json(rows);
}));
app.post("/api/bookings", asyncRoute(async (req,res) => {
  const {passenger_id,bus_id,booking_date,seat_no,fare}=req.body;
  if(!passenger_id||!bus_id||!booking_date||!seat_no||!Number.isFinite(Number(fare))||Number(fare)<0)
    return res.status(400).json({message:"Complete all booking details."});
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [buses]=await conn.query("SELECT * FROM buses WHERE bus_id=? FOR UPDATE",[bus_id]);
    if(!buses.length) throw new Error("Selected bus does not exist.");
    const bus=buses[0];
    if(bus.available_seats<1) throw new Error("No seats are currently available on this bus.");
    const [existing]=await conn.query("SELECT booking_id FROM bookings WHERE bus_id=? AND booking_date=? AND seat_no=? AND status='Confirmed'",[bus_id,booking_date,seat_no]);
    if(existing.length) throw new Error("This seat is already booked for the selected date.");
    await conn.query("INSERT INTO bookings(passenger_id,bus_id,booking_date,seat_no,fare,status) VALUES(?,?,?,?,?,'Confirmed')",[passenger_id,bus_id,booking_date,seat_no,Number(fare)]);
    await conn.query("UPDATE buses SET available_seats=available_seats-1 WHERE bus_id=?",[bus_id]);
    await conn.commit(); res.status(201).json({message:"Seat reserved successfully."});
  } catch(e) { await conn.rollback(); res.status(400).json({message:e.message}); }
  finally {conn.release();}
}));
app.put("/api/bookings/:id", asyncRoute(async (req,res) => {
  const {status}=req.body;
  if(!["Confirmed","Cancelled"].includes(status)) return res.status(400).json({message:"Invalid booking status."});
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.query("SELECT * FROM bookings WHERE booking_id=? FOR UPDATE",[req.params.id]);
    if(!rows.length) throw new Error("Booking not found.");
    const old=rows[0];
    if(old.status!==status) {
      if(status==="Cancelled") await conn.query("UPDATE buses SET available_seats=LEAST(total_seats,available_seats+1) WHERE bus_id=?",[old.bus_id]);
      else {
        const [b]=await conn.query("SELECT available_seats FROM buses WHERE bus_id=? FOR UPDATE",[old.bus_id]);
        if(!b.length||b[0].available_seats<1) throw new Error("No available seats to reconfirm this booking.");
        await conn.query("UPDATE buses SET available_seats=available_seats-1 WHERE bus_id=?",[old.bus_id]);
      }
      await conn.query("UPDATE bookings SET status=? WHERE booking_id=?",[status,req.params.id]);
    }
    await conn.commit(); res.json({message:`Booking ${status.toLowerCase()}.`});
  } catch(e){await conn.rollback();res.status(400).json({message:e.message});}
  finally{conn.release();}
}));
app.delete("/api/bookings/:id", asyncRoute(async (req,res) => {
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.query("SELECT * FROM bookings WHERE booking_id=? FOR UPDATE",[req.params.id]);
    if(!rows.length) throw new Error("Booking not found.");
    if(rows[0].status==="Confirmed") await conn.query("UPDATE buses SET available_seats=LEAST(total_seats,available_seats+1) WHERE bus_id=?",[rows[0].bus_id]);
    await conn.query("DELETE FROM bookings WHERE booking_id=?",[req.params.id]);
    await conn.commit();res.json({message:"Booking record deleted."});
  } catch(e){await conn.rollback();res.status(400).json({message:e.message});}
  finally{conn.release();}
}));

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.use((err,req,res,next)=>{console.error(err);res.status(err.code==="ER_DUP_ENTRY"?409:500).json({message:err.code==="ER_DUP_ENTRY"?"That value already exists. Check for duplicate bus number, email or seat.":err.message||"Server error"});});
const PORT = 3000;
app.listen(PORT,()=>console.log(`GAMYA is running at http://localhost:${PORT}`));
