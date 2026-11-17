/** Resize and centre-crop avatar photos before sending bytes to storage. */
export async function compressAvatarImage(file:File):Promise<File>{
  const sourceUrl=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This image could not be opened. Choose another JPG, PNG or WebP photo.'));image.src=sourceUrl;});
    if(!image.naturalWidth || !image.naturalHeight)throw new Error('This image has no readable photo data.');
    const crop=Math.min(image.naturalWidth,image.naturalHeight);
    const size=Math.min(512,crop);
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const context=canvas.getContext('2d');if(!context)throw new Error('Photo processing is unavailable in this browser.');
    const draw=()=>context.drawImage(image,(image.naturalWidth-crop)/2,(image.naturalHeight-crop)/2,crop,crop,0,0,size,size);
    draw();
    const encode=(type:string,quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not compress this photo. Please try another image.')),type,quality));
    let blob=await encode('image/webp',.84);
    if(blob.type!=='image/webp'){
      context.fillStyle='#ffffff';context.fillRect(0,0,size,size);draw();
      blob=await encode('image/jpeg',.84);
    }
    for(const quality of [.72,.6]){if(blob.size<=180*1024)break;blob=await encode(blob.type,quality);}
    const extension=blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':'png';
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+extension,{type:blob.type,lastModified:Date.now()});
  }finally{URL.revokeObjectURL(sourceUrl);}
}
