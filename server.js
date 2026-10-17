require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "appointments.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS appointments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
 service TEXT NOT NULL, preferred_date TEXT, preferred_time TEXT, notes TEXT,
 language TEXT DEFAULT 'en', status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], imgSrc: ["'self'", "data:"], styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"], connectSrc: ["'self'"], upgradeInsecureRequests: []
}}}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: "draft-7", legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

const emailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.CLINIC_EMAIL);
async function sendAppointmentEmail(appointment) {
 if (!emailConfigured()) return { sent: false, reason: "SMTP is not configured" };
 const transporter = nodemailer.createTransport({
   host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
   secure: String(process.env.SMTP_SECURE || "false") === "true",
   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
 });
 const clinicEmail = process.env.CLINIC_EMAIL || "devspeechandhearingclinic01@gmail.com";
 const subject = `New appointment request #${appointment.id} — ${appointment.name}`;
 const text = `A new appointment request was submitted.\n\nReference: ${appointment.id}\nName: ${appointment.name}\nEmail: ${appointment.email}\nPhone: ${appointment.phone}\nService: ${appointment.service}\nPreferred date: ${appointment.preferred_date || "Not selected"}\nPreferred time: ${appointment.preferred_time || "Not selected"}\nNotes: ${appointment.notes || "None"}\nReceived: ${appointment.created_at}\n\nReply directly to the patient's email if appropriate.`;
 await transporter.sendMail({
   from: process.env.MAIL_FROM || process.env.SMTP_USER,
   to: clinicEmail, replyTo: appointment.email, subject, text
 });
 return { sent: true };
}
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function clean(v, max=1500) { return typeof v === "string" ? v.trim().slice(0,max) : ""; }

