/* Registered accents shared by day/night world and destination frames. */
function paintLivingAccents(c,t,w,h,night,id){
 const sites=id?{nift:[[.39,.43],[.48,.50],[.61,.40]],sant:[[.45,.47],[.58,.54],[.69,.40]],janitri:[[.40,.39],[.52,.51],[.65,.46]],ministry:[[.38,.38],[.51,.48],[.64,.38]],me:[[.47,.52],[.62,.49],[.76,.57]]}[id]:[[.46,.46],[.50,.43],[.55,.47],[.83,.57],[.85,.37],[.90,.18],[.79,.76]];
 c.save();c.globalCompositeOperation='screen';for(let k=0;k<sites.length;k++){const [x,y]=sites[k],r=w*(id?.009:.004),a=(night?.24:.09)*(1+Math.sin(t*.65+k*2)*.13),g=c.createRadialGradient(x*w,y*h,0,x*w,y*h,r*3);g.addColorStop(0,`rgba(255,209,125,${a})`);g.addColorStop(1,'rgba(255,209,125,0)');c.fillStyle=g;c.fillRect(x*w-r*3,y*h-r*3,r*6,r*6)}
 for(let j=0;j<(night?22:8);j++){const x=((j*.618)%1)*w,y=(.015+(j*.137%1)*.16)*h,a=Math.pow(Math.max(0,Math.sin(t*.65+j*2.1)),8)*(night?.55:.18);c.strokeStyle=`rgba(255,243,205,${a})`;c.lineWidth=.7;const r=1.7+(j%3);c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.moveTo(x,y-r);c.lineTo(x,y+r);c.stroke()}
 c.restore();
}
const magicalFlightImages={};for(const name of ['buckbeak','dragon','dementor','buckbeak-down','dragon-down','wizard']){const im=new Image();im.src='assets/'+name+'-flight.webp';magicalFlightImages[name]=im;}
function paintSkyMagic(c,t,w,h,night,id){c.save();c.beginPath();[[.32,0],[.80,0],[.77,.10],[.65,.14],[.57,.18],[.48,.16],[.40,.18],[.32,.13]].forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();c.clip();
 if(night){c.restore();return;
 }else{const x=.67*w,y=.075*h,r=w*.045,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,243,193,.72)');g.addColorStop(.12,'rgba(255,237,171,.48)');g.addColorStop(.4,'rgba(255,228,164,.09)');g.addColorStop(1,'rgba(255,228,164,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}c.restore();
}
function flyingSprite(c,name,x,y,size,t,night,bank=0){const im=magicalFlightImages[name];if(!im?.complete||!im.naturalWidth)return;c.save();c.shadowBlur=0;c.globalCompositeOperation='source-over';c.translate(x,y+Math.sin(t*.8)*3);c.rotate(bank+Math.sin(t*.35)*.025);c.globalAlpha*=name==='dementor'?.92:.96;c.filter=name==='dementor'?'brightness(1.24) contrast(1.08)':night?'brightness(1.18) saturate(1.04) contrast(1.03) drop-shadow(0px 0px 1px rgba(220,230,241,.20))':'brightness(1.16) saturate(1.06) drop-shadow(0px 0px 2px rgba(255,245,215,.28))';const height=size*im.naturalHeight/im.naturalWidth;
 const down=magicalFlightImages[name+'-down'];if(down?.complete&&down.naturalWidth){const blend=Math.max(0,Math.min(1,(Math.sin(t*(name==='dragon'?8:10))+.18)/.36)),alpha=c.globalAlpha;c.globalAlpha=alpha*(1-blend);c.drawImage(im,-size/2,-height/2,size,height);c.globalAlpha=alpha*blend;c.drawImage(down,-size/2,-height/2,size,height)}else if(name==='dementor'){for(let j=0;j<30;j++){const a=j/30;c.drawImage(im,0,a*im.naturalHeight,im.naturalWidth,im.naturalHeight/30,-size/2+Math.sin(t*1.7+a*8)*a*size*.025,-height/2+a*height,size,height/30+.5)}}else{for(let j=0;j<28;j++){const a=j/28,wing=Math.pow(Math.abs(a-.5)*2,1.6),sy=1+Math.sin(t*2.3)*wing*.12;c.save();c.scale(1,sy);c.drawImage(im,a*im.naturalWidth,0,im.naturalWidth/28,im.naturalHeight,-size/2+a*size,-height*.5,size/28+.5,height);c.restore()}}c.restore();}

