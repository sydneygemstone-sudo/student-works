export const TREES=[{x:21,z:-23},{x:29,z:-26},{x:36,z:-18}];
export const RINGS=[{x:-22,z:-19},{x:-30,z:-24},{x:-37,z:-17}];
export const ANIMALS=[{x:-8,z:29,type:'sheep'},{x:0,z:34,type:'cow'},{x:8,z:29,type:'chicken'}];
export const FIRE={x:28,z:-11};
export const CABIN={x:0,z:43};
export const SPEED=7;
export function move(p,dx,dz,dt,speed=SPEED){let n=Math.hypot(dx,dz);if(n>1){dx/=n;dz/=n;}let x=p.x+dx*dt*speed,z=p.z+dz*dt*speed;if(Math.hypot(x,z)>53){let a=Math.atan2(z,x);x=Math.cos(a)*53;z=Math.sin(a)*53;}for(const t of TREES){let d=Math.hypot(x-t.x,z-t.z);if(d<1.2){x=t.x+(x-t.x)/(d||1)*1.2;z=t.z+(z-t.z)/(d||1)*1.2;}}p.x=x;p.z=z;}
