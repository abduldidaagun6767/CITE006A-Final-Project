const CATS=["Electronics","Bags","Clothing","Keys & Cards","Books & Notes","Bottles & Lunch","Other"];
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);

let items=[], editId=null, delId=null, photoData="";

// Talks to the Express API (see server.js)
async function api(url,opt={}){
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||"Request failed ("+r.status+")")}
  return r.status===204?null:r.json();
}
async function loadItems(){
  try{items=await api("/api/items");render()}
  catch(e){$("#list").innerHTML=`<div class="empty">Could not reach the server. Is it running? (${esc(e.message)})</div>`}
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2200)}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

// ---------- READ ----------
function render(){
  const q=$("#q").value.trim().toLowerCase(), t=$("#ftype").value, c=$("#fcat").value, s=$("#fstat").value, cp=$("#fcampus").value;
  const out=items.filter(i=>
    (!t||i.type===t)&&(!cp||i.campus===cp)&&(!c||i.category===c)&&(!s||i.status===s)&&
    (!q||[i.title,i.campus,i.location,i.description,i.category].join(" ").toLowerCase().includes(q))
  ).sort((a,b)=>b.date.localeCompare(a.date));
  $("#list").innerHTML=out.length?out.map(card).join(""):
    `<div class="empty">No items match. Clear the filters or report a new item.</div>`;
  const n=k=>items.filter(i=>i.type===k&&i.status==="open").length;
  $("#stats").innerHTML=`<div class="stat"><b>${n("lost")}</b>lost, still open</div><div class="stat"><b>${n("found")}</b>found, waiting for owner</div><div class="stat"><b>${items.filter(i=>i.status==="returned").length}</b>returned</div>`;
}
function card(i){
  const ret=i.status==="returned";
  return `<article class="card ${i.type} ${ret?"returned":""}">
    <div class="row"><span class="badge">${i.type==="lost"?"Lost":"Found"}${ret?" · Returned":""}</span><span class="meta">${esc(i.category)}</span></div>
    ${i.photo?`<img class="photo" src="${i.photo}" alt="Photo of ${esc(i.title)}">`:""}
    <h3>${esc(i.title)}</h3>
    ${i.description?`<p>${esc(i.description)}</p>`:""}
    <div class="meta"><span>Campus: ${esc(i.campus||"Not specified")}</span><span>Where: ${esc(i.location)}</span><span>When: ${fmt(i.date)}</span><span>Contact: ${esc(i.contact)}</span></div>
    <div class="actions">
      <button class="btn sm ghost" data-a="edit" data-id="${i.id}">Edit</button>
      <button class="btn sm ghost" data-a="toggle" data-id="${i.id}">${ret?"Reopen":"Mark returned"}</button>
      <button class="btn sm ghost" data-a="del" data-id="${i.id}">Delete</button>
    </div></article>`;
}

// ---------- CREATE / UPDATE ----------
function openForm(id){
  editId=id||null;
  const f=$("#form"), i=items.find(x=>x.id===id);
  f.reset(); $("#err").textContent=""; photoData=i?(i.photo||""):""; showPrev();
  $("#formTitle").textContent=i?"Edit item":"Report an item";
  f.date.value=i?i.date:today(); f.date.max=today();
  if(i){f.type.value=i.type;f.title.value=i.title;f.category.value=i.category;f.campus.value=i.campus||"Manila";f.location.value=i.location;f.description.value=i.description;f.contact.value=i.contact}
  $("#formDlg").showModal(); f.title.focus();
}
$("#form").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=e.target, d={type:f.type.value,title:f.title.value.trim(),category:f.category.value,campus:f.campus.value,location:f.location.value.trim(),date:f.date.value,description:f.description.value.trim(),contact:f.contact.value.trim(),photo:photoData};
  if(!d.title||!d.location||!d.contact||!d.date){$("#err").textContent="Fill in the item name, location, date and contact.";return}
  try{
    if(editId){
      const old=items.find(i=>i.id===editId);
      const u=await api("/api/items/"+editId,{method:"PUT",body:JSON.stringify({...d,status:old.status})});
      items=items.map(i=>i.id===editId?u:i); toast("Item updated");
    }else{
      const c=await api("/api/items",{method:"POST",body:JSON.stringify(d)});
      items.unshift(c); toast("Item added");
    }
    render(); $("#formDlg").close();
  }catch(err){$("#err").textContent=err.message}
});
$("#cancel").onclick=()=>$("#formDlg").close();

// ---------- DELETE + status ----------
$("#list").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-a]"); if(!b)return;
  const id=b.dataset.id, i=items.find(x=>x.id===id);
  if(b.dataset.a==="edit")openForm(id);
  if(b.dataset.a==="toggle"){
    try{
      const status=i.status==="returned"?"open":"returned";
      const u=await api("/api/items/"+id,{method:"PUT",body:JSON.stringify({...i,status})});
      items=items.map(x=>x.id===id?u:x); render();
      toast(status==="returned"?"Marked as returned":"Item reopened");
    }catch(err){toast(err.message)}
  }
  if(b.dataset.a==="del"){delId=id;$("#delText").textContent=`"${i.title}" will be removed permanently.`;$("#delDlg").showModal()}
});
$("#delNo").onclick=()=>$("#delDlg").close();
$("#delYes").onclick=async()=>{
  try{await api("/api/items/"+delId,{method:"DELETE"});items=items.filter(i=>i.id!==delId);render();$("#delDlg").close();toast("Item deleted")}
  catch(err){toast(err.message)}
};

// ---------- photo upload ----------
function showPrev(){
  $("#prev").innerHTML=photoData?`<img src="${photoData}" alt="Selected photo preview"><button type="button" class="btn sm ghost" id="rmPhoto">Remove photo</button>`:"";
}
$("#prev").addEventListener("click",e=>{
  if(e.target.id==="rmPhoto"){photoData="";$("#form").photo.value="";showPrev()}
});
$("#form").photo.addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file)return;
  if(!file.type.startsWith("image/")){$("#err").textContent="Please choose an image file.";return}
  const rd=new FileReader();
  rd.onload=()=>{
    const im=new Image();
    im.onload=()=>{ // shrink to max 800px to keep uploads small
      const s=Math.min(1,800/Math.max(im.width,im.height)), c=document.createElement("canvas");
      c.width=Math.round(im.width*s); c.height=Math.round(im.height*s);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);
      photoData=c.toDataURL("image/jpeg",.75); showPrev(); $("#err").textContent="";
    };
    im.src=rd.result;
  };
  rd.readAsDataURL(file);
});

// ---------- setup ----------
const opts=CATS.map(c=>`<option>${c}</option>`).join("");
$("#form").category.innerHTML=opts;
$("#fcat").innerHTML=`<option value="">All categories</option>`+opts;
["#q","#ftype","#fcampus","#fcat","#fstat"].forEach(s=>$(s).addEventListener("input",render));
$("#add").onclick=()=>openForm();
loadItems();