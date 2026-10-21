const $ = (s) => document.querySelector(s);
const menuButton = $("#menuButton"), menuPanel = $("#menuPanel"), helpWidget = $("#helpWidget");
menuButton.addEventListener("click", () => { const open = menuPanel.classList.toggle("hidden") === false; menuButton.setAttribute("aria-expanded", String(open)); });
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) { menuPanel.classList.add("hidden"); menuButton.setAttribute("aria-expanded", "false"); } });
$("#helpMenuButton").addEventListener("click", () => { helpWidget.classList.remove("hidden"); menuPanel.classList.add("hidden"); $("#helpInput").focus(); });
$("#closeHelp").addEventListener("click", () => helpWidget.classList.add("hidden"));

const themeLabels = {
  en: { light: "☀ Light", dark: "🌙 Dark", blue: "🔵 Clinic Blue", pink: "🟣 Logo Colors" },
  hi: { light: "☀ हल्की थीम", dark: "🌙 डार्क थीम", blue: "🔵 क्लीनिक ब्लू", pink: "🟣 लोगो रंग" }
};
function setTheme(value) {
  document.body.classList.remove("dark", "theme-blue", "theme-pink");
  if (value === "dark") document.body.classList.add("dark");
  if (value === "blue") document.body.classList.add("theme-blue");
  if (value === "pink") document.body.classList.add("theme-pink");
  localStorage.setItem("devClinicTheme", value);
}
function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-en],[data-hi]").forEach(el => { const v = el.getAttribute("data-" + lang); if (v !== null) el.textContent = v; });
  document.querySelectorAll("[data-en-html],[data-hi-html]").forEach(el => { const v = el.getAttribute("data-" + lang + "-html"); if (v !== null) el.innerHTML = v; });
  document.querySelectorAll("#service option[data-en]").forEach(el => { el.textContent = el.getAttribute("data-" + lang) || el.textContent; });
  document.querySelectorAll("#language option").forEach(el => { el.textContent = el.value === "hi" ? "हिन्दी" : "English"; });
  [...$("#theme").options].forEach(o => { if (themeLabels[lang][o.value]) o.textContent = themeLabels[lang][o.value]; });
  $("#helpInput").placeholder = lang === "hi" ? "अपना सवाल लिखें…" : "Ask a question…";
  localStorage.setItem("devClinicLanguage", lang);
}
$("#language").value = localStorage.getItem("devClinicLanguage") || "en";
$("#theme").value = localStorage.getItem("devClinicTheme") || "light";
setLanguage($("#language").value); setTheme($("#theme").value);
$("#language").addEventListener("change", e => setLanguage(e.target.value));
$("#theme").addEventListener("change", e => setTheme(e.target.value));
$("#year").textContent = new Date().getFullYear();

$("#bookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const status = $("#bookingStatus"), button = e.submitter;

    status.className = "status";
    button.textContent = ($("#language").value === "hi") ? "अनुरोध भेजा जा रहा है..." : "Submitting your request...";
    button.disabled = true;

    // यहाँ सिंटैक्स को एकदम सही कर दिया गया है ताकि डेटा खाली न जाए
    const payload = {
        fullName: $("#name").value.trim(),
        email: $("#email").value.trim(),
        phone: $("#phone").value.trim(),
        services: $("#service").value,
        appointmentDate: $("#date").value,
        appointmentTime: $("#time").value,
        message: $("#notes") ? $("#notes").value.trim() : "",
        language: $("#language").value
    };

    try {
        const response = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Unable to submit request");

        status.className = "status success";
        status.textContent = ($("#language").value === "hi") ? "अपॉइंटमेंट सफलतापूर्वक सबमिट हो गया!" : "Appointment submitted successfully!";
        e.target.reset();
        
        // फॉर्म सबमिट होने के बाद थैंक यू पेज पर रीडायरेक्ट
        window.location.href = "thanks-for-appointment";

    } catch (err) {
        status.className = "status error";
        status.textContent = ($("#language").value === "hi") ? "त्रुटि: " + err.message : "Error: " + err.message;
    } finally {
        // एरर आने पर बटन को वापस चालू करने का लॉजिक
        button.disabled = false;
        button.textContent = ($("#language").value === "hi") ? "अनुरोध भेजें" : "Submit Request";
    }
});
function addChat(text, who) { const d = document.createElement("div"); d.className = who === "user" ? "user-message" : "bot-message"; d.textContent = text; $("#chatMessages").appendChild(d); $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight; }
$("#helpForm").addEventListener("submit", async e => {
  e.preventDefault(); const input = $("#helpInput"), question = input.value.trim(); if (!question) return; addChat(question, "user"); input.value = "";
  const pending = document.createElement("div"); pending.className = "bot-message"; pending.textContent = $("#language").value === "hi" ? "सोच रहा हूँ…" : "Thinking…"; $("#chatMessages").appendChild(pending);
  try { const r = await fetch("/api/help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, language: $("#language").value }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Help service unavailable"); pending.textContent = data.reply; }
  catch (err) { pending.textContent = $("#language").value === "hi" ? "AI सहायता अभी उपलब्ध नहीं है। आप फोन 73517 48010 या ईमेल devspeechandhearingclinic01@gmail.com पर संपर्क कर सकते हैं।" : "AI help is currently unavailable. Please call 73517 48010 or email devspeechandhearingclinic01@gmail.com."; }
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
});
