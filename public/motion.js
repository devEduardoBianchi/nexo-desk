// Optional enhancement: the application stays usable when GSAP fails to load.
let pageMedia, dialogContext, shellContext;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function setupMotion(){
  if(!window.gsap)return;
  const plugins=[window.Flip,window.ScrollTrigger,window.DrawSVGPlugin,window.CustomEase].filter(Boolean);
  gsap.registerPlugin(...plugins);
  if(window.CustomEase)CustomEase.create('nexo','.22,1,.36,1');
  gsap.defaults({ease:'power3.out',duration:.35,overwrite:'auto'});
  document.addEventListener('pointerover',event=>{
    const button=event.target.closest('.button.primary');
    if(!button||button.contains(event.relatedTarget)||reduced()||!matchMedia('(hover: hover)').matches)return;
    const svg=button.querySelector('svg');if(svg)gsap.to(svg,{x:3,duration:.2});
  });
  document.addEventListener('pointerout',event=>{
    const button=event.target.closest('.button.primary');if(!button||button.contains(event.relatedTarget))return;
    const svg=button.querySelector('svg');if(svg)gsap.to(svg,{x:0,duration:.2});
  });
}
export function animateShell(){
  shellContext?.revert();if(!window.gsap||reduced())return;
  shellContext=gsap.context(()=>{
    const tl=gsap.timeline({defaults:{duration:.55,ease:window.CustomEase?'nexo':'power3.out'}});
    tl.from('.brand',{y:-9,autoAlpha:0,clearProps:'all'},0).from('.nav-group .nav-item',{x:-8,autoAlpha:0,stagger:.022,clearProps:'all'},.05);
    if(window.DrawSVGPlugin)tl.from('.logo-stroke',{drawSVG:0,duration:.7},0);
  },document.getElementById('sidebar'));
}
export function beforeRender(capture=false){
  pageMedia?.revert();pageMedia=null;
  const targets=document.querySelectorAll('[data-flip-id]');
  return capture&&window.Flip&&!reduced()&&targets.length<=40?Flip.getState(targets):null;
}
export function animatePage(flipState=null,entrance=false){
  if(!window.gsap)return;
  const root=document.getElementById('main-content');
  pageMedia=gsap.matchMedia();
  pageMedia.add('(prefers-reduced-motion: no-preference)',()=>{
    const q=gsap.utils.selector(root);
    if(flipState&&window.Flip)Flip.from(flipState,{targets:q('[data-flip-id]'),duration:.52,ease:window.CustomEase?'nexo':'power3.inOut',scale:true,absolute:true,onEnter:elements=>gsap.fromTo(elements,{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.3,clearProps:'all'})});
    else if(entrance){
      const timeline=gsap.timeline({defaults:{duration:.48,ease:'power3.out'}});
      timeline.from(q('.page-heading'),{y:14,autoAlpha:0,clearProps:'all'},0)
        .from(q('.stat'),{y:10,autoAlpha:0,stagger:.045,clearProps:'all'},.05)
        .from(q('.queue-panel, .radar, .guide-step'),{y:14,autoAlpha:0,stagger:.04,clearProps:'all'},.13);
      const rows=q('.ticket-row, .ticket-card').slice(0,12);
      if(rows.length)timeline.from(rows,{autoAlpha:0,y:8,stagger:.025,clearProps:'all'},.2);
    }
    q('.stat-number').forEach(el=>{
      const end=Number(el.dataset.countValue),counter={value:end*.7};
      gsap.to(counter,{value:end,duration:.65,snap:{value:1},onUpdate:()=>{el.textContent=new Intl.NumberFormat(document.documentElement.lang).format(counter.value);}});
    });
    if(window.DrawSVGPlugin&&q('.radar-ring').length)gsap.from(q('.radar-ring'),{drawSVG:0,duration:.8,clearProps:'strokeDasharray,strokeDashoffset'});
    if(window.ScrollTrigger){
      q('.chart-section').forEach(section=>{
        const bars=section.querySelectorAll('.bar-fill,.trend-bar');
        if(bars.length)gsap.from(bars,{scaleY:section.classList.contains('wide')?0:1,scaleX:section.classList.contains('wide')?1:0,duration:.7,stagger:gsap.utils.clamp(.004,.03,.3/bars.length),clearProps:'transform',scrollTrigger:{trigger:section,start:'top 95%',once:true}});
      });
      ScrollTrigger.refresh();
    }
  },root);
}
export function animateDialog(dialog,closing=false,done=()=>{}){
  dialogContext?.revert();dialogContext=null;
  if(!window.gsap||reduced()){done();return;}
  dialogContext=gsap.context(()=>{
    if(closing){gsap.to(dialog,{autoAlpha:0,x:dialog.classList.contains('drawer')?35:0,y:dialog.classList.contains('drawer')?0:12,duration:.16,onComplete:()=>{dialogContext?.revert();dialogContext=null;done();}});return;}
    gsap.timeline({defaults:{ease:window.CustomEase?'nexo':'power3.out'}})
      .from(dialog,{x:dialog.classList.contains('drawer')?55:0,y:dialog.classList.contains('drawer')?0:20,autoAlpha:0,duration:.38,clearProps:'all'})
      .from(dialog.querySelectorAll('.dialog-head,.dialog-body,.dialog-actions'),{y:8,autoAlpha:0,stagger:.035,duration:.25,clearProps:'all'},.08);
  },dialog);
}
export function animateToast(el){if(!window.gsap||reduced())return;gsap.fromTo(el,{autoAlpha:0,y:16,scale:.98},{autoAlpha:1,y:0,scale:1,duration:.3,clearProps:'all'});const path=el.querySelector('path');if(path&&window.DrawSVGPlugin)gsap.from(path,{drawSVG:0,duration:.4,delay:.12});}
export function animateTheme(button){if(!window.gsap||reduced())return;const ico=button?.querySelector('svg');if(ico)gsap.fromTo(ico,{rotation:-100,scale:.65},{rotation:0,scale:1,duration:.4,clearProps:'all'});}
