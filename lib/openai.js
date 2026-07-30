import OpenAI from "openai";
export const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
export const textModel=process.env.OPENAI_TEXT_MODEL||"gpt-5-mini";
export function allow(req,res){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");if(req.method!=="POST"){res.status(405).json({ok:false,error:"POST required"});return false}if(!process.env.OPENAI_API_KEY){res.status(503).json({ok:false,error:"OPENAI_API_KEY is not configured"});return false}return true}
export async function generateJson({instructions,input,model=textModel,tools}){
  const response=await client.responses.create({model,instructions,input:typeof input==="string"?input:JSON.stringify(input),store:false,...(tools?{tools}:{}),text:{format:{type:"json_object"}}});
  const raw=response.output_text?.trim();if(!raw)throw new Error("The model returned no text");try{return JSON.parse(raw)}catch{const match=raw.match(/\{[\s\S]*\}/);if(match)return JSON.parse(match[0]);throw new Error("The model returned invalid JSON")}
}
export function fail(res,error){console.error(error);res.status(error?.status||500).json({ok:false,error:error?.message||"RNP backend failed"})}
export function compact(value,max=16000){const text=typeof value==="string"?value:JSON.stringify(value??{});return text.slice(0,max)}
