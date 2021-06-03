const cfg = require('./config.js');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const { Server } = require('socket.io');
const io = new Server(server);

const fileStorage = path.join(__dirname, cfg.fileStorage);

function mkdirIfNotExist(path){
	(!fs.existsSync(path)) && fs.mkdirSync(path, {'recursive': true});
}

mkdirIfNotExist(fileStorage);

app.use(require('morgan')('dev'));

function deleteFile(id){
	console.log('time to delete', id);
	fs.unlinkSync(id);
	fs.unlinkSync(id.substring(0, id.length - 5));
}

const timeout = cfg.timeout;

for(const file of fs.readdirSync(fileStorage)){
	if(file.includes('.json')){
		const loc = path.join(fileStorage, file);
		const meta = require(loc);
		if(meta.creation - Date.now() > timeout) deleteFile(loc);
		else setTimeout(() => deleteFile(loc), timeout - (Date.now() - meta.creation));
	}
}

app.get('/file/:id', (req, res) => {
	const metaFile = path.join(fileStorage, req.params.id + '.json');
    if(fs.existsSync(metaFile)){
        const metadata = require(metaFile);
        res.download(path.join(fileStorage, req.params.id), metadata.name)
    }else res.send('invalid')
})

io.on('connection', function(socket){

	const chunkSize = cfg.chunkSize
	const sizeLimit = cfg.sizeLimit;

	socket.emit('uploadParams', { chunkSize, sizeLimit });

	let file = { header: { fileSize: 0, fileName: 'invalid', chunkAmt: 0 }, chunks: [] };

    socket.on('uploadStart', fileHeader => {

		const chunksValid = fileHeader.chunkAmt === Math.ceil(fileHeader.fileSize / chunkSize);
		const sizeValid = fileHeader.fileSize < sizeLimit;

		if(!chunksValid || !sizeValid) return socket.disconnect(true);

		file.header = fileHeader
	})

    socket.on('fileData', dataChunk => {

		const validSize = dataChunk.data.length <= chunkSize;
		const validOffset = dataChunk.offset <= file.header.fileSize;
		const validChunkID = dataChunk.chunkID < file.header.chunkAmt;

		if(!validSize || !validOffset || !validChunkID) return socket.disconnect(true);

        file.chunks.push(dataChunk);

        socket.emit('dataReceived', file.chunks.length / file.header.chunkAmt);

		if(file.header.chunkAmt === file.chunks.length){
			file.chunks.sort((a, b) => a.chunkID - b.chunkID);

			var id = nanoid();
			const newStore = path.join(fileStorage, id);
			const metaStore = newStore + '.json';
            fs.writeFile(metaStore, JSON.stringify({ name: file.header.fileName, creation: Date.now() }, null, 4), () => console.log('upload file', id))
            setTimeout(() => deleteFile(metaStore), timeout);
			file.chunks.forEach(chunk => fs.appendFileSync(newStore, chunk.data))
            socket.emit('finished', 'file/' + id)
			file = {};
		}

    })

})

app.use('/', require('reactive')({ __dirname, debug: true }));

server.listen(cfg.port, () => console.log("Running on Port", cfg.port))