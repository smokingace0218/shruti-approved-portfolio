/* Textured, jointed Canvas renderer for browsers without WebGL. */
function createWillowFallback(canvas){
 const c=canvas.getContext('2d');if(!c)return ()=>{};canvas.style.background='none';
 const base=new Image(),point=new Image(),nightBase=new Image();nightBase.src="assets/willow-lit-night.webp";base.src='assets/willow-lit-seat.webp';point.src='assets/willow-matte-point.webp';
 const smooth=(a,b,x)=>{let q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q)};
 function vertex(x,y,t,mouse){const reach=smooth(.12,.55,x),top=1-smooth(.23,.30,y);const hover=Math.exp(-((x-mouse.x)**2+(y-mouse.y)**2*.5)*26)*mouse.strength;return [x+reach*top*(Math.sin(t*.36)*.006+(x-mouse.x)*hover*.06),y+reach*top*(Math.sin(t*.47+x*3)*.019+Math.sin(t*.83+x*17)*.004+(y-mouse.y)*hover*.06)];}
 function triangle(img,src,dst){const [a,b,d]=src,[p,q,r]=dst;const sx=b[0]-a[0],sy=b[1]-a[1],tx=d[0]-a[0],ty=d[1]-a[1],det=sx*ty-sy*tx;if(!det)return;const A=((q[0]-p[0])*ty-(r[0]-p[0])*sy)/det,B=((q[1]-p[1])*ty-(r[1]-p[1])*sy)/det,C=((r[0]-p[0])*sx-(q[0]-p[0])*tx)/det,D=((r[1]-p[1])*sx-(q[1]-p[1])*tx)/det;c.save();c.beginPath();c.moveTo(...p);c.lineTo(...q);c.lineTo(...r);c.closePath();c.clip();c.transform(A,B,C,D,p[0]-A*a[0]-C*a[1],p[1]-B*a[0]-D*a[1]);c.drawImage(img,0,0);c.restore();}
 return function(t,s){if(!base.complete||!base.naturalWidth)return;const d=Math.min(devicePixelRatio||1,1.25);if(canvas.width!==Math.round(s.w*d)||canvas.height!==Math.round(s.h*d)){canvas.width=Math.round(s.w*d);canvas.height=Math.round(s.h*d)}c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,s.w,s.h);c.save();const photo=s.dark&&nightBase.complete&&nightBase.naturalWidth?nightBase:base;c.filter='none';
 // Draw the static trunk, roots and seat with precisely fixed registration.
 c.save();c.beginPath();c.rect(0,0,s.w*.12,s.h);c.clip();c.drawImage(photo,0,0,s.w,s.h);c.restore();
 // A slow seated-branch flex carries both figures together; the trunk stays planted.
 for(let y=0;y<12;y++)for(let x=0;x<16;x++){const x0=.12+x/16*.48,x1=.12+(x+1)/16*.48,y0=.30+y/12*.70,y1=.30+(y+1)/12*.70;const uv=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]],src=uv.map(([u,v])=>[u*base.naturalWidth,v*base.naturalHeight]),dst=uv.map(([u,v])=>[u*s.w,(v+smooth(.12,.30,u)*(1-smooth(.80,.95,v))*Math.sin(t*.55)*.0018)*s.h]);triangle(photo,[src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]);triangle(photo,[src[2],src[1],src[3]],[dst[2],dst[1],dst[3]]);}
 // Independently moving limb mesh. Deformation increases away from its fixed joint.
 const cols=16,rows=8;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const x0=.12+x/cols*.48,x1=.12+(x+1)/cols*.48,y0=y/rows*.30,y1=(y+1)/rows*.30;const uv=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]],src=uv.map(([u,v])=>[u*base.naturalWidth,v*base.naturalHeight]),dst=uv.map(([u,v])=>{let p=vertex(u,v,t,s.mouse);return[p[0]*s.w,p[1]*s.h]});triangle(photo,[src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]);triangle(photo,[src[2],src[1],src[3]],[dst[2],dst[1],dst[3]]);}
 if(point.complete&&point.naturalWidth&&s.pose>.01){c.save();c.beginPath();c.rect(s.w*.115,s.h*.30,s.w*.29,s.h*.32);c.clip();c.globalCompositeOperation='destination-out';c.globalAlpha=s.pose;c.fillRect(s.w*.115,s.h*.30,s.w*.29,s.h*.32);c.globalCompositeOperation='source-over';c.drawImage(point,0,0,s.w,s.h);c.restore();}c.restore();
 };
}
