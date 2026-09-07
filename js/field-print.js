import * as THREE from 'three';

// Screen-space print texture: keep curved meshes and leave the HTML controls sharp.
export function createFieldPrint(renderer) {
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{picture:{value:target.texture},texel:{value:new THREE.Vector2(1,1)}},vertexShader:`varying vec2 uvPrint;void main(){uvPrint=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
    uniform sampler2D picture;uniform vec2 texel;varying vec2 uvPrint;
    float lightness(vec3 c){return dot(c,vec3(.299,.587,.114));}
    void main(){
      vec3 c=texture2D(picture,uvPrint).rgb;
      float a=lightness(texture2D(picture,uvPrint-texel).rgb);
      float b=lightness(texture2D(picture,uvPrint+texel).rgb);
      float relief=clamp((a-b)*1.1,-.20,.20);
      c+=max(relief,0.)*vec3(.35,.85,1.0)+max(-relief,0.)*vec3(.78,.34,.54);
      vec2 p=mod(floor(gl_FragCoord.xy),2.);
      float d=(p.x+2.*p.y)/4.-.375;
      c=floor(clamp(c,0.,1.)*27.+.5+d*.6)/27.;
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  return {
    resize(w,h){const scale=Math.max(1.6,w/800,h/500);const x=Math.max(1,Math.round(w/scale)),y=Math.max(1,Math.round(h/scale));target.setSize(x,y);material.uniforms.texel.value.set(1/x,1/y);},
    render(world,view){renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(null);renderer.render(scene,camera);},
    dispose(){target.dispose();material.dispose();scene.children[0].geometry.dispose();}
  };
}
