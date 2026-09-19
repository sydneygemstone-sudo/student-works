(function(){'use strict';
const M=BeastGame.MoveBook,cache=new Map(),backgrounds=new Map(),atlases={},POSES=['idle','walk','punch','kick','spin','dash','super','special','fly','block'];
const palettes={frost:['#effbfa','#9fc8d5','#34546c','#ccf6ff'],ember:['#d6a16b','#765246','#382d36','#ffcd72'],moss:['#b5c58b','#648671','#2b4e4b','#e8efb7'],volt:['#c6bfdc','#75649b','#303653','#ffe7aa'],twins:['#efcea0','#b28563','#4e455a','#dcf4fb'],fluffy:['#f1b9a0','#c78670','#755347','#ffe8bf'],'water-rat':['#bad7e6','#7899ae','#425969','#effaff'],'crown-golem':['#d9cdf2','#8d7bb8','#3a2f57','#f4e9ff']};
function oval(c,x,y,rx,ry,color,rot=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);c.fill();}
function poly(c,points,color,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c,pts,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
function shade(c,x,y,rx,ry,light,mid,dark){const g=c.createRadialGradient(x-rx*.35,y-ry*.35,4,x,y,Math.max(rx,ry)*1.2);g.addColorStop(0,light);g.addColorStop(.55,mid);g.addColorStop(1,dark);oval(c,x,y,rx,ry,g);}
function gem(c,x,y,size,color){c.save();c.translate(x,y);poly(c,[[0,-size],[size*.75,-size*.3],[size*.55,size*.6],[0,size],[-size*.55,size*.6],[-size*.75,-size*.3]],color,'#e4c589');poly(c,[[0,-size],[0,size],[-size*.75,-size*.3]],'#ffffff38');line(c,[[0,-size],[size*.2,-size*.2],[size*.55,size*.6]],'#ffffffb0',1.5);c.restore();}
function eye(c,x,y,scale=1,color='#64472f'){c.save();c.translate(x,y);c.scale(scale,scale);shade(c,0,0,11,14,'#fffbe8','#efead6','#b3b2a7');oval(c,3,1,7,11,color);oval(c,5,1,4.4,8,'#162635');oval(c,1,-5,3.1,3.8,'#fff');oval(c,6,5,1.5,2,'#f9eecb');line(c,[[-9,-9],[-3,-15],[6,-14],[10,-9]],'#25333e',2.5);c.restore();}
function fur(c,x,y,rx,ry,color,count=95){c.strokeStyle=color;c.lineWidth=.8;for(let n=0;n<count;n++){const a=n*2.39996,r=Math.sqrt((n%37)/37),px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a)*2,py+3+(n%3));c.stroke();}}
function paw(c,x,y,angle,p,scale=1){c.save();c.translate(x,y);c.rotate(angle);shade(c,0,0,17*scale,26*scale,p[0],p[1],p[2]);for(let i=0;i<3;i++)oval(c,(-8+i*8)*scale,18*scale,4*scale,6*scale,p[3]);c.restore();}
function critter(c,id,pose,frame,tier){const p=palettes[id],phase=frame/2,a=Math.sin(phase*Math.PI),attack=['punch','super','special'].includes(pose),fly=pose==='fly';c.save();if(pose==='block')c.scale(1,.78);if(pose==='dash')c.rotate(-.17);if(pose==='spin')c.rotate((frame-1)*.17);
 const wolf=id==='frost',rhino=id==='ember',turtle=id==='moss',cat=id==='volt',fox=id==='twins';
 // Tails and shells are separate silhouettes, then all surface detail is baked.
 if(wolf||fox){c.save();c.translate(-60,-90);c.rotate(-.7+(pose==='walk'?a*.13:0));shade(c,-32,0,55,24,p[0],p[1],p[2]);oval(c,-69,0,18,22,wolf?'#f9fcf4':'#f3f4e1');fur(c,-35,0,43,17,'#ffffff70',60);c.restore();}
 if(cat){c.strokeStyle=p[1];c.lineWidth=18;c.beginPath();c.moveTo(-44,-72);c.bezierCurveTo(-112,-47,-114,-120,-90,-126);c.stroke();oval(c,-90,-126,10,13,p[2]);}
 if(turtle){shade(c,-29,-112,83,86,'#b0bb80','#49745e','#25494a');for(let i=0;i<8;i++){const ang=i*Math.PI/4,tx=-29+Math.cos(ang)*54,ty=-112+Math.sin(ang)*58;poly(c,[[tx-20,ty-14],[tx+1,ty-23],[tx+24,ty-7],[tx+18,ty+17],[tx-8,ty+24],[tx-23,ty+7]],i%2?'#789b74':'#92ae7e','#345d54');}fur(c,-32,-129,68,61,'#d7e5b033',65);}
 if(fly){for(const s of [-1,1]){const x=s*34;poly(c,[[x,-130],[s*124,-185],[s*135,-139],[s*96,-84],[x,-87]],wolf?'#b8e5ef77':cat?'#ddc6ff66':'#dce8b766');line(c,[[x,-124],[s*122,-168],[s*95,-109]],p[3]+'88',2);}}
 paw(c,-30,-22,-.12+(pose==='walk'?(frame-1)*.4:0),p,.97);paw(c,31,-22,pose==='kick'?-.9*a:(pose==='walk'?(1-frame)*.4:.15),p,1.03);
 shade(c,0,-107,turtle?60:rhino?74:58,81,p[0],p[1],p[2]);shade(c,15,-100,34,56,p[3],p[0],p[1]);
 if(!rhino&&!turtle)fur(c,-5,-105,51,71,'#ffffff46',160);
 if(rhino){for(let i=0;i<4;i++){const y=-155+i*33;poly(c,[[-64,y],[-30,y-14],[3,y-3],[-3,y+24],[-39,y+28],[-69,y+12]],i%2?'#8c6655':'#ae825f','#493e3e');line(c,[[-52,y+4],[-34,y+12],[-10,y+8]],'#f5ad66',2);}line(c,[[25,-155],[36,-132],[21,-110],[38,-90],[26,-72]],'#ffd58c',3);}
 if(turtle){for(let i=0;i<4;i++)line(c,[[-4,-139+i*24],[35,-134+i*24]],'#52766077',2);}
 // Ears, face and identifying crest.
 if(wolf||cat||fox){for(const s of [-1,1]){const x=s*36;poly(c,[[x-20,-183],[x+s*13,-250],[x+24,-199]],p[1],p[2]);poly(c,[[x-9,-199],[x+s*10,-234],[x+14,-203]],cat?'#e3b5ca':'#e5d3c3');if(cat)line(c,[[x+s*13,-246],[x+s*16,-263]],p[2],5);}}
 shade(c,8,-179,rhino?65:56,rhino?49:51,p[0],p[1],p[2]);
 if(wolf||fox){for(const s of [-1,1])poly(c,[[s*40,-173],[s*66,-164],[s*48,-150],[s*62,-143],[s*30,-137]],p[0]);fur(c,0,-180,46,40,'#ffffff88',100);}
 if(turtle){shade(c,33,-157,41,31,'#e6d9a2','#9aaa78','#617653');for(let i=0;i<4;i++)oval(c,-21+i*18,-215-i%2*12,12,24,i%2?'#b6c98a':'#6d956c',(i-2)*.25);}
 if(rhino){shade(c,48,-166,44,28,'#d6b38c','#ac876a','#79625d');poly(c,[[31,-178],[43,-231],[61,-187],[69,-172]],'#ede1b7','#92795f');for(const s of [-1,1])oval(c,s*49,-211,18,23,p[1],s*.5);line(c,[[-43,-191],[-31,-179],[-43,-162]],'#ffc27b',2);}
 eye(c,2,-182,rhino?.85:1.03,cat?'#9a7442':'#446273');eye(c,43,-182,rhino?.8:.96,cat?'#9a7442':'#446273');
 if(!rhino){shade(c,34,-151,28,16,'#fff8e2',p[3],p[0]);oval(c,47,-160,7,5,p[2]);line(c,[[35,-143],[44,-139],[54,-143]],'#5b6570',1.6);}
 if(cat){for(const s of [-1,1]){line(c,[[s<0?-10:47,-159],[s<0?-51:84,-166]],'#e6dfef99',1);line(c,[[s<0?-10:47,-154],[s<0?-48:84,-148]],'#e6dfef99',1);}poly(c,[[-19,-197],[-4,-210],[10,-198],[0,-180]],p[2]);}
 paw(c,-55,-116,.35,p,.92);paw(c,58+(attack?30*a:0),-119-(attack?10*a:0),attack?-1.2*a:-.42,p,1.06);
 if(wolf){poly(c,[[-50,-153],[-14,-131],[51,-145],[48,-126],[-11,-105],[-48,-126]],'#37677e');gem(c,1,-128,15,'#a8eaff');for(let i=0;i<4;i++)poly(c,[[-55-i*7,-137+i*10],[-82-i*4,-145+i*9],[-63-i*7,-119+i*10]],'#c4f3f6');}
 if(cat){poly(c,[[3,-132],[-15,-101],[5,-108],[-5,-79],[29,-119],[7,-114]],'#ffdda0','#77638c');}
 if(turtle){gem(c,38,-111,13,'#c0e295');for(let i=0;i<3;i++){const x=-55+i*22,y=-180-i%2*18;line(c,[[x,y+16],[x,y-5]],'#d9dfbf',5);oval(c,x,y-4,15,8,i%2?'#dbb487':'#a9c4ad');for(let j=0;j<3;j++)oval(c,x-7+j*7,y-6,2,2,'#f6efc9');}}
 if(tier){poly(c,[[-57,-138],[-31,-152],[-12,-132],[-29,-115],[-56,-122]],'#879caa','#ecd699');gem(c,-31,-132,8,M.styles[id].color);}
 if(tier>1){poly(c,[[-17,-227],[-21,-251],[-4,-240],[10,-266],[22,-241],[41,-251],[36,-228]],'#dbb974','#f9e4ac');gem(c,10,-241,5,M.styles[id].color);}if(tier>2){c.strokeStyle='#efd89188';c.lineWidth=2;c.beginPath();c.arc(0,-124,113,.2,2.9);c.stroke();}
 c.restore();}
