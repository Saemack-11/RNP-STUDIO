export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({ok:false,error:'OPENAI_API_KEY is not configured'});
 const {title='',subtitle='',concept='',theme='sanctuary',texture='cinematic',lyrics=''}=req.body||{};
 if(typeof concept!=='string'||concept.trim().length<8||concept.length>5000)return res.status(400).json({ok:false,error:'A clear visual concept is required'});
 const prompt=`Create original square cover artwork for Real Ninja Poetics (RNP). Title context: ${title||'untitled'}. Artist line: ${subtitle||'SAE · Real Ninja Poetics'}. Visual concept: ${concept}. Atmosphere lane: ${theme}. Texture: ${texture}. Lyric context, use only as emotional inspiration: ${String(lyrics).slice(0,1800)}. Art direction: immersive private man-cave music sanctuary, dark walnut, warm amber lamps, restrained purple and green LED glow, cinematic smoke/haze, nostalgic 1990s and early-2000s hip-hop studio character, soulful, raw, expensive detail, no generic corporate interface. Make the image visually complete without readable typography, logos, watermarks, copyrighted characters, or imitation of a living artist. Leave usable negative space for title treatment.`;
 try{
  const r=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt,size:'1024x1024',quality:'high',output_format:'png'})});
  const data=await r.json();if(!r.ok)return res.status(r.status).json({ok:false,error:data?.error?.message||'Image generation failed'});
  const b64=data?.data?.[0]?.b64_json;if(!b64)return res.status(502).json({ok:false,error:'No image was returned'});
  return res.status(200).json({ok:true,image:`data:image/png;base64,${b64}`});
 }catch(e){return res.status(500).json({ok:false,error:'Cover generation bridge failed'})}
}
