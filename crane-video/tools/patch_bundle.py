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
rep('wingY:.004,', 'wingY:-.1,')

# 16. step 24 annotations: no tiny ring/arrowhead flicker while the previous caption is still fading out
rep('if(!e.anns.length||s==="hold")return o;', 'if(!e.anns.length||s==="hold"||(s==="lead"&&e.step==="Step 24"&&i<.5))return o;')

# 17. silhouette creases: where one side of a fold faces the camera and the other faces away, that edge is the paper's outer edge -> black, not a grey crease
rep('He(Ht(H.map(mc),g.map(mc)))<.03&&(K=!0,Y<g.id))continue}}', 'He(Ht(H.map(mc),g.map(mc)))<.03&&(K=!0,Y<g.id))continue}}if(K&&Y>=0){let Hh=s.get(Y);if(Hh){let vd=[e[0]-D[0],e[1]-D[1],e[2]-D[2]];if(le(Hh.normal,vd)*le(g.normal,vd)<0)K=!1}}')

# 18. round 6: step 9 centre line, no step-10 diagonals, crease held through the turn, grey horizontal removed before the wings fold, black after
rep('"Step 7","Step 8","Step 10","Step 11","Step 12","Step 14"].includes', '"Step 7","Step 8","Step 9","Step 10","Step 11","Step 12","Step 14"].includes')
rep('window.__fv=["Step 10","Step 11","Step 12"].includes', 'window.__fv=["Step 9","Step 10","Step 11","Step 12"].includes')
rep('window.__hz=sc(n).b.step==="Step 12"&&n>47.3&&n<49;', 'window.__hz=!1;window.__hg=sc(n).b.step==="Step 12"&&n>48.7&&n<51.35;window.__hb=sc(n).b.step==="Step 12"&&n>51.3;window.__hold=sc(n).b.step==="Step 12"&&n>47.3&&n<48.7;window.__nd=n>39.3&&n<45.25;window.__h13=sc(n).b.step==="Step 12"&&n>60.85&&n<61.3;')
rep('window.__fvk=window.__fvc;window.__hk=window.__hkc;window.__fvc=null;window.__hkc=null;', 'window.__fvk=window.__fvc;window.__hk=window.__hkc;window.__fvc=new Set;window.__hkc=new Set;{let t4=Dh(46.9),e4=Nh(t4),i4=R0(46.9);w0(t4,e4,i4.pos)}window.__hkb=window.__hkc;window.__fvc=null;window.__hkc=null;')
rep('||(HD&&!(window.__cu&&window.__cu.has(KY)))||P.push', '||(HD&&!FV&&!(window.__hold&&window.__hkb.has(g.id+"|"+EI))&&!(window.__cu&&window.__cu.has(KY)))||P.push')
rep('||(window.__h16&&!onHL(HLv,D,W))||', '||(window.__hg&&P===o&&Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004)||(window.__nd&&P===o&&Math.abs(Z[0]-X[0])>.15*Math.abs(Z[1]-X[1])&&Math.abs(Z[1]-X[1])>.15*Math.abs(Z[0]-X[0]))||(window.__h13&&Y>=0&&!FV&&!onHL(HLv,D,W)&&!(Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004))||(window.__h16&&!onHL(HLv,D,W))||')
rep('(Y>=0&&!K&&(window.__stp===', '(Y>=0&&!K&&!window.__hb&&(window.__stp===')
rep('if(le(Hh.normal,vd)*le(g.normal,vd)<0)K=!1}}', 'if(le(Hh.normal,vd)*le(g.normal,vd)<0)K=!1}}if(window.__hb&&K&&Y>=0&&Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004)K=!1;')
rep('let HLv=window.__h16?HLL(t):null', 'let HLv=(window.__h16||window.__h13)?HLL(t):null')

rep('||(window.__h13&&Y>=0&&!FV&&', '||(window.__h10&&Y>=0&&!FV&&D[1]>-.28&&W[1]>-.28&&!onHL(HLv,D,W))||(window.__h13&&Y>=0&&!FV&&')
rep('window.__h13=sc(n).b.step==="Step 12"&&n>60.85&&n<61.3;', 'window.__h13=sc(n).b.step==="Step 12"&&n>60.85&&n<61.3;window.__h10=n>44.5&&n<45.1;')
rep('let HLv=(window.__h16||window.__h13)?HLL(t):null', 'let HLv=(window.__h16||window.__h13||window.__h10)?HLL(t):null')

