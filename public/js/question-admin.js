const el = id => document.getElementById(id);
async function adminCall(action, body, id) {
 const url = action === 'sync' ? '/api/v2/sync' : '/api/v2/manage?includeReviewed=true&action='+action+(id?'&id='+encodeURIComponent(id):'');
 const response = await fetch(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Admin-Key':el('key').value},body:body?JSON.stringify(body):undefined});
 const data = await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;
}
async function loadBank() {
 try {
  const status = await adminCall('status');el('status').textContent = JSON.stringify({status,coverage:await adminCall('coverage')},null,2);
  el('source').replaceChildren();for(const source of status.connectors){const option=document.createElement('option');option.value=source.id;option.textContent=source.name;el('source').append(option);}
  el('history').textContent=JSON.stringify(await adminCall('history'),null,2);
  const pending=await adminCall('review');el('review').replaceChildren();
  for(const question of pending.items){const article=document.createElement('article');const pre=document.createElement('pre');pre.textContent=JSON.stringify(question,null,2);article.append(pre);const evidence=document.createElement('textarea');evidence.setAttribute('aria-label','Hồ sơ đối soát đáp án và chương trình');article.append(evidence);
   for(const [action,label] of [['verify','Xác minh'],['reject','Từ chối'],['publish','Xuất bản']]){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{try{await adminCall(action,{evidence:evidence.value,notes:evidence.value,reason:evidence.value},question.id);el('message').textContent='Đã cập nhật';await loadBank();}catch(e){el('message').textContent=e.message;}};article.append(button);}el('review').append(article);
  }
 }catch(e){el('message').textContent=e.message;}
}
el('load').onclick=loadBank;el('sync').onclick=async()=>{try{const result=await adminCall('sync',{connectorId:el('source').value});el('message').textContent=JSON.stringify(result);await loadBank();}catch(e){el('message').textContent=e.message;}};
