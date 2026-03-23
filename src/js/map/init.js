/**
 * src/js/map/init.js
 * initMap — D3 SVG creation, TopoJSON loading, country path rendering,
 * synthetic markers for microstates, continent/ocean labels, zoom behavior.
 *
 * Call initMapModule(ctx) then initMap() inside _boot() after data loads.
 *
 * ctx shape:
 *   getD()           → D object
 *   getFL()          → FL object
 *   getFAM()         → FAM array
 *   getNAMES()       → NAMES object
 *   getCONT_MAP()    → CONT_MAP object
 *   getCONT_COL()    → CONT_COL object
 *   getLEGENDARY()   → LEGENDARY array
 *   getISO()         → ISO object
 *   getHAS()         → HAS Set
 *   showCard(iso)    → void
 *   showOceanCard(id)→ void
 *   swipeCard(dir)   → void
 *   initProfiles()   → void
 */

/* global d3, topojson */

import { sTip, mTip, hTip } from '../ui/tooltip.js';
import { onClick }          from './interactions.js';
import { placeMarkers }     from './render.js';

let _ctx;
let proj; // D3 projection — set during initMap, used by nothing outside this module

export function initMapModule(ctx) {
  _ctx = ctx;
}

// Auto-detect continent from geographic centroid
function getContFromCentroid(feature) {
  try {
    const c   = d3.geoCentroid(feature);
    const lon = c[0], lat = c[1];
    if (lat < -60) return 'AN'; // Antarctica
    if (lat < -10 && lon > 110) return 'OC';  // Oceania
    if (lat < -10 && lon < -30) return 'SA';  // South America
    // Europe: generous bounds covering Balkans, Mediterranean, Scandinavia
    if (lat > 35 && lat < 72 && lon > -25 && lon < 45) return 'EU';
    // Iceland, UK, Ireland
    if (lat > 50 && lon > -25 && lon < 2) return 'EU';
    // North America
    if (lon > -170 && lon < -30 && lat > 5) return 'NA';
    // South America
    if (lon > -90 && lon < -30 && lat <= 5 && lat > -60) return 'SA';
    // Middle East / West Asia
    if (lon > 25 && lon < 75 && lat > 10 && lat < 45) return 'AS';
    // East/Southeast/Central Asia
    if (lon >= 60 && lat > -10) return 'AS';
    // Africa
    if (lon >= -20 && lon < 55 && lat >= -40 && lat < 35) return 'AF';
    // Oceania Pacific
    if (lon > 100 && lat < 0) return 'OC';
    return 'AF'; // Default fallback
  } catch (e) { return 'AF'; }
}

function getDailyCountry() {
  const D       = _ctx.getD();
  const allISOs = Object.keys(D);
  const today   = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  return allISOs[dayOfYear % allISOs.length];
}