let skyFlightEpoch=null;
function skyCast(t,night){
 if(skyFlightEpoch===null)skyFlightEpoch=t;
 const clock=Math.max(0,t-skyFlightEpoch)%42,actors=[];
 const stages=[{start:0,end:14,names:['buckbeak','dragon']},{start:14,end:28,names:['broom','phoenix']},{start:28,end:42,names:['car','phoenix']}];
 const stage=stages.find(s=>clock>=s.start&&clock<s.end),q=(clock-stage.start)/(stage.end-stage.start);
 for(let i=0;i<stage.names.length;i++){const name=stage.names[i];actors.push({name,q,lane:i?.20:.12,index:i,scale:(name==='dragon'?1:.86)*(1+Math.sin(q*Math.PI)*.09),direction:stage.names.length===1?-1:(i===0?1:-1)});}
 return actors;
}
// Skyline follows the distant mountain ridge, with architecture cutting in front.
const flightRidge=[[0,.16],[.06,.22],[.13,.21],[.19,.29],[.25,.31],[.33,.255],[.39,.285],[.44,.26],[.50,.215],[.56,.29],[.62,.26],[.68,.29],[.73,.235],[.78,.245],[.82,.20],[.86,.09],[.90,.04],[.94,0],[1,0]];
function ridgeHeight(x){x=Math.max(0,Math.min(1,x));for(let i=1;i<flightRidge.length;i++){const a=flightRidge[i-1],b=flightRidge[i];if(x<=b[0]){const q=(x-a[0])/(b[0]-a[0]),e=q*q*(3-2*q);return a[1]+(b[1]-a[1])*e;}}return 0;}
function clipFlightSky(c,w,h,id){c.beginPath();c.moveTo(0,0);c.lineTo(w,0);if(id){const skyline={nift:[[1,.22],[.82,.24],[.70,.16],[.64,.23],[.53,.13],[.44,.22],[.36,.30],[0,.40]],sant:[[1,.12],[.80,.20],[.69,.12],[.60,.28],[.49,.20],[.40,.35],[0,.43]],janitri:[[1,.20],[.80,.21],[.67,.15],[.60,.25],[.50,.20],[.35,.36],[0,.40]],ministry:[[1,.14],[.82,.15],[.72,.10],[.64,.20],[.50,.16],[0,.36]],me:[[1,.10],[.80,.18],[.68,.04],[.62,.16],[.56,.03],[.50,.19],[.40,.28],[0,.30]]}[id];for(const [x,y]of skyline)c.lineTo(x*w,y*h);}else{for(let i=flightRidge.length-1;i>=0;i--)c.lineTo(flightRidge[i][0]*w,flightRidge[i][1]*h);}
 c.closePath();c.clip();}
function flightPose(actor,w,h){const q=actor.q,d=actor.direction||1,x=d===-1?1.15-q*1.30:-.15+q*1.30;const offset=(actor.index||0)*.067,y=.105+offset+Math.sin(q*Math.PI*2)*.014+Math.sin(q*Math.PI)*.018;const slope=(Math.cos(q*Math.PI*2)*.028*Math.PI+Math.cos(q*Math.PI)*.018*Math.PI)*h/(1.3*w);return{x:x*w,y:y*h,bank:Math.max(-.10,Math.min(.10,slope*d))};}
function paintRoofDementors(c,t,w,h,night){c.save();
 // A hole cut to Hogwarts' roof silhouette makes nearby Dementors disappear behind the towers.

 const guardPosts=[[.39,.32],[.50,.30],[.60,.32]];for(let k=0;k<guardPosts.length;k++){const a=t*.24+k*2.1,x=guardPosts[k][0]+Math.sin(a)*.012,y=guardPosts[k][1]+Math.cos(a)*.008,size=w*.023;c.globalAlpha=.68;flyingSprite(c,'dementor',x*w,y*h,size,t+k*2,night,Math.sin(a)*.04);}
 c.restore();}