function sprite(id,pose,frame,tier){const key=[id,pose,frame,tier].join(':');if(cache.has(key))return cache.get(key);const cv=document.createElement('canvas');cv.width=416;cv.height=384;const c=cv.getContext('2d');c.translate(208,337);if(id==='twins'){c.save();c.translate(-39,-2);c.scale(.78,.78);critter(c,'frost',pose,(frame+1)%3,tier);c.restore();c.save();c.translate(45,0);c.scale(.81,.81);critter(c,'twins',pose,frame,tier);c.restore();}else critter(c,id,pose,frame,tier);cache.set(key,cv);if(cache.size>56)cache.delete(cache.keys().next().value);return cv;}
const ready=Promise.all(['fluffy','water-rat'].map(id=>new Promise(resolve=>{const img=new Image();img.onload=()=>{atlases[id]=img;window.dispatchEvent(new Event('beast-art-ready'));resolve(true);};img.onerror=()=>resolve(false);img.src='./assets/'+id+'-atlas.png';})));
function drawBossGolem(c,p,time,opts={}){
 const scale=opts.scale||1.4,pose=p.action||'idle',attack=['punch','super','special','spin'].includes(pose),bob=Math.sin(time*(p.moving?6:1.6))*3;
 c.save();c.translate(p.x,p.y+bob);c.scale(p.face===-1?-1:1,1);if(p.alive===false){c.rotate(-.7);c.globalAlpha=.65;}
 c.scale(scale,scale);
 const stone=['#d9cdf2','#8d7bb8','#3a2f57'],glow=p.weak>0?'#ffd98a':'#cbb7ff';
 shade(c,0,-95,86,95,stone[0],stone[1],stone[2]);
 shade(c,0,-205,54,48,stone[0],stone[1],stone[2]);
 oval(c,0,-252,26,20,stone[0]);
 for(const sx of [-1,1]){c.save();c.translate(sx*84,-140+(attack?Math.sin(time*22)*10:0));c.rotate(sx*(attack?.55:.18));shade(c,0,0,24,64,stone[0],stone[1],stone[2]);c.restore();shade(c,sx*40,-28,30,34,stone[0],stone[1],stone[2]);}
 gem(c,0,-160,17,glow);
 eye(c,-18,-238,1.15,'#ffb14a');eye(c,18,-238,1.15,'#ffb14a');
 c.strokeStyle=glow;c.lineWidth=3;c.beginPath();c.ellipse(0,-150,66,84,0,0,Math.PI*2);c.stroke();
 poly(c,[[-40,-300],[-22,-336],[0,-316],[22,-336],[40,-300]],'#cbb7ff','#f4e9ff');gem(c,0,-318,12,'#ffd98a');
 if(p.flash>0){c.strokeStyle='#fff7d6cc';c.lineWidth=5;c.beginPath();c.ellipse(0,-150,96,130,0,0,Math.PI*2);c.stroke();}
 c.restore();
}
function drawBeast(c,p,time,opts={}){if(p.boss){drawBossGolem(c,p,time,opts);if(p.shield>0){c.save();c.strokeStyle='#9fe5ffcc';c.lineWidth=4;c.beginPath();c.ellipse(p.x,p.y-150*opts.scale||p.y-150,150,180,0,0,Math.PI*2);c.stroke();c.restore();}return;}const id=p.character||'frost',scale=(opts.scale||.68)*(1+(p.evolution||0)*.025),fly=!opts.static&&p.y<(p.gy??480)-15;let pose=p.blocking?'block':POSES.includes(p.action)&&!['idle','walk'].includes(p.action)?p.action:fly?'fly':p.moving?'walk':'idle';if(p.action==='jump')pose='fly';let frame=opts.static?1:Math.floor(time*(pose==='walk'?10:pose==='idle'?2.5:9))%3;const bob=opts.static?0:Math.sin(time*(fly?3:2))*1.1;
 c.save();c.translate(p.x,p.y+bob);c.scale(p.face===-1?-1:1,1);if(p.alive===false){c.rotate(-1.05);c.globalAlpha=.6;}if(p.invulnerable>.02)c.globalAlpha=.74;c.scale(scale,scale);if(atlases[id])c.scale(.9,.9);
 if(atlases[id]){const n=POSES.indexOf(pose)*3+frame;c.drawImage(atlases[id],n%5*320,Math.floor(n/5)*360,320,360,-160,-309,320,360);if(p.evolution){gem(c,0,-92,12+3*p.evolution,M.styles[id].color);if(p.evolution>1){c.strokeStyle='#ebd49b';c.lineWidth=2;c.beginPath();c.ellipse(0,-160,110,128,0,Math.PI,Math.PI*2);c.stroke();}}}
 else if(id==='fluffy'||id==='water-rat'){shade(c,0,-125,72,90,palettes[id][0],palettes[id][1],palettes[id][2]);eye(c,-20,-160);eye(c,25,-160);gem(c,0,-85,17,palettes[id][0]);}
 else c.drawImage(sprite(id,pose,frame,p.evolution||0),-208,-337);
 if(p.flash>0){c.strokeStyle='#fff7d6cc';c.lineWidth=3;c.beginPath();c.ellipse(0,-120,78,113,0,0,Math.PI*2);c.stroke();}c.restore();
 if(p.shield>0||p.bubbled>0){c.save();c.strokeStyle=p.bubbled?'#ddfaff':'#a1dfd7';c.lineWidth=2.3;c.fillStyle='#bcefff13';c.beginPath();c.ellipse(p.x,p.y-77,70,92,0,0,Math.PI*2);c.fill();c.stroke();oval(c,p.x-38,p.y-126,10,18,'#ffffff38',.7);if(p.shield>0){c.font='bold 11px Arial';c.textAlign='center';c.fillStyle='#d8fff4';c.fillText('◇ '+Math.ceil(p.shield),p.x,p.y-180);}c.restore();}
 if(p.frozen>0||p.rooted>0){for(let i=0;i<5;i++){const x=p.x-36+i*18;poly(c,[[x-11,p.y],[x-6,p.y-40-i%2*25],[x+3,p.y-58],[x+12,p.y]],p.rooted?'#78b28a88':'#b5e8ff88');}}
}
function mountain(c,x,y,w,h,color){poly(c,[[x-w,y],[x-w*.45,y-h*.67],[x-w*.12,y-h*.56],[x+w*.1,y-h],[x+w*.48,y-h*.45],[x+w,y]],color);}
function pillar(c,x,y,h){const g=c.createLinearGradient(x-25,0,x+25,0);g.addColorStop(0,'#263c4a');g.addColorStop(.5,'#66817e');g.addColorStop(1,'#243b48');poly(c,[[x-27,y],[x-23,y-h],[x+19,y-h-12],[x+27,y]],g,'#9fb3a34d');for(let i=0;i<5;i++){const sy=y-h+45+i*42;line(c,[[x-8,sy],[x+6,sy-8],[x+12,sy+6],[x-1,sy+13]],'#c5cfa650',2);}poly(c,[[x-40,y-h],[x-29,y-h-17],[x+28,y-h-23],[x+39,y-h-7]],'#90a29a');}
function background(id){if(backgrounds.has(id))return backgrounds.get(id);const cv=document.createElement('canvas');cv.width=1200;cv.height=600;const c=cv.getContext('2d'),forge=id==='forge',grove=id==='grove';const colors=forge?['#191926','#66454d','#df9b68']:grove?['#143639','#577b68','#d4dfad']:['#10243e','#4e6680','#d7e5e1'];const sky=c.createLinearGradient(0,0,0,520);sky.addColorStop(0,colors[0]);sky.addColorStop(1,colors[1]);c.fillStyle=sky;c.fillRect(0,0,1200,600);
 const halo=c.createRadialGradient(840,120,5,840,120,300);halo.addColorStop(0,colors[2]+'36');halo.addColorStop(1,colors[2]+'00');c.fillStyle=halo;c.fillRect(400,0,800,430);
 if(!forge&&!grove){oval(c,855,123,61,61,'#e7ecdc');oval(c,838,110,55,53,'#52687b22');for(let i=0;i<90;i++){const x=(i*173+27)%1200,y=(i*41)%310;oval(c,x,y,i%9===0?1.8:.8,.9,'#ddeaf69c');}for(let i=0;i<4;i++){const x=160+i*277,y=205+i%2*65;poly(c,[[x-59,y],[x+56,y],[x+21,y+27],[x-8,y+76]],'#3e596c');line(c,[[x-47,y],[x+48,y]],'#bfd3c06b',3);}}
 for(let i=0;i<7;i++)mountain(c,i*235-40,400,220,120+i%3*48,['#203f53','#305265','#426573'][i%3]);
 c.fillStyle=forge?'#604046':grove?'#53766b':'#416677';c.fillRect(0,393,1200,100);
 for(let i=0;i<26;i++)line(c,[[(i*173)%1200,399+i*3],[(i*173)%1200+45+i%4*20,399+i*3]],colors[2]+'24',1);
 if(grove){for(let i=0;i<7;i++){const x=i*224-50;const bark=c.createLinearGradient(x,0,x+90,0);bark.addColorStop(0,'#173b3c');bark.addColorStop(.6,'#3b6252');bark.addColorStop(1,'#152f39');poly(c,[[x-28,485],[x+17,40],[x+73,-20],[x+93,325],[x+150,484]],bark);for(let j=0;j<4;j++)line(c,[[x+25+j*14,65],[x+20+j*14,240],[x+48+j*12,456]],'#74907529',2);for(let j=0;j<4;j++)oval(c,x+20+j*45,j%2*39,110,52,j%2?'#537a5b':'#285645');}for(let i=0;i<16;i++){const x=i*79;line(c,[[x,486],[x-12,469],[x+5,443]],'#547b63',3);oval(c,x+6,452,8,17,'#b0c68a',.8);}}
 else if(forge){for(let i=0;i<5;i++){const x=100+i*255;c.fillStyle='#253441';c.fillRect(x,120,94,370);poly(c,[[x-13,129],[x+46,83],[x+112,126]],'#4c5261');c.strokeStyle='#997b67';c.lineWidth=3;c.strokeRect(x+16,151,62,245);for(let j=0;j<5;j++)gem(c,x+46,181+j*43,9,j%2?'#dcaf76':'#547d83');}poly(c,[[480,460],[534,419],[586,442],[674,398],[761,415],[696,455],[591,477]],'#ffbc7655');for(let i=0;i<6;i++)line(c,[[495+i*37,458-i%2*12],[515+i*39,449-i%3*8]],'#ffd696',3);}
 else{pillar(c,130,478,245);pillar(c,1060,478,290);poly(c,[[315,427],[338,320],[355,302],[373,421]],'#526d74');poly(c,[[388,424],[406,347],[419,339],[434,420]],'#56757b');}
 oval(c,600,548,635,49,'#071823');const floor=c.createLinearGradient(0,473,0,555);floor.addColorStop(0,grove?'#879788':'#83918a');floor.addColorStop(.4,'#516c6a');floor.addColorStop(1,'#263f48');poly(c,[[16,480],[1184,480],[1135,549],[63,549]],floor,'#ced4b44d');poly(c,[[63,549],[1135,549],[1108,574],[89,574]],'#213640');
 for(let row=0;row<3;row++){const y=484+row*20;for(let i=0;i<16;i++){const x=24+i*77+(row%2)*25;line(c,[[x,y],[x+66,y],[x+54,y+15]],'#d4d5b82b',1);}}for(let i=0;i<14;i++){const x=52+i*84;line(c,[[x,494],[x+6,507],[x+1,515],[x+15,526]],'#203f4255',1);}
 c.strokeStyle='#d6caa17a';c.lineWidth=2;c.beginPath();c.ellipse(600,509,102,20,0,0,Math.PI*2);c.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;gem(c,600+Math.cos(a)*103,509+Math.sin(a)*20,3,'#cbbf92');}
 for(const side of [0,1]){const x=side?1138:62;poly(c,[[x-22,478],[x-17,445],[x+17,443],[x+27,480]],'#29454b');gem(c,x,443,17,colors[2]);if(grove)for(let i=0;i<7;i++)oval(c,x-40+i*12,489,6,16,'#6a916c',(i-3)*.23);}
 backgrounds.set(id,cv);return cv;}
