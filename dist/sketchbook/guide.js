function createCharacterGuide(options){
  const world=document.querySelector('#world'),scene=document.querySelector('#scene');
  const lamp=document.createElement('div');lamp.className='character-lantern';lamp.setAttribute('aria-hidden','true');scene.append(lamp);
  const panel=document.createElement('aside');panel.className='character-dialogue';panel.hidden=true;panel.setAttribute('aria-label','Shruti and Dobby’s conversation');
  const speaker=document.createElement('p');speaker.className='dialogue-speaker';const line=document.createElement('p');line.className='dialogue-line';const skip=document.createElement('button');skip.textContent='Explore freely ↗';skip.className='dialogue-skip';panel.append(speaker,line,skip);world.append(panel);
  const steps=[
    {who:'Shruti',text:'Hey, I’m Shruti. Welcome to my little world.',duration:4.5,pose:0},
    {who:'Dobby',text:'Point at a place. Dobby will show you the way!',duration:4.5,pose:0}
  ];
  let active=false,started=false,index=-1,elapsed=0,light=0;
  function show(i){index=i;elapsed=0;const s=steps[i];speaker.textContent=s.who;line.textContent=s.text;panel.hidden=false;panel.dataset.speaker=s.who.toLowerCase();for(const p of document.querySelectorAll('.pin'))p.classList.toggle('story-focus',p.dataset.place===s.place);if(s.place)options.onPlace(s.place)}
  function start(){started=true;active=true;show(0);options.onStart?.()}
  function stop(){const wasActive=active;started=true;active=false;panel.hidden=true;for(const p of document.querySelectorAll('.pin'))p.classList.remove('story-focus');if(wasActive)options.onEnd()}
  skip.addEventListener('click',stop);
  return {stop,start,isActive:()=>active,update(t,dt){if(active&&!options.reduced()){elapsed+=dt;if(elapsed>=steps[index].duration){if(index+1<steps.length)show(index+1);else stop()}}const glow=active||(!panel.hidden)?1:.35;light+=(glow-light)*Math.min(dt*1.8,1);lamp.style.opacity=.66+light*.16;return {pose:active?steps[index]?.pose||0:0,glow:light}}};
}
