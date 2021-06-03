module.exports = {
    port: 3000,

	//		   ms   sec  min  hour day
	timeout: 1000 * 60 * 1 * 1 * 1, // 1 day timeout
	fileStorage: './temp',
	sizeLimit: 0.5 * 1024 * 1024 * 1024, // 0.5GB
	chunkSize: (256 * 1024), // 256kb
}