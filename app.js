(() => {
  const $ = id => document.getElementById(id);
  const fileInput = $('videoFile'), video = $('sourceVideo'), canvas = $('workCanvas');
  const ctx = canvas.getContext('2d', {willReadFrequently:false});
  let selectedFile = null, frames = [], youtube = '';
  const MAX_FRAMES = 60;
  const fmt = n => {
    if (!Number.isFinite(n)) return 'unknown duration';
    const m = Math.floor(n/60), s = Math.floor(n%60);
    return `${m}:${String(s).padStart(2,'0')}`;
  };
  function setStatus(msg, kind='') { const el=$('status'); el.textContent=msg; el.className='status '+kind; }
  function updateExport() {
    $('exportBtn').disabled = frames.length===0 && !$('typedNotes').value.trim();
    $('ocrAllBtn').disabled = frames.length===0;
  }
  function renderFrames() {
    $('framesGrid').innerHTML='';
    $('emptyFrames').classList.toggle('hidden', frames.length>0);
    frames.forEach((f,i)=>{
      const card=document.createElement('div'); card.className='frame-card';
      const img=document.createElement('img'); img.src=f.data; img.alt=`Frame at ${fmt(f.time)}`;
      const meta=document.createElement('div'); meta.className='frame-meta';
      const time=document.createElement('span'); time.textContent=`${i+1}. ${fmt(f.time)}`;
      const del=document.createElement('button'); del.textContent='Remove'; del.setAttribute('aria-label',`Remove frame ${i+1}`);
      del.onclick=()=>{frames.splice(i,1);renderFrames();updateExport();};
      meta.append(time,del); card.append(img,meta); $('framesGrid').append(card);
    });
    updateExport();
  }
  fileInput.addEventListener('change',()=>{
    selectedFile=fileInput.files && fileInput.files[0];
    if(!selectedFile) return;
    if(!selectedFile.type.startsWith('video/')) { setStatus('Please select a video file.','error'); return; }
    video.src=URL.createObjectURL(selectedFile);
    $('fileInfo').textContent=`${selectedFile.name} · ${(selectedFile.size/1024/1024).toFixed(1)} MB`;
    $('fileInfo').classList.remove('hidden');
    $('processBtn').disabled=false;
    setStatus('Video ready. Choose interval and extract frames.');
  });
  $('checkYoutube').addEventListener('click',()=>{
    const raw=$('youtubeUrl').value.trim();
    if(raw && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(raw)) {
      $('youtubeHelp').textContent='Ye YouTube URL jaisa nahi lagta. youtube.com ya youtu.be link paste karein.';
      return;
    }
    youtube=raw;
    $('youtubeHelp').textContent=raw
      ? 'Link noted. Direct frame extraction is not available in this browser-only MVP. If you have permission, choose a video file above to process it.'
      : 'YouTube link ko browser se directly read/extract karna blocked hota hai. Link note rahega; actual frame extraction ke liye video file select karein.';
  });
  $('processBtn').addEventListener('click', async()=>{
    if(!selectedFile) return;
    $('processBtn').disabled=true;
    frames=[]; renderFrames();
    $('progress').classList.remove('hidden'); $('progress').value=0;
    setStatus('Video load ho raha hai…');
    try {
      if(video.readyState<1) await new Promise((resolve,reject)=>{
        video.onloadedmetadata=resolve; video.onerror=()=>reject(new Error('Video open nahi ho saka.'));
      });
      const duration=video.duration;
      if(!Number.isFinite(duration)||duration<=0) throw new Error('Video duration read nahi hui.');
      const interval=Number($('interval').value);
      const total=Math.min(MAX_FRAMES,Math.max(1,Math.ceil(duration/interval)));
      const times=[];
      for(let i=0;i<total;i++) times.push(Math.min(i*interval,Math.max(0,duration-0.15)));
      // Limit output width to reduce memory on phones.
      const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
      canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      for(let i=0;i<times.length;i++){
        await new Promise((resolve,reject)=>{
          const done=()=>{video.removeEventListener('seeked',done);resolve();};
          video.addEventListener('seeked',done,{once:true});
          try { video.currentTime=times[i]; } catch(e) { reject(e); }
          // Some browsers don't fire seeked when target equals currentTime.
          if(Math.abs(video.currentTime-times[i])<0.01 && video.readyState>=2) {
            video.removeEventListener('seeked',done); resolve();
          }
        });
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        frames.push({time:times[i],data:canvas.toDataURL('image/jpeg',0.78),ocr:''});
        $('progress').value=Math.round((i+1)/times.length*100);
        setStatus(`Frames extract ho rahe hain: ${i+1}/${times.length}`);
        if(i%4===3) { renderFrames(); await new Promise(r=>setTimeout(r,0)); }
      }
      renderFrames();
      setStatus(`${frames.length} frames ready. PDF export kar sakte hain ya OCR try karein.`,'success');
    } catch(err) { setStatus(err.message||'Video process nahi ho saka.','error'); }
    finally { $('processBtn').disabled=false; $('progress').classList.add('hidden'); }
  });
  async function runOCR(indices) {
    if(!window.Tesseract) { setStatus('OCR library load nahi hui. Internet connection check karein.','error'); return; }
    $('ocrAllBtn').disabled=true;
    try {
      const worker=await Tesseract.createWorker('eng');
      let out=$('typedNotes').value.trim();
      for(let k=0;k<indices.length;k++){
        const i=indices[k]; setStatus(`OCR running: frame ${k+1}/${indices.length}…`);
        const result=await worker.recognize(frames[i].data);
        frames[i].ocr=(result.data.text||'').trim();
        if(frames[i].ocr) out += `${out?'\\n\\n':''}--- Board frame ${i+1} (${fmt(frames[i].time)}) ---\\n${frames[i].ocr}`;
      }
      await worker.terminate();
      $('typedNotes').value=out;
      setStatus('OCR draft ready. Maths symbols, Hindi aur handwriting ko manually verify karein.','success');
    } catch(e) { setStatus('OCR fail hua. Internet / browser memory check karein.','error'); }
    finally { $('ocrAllBtn').disabled=false; updateExport(); }
  }
  $('ocrAllBtn').addEventListener('click',()=>runOCR(frames.map((_,i)=>i)));
  $('clearNotesBtn').addEventListener('click',()=>{$('typedNotes').value='';updateExport();});
  $('typedNotes').addEventListener('input',updateExport);
  $('exportBtn').addEventListener('click',async()=>{
    if(!window.jspdf?.jsPDF){$('exportStatus').textContent='PDF library load nahi hui. Internet connection check karein.';return;}
    const notes=$('typedNotes').value.trim(), title=$('notesTitle').value.trim()||'Lecture Revision Notes';
    if(!frames.length&&!notes){updateExport();return;}
    const btn=$('exportBtn');btn.disabled=true;$('exportStatus').textContent='PDF ban raha hai…';
    try{
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const pageW=210,pageH=297,margin=15;
      let y=18;
      doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(title.slice(0,90),margin,y);y+=10;
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Created with BoardNotes MVP · Please verify OCR and formulas',margin,y);y+=9;
      if(notes){
        doc.setFontSize(11);
        const lines=doc.splitTextToSize(notes, pageW-margin*2);
        for(const line of lines){
          if(y>pageH-margin){doc.addPage();y=18;}
          doc.text(line,margin,y);y+=5;
        }
      }
      for(let i=0;i<frames.length;i++){
        doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(11);
        doc.text(`Board frame ${i+1} · ${fmt(frames[i].time)}`,margin,13);
        const img=frames[i].data;
        const ratio=canvas.width/canvas.height;
        let w=pageW-margin*2,h=w/ratio;
        if(h>pageH-35){h=pageH-35;w=h*ratio;}
        doc.addImage(img,'JPEG',(pageW-w)/2,20,w,h,undefined,'FAST');
      }
      const safe=title.replace(/[^a-z0-9-_ ]/gi,'').trim().replace(/\s+/g,'_').slice(0,60)||'BoardNotes';
      doc.save(`${safe}.pdf`);
      $('exportStatus').textContent=`PDF export started. ${frames.length} board frames included.`;
    }catch(e){$('exportStatus').textContent='PDF export fail hua. Kam frames select karke dobara try karein.';}
    finally{btn.disabled=false;updateExport();}
  });
  updateExport();
})();