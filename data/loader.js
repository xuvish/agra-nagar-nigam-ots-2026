async function loadEmbeddedData(){
  const bytes=Uint8Array.from(atob(window.OTS_DATA_PARTS.join('')),c=>c.charCodeAt(0));
  if (typeof DecompressionStream !== 'undefined') {
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  if (window.pako) {
    return JSON.parse(new TextDecoder().decode(window.pako.ungzip(bytes)));
  }
  throw new Error('This browser cannot load the embedded verified dataset. Use a current Chrome, Edge or Safari browser.');
}