function lightning(c,x,y,tx,ty,color,width=3){const pts=[[x,y]];for(let i=1;i<7;i++){const t=i/7,zig=(i%2?1:-1)*8;pts.push([x+(tx-x)*t+zig*.25,y+(ty-y)*t+zig]);}pts.push([tx,ty]);line(c,pts,color,width);line(c,pts,'#ffffffbb',1);}
function snowflake(c,x,y,r,color){for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,2);}}
function droplet(c,x,y,r,color){c.save();c.translate(x,y);c.beginPath();c.moveTo(0,-r);c.bezierCurveTo(r*1.5,0,r*.8,r,0,r);c.bezierCurveTo(-r*.8,r,-r*1.5,0,0,-r);c.fillStyle=color;c.fill();oval(c,-r*.23,r*.1,r*.2,r*.36,'#ffffff88');c.restore();}
function flame(c,x,y,r,color){poly(c,[[x-r*.6,y+r*.7],[x-r,y],[x-r*.2,y-r*.6],[x+r*.12,y-r*1.5],[x+r*.5,y-r*.3],[x+r*.9,y],[x+r*.4,y+r*.7]],color);poly(c,[[x-r*.25,y+r*.55],[x-r*.35,y],[x+r*.1,y-r*.48],[x+r*.35,y+r*.4]],'#fff1b8');}
function ring(c,x,y,r,color,width=3,flat=false){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,r,flat?r*.25:r,0,0,Math.PI*2);c.stroke();}
function drawProjectile(c,b,time){oval(c,b.x,groundYOf(b.z)+4,9,3,'#09223844');c.save();c.translate(b.x,b.y);const angle=Math.atan2(b.vy,b.vx);c.rotate(angle);const color=M.styles[b.character].color;
 if(b.fx==='ice-lance'){poly(c,[[-34,0],[0,-11],[34,0],[0,11]],'#d6faff','#9fdced');poly(c,[[-18,0],[12,-5],[34,0]],'#fff');line(c,[[-63,-3],[-30,-3]],'#bdf5ff88',4);}
 else if(b.fx==='lava-bomb'){shade(c,0,0,23,23,'#e2bb82','#805951','#3c3140');line(c,[[-14,-12],[0,-4],[-6,9],[9,18]],'#ffd488',4);for(let i=0;i<3;i++)flame(c,-27-i*10,(i-1)*6,9-i,color);}
 else if(b.fx==='root-seed'){oval(c,0,0,23,15,'#c2d895');line(c,[[-20,0],[20,0]],'#5d906b',2);for(const s of [-1,1])oval(c,-15,s*13,15,6,'#85b887',s*.5);}
 else if(b.fx==='return-comet'){gem(c,0,0,23,'#f8df9c');for(let i=0;i<5;i++){oval(c,-30-i*11,Math.sin(i+time*8)*8,11-i,4,i%2?'#a3eaff88':'#ffe9a088');}}
 else if(b.fx==='fire-petals'){flame(c,0,0,19,color);}
 else if(b.fx==='water-jet'){const g=c.createLinearGradient(-75,0,25,0);g.addColorStop(0,'#9bdcff00');g.addColorStop(1,'#e4ffff');c.fillStyle=g;c.beginPath();c.ellipse(-22,0,59,12,0,0,Math.PI*2);c.fill();line(c,[[-60,-2],[20,-2]],'#f3ffff',3);}
 else if(b.fx==='bubble-prison'){oval(c,0,0,35,35,'#b8eaff2b');ring(c,0,0,35,'#dbfbff',2);oval(c,-12,-16,8,12,'#f6ffff88',.7);ring(c,6,6,23,'#bdd6f755',2);}
 c.restore();}
