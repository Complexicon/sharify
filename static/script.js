const sock = io();
const progress = document.getElementById('fileUpload');
const dropZone = document.getElementById('dropzone');
const fileInfo = document.getElementById('fileInfo');
const dlLink = document.getElementById("link");

sock.on('recv', perc => progress.value = perc * 100)
sock.on('finished', link => dlLink.value = document.location + link)

let file;
const chunk = 512 * 1024;

function upload(){
    if(file.size > 1.5 * 1024 * 1024 * 1024) return
    const chunkAmt = Math.ceil(file.size / chunk)

    progress.hidden = false;

    sock.emit('uploadStart', { 'fileSize': file.size, 'fileName': file.name, chunkAmt })

    readChunked(file, (res, finished) => {
        if(!finished) sock.emit('fileData', res)
        else sock.emit('uploadFinish', res)
    })

}

function copytoclipboard(){
    dlLink.select();
    dlLink.setSelectionRange(0, 99999); /* For mobile devices */
    document.execCommand("copy");
}

function readChunked(f, onChunk){

    var offset = 0;
    var chunkID = 0;

    const chunkReader = () => {
        const reader = new FileReader();
        reader.onload = e => {
            if (e.target.error == null && offset < f.size) {
                offset += + e.target.result.byteLength;
                chunkReader(onChunk);
                onChunk({chunkID, offset, 'data': e.target.result});
                chunkID++;
            }else onChunk({'result': (e.target.error ? e.target.error : 'ok') }, true)
        }
        reader.readAsArrayBuffer(f.slice(offset, offset + chunk))
    }

    chunkReader()

}

dropZone.addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', e => {
    e.stopPropagation();
    e.preventDefault();
    file = e.dataTransfer.files[0]
    fileInfo.innerText = file.name + " " + formatBytes(file.size)
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}