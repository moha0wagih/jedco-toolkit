/* ==========================================================================
   صانع العروض 2 — image generation panel (same engine as «صانع الصور»)
   Builds a ready prompt for ChatGPT or Copilot from the slide, then the
   generated image is dropped straight onto the slide.
   ========================================================================== */
(function (PM) {
'use strict';
const UIq = s => document.querySelector(s);
var O={
  kind:[
    ['real','واقعي','an ultra-realistic photograph with true-to-life materials, textures and light, as if taken by a professional photographer with a full-frame camera'],
    ['cine','سينمائي','a cinematic film still shot on an ARRI Alexa: gentle filmic contrast, soft highlight roll-off, natural skin tones, refined color separation and subtle depth'],
    ['3d','ثري دي','a high-end 3D render with soft global illumination, clean physically based materials and studio-quality rendering'],
    ['cartoon','كرتوني','a stylized cartoon illustration with clean shapes, friendly proportions and smooth shading'],
    ['clay','صلصال','a claymation / stop-motion clay style with a handmade, sculpted look and soft studio light'],
    ['iso','أيزومتري','an isometric 3D illustration in a true isometric view, like a clean miniature diorama'],
    ['flat','فلات','a flat vector illustration with simple geometric shapes, a limited palette, no gradients and crisp edges'],
    ['paint','رسم يدوي','a hand-painted gouache and colored-pencil illustration with visible brush strokes and paper texture'],
    ['water','ألوان مائية','a delicate watercolor painting with soft bleeding edges and light paper texture'],
    ['sketch','سكتش','a pencil and ink sketch with expressive linework and light hatching, sketchbook feel'],
    ['minimal','مينيمال','a minimalist image with a single clear focal subject and generous clean empty space']
  ],
  size:[
    ['169','عرض تقديمي',16,9,'16:9','1920×1080'],
    ['916','ستوري وريلز',9,16,'9:16','1080×1920'],
    ['11','بوست مربع',1,1,'1:1','1080×1080'],
    ['45','بوست عمودي',4,5,'4:5','1080×1350'],
    ['32','صورة أفقية',3,2,'3:2','3000×2000'],
    ['31','بانر عريض',3,1,'3:1','3000×1000'],
    ['a4p','A4 عمودي',210,297,'1:1.41','2480×3508'],
    ['a4l','A4 أفقي',297,210,'1.41:1','3508×2480'],
    ['roll','رول أب',85,200,'1:2.35','850×2000 mm'],
    ['custom','مخصص',0,0,'','']
  ],
  quality:[
    ['std','عادية','Clean, sharp, high-quality image.'],
    ['high','عالية','Very high detail, crisp and sharp, at the highest resolution available (4K-quality detail).'],
    ['print','للطباعة','Print quality: ultra-detailed, tack-sharp, clean edges and no compression artifacts, suitable for large-format printing.']
  ],
  place:[
    ['out','خارجي','an outdoor scene'],
    ['in','داخلي','an indoor scene'],
    ['studio','استوديو','a studio shot on a plain, seamless backdrop']
  ],
  time:[
    ['fajr','فجر','pre-dawn blue hour (Fajr): soft, cool, low-contrast ambient light, a deep blue sky with a faint glow on the horizon, artificial lights still on'],
    ['sunrise','شروق','sunrise: a low warm golden sun just above the horizon, long soft shadows and a gentle warm-to-cool sky gradient'],
    ['morning','صباح','mid-morning: clean, bright natural daylight with crisp but soft shadows'],
    ['dhuhr','ظهر','midday (Dhuhr): a high sun, bright neutral daylight, short shadows and controlled highlights with no blown-out sky'],
    ['asr','عصر','afternoon (Asr): a warm, slightly lower sun, longer directional shadows and rich but natural tones'],
    ['maghrib','مغرب','sunset / golden hour (Maghrib): warm golden-orange sunlight, long shadows and a glowing sky with soft gradients'],
    ['ghasaq','غسق','dusk, the blue hour after sunset: a deep blue-violet sky with a remaining warm glow on the horizon, interior and exterior lights on and balanced with the ambient light'],
    ['night','ليل','night (Isha): a dark sky, the scene lit by its own artificial lighting with warm and cool practical lights, clean blacks and no noise']
  ],
  sun:[
    ['direct','شمس مباشرة','direct sunlight with clearly defined shadows'],
    ['soft','شمس ناعمة','soft, slightly diffused sunlight through a thin haze'],
    ['hidden','بدون شمس ظاهرة','no visible sun in the frame, ambient daylight only']
  ],
  weather:[
    ['clear','صافي','a clear sky'],
    ['fewclouds','غيوم متفرقة','a few scattered soft clouds'],
    ['cloudy','غائم','an overcast sky with soft, almost shadowless light'],
    ['mist','ضباب خفيف','light mist that adds gentle depth and atmosphere'],
    ['dust','غبار خفيف','a light desert haze with fine dust in the air, warm and soft'],
    ['rain','مطر','light rain, with natural damp surfaces (not mirror-like)'],
    ['afterrain','بعد المطر','just after rain: fresh, clean air and slightly damp surfaces with subtle, natural reflections only']
  ],
  light:[
    ['natural','طبيعية','natural, believable light'],
    ['softl','ناعمة','soft, flattering, even light'],
    ['dramatic','درامية','dramatic light with deep, sculpted shadows'],
    ['back','إضاءة خلفية','backlight with a soft rim of light around the subject'],
    ['studiol','استوديو','clean professional studio lighting'],
    ['practical','أضواء المكان','the scene lit mainly by its own practical lights']
  ],
  mood:[
    ['lux','فاخر هادئ','quiet luxury: calm, refined and elegant'],
    ['warm','دافئ وإنساني','warm and human: welcoming, genuine and emotional'],
    ['energy','حماسي','energetic and dynamic, a sense of movement and momentum'],
    ['calm','هادئ وصافي','calm, serene and uncluttered'],
    ['drama','درامي','dramatic and powerful, moody but realistic'],
    ['future','مستقبلي','futuristic and innovative, sleek and modern'],
    ['celebr','احتفالي','festive and celebratory, joyful'],
    ['spirit','روحاني','spiritual, peaceful and respectful, a sense of reverence'],
    ['heritage','تراث حجازي','Hijazi heritage inspired: traditional Jeddah architecture details such as carved wooden roshan windows and coral-stone walls, presented in a modern, refined way']
  ],
  angle:[
    ['eye','مستوى العين','eye-level view'],
    ['low','زاوية منخفضة','low-angle view looking up, giving the subject presence'],
    ['high','زاوية عالية','high-angle view looking down'],
    ['aerial','من فوق (درون)','aerial drone view from above'],
    ['close','قريبة جداً','close-up / macro detail shot'],
    ['wide','واسعة','wide establishing shot that shows the whole environment']
  ],
  lens:[
    ['bokeh','خلفية ضبابية','85mm lens at f/1.8, shallow depth of field with a softly blurred background'],
    ['sharp','كل شي واضح','deep focus at f/8, everything sharp from front to back'],
    ['wideL','عدسة واسعة','24mm wide-angle lens with natural perspective and no distortion']
  ],
  color:[
    ['jed','ألوان مطارات جدة','a palette guided by deep navy (#002657), royal blue (#004EAA) and sky blue (#62B6F3), used naturally in the environment and light, never as logos or graphics'],
    ['warmC','دافئة','a warm, inviting palette'],
    ['coolC','باردة','a cool, crisp palette'],
    ['neutralC','محايدة','neutral, true-to-life colors'],
    ['bw','أبيض وأسود','black and white with rich tonal range'],
    ['vivid','حيوية','vibrant colors that still look natural (not oversaturated)']
  ],
  people:[
    ['none','بدون أشخاص','no people in the image'],
    ['far','أشخاص من بعيد','a few people in the distance, small and not the focus'],
    ['one','شخص رئيسي','one main person as the clear subject'],
    ['travelers','مسافرين','travelers with luggage'],
    ['pilgrims','حجاج ومعتمرين','Hajj and Umrah pilgrims; men in simple white ihram garments, women in modest loose clothing, shown with dignity and respect'],
    ['staff','موظفين','professional airport staff in neat uniforms (no logos on the uniforms)'],
    ['family','عائلة','a family together']
  ],
  space:[
    ['right','يمين','on the right side'],
    ['left','يسار','on the left side'],
    ['top','أعلى','at the top'],
    ['bottom','أسفل','at the bottom']
  ],
  extras:[
    ['ref','عندي صورة مرجعية','Use the attached reference image to guide the style, color and composition (do not copy any logos, text or identifiable faces from it).'],
    ['motion','إحساس بالحركة','Add a subtle sense of motion (gentle motion blur on moving elements only).'],
    ['sym','تكوين متناظر','Use a centered, symmetrical composition.'],
    ['detail','تفاصيل دقيقة','Pay extra attention to fine detail and texture.']
  ]
};
var PHOTO={real:1,cine:1};
var ST=null;
const KEY='jedImg.v1';
function D(){return {idea:'',kind:'real',size:'169',cw:'',ch:'',quality:'high',place:'',time:'',sun:'',weather:'',light:'',mood:'',angle:'',lens:'',color:'jed',people:'',saudi:false,space:'',text:'',avoid:'',extras:[],target:'chatgpt',more:false}}
function load(){ if(ST) return; ST=D(); try{var sv=JSON.parse(localStorage.getItem(KEY)||'null'); if(sv&&sv.st){ ['kind','quality','light','mood','color','target','saudi'].forEach(k=>{ if(sv.st[k]!=null) ST[k]=sv.st[k]; }); }}catch(e){} }
function save(){ try{ var sv=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; sv.st=Object.assign(sv.st||{}, {kind:ST.kind,quality:ST.quality,light:ST.light,mood:ST.mood,color:ST.color,target:ST.target,saudi:ST.saudi}); localStorage.setItem(KEY, JSON.stringify(sv)); }catch(e){} }
function opt(g,k){return (O[g]||[]).filter(function(r){return r[0]===k})[0]}
function en(g,k){var r=opt(g,k);return r?r[2]:''}
function off(g,k){
  if(g==='weather')return ST.place!=='out';
  if(g==='sun')return ST.place!=='out'||/^(fajr|ghasaq|night)$/.test(ST.time);
  if(g==='time')return ST.place==='studio';
  if(g==='lens')return !PHOTO[ST.kind];
  return false;
}
function clean(){ ['weather','sun','time','lens'].forEach(function(g){if(ST[g]&&off(g))ST[g]=''}); if(!ST.people||ST.people==='none')ST.saudi=false; }
function gcd(a,b){return b?gcd(b,a%b):a}
function sizeInfo(){
  var s=opt('size',ST.size);
  if(ST.size==='custom'){
    var w=parseInt(ST.cw,10),h=parseInt(ST.ch,10);
    if(!(w>0&&h>0))return {ok:false,w:16,h:9,ratio:'16:9'};
    var g=gcd(w,h),rw=w/g,rh=h/g,lab;
    if(rw<=32&&rh<=32)lab=rw+':'+rh;else lab=(w>=h?(w/h).toFixed(2).replace(/\.?0+$/,'')+':1':'1:'+(h/w).toFixed(2).replace(/\.?0+$/,''));
    return {ok:true,w:w,h:h,ratio:lab,px:w+'×'+h};
  }
  return {ok:true,w:s[2],h:s[3],ratio:s[4],px:s[5]};
}
function orient(si){return si.w>si.h?'landscape':si.w<si.h?'portrait':'square'}
function isAirport(){return /مطار|طائر|طيار|مدرج|رحل|سفر|مسافر|صال|بوابة|airport|plane|aircraft|flight|runway|terminal/i.test(ST.idea)}
function parts(){
  var P={},si=sizeInfo();
  P.kind=en('kind',ST.kind);
  P.mood=ST.mood?en('mood',ST.mood):'';
  P.place=ST.place?en('place',ST.place):'';
  P.time=ST.time&&!off('time')?en('time',ST.time):'';
  P.sun=ST.sun&&!off('sun')?en('sun',ST.sun):'';
  P.weather=ST.weather&&!off('weather')?en('weather',ST.weather):'';
  P.light=ST.light?en('light',ST.light):'';
  P.angle=ST.angle?en('angle',ST.angle):'';
  P.lens=ST.lens&&!off('lens')?en('lens',ST.lens):'';
  P.color=ST.color?en('color',ST.color):'';
  P.people=ST.people?en('people',ST.people):'';
  if(P.people&&ST.saudi&&ST.people!=='none')P.people+='; people wear Saudi attire where natural (men in white thobe and shemagh or ghutra, women in elegant abaya)';
  P.space=ST.space?'Leave clean, uncluttered empty space '+en('space',ST.space)+' (about a third of the frame) so a headline can be added later in design.':'';
  P.text=ST.text.trim();
  P.extras=(ST.extras||[]).map(function(k){return en('extras',k)}).filter(Boolean);
  P.avoid=ST.avoid.trim();
  P.quality=en('quality',ST.quality);
  P.si=si;
  return P;
}
function rules(P){
  var R=[];
  R.push('No logos, brand names, watermarks or signatures anywhere.');
  if(P.text)R.push('No other text, letters or numbers anywhere except the exact text requested above.');
  else R.push('No text, letters, numbers or signage text anywhere in the image.');
  R.push('Natural, realistic color saturation: no oversaturation, no HDR halos, no artificial glow.');
  R.push('No exaggerated gloss or wet-looking mirror reflections on floors and surfaces.');
  if(ST.people!=='none')R.push('Natural anatomy: correct hands, fingers, faces and proportions, with no distortion.');
  if(isAirport())R.push('If an airport is shown, keep the architecture modern and believable, and do not add a generic airport control tower.');
  if(P.avoid)R.push('Avoid (the user wrote this, may be in Arabic): '+P.avoid);
  return R;
}
function outLine(P){
  var si=P.si;
  var s='Aspect ratio '+si.ratio+' ('+orient(si)+')';
  if(si.px)s+=', intended for '+si.px+(/mm/.test(si.px)?'':' px');
  return s+'.';
}
function build(){
  var P=parts(),t=ST.target,L=[];
  var idea=ST.idea.trim();
  if(t==='chatgpt'){
    L.push('Create an image.');
    L.push('');
    L.push('IDEA (written in Arabic. Understand it precisely and depict it faithfully):');
    L.push(idea);
    L.push('');
    L.push('TYPE: '+cap(P.kind)+'.');
    if(P.mood)L.push('MOOD: '+cap(P.mood)+'.');
    if(P.place)L.push('SETTING: '+cap(P.place)+'.');
    if(P.time)L.push('TIME OF DAY: '+cap(P.time)+'.');
    if(P.sun)L.push('SUN: '+cap(P.sun)+'.');
    if(P.weather)L.push('WEATHER: '+cap(P.weather)+'.');
    if(P.light)L.push('LIGHTING: '+cap(P.light)+'.');
    if(P.angle||P.lens)L.push('CAMERA: '+cap([P.angle,P.lens].filter(Boolean).join(', '))+'.');
    if(P.color)L.push('COLORS: '+cap(P.color)+'.');
    if(P.people)L.push('PEOPLE: '+cap(P.people)+'.');
    if(P.space)L.push('COMPOSITION: '+P.space);
    if(P.text)L.push('TEXT IN THE IMAGE: Show only this exact text, spelled exactly as written'+(/[\u0600-\u06FF]/.test(P.text)?' in correct Arabic script, right-to-left, with properly connected letters':'')+': "'+P.text+'"');
    if(P.extras.length){L.push('ALSO:');P.extras.forEach(function(e){L.push('- '+e)})}
    L.push('');
    L.push('RULES:');
    rules(P).forEach(function(r){L.push('- '+r)});
    L.push('');
    var o='OUTPUT: '+outLine(P)+' '+P.quality;
    if(PHOTO[ST.kind])o+=' It must look like a real photograph, not like an AI-generated image.';
    L.push(o);
    return L.join('\n');
  }
  /* Copilot: one clear descriptive paragraph, then the rules */
  var d=[];
  d.push('Create '+P.kind+'.');
  d.push('The idea, written in Arabic (understand it precisely and depict it faithfully): "'+idea.replace(/\s+/g,' ')+'".');
  var bits=[P.time&&('at '+P.time),P.sun&&('with '+P.sun),P.weather&&('under '+P.weather)].filter(Boolean);
  if(P.place||bits.length)d.push(cap(P.place?P.place+(bits.length?', '+bits.join(', '):''):'The scene is '+bits.join(', '))+'.');
  if(P.light)d.push('Lighting: '+P.light+'.');
  if(P.mood)d.push('Mood: '+P.mood+'.');
  if(P.angle||P.lens)d.push('Camera: '+[P.angle,P.lens].filter(Boolean).join(', ')+'.');
  if(P.color)d.push('Colors: '+P.color+'.');
  if(P.people)d.push('People: '+P.people+'.');
  if(P.space)d.push(P.space);
  if(P.text)d.push('Show only this exact text, spelled exactly as written'+(/[\u0600-\u06FF]/.test(P.text)?' in correct Arabic script, right-to-left':'')+': "'+P.text+'".');
  P.extras.forEach(function(e){d.push(e)});
  d.push(P.quality);
  if(PHOTO[ST.kind])d.push('It must look like a real photograph, not AI-generated.');
  L.push(d.join(' '));
  L.push('');
  L.push('Rules: '+rules(P).join(' '));
  L.push('');
  L.push(outLine(P));
  return L.join('\n');
}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s}


/* ---------- the slide decides the frame and the idea ---------- */
function targetFrame(){
  const sel = PM.Ed.selected();
  if (sel.length === 1 && sel[0].t === 'image') return sel[0];
  const s = PM.ST.deck && PM.ST.deck.slides[PM.ST.cur];
  if (!s) return null;
  return s.objs.filter(o => o.t === 'image' && o.role !== 'tplbg').sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
}
function frameSize(f){
  if (!f) return null;
  const r = f.w / f.h;
  const w = r >= 1 ? 2400 : Math.round(2400 * r), h = r >= 1 ? Math.round(2400 / r) : 2400;
  return { w: Math.round(w / 8) * 8, h: Math.round(h / 8) * 8 };
}
function slideIdea(){
  const s = PM.ST.deck.slides[PM.ST.cur];
  const sp = s.spec;
  const bits = [sp.title, sp.sub].filter(Boolean);
  const t = bits.join(' — ');
  if (!t) return '';
  return (PM.isAr(t) ? 'صورة معبّرة عن: ' : 'An image that expresses: ') + t + (PM.isAr(t) ? '، في مطار الملك عبدالعزيز الدولي بجدة' : ', at King Abdulaziz International Airport, Jeddah');
}
const IG = PM.IG = {};
let lastSlide = null;
IG.mount = function (pane) {
  load();
  const s = PM.ST.deck.slides[PM.ST.cur];
  if (lastSlide !== s.id) { lastSlide = s.id; ST.idea = slideIdea(); const f = frameSize(targetFrame()); if (f) { ST.size = 'custom'; ST.cw = String(f.w); ST.ch = String(f.h); } else ST.size = '169'; }
  render(pane);
};
const ic = n => PM.UI.ic(n);
function chips(g, o){
  o = o || {};
  return '<div class="chips" data-g="'+g+'"'+(o.multi?' data-multi':'')+'>'+O[g].map(function(r){
    var on = o.multi ? (ST[g]||[]).indexOf(r[0])>-1 : ST[g]===r[0];
    var tail = (g==='size'&&r[4]) ? ' <span class="num" style="font-size:10px;opacity:.7">'+r[4]+'</span>' : '';
    return '<button class="chip'+(on?' on':'')+'" data-v="'+r[0]+'"'+(off(g,r[0])?' disabled':'')+'>'+r[1]+tail+'</button>';
  }).join('')+'</div>';
}
function render(pane){
  const y = pane.scrollTop;
  const f = targetFrame();
  const esc = PM.esc;
  pane.innerHTML =
   '<div class="note">اكتب الفكرة واختر من الأزرار، وتطلع لك تعليمات جاهزة (برومت) تلصقها في ChatGPT أو Copilot. بعدها اسحب الصورة اللي تطلع لك هنا أو على الشريحة مباشرة.'+(f?' <b>المقاس مضبوط على إطار الصورة في الشريحة.</b>':'')+'</div>'+
   '<h4>'+ic('lightbulb')+'ايش الصورة اللي في بالك؟</h4><textarea class="inp" id="igIdea" placeholder="مثل: مسافر يمشي في صالة مطار حديثة وقت الفجر ومعه حقيبته">'+esc(ST.idea)+'</textarea>'+
   '<h4>'+ic('image')+'النوع</h4>'+chips('kind')+
   '<details class="ig-sec" open><summary>'+ic('ratio')+'المقاس والجودة</summary><div>'+chips('size')+(ST.size==='custom'?'<div style="display:flex;gap:6px;align-items:center;margin-top:8px"><input class="inp num ltr" id="igW" style="width:90px" value="'+esc(ST.cw)+'"><span>×</span><input class="inp num ltr" id="igH" style="width:90px" value="'+esc(ST.ch)+'"><span style="font-size:12px;color:var(--muted)">px</span></div>':'')+'<div style="margin-top:8px">'+chips('quality')+'</div></div></details>'+
   '<details class="ig-sec" open><summary>'+ic('sun')+'المكان والوقت</summary><div>'+chips('place')+(off('time')?'':'<div style="margin-top:8px">'+chips('time')+'</div>')+(ST.place==='out'?'<div style="margin-top:8px">'+chips('sun')+'</div><div style="margin-top:8px">'+chips('weather')+'</div>':'')+'</div></details>'+
   '<details class="ig-sec"><summary>'+ic('sparkles')+'الإضاءة والإحساس</summary><div>'+chips('light')+'<div style="margin-top:8px">'+chips('mood')+'</div></div></details>'+
   '<details class="ig-sec"><summary>'+ic('sliders-horizontal')+'خيارات أكثر</summary><div><b style="font-size:12px;color:var(--muted)">الزاوية</b>'+chips('angle')+'<b style="font-size:12px;color:var(--muted);display:block;margin-top:8px">الألوان</b>'+chips('color')+'<b style="font-size:12px;color:var(--muted);display:block;margin-top:8px">الأشخاص</b>'+chips('people')+'<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;margin-top:8px"><input type="checkbox" id="igSaudi"'+(ST.saudi?' checked':'')+(!ST.people||ST.people==='none'?' disabled':'')+'>لبس سعودي (ثوب وشماغ، عباية)</label><b style="font-size:12px;color:var(--muted);display:block;margin-top:8px">مساحة فاضية للعنوان</b>'+chips('space')+'<b style="font-size:12px;color:var(--muted);display:block;margin-top:8px">أشياء ما تبيها</b><input class="inp" id="igAvoid" placeholder="مثال: زحمة، سيارات" value="'+esc(ST.avoid)+'"></div></details>'+
   '<h4>'+ic('send')+'التعليمات الجاهزة</h4><div class="chips" data-g="target"><button class="chip'+(ST.target==='chatgpt'?' on':'')+'" data-v="chatgpt">ChatGPT</button><button class="chip'+(ST.target==='copilot'?' on':'')+'" data-v="copilot">Copilot</button></div>'+
   '<div class="ig-out" id="igOut" style="margin-top:8px"></div>'+
   '<div class="row2" style="margin-top:10px"><button class="bigbtn" id="igCopy" style="margin:0">'+ic('copy')+'نسخ</button><a class="bigbtn ghost" id="igOpen" style="margin:0;text-decoration:none" target="_blank" rel="noopener" data-needs-online>'+ic('external-link')+'افتح '+(ST.target==='chatgpt'?'ChatGPT':'Copilot')+'</a></div>'+
   '<h4 style="margin-top:18px">'+ic('download')+'رجّع الصورة للشريحة</h4><label class="dropz" id="igDrop"><input type="file" accept="image/*" hidden>'+ic('image-down')+'<div>اسحب الصورة اللي طلعت لك هنا، أو اضغط لاختيارها'+(f?'<br><span style="font-size:11.5px">تنحط مكان الصورة المحددة في الشريحة</span>':'')+'</div></label>';
  pane.scrollTop = y;
  const out = pane.querySelector('#igOut');
  const upd = () => { out.textContent = ST.idea.trim() ? build() : 'اكتب فكرة الصورة أولاً…'; };
  upd();
  pane.querySelector('#igIdea').oninput = e => { ST.idea = e.target.value; upd(); };
  pane.querySelectorAll('[data-g]').forEach(g => g.onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
    const k = g.dataset.g, v = b.dataset.v;
    if (g.hasAttribute('data-multi')) { const a = (ST[k] || []).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); ST[k] = a; }
    else if (ST[k] === v && !['kind', 'size', 'quality', 'target'].includes(k)) ST[k] = '';
    else ST[k] = v;
    clean(); save(); render(pane);
  });
  const w = pane.querySelector('#igW'), h = pane.querySelector('#igH');
  if (w) { const cu = () => { ST.cw = (w.value.match(/\d+/) || [''])[0]; ST.ch = (h.value.match(/\d+/) || [''])[0]; upd(); }; w.oninput = cu; h.oninput = cu; }
  const sa = pane.querySelector('#igSaudi'); if (sa) sa.onchange = () => { ST.saudi = sa.checked; save(); upd(); };
  const av = pane.querySelector('#igAvoid'); if (av) av.oninput = () => { ST.avoid = av.value; upd(); };
  pane.querySelector('#igCopy').onclick = async () => {
    if (!ST.idea.trim()) { PM.UI.toast('اكتب فكرة الصورة أولاً'); return; }
    const t = build();
    try { await navigator.clipboard.writeText(t); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    PM.UI.toast('نسخت التعليمات ✓ الصقها في ' + (ST.target === 'chatgpt' ? 'ChatGPT' : 'Copilot'));
  };
  pane.querySelector('#igOpen').href = ST.target === 'chatgpt' ? 'https://chatgpt.com/' : 'https://m365.cloud.microsoft/chat';
  const dz = pane.querySelector('#igDrop');
  const take = async file => { if (!file) return; const id = await PM.assetFromFile(file); const fr = targetFrame(); PM.Ed.placeImage(id, { x: 480, y: 270 }, fr); PM.UI.toast('حطيت الصورة في الشريحة ✓'); };
  dz.querySelector('input').onchange = e => take(e.target.files[0]);
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('on'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('on'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('on'); take(e.dataTransfer.files[0]); });
}
})(window.PM);
