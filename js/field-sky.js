import * as THREE from 'three';

// A seamless, baked cloud texture: generated once and reused every frame.
export function buildFieldSky(scene){
  const width=1024,height=512,c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d'),data=ctx.createImageData(width,height);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  function noise(x,y,period){let ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const h=(a,b)=>hash((a%period+period)%period,b);return (h(ix,iy)*(1-fx)+h(ix+1,iy)*fx)*(1-fy)+(h(ix,iy+1)*(1-fx)+h(ix+1,iy+1)*fx)*fy;}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const elevation=1-y/height,h=Math.max(0,Math.min(1,(elevation-.5)*2));let n=0,amp=.55;
    for(let o=0;o<5;o++){const scale=8*2**o;n+=noise(x/width*scale,y/height*scale*.65,scale)*amp;amp*=.5;}
    const cloud=Math.max(0,Math.min(1,(n-.57)*8))*Math.min(1,h*8)*Math.min(1,(1-h)*4+.15);
    const base=[156-91*h,192-60*h,219-27*h],shade=235+n*17;
    data.data.set(base.map(v=>v*(1-cloud)+shade*cloud).concat(255),(y*width+x)*4);
  }
  ctx.putImageData(data,0,0);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(290,48,24),material);dome.renderOrder=-10;scene.add(dome);
  return {texture,update(time,player){dome.position.copy(player);dome.rotation.y=time*.0015;}};
}
