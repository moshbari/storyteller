const fs = require("fs");
let f = fs.readFileSync("/var/www/storyteller/public/index.html", "utf8");

// 1. Add "Pricing" link in logged-out nav bar (HTML)
f = f.replace(
  '<button class="btn-pill btn-ghost" onclick="openModal(\'login\')">Log In</button>\n        <button class="btn-pill btn-primary" onclick="openModal(\'signup\')">Sign Up Free</button>',
  '<a href="/pricing.html" class="btn-pill btn-ghost" style="text-decoration:none">Pricing</a>\n        <button class="btn-pill btn-ghost" onclick="openModal(\'login\')">Log In</button>\n        <button class="btn-pill btn-primary" onclick="openModal(\'signup\')">Sign Up Free</button>'
);

// 2. Add "Pricing" link in logged-in nav (showDash function)
f = f.replace(
  `document.getElementById('navRight').innerHTML='<span class="greeting">'+(user?.name||'')+'</span><button class="btn-pill btn-ghost" onclick="logout()">Log Out</button>';`,
  `document.getElementById('navRight').innerHTML='<span class="greeting">'+(user?.name||'')+'</span><a href="/pricing.html" class="btn-pill btn-ghost" style="text-decoration:none">💎 Pricing</a><button class="btn-pill btn-ghost" onclick="logout()">Log Out</button>';`
);

// 3. Add "Pricing" link in logout function (rebuilds nav to logged-out)
f = f.replace(
  `document.getElementById('navRight').innerHTML='<button class="btn-pill btn-ghost" onclick="openModal(\\'login\\')">Log In</button><button class="btn-pill btn-primary" onclick="openModal(\\'signup\\')">Sign Up Free</button>';`,
  `document.getElementById('navRight').innerHTML='<a href="/pricing.html" class="btn-pill btn-ghost" style="text-decoration:none">Pricing</a><button class="btn-pill btn-ghost" onclick="openModal(\\'login\\')">Log In</button><button class="btn-pill btn-primary" onclick="openModal(\\'signup\\')">Sign Up Free</button>';`
);

// 4. Add credit check in startCreate function — block if out of credits
f = f.replace(
  "if(!t||!tp)return showToast('Please enter a title and topic! ✏️');",
  "if(!t||!tp)return showToast('Please enter a title and topic! ✏️');\n    const booksCount=parseInt(document.getElementById('sBooks').textContent)||0;\n    const remaining=Math.max(0,(user?.booksLimit||3)-booksCount);\n    if(remaining<=0){showToast('⚠️ Out of credits! Get more to keep creating');\n      setTimeout(()=>window.location.href='/pricing.html',1500);return;}"
);

// 5. Add "Get More Credits" button under the stats row
f = f.replace(
  '<div class="create-card">',
  '<div style="text-align:center;margin-bottom:20px;"><a href="/pricing.html" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:linear-gradient(135deg,#BB6BD9,#6C5CE7);color:white;border-radius:50px;text-decoration:none;font-family:Baloo 2,cursive;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(124,92,252,0.3);transition:0.3s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">💎 Get More Credits</a></div>\n        <div class="create-card">'
);

fs.writeFileSync("/var/www/storyteller/public/index.html", f);
console.log("✅ All 5 pricing patches applied!");