# 19. round 7: keep the two grey creases after step 9; step 10 dash goes once the fold is made; top-triangle V glitch hidden; black horizontal edge appears as the wings start folding
rep('window.__nd=n>39.3&&n<45.25;', 'window.__nd=!1;')
rep('window.__h10&&Y>=0&&!FV&&D[1]>-.28&&W[1]>-.28&&!onHL(HLv,D,W)', 'window.__h10&&Y>=0&&!FV&&D[1]>-.3&&W[1]>-.3&&Math.abs(D[1]-W[1])>.004&&!onHL(HLv,D,W)')
rep('window.__hg=sc(n).b.step==="Step 12"&&n>48.7&&n<51.35;window.__hb=sc(n).b.step==="Step 12"&&n>51.3;', 'window.__hg=sc(n).b.step==="Step 12"&&n>48.7&&n<50.35;window.__hb=sc(n).b.step==="Step 12"&&n>50.3;')
rep('l=s==="lead"?1:1-Ke((r-.75)/.25)', 'l=s==="lead"?1:1-Ke((r-(e.step==="Step 10"?.6:.75))/(e.step==="Step 10"?.2:.25))')

# 20. round 9: no solid vertical line in step 9
rep('"Step 7","Step 8","Step 9","Step 10","Step 11","Step 12","Step 14"].includes', '"Step 7","Step 8","Step 10","Step 11","Step 12","Step 14"].includes')
rep('window.__fv=["Step 9","Step 10","Step 11","Step 12"].includes', 'window.__fv=["Step 10","Step 11","Step 12"].includes')
rep('||(window.__hg&&P===o&&', '||(window.__stp==="Step 9"&&P!==o&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)||(window.__hg&&P===o&&')

# 21. round 10: no grey horizontal crease at start of step 12 (until black fold edge)
rep('window.__hz=!1;', 'window.__hz=(sc(n).b.step==="Step 12"||(sc(n).b.step==="Step 11"&&n>45.6))&&n<50.3;')
rep('||(window.__s10&&!K&&Y<0&&', '||(window.__s10&&!FV&&!K&&Y<0&&')

# 22. round 10b: step 12 colours
rep('&&n<50.3;window.__hg=sc(n).b.step==="Step 12"&&n>48.7&&n<50.35;window.__hb=sc(n).b.step==="Step 12"&&n>50.3;',
    '&&n<48.9;window.__hg=!1;window.__hb=!1;window.__g1=sc(n).b.step==="Step 12"&&n>=48.3&&n<61.5;window.__g2=sc(n).b.step==="Step 12"&&((n>=48.3&&n<51.7)||(n>=55.6&&n<59.3));window.__g3=sc(n).b.step==="Step 12"&&n>=57.4&&n<59.3;window.__g2b=sc(n).b.step==="Step 12"&&n>=51.7&&n<52.6;')
rep('let P=K?o:r,O=Math.max(1,Math.ceil(', 'if(Y>=0&&((window.__g1&&Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004)||(window.__g2&&FV)||(window.__g3&&!FV)))K=!0;let P=K?o:r,O=Math.max(1,Math.ceil(')

