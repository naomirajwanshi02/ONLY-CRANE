import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)

# 1. creases: light grey, thin
rep('this.faintMat=m(vn.muted,1.5,.75)', 'this.faintMat=m("#d3cfc8",1.7,.95)')
# 2. paper thinner (layer spacing) and ink lift / occlusion margin scaled to match
rep('qn=.003,', 'qn=.0008,')
rep('x0=.0016,', 'x0=.0004,')
rep('a=r-9e-4;', 'a=r-3e-3;')
# 3. hinge classification: grey while a fold is open or flat, black only once folded flat over
old = 'if(Y>=0){let H=s.get(Y);if(H&&(H.bent||g.bent?le(H.normal,g.normal)>.996:M0(H.P,g.P))&&(K=!0,Y<g.id||yc(g.p,[(v[0]+w[0])/2,(v[1]+w[1])/2])))continue}'
new = 'if(Y>=0){let H=s.get(Y);if(H){let dn=le(H.normal,g.normal),mc=[(v[0]+w[0])/2,(v[1]+w[1])/2,0];if(H.bent||g.bent?dn>.996:M0(H.P,g.P)){if(K=!0,Y<g.id||yc(g.p,mc))continue}else if((dn>.7||window.__col)&&dn>-.95&&He(Ht(H.map(mc),g.map(mc)))<.03&&(K=!0,Y<g.id))continue}}'
rep(old, new)
# 4. floor shadow only for the finished crane
rep('setFloor(t,e,i){', 'setShadow(t){this.floor.material.opacity=.15*t,this.floor.visible=t>.001}setFloor(t,e,i){')
rep('gs.setFloor(o-.002,0,0),', 'gs.setFloor(o-.002,0,0),(()=>{let{b:H,lt:Z}=sc(n);gs.setShadow(H.op.kind==="finale"?Ke(an(Z/(H.lead+H.dur),.25,.9)):0)})(),')

# 5. a line on the very edge of a higher layer is not "under" it: keep the outline (strictly interior only)
rep('/Math.hypot(w,D)<-1e-6&&(T=!1)', '/Math.hypot(w,D)<(Math.abs(g.normal[2])<.999?.002:window.__early?1e-4:-1e-6)&&(T=!1)')

# 6. steps 11-12: no solid line across the pressed-flat kite (the folded top edge of the petal flap)
rep('let{dark:s,faint:r}=w0(t,e,i.pos);', 'window.__stp=sc(n).b.step;window.__early=parseInt(window.__stp.slice(5))<=14;window.__col=window.__stp==="Step 4"||window.__stp==="Step 5";window.__bt=["Step 7","Step 8","Step 10","Step 11","Step 12","Step 14"].includes(window.__stp);window.__fv=["Step 10","Step 11","Step 12"].includes(window.__stp);let{dark:s,faint:r}=w0(t,e,i.pos);')
rep('||P.push(...Z,...X)', '||(Y>=0&&!K&&(window.__stp==="Step 10"||window.__stp==="Step 11"||window.__stp==="Step 12")&&Math.abs(Z[1]+.293)<.004&&Math.abs(X[1]+.293)<.004&&Math.abs(Z[2]-X[2])<.002)||P.push(...Z,...X)')

# 7. fold-to-centre steps: where two raw edges meet (the dividing line), that is still paper edge: draw it black
rep('Y<0&&_&&h(g.id,Ht(Sn(Z,X,.5),x))||', 'Y<0&&_&&!window.__bt&&h(g.id,Ht(Sn(Z,X,.5),x))||')

# 8. the hinge neighbour never hides an edge (it shares the seam): stops outlines flickering on and off
rep('function b0(n,t,e,i){', 'function b0(n,t,e,i,ex,gn){')
rep('for(let c of n){if(c.id===t)continue;let l=Ht(c.c,e)', 'for(let c of n){if(c.id===t||c.id===ex)continue;let l=Ht(c.c,e)')
rep('b0(a,g.id,e,Sn(Z,X,.5))', 'b0(a,g.id,e,Sn(Z,X,.5),Y,g.bent?null:g.normal)')
rep('p=(g,_)=>{let m=g.normal;for(let f of d){if(f.id===g.id||f.L<=g.p.L)continue;', 'p=(g,_,ex)=>{let m=g.normal;for(let f of d){if(f.id===g.id||f.id===ex||f.L<=g.p.L)continue;')
rep('!g.bent&&p(g,Ht(Sn(Z,X,.5),x))', '!g.bent&&p(g,Ht(Sn(Z,X,.5),x),Y)')
# 9. steps 10-12: the dividing line down the middle of the kite is paper edge, always black
rep('K=!1;if(Y>=0){let H=s.get(Y);if(H){let dn=', 'K=!1,FV=window.__fv&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004;if(Y>=0&&!FV){let H=s.get(Y);if(H){let dn=')

# 10. a piece lying in the same plane as the edge (e.g. the other half of the same flap) never hides it
rep('for(let[u,d,p]of c.tris){let g=Ht(d,u),_=Ht(p,u),m=De(o,_),f=le(g,m);if(Math.abs(f)<1e-12)continue;', 'for(let[u,d,p]of c.tris){let g=Ht(d,u),_=Ht(p,u),m=De(o,_),f=le(g,m);if(Math.abs(f)<1e-12)continue;if(gn){let nn=De(g,_),nl=He(nn);if(nl>1e-12&&Math.abs(le(nn,gn))/nl>.9999&&Math.abs(le(Ht(i,u),gn))<.03)continue}')

