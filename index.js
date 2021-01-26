const cfg = require('./config.js')
const express = require('express')
const app = express()
const srv = require('http').createServer(app)
const io = require('socket.io')(srv);
const fs = require('fs')
const crypto = require('crypto')

app.use(express.static('static'));

app.get('/', (req, res) => res.sendFile(__dirname + 'static/index.html'))

app.get('/file/:id', (req, res) => {
    if(fs.existsSync('temp/' + req.params.id + '.json')){
        const metadata = JSON.parse(fs.readFileSync('temp/' + req.params.id + '.json'))
        res.download('temp/' + req.params.id, metadata.name)
    }else res.send('invalid')
})

io.on('connection', socket => {

    let file = { fileHeader: {}, chunks: [] };

    socket.on('uploadStart', fileHeader => file.fileHeader = fileHeader)

    socket.on('fileData', data => {
        file.chunks.push(data)
        socket.emit('recv', file.chunks.length / file.fileHeader.chunkAmt)
    })

    socket.on('uploadFinish', res => {
        file.chunks.sort((a, b) => a.chunkID - b.chunkID)
        if(file.fileHeader.chunkAmt == file.chunks.length){
            var id = crypto.randomBytes(20).toString('hex');
            fs.writeFile('temp/' + id + '.json', JSON.stringify({ name: file.fileHeader.fileName, creation: new Date().valueOf().toString() }, null, 4), () => console.log('upload file', id))
            for(const chunk of file.chunks)
                fs.appendFileSync('temp/' + id, chunk.data)
            socket.emit('finished', 'file/' + id)
        }
    })

})

srv.listen(cfg.port, () => console.log("Running on Port", cfg.port))