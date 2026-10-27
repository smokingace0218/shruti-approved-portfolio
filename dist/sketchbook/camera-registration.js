/* Shared landmark registration for both halves of the same reversible camera path. */
const CameraRegistration=(()=>{
 const profiles={
  nift:{wide:[.50,.47],wideSpan:.23,day:{anchor:[.51,.73],span:.65},night:{anchor:[.46,.66],span:.64},bow:[-.014,-.014]},
  sant:{wide:[.85,.64],wideSpan:.17,day:{anchor:[.65,.79],span:.60},night:{anchor:[.65,.80],span:.60},bow:[-.012,.008]},
  janitri:{wide:[.855,.43],wideSpan:.17,day:{anchor:[.60,.75],span:.66},night:{anchor:[.60,.74],span:.66},bow:[-.012,-.008]},
  ministry:{wide:[.927,.24],wideSpan:.15,day:{anchor:[.69,.74],span:.37},night:{anchor:[.68,.74],span:.37},bow:[-.010,-.010]},
  me:{wide:[.84,.77],wideSpan:.10,day:{anchor:[.67,.58],span:.32},night:{anchor:[.64,.60],span:.32},bow:[-.010,.012]}
 };
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*t*(10+t*(-15+6*t))};
 function view(id,progress,viewport,scene,home,idle=0,pointer={x:0,y:0}){
  const profile=profiles[id];if(!profile)return null;const p=clamp(progress,0,1),travel=smooth(0,.64,p),settle=smooth(.36,.64,p),alpha=smooth(.30,.64,p),landing=smooth(.58,1,p),aspect=1672/941;
  const cover=Math.max(viewport.w/1672,viewport.h/941),photoW=1672*cover*1.065*(1+idle*landing),photoH=941*cover*1.065*(1+idle*landing);
  const portrait=clamp((1.15-viewport.w/viewport.h)/.65,0,1);
  const horizontalBias=id==='ministry'?viewport.w*.07*(1-portrait):0;
  const centredLeft=(viewport.w-photoW)/2+horizontalBias;
  const focusedLeft=viewport.w*.55-profile.day.anchor[0]*photoW;
  const finalLeft=clamp(mix(centredLeft,focusedLeft,portrait)-pointer.x*8*settle,viewport.w-photoW,0),finalTop=clamp((viewport.h-photoH)/2-pointer.y*5*settle,viewport.h-photoH,0);
  // A wider arrival view and a gentle off-axis dolly share the same source plate.
  // Both are cover-clamped, so neither exposes a second image at the edges.
  const approachW=1672*cover*1.015,approachH=941*cover*1.015;
  const side={nift:-.018,sant:.018,janitri:-.014,ministry:.012,me:.020}[id];
  const approachLeft=clamp((viewport.w-approachW)/2+horizontalBias+side*viewport.w,viewport.w-approachW,0);
  const approachTop=clamp((viewport.h-approachH)/2+viewport.h*.006,viewport.h-approachH,0);
  const finalAnchor={x:approachLeft+profile.day.anchor[0]*approachW,y:approachTop+profile.day.anchor[1]*approachH};
  const endZ=clamp(approachH*profile.day.span/(scene.h*profile.wideSpan),1.6,5.5),startZ=1+home.push;
  const z=Math.exp(mix(Math.log(startZ),Math.log(endZ),travel));
  const bounds=z=>({left:(.5+scene.x/scene.w)/z,right:1-((viewport.w-scene.x)/scene.w-.5)/z,top:(.5+scene.y/scene.h)/z,bottom:1-((viewport.h-scene.y)/scene.h-.5)/z});
  const endBounds=bounds(endZ);
  const endFocus={x:clamp(profile.wide[0]-((finalAnchor.x-scene.x)/scene.w-.5)/endZ,endBounds.left,endBounds.right),y:clamp(profile.wide[1]-((finalAnchor.y-scene.y)/scene.h-.5)/endZ,endBounds.top,endBounds.bottom)};
  const project=(focus,zoom)=>({x:scene.x+scene.w*(.5+(profile.wide[0]-focus.x)*zoom),y:scene.y+scene.h*(.5+(profile.wide[1]-focus.y)*zoom)});
  const initial=project({x:home.focusX,y:home.focusY},startZ),dock=project(endFocus,endZ),curve=16*travel*travel*(1-travel)*(1-travel);
  const pathAnchor={x:mix(initial.x,dock.x,travel)+profile.bow[0]*viewport.w*curve,y:mix(initial.y,dock.y,travel)+profile.bow[1]*viewport.h*curve};
  const viewBounds=bounds(z);
  const focus={x:clamp(profile.wide[0]-((pathAnchor.x-scene.x)/scene.w-.5)/z,viewBounds.left,viewBounds.right),y:clamp(profile.wide[1]-((pathAnchor.y-scene.y)/scene.h-.5)/z,viewBounds.top,viewBounds.bottom)};
  const wideAnchor=project(focus,z),anchor={x:wideAnchor.x+(finalAnchor.x-dock.x)*settle,y:wideAnchor.y+(finalAnchor.y-dock.y)*settle};
  const span=scene.h*z*profile.wideSpan;
  const plate=theme=>{const a=profile[theme].anchor,h=span/profile[theme].span,w=h*aspect;
   const landed={x:mix(approachLeft,finalLeft,landing),y:mix(approachTop,finalTop,landing),w:mix(approachW,photoW,landing),h:mix(approachH,photoH,landing)};
   return{x:mix(anchor.x-a[0]*w,landed.x,settle),y:mix(anchor.y-a[1]*h,landed.y,settle),w:mix(w,landed.w,settle),h:mix(h,landed.h,settle),anchor:a};
  };
  return{progress:p,alpha,phase:p<.30?'world':p<.64?'approach':'landing',wide:{push:z-1,focusX:focus.x,focusY:focus.y},wideAnchor,finalAnchor,day:plate('day'),night:plate('night')};
 }
 return{view,profiles,smooth};
})();