function drawZone(c,z,time){const color=(M.styles[z.character]||{color:'#cbb7ff'}).color;c.save();const waiting=z.wait>0;c.globalAlpha=waiting?.42:.8;c.strokeStyle=color;c.lineWidth=waiting?2:3;c.beginPath();c.ellipse(z.x,z.y+2,z.range,z.range*.30,0,0,Math.PI*2);c.stroke();ring(c,z.x,z.y+2,z.range*.55,color,waiting?1.5:2,true);if(waiting){for(let i=0;i<4;i++)line(c,[[z.x-z.range+i*z.range*.6,z.y-8],[z.x-z.range+i*z.range*.6+14,z.y+6]],color,2);c.restore();return;}
 if(z.fx==='crystal-cage'||z.fx==='ice-trail'){for(let i=0;i<5;i++){const x=z.x+(i-2)*z.range*.35,h=z.fx==='ice-trail'?24:55+(i%3)*20;poly(c,[[x-12,z.y],[x-15,z.y-h*.6],[x,z.y-h],[x+14,z.y-h*.6],[x+10,z.y]],'#b5eaffaa','#e4fbff');line(c,[[x,z.y-h],[x+1,z.y-6]],'#fff',1);}}
 else if(z.fx==='eruption'){for(let i=0;i<5;i++)flame(c,z.x+(i-2)*30,z.y-28,30+(i%2)*15,'#edb477dd');}
 else if(['living-grove','briar-ring'].includes(z.fx)){for(let i=0;i<7;i++){const x=z.x+(i-3)*z.range*.26;line(c,[[x,z.y],[x+12,z.y-24],[x-3,z.y-48]],'#8dc590',3);oval(c,x+8,z.y-31,8,15,'#c1daa2',.8);if(z.fx==='living-grove')oval(c,x-3,z.y-47,6,6,'#fff0b5');}}
 else{for(let i=0;i<6;i++){const a=time*1.4+i*Math.PI/3,x=z.x+Math.cos(a)*z.range,y=z.y-26+Math.sin(a)*z.range*.25;if(z.character==='frost')snowflake(c,x,y,8,color);else if(z.character==='volt')lightning(c,x,y,x+10,y-28,color,2);else gem(c,x,y,7,i%2?color:'#c5edff');}}
 c.restore();}
