export function createFieldAudio(button){
 let enabled=false,started=false,zone='field',audio=null,current='',paused=false;
 const paths={field:'assets/bgm/drone.mp3',shell:'assets/bgm/heal_long1.mp3'};
 function label(){button.textContent=enabled?'音：入':'音：切';button.setAttribute('aria-pressed',String(enabled));}
 function sync(){
  if(!enabled||!started||paused){audio?.pause();return;}
  const path=paths[zone];if(current!==path){audio?.pause();audio=new Audio(path);audio.loop=true;audio.volume=.28;audio.preload='none';current=path;}
  const target=audio;target.play()?.catch(()=>{if(audio===target&&enabled&&!paused){enabled=false;label();button.title='音を再生できませんでした。もう一度押すと再試行します。';}});
 }
 button.onclick=()=>{enabled=!enabled;started=true;label();sync();};label();
 return {start(){started=true;sync();},zone(value){if(zone!==value){zone=value;sync();}},pause(value){if(paused!==value){paused=value;sync();}}};
}
