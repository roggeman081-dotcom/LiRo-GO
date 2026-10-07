// Uses the real public register. No customer data is sent to the register.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/favicon.ico'){res.writeHead(204);return res.end();}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end();}
    const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
server.listen(0,'127.0.0.1',()=>{
  process.env.LIRO_TEST_URL=`http://127.0.0.1:${server.address().port}/`;
  process.env.LIRO_LIVE_LOOKUP='1';
  require('./barcode-material.cjs');
});
server.unref();
