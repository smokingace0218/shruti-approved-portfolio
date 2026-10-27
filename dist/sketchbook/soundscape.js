/* Compact, normalized user-supplied cues. A single mixer owns every fade. */
const requestedScoreTracks={world:'Lumos! (Hedwig’s Theme)',me:'Platform Nine-and-Three-Quarters and the Journey to Hogwarts',sant:'Diagon Alley and the Gringotts Vault',janitri:'Fireworks',ministry:'The Ministry of Magic',nift:'The Arrival of Baby Harry'};
const worldSound=(()=>{
 const button=document.createElement('button');button.id='sound-toggle';document.querySelector('.utilities').append(button);
 let current='world',muted=localStorage.getItem('world-music-muted')==='true',active=null,pending=null,serial=0,mixRAF=0,fade=null;
 const positions={},cache={},volume=.38;
 function ui(){button.innerHTML=muted?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12 1 5 5m0-5-5 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12-.5a5 5 0 0 1 0 7m2-9a8 8 0 0 1 0 11"/></svg>';button.setAttribute('aria-pressed',String(!muted));button.setAttribute('aria-label',muted?'Turn background music on':'Turn background music off');button.title=muted?'Turn sound on':'Turn sound off'}
 function dispose(a){if(!a)return;positions[a.dataset.track]=a.currentTime||0;a.pause();a.removeAttribute('src');a.load()}
 function cancelFade(){cancelAnimationFrame(mixRAF);mixRAF=0;if(fade?.out&&fade.out!==active)dispose(fade.out);fade=null}
 function crossfade(incoming,outgoing,duration=950){cancelFade();fade={incoming,out:outgoing,start:performance.now(),fromIn:incoming?.volume||0,fromOut:outgoing?.volume||0};const f=fade;function tick(now){if(fade!==f)return;const p=Math.min(1,(now-f.start)/duration),e=p*p*(3-2*p);if(incoming)incoming.volume=f.fromIn+(volume-f.fromIn)*Math.sin(e*Math.PI/2);if(outgoing)outgoing.volume=f.fromOut*Math.cos(e*Math.PI/2);if(p<1)mixRAF=requestAnimationFrame(tick);else{dispose(outgoing);fade=null;mixRAF=0}}mixRAF=requestAnimationFrame(tick)}
 function preload(id){if(!requestedScoreTracks[id]||cache[id])return;const a=new Audio();a.preload='metadata';a.src='assets/audio/'+id+'.mp3?v=101';cache[id]=a}
 async function play(force=false){if(muted||document.hidden)return;if(!force&&(pending?.dataset.track===current||active?.dataset.track===current&&!active.paused))return;const token=++serial;cancelFade();dispose(pending);pending=null;const next=cache[current]||new Audio();delete cache[current];next.dataset.track=current;next.src='assets/audio/'+current+'.mp3?v=101';next.preload='auto';next.volume=0;next.loop=true;next.currentTime=force?0:(positions[current]||0);pending=next;

 try{await next.play();if(token!==serial||muted){if(pending===next)pending=null;dispose(next);return}const old=active;active=next;pending=null;crossfade(next,old);ui()}catch{if(pending===next)pending=null;dispose(next);button.title='Music begins with your first tap or click.'}}
 button.onclick=e=>{e.stopPropagation();muted=!muted;localStorage.setItem('world-music-muted',String(muted));if(muted){serial++;dispose(pending);pending=null;const old=active;active=null;crossfade(null,old,650)}else play();ui()};
 function unlock(){if(!muted)play()}
 document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#sound-toggle'))unlock()},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')unlock()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){serial++;dispose(pending);pending=null;cancelFade();dispose(active);active=null}else if(!muted)play()});
 ui();if(!muted)play();return{destination(id){const next=requestedScoreTracks[id]?id:'world';if(next===current)return;current=next;ui();play()},preload,paper(){}};
})();