function meleeFX(c,e,t){const style=e.style||e.fx||'',color=e.color,face=e.face||1;c.save();c.translate(e.x,e.y);c.scale(face,1);
 if(/vine|shell/.test(style)){c.strokeStyle='#a4d5a2';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(45,-60,91,40,e.range||120,-10);c.stroke();for(let i=0;i<4;i++)oval(c,30+i*25,-12+i%2*18,7,15,'#deedba',.8);}
 else if(/stone|quake|magma/.test(style)){for(let i=0;i<6;i++){const x=35+i*13;poly(c,[[x,-10-i%2*13],[x+11,-24-i%2*9],[x+22,-10],[x+12,2]],i%2?'#ffcd88':'#bc8a66');}line(c,[[18,8],[43,-7],[64,7],[98,-10],[127,5]],'#ffe1a2',3);}
 else if(/spark|thunder|afterstrike/.test(style))for(let i=0;i<3;i++)lightning(c,12,-22+i*16,100+t*40,-35+i*25,color,3);
 else if(/double|twin|pincer/.test(style)){for(const s of [-1,1]){c.strokeStyle=s<0?'#a6eaff':'#ffe4a1';c.lineWidth=7;c.beginPath();c.arc(35+s*23,0,42,-1.6+t*.5,.7);c.stroke();}}
 else if(/warm|dragon/.test(style)){if(style==='warm-paw'){oval(c,52,0,16,12,'#ffcdb0');for(let i=0;i<3;i++)oval(c,39+i*12,-18,6,8,'#fff0c1');}else{c.strokeStyle='#ffe0aa';c.lineWidth=7;c.beginPath();c.arc(0,0,70,-2,1.4);c.stroke();for(let i=0;i<4;i++)flame(c,34+i*18,-20+Math.sin(i)*20,13,color);}}
 else if(/splash|foam/.test(style)){for(let i=0;i<6;i++)droplet(c,25+i*16,-30+Math.sin(i+t*4)*27,7+i%2*3,'#c6f1ff');}
 else {for(let i=0;i<3;i++){c.strokeStyle=i%2?'#f3ffff':color;c.lineWidth=4;c.beginPath();c.moveTo(16,-40+i*17);c.quadraticCurveTo(74,-55+i*20,111,-15+i*21);c.stroke();}snowflake(c,105,1,12,color);}
 c.restore();}
