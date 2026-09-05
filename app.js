const cfg=window.APP_CONFIG;
const {createClient}=supabase;
const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const postsEl=document.getElementById("posts"),archiveEl=document.getElementById("archive"),sortSelect=document.getElementById("sortSelect"),emptyEl=document.getElementById("emptyState");
let allPosts=[],selectedMonth=null;

function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmtDate(d){return new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short"}).format(new Date(d))}
function monthKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`}
function monthLabel(key){const [y,m]=key.split("-");return `${new Intl.DateTimeFormat("pt-BR",{month:"long"}).format(new Date(+y,+m-1,1)).toUpperCase()} - ${y}`}
function safeUrl(url){try{const u=new URL(url);return ["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return "#"}}

function renderArchive(){
 const groups={}; allPosts.forEach(p=>(groups[monthKey(p.published_at)]??=[]).push(p));
 const keys=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
 archiveEl.innerHTML=`<button class="archive-btn ${selectedMonth===null?"active":""}" data-month="">TODOS <span class="archive-count">${allPosts.length}</span></button>`+
 keys.map(k=>`<button class="archive-btn ${selectedMonth===k?"active":""}" data-month="${k}">${monthLabel(k)} <span class="archive-count">${groups[k].length}</span></button>`).join("");
 archiveEl.querySelectorAll("[data-month]").forEach(b=>b.onclick=()=>{selectedMonth=b.dataset.month||null;renderArchive();renderPosts()});
 document.getElementById("monthMobile").innerHTML=archiveEl.innerHTML;
 document.getElementById("monthMobile").querySelectorAll("[data-month]").forEach(b=>b.onclick=()=>{selectedMonth=b.dataset.month||null;renderArchive();renderPosts()});
}

function renderPosts(){
 let arr=allPosts.filter(p=>!selectedMonth||monthKey(p.published_at)===selectedMonth);
 const s=sortSelect.value;
 if(s==="oldest")arr.sort((a,b)=>new Date(a.published_at)-new Date(b.published_at));
 else if(s==="stars")arr.sort((a,b)=>b.stars-a.stars||new Date(b.published_at)-new Date(a.published_at));
 else arr.sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
 emptyEl.classList.toggle("hidden",arr.length!==0);
 postsEl.innerHTML=arr.map((p,i)=>`
 <article class="post">
  <div class="post-date">${fmtDate(p.published_at)}</div>
  ${p.title?`<h2 class="post-title">${escapeHtml(p.title)}</h2>`:""}
  ${p.body?`<div class="post-body">${escapeHtml(p.body)}</div>`:""}
  ${p.image_url?`<img class="post-media" loading="lazy" src="${safeUrl(p.image_url)}" alt="">`:""}
  ${p.video_url?`<video class="post-media" controls preload="metadata" src="${safeUrl(p.video_url)}"></video>`:""}
  ${p.link_url?`<a class="post-link" target="_blank" rel="noopener" href="${safeUrl(p.link_url)}">abrir link ↗</a>`:""}
  <div class="post-footer">
   <button class="star-btn" data-star="${p.id}">✦ ${p.show_stars===false?"":p.stars}</button>
  </div>
 </article>`).join("");
 postsEl.querySelectorAll("[data-star]").forEach(btn=>btn.onclick=()=>starPost(btn.dataset.star,btn));
}
async function starPost(id,btn){
 const {data,error}=await client.rpc("add_star",{p_post_id:id});
 if(error){console.error(error);return}
 const p=allPosts.find(x=>x.id===id);if(p)p.stars=data;
 btn.innerHTML=`✦ ${p.show_stars===false?"":p.stars}`;
 for(let i=0;i<3;i++){const s=document.createElement("span");s.className="star-fly";s.textContent="✦";s.style.left=(btn.getBoundingClientRect().left+Math.random()*btn.offsetWidth)+"px";s.style.top=btn.getBoundingClientRect().top+"px";s.style.setProperty("--x",(Math.random()*120-60)+"px");document.body.appendChild(s);setTimeout(()=>s.remove(),1200)}
}
async function loadPosts(){
 const {data,error}=await client.from("posts").select("id,title,body,image_url,video_url,link_url,published_at,stars,show_stars").lte("published_at",new Date().toISOString()).order("published_at",{ascending:false});
 if(error){postsEl.innerHTML=`<p class="form-message">Não foi possível carregar as postagens. Verifique a configuração do Supabase.</p>`;console.error(error);return}
 allPosts=data||[];renderArchive();renderPosts();
}
sortSelect.onchange=renderPosts;

function openModal(id){document.getElementById(id).classList.remove("hidden")}
function closeModal(id){document.getElementById(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.getElementById("settingsBtn").onclick=()=>openModal("settingsModal");
document.getElementById("settingsFooterBtn").onclick=()=>openModal("settingsModal");
document.getElementById("ownerBtn").onclick=()=>location.href="admin.html";

const range=document.getElementById("fontRange"),desktop=document.getElementById("desktopMode");
range.value=localStorage.getItem("jam_font")||"100";document.documentElement.style.fontSize=range.value+"%";
range.oninput=()=>{document.documentElement.style.fontSize=range.value+"%";localStorage.setItem("jam_font",range.value)};
desktop.checked=localStorage.getItem("jam_desktop")==="1";desktop.onchange=()=>{document.body.classList.toggle("desktop-forced",desktop.checked);localStorage.setItem("jam_desktop",desktop.checked?"1":"0")};document.body.classList.toggle("desktop-forced",desktop.checked);

document.getElementById("loginForm").onsubmit=async e=>{
 e.preventDefault();const m=document.getElementById("loginMessage");m.textContent="Entrando...";
 const {data,error}=await client.auth.signInWithPassword({email:document.getElementById("loginEmail").value,password:document.getElementById("loginPassword").value});
 if(error){m.textContent="Não foi possível entrar. Confira e-mail e senha.";return}
 if(!data.user){m.textContent="Login não concluído.";return}
 location.href="admin.html";
};
document.getElementById("forgotPasswordBtn").onclick=async()=>{
 const email=document.getElementById("loginEmail").value, m=document.getElementById("loginMessage");
 if(!email){m.textContent="Digite seu e-mail primeiro.";return}
 const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:cfg.SITE_URL+"reset.html"});
 m.textContent=error?"Não foi possível enviar o e-mail.": "Se esse e-mail existir, o link de recuperação foi enviado.";
};

function loading(){
 const screen=document.getElementById("loadingScreen"), target="João Arthur";
 const box=document.getElementById("writingName");
 const count=30; for(let i=0;i<count;i++){const s=document.createElement("span");s.className="star";s.textContent=["✦","⋆","✧"][i%3];s.style.left=Math.random()*100+"%";s.style.top=Math.random()*100+"%";s.style.animationDelay=(Math.random()*3)+"s";s.style.fontSize=(8+Math.random()*13)+"px";document.getElementById("loadingStars").appendChild(s)}
 let i=0;const interval=setInterval(()=>{box.textContent=target.slice(0,i++);if(i>target.length){clearInterval(interval);screen.classList.add("done")}},5000/target.length);
 setTimeout(()=>screen.classList.add("fade"),8000);
}
loading();loadPosts();