# 11. temporal stability: a sub-segment hidden in this frame but visible in a frame within +-2 stays drawn (no blinking outlines)
rep('for(let[E,C,T,A,Y]of i.get(g.id)){let v=', 'let EI=-1;for(let[E,C,T,A,Y]of i.get(g.id)){EI++;let v=')
rep('let Z=Sn(D,W,H/O),X=Sn(D,W,(H+1)/O);Y<0&&_&&!window.__bt&&h(g.id,Ht(Sn(Z,X,.5),x))||', 'let Z=Sn(D,W,H/O),X=Sn(D,W,(H+1)/O),KY=g.id+"|"+EI+"|"+Math.round((H+.5)/O*24),HD;(HD=(Y<0&&_&&!window.__bt&&h(g.id,Ht(Sn(Z,X,.5),x))||')
rep('b0(a,g.id,e,Sn(Z,X,.5),Y,g.bent?null:g.normal)||(Y>=0&&!K&&(', 'b0(a,g.id,e,Sn(Z,X,.5),Y,g.bent?null:g.normal)),window.__cl&&!HD&&window.__cl.add(KY),0)||(Y>=0&&!K&&(')
rep('<.002)||P.push(...Z,...X)', '<.002)||(HD&&!(window.__cu&&window.__cu.has(KY)))||P.push(...Z,...X)')
rep('let{dark:s,faint:r}=w0(t,e,i.pos);', 'window.__cu=new Set();for(let dd of[-2,-1,1,2]){let tn=n+dd/30;if(tn<0)continue;window.__cl=window.__cu;try{let t2=Dh(tn),e2=Nh(t2),i2=R0(tn);w0(t2,e2,i2.pos)}catch(_){}}window.__cl=null;let{dark:s,faint:r}=w0(t,e,i.pos);')

# 12. no stray lines: faint lines while the kite is turned over at the start of step 12; the near-flat double edge when the step 10 flaps start to lift
rep('||(HD&&!(window.__cu&&window.__cu.has(KY)))||P.push', '||(window.__hz&&(P===o||(Y>=0&&!FV&&Math.abs(Z[1]-X[1])<.45*Math.abs(Z[0]-X[0]))))||(window.__s10&&!K&&Y<0&&Math.abs(g.normal[2])<.9999&&Math.abs(g.normal[2])>.97)||(HD&&!(window.__cu&&window.__cu.has(KY)))||P.push')
rep('window.__early=parseInt', 'window.__hz=sc(n).b.step==="Step 12"&&n>47.3&&n<49;window.__s10=sc(n).b.step==="Step 10";window.__early=parseInt')

# 13. steps 13-14 (kite turned over/spinning): the centre divider (found at the end of step 12 by crease-pattern id) stays black; the step-11 horizontal crease is hidden in step 13
rep('K=!1,FV=window.__fv&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004;', 'K=!1,FV=window.__fv&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004;if(window.__fvc&&FV)window.__fvc.add(g.id+"|"+EI);if(window.__fvc&&Y>=0&&Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004&&Math.abs(D[2]-W[2])<.002)window.__hkc.add(g.id+"|"+EI);if(window.__fvk&&window.__s1314&&window.__fvk.has(g.id+"|"+EI))FV=!0;')
rep('||(window.__hz&&', '||(window.__s13&&window.__hk.has(g.id+"|"+EI))||(window.__hz&&')
rep('window.__early=parseInt', 'if(!window.__fvk){let sv=window.__fv;window.__fv=!0;window.__fvc=new Set;window.__hkc=new Set;let tt=61.3,t3=Dh(tt),e3=Nh(t3),i3=R0(tt);w0(t3,e3,i3.pos);window.__fvk=window.__fvc;window.__hk=window.__hkc;window.__fvc=null;window.__hkc=null;window.__fv=sv}window.__s1314=window.__stp==="Step 13"||window.__stp==="Step 14";window.__s13=window.__stp==="Step 13";window.__early=parseInt')

# 14. step 16 after the turn-over: only the paper outline (convex hull of the flat kite) until the final clean lines come in
rep('function w0(n,t,e){let i=v0(n.pieces),', 'function HLL(t){let P=[];for(let g of t)for(let v of g.verts)P.push([v[0],v[1]]);P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),L=[],U=[];for(let p of P){while(L.length>1&&cr(L[L.length-2],L[L.length-1],p)<=0)L.pop();L.push(p)}for(let p of P.slice().reverse()){while(U.length>1&&cr(U[U.length-2],U[U.length-1],p)<=0)U.pop();U.push(p)}L.pop();U.pop();return L.concat(U)}function onHL(H,a,b){for(let i=0;i<H.length;i++){let p=H[i],q=H[(i+1)%H.length],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);if(l<1e-9)continue;let da=Math.abs((a[0]-p[0])*dy-(a[1]-p[1])*dx)/l,db=Math.abs((b[0]-p[0])*dy-(b[1]-p[1])*dx)/l;if(da<.006&&db<.006)return!0}return!1}function w0(n,t,e){let HLv=window.__h16?HLL(t):null,i=v0(n.pieces),')
rep('||(window.__s13&&window.__hk.has', '||(window.__h16&&!onHL(HLv,D,W))||(window.__s13&&window.__hk.has')
rep('window.__s13=window.__stp==="Step 13";', 'window.__s13=window.__stp==="Step 13";window.__h16=window.__stp==="Step 16"&&n>69.85&&n<70.5;')

# 15. step 22: the wing fold line sits higher on the body
rep('wingY:.004,', 'wingY:-.045,')
open(dst, 'w').write(s)
print('ok')