# 23. round 10c: steps 14/16 wrong-lines suppression, step 16 colours
rep('window.__fv=["Step 10","Step 11","Step 12"].includes(window.__stp);', 'window.__fv=["Step 10","Step 11","Step 12"].includes(window.__stp)||(window.__stp==="Step 16"&&n>=69.5&&n<72.0);')
rep('window.__s1314=window.__stp==="Step 13"||', 'window.__g4=window.__stp==="Step 16"&&n>=69.5&&n<72.0;window.__kw=(window.__stp==="Step 14"&&n>=64.6&&n<67.2)?14:(window.__stp==="Step 16"&&n>=72.6&&n<74.2)?16:0;if(window.__kw&&!(window.__kcs||(window.__kcs={}))[window.__kw]){let tt=window.__kw===14?67.4:74.4,sv=window.__kw;window.__kw=0;window.__rc=new Set;let t3=Dh(tt),e3=Nh(t3),i3=R0(tt);w0(t3,e3,i3.pos);window.__kcs[sv]=window.__rc;window.__rc=null;window.__kw=sv}window.__s1314=window.__stp==="Step 13"||')
rep('if(Y>=0&&((window.__g1&&', 'if(Y>=0&&((window.__g4&&Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004)||(window.__g1&&')
rep('||(window.__s13&&window.__hk.has(g.id+"|"+EI))||', '||(window.__kw&&!FV&&window.__kcs[window.__kw]&&!window.__kcs[window.__kw].has(KY))||(window.__s13&&window.__hk.has(g.id+"|"+EI))||')
rep('||P.push(...Z,...X)', '||(window.__rc&&window.__rc.add(KY),P.push(...Z,...X))')
rep('n>69.85&&n<70.5;', 'n>69.85&&n<70.15;')
rep('n>69.85&&n<70.15;', 'n>69.85&&n<71.3;')
rep('(window.__h16&&!onHL(HLv,D,W))', '(window.__h16&&!(window.__h16x&&(FV||(Math.abs(D[1]+.293)<.004&&Math.abs(W[1]+.293)<.004)))&&!onHL(HLv,D,W))')
rep('window.__g4=', 'window.__h16x=n>70.1;window.__g4=')
rep('||(window.__kw&&!FV&&window.__kcs', '||(window.__kw&&Y>=0&&!FV&&window.__kcs')
# 24. hide the two tiny V triangles exposed by the lower wing fold
rep('gs.setCamera(i.pos,i.look),gs.setPaper(e);', 'if(n>94){let sm=h=>{let v=h.verts,a=[0,0,0];for(let i=1;i<v.length-1;i++){let u=[v[i][0]-v[0][0],v[i][1]-v[0][1],v[i][2]-v[0][2]],w=[v[i+1][0]-v[0][0],v[i+1][1]-v[0][1],v[i+1][2]-v[0][2]];a[0]+=u[1]*w[2]-u[2]*w[1];a[1]+=u[2]*w[0]-u[0]*w[2];a[2]+=u[0]*w[1]-u[1]*w[0]}return Math.hypot(...a)/2};e=e.filter(h=>{if(h.verts.length!==3)return!0;let A=sm(h),cx=h.verts.reduce((q,u)=>q+u[0],0)/3,cy=h.verts.reduce((q,u)=>q+u[1],0)/3;return!(A>.004&&A<.006&&Math.abs(cx)<.05&&cy<-.05&&cy>-.2)})}'+'gs.setCamera(i.pos,i.look),gs.setPaper(e);')
rep('(window.__stp==="Step 9"&&P!==o&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)', '(window.__stp==="Step 9"&&P!==o&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004&&(D[1]>-.29||W[1]>-.29))')
rep('FV=window.__fv&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004', 'FV=window.__fv&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004&&(window.__stp!=="Step 9"||(D[1]<-.29&&W[1]<-.29))')
rep('window.__fv=["Step 10","Step 11","Step 12"].includes(window.__stp)', 'window.__fv=["Step 9","Step 10","Step 11","Step 12"].includes(window.__stp)')
rep('Math.abs(D[1]-W[1])>.004&&!onHL(HLv,D,W))', 'Math.abs(D[1]-W[1])>.004&&Math.abs(D[1]-W[1])<1.5*Math.abs(D[0]-W[0])&&!onHL(HLv,D,W))')
rep('||(window.__kw&&Y>=0&&!FV&&', '||(window.__h9&&Math.abs(D[1]-W[1])<.004)||(window.__kw&&Y>=0&&!FV&&')
rep('window.__g4=', 'window.__h9=n>=39.5&&n<40.85;window.__g4=')
rep('window.__early=parseInt(window.__stp.slice(5))<=14;', 'window.__early=parseInt(window.__stp.slice(5))<=14||[21,22,23].includes(parseInt(window.__stp.slice(5)));')
rep('window.__h16=window.__stp==="Step 16"&&n>69.85&&n<71.3;', 'window.__h16=(window.__stp==="Step 16"&&n>69.62&&n<71.3)||(window.__stp==="Step 12"&&n>48.05&&n<48.3);')
rep('window.__g4=window.__stp==="Step 16"&&n>=69.5&&n<72.0;', 'window.__g4=window.__stp==="Step 16"&&n>=69.5&&n<73.2;window.__gw=(n>=94&&n<98.5);window.__gx=n>=98.5&&n<104.5;window.__fin=n>=104.5;window.__gv=(window.__stp==="Step 12"&&n>=55.6&&n<56.4)||(window.__stp==="Step 9"&&n>=39.5)||(window.__stp==="Step 10"&&n<42.4);')
rep('if(Y>=0&&((window.__g4&&', 'if(Y>=0&&((window.__gw&&Math.abs(D[1]+.1)<.004&&Math.abs(W[1]+.1)<.004)||(window.__gv&&FV)||(window.__g4&&')
rep('||(window.__h9&&Math.abs(D[1]-W[1])<.004)||', '||(window.__h9&&Math.abs(D[1]-W[1])<.004)||(window.__h12b&&(FV||(D[1]<-.29&&W[1]<-.29&&Math.abs(D[1]-W[1])>1.2*Math.abs(D[0]-W[0])&&!onHL(HLv,D,W))))||')
rep('window.__hg=!1;window.__hb=!1;', 'window.__hg=!1;window.__hb=!1;window.__h12b=sc(n).b.step==="Step 12"&&n>=48.3&&n<48.95;')
rep('let HLv=(window.__h16||window.__h13||window.__h10)?HLL(t):null', 'let HLv=(window.__h16||window.__h13||window.__h10||window.__h12b)?HLL(t):null')
rep('||(window.__g2&&FV)||(window.__g3&&!FV)', '||(window.__g2&&FV)||(window.__g2b&&FV&&D[1]>-.29&&W[1]>-.29)||(window.__g3&&!FV&&!onHL(HLv,D,W))')
rep('(window.__h16||window.__h13||window.__h10||window.__h12b)?HLL(t)', '(window.__h16||window.__h13||window.__h10||window.__h12b||window.__g3)?HLL(t)')
rep('function w0(n,t,e){', 'function inAny(t,p){for(let g of t){let V=g.verts,pos=0,neg=0;for(let i=0;i<V.length;i++){let a=V[i],b=V[(i+1)%V.length],c=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);if(c>1e-9)pos++;else if(c<-1e-9)neg++}if(!(pos&&neg))return!0}return!1}function onOut(t,a,b){let dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l*.01,ny=dx/l*.01,mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;return inAny(t,[mx+nx,my+ny])!==inAny(t,[mx-nx,my-ny])}function w0(n,t,e){')
rep('(window.__g3&&!FV&&!onHL(HLv,D,W))', '(window.__g3&&!FV&&!onOut(t,D,W))')
rep('let{dark:s,faint:r}=w0(t,e,i.pos);', 'let __f=(window.__stp==="Step 14"&&n>=66.05&&n<66.6)||(window.__stp==="Step 16"&&n>=73.3&&n<74.3),__t=__f?Dh(window.__stp==="Step 14"?66.7:74.5):t,__e=__f?Nh(__t):e;let{dark:s,faint:r}=w0(__t,__e,i.pos);')
rep('if(Y>=0&&((window.__gw&&', 'if(Y>=0&&((window.__gx&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)||(window.__gw&&')
rep('let P=K?o:r,O=Math.max(1,Math.ceil(He(', 'if(window.__gx&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)K=!0;let P=K?o:r,O=Math.max(1,Math.ceil(He(')
rep('if(window.__gx&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)K=!0;', 'if(window.__gx&&Math.abs(D[1]+.1)<.004&&Math.abs(W[1]+.1)<.004)K=!1;if(window.__gx&&Math.abs(D[0])<.004&&Math.abs(W[0])<.004)K=!0;')
rep('if(window.__gx&&Math.abs(D[1]+.1)<.004', 'if(window.__fin&&!K){let dd=[D[0]-W[0],D[1]-W[1],D[2]-W[2]],mm=[(D[0]+W[0])/2,(D[1]+W[1])/2,(D[2]+W[2])/2],cd=[mm[0]-e[0],mm[1]-e[1],mm[2]-e[2]],sx=[dd[1]*cd[2]-dd[2]*cd[1],dd[2]*cd[0]-dd[0]*cd[2],dd[0]*cd[1]-dd[1]*cd[0]],sl=Math.hypot(sx[0],sx[1],sx[2])||1,dl=.014,pa=[mm[0]+sx[0]/sl*dl,mm[1]+sx[1]/sl*dl,mm[2]+sx[2]/sl*dl],pb=[mm[0]-sx[0]/sl*dl,mm[1]-sx[1]/sl*dl,mm[2]-sx[2]/sl*dl],da=fdep(t,e,pa),db=fdep(t,e,pb);if(isFinite(da)&&isFinite(db)&&Math.abs(da-db)<.03)K=!0}if(window.__gx&&Math.abs(D[1]+.1)<.004')
rep('function w0(n,t,e){', 'function fdep(t,c,P){let d=[P[0]-c[0],P[1]-c[1],P[2]-c[2]],L=Math.hypot(d[0],d[1],d[2]),best=1/0;for(let g of t){let n=g.normal,a=g.verts[0],den=n[0]*d[0]+n[1]*d[1]+n[2]*d[2];if(Math.abs(den)<1e-9)continue;let s=(n[0]*(a[0]-c[0])+n[1]*(a[1]-c[1])+n[2]*(a[2]-c[2]))/den;if(s<=0)continue;let X=[c[0]+s*d[0],c[1]+s*d[1],c[2]+s*d[2]],V=g.verts,pos=0,neg=0;for(let i=0;i<V.length;i++){let p=V[i],q=V[(i+1)%V.length],ex=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],ax=[X[0]-p[0],X[1]-p[1],X[2]-p[2]],cr=[ex[1]*ax[2]-ex[2]*ax[1],ex[2]*ax[0]-ex[0]*ax[2],ex[0]*ax[1]-ex[1]*ax[0]],k=cr[0]*n[0]+cr[1]*n[1]+cr[2]*n[2];if(k>1e-9)pos++;else if(k<-1e-9)neg++}if(!(pos&&neg)){let dep=s*L;if(dep<best)best=dep}}return best}function w0(n,t,e){')
open(dst, 'w').write(s)
print('ok')
