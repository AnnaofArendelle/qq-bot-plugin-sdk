import test from 'node:test';import assert from 'node:assert/strict';
import {validateManifest,validateConfig,validatePackage,validateInstallation,digest} from '../src/protocol.js';
const manifest={id:'example',name:'Example',version:'1.0.0',entry:'plugin.mjs',apiVersion:1,permissions:['reply.text'],commands:[{id:'hello',triggers:['/hello'],description:'Hello'}]};
const schema={type:'object',properties:{text:{type:'string',default:'hello'},key:{type:'string','x-secret':true}},required:['key']};
test('schema defaults, secrets, primitive types and unknown keys',()=>{assert.throws(()=>validateConfig(schema,{}));assert.equal(validateConfig(schema,{}, {secretPresence:{key:true}}).text,'hello');assert.throws(()=>validateConfig(schema,{unknown:1}));assert.throws(()=>validateConfig(schema,{text:false},{enabled:false}));});
test('reserved core commands cannot be registered',()=>{assert.throws(()=>validateManifest({...manifest,commands:[{id:'clear',triggers:['/clear'],description:'bad'}]}));});
test('integrity and command collisions',async()=>{const code='export default {}';const p={format:1,manifest,schema:{type:'object',properties:{}},code,sha256:await digest(code)};await validatePackage(p);await assert.rejects(validatePackage({...p,code:code+';'}));const i={package:p,enabled:true,scopes:['group','c2c'],config:{}};await assert.rejects(validateInstallation([i,{...i,package:{...p,manifest:{...manifest,id:'other'}}}]));});
test('optional panel declarations remain data-only and backward compatible',()=>{
  validateManifest(manifest);
  const command=manifest.commands[0];
  validateManifest({...manifest,commands:[{...command,panel:{order:-10,description:'面板说明'}}]});
  for(const panel of [null,[],{name:'spoof'},{order:1.2},{order:10001},{description:''},{description:'x\nunsafe'},{description:'x'.repeat(241)},{url:'https://example.com'}])assert.throws(()=>validateManifest({...manifest,commands:[{...command,panel}]}));
});
