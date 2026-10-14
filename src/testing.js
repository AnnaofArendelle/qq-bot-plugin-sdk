export function createTestContext({ message = {}, config = {}, command = {}, commands = [], data = new Map(), http, runtime } = {}) {
  const replies = [], images = [];
  const context = { message: { text:'',sender:'test-user',sessionId:'test-session',channelType:'c2c',platform:'qq',isAt:true,...message },config,command:{id:'',trigger:'',args:'',...command},commands,runtime,
    reply:{ async text(value){replies.push(value);}, async image(value){images.push(value);} },
    storage:{async get(key){return structuredClone(data.get(key)??null);},async set(key,value){data.set(key,structuredClone(value));},async delete(key){data.delete(key);},async putIfDay(key,value){const old=data.get(key);if(old?.day!==value.day)data.set(key,structuredClone(value));return structuredClone(data.get(key));}},
    http:{json:http??(async()=>{throw new Error('HTTP mock required');})},log:{info(){},error(){}} };
  return {context,replies,images,data};
}
