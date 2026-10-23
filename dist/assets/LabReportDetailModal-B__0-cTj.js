const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/pdf-qzAOc_qv.js","assets/preload-helper-BLdHbfdN.js"])))=>i.map(i=>d[i]);
import{a as e}from"./rolldown-runtime-B0Z9INg1.js";import{a as t,o as n}from"./vendor-motion-BaTGBG4A.js";import{l as r,y as i}from"./x-BhRXKfdb.js";import{lt as a,o,st as s}from"./ui-DjWGxYeI.js";import{A as c,M as l}from"./common-DuWBnLge.js";import{b as u}from"./users-Cchd5tKg.js";import{t as d}from"./preload-helper-BLdHbfdN.js";import{Zt as f,in as p,on as m}from"./index-DcPpWtZx.js";import{n as h,o as g,t as _}from"./LabEncounterBadge-BA_hx4uA.js";var v=e(n(),1);function y(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function b(e,t=`—`){return e==null||String(e).trim()===``?t:String(e)}function x(e){let t=String(e??``).toLowerCase();return t===`high`?`flag-high`:t===`low`?`flag-low`:`flag-normal`}function S(e=[]){return e.length?e.map(e=>{let t=y(b(e.parameter_name??e.name)),n=y(b(e.value)),r=y(b(e.unit,``)),i=y(b(e.normal_range??e.normalRange,``)),a=b(e.flag,`normal`);return`
        <tr>
          <td>${t}</td>
          <td class="value-cell">${n}</td>
          <td>${r||`—`}</td>
          <td>${i||`—`}</td>
          <td><span class="flag ${x(a)}">${y(String(a).toUpperCase())}</span></td>
        </tr>
      `}).join(``):`
      <tr>
        <td colspan="5" class="empty-params">No parameter results recorded for this report.</td>
      </tr>
    `}function C(e,t){let n=String(e??``).toLowerCase(),r=String(t??``).toLowerCase();return n.startsWith(`image/`)?`image`:n===`application/pdf`?`pdf`:/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(r)?`image`:r.endsWith(`.pdf`)?`pdf`:`other`}function w(e){return new Promise((t,n)=>{let r=new FileReader;r.onloadend=()=>t(r.result),r.onerror=()=>n(r.error??Error(`Could not read uploaded file`)),r.readAsDataURL(e)})}async function T(e){let{getDocument:t,GlobalWorkerOptions:n}=await d(async()=>{let{getDocument:e,GlobalWorkerOptions:t}=await import(`./pdf-qzAOc_qv.js`);return{getDocument:e,GlobalWorkerOptions:t}},__vite__mapDeps([0,1]));n.workerSrc=(await d(async()=>{let{default:e}=await import(`./pdf.worker.min-Crr82RAx.js`);return{default:e}},[])).default;let r=await t({data:await e.arrayBuffer()}).promise,i=[];for(let e=1;e<=r.numPages;e+=1){let t=await r.getPage(e),n=t.getViewport({scale:2}),a=document.createElement(`canvas`),o=a.getContext(`2d`);a.width=n.width,a.height=n.height,await t.render({canvasContext:o,viewport:n}).promise,i.push(a.toDataURL(`image/jpeg`,.92))}return i}function E(e){let t=C(e.fileType,e.fileName),n=y(b(e.fileName,`Uploaded report file`));if(t===`other`)return``;if(t===`image`&&e.fileDataUrl)return`
      <section class="uploaded-file-page uploaded-file-page--break">
        <div class="uploaded-file-header">
          <div class="uploaded-file-kicker">Uploaded Report File</div>
          <h2>${n}</h2>
        </div>
        <div class="uploaded-file-frame">
          <img src="${e.fileDataUrl}" alt="${n}" class="uploaded-image" />
        </div>
      </section>
    `;if(t===`pdf`&&e.pdfPageImages?.length){let t=e.pdfPageImages.length;return e.pdfPageImages.map((e,r)=>`
          <section class="uploaded-file-page uploaded-pdf-page">
            <div class="uploaded-file-header">
              <div class="uploaded-file-kicker">Uploaded Report File${t>1?` · Page ${r+1} of ${t}`:``}</div>
              <h2>${n}</h2>
            </div>
            <div class="uploaded-file-frame uploaded-pdf-page-frame">
              <img
                src="${e}"
                alt="${n} page ${r+1}"
                class="uploaded-image uploaded-pdf-page-image"
              />
            </div>
          </section>
        `).join(``)}return t===`pdf`&&e.fileDataUrl?`
      <section class="uploaded-file-page uploaded-file-page--break">
        <div class="uploaded-file-header">
          <div class="uploaded-file-kicker">Uploaded Report File</div>
          <h2>${n}</h2>
        </div>
        <div class="uploaded-file-frame">
          <iframe src="${e.fileDataUrl}" title="${n}" class="uploaded-pdf"></iframe>
        </div>
      </section>
    `:``}function D(e,t){let n=t?`${t} Laboratory`:`Laboratory`,r=y(b(e.reportId)),i=y(b(e.patientName)),a=y(b(e.patientId)),o=y(b(e.testName)),s=y(b(e.doctorName)),c=y(b(e.category,``)),l=y(b(e.priority,``)),u=y(b(e.uploadedDate)),d=y(b(e.sampleCollectedAt)),f=y(b(e.testPerformedAt)),m=y(b(e.uploadedByName)),h=y(b(e.remarks,``)),g=p(e),_=y(g.visit),v=y(g.ward),x=y(g.bed),C=new Date().toLocaleString(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`,hour:`2-digit`,minute:`2-digit`});return`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Lab Report — ${r}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #0f2744;
            font-size: 13px;
            line-height: 1.45;
          }
          .report {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 3px solid #1a5c34;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .brand h1 {
            margin: 0;
            font-size: 22px;
            letter-spacing: 0.02em;
            color: #1a5c34;
          }
          .brand p {
            margin: 4px 0 0;
            color: #5b6b7c;
            font-size: 12px;
          }
          .report-meta {
            text-align: right;
          }
          .report-meta .id {
            font-size: 16px;
            font-weight: 700;
          }
          .report-meta .muted {
            color: #6b7f99;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .section-title {
            margin: 0 0 8px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #1a5c34;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 18px;
            margin-bottom: 18px;
            padding: 12px 14px;
            background: #f7faf8;
            border: 1px solid #d7e5db;
            border-radius: 8px;
          }
          .info-item .label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7f99;
          }
          .info-item .value {
            margin-top: 2px;
            font-size: 14px;
            font-weight: 600;
          }
          table.results {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          table.results th,
          table.results td {
            border: 1px solid #d5dee8;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }
          table.results th {
            background: #eef6f0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #345043;
          }
          table.results .value-cell {
            font-weight: 700;
          }
          .empty-params {
            text-align: center;
            color: #6b7f99;
            font-style: italic;
          }
          .flag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.03em;
          }
          .flag-normal { background: #e8f8ef; color: #157a3d; }
          .flag-high { background: #fde8e8; color: #b42318; }
          .flag-low { background: #fff4e5; color: #b54708; }
          .remarks {
            margin-bottom: 18px;
            padding: 12px 14px;
            border: 1px solid #d5dee8;
            border-radius: 8px;
            background: #fff;
          }
          .remarks p {
            margin: 6px 0 0;
            white-space: pre-wrap;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 36px;
          }
          .signatures .line {
            border-top: 1px solid #9aa8b8;
            padding-top: 8px;
            font-size: 12px;
            color: #5b6b7c;
          }
          .footer {
            margin-top: 28px;
            padding-top: 10px;
            border-top: 1px solid #d5dee8;
            font-size: 11px;
            color: #6b7f99;
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          .uploaded-file-page {
            max-width: 800px;
            margin: 0 auto;
          }
          .uploaded-file-page--break,
          .uploaded-pdf-page {
            page-break-before: always;
            break-before: page;
          }
          .uploaded-file-header {
            margin-bottom: 16px;
            border-bottom: 2px solid #1a5c34;
            padding-bottom: 10px;
          }
          .uploaded-file-kicker {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1a5c34;
            margin-bottom: 6px;
          }
          .uploaded-file-header h2 {
            margin: 0;
            font-size: 18px;
            color: #0f2744;
            word-break: break-word;
          }
          .uploaded-file-frame {
            border: 1px solid #d5dee8;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
          }
          .uploaded-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .uploaded-pdf {
            display: block;
            width: 100%;
            min-height: 980px;
            border: 0;
            background: #fff;
          }
          .uploaded-pdf-page-frame {
            min-height: auto;
          }
          .uploaded-pdf-page-image {
            display: block;
            width: 100%;
            height: auto;
            max-height: 220mm;
            object-fit: contain;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .uploaded-file-page--break,
            .uploaded-pdf-page {
              page-break-before: always;
              break-before: page;
            }
            .uploaded-file-header {
              margin-bottom: 8px;
              padding-bottom: 6px;
            }
            .uploaded-pdf-page-image,
            .uploaded-image {
              max-height: 220mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <header class="header">
            <div class="brand">
              <h1>${y(n)}</h1>
              <p>${t?`${y(t)} · `:``}Diagnostic Laboratory Report</p>
            </div>
            <div class="report-meta">
              <div class="muted">Report ID</div>
              <div class="id">${r}</div>
              <div class="muted" style="margin-top:8px">Printed</div>
              <div>${y(C)}</div>
            </div>
          </header>

          <h2 class="section-title">Patient &amp; Order Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Patient Name</div>
              <div class="value">${i}</div>
            </div>
            <div class="info-item">
              <div class="label">Patient ID</div>
              <div class="value">${a}</div>
            </div>
            <div class="info-item">
              <div class="label">Source</div>
              <div class="value">${_}</div>
            </div>
            <div class="info-item">
              <div class="label">Ward</div>
              <div class="value">${v}</div>
            </div>
            <div class="info-item">
              <div class="label">Bed</div>
              <div class="value">${x}</div>
            </div>
            <div class="info-item">
              <div class="label">Test Name</div>
              <div class="value">${o}${c?` (${c})`:``}</div>
            </div>
            <div class="info-item">
              <div class="label">Ordering Doctor</div>
              <div class="value">${s}</div>
            </div>
            <div class="info-item">
              <div class="label">Sample Collected At</div>
              <div class="value">${d}</div>
            </div>
            <div class="info-item">
              <div class="label">Test Performed At</div>
              <div class="value">${f}</div>
            </div>
            <div class="info-item">
              <div class="label">Report Uploaded</div>
              <div class="value">${u}</div>
            </div>
            <div class="info-item">
              <div class="label">Reported By</div>
              <div class="value">${m}${l?` · Priority: ${l}`:``}</div>
            </div>
          </div>

          <h2 class="section-title">Test Results</h2>
          <table class="results">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              ${S(e.parameters)}
            </tbody>
          </table>

          ${h?`<div class="remarks"><div class="section-title">Remarks / Notes</div><p>${h}</p></div>`:``}

          <div class="signatures">
            <div class="line">Lab Technician / Reported By<br /><strong>${m}</strong></div>
            <div class="line">Verified / Authorized Signatory</div>
          </div>

          <footer class="footer">
            <span>This is a computer-generated laboratory report from ${y(n)}.</span>
            <span>Confidential medical document</span>
          </footer>
        </div>
        ${E(e)}
      </body>
    </html>
  `}async function O(e){if(!e)return null;let t=Array.isArray(e.parameters),n=e.reportDbId??e.id,o=!!(e?.fileName||e?.hasFile);if(n==null)return e;let c=l.getState()?.token;if(!c||t&&!o)return e;let u=s();try{let o=t?e:await f(n,c),s=(e,t)=>e==null||String(e).trim()===``||e===`—`?t:e,l={...e,...o,reportId:o.reportId??e.reportId,patientName:s(o.patientName,e.patientName),patientId:s(o.patientId,e.patientId),testName:s(o.testName,e.testName),doctorName:s(o.doctorName,e.doctorName),uploadedDate:s(o.uploadedDate,e.uploadedDate),uploadedByName:s(o.uploadedByName,e.uploadedByName),parameters:o.parameters??e.parameters??[]};if(o?.fileName||e?.fileName||e?.hasFile)try{let{blob:t,fileName:r,contentType:i}=await m(n,c);if(l.fileName=r??o?.fileName??e?.fileName??null,l.fileType=i??t.type??o?.fileType??e?.fileType??``,C(l.fileType,l.fileName)===`pdf`)try{l.pdfPageImages=await T(t)}catch{l.fileDataUrl=await w(t)}else l.fileDataUrl=await w(t)}catch(e){if(r(e))throw e}if(!a(u))throw i();return l}catch(t){if(r(t))throw t;return e}}async function k(e){let t=await O(e);return t?D(t,u(l.getState()?.user)):null}async function A(e){if(!e)return;let t;try{t=await k(e)}catch(e){if(r(e))return;throw e}t?j(t):c.error(`Report data not available`)}function j(e){let t=new Blob([e],{type:`text/html;charset=utf-8`}),n=URL.createObjectURL(t),r=document.createElement(`iframe`);r.setAttribute(`aria-hidden`,`true`),r.setAttribute(`title`,`Print report`),r.style.cssText=`position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;`;let i=!1,a=()=>{i||(i=!0,URL.revokeObjectURL(n),r.remove())};r.addEventListener(`load`,()=>{let e=r.contentWindow;if(!e)a(),c.error(`Could not open printer`);else{e.addEventListener(`afterprint`,a,{once:!0}),setTimeout(a,12e4);try{e.focus(),e.print()}catch{a(),c.error(`Could not open printer`)}}},{once:!0}),r.src=n,document.body.appendChild(r)}var M=t();function N(e,t){let n=String(e??``).toLowerCase(),r=String(t??``).toLowerCase();return n.startsWith(`image/`)?`image`:n===`application/pdf`?`pdf`:/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(r)?`image`:r.endsWith(`.pdf`)?`pdf`:`other`}function P({report:e,onClose:t,onEdit:n}){let i=e?.reportDbId,a=g(i,{enabled:i!=null}),s=h(),l=(0,v.useRef)(s.mutateAsync);l.current=s.mutateAsync;let[u,d]=(0,v.useState)({url:null,fileName:null,fileType:null,error:null,loading:!1}),f=a.data,m=f??e;if((0,v.useEffect)(()=>{let t=!0,n=null;return i==null||!(f?.fileName||e.hasFile)?(d({url:null,fileName:null,fileType:null,error:null,loading:!1}),()=>{}):(d(e=>({...e,loading:!0,error:null})),l.current(i).then(({blob:e,fileName:r,contentType:i})=>{t&&(n=URL.createObjectURL(e),d({url:n,fileName:r,fileType:i??e.type??``,error:null,loading:!1}))}).catch(e=>{t&&!r(e)&&d({url:null,fileName:f?.fileName??null,fileType:f?.fileType??null,error:`Could not load the uploaded file preview.`,loading:!1})}),()=>{t=!1,n&&URL.revokeObjectURL(n)})},[i,f?.fileName,f?.fileType,e?.hasFile]),!e)return null;let y=async()=>{if(i)try{let{blob:e,fileName:t}=await s.mutateAsync(i),n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=t,r.click(),URL.revokeObjectURL(n)}catch(e){if(r(e))return;c.error(`No file available for this report`)}},b=N(u.fileType,u.fileName),x=p(m);return(0,M.jsx)(`div`,{className:`lab-modal-overlay lab-report-view-overlay`,onClick:t,role:`presentation`,children:(0,M.jsxs)(`div`,{className:`lab-modal lab-report-view`,onClick:e=>e.stopPropagation(),role:`dialog`,"aria-modal":`true`,"aria-labelledby":`lab-report-modal-title`,children:[(0,M.jsx)(`button`,{type:`button`,className:`lab-modal-close`,onClick:t,"aria-label":`Close`,children:`✕`}),(0,M.jsxs)(`header`,{className:`lab-report-view__header`,children:[(0,M.jsx)(`p`,{className:`lab-report-view__eyebrow`,children:`Report archive`}),(0,M.jsxs)(`h2`,{id:`lab-report-modal-title`,children:[`Report Details — `,m.reportId]})]}),(0,M.jsx)(`div`,{className:`lab-report-view__body`,children:(0,M.jsx)(o,{isLoading:a.isLoading,isError:a.isError,error:a.error,onRetry:a.refetch,children:(0,M.jsxs)(`div`,{className:`lab-info-panel lab-report-view__panel`,children:[(0,M.jsxs)(`div`,{className:`lab-info-grid lab-report-view__grid`,children:[(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Patient Name`}),(0,M.jsx)(`span`,{children:m.patientName})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Patient ID`}),(0,M.jsx)(`span`,{className:`lab-report-view__mono`,children:m.patientId})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Source`}),(0,M.jsx)(`span`,{children:(0,M.jsx)(_,{encounterType:m.encounterType})})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Ward`}),(0,M.jsx)(`span`,{children:x.ward})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Bed`}),(0,M.jsx)(`span`,{children:x.bed})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Test Name`}),(0,M.jsx)(`span`,{children:m.testName})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Doctor`}),(0,M.jsx)(`span`,{children:m.doctorName??`—`})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Lab Technician`}),(0,M.jsx)(`span`,{children:m.uploadedByName??`—`})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Uploaded`}),(0,M.jsx)(`span`,{children:m.uploadedDate})]}),(0,M.jsxs)(`div`,{className:`lab-info-item`,children:[(0,M.jsx)(`label`,{children:`Status`}),(0,M.jsx)(`span`,{children:(0,M.jsx)(`span`,{className:`lab-badge completed`,children:`Completed`})})]}),(0,M.jsxs)(`div`,{className:`lab-info-item lab-report-view__remarks`,children:[(0,M.jsx)(`label`,{children:`Remarks`}),(0,M.jsx)(`span`,{children:f?.remarks?.trim()?f.remarks:`—`})]})]}),f?.parameters?.length>0?(0,M.jsxs)(`div`,{className:`lab-report-view__params`,children:[(0,M.jsx)(`h3`,{className:`lab-report-view__params-title`,children:`Parameters`}),(0,M.jsx)(`div`,{className:`lab-report-view__params-wrap`,children:(0,M.jsxs)(`table`,{className:`lab-params-table lab-report-view__params-table lab-table--stack`,children:[(0,M.jsx)(`thead`,{children:(0,M.jsxs)(`tr`,{children:[(0,M.jsx)(`th`,{children:`Parameter`}),(0,M.jsx)(`th`,{children:`Value`}),(0,M.jsx)(`th`,{children:`Unit`}),(0,M.jsx)(`th`,{children:`Range`}),(0,M.jsx)(`th`,{children:`Flag`})]})}),(0,M.jsx)(`tbody`,{children:f.parameters.map(e=>(0,M.jsxs)(`tr`,{children:[(0,M.jsx)(`td`,{"data-label":`Parameter`,children:e.parameter_name}),(0,M.jsx)(`td`,{"data-label":`Value`,children:e.value}),(0,M.jsx)(`td`,{"data-label":`Unit`,children:e.unit}),(0,M.jsx)(`td`,{"data-label":`Range`,children:e.normal_range}),(0,M.jsx)(`td`,{"data-label":`Flag`,children:e.flag})]},e.parameter_name))})]})})]}):null,(f?.fileName||e.hasFile)&&(0,M.jsxs)(`div`,{className:`lab-report-view__file`,children:[(0,M.jsx)(`h3`,{className:`lab-report-view__params-title`,children:`Uploaded Report File`}),(0,M.jsx)(`div`,{className:`lab-report-view__file-wrap`,children:u.loading?(0,M.jsx)(`p`,{className:`text-muted`,children:`Loading uploaded file…`}):u.error?(0,M.jsx)(`p`,{className:`field__error`,children:u.error}):u.url&&b===`image`?(0,M.jsx)(`img`,{src:u.url,alt:u.fileName??`Uploaded report file`,className:`lab-report-view__file-image`}):u.url&&b===`pdf`?(0,M.jsx)(`iframe`,{src:u.url,title:u.fileName??`Uploaded report PDF`,className:`lab-report-view__file-frame`}):(0,M.jsx)(`p`,{className:`text-muted`,children:`Preview is not available for this file type. Use Download File.`})})]})]})})}),(0,M.jsxs)(`div`,{className:`lab-form-actions lab-report-view__actions`,children:[typeof n==`function`?(0,M.jsx)(`button`,{type:`button`,className:`lab-btn lab-btn-primary`,onClick:()=>{n(e),t()},children:`Edit`}):null,(0,M.jsx)(`button`,{type:`button`,className:`lab-btn lab-btn-secondary`,onClick:()=>A(m),children:`Print Report`}),(f?.fileName||e.hasFile)&&(0,M.jsx)(`button`,{type:`button`,className:`lab-btn lab-btn-secondary`,onClick:y,disabled:s.isPending,children:s.isPending?`Downloading...`:`Download File`}),(0,M.jsx)(`button`,{type:`button`,className:`lab-btn lab-btn-secondary`,onClick:t,children:`Close`})]})]})})}export{P as t};