(() => {
'use strict';
const app=window.PracticeApp,$=id=>document.getElementById(id),menus=[$('utility-menu'),$('device-menu')];
const dialogFor={'paths-open':'paths-dialog','weekly-open':'weekly-dialog','backup-open':'backup-dialog',reset:'confirm-dialog','install-app':'install-dialog'};
// Collapse only at startup; rendering an answer must not undo a visitor's choice.
$('learning-hub').open=false;
function closeMenus(except=null){for(const menu of menus)if(menu!==except)menu.open=false;}
for(const menu of menus){
 menu.querySelector('summary').addEventListener('click',()=>closeMenus(menu));
 menu.addEventListener('click',event=>{
  const button=event.target.closest('button'),dialog=button&&$(dialogFor[button.id]);if(!dialog?.open)return;
  menu.open=false;
  dialog.addEventListener('close',()=>{
   // A hidden dropdown item cannot receive the dialog's native return focus.
   // Preserve an explicit destination such as the question opened from a path.
   const active=document.activeElement;
   if(!document.querySelector('dialog[open]')&&(!active||active===document.body||!active.getClientRects().length))menu.querySelector('summary').focus({preventScroll:true});
  },{once:true});
 });
}
document.addEventListener('click',event=>{if(!menus.some(menu=>menu.contains(event.target)))closeMenus();});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;
 const menu=menus.find(menu=>menu.open);if(!menu)return;event.preventDefault();event.stopImmediatePropagation();menu.open=false;menu.querySelector('summary').focus();
},true);
$('quick-daily-start').addEventListener('click',()=>{app.flush();app.openScope('plan');});
function context(){
 $('workspace').dataset.mode=app.state.mode;$('quick-daily-start').disabled=Boolean(app.activeAssessment());
 if(app.state.focusMode)closeMenus();
}
document.addEventListener('study:change',event=>{if(event.detail?.refreshHub!==false)context();});context();
})();