app.post("/api/appointments", async (req,res) => {
 const name=clean(req.body.name,100), email=clean(req.body.email,254), phone=clean(req.body.phone,30);
 const service=clean(req.body.service,100), date=clean(req.body.date,10), time=clean(req.body.time,8);
 const notes=clean(req.body.notes,1500), language=req.body.language==="hi"?"hi":"en";
 if(!name || !validEmail(email) || !phone || !/^[0-9+() -]{10,18}$/.test(phone) || !service) {
   return res.status(400).json({error:"Please provide a valid name, email, phone number and service."});
 }
 if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({error:"Invalid preferred date."});
 if(time && !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({error:"Invalid preferred time."});
 const result=db.prepare(`INSERT INTO appointments(name,email,phone,service,preferred_date,preferred_time,notes,language)
 VALUES(?,?,?,?,?,?,?,?)`).run(name,email,phone,service,date,time,notes,language);
 const appointment=db.prepare("SELECT id,name,email,phone,service,preferred_date,preferred_time,notes,language,status,created_at FROM appointments WHERE id=?").get(result.lastInsertRowid);
 let emailSent=false;
 try { emailSent=(await sendAppointmentEmail(appointment)) }
 catch(err) { console.error("Appointment email error:",err.message); }
  //Do not claim email sent if SMTP isn't configured. The request remains stored in SQLite.
 res.status(201).json({ok:true,id:appointment.id,emailSent,message:emailSent?"Appointment saved and email sent.":"Appointment saved; email delivery is not configured or failed."});
});

const clinicInfo = `DEV Speech & Hearing Clinic. Services: hearing tests, hearing-aid guidance/support, and speech therapy. Phone: 73517 48010 or 63953 19576. Email: devspeechandhearingclinic01@gmail.com. Address: Opp. I Crest Showroom, Civil Lines, Near Temptation Bakery, Pili Kothi, Moradabad – 244001, Uttar Pradesh. Appointments are requests and are not confirmed until the clinic confirms them.`;
app.post("/api/help", async (req,res) => {
 const message=clean(req.body.message,1000), language=req.body.language==="hi"?"hi":"en";
 if(!message) return res.status(400).json({error:"Please enter a question."});
 if(!process.env.OPENAI_API_KEY) {
   const m=message.toLowerCase();
   let reply;
   if(/address|location|पता|कहाँ|कहां/.test(m)) reply=language==="hi"?"क्लीनिक का पता: I Crest Showroom के सामने, Civil Lines, Temptation Bakery के पास, Pili Kothi, Moradabad – 244001, उत्तर प्रदेश। Google Maps लिंक वेबसाइट के Contact सेक्शन में है।":"Our address is Opp. I Crest Showroom, Civil Lines, near Temptation Bakery, Pili Kothi, Moradabad – 244001, Uttar Pradesh. Use the Google Maps link in Contact.";
   else if(/appointment|book|booking|अपॉइंटमेंट|बुक/.test(m)) reply=language==="hi"?"अपॉइंटमेंट के लिए वेबसाइट का फॉर्म भरें। नाम, ईमेल, मोबाइल नंबर और सेवा देना आवश्यक है। अनुरोध मिलने के बाद क्लीनिक पुष्टि करेगा।":"Please fill in the appointment form. Name, email, phone and service are required. The clinic will confirm your request separately.";
   else if(/phone|call|contact|number|फोन|नंबर|संपर्क/.test(m)) reply=language==="hi"?"फोन: 73517 48010 या 63953 19576। ईमेल: devspeechandhearingclinic01@gmail.com।":"Phone: 73517 48010 or 63953 19576. Email: devspeechandhearingclinic01@gmail.com.";
   else if(/service|hearing|speech|therapy|सेवा|सुनने|बोलने|थेरेपी/.test(m)) reply=language==="hi"?"क्लीनिक की मुख्य सेवाएँ Hearing Test, Hearing Aid Support और Speech Therapy हैं। अपनी ज़रूरत बताने या अपॉइंटमेंट के लिए फॉर्म भरें।":"Our listed services are Hearing Test, Hearing Aid Support and Speech Therapy. Please use the appointment form or call the clinic to discuss your needs.";
   else reply=language==="hi"?"मैं क्लीनिक की सेवाओं, पते, फोन नंबर और अपॉइंटमेंट प्रक्रिया में मदद कर सकता हूँ। अधिक जानकारी के लिए 73517 48010 पर कॉल करें या devspeechandhearingclinic01@gmail.com पर ईमेल करें।":"I can help with clinic services, address, phone numbers and appointment steps. For more information, call 73517 48010 or email devspeechandhearingclinic01@gmail.com.";
   return res.json({reply,mode:"clinic-faq"});
 }
 try {
   // OpenAI API is called server-side; the API key is never sent to the browser.
   const response=await fetch("https://api.openai.com/v1/chat/completions", {
     method:"POST", headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
     body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:0.3,max_tokens:350,messages:[
       {role:"system",content:`You are the website help assistant for DEV Speech & Hearing Clinic. Reply in ${language==="hi"?"Hindi":"English"}. Use only clinic information below for factual clinic claims. Help with services, address, contact and how to request an appointment. Do not diagnose, prescribe, promise clinical outcomes, or present yourself as a doctor. For urgent symptoms, sudden hearing loss, or emergencies, advise immediate professional medical care. Do not claim an appointment is confirmed; the clinic must confirm it. Clinic information: ${clinicInfo}`},
       {role:"user",content:message}
     ]})
   });
   if(!response.ok) throw new Error(`AI provider status ${response.status}`);
   const data=await response.json();
   const reply=data.choices?.[0]?.message?.content?.trim();
   if(!reply) throw new Error("Empty AI reply");
   res.json({reply,mode:"ai"});
 } catch(err) {
   console.error("AI help error:",err.message);
   res.status(503).json({error:"AI help is temporarily unavailable."});
 }
});

// Minimal admin endpoint: protect it with a long ADMIN_TOKEN. Do not deploy without changing it.
app.get("/api/admin/appointments", (req,res) => {
 const token=process.env.ADMIN_TOKEN;
 if(!token || req.get("x-admin-token")!==token) return res.status(401).json({error:"Unauthorized"});
 const rows=db.prepare("SELECT id,name,email,phone,service,preferred_date,preferred_time,notes,status,created_at FROM appointments ORDER BY id DESC LIMIT 500").all();
 res.json({appointments:rows});
});
app.patch("/api/admin/appointments/:id", (req,res) => {
 const token=process.env.ADMIN_TOKEN;
 if(!token || req.get("x-admin-token")!==token) return res.status(401).json({error:"Unauthorized"});
 const status=clean(req.body.status,20);
 if(!["new","confirmed","cancelled","completed"].includes(status)) return res.status(400).json({error:"Invalid status"});
 const result=db.prepare("UPDATE appointments SET status=? WHERE id=?").run(status,Number(req.params.id));
 if(!result.changes) return res.status(404).json({error:"Appointment not found"});
 res.json({ok:true});
});
app.get("/api/health", (req,res)=>res.json({ok:true}));
app.get("*", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`DEV Clinic website listening on http://localhost:${PORT}`));
