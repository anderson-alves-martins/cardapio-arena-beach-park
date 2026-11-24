(() => {
  'use strict';
  const cfg = window.ARENA_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.SUPABASE_URL || '') && !!cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_ANON_KEY).includes('SUA_CHAVE');
  const db = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const cart = new Map();
  const currency = n => Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const search = document.getElementById('search'), products = [...document.querySelectorAll('.product')], sections = [...document.querySelectorAll('.menu-section')];
  const toast = document.getElementById('toast'); let toastTimer;
  const showToast = msg => { toast.textContent=msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2600); };
  const keyFor = (name,option) => `${name}|${option||''}`;
  const getSelected = el => { const prices=el.dataset.prices.split(',').map(Number), select=el.querySelector('.portion-select'), idx=select?Number(select.value):0, opts=(el.dataset.options||'').split(','); return {name:el.dataset.name,price:prices[idx],option:opts[idx]||'',icon:el.dataset.icon||'•'}; };
  const saved = (()=>{try{return JSON.parse(localStorage.getItem('arena-cart-v2')||'[]')}catch{return []}})();
  saved.forEach(([k,v])=>cart.set(k,v));
  function persist(){try{localStorage.setItem('arena-cart-v2',JSON.stringify([...cart.entries()]))}catch{}}
  function updateCart(){
    const qty=[...cart.values()].reduce((a,x)=>a+x.qty,0), total=[...cart.values()].reduce((a,x)=>a+x.price*x.qty,0);
    ['countTop','countMobile'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=qty});
    document.getElementById('totalMobile').textContent=currency(total); document.getElementById('subtotal').textContent=currency(total); document.getElementById('mobileCart').classList.toggle('visible',qty>0);
    const container=document.getElementById('cartItems');
    if(!qty){container.innerHTML='<div class="cart-empty"><span class="basket">🧺</span><strong>Sua seleção está vazia</strong><p>Use o + nos itens para montar sua lista.</p></div>';persist();return;}
    container.replaceChildren();
    for(const [key,item] of cart){
      const row=document.createElement('div');row.className='cart-row';const info=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent=item.name;const small=document.createElement('small');small.textContent=(item.option?item.option+' · ':'')+currency(item.price)+' cada';
      const controls=document.createElement('div');controls.className='quantity';
      const add=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.action=action;b.dataset.key=key;b.setAttribute('aria-label',label==='Remover'?'Remover '+item.name:label+' '+item.name);controls.append(b)};
      add('−','minus');const count=document.createElement('span');count.textContent=item.qty;add('+','plus');add('Remover','remove');
      info.append(strong,small,controls);const line=document.createElement('span');line.className='line-total';line.textContent=currency(item.price*item.qty);row.append(info,line);container.append(row);
    }
    container.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const item=cart.get(b.dataset.key);if(!item)return;if(b.dataset.action==='plus')item.qty++;if(b.dataset.action==='minus')item.qty--;if(b.dataset.action==='remove'||item.qty<=0)cart.delete(b.dataset.key);updateCart()}));persist();
  }
  function bindProduct(el){const btn=el.querySelector('.add-btn');if(!btn||btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const item=getSelected(el),key=keyFor(item.name,item.option),old=cart.get(key);if(old)old.qty++;else cart.set(key,{...item,qty:1});updateCart();showToast(item.name+' adicionado');});}
  products.forEach(bindProduct);
  const drawer=document.getElementById('cartDrawer'),overlay=document.getElementById('overlay');
  function openCart(){drawer.classList.add('open');overlay.classList.add('open');drawer.setAttribute('aria-hidden','false');overlay.setAttribute('aria-hidden','false');document.getElementById('closeCart').focus()}
  function closeCart(){drawer.classList.remove('open');overlay.classList.remove('open');drawer.setAttribute('aria-hidden','true');overlay.setAttribute('aria-hidden','true')}
  document.getElementById('openCart').addEventListener('click',openCart);document.getElementById('openCartMobile').addEventListener('click',openCart);document.getElementById('closeCart').addEventListener('click',closeCart);overlay.addEventListener('click',closeCart);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
  function orderPayload(){const items=[...cart.values()].map(x=>({name:x.name,option:x.option||null,quantity:x.qty,unit_price:Number(x.price),line_total:Number((x.price*x.qty).toFixed(2))}));return {customer_name:document.getElementById('customerName').value.trim(),location_label:document.getElementById('customerPlace').value.trim(),items,total:Number(items.reduce((a,x)=>a+x.line_total,0).toFixed(2))}}
  function orderText(o,number){return `Olá! Quero fazer um pedido na Arena Beach Park.\nNome: ${o.customer_name||'Não informado'}\nMesa/quadra: ${o.location_label||'Não informado'}\n\n${o.items.map(x=>`• ${x.quantity}x ${x.name}${x.option?' ('+x.option+')':''} — ${currency(x.line_total)}`).join('\n')}\n\nTotal: ${currency(o.total)}${number?'\nPedido: '+number:''}`}
  async function submitOrder(){
    if(!cart.size){showToast('Adicione produtos antes de enviar');return}
    const o=orderPayload(); if(!o.customer_name){document.getElementById('customerName').focus();showToast('Informe seu nome para identificar o pedido');return}
    let orderId=null;
    if(db){
      const {data,error}=await db.from('orders').insert({customer_name:o.customer_name,location_label:o.location_label||null,items:o.items,total:o.total,status:'received',source:'menu'}).select('id,order_number').single();
      if(error){console.error(error);showToast('Não foi possível registrar no sistema. Confira a conexão.');return} orderId=data.order_number||data.id;
    }
    const number=String(cfg.WHATSAPP_NUMBER||'').replace(/\D/g,'');
    if(number.length<12){showToast(db?'Pedido registrado, mas falta configurar o WhatsApp.':'Configure o número do WhatsApp e o Supabase para ativar os pedidos.');return}
    const url=`https://wa.me/${number}?text=${encodeURIComponent(orderText(o,orderId))}`;
    window.open(url,'_blank','noopener,noreferrer');
    document.getElementById('orderStatus').textContent=db?'Pedido registrado. Confirme o envio da mensagem no WhatsApp.':'WhatsApp aberto. O pedido ainda não foi registrado no painel porque o Supabase não está configurado.';
    if(db){cart.clear();updateCart();}
  }
  document.getElementById('sendOrder').addEventListener('click',submitOrder);
  document.getElementById('copyOrder').addEventListener('click',async()=>{if(!cart.size){showToast('Adicione algum item primeiro');return}const o=orderPayload(),text=orderText(o);try{await navigator.clipboard.writeText(text);showToast('Pedido copiado')}catch{showToast('Não foi possível copiar neste navegador')}});
  function normalize(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
  function filterItems(){const term=normalize(search.value.trim());let n=0;products.forEach(p=>{const hit=normalize(p.dataset.name+' '+p.closest('.menu-section').dataset.category).includes(term);p.hidden=!hit;if(hit)n++});sections.forEach(s=>s.hidden=!s.querySelector('.product:not([hidden])'));document.getElementById('resultCount').textContent=`${n} ${n===1?'item':'itens'}`;document.getElementById('emptySearch').style.display=n?'none':'block'}
  search.addEventListener('input',filterItems);
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)document.querySelectorAll('.category-nav a,.mobile-cats a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id))}),{rootMargin:'-25% 0px -65% 0px'});sections.forEach(s=>observer.observe(s));
  document.querySelectorAll('.category-nav a,.mobile-cats a').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(!target)return;e.preventDefault();if(search.value){search.value='';filterItems()}history.pushState(null,'',a.getAttribute('href'));document.querySelectorAll('.category-nav a,.mobile-cats a').forEach(x=>x.classList.toggle('active',x.getAttribute('href')===a.getAttribute('href')));requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}))}));
  // Supabase product sync: update prices and availability when configured; static HTML remains fallback.
  async function syncProducts(){if(!db)return;const {data,error}=await db.from('products').select('*').order('sort_order');if(error){console.warn('Supabase products:',error.message);return}if(!data?.length)return;const existing=new Map([...document.querySelectorAll('.product')].map(el=>[el.dataset.name,el]));for(const p of data){let el=existing.get(p.name);if(!el&&p.active){const section=sections.find(x=>x.dataset.category===p.category);if(!section)continue;el=document.createElement('article');el.className='product';el.dataset.name=p.name;el.dataset.icon=p.icon||'•';const icon=document.createElement('span');icon.className='food-icon';icon.textContent=p.icon||'•';icon.setAttribute('aria-hidden','true');const info=document.createElement('div');info.className='product-info';const title=document.createElement('h4');title.className='product-name';title.textContent=p.name;info.append(title);const action=document.createElement('div');action.className='product-action';el.append(icon,info,action);section.querySelector('.product-list').append(el);products.push(el);existing.set(p.name,el)}if(!el)continue;el.hidden=!p.active;el.dataset.prices=(p.prices||[]).join(',');el.dataset.options=(p.options||[]).join(',');el.dataset.icon=p.icon||'•';const action=el.querySelector('.product-action');let price=el.querySelector('.price'),stack=el.querySelector('.price-stack');if(p.prices.length>1){if(!stack){stack=document.createElement('span');stack.className='price-stack';price?.replaceWith(stack)}stack.replaceChildren(...p.prices.map((v,i)=>{const line=document.createElement('span'),b=document.createElement('b');line.textContent=(p.options?.[i]||'Opção')+' ';b.textContent=currency(v);line.append(b);return line}))}else{if(stack){price=document.createElement('span');price.className='price';stack.replaceWith(price)}if(!price){price=document.createElement('span');price.className='price';action.prepend(price)}price.textContent=currency(p.prices[0])}let select=el.querySelector('.portion-select');if(p.prices.length>1){if(!select){select=document.createElement('select');select.className='portion-select';select.setAttribute('aria-label','Opção de '+p.name);action.append(select)}select.replaceChildren(...(p.options||[]).map((o,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=o;return opt}))}else select?.remove();if(!el.querySelector('.add-btn')){const btn=document.createElement('button');btn.className='add-btn';btn.type='button';btn.textContent='+';btn.setAttribute('aria-label','Adicionar '+p.name);action.append(btn)}bindProduct(el)}sections.forEach(section=>{const count=[...section.querySelectorAll('.product')].filter(x=>!x.hidden).length;const kicker=section.querySelector('.section-kicker');if(kicker)kicker.textContent=count+' opções';});filterItems()}
  updateCart();syncProducts();if(db){db.channel('public-menu-products').on('postgres_changes',{event:'*',schema:'public',table:'products'},syncProducts).subscribe();}
  if(!db){document.getElementById('orderStatus').textContent='Modo catálogo: configure config.js e o banco Supabase para registrar pedidos e sincronizar produtos. O WhatsApp também depende do número configurado.'}
})();
