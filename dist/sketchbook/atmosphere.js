/* Water, cloud banks and atmospheric depth share the scene's registered artwork coordinates. */
function createWorldAtmosphere(canvas){
  let gl,program,ready=0,night=0,failed=false;
  const cloudCanvas=document.createElement('canvas');cloudCanvas.setAttribute('aria-hidden','true');cloudCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';canvas.after(cloudCanvas);const cloudCtx=cloudCanvas.getContext('2d');
  function driftingClouds(t,state){const cw=Math.round(state.width*.65),ch=Math.round(state.height*.65);if(cloudCanvas.width!==cw||cloudCanvas.height!==ch){cloudCanvas.width=cw;cloudCanvas.height=ch}const c=cloudCtx;c.clearRect(0,0,cw,ch);c.save();c.beginPath();[[0,0],[.81,0],[.77,.11],[.63,.14],[.57,.18],[.48,.16],[.4,.19],[.3,.14],[.18,.15],[0,.12]].forEach(([x,y],i)=>i?c.lineTo(x*cw,y*ch):c.moveTo(x*cw,y*ch));c.closePath();c.clip();for(let i=0;i<12;i++){const speed=i%2?-.008:.005;const x=((i*.173+t*speed)%1.5+1.5)%1.5-.25,y=.025+(i%4)*.035;const r=cw*(.09+(i%3)*.025);c.save();c.translate(x*cw,y*ch);c.scale(1,.24);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,state.dark?'rgba(146,166,201,.19)':'rgba(249,251,255,.35)');g.addColorStop(.5,state.dark?'rgba(113,140,180,.10)':'rgba(237,246,255,.18)');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore()}c.restore();cloudCanvas.style.opacity=1-Math.min(1,(state.push||0)/.6);}

  const staticPlates=document.querySelectorAll('.plate');
  function fallbackDraw(t,dt,state){driftingClouds(t,state);const z=1+(state.push||0),fx=state.focusX??.5,fy=state.focusY??.5;for(const plate of staticPlates){plate.style.transformOrigin='0 0';plate.style.transform=`translate(${(.5-fx*z)*state.width}px,${(.5-fy*z)*state.height}px) scale(${z})`;}}
  const fallback=()=>{failed=true;canvas.hidden=true;const scene=document.querySelector('#scene');scene.classList.remove('atmosphere-ready');scene.classList.add('atmosphere-fallback')};
  try{
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:false});
    if(!gl){fallback();return {draw:fallbackDraw}}
    const vert=`attribute vec2 point;varying vec2 uv;void main(){uv=point;gl_Position=vec4(point.x*2.-1.,1.-point.y*2.,0.,1.);}`;
    const frag=`precision highp float;
      varying vec2 uv;uniform sampler2D dayTex;uniform sampler2D nightTex;uniform sampler2D masks;uniform sampler2D depthMap;uniform float push;uniform vec2 focus;uniform vec2 texel;uniform float clock;uniform float night;uniform vec2 camera;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.52;for(int j=0;j<3;j++){v+=a*noise(p);p=p*2.03+vec2(5.2,1.3);a*=.49;}return v;}
      vec3 artwork(vec2 p){p=clamp(p,vec2(.002),vec2(.998));vec3 d=texture2D(dayTex,p).rgb;vec3 dn=(texture2D(dayTex,p+vec2(texel.x,0.)).rgb+texture2D(dayTex,p-vec2(texel.x,0.)).rgb)*.5;d=clamp(d+(d-dn)*.16*push,0.,1.);float l=dot(d,vec3(.299,.587,.114));d=(mix(d,vec3(l),.26)-.5)*.94+.5;d*=.98;vec3 n=texture2D(nightTex,p).rgb;float oldMoon=1.-smoothstep(.020,.035,length((p-vec2(.389,.112))*vec2(1.7768,1.)));n=mix(n,texture2D(nightTex,clamp(p+vec2(.055,.006),vec2(.002),vec2(.998))).rgb,oldMoon);return mix(d,n,night);}
      void main(){
        // Inward reprojection: near ground advances more than distant hills and sky.
        // True destination framing in the artwork plane, with subtle depth-dependent pointer parallax.
        vec2 p=focus+(uv-vec2(.5))/(1.+push);
        float depth=texture2D(depthMap,p).r;
        // Separate mountain/sky, valley, architecture and near shore motion.
        // Small depth separation avoids breaking rigid building silhouettes.
        float layerScale=1.; // Rigid architecture shares the registered camera during handoff.
        p=focus+(uv-vec2(.5))/((1.+push)*layerScale);
        p+=camera*vec2(.004,.002)*depth/(1.+push);
        vec3 m=texture2D(masks,p).rgb;float water=m.r,sky=m.g;float valley=m.b;
        // Two wave directions and a slow swell move the actual painted reflections.
        float proximity=smoothstep(.46,.90,uv.y);
        float swell=sin(p.x*45.+p.y*12.-clock*.78);
        float ripple=sin(p.y*420.+sin(p.x*95.+clock*.5)*2.-clock*2.85);
        float cross=sin(p.x*178.+p.y*126.+clock*1.25);
        float amp=mix(.00065,.0030,proximity);
        p.x+=water*(ripple*.65+cross*.35+swell*.35)*amp;
        p.y+=water*(sin(p.y*260.-clock*1.15)*.55+swell*.45)*amp*.55;
        vec3 c=artwork(p);
        // The distant cloud painting itself travels; the skyline is protected by its mask.
        if(sky>.005){
        // Never scroll the scenery texture: its architecture must remain fixed.

        // Independent moon: it drifts slowly while cloud banks cross in front of it.
        vec2 moonCenter=vec2(.389+sin(clock*.018)*.037,.106+sin(clock*.023)*.009);
        vec2 moonDelta=(p-moonCenter)*vec2(1.7768,1.);
        float moonDistance=length(moonDelta);
        float halo=exp(-moonDistance*moonDistance/.0012);
        c+=night*halo*vec3(.20,.30,.45)*.18;
        if(moonDistance<.02){float disc=1.-smoothstep(.0165,.018,moonDistance);float craters=fbm(moonDelta*430.+vec2(9.,12.));vec3 moonColor=mix(vec3(.58,.68,.79),vec3(.94,.96,.98),craters*.65+.35);c=mix(c,moonColor,disc*night);}

        // Independent soft cloud banks at three scales, all behind the Willow.
        vec2 cp=vec2(p.x*5.5+clock*.060+camera.x*.08,p.y*11.0+camera.y*.025);
        float far=fbm(cp+vec2(0.,clock*.001));
        float near=fbm(vec2(p.x*3.8-clock*.075-camera.x*.16,p.y*7.5+2.8+sin(clock*.05)*.10));
        float wisps=fbm(vec2(p.x*12.+clock*.059,p.y*18.));
        float cloud=smoothstep(.46,.78,far)*.34+smoothstep(.49,.78,near)*.33+smoothstep(.59,.80,wisps)*.15;
        vec3 cloudColor=mix(vec3(.88,.91,.94),vec3(.30,.39,.52),night);
        c=mix(c,cloudColor,cloud*sky);}
        // Soft broken specular lines; no whole-lake flashing.
        if(water>.005){float waveLine=pow(max(0.,ripple),15.);
        float breaks=smoothstep(.58,.82,noise(vec2(p.x*160.+clock*.2,p.y*260.)));
        c+=water*waveLine*breaks*mix(.044,.070,night)*mix(.35,1.,proximity)*vec3(.77,.87,1.);
        float reflected=smoothstep(.57,.83,fbm(vec2(p.x*170.+clock*.06,p.y*290.-clock*.18)));
        c+=water*reflected*.018*vec3(1.,.85,.57);}
        // Slow valley clouds move behind the central island rather than bending hills.
        if(valley>.005){float bank=fbm(vec2(p.x*7.-clock*.014,p.y*24.+clock*.002));float vapor=smoothstep(.38,.73,bank)*valley*.45;c=mix(c,mix(vec3(.78,.86,.89),vec3(.23,.34,.48),night),vapor);}
        // Distant atmospheric veil separates mountains from the architecture.
        float horizon=exp(-pow((p.y-.39)/.055,2.))*sky;
        c=mix(c,mix(vec3(.72,.82,.87),vec3(.21,.31,.43),night),horizon*.10);
        gl_FragColor=vec4(c,1.);
      }`;
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Atmosphere shader: '+gl.getShaderInfoLog(s));return s}
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Atmosphere program failed');gl.useProgram(program);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    function texture(unit,source,name){gl.activeTexture(gl.TEXTURE0+unit);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(program,name),unit)}
    const mask=document.createElement('canvas');mask.width=1024;mask.height=576;const mc=mask.getContext('2d');mc.fillStyle='#000';mc.fillRect(0,0,1024,576);
    function polygon(points,color,blur){mc.save();mc.filter=`blur(${blur}px)`;mc.fillStyle=color;mc.beginPath();points.forEach(([x,y],i)=>i?mc.lineTo(x*1024,y*576):mc.moveTo(x*1024,y*576));mc.closePath();mc.fill();mc.restore()}
    // Sky stops above the distant mountain ridge and excludes the Ministry silhouette.
    polygon([[0,0],[.82,0],[.78,.11],[.75,.15],[.63,.145],[.57,.19],[.48,.17],[.40,.20],[.30,.15],[.18,.16],[0,.13]],'#00ff00',3);
    // The mask deliberately avoids the castle island, shore, bridge and buildings.
    polygon([[.36,.625],[.42,.62],[.48,.64],[.56,.61],[.595,.64],[.565,.69],[.54,.755],[.51,.81],[.495,.85],[.465,.85],[.475,.78],[.425,.73],[.40,.685]],'#ff0000',2);
    polygon([[.265,.445],[.32,.433],[.36,.442],[.35,.49],[.32,.53],[.29,.55],[.275,.51]],'#ff0000',2);
    polygon([[.62,.445],[.735,.42],[.70,.48],[.66,.50],[.63,.48]],'#ff0000',2);
    polygon([[.04,.29],[.30,.27],[.35,.31],[.31,.36],[.05,.36]],'#0000ff',9);
    polygon([[.62,.25],[.77,.25],[.79,.30],[.67,.34],[.61,.31]],'#0000ff',8);
    polygon([[.39,.617],[.555,.617],[.567,.67],[.535,.713],[.51,.75],[.495,.795],[.463,.833],[.418,.807],[.407,.774],[.365,.766],[.381,.741],[.429,.718],[.419,.686]],'#ff0000',2);
    texture(2,mask,'masks');
    const depthCanvas=document.createElement('canvas');depthCanvas.width=1024;depthCanvas.height=576;const dc=depthCanvas.getContext('2d');
    const depthGradient=dc.createLinearGradient(0,0,0,576);depthGradient.addColorStop(0,'#080808');depthGradient.addColorStop(.22,'#202020');depthGradient.addColorStop(.4,'#494949');depthGradient.addColorStop(.65,'#8a8a8a');depthGradient.addColorStop(1,'#e6e6e6');dc.fillStyle=depthGradient;dc.fillRect(0,0,1024,576);
    function depthShape(points,value){dc.save();dc.filter='blur(5px)';dc.fillStyle=`rgb(${value},${value},${value})`;dc.beginPath();points.forEach(([x,y],i)=>i?dc.lineTo(x*1024,y*576):dc.moveTo(x*1024,y*576));dc.closePath();dc.fill();dc.restore()}
    // Uniform depth within each building keeps its architecture rigid during approach.
    depthShape([[.34,.23],[.61,.23],[.65,.62],[.31,.64]],112);
    depthShape([[.77,.46],[.91,.46],[.91,.75],[.75,.75]],184);
    depthShape([[.77,.25],[.94,.25],[.94,.48],[.77,.48]],143);
    depthShape([[.82,0],[1.,0],[1.,.30],[.81,.30]],96);
    depthShape([[.65,.69],[.98,.69],[.98,.87],[.65,.87]],204);
    texture(3,depthCanvas,'depthMap');
    for(const [i,name] of ['day','night'].entries()){const im=new Image();im.onload=()=>{if(failed)return;gl.useProgram(program);texture(i,im,name+'Tex');ready++;if(ready===2){canvas.hidden=false;document.querySelector('#scene').classList.add('atmosphere-ready')}};im.onerror=fallback;im.src='assets/'+name+'.webp'}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()});
    return {draw(t,dt,state){driftingClouds(t,state);if(failed){fallbackDraw(t,dt,state);return}if(ready!==2)return;const d=Math.min(devicePixelRatio||1,1);const cw=Math.round(state.width*d),ch=Math.round(state.height*d);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;gl.viewport(0,0,cw,ch)}night+=(Number(state.dark)-night)*Math.min(dt*2.1,1);gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'push'),state.push||0);gl.uniform2f(gl.getUniformLocation(program,'focus'),state.focusX??.5,state.focusY??.5);gl.uniform2f(gl.getUniformLocation(program,'texel'),1/4096,1/2313);gl.uniform1f(gl.getUniformLocation(program,'clock'),t);gl.uniform1f(gl.getUniformLocation(program,'night'),night);gl.uniform2f(gl.getUniformLocation(program,'camera'),state.x,state.y);gl.drawArrays(gl.TRIANGLES,0,6)}};
  }catch(error){fallback();console.warn('Using the illustrated atmosphere fallback.',error.message);return {draw:fallbackDraw}}
}