function drawEffect(c,e,time){const t=1-e.life/(e.maxLife||.55),color=e.color||'#e9d7a3';c.save();c.globalAlpha=Math.min(1,e.life*5);
 if(e.type==='cast'){if(['punch','kick'].includes(e.kind))meleeFX(c,e,t);else if(e.kind==='super'||e.kind==='special'){ring(c,e.x,e.y,28+t*18,color,2);gem(c,e.x,e.y,8,color);}}
 else if(e.type==='breath'){c.save();c.translate(e.x,e.y);c.scale(e.face||1,1);const g=c.createLinearGradient(0,0,e.range,0);g.addColorStop(0,'#ffedbddd');g.addColorStop(.6,'#fda982aa');g.addColorStop(1,'#e8795d11');poly(c,[[0,-7],[e.range,-64],[e.range+12,55],[0,9]],g);for(let i=0;i<8;i++)flame(c,30+i*28,Math.sin(i*2+time*15)*20,15+i*2,'#ffd79a99');c.restore();}
 else if(e.type==='chain')lightning(c,e.x,e.y,e.endX,e.endY,'#e0c4ff',5);
 else if(e.type==='trail'){if(e.style==='flash-step')lightning(c,e.x,e.y,e.endX,e.endY,'#edd6ff',4);else if(e.style==='ripple-slip'){for(let i=0;i<5;i++)ring(c,e.x+(e.endX-e.x)*i/4,e.y+58,23+i*5,'#c4ebff99',2,true);}else if(e.style==='cloud-ride'){for(let i=0;i<6;i++)oval(c,e.x+(e.endX-e.x)*i/6,e.y+40-(i%2)*9,23,12,'#fff1d966');}else{for(let i=0;i<5;i++)gem(c,e.x+(e.endX-e.x)*i/4,e.y,10-i,color+'88');}}
 else if(e.type==='afterimage'||e.type==='partner'){c.globalAlpha*=.32;drawBeast(c,{character:e.character,x:e.x,y:e.y+70,face:e.face,action:'punch',alive:true},time,{scale:.62,static:true});}
 else if(e.type==='pincer'){const x=e.x+(e.endX-e.x)*Math.min(1,t*1.5);c.globalAlpha*=.6;drawBeast(c,{character:e.sign<0?'frost':'twins',x,y:e.y+70,face:e.sign<0?1:-1,action:'dash',alive:true},time,{scale:.48});}
 else if(e.type==='dive-mark'){ring(c,e.x,e.y+3,e.range*(.55+t*.45),'#ffd8b0',2,true);line(c,[[e.x-12,e.y-25],[e.x,e.y-13],[e.x+12,e.y-25]],'#fff1c6',3);}
 else if(e.type==='impact'||e.type==='zone-pulse'){const r=(e.range||70)*(.3+t*.75);if(/lava|sky-dive|eruption/.test(e.style)){ring(c,e.x,e.y,r,'#ffcf91',4,true);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;flame(c,e.x+Math.cos(a)*r*.7,e.y+Math.sin(a)*r*.3-20,14*(1-t)+7,'#ffbd84aa');}}else if(/bubble|water/.test(e.style)){ring(c,e.x,e.y,r,'#e0fbff',2);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;droplet(c,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,5,'#c6f5ff');}}else if(/root|grove|briar/.test(e.style)){for(let i=0;i<8;i++){const a=i*Math.PI/4;oval(c,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.3,7,13,'#d4ecb499',a);}}else ring(c,e.x,e.y,r,color,2,true);}
 else if(e.type==='echo')meleeFX(c,e,t);
 else if(['hit','shield-hit','spark-finish'].includes(e.type)){for(let i=0;i<6;i++){const a=i*Math.PI/3,r=12+t*24;line(c,[[e.x+Math.cos(a)*r,e.y+Math.sin(a)*r],[e.x+Math.cos(a)*(r+8),e.y+Math.sin(a)*(r+8)]],e.type==='shield-hit'?'#d7ffff':'#fff2ce',2);}if(e.amount){c.font='bold 12px Arial';c.textAlign='center';c.fillStyle='#fff3d8';c.fillText(e.amount,e.x,e.y-22-t*18);}}
 else if(e.type==='heal'||e.type==='charge'){c.font='bold 18px Arial';c.textAlign='center';c.fillStyle=e.type==='heal'?'#d4f4b6':'#ffdf9d';c.fillText(e.type==='heal'?'+'+(e.amount||8):'◆ +1',e.x,e.y-t*28);}
 else if(e.type==='knockout'){ring(c,e.x,e.y,20+t*80,'#eaddb4',2);}
 c.restore();}