export async function initMap() {
  const D        = _ctx.getD();
  const FL       = _ctx.getFL();
  const FAM      = _ctx.getFAM();
  const NAMES    = _ctx.getNAMES();
  const CONT_MAP = _ctx.getCONT_MAP();
  const CONT_COL = _ctx.getCONT_COL();
  const LEGENDARY = _ctx.getLEGENDARY();
  const ISO      = _ctx.getISO();
  const HAS      = _ctx.getHAS();

  const w = window.innerWidth, h = window.innerHeight;
  const svg = d3.select('#mapSvg').attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid slice');
  const defs = svg.append('defs');

  // Ocean gradient
  const og = defs.append('radialGradient').attr('id', 'oG').attr('cx', '42%').attr('cy', '38%').attr('r', '65%');
  og.append('stop').attr('offset', '0%').attr('stop-color', '#5DB8E0');
  og.append('stop').attr('offset', '40%').attr('stop-color', '#4199C2');
  og.append('stop').attr('offset', '100%').attr('stop-color', '#1E5A80');
  svg.append('rect').attr('width', w).attr('height', h).attr('fill', 'url(#oG)');

  // Waves
  const wp = defs.append('pattern').attr('id', 'wv').attr('width', 200).attr('height', 20).attr('patternUnits', 'userSpaceOnUse');
  wp.append('path').attr('d', 'M0 10 Q50 2 100 10 Q150 18 200 10').attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.03)').attr('stroke-width', 1.5);
  svg.append('rect').attr('width', w).attr('height', h).attr('fill', 'url(#wv)');

  // Filters
  const filt = defs.append('filter').attr('id', 'lS').attr('x', '-5%').attr('y', '-5%').attr('width', '110%').attr('height', '110%');
  filt.append('feGaussianBlur').attr('stdDeviation', '2.5');

  const glow = defs.append('filter').attr('id', 'cGlow').attr('x', '-15%').attr('y', '-15%').attr('width', '130%').attr('height', '130%');
  glow.append('feGaussianBlur').attr('stdDeviation', '1').attr('result', 'blur');
  glow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

  const fglow = defs.append('filter').attr('id', 'fGlow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
  fglow.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
  fglow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

  proj = d3.geoEqualEarth().fitSize([w * 0.98, h * 0.96], { type: 'Sphere' }).translate([w / 2, h / 2 - 8]);
  const path = d3.geoPath().projection(proj);

  svg.append('path').datum(d3.geoGraticule().step([30, 30])()).attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 0.5).attr('d', path);

  try {
    const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    if (!resp.ok) throw new Error('Map data failed to load');
    const world     = await resp.json();
    const countries = topojson.feature(world, world.objects.countries);
    const noAnt     = countries.features;

    svg.append('g').selectAll('path').data(noAnt).enter().append('path')
      .attr('d', path).attr('fill', 'none').attr('transform', 'translate(0,0)');

    svg.selectAll('.country').data(noAnt).enter().append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('data-a', d => ISO[d.id] || '')
      .each(function(d) {
        const a   = ISO[d.id] || '', has = HAS.has(a), iF = FAM.includes(a);
        let cont  = CONT_MAP[a] || '';
        if (!cont) cont = getContFromCentroid(d);
        const cc  = CONT_COL[cont];
        const fill = cc ? cc.bright : '#52A652';
        const el  = d3.select(this);
        if (iF) {
          el.attr('fill', fill).attr('stroke', 'rgba(255,255,255,0.45)').attr('stroke-width', 1.2);
        } else {
          el.attr('fill', fill).attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.5);
        }
        el.style('cursor', (has || (NAMES[a] || CONT_MAP[a])) ? 'pointer' : 'default')
          .style('transition', 'fill 0.3s, stroke-width 0.3s');
      })
      .on('click', function(ev, d) {
        if (ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents) return;
        onClick(ev, d, this);
      })
      .on('mouseenter', function(ev, d) {
        const a = ISO[d.id] || '', dd = D[a];
        let tipName = dd ? dd.n : (NAMES[a] || '');
        if (a === 'FRA' && ev.clientX < window.innerWidth * 0.45 && ev.clientY > window.innerHeight * 0.4) tipName = 'French Guiana';
        if (tipName) {
          const isFam = FAM.includes(a);
          const tf = dd && dd.fc && FL[dd.fc] ? '<img src="' + FL[dd.fc] + '" style="width:18px;height:auto;border-radius:1px;vertical-align:middle;margin-right:4px">' : '';
          sTip(ev, isFam ? '<img src="/assets/ui-heart-xs.png" alt="heart" style="width:24px;height:24px;vertical-align:middle"> ' + tipName : tf + tipName);
          d3.select(this).attr('stroke-width', 0.8).attr('stroke', 'rgba(255,255,255,0.3)').style('filter', 'brightness(1.1)').style('cursor', 'pointer');
        }
      })
      .on('touchstart', function(ev) {
        this.classList.add('country-touched');
        this._touchX    = ev.touches[0].clientX;
        this._touchY    = ev.touches[0].clientY;
        this._touchTime = Date.now();
      }, { passive: true })
      .on('touchend', function(ev, d) {
        var el = this;
        el.classList.remove('country-touched');
        var dx = Math.abs(ev.changedTouches[0].clientX - (el._touchX || 0));
        var dy = Math.abs(ev.changedTouches[0].clientY - (el._touchY || 0));
        var dt = Date.now() - (el._touchTime || 0);
        if (dx < 15 && dy < 15 && dt < 400) {
          el.classList.add('country-touched');
          setTimeout(function() { el.classList.remove('country-touched'); }, 200);
          onClick(ev, d, el);
        }
      }, { passive: true })
      .on('mousemove', function(ev) { mTip(ev); })
      .on('mouseleave', function(ev, d) {
        hTip();
        const a      = ISO[d.id] || '';
        const isFam2 = FAM.includes(a);
        d3.select(this)
          .attr('stroke',       isFam2 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)')
          .attr('stroke-width', isFam2 ? 1.2 : 0.5)
          .style('transform', 'scale(1)').style('filter', 'none');
      });

    svg.append('path')
      .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
      .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-width', 0.3).attr('d', path);

    // Expanded tap targets for small countries (Caribbean, Balkans, Pacific islands)
    var MIN_TAP_R        = 14;
    var AREA_THRESHOLD   = 800;
    document.querySelectorAll('.country').forEach(function(el) {
      try {
        var bbox = el.getBBox();
        var area = bbox.width * bbox.height;
        if (area < AREA_THRESHOLD && area > 0) {
          var cx    = bbox.x + bbox.width / 2;
          var cy    = bbox.y + bbox.height / 2;
          var r     = Math.max(MIN_TAP_R, Math.max(bbox.width, bbox.height) / 2 + 4);
          var datum = d3.select(el).datum();
          var a     = el.getAttribute('data-a') || '';
          var circle = svg.append('circle')
            .attr('cx', cx).attr('cy', cy).attr('r', r)
            .attr('fill', 'transparent')
            .attr('class', 'tap-expand')
            .attr('data-a', a)
            .style('cursor', 'pointer')
            .datum(datum);
          circle.on('click', function(ev) {
            if (ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents) return;
            onClick(ev, datum, el);
          });
          circle.on('touchstart', function(ev) {
            el.classList.add('country-touched');
            el._touchX    = ev.touches[0].clientX;
            el._touchY    = ev.touches[0].clientY;
            el._touchTime = Date.now();
          }, { passive: true });
          circle.on('touchend', function(ev) {
            el.classList.remove('country-touched');
            var dx = Math.abs(ev.changedTouches[0].clientX - (el._touchX || 0));
            var dy = Math.abs(ev.changedTouches[0].clientY - (el._touchY || 0));
            var dt = Date.now() - (el._touchTime || 0);
            if (dx < 15 && dy < 15 && dt < 400) {
              el.classList.add('country-touched');
              setTimeout(function() { el.classList.remove('country-touched'); }, 200);
              onClick(ev, datum, el);
            }
          }, { passive: true });
          circle.on('mouseenter', function(ev) {
            var dd      = D[a];
            var tipName = dd ? dd.n : (NAMES[a] || '');
            if (tipName) {
              var isFam = FAM.includes(a);
              var tf    = dd && dd.fc && FL[dd.fc] ? '<img src="' + FL[dd.fc] + '" style="width:18px;height:auto;border-radius:1px;vertical-align:middle;margin-right:4px">' : '';
              sTip(ev, isFam ? '<img src="/assets/ui-heart-xs.png" alt="heart" style="width:24px;height:24px;vertical-align:middle"> ' + tipName : tf + tipName);
              d3.select(el).attr('stroke-width', 0.8).attr('stroke', 'rgba(255,255,255,0.3)').style('filter', 'brightness(1.1)');
            }
          });
          circle.on('mousemove', function(ev) { mTip(ev); });
          circle.on('mouseleave', function() {
            hTip();
            var isFam = FAM.includes(a);
            d3.select(el)
              .attr('stroke',       isFam ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)')
              .attr('stroke-width', isFam ? 1.2 : 0.5)
              .style('filter', 'none');
          });
        }
      } catch (e) { /* skip */ }
    });

    // Synthetic markers for countries without SVG paths in 110m data
    // (European microstates, some islands, Kosovo, etc.)
    var SYNTH_COORDS = {
      'AND': [1.52, 42.51], 'VAT': [12.45, 41.90], 'MCO': [7.42, 43.73],
      'LIE': [9.55, 47.16], 'SMR': [12.46, 43.94], 'MLT': [14.5, 35.9],
      'LUX': [6.13, 49.61], 'XKX': [20.9, 42.6],   'SGP': [103.8, 1.35],
      'BHR': [50.55, 26.07],'COM': [44.25, -12.17], 'MUS': [57.55, -20.35],
      'SYC': [55.45, -4.68],'MDV': [73.22, 3.2],    'STP': [6.61, 0.19],
      'CPV': [-23.62, 14.93],'BRN': [114.95, 4.94], 'TLS': [125.73, -8.87],
      'PSE': [35.23, 31.95],'HKG': [114.17, 22.32], 'CYN': [33.4, 35.25],
      'KNA': [-62.78, 17.36],'LCA': [-60.97, 13.91],'VCT': [-61.2, 13.25],
      'DMA': [-61.37, 15.41],'GRD': [-61.68, 12.12],'ATG': [-61.8, 17.06],
      'BRB': [-59.54, 13.19],'WSM': [-171.76, -13.76],
      'PLW': [134.58, 7.51], 'MHL': [171.18, 7.09], 'FSM': [158.22, 6.89],
      'NRU': [166.93, -0.52],'KIR': [173.02, 1.42], 'TUV': [179.2, -8.52],
      'TON': [-175.2, -21.18],'SLB': [160.16, -9.43],'VUT': [168.32, -17.73],
    };

    var mappedISOs = new Set();
    document.querySelectorAll('.country').forEach(function(el) {
      var a = el.getAttribute('data-a');
      if (a) mappedISOs.add(a);
    });
    var synthG = svg.append('g').attr('class', 'synth-markers');

    // Pass 1 — collect projected positions (ox/oy = true geographic origin)
    var synthPts = [];
    Object.keys(D).forEach(function(iso) {
      if (mappedISOs.has(iso)) return;
      var coords = SYNTH_COORDS[iso];
      if (!coords) return;
      var p = proj(coords);
      if (!p) return;
      synthPts.push({ iso: iso, x: p[0], y: p[1], ox: p[0], oy: p[1], dd: D[iso] });
    });

    // Force-repel — nudge overlapping markers apart (min 10px separation)
    var _minD = 10;
    for (var _it = 0; _it < 8; _it++) {
      for (var _i = 0; _i < synthPts.length; _i++) {
        for (var _j = _i + 1; _j < synthPts.length; _j++) {
          var _dx = synthPts[_j].x - synthPts[_i].x;
          var _dy = synthPts[_j].y - synthPts[_i].y;
          var _d  = Math.sqrt(_dx * _dx + _dy * _dy);
          if (_d < _minD && _d > 0.001) {
            var _push = (_minD - _d) / 2;
            var _nx   = _dx / _d, _ny = _dy / _d;
            synthPts[_i].x -= _nx * _push; synthPts[_i].y -= _ny * _push;
            synthPts[_j].x += _nx * _push; synthPts[_j].y += _ny * _push;
          }
        }
      }
    }

    // Clamp each marker to ≤6px from its true projected position.
    // Prevents force-repel from displacing island dots into neighbouring
    // country polygons (e.g. Grenada drifting into Venezuela's territory).
    var _maxDrift = 6;
    synthPts.forEach(function(pt) {
      var cdx = pt.x - pt.ox, cdy = pt.y - pt.oy;
      var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist > _maxDrift) {
        var sc = _maxDrift / cdist;
        pt.x = pt.ox + cdx * sc;
        pt.y = pt.oy + cdy * sc;
      }
    });

    // Pass 2 — render at settled positions
    synthPts.forEach(function(pt) {
      var iso   = pt.iso, dd = pt.dd;
      var isFam = FAM.includes(iso);
      var cont  = CONT_MAP[iso] || '';
      var cc    = CONT_COL[cont];
      var fillColor = cc ? cc.bright : 'rgba(180,180,180,0.6)';
      if (!dd.fc) console.warn('[Atlas] synth marker missing fc:', iso);
      else if (!FL[dd.fc]) console.warn('[Atlas] synth marker flag not in FL:', iso, 'fc=' + dd.fc);

      var circle = synthG.append('circle')
        .attr('cx', pt.x).attr('cy', pt.y).attr('r', 4)
        .attr('fill', fillColor).attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 0.5)
        .attr('class', 'synth-dot').attr('data-a', iso);

      var tapCircle = synthG.append('circle')
        .attr('cx', pt.x).attr('cy', pt.y).attr('r', 16)
        .attr('fill', 'transparent').attr('class', 'synth-tap')
        .attr('data-a', iso).style('cursor', 'pointer');

      var fakeDatum = { id: iso, properties: { name: dd.n } };
      var tapNode   = tapCircle.node();
      tapCircle.on('click', function(ev) {
        if (ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents) return;
        onClick(ev, fakeDatum, tapNode);
      });
      tapCircle.on('touchstart', function(ev) {
        tapNode._touchX    = ev.touches[0].clientX;
        tapNode._touchY    = ev.touches[0].clientY;
        tapNode._touchTime = Date.now();
      }, { passive: true });
      tapCircle.on('touchend', function(ev) {
        var dx = Math.abs(ev.changedTouches[0].clientX - (tapNode._touchX || 0));
        var dy = Math.abs(ev.changedTouches[0].clientY - (tapNode._touchY || 0));
        var dt = Date.now() - (tapNode._touchTime || 0);
        if (dx < 15 && dy < 15 && dt < 400) onClick(ev, fakeDatum, tapNode);
      }, { passive: true });
      tapCircle.on('mouseenter', function(ev) {
        circle.classed('hovered', true);
        var tf = dd.fc && FL[dd.fc] ? '<img src="' + FL[dd.fc] + '" style="width:18px;height:auto;border-radius:1px;vertical-align:middle;margin-right:4px">' : '';
        sTip(ev, isFam ? '<img src="/assets/ui-heart-xs.png" alt="heart" style="width:24px;height:24px;vertical-align:middle"> ' + dd.n : tf + dd.n);
      });
      tapCircle.on('mousemove', function(ev) { mTip(ev); });
      tapCircle.on('mouseleave', function() { circle.classed('hovered', false); hTip(); });
    });

    // ── French Guiana overlay ────────────────────────────────────────────────
    // GUF (ISO 254) has no separate feature in world-atlas 110m — it is one
    // polygon inside France's (ISO 250) MultiPolygon and inherits EU/red color.
    // Rendering it as a separate SA-colored path (appended last = topmost in
    // z-order) also overrides the Barbados synth tap circle that was intercepting
    // hover/click events in that area.
    (function() {
      var franceFeature = noAnt.find(function(f) { return f.id === '250'; });
      if (!franceFeature || franceFeature.geometry.type !== 'MultiPolygon') return;
      var saCC  = CONT_COL['SA'];
      var gufDD = D['GUF'];
      if (!gufDD) return;
      franceFeature.geometry.coordinates.forEach(function(rings) {
        var pts = rings[0];
        if (!pts || !pts.length) return;
        var lon = pts.reduce(function(s, p) { return s + p[0]; }, 0) / pts.length;
        var lat = pts.reduce(function(s, p) { return s + p[1]; }, 0) / pts.length;
        // French Guiana centroid is ~[-53°, 4°]; metropolitan France ~[2°, 46°];
        // other overseas territories have lat > 10, so this box is unambiguous.
        if (lon > -65 && lon < -45 && lat > -2 && lat < 10) {
          var gufFill    = saCC ? saCC.bright : '#C85E82';
          var gufStroke  = 'rgba(255,255,255,0.15)';
          var gufFeature = { type: 'Feature', id: 'GUF', geometry: { type: 'Polygon', coordinates: rings } };
          var gufEl = svg.append('path')
            .datum(gufFeature)
            .attr('class', 'country')
            .attr('data-a', 'GUF')
            .attr('d', path)
            .attr('fill', gufFill)
            .attr('stroke', gufStroke)
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .style('transition', 'fill 0.3s, stroke-width 0.3s');
          gufEl
            .on('click', function(ev) {
              if (ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents) return;
              onClick(ev, { id: 'GUF' }, gufEl.node());
            })
            .on('touchstart', function(ev) {
              var n = gufEl.node();
              n._touchX    = ev.touches[0].clientX;
              n._touchY    = ev.touches[0].clientY;
              n._touchTime = Date.now();
            }, { passive: true })
            .on('touchend', function(ev) {
              var n  = gufEl.node();
              var dx = Math.abs(ev.changedTouches[0].clientX - (n._touchX || 0));
              var dy = Math.abs(ev.changedTouches[0].clientY - (n._touchY || 0));
              var dt = Date.now() - (n._touchTime || 0);
              if (dx < 15 && dy < 15 && dt < 400) onClick(ev, { id: 'GUF' }, n);
            }, { passive: true })
            .on('mouseenter', function(ev) {
              var isFamGuf = FAM.includes('GUF');
              var tf = gufDD.fc && FL[gufDD.fc] ? '<img src="' + FL[gufDD.fc] + '" style="width:18px;height:auto;border-radius:1px;vertical-align:middle;margin-right:4px">' : '';
              sTip(ev, isFamGuf ? '<img src="/assets/ui-heart-xs.png" alt="heart" style="width:24px;height:24px;vertical-align:middle"> ' + gufDD.n : tf + gufDD.n);
              d3.select(this).attr('stroke-width', 0.8).attr('stroke', 'rgba(255,255,255,0.3)').style('filter', 'brightness(1.1)').style('cursor', 'pointer');
            })
            .on('mousemove', function(ev) { mTip(ev); })
            .on('mouseleave', function() {
              hTip();
              var isFamGuf2 = FAM.includes('GUF');
              d3.select(this)
                .attr('stroke',       isFamGuf2 ? 'rgba(255,255,255,0.45)' : gufStroke)
                .attr('stroke-width', isFamGuf2 ? 1.2 : 0.5)
                .style('filter', 'none');
            });
        }
      });
    })();

    // Continent labels — positioned from geographic coordinates via projection
    const contLabelG      = svg.append('g').attr('class', 'continent-labels');
    const CONT_LABEL_SIZE = 11;
    const CLBL = {
      'NORTH AMERICA': 'rgba(90,48,15,0.55)',
      'SOUTH AMERICA': 'rgba(80,24,40,0.55)',
      'EUROPE':        'rgba(70,20,20,0.55)',
      'AFRICA':        'rgba(18,55,22,0.55)',
      'ASIA':          'rgba(85,70,15,0.55)',
      'OCEANIA':       'rgba(15,60,60,0.55)',
      'ANTARCTICA':    'rgba(50,80,110,0.7)',
    };
    [
      { n: 'NORTH AMERICA', lon: -100, lat: 45  },
      { n: 'SOUTH AMERICA', lon: -58,  lat: -15 },
      { n: 'EUROPE',        lon: 15,   lat: 52  },
      { n: 'AFRICA',        lon: 20,   lat: 5   },
      { n: 'ASIA',          lon: 80,   lat: 45  },
      { n: 'OCEANIA',       lon: 150,  lat: -22 },
      { n: 'ANTARCTICA',    lon: 0,    lat: -82 },
    ].forEach(function(c) {
      var p = proj([c.lon, c.lat]);
      if (!p) return;
      contLabelG.append('text').attr('x', p[0]).attr('y', p[1])
        .attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', CONT_LABEL_SIZE).attr('font-weight', '700')
        .attr('fill', CLBL[c.n] || 'rgba(255,255,255,0.22)')
        .attr('letter-spacing', '2.5px')
        .attr('text-anchor', 'middle')
        .text(c.n);
    });

    // Ocean labels — all 5 oceans, tappable
    [
      { n: 'ATLANTIC', n2: 'OCEAN', lon: -40,  lat: 20,  op: 0.18, id: 'atlantic' },
      { n: 'PACIFIC',  n2: 'OCEAN', lon: -130, lat: -30, op: 0.18, id: 'pacific'  },
      { n: 'INDIAN',   n2: 'OCEAN', lon: 75,   lat: -25, op: 0.15, id: 'indian'   },
      { n: 'SOUTHERN', n2: 'OCEAN', lon: 0,    lat: -58, op: 0.15, id: 'southern' },
      { n: 'ARCTIC',   n2: 'OCEAN', lon: 0,    lat: 72,  op: 0.15, id: 'arctic'   },
    ].forEach(function(c) {
      var p = proj([c.lon, c.lat]);
      if (!p) return;
      var g = svg.append('g').attr('class', 'ocean-label').style('cursor', 'pointer')
        .on('click', function() { _ctx.showOceanCard(c.id); });
      g.append('text').attr('x', p[0]).attr('y', p[1])
        .attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', 9).attr('font-weight', '500').attr('font-style', 'italic')
        .attr('fill', 'rgba(255,255,255,' + c.op + ')')
        .attr('letter-spacing', '2px').attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(c.n);
      g.append('text').attr('x', p[0]).attr('y', p[1] + 12)
        .attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', 9).attr('font-weight', '500').attr('font-style', 'italic')
        .attr('fill', 'rgba(255,255,255,' + c.op + ')')
        .attr('letter-spacing', '2px').attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(c.n2);
      g.append('rect')
        .attr('x', p[0] - 50).attr('y', p[1] - 12).attr('width', 100).attr('height', 30)
        .attr('fill', 'transparent').style('cursor', 'pointer');
    });

    // Move labels ON TOP of countries (SVG z-order = append order)
    svg.selectAll('text').each(function() { svg.node().appendChild(this); });

    // Golden glow on legendary countries
    document.querySelectorAll('.country').forEach(el => {
      const a = el.getAttribute('data-a');
      if (LEGENDARY.includes(a)) {
        el.style.filter = 'drop-shadow(0 0 3px rgba(212,176,68,0.2))';
      }
    });

    setTimeout(placeMarkers, 200);
    document.getElementById('ldr').classList.add('go');
    if (window._setupFlowCheck) window._setupFlowCheck();

    // Daily featured country
    const dailyISO = getDailyCountry();
    const dailyD   = D[dailyISO];
    if (dailyD && !sessionStorage.getItem('dailyShown')) {
      sessionStorage.setItem('dailyShown', '1');
      setTimeout(() => {
        const flag = FL[dailyD.fc] ? '<img src="' + FL[dailyD.fc] + '" style="width:20px;height:auto;border-radius:2px;vertical-align:middle;margin-right:6px">' : '';
        const note = document.createElement('div');
        note.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(12,20,35,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-md);padding:10px 18px;font-family:Inter,system-ui,sans-serif;color:white;font-size:12px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-md);white-space:nowrap';
        note.innerHTML = '🌟 Today: ' + flag + dailyD.n + ' <span style="color:rgba(255,255,255,0.3);margin-left:8px">tap to explore</span>';
        note.onclick = () => { _ctx.showCard(dailyISO); note.remove(); };
        document.body.appendChild(note);
        setTimeout(() => { if (note.parentNode) note.style.opacity = '0'; setTimeout(() => { if (note.parentNode) note.remove(); }, 500); }, 8000);
      }, 2000);
    }

    // D3 zoom — apply transform to viewBox manipulation
    const zoomG = svg.insert('g', ':first-child').attr('id', 'mapGroup');
    void zoomG; // created for potential future use

    let currentTransform = d3.zoomIdentity;
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [window.innerWidth, window.innerHeight]])
      .filter(event => {
        if (event.type === 'wheel' || event.touches?.length >= 2 || event.type === 'dblclick') return true;
        if (currentTransform.k > 1.05) {
          if (event.type === 'mousedown' || (event.type === 'touchstart' && event.touches?.length === 1)) return true;
        }
        return false;
      })
      .on('zoom', (event) => {
        currentTransform = event.transform;
        const w2 = window.innerWidth, h2 = window.innerHeight;
        let newX = -event.transform.x / event.transform.k;
        let newY = -event.transform.y / event.transform.k;
        const newW = w2 / event.transform.k;
        const newH = h2 / event.transform.k;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + newW > w2) newX = w2 - newW;
        if (newY + newH > h2) newY = h2 - newH;
        svg.attr('viewBox', newX + ' ' + newY + ' ' + newW + ' ' + newH);

        document.getElementById('zoomHome').classList.toggle('show', event.transform.k > 1.1);
        document.getElementById('mapSvg').style.cursor = event.transform.k > 1.05 ? 'grab' : '';

        var cLblG = document.querySelector('.continent-labels');
        if (cLblG) {
          var k2 = event.transform.k;
          cLblG.style.opacity    = k2 > 2 ? Math.max(0, 1 - (k2 - 2) / 1.5) : '1';
          cLblG.style.transition = 'opacity 0.2s';
        }
        var _kz = event.transform.k > 2;
        document.querySelectorAll('.synth-dot').forEach(function(el) { el.classList.toggle('zoomed', _kz); });

        clearTimeout(window._zt);
        document.querySelectorAll('.mm,.mm-heart').forEach(m => m.style.display = 'none');
        window._zt = setTimeout(placeMarkers, 400);
      });

    svg.call(zoom);
    window._zoom = zoom;

    // Touch swipe detection on postcard overlay
    let touchStartX = 0;
    document.getElementById('cOv').addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    document.getElementById('cOv').addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 60) { _ctx.swipeCard(diff < 0 ? 1 : -1); }
    }, { passive: true });

    window._svg = svg;
    _ctx.initProfiles();

  } catch (e) {
    console.error(e);
    document.querySelector('.ldr-t').textContent = 'Tap to retry';
    document.getElementById('ldr').onclick = () => location.reload();
  }
}
