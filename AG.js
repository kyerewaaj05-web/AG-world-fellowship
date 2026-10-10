(() => {
  const target = document.getElementById('worldMapSmall');
  if (!target) return;

  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs = {}) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

  const style = document.createElement('style');
  style.textContent = `
    #worldMapSmall{position:relative;overflow:hidden;background:linear-gradient(180deg,#dff8ff 0%,#dfefff 100%);border:1px solid #c7d6d3;border-radius:14px;isolation:isolate;box-shadow:0 18px 50px rgba(28,54,55,.16),inset 0 0 0 1px rgba(255,255,255,.72)}
    #worldMapSmall .owm-svg{display:block;width:100%;height:100%;font-family:Arial,sans-serif}
    #worldMapSmall .owm-graticule{fill:none;stroke:#fff;stroke-width:.8;stroke-dasharray:2 5;opacity:.42;vector-effect:non-scaling-stroke;pointer-events:none}
    #worldMapSmall .owm-country{fill:url(#owm-land);stroke:#fff;stroke-width:.8;stroke-linejoin:round;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill .18s ease,stroke .18s ease,filter .18s ease}
    #worldMapSmall .owm-country:hover,#worldMapSmall .owm-country.selected{fill:#4ab7a2;stroke:#fff;filter:drop-shadow(0 1px 2px rgba(19,54,53,.42))}
    #worldMapSmall .owm-country:focus-visible,#worldMapSmall .owm-dot:focus-visible{outline:none;filter:drop-shadow(0 0 3px #087f83)}
    #worldMapSmall .owm-dot{fill:#ffb25c;stroke:#fff;stroke-width:1.4;cursor:pointer;vector-effect:non-scaling-stroke}
    #worldMapSmall .owm-dot:hover,#worldMapSmall .owm-dot.selected{fill:#ff7a59;stroke-width:2}
    #worldMapSmall .owm-tip{position:absolute;display:none;z-index:5;padding:7px 10px;border:1px solid rgba(255,255,255,.75);border-radius:5px;background:#173b3c;color:#f8ffff;font:600 12px/1.2 Arial,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 5px 18px rgba(15,43,45,.25)}
    @media(prefers-reduced-motion:reduce){#worldMapSmall .owm-country{transition:none}}
  `;
  document.head.appendChild(style);

  async function loadWorldData() {
    if (window.worldMapData) return window.worldMapData;

    const jsonTag = document.getElementById('worldData');
    if (jsonTag && jsonTag.textContent.trim()) {
      return JSON.parse(jsonTag.textContent);
    }

    const response = await fetch('AG.Json');
    if (!response.ok) throw new Error('World map data not found');
    return response.json();
  }

  loadWorldData()
    .then(data => render(data))
    .catch(err => {
      target.innerHTML = '<div style="padding:20px;text-align:center;font:14px Arial;color:#567">World map data could not be loaded.</div>';
      console.error(err);
    });

  function mapCountryColor(name) {
    const seed = Array.from(name || 'country').reduce((total, ch) => total + ch.charCodeAt(0), 0);
    const palette = [18, 42, 92, 150, 195, 225, 260, 305, 340, 120];
    const hue = palette[seed % palette.length];
    const saturation = 68 + (seed % 16);
    const lightness = 52 + ((seed * 5) % 14);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function render(data) {
    target.innerHTML = '';
    const svg = make('svg', {viewBox:data.viewBox || '0 0 1000 500', class:'owm-svg', role:'img', 'aria-label':'Clickable world map'});
    const defs = make('defs');
    const ocean = make('linearGradient', {id:'owm-ocean', x1:'0', y1:'0', x2:'1', y2:'1'});
    ocean.append(make('stop', {offset:'0%', 'stop-color':'#9bd9eb'}), make('stop', {offset:'48%', 'stop-color':'#dff7ff'}), make('stop', {offset:'100%', 'stop-color':'#cfe8ff'}));
    const land = make('linearGradient', {id:'owm-land', x1:'0', y1:'0', x2:'0.9', y2:'1'});
    land.append(make('stop', {offset:'0%', 'stop-color':'#d5f3d1'}), make('stop', {offset:'32%', 'stop-color':'#c6e8b5'}), make('stop', {offset:'100%', 'stop-color':'#a8d7cf'}));
    defs.append(ocean, land);
    svg.append(defs, make('rect', {width:'1000', height:'500', fill:'url(#owm-ocean)'}));
    const graticule = make('g', {class:'owm-graticule', 'aria-hidden':'true'});
    [83, 166, 250, 334, 417].forEach(y => graticule.append(make('path', {d:`M0 ${y} Q500 ${y - 12} 1000 ${y}`})));
    [125, 250, 375, 500, 625, 750, 875].forEach(x => graticule.append(make('path', {d:`M${x} 0 Q${x + (500 - x) * .16} 250 ${x} 500`})));
    svg.append(graticule);
    const tip = document.createElement('div'); tip.className='owm-tip'; target.appendChild(svg); target.appendChild(tip);

    const select = (el, country) => {
      target.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      window.worldMapSelectedCountry = country;
      target.dispatchEvent(new CustomEvent('worldmap:select', {detail:country}));
      if (typeof window.onWorldMapCountryClick === 'function') window.onWorldMapCountryClick(country);
    };

    const showTip = (name, clientX, clientY) => {
      tip.textContent = name;
      const r = target.getBoundingClientRect();
      tip.style.left = Math.max(6, Math.min(clientX-r.left+10, r.width-140))+'px';
      tip.style.top = Math.max(6, clientY-r.top-34)+'px';
      tip.style.display='block';
    };
    const hideTip = () => tip.style.display='none';

    (data.countries || []).forEach(country => {
      let el;
      const countryColor = mapCountryColor(country.n || country.name || 'country');
      if (country.d) {
        el = make('path', {d:country.d, class:'owm-country', 'data-country':country.n});
        el.style.fill = countryColor;
      } else if (country.p) {
        el = make('circle', {cx:country.p[0], cy:country.p[1], r:3.2, class:'owm-dot', 'data-country':country.n});
        el.style.fill = countryColor;
      } else return;

      el.addEventListener('click', e => { e.stopPropagation(); select(el,country); });
      el.addEventListener('pointermove', e => showTip(country.n,e.clientX,e.clientY));
      el.addEventListener('pointerenter', e => showTip(country.n,e.clientX,e.clientY));
      el.addEventListener('pointerleave', hideTip);
      svg.appendChild(el);
    });
  }
})();
