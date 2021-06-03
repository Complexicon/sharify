import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';
import { readChunked, sizeBytes } from './util';

function upload(file, onBegin, onProgress, onFinish, onError) {
	if (file.size === 0) return onError('File has no Content!');

	var sock = io();

	sock.on('dataReceived', onProgress);

	sock.on('finished', link => {
		sock.disconnect();
		sock = null;
		onFinish(document.location + link);
	});

	sock.on('uploadParams', function (params) {
		if (file.size > params.sizeLimit) return onError('File is too Large!');
		sock.emit('uploadStart', { 'fileSize': file.size, 'fileName': file.name, chunkAmt: Math.ceil(file.size / params.chunkSize) });
		readChunked(file, params.chunkSize, res => sock.emit('fileData', res));
		onBegin();
	});

}

const styles = {
	container: {
		borderRadius: "5px",
		backgroundColor: "#2e2e2e",
		width: "30%",
		height: "30%"
	},
	dropzone: {
		width: "auto",
		height: "50%",
		margin: "5px",
		borderStyle: "dashed",
		borderColor: "white",
		borderWidth: "2px",
		color: "white",
		textAlign: "center"
	},
	fileUpload: { width: "100%" },
	fileInfo: { color: "white", width: "auto", textAlign: "center" },
	body: {
		backgroundColor: "darkorchid",
		fontFamily: "Arial, Helvetica, sans-serif",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "100%"
	}
}


function App() {

	const [progress, setProgress] = React.useState(0);
	const [file, setFile] = React.useState({ name: "no file selected", size: 0 });
	const [progressVisible, setVisible] = React.useState(false);
	const [resultLink, setResultLink] = React.useState('');
	const fileInput = React.createRef();

	function go() {
		upload(file, () => setVisible(true), percent => setProgress(percent * 100), (link) => {
			setVisible(false);
			setResultLink(link);
		});
	}

	function drop(e) { e.stopPropagation(); e.preventDefault(); setFile(e.dataTransfer.files[0]); }
	function drag(e) { e.stopPropagation(); e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
	function copy(e) { e.target.select(); e.target.setSelectionRange(0, 99999); document.execCommand("copy"); }
	function select() { fileInput.current.click(); }

	return (
		<div style={styles.body}>
			<div style={styles.container}>
				<div draggable onDrop={drop} onDragOver={drag} onClick={select} style={styles.dropzone}>Drop files here</div>
				<progress max="100" value={progress} hidden={!progressVisible} style={styles.fileUpload} />
				<div style={styles.fileInfo}>{file.name} ({sizeBytes(file.size)})</div>
				<button onClick={go} >Upload File</button>
				<input type="file" hidden ref={fileInput} onChange={e => setFile(e.target.files[0])} />
				<input hidden={!resultLink} type="text" class="form-control" readOnly onClick={copy} value={resultLink} />
			</div>
		</div>

	);
}

ReactDOM.render(<App />, document.getElementById('app'));