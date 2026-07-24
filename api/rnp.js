const SYSTEM = `You are the Producer's Table inside RNP Studio for Sae. Build a truthful, usable full-song creative plan from the user's existing controls. Raw Truth is the primary direction. Do not require separate seed bars, a hook, or prewritten lyrics. Never invent criminal history, wealth, affiliations, violence, or experiences. Preserve Sae's natural slang and use "ninja" rather than the N-word. Cultural and nostalgic references must strengthen meaning, humor, story, or metaphor—not merely rhyme. Avoid copying lyrics or imitating a living artist. Return valid JSON only.`;

function text(v){return typeof v==='string'?v.trim():''}
function arr(v){return Array.isArray(v)?v.filter(Boolean):[]}
function outputText(data){if(typeof data?.output_text==='string')return data.output_text;for(const item of data?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c.text)return c.text;return ''}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({ok:false,error:'OPENAI_API_KEY is not configured in Vercel.'});
  const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const truth=text(b.rawTruth)||text(b.truth)||text(b.seed)||text(b.chapter)||text(b.lyrics);
  if(!truth)return res.status(400).json({ok:false,error:'Give RNP a little Raw Truth or name the chapter first.'});
  const context={title:text(b.title),chapter:text(b.chapter),raw_truth:truth,vibe:text(b.vibe)||'Street Gospel',vibe_layers:arr(b.vibeLayers),emotional_arc:arr(b.emotionalArc),nostalgia:b.nostalgia||{enabled:false,references:[]},cultural_pulse:arr(b.culturalPulse),beat:{name:text(b.beatName),bpm:b.bpm||null,key:text(b.key),duration_seconds:b.durationSeconds||null},existing_lyrics:text(b.lyrics),glossary:arr(b.glossary)};
  const shape={creative_center:'one concise paragraph',emotional_momentum:{arc:['emotion'],transition_notes:'concise paragraph',pressure_release:'concise sentence'},culture_lanes:[{reference_lane:'name',symbolic_value:'meaning',usage_rule:'how to use without forcing it'}],council:[{agent:'Producer',direction:'specific creative direction'},{agent:'Writer',direction:'specific writing direction'},{agent:'Arrangement',direction:'specific song structure direction'},{agent:'Authenticity',direction:'specific truth guardrail'}],hook_directions:['direction'],pocket_plan:'full song pocket and arrangement plan',imagery:['image'],starter_material:['original starter idea, not copied lyrics'],recording_notes:['note'],authenticity_checks:['check']};
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5',store:false,input:[{role:'developer',content:SYSTEM},{role:'user',content:`Create the Producer's Table plan. Return JSON matching this shape exactly:\n${JSON.stringify(shape)}\n\nSESSION CONTEXT:\n${JSON.stringify(context)}`}],text:{format:{type:'json_object'}}})});
    const data=await r.json();
    if(!r.ok)return res.status(r.status===429?429:502).json({ok:false,error:r.status===429?'OpenAI quota or rate limit reached. Check API billing and try again.':data?.error?.message||'Council generation failed.'});
    const raw=outputText(data);
    let result;try{result=JSON.parse(raw)}catch{throw new Error('Council returned unreadable JSON')}
    return res.status(200).json({ok:true,result});
  }catch(e){console.error('RNP council error',e);return res.status(500).json({ok:false,error:e.message||'RNP council failed.'})}
}