function groundYOf(z){return 408+Math.max(0,Math.min(240,z||0))*.6;}
function drawWorld(c,world,time,{positions,reduced=true,myId,camera}={}){const camX=Math.max(0,Math.min((world.width||1920)-1200,camera?.x||0));c.save();c.translate(-camX,0);
 c.drawImage(background(world.arena||'moon'),0,0,world.width||1920,600);
 c.save();c.globalAlpha=.16;c.strokeStyle='#dff3ff';c.lineWidth=1.5;for(const zz of [0,60,120,180,240]){const gy=groundYOf(zz);c.beginPath();c.ellipse(960,gy,(world.width||1920)*.62,26+zz*.10,0,0,Math.PI*2);c.stroke();}c.restore();
 for(const z of world.zones||[])drawZone(c,z,time);
 const entities=[];
 for(const target of world.targets||[]){if(target.hp>0)entities.push({kind:'target',z:target.z??120,target});}
 for(const p of world.players||[]){const pos=positions?.get(p.id)||p;entities.push({kind:'player',z:pos.z??120,p,pos});}
 entities.sort((a,b)=>a.z-b.z);
 for(const e of entities){
  if(e.kind==='target'){const t=e.target,x=t.x,y=t.y,sc=.86+.28*(t.z??120)/240;c.save();c.translate(x,y);c.scale(sc,sc);c.translate(-x,-y);oval(c,x,y+6,25,6,'#0a223e55');shade(c,x,y-36,20,33,'#b8d0c4','#617f7d','#284b54');poly(c,[[x-25,y-60],[x-19,y-79],[x+17,y-83],[x+25,y-58]],'#889c87','#cad5b5');gem(c,x,y-48,11,t.flash?'#fff':'#d3ecc4');c.fillStyle='#263e48';c.fillRect(x-25,y-99,50,5);c.fillStyle='#d1dfa8';c.fillRect(x-25,y-99,50*t.hp/t.maxHp,5);c.restore();continue;}
  const p=e.p,pos=e.pos,z=pos.z??120,gy=groundYOf(z),sc=(.86+.28*z/240)*(p.boss?2.15:1);
  oval(c,pos.x,gy+6,37*sc,7*sc,'#09223866');
  drawBeast(c,{...p,x:pos.x,y:pos.y,gy,face:pos.face||p.face},time,{scale:.68*sc});
  if(p.boss){c.save();c.translate(pos.x,pos.y-330*sc/1.15);c.scale(sc/2.15,sc/2.15);poly(c,[[-58,10],[-34,-34],[0,-14],[34,-34],[58,10]],'#cbb7ff','#f4e9ff');gem(c,0,-8,15,'#ffd98a');c.restore();}
  c.fillStyle=p.boss?'#e8dcff':'#f0eee1';c.font='bold '+(p.boss?15:11)+'px Arial';c.textAlign='center';
  c.fillText((p.boss?'☠ ':'')+(p.boss?'CROWN GOLEM':p.name+(p.id===myId?' · YOU':'')),pos.x,Math.max(22,pos.y-210*(p.boss?1.55:1)));
  if(p.charges){c.fillStyle='#f7d799';c.fillText('◆ '+p.charges+'/5',pos.x,Math.max(36,pos.y-195));}
  if(p.respawn>0)c.fillText('BACK IN '+Math.ceil(p.respawn),pos.x,pos.y-225);
  if(p.boss&&p.weak>0){c.fillStyle='#ffd98a';c.font='bold 13px Arial';c.fillText('WEAK POINT — ATTACK!',pos.x,pos.y-360);}
 }
 for(const b of world.projectiles||[])drawProjectile(c,b,time);
 const effects=world.effects||[];for(const e of effects.slice(reduced?-18:-38))drawEffect(c,e,time);
 c.restore();
}
function portrait(canvas,id,tier=0){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const color=M.styles[id].color;const g=c.createRadialGradient(canvas.width*.52,canvas.height*.55,4,canvas.width*.52,canvas.height*.55,canvas.height*.6);g.addColorStop(0,color+'35');g.addColorStop(.65,color+'10');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,canvas.width,canvas.height);oval(c,canvas.width*.5,canvas.height*.92,canvas.width*.22,11,'#081a2866');c.save();c.globalAlpha=.4;ring(c,canvas.width*.5,canvas.height*.57,canvas.height*.36,color,1);for(let i=0;i<6;i++){const a=i*Math.PI/3;gem(c,canvas.width*.5+Math.cos(a)*canvas.height*.37,canvas.height*.57+Math.sin(a)*canvas.height*.37,3,color);}c.restore();drawBeast(c,{character:id,x:canvas.width*.5,y:canvas.height*.93,face:1,evolution:tier,alive:true,action:'idle'},0,{scale:Math.min(canvas.width/390,canvas.height/305),static:true});}
window.BeastArt={drawWorld,drawBeast,portrait,palettes,cache,backgrounds,background,ready,atlases};
})();
