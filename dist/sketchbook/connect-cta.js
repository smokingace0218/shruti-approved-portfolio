let portfolioHandoffTimer=0;
window.addEventListener('pageshow',()=>{clearTimeout(portfolioHandoffTimer);portfolioHandoffTimer=0;document.documentElement.classList.remove('portfolio-handoff')});
function goToPortfolio(destination){
 try{sessionStorage.setItem('storybook-preview-seen','1')}catch(_){}
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){window.location.assign(destination);return}
 document.documentElement.classList.add('portfolio-handoff');
 clearTimeout(portfolioHandoffTimer);
 portfolioHandoffTimer=window.setTimeout(()=>window.location.assign(destination),180);
}
function openPortfolioLanding(){goToPortfolio('/?from=magic')}
function openPortfolioContact(){goToPortfolio('/contact?from=magic')}
/* Compact navigation instance; original source and font notices retained under vendor/venom. */
const connectCTA=VenomCTA.mount(document.querySelector('#connect-venom'),{
 label:'CONNECT',labelFont:'Harry P',floor:[1,1,1],labelSize:29,buttonHeight:64,paddingX:40,
 onActivate:openPortfolioContact,
 params:{reach:600,awareness:700,maxStrands:6,maxLen:650,sheen:.4}
});
connectCTA.element.setAttribute('aria-label','Connect with Shruti');
connectCTA.element.style.fontSize='24px';
new MutationObserver(()=>connectCTA.recalibrate?.()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

document.querySelector('#close-connect').addEventListener('click',()=>document.querySelector('#connect-card').close());document.querySelector('#connect-card').addEventListener('click',e=>{if(e.target.id==='connect-card')e.target.close()});

function magicButton(label,action){const b=document.createElement('button');b.type='button';b.className='wizard-cta';b.textContent=label;b.addEventListener('click',action);return b}
const designerHost=document.querySelector('#designer-spider');designerHost.classList.add('wizard-designer');designerHost.append(magicButton('Meet Designer',openPortfolioLanding));

// The same two original interactive components, mounted only for the active chapter.
function mountChapterCTAs(dialog,container){
 if(dialog.id==='paper'&&['sant','janitri'].includes(dialog.dataset.place))return;
 if(dialog.querySelector('.chapter-cta-dock'))return;
 if(dialog.id==='nift-map'){
  const dock=document.createElement('div');dock.className='chapter-cta-dock nift-single-action';dock.setAttribute('aria-label','Know the wizard');
  const button=magicButton('Know the wizard',openPortfolioLanding);dock.append(button);container.append(dock);
  const cleanup=()=>{dock.remove();dialog.removeEventListener('close',cleanup)};dialog.addEventListener('close',cleanup,{once:true});return cleanup;
 }

 const dock=document.createElement('div');dock.className='chapter-cta-dock';dock.setAttribute('aria-label','Connect with Shruti');dock.innerHTML='<div class="chapter-connect"><div class="chapter-venom"></div></div>'+(dialog.id==='paper'&&dialog.dataset.place==='me'?'':'<div class="chapter-contact"><div class="chapter-spider"></div></div>');if(dialog.id==='paper'&&dialog.dataset.place==='me')dock.classList.add('wanted-connect');container.append(dock);
 const designerButton=magicButton('Meet Designer',openPortfolioLanding);dock.querySelector('.chapter-spider')?.append(designerButton);
 const isWanted=dialog.id==='paper'&&dialog.dataset.place==='me';
 const venom=VenomCTA.mount(dock.querySelector('.chapter-venom'),{label:isWanted?'SEND AN OWL':'CONNECT',labelFont:'Harry P',labelSize:dialog.id==='nift-map'?34:29,buttonHeight:dialog.id==='nift-map'?76:72,paddingX:dialog.id==='nift-map'?52:30,floor:[1,1,1],params:{reach:550,awareness:600,maxStrands:5,maxLen:580},onActivate:openPortfolioContact});
 venom.element.setAttribute('aria-label',isWanted?'Send an owl: connect with Shruti':'Connect with Shruti');
 const cleanup=()=>{venom.destroy();dock.remove();dialog.removeEventListener('close',cleanup)};dialog.addEventListener('close',cleanup,{once:true});return cleanup;
}

const CHAPTER_MESSAGES={nift:['I solemnly swear','I am up to no good.'],me:['Hey, I’m Shruti.','UI/UX & Product Designer'],janitri:['Designing for care.','Nurse-facing experiences at Janitri'],sant:['Craft, brand & discovery.','Sant Ram’s · JAZAA'],ministry:['A new chapter awaits.','Your team could be next.']};
function setChapterBanner(dialog,id){dialog.querySelector('.chapter-message-ribbon')?.remove();}
