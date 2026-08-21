(()=>{
  'use strict';
  let imageDataUrl = '';
  let imageName = '';
  const nativeFetch = window.fetch.bind(window);

  const css = `
    .rnpVisualContext{position:relative;overflow:hidden}
    .rnpVisualContext .vcGrid{display:grid;grid-template-columns:92px 1fr;gap:11px;align-items:stretch;margin-top:10px}
    .rnpVisualContext .vcPreview{min-height:92px;border:1px dashed rgba(224,183,95,.42);border-radius:14px;background:rgba(0,0,0,.28);display:grid;place-items:center;overflow:hidden;color:#a9a29a;font:800 9px 'Courier New',monospace;text-transform:uppercase;letter-spacing:.08em;text-align:center;padding:6px}
    .rnpVisualContext .vcPreview img{width:100%;height:100%;min-height:92px;object-fit:cover;border-radius:10px}
    .rnpVisualContext .vcStatus{font-size:10px;color:#a9a29a;line-height:1.4;margin-top:7px}
    .rnpVisualContext .vcStatus.ready{color:#70ffb1}
    .rnpVisualContext .vcActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .rnpVisualContext .vcActions button,.rnpVisualContext .vcActions label{flex:1 1 125px}
    .rnpVisualContext .vcUpload{min-height:40px;border-radius:11px;border:1px solid rgba(255,222,132,.48);background:linear-gradient(180deg,#f0ca72,#9b6c1d);color:#140c04;padding:9px 11px;font-weight:900;letter-spacing:.035em;text-transform:uppercase;display:grid;place-items:center;cursor:pointer;text-align:center}
    .rnpVisualContext .vcUpload input{display:none}
    @media(max-width:430px){.rnpVisualContext .vcGrid{grid-template-columns:78px 1fr}.rnpVisualContext .vcPreview{min-height:78px}.rnpVisualContext .vcPreview img{min-height:78px}}
  `;

  function injectStyle(){
    if(document.getElementById('rnpVisualContextStyle')) return;
    const style=document.createElement('style');
    style.id='rnpVisualContextStyle';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function toDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read image'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Could not decode image'));
        img.onload=()=>{
          const max=1800;
          const scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          const ctx=canvas.getContext('2d',{alpha:false});
          ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',0.92));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function clearVisualContext(){
    imageDataUrl='';imageName='';
    const preview=document.getElementById('vcPreview');
    const status=document.getElementById('vcStatus');
    const input=document.getElementById('vcFileInput');
    if(preview) preview.innerHTML='<span>Screenshot<br>or photo</span>';
    if(status){status.textContent='Nothing attached. RNP will use your typed context only.';status.classList.remove('ready');}
    if(input) input.value='';
  }

  async function chooseImage(file){
    if(!file) return;
    if(!/^image\//i.test(file.type||'')){window.alert('Choose a screenshot or image file.');return;}
    if(file.size>14*1024*1024){window.alert('That image is too large. Choose an image under 14 MB.');return;}
    const status=document.getElementById('vcStatus');
    if(status) status.textContent='Preparing visual context…';
    try{
      imageDataUrl=await toDataUrl(file);
      imageName=String(file.name||'visual-context').slice(0,120);
      const preview=document.getElementById('vcPreview');
      if(preview) preview.innerHTML=`<img src="${imageDataUrl}" alt="Attached visual context">`;
      if(status){status.textContent=`Attached: ${imageName}. Council + Adaptive will read it with your text.`;status.classList.add('ready');}
    }catch(error){
      clearVisualContext();
      if(status) status.textContent=error.message||'Image could not be prepared.';
    }
  }

  function installCard(){
    if(document.getElementById('rnpVisualContextCard')) return;
    const writeView=document.getElementById('view-write');
    if(!writeView) return;
    const anchor=document.getElementById('adaptiveLyricsCard')||writeView.querySelector('.card');
    const card=document.createElement('article');
    card.id='rnpVisualContextCard';
    card.className='card rnpVisualContext';
    card.innerHTML=`
      <div class="cardHeader"><div><div class="eyebrow">VISUAL CONTEXT</div><h2>Screenshot / Conversation Context</h2></div><span class="badge">Optional</span></div>
      <p class="sub">Attach a text thread, DM, note, photo, or screenshot so RNP can read the scenario directly. The image is sent only when you use Council or Adaptive and is not stored in the project backup.</p>
      <div class="vcGrid">
        <div class="vcPreview" id="vcPreview"><span>Screenshot<br>or photo</span></div>
        <div>
          <div class="field"><label>Context note</label><textarea id="vcNote" rows="3" maxlength="700" placeholder="Optional: what should RNP pay attention to? Example: read the tone between us, or pull the strongest emotional angle."></textarea></div>
          <div class="vcActions"><label class="vcUpload">Attach Screenshot<input id="vcFileInput" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif"></label><button id="vcClear" class="btn ghost small" type="button">Clear</button></div>
          <div id="vcStatus" class="vcStatus">Nothing attached. RNP will use your typed context only.</div>
        </div>
      </div>`;
    if(anchor?.parentNode) anchor.parentNode.insertBefore(card,anchor); else writeView.appendChild(card);
    document.getElementById('vcFileInput')?.addEventListener('change',e=>chooseImage(e.target.files?.[0]));
    document.getElementById('vcClear')?.addEventListener('click',clearVisualContext);
  }

  window.fetch=async function(input,init={}){
    try{
      const url=new URL(typeof input==='string'?input:input?.url||'',location.href);
      const isRnp=url.pathname==='/api/rnp'||url.pathname==='/api/predict-bars';
      if(isRnp && imageDataUrl && typeof init?.body==='string'){
        const body=JSON.parse(init.body);
        body.visual_context={
          has_image:true,
          image_name:imageName,
          note:(document.getElementById('vcNote')?.value||'').trim().slice(0,700),
          image_data_url:imageDataUrl
        };
        init={...init,body:JSON.stringify(body)};
      }
    }catch{}
    return nativeFetch(input,init);
  };

  function init(){injectStyle();installCard();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
