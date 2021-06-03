export const sizeBytes = (bytes, decimals = 2) => (bytes === 0) ? '0 Bytes' : parseFloat((bytes / Math.pow(1024, Math.floor(Math.log(bytes) / Math.log(1024)))).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][Math.floor(Math.log(bytes) / Math.log(1024))];

// how does it work tho
export function readChunked(f, chunkSize, onChunk){

    var offset = 0;
    var chunkID = 0;

    function chunkReader() {
        const reader = new FileReader();
        reader.onload = e => {
            if (e.target.error == null && offset < f.size) {
                offset += e.target.result.byteLength;
                chunkReader();
                onChunk({chunkID, offset, 'data': e.target.result});
                chunkID++;
            }
        }
        reader.readAsArrayBuffer(f.slice(offset, offset + chunkSize))
    }

    chunkReader();

}