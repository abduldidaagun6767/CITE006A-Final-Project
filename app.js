const CATS=["Electronics","Bags","Clothing","Keys & Cards","Books & Notes","Bottles & Lunch","Other"];
const KEY="tip-lost-found-v2";
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
const daysAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)};
const SEED=()=>[
  {id:"s1",type:"lost",title:"Black Casio calculator",category:"Electronics",campus:"Manila",location:"Engineering Hall, Room 204",date:daysAgo(1),description:"fx-991 with a green sticker on the back.",contact:"maya@tip.edu.ph",status:"open"},
  {id:"s2",type:"found",title:"Student ID card",category:"Keys & Cards",campus:"Quezon City",location:"Cafeteria entrance",date:daysAgo(2),description:"Found near the tray return. Name starts with J. Santos.",contact:"Security desk, ext. 114",status:"open"},
  {id:"s3",type:"found",title:"Grey hoodie",category:"Clothing",campus:"Quezon City",location:"Gym bleachers",date:daysAgo(4),description:"Size M, university logo on the chest.",contact:"gym@tip.edu.ph",status:"open"},
  {id:"s4",type:"lost",title:"Blue steel water bottle",category:"Bottles & Lunch",campus:"Manila",location:"Library, 2nd floor",date:daysAgo(6),description:"Dented at the bottom, sticker of a cat.",contact:"0917 555 0142",status:"returned"}
];

let items=load(), editId=null, delId=null;

function load(){
  try{const r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}
  return SEED();
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(items))}catch(e){}}
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
  f.reset(); $("#err").textContent="";
  $("#formTitle").textContent=i?"Edit item":"Report an item";
  f.date.value=i?i.date:today(); f.date.max=today();
  if(i){f.type.value=i.type;f.title.value=i.title;f.category.value=i.category;f.campus.value=i.campus||"Manila";f.location.value=i.location;f.description.value=i.description;f.contact.value=i.contact}
  $("#formDlg").showModal(); f.title.focus();
}
$("#form").addEventListener("submit",e=>{
  e.preventDefault();
  const f=e.target, d={type:f.type.value,title:f.title.value.trim(),category:f.category.value,campus:f.campus.value,location:f.location.value.trim(),date:f.date.value,description:f.description.value.trim(),contact:f.contact.value.trim()};
  if(!d.title||!d.location||!d.contact||!d.date){$("#err").textContent="Fill in the item name, location, date and contact.";return}
  if(editId){items=items.map(i=>i.id===editId?{...i,...d}:i);toast("Item updated")}
  else{items.unshift({id:"i"+Date.now(),status:"open",...d});toast("Item added")}
  persist();render();$("#formDlg").close();
});
$("#cancel").onclick=()=>$("#formDlg").close();

// ---------- DELETE + status ----------
$("#list").addEventListener("click",e=>{
  const b=e.target.closest("button[data-a]"); if(!b)return;
  const id=b.dataset.id, i=items.find(x=>x.id===id);
  if(b.dataset.a==="edit")openForm(id);
  if(b.dataset.a==="toggle"){i.status=i.status==="returned"?"open":"returned";persist();render();toast(i.status==="returned"?"Marked as returned":"Item reopened")}
  if(b.dataset.a==="del"){delId=id;$("#delText").textContent=`"${i.title}" will be removed permanently.`;$("#delDlg").showModal()}
});
$("#delNo").onclick=()=>$("#delDlg").close();
$("#delYes").onclick=()=>{items=items.filter(i=>i.id!==delId);persist();render();$("#delDlg").close();toast("Item deleted")};

// ---------- setup ----------
const opts=CATS.map(c=>`<option>${c}</option>`).join("");
$("#form").category.innerHTML=opts;
$("#fcat").innerHTML=`<option value="">All categories</option>`+opts;
["#q","#ftype","#fcampus","#fcat","#fstat"].forEach(s=>$(s).addEventListener("input",render));
$("#add").onclick=()=>openForm();
$("#theme").onclick=()=>{
  const r=document.documentElement, dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;
  r.dataset.theme=dark?"light":"dark";
};
render();