function lanternPose(t,index){const duration=26+(index%5)*2.5,q=((t+index*2.19)%duration)/duration,side=index%2?1:-1,start=.69+(index*.067% .28),sweep=side*(.10+(index%4)*.035),x=start+sweep*q+Math.sin(q*Math.PI*2+index)*.035*Math.sin(q*Math.PI);return{x,y:1.08-q*1.24,q,alpha:Math.min(1,q*10,(1-q)*10)};}
function paintFloatingLanterns(c,t,w,h,night){c.save();for(let i=0;i<22;i++){const p=lanternPose(t,i),r=Math.max(1.6,w*(.0015+(i%3)*.00045));c.save();c.translate(p.x*w,p.y*h);c.rotate(Math.sin(t*.32+i)*.09);c.globalAlpha=p.alpha*(night?.52:.34);c.shadowColor='#ffd48b';c.shadowBlur=r*3;c.fillStyle='#d9a45d';c.beginPath();c.roundRect(-r,-r*1.5,r*2,r*3,r*.4);c.fill();c.shadowBlur=0;c.fillStyle='#ffedb5';c.fillRect(-r*.52,-r,r*1.04,r*1.9);if(p.q>.55){const shine=(.35+.65*(.5+.5*Math.sin(t*2+i*1.7)))*Math.min(1,(p.q-.55)*4);c.globalAlpha*=shine;c.strokeStyle='#fff3c9';c.lineWidth=Math.max(.5,r*.18);c.shadowColor='#ffe8a3';c.shadowBlur=r*4;c.beginPath();c.moveTo(-r*2,0);c.lineTo(r*2,0);c.moveTo(0,-r*2.8);c.lineTo(0,r*2.8);c.stroke()}c.restore();}c.restore();}
function flightHighlight(c,x,y,size,night){const r=size*.95,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,night?'rgba(255,212,153,.09)':'rgba(255,240,198,.07)');g.addColorStop(1,'rgba(255,220,170,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}


function paintFlyingCreatures(c,t,w,h,night){for(const actor of skyCast(t,night)){if(!['buckbeak','dragon','dementor'].includes(actor.name))continue;const {name,q,lane,index}=actor,{x,y,bank}=flightPose(actor,w,h),size=Math.min(name==='dementor'?48:name==='dragon'?125:110,w*(name==='dementor'?.027:.078))*actor.scale;flightHighlight(c,x,y,size,night);flyingSprite(c,name,x,y,size,t,night,bank);
 if(name==='dragon'&&q>.32&&q<.62){c.save();c.translate(x,y+Math.sin(t*.8)*3);c.rotate(bank+Math.sin(t*.35)*.025);c.globalCompositeOperation='screen';const px=-size*.42,py=0,flame=(.5+.5*Math.sin(t*32))*size*.3+size*.24,g=c.createLinearGradient(px,py,px-flame,py);for(let j=0;j<6;j++){const age=(t*.7+j/6)%1,sx=px-flame*(.5+age*.8),sy=py-age*size*.14,r=size*(.025+age*.04),smoke=c.createRadialGradient(sx,sy,0,sx,sy,r);smoke.addColorStop(0,`rgba(193,183,169,${(1-age)*.24})`);smoke.addColorStop(1,'rgba(193,183,169,0)');c.fillStyle=smoke;c.fillRect(sx-r,sy-r,r*2,r*2)}g.addColorStop(0,'#fff0b9');g.addColorStop(.28,'#ffb335dd');g.addColorStop(1,'#e94f1100');c.fillStyle=g;c.beginPath();c.moveTo(px,py-2);c.quadraticCurveTo(px-flame*.6,py-11-Math.sin(t*24)*5,px-flame,py-3);c.quadraticCurveTo(px-flame*.55,py+13,px,py+3);c.fill();c.restore()}}
}
/* Real painted cloud texture, extracted only from sky pixels; buildings never scroll. */
const cloudTextureCache={};for(const theme of ['day','night']){const photo=new Image();photo.onload=()=>{const tile=document.createElement('canvas');tile.width=1024;tile.height=288;const tc=tile.getContext('2d',{willReadFrequently:true});tc.drawImage(photo,photo.naturalWidth*.39,photo.naturalHeight*.015,photo.naturalWidth*.34,photo.naturalHeight*.15,0,0,1024,288);const pixels=tc.getImageData(0,0,1024,288);for(let y=0;y<288;y++)for(let x=0;x<1024;x++){const i=(y*1024+x)*4,l=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3,alpha=Math.max(0,Math.min(1,(l-(theme==='night'?40:155))/(theme==='night'?95:85))),edge=Math.min(1,x/100,(1023-x)/100,y/45,(287-y)/45);pixels.data[i+3]=Math.round(alpha*edge*190)}tc.putImageData(pixels,0,0);cloudTextureCache[theme]=tile};photo.src='assets/'+theme+'.webp'}
function paintCloudBanks(c,t,w,h,night,close){const tile=cloudTextureCache[night?'night':'day'];if(!tile)return;c.save();c.beginPath();if(close)c.rect(0,0,w,h*.19);else{[[0,0],[.81,0],[.77,.12],[.63,.15],[.57,.19],[.48,.17],[.40,.19],[.3,.15],[.18,.16],[0,.13]].forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath()}c.clip();for(let layer=0;layer<2;layer++)for(let j=0;j<2;j++){const direction=layer?-1:1,speed=layer?.017:.010,x=((((t*speed*direction+j*.85+layer*.4)%1.7)+1.7)%1.7-.70)*w,y=(-.025+layer*.04)*h;c.globalAlpha=layer?.66:.82;c.drawImage(tile,x,y,w*(layer?.64:.82),h*(layer?.17:.20))}c.restore()}
function paintHillFog(c,t,w,h,night,close){c.save();const bands=close?[.72,.86]:[.29,.365];for(let k=0;k<bands.length;k++)for(let j=0;j<5;j++){const x=((((t*(.011+k*.004)+j*.27)%1.4)+1.4)%1.4-.2)*w,y=(bands[k]+Math.sin(t*.16+j*2)*.009)*h,r=w*(close?.18:.13);c.save();c.translate(x,y);c.scale(1,.16);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,night?'rgba(158,187,207,.16)':'rgba(228,241,239,.23)');g.addColorStop(.5,night?'rgba(142,172,197,.08)':'rgba(232,243,241,.12)');g.addColorStop(1,'rgba(200,222,230,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore()}c.restore()}

// Close-up actors occupy the same independently animated sky plane.
function paintCloseupFlights(c,t,w,h,night,id){
 c.save();
 const actors=skyCast(t,night);
 for(const actor of actors){const {x,y,bank}=flightPose(actor,w,h);

 if(actor.name==='broom')broom(x,y,(w/1363)*.82*actor.scale,t,c);

 }
 paintFlyingCreatures(c,t,w,h,night);
 drawCarFlight(c,t,w,h,night,actors.find(a=>a.name==='car'));
 drawPhoenixFlight(c,t,w,h,night,actors.find(a=>a.name==='phoenix'));
 c.restore();
 paintFloatingLanterns(c,t,w,h,night);
 if(id==='nift'){const posts=[[.29,.30],[.78,.30]];for(let k=0;k<posts.length;k++){const a=t*.24+k*2.1;flyingSprite(c,'dementor',(posts[k][0]+Math.sin(a)*.012)*w,(posts[k][1]+Math.cos(a)*.008)*h,w*.022,t+k*2,night,Math.sin(a)*.03);}}

}
