const cfg=window.APP_CONFIG;const {createClient}=supabase;const client=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const loginBox=document.getElementById("adminLogin"),panel=document.getElementById("adminPanel"),msg=document.getElementById("adminLoginMessage");
async function check(){
 const {data}=await client.auth.getSession();
 if(data.session){const {data:p}=await client.from("profiles").select("is_owner").eq("id",data.session.user.id).maybeSingle();if(p?.is_owner){loginBox.classList.add("hidden");panel.classList.remove("hidden");loadAdminPosts();return}}
 loginBox.classList.remove("hidden");panel.classList.add("hidden");
}
document.getElementById("adminLoginForm").onsubmit=async e=>{e.preventDefault();msg.textContent="Entrando...";const {error}=await client.auth.signInWithPassword({email:adminEmail.value,password:adminPassword.value});if(error){msg.textContent="E-mail ou senha incorretos.";return}check()};
document.getElementById("logoutBtn").onclick=async()=>{await client.auth.signOut();location.href="index.html"};
async function upload(file,userId,type){
 if(!file)return null;const ext=file.name.split(".").pop()?.toLowerCase()||"bin";const path=`${userId}/${crypto.randomUUID()}.${ext}`;
 const {error}=await client.storage.from("posts-media").upload(path,file,{upsert:false});if(error)throw error;
 const {data}=client.storage.from("posts-media").getPublicUrl(path);return data.publicUrl;
}
document.getElementById("postForm").onsubmit=async e=>{
 e.preventDefault();const out=document.getElementById("postMessage");out.textContent="Salvando...";
 try{
  const {data:{user}}=await client.auth.getUser();if(!user)throw new Error("Sessão expirada.");
  const image=await upload(document.getElementById("postImage").files[0],user.id,"image");
  const video=await upload(document.getElementById("postVideo").files[0],user.id,"video");
  const local=document.getElementById("postDate").value;
  const publishedAt=local?new Date(local).toISOString():new Date().toISOString();
  const row={title:postTitle.value.trim()||null,body:postBody.value,image_url:image,video_url:video,link_url:postLink.value.trim()||null,published_at:publishedAt,show_stars:document.getElementById("showStars").checked};
  const {error}=await client.from("posts").insert(row);if(error)throw error;
  out.textContent=local?"Postagem programada.":"Postagem publicada.";e.target.reset();document.getElementById("showStars").checked=true;loadAdminPosts();
 }catch(err){console.error(err);out.textContent="Erro ao salvar: "+(err.message||"verifique o Supabase.");}
};
async function loadAdminPosts(){
 const {data,error}=await client.from("posts").select("id,title,published_at,stars").order("published_at",{ascending:false}).limit(100);
 const el=document.getElementById("adminPosts");if(error){el.innerHTML="<p class='form-message'>Não foi possível carregar.</p>";return}
 el.innerHTML=(data||[]).map(p=>`<div class="admin-post-row"><strong>${escapeHtml(p.title||"Sem título")}</strong><br><small>${new Date(p.published_at).toLocaleString("pt-BR")} · ✦ ${p.stars}</small> <button class="link-btn" data-del="${p.id}">excluir</button></div>`).join("")||"<p class='form-message'>Nenhum post ainda.</p>";
 el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deletePost(b.dataset.del));
}
async function deletePost(id){if(!confirm("Excluir esta postagem?"))return;const {error}=await client.from("posts").delete().eq("id",id);if(error)alert("Não foi possível excluir.");else loadAdminPosts()}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
check();
