/* Shared by browser and APK. Pointer capture keeps navigation on the canvas. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PaperlyTouch=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    function mount(surface,options){
        const touches=new Map();let single=null,multi=false,gesture=null;
        function prevent(e){if(e.cancelable)e.preventDefault()}
        function capture(e){try{surface.setPointerCapture(e.pointerId)}catch{}}
        function release(id){try{if(surface.hasPointerCapture(id))surface.releasePointerCapture(id)}catch{}}
        function rebase(){
            if(touches.size<2){gesture=null;return}
            const [a,b]=Array.from(touches.values());const rect=options.getRect();
            const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
            gesture={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),scale:options.getScale(),anchor:{x:(middle.x-rect.left)/rect.width,y:(middle.y-rect.top)/rect.height}};
        }
        function down(e){
            if(e.button!==0||options.canStart?.()===false)return;
            if(e.pointerType==='touch'){
                // A finger resting next to an active stylus must not become ink or a pinch.
                if(single?.type==='pen')return;
                if(single){options.cancel();single=null}
                touches.set(e.pointerId,{x:e.clientX,y:e.clientY});capture(e);prevent(e);
                if(touches.size>=2){multi=true;options.cancel();rebase()}
                else if(!multi)options.start(e);
                return;
            }
            if(touches.size||single)return;
            single={id:e.pointerId,type:e.pointerType};capture(e);prevent(e);options.start(e);
        }
        function move(e){
            if(touches.has(e.pointerId)){
                touches.set(e.pointerId,{x:e.clientX,y:e.clientY});prevent(e);
                if(multi){
                    if(touches.size>=2&&gesture){const[a,b]=Array.from(touches.values());options.navigate({scale:clamp(gesture.scale*Math.hypot(b.x-a.x,b.y-a.y)/gesture.distance,options.minScale||.5,options.maxScale||8),anchor:gesture.anchor,clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2})}
                }else options.move(e);
            }else if(single?.id===e.pointerId){prevent(e);options.move(e)}
        }
        function finish(e,cancelled){
            if(touches.has(e.pointerId)){
                prevent(e);touches.delete(e.pointerId);
                if(multi){if(touches.size>=2)rebase();else gesture=null;if(!touches.size)multi=false}
                else if(cancelled)options.cancel();else options.end(e);
                release(e.pointerId);return;
            }
            if(single?.id===e.pointerId){single=null;if(cancelled)options.cancel();else options.end(e);release(e.pointerId)}
        }
        const handlers={pointerdown:down,pointermove:move,pointerup:e=>finish(e,false),pointercancel:e=>finish(e,true),lostpointercapture:e=>finish(e,true)};
        for(const[name,handler]of Object.entries(handlers))surface.addEventListener(name,handler,{passive:false});
        function reset(){const ids=Array.from(touches.keys());if(single)ids.push(single.id);touches.clear();single=null;multi=false;gesture=null;options.cancel();ids.forEach(release)}
        return{reset,destroy(){reset();for(const[name,handler]of Object.entries(handlers))surface.removeEventListener(name,handler)}};
    }
    return{mount,clamp};
});